import {applyPendingTextureTier,pruneRetiredTextureBindings,textureReport} from '../render/loaders/managed-textures';
import {releaseGpuDecoder} from '../render/loaders/gpu-textures';
import {optimizedGraphics,runtimeBudget} from '../platform/graphics-profile';
import {stageContentAssets} from './stage-content-assets';
import {audioPreloadBanks} from './audio-preload-plan';
import type {BackgroundPreparation} from './background-preparation';
import {campaignMapAssets,campaignPreloadAssets,type CampaignMapRecipe} from '../data/campaign-map';
import {environmentAssetIds,MAP_VISUAL_PROFILES} from '../render/terrain/map-visual-profile';
import type {CampaignTheme} from '../data/campaign-landscape';
import {httpAssetStatus,httpStore} from '../assets/http-store';
import {RESCUE_PRESENTATION} from '../data/economy';
import type {RunSnapshot} from '../simulation/persistence/run-snapshot';
import type {World} from '../simulation/world';
import type {BattleRenderer} from '../render/scene/battle-renderer';
import type {Race} from '../data/races';
import type {HeroId} from '../data/heroes';
import type {PresetSlot} from '../simulation/progression/permanent-profile';
import type {Difficulty} from '../data/stages';
import type {AudioEffects} from '../render/effects/audio';
import {ASSETS} from '../assets/manifest';
import {prepareEmbeddedAssetIds} from '../assets/offline-pack';

export type ReadinessKind='new'|'load'|'endless'|'reinforcement';
export type ReadinessState={kind:ReadinessKind|null;phase:'idle'|'read'|'models'|'audio'|'gpu'|'validate'|'ready'|'error';done:number;total:number;label:string;error:string|null;progress?:number};
export type ReadinessRequest={contentPlan?:import('../simulation/progression/run-content').RunContentPlan;snapshot?:RunSnapshot;race?:Race;hero?:HeroId|null;preset?:PresetSlot;difficulty?:Difficulty;campaignMap?:CampaignMapRecipe;stageAdvance?:boolean;tutorial?:boolean;tutorialExit?:boolean};

/** A single entrance gate for every operation that can reveal new battle assets. */
export class AssetReadinessCoordinator {
 state:ReadinessState={kind:null,phase:'idle',done:0,total:0,label:'',error:null};
 private preparedKey='';private beganAt=0;
 private revealTimer:ReturnType<typeof setTimeout>|null=null;
 get showLoading(){return this.state.kind!==null&&(this.state.phase==='ready'||this.state.phase==='error'||performance.now()-this.beganAt>=120);}
 private generation=0;private last:{kind:ReadinessKind;request:ReadinessRequest}|null=null;private reader:FileReader|null=null;private entrance:AbortController|null=null;
 onChange=()=>{};onReady:(kind:ReadinessKind,token:string)=>void=()=>{};
 constructor(private world:World,private view:BattleRenderer,private audio?:AudioEffects,private background?:BackgroundPreparation){}
 private nextMemorySample=0;
 memory={encodedBytes:0,atlasBytes:0,textureEstimate:0,pcmBytes:0,trackedBytes:0,peakTrackedBytes:0,pressure:false};
 sampleMemory(now:number){
  if(now<this.nextMemorySample)return;
  this.nextMemorySample=now+2000;
  const encodedBytes=httpStore()?.memoryReport().residentBlobBytes??0,atlasBytes=this.view.animationAtlasBytes;
  const textureEstimate=textureReport().residentEstimate,pcmBytes=this.audio?.pcmBytes()??0;
  const trackedBytes=encodedBytes+atlasBytes+textureEstimate+pcmBytes;
  // A working-set policy for optional jobs. Safari does not expose its process limit.
  const high=(runtimeBudget().recentOnly?256:512)*1024**2;
  const pressure=trackedBytes>(this.memory.pressure?high*.8:high);
  this.memory={encodedBytes,atlasBytes,textureEstimate,pcmBytes,trackedBytes,peakTrackedBytes:Math.max(trackedBytes,this.memory.peakTrackedBytes),pressure};
 }
 get blocking(){return this.state.kind!==null&&this.state.phase!=='ready'&&this.state.phase!=='error';}
 get readyToken(){return this.state.kind&&this.state.phase==='ready'?`${this.state.kind}:${this.generation}`:null;}
 /** Quiet idle maintenance shares the entrance lock; a new entrance wins if
  * it starts while an older optional decode is still draining. */
 async trimIdleResources(){
  const generation=this.generation;let release:(()=>void)|undefined;
  try{release=this.background?await this.background.enter():undefined;if(generation!==this.generation||this.world.phase!=='menu'||this.state.kind)return;await this.view.waitForPendingAssets();if(generation!==this.generation||this.world.phase!=='menu'||this.state.kind)return;this.view.trimIdleUnitAssets();pruneRetiredTextureBindings();}
  finally{release?.();}
 }
 private update(patch:Partial<ReadinessState>){
  const before=this.state;this.state={...before,...patch};
  if(!this.blocking&&this.revealTimer!==null){clearTimeout(this.revealTimer);this.revealTimer=null;}
  const percent=(s:ReadinessState)=>Math.round(100*(s.progress??(s.total>0?s.done/s.total:0)));
  if(before.kind!==this.state.kind||before.phase!==this.state.phase||before.error!==this.state.error||percent(before)!==percent(this.state)||this.state.phase==='ready')this.onChange();
 }
 private revealPending(generation:number){
  if(this.revealTimer!==null)clearTimeout(this.revealTimer);
  // A lone slow resource may not issue another progress callback after the grace period.
  this.revealTimer=setTimeout(()=>{this.revealTimer=null;if(generation===this.generation&&this.blocking)this.onChange();},125);
 }
 cancel(){this.generation++;this.entrance?.abort();this.reader?.abort();this.reader=null;this.update({kind:null,phase:'idle',done:0,total:0,label:'',error:null,progress:0});}
 async readImportFile(file:File):Promise<string|null>{
  if(file.size>32*1024*1024)throw Error('存档文件过大');
  this.beganAt=performance.now();const generation=++this.generation;this.update({kind:'load',phase:'read',done:0,total:file.size,label:'读取存档文件',error:null,progress:0});this.revealPending(generation);
  const value=await new Promise<string>((resolve,reject)=>{const reader=this.reader=new FileReader();reader.onprogress=event=>{if(generation===this.generation)this.update({done:event.loaded,total:event.lengthComputable?event.total:file.size,label:'读取存档文件'});};reader.onload=()=>resolve(String(reader.result??''));reader.onerror=()=>reject(reader.error??Error('存档读取失败'));reader.onabort=()=>reject(Error('存档读取已取消'));reader.readAsText(file);});
  this.reader=null;if(generation!==this.generation)return null;this.update({phase:'validate',done:0,total:0,label:'校验存档内容'});return value;
 }
 fail(error:string){this.generation++;this.entrance?.abort();if(this.state.kind)this.update({phase:'error',error,label:'资源准备失败'});}
 retry(){return this.last?this.prepare(this.last.kind,this.last.request):Promise.resolve(false);}
 async prepare(kind:ReadinessKind,request:ReadinessRequest={}){
  this.entrance?.abort();const entrance=this.entrance=new AbortController();
  this.beganAt=performance.now();const generation=++this.generation;this.last={kind,request};this.update({kind,phase:'read',done:0,total:0,label:'准备战局',error:null,progress:0});this.revealPending(generation);
  // Independent jobs report into ordered portions of one entrance, never reset its bar.
  const report=(phase:ReadinessState['phase'],start:number,span:number)=>(done:number,total:number,label:string)=>{if(generation===this.generation)this.update({phase,done,total,label,progress:Math.max(this.state.progress??0,start+(total>0?Math.max(0,Math.min(1,done/total))*span:0))});};
  let release:(()=>void)|undefined,ownsView=false,errorsBefore:string[]=[];
  try{
   release=this.background?await this.background.enter(entrance.signal):undefined;
   if(generation!==this.generation)return false;
   ownsView=true;errorsBefore=[...(this.view.modelErrors??[])];
   this.view.entryPreparation=true;
   this.view.preparationControl={cancelled:()=>generation!==this.generation};
   if(optimizedGraphics())await applyPendingTextureTier(()=>generation!==this.generation);
   if(generation!==this.generation)return false;
   const desiredMap=request.snapshot?.config.campaignMap??request.campaignMap;
   const lesson=!!(request.tutorial||desiredMap?.lesson||!request.tutorialExit&&this.world.campaignRecipe?.lesson);
   const rescueRace=request.snapshot?.config.race??request.race??this.world.expedition.race,rescue=RESCUE_PRESENTATION[rescueRace];
   if(!this.view.initialAssetsLoaded){
    const allMapAssets=[...campaignPreloadAssets(),...(Object.keys(MAP_VISUAL_PROFILES) as CampaignTheme[]).flatMap(environmentAssetIds)];
    const mapAssets=desiredMap?[...campaignMapAssets(desiredMap),...(lesson?[]:environmentAssetIds(desiredMap.theme))]:allMapAssets,otherMapAssets=new Set(allMapAssets.filter(id=>!mapAssets.includes(id)));
    const common=[...ASSETS.values()].filter(asset=>asset.status==='available'&&['texture','effect-texture'].includes(asset.kind)&&!otherMapAssets.has(asset.id)&&!(desiredMap&&optimizedGraphics()&&asset.id.startsWith('map.image.'))).map(asset=>asset.id);
    const fixed=['model.'+rescue.workerModel,'model.'+rescue.carrierModel,'model.'+rescue.carrierDeathModel,...(rescue.carrierBirthModel?['model.'+rescue.carrierBirthModel]:[]),'model.drone','model.egg','model.hive','model.loot.mineral','model.loot.gas','model.loot.large','model.projectile.marauder','model.projectile.hydralisk'];
    await prepareEmbeddedAssetIds([...common,...fixed,...mapAssets],report('models',.05,.1));
   }
   if(generation!==this.generation)return false;
   const prepareAudio=async()=>{
    if(!this.audio)return;
    const state=request.snapshot?.state??this.world;
    const stage=kind==='new'?1:Math.min(18,state.stage+Number(state.phase==='reward'));
    const identities=[...state.entities.values(),...(request.hero?[{heroId:request.hero}]:[])];
    const plan=request.snapshot?.config.contentPlan??request.contentPlan??this.world.runConfig?.contentPlan;
    const content=plan?stageContentAssets(plan,stage,state.endless?state.endless.round+Number(state.phase==='reward'):undefined,state.funShop.levels,state.expedition.familySlots,[]):undefined;
    for(const heroId of content?.heroes??[])identities.push({heroId});
    for(const hero of state.heroes?.values()??[])identities.push({heroId:hero.id});
    const progress=report('audio',.72,.04);
    await this.audio.prepareBanks(audioPreloadBanks(rescueRace,stage,identities,!!content),
     (done,total,label)=>{if(this.state.phase==='audio')progress(done,total,label);},
     ()=>generation!==this.generation,entrance.signal);
   };
   // The original renderer prepares audio alongside models. Both formats use only the stage's banks.
   const audioReady=optimizedGraphics()?undefined:prepareAudio().then(()=>null,error=>error as Error);
   if(!this.view.initialAssetsLoaded){await this.view.load((label,done=0,total=0)=>report('models',.15,.2)(done,total,label),rescueRace,!!desiredMap,true);}
   if(generation!==this.generation)return false;
   const models=report('models',.35,.37);models(0,1,'准备部队');
   if(lesson)await this.view.prepareTutorialAssets(rescueRace,models);
   else if(kind==='load'&&request.snapshot)await this.view.prepareSnapshotAssets(request.snapshot,models);
   else if(kind==='endless')await this.view.prepareEndlessAssets(models);
   else if(kind==='new'&&request.race)await this.view.prepareNewRunAssets(request.race,request.hero??null,models,request.preset,request.difficulty,request.contentPlan);
   else if(kind==='reinforcement')await this.view.prepareCurrentAssets(models,!!request.stageAdvance);
   await this.view.waitForPendingAssets();
   if(generation!==this.generation)return false;
   report('audio',.72,0)(0,1,'准备音效');
   if(audioReady){const error=await audioReady;if(error)throw error;}
   else await prepareAudio();
   if(generation!==this.generation)return false;
   report('gpu',.76,0)(0,1,'准备战场');
   if(desiredMap)await this.view.prepareCampaignAssets(desiredMap);
   if(generation!==this.generation)return false;
   const prepareKey=this.view.preparationKey;if(this.preparedKey!==prepareKey)await this.view.compilePresentation(this.view.scene,this.view.camera);
   if(generation!==this.generation)return false;
   const warmed=await this.view.warmPresentationBatches((done,total,label)=>report('gpu',.8,.17)(done,total,`准备实战模型 ${label}`));
   if(generation!==this.generation)return false;
   if(warmed)await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   if(generation!==this.generation)return false;
   this.preparedKey=prepareKey;
   // The optional lane is drained and required models are already parsed. Drop
   // duplicate encoded Blob copies before starting any resumable stage job.
   if(optimizedGraphics()){httpStore()?.trimModelCache(runtimeBudget().recentOnly?12*1024**2:48*1024**2);pruneRetiredTextureBindings();releaseGpuDecoder();}
   if(this.background&&!lesson&&(request.stageAdvance||kind==='endless')){
    const jobs=this.view.stagePreparationJobs(cancelled=>this.background!.checkpoint(cancelled,true,true));
    await this.background.prepareStage(jobs,optimizedGraphics()?0:Math.max(0,5000-(performance.now()-this.beganAt)),entrance.signal);
    if(generation!==this.generation)return false;
   }
   report('validate',.98,0)(0,1,'校验战局与地图');
   if(kind==='endless'&&!this.world.previewEndlessTransition())throw Error('无尽战场落点或状态校验失败');
   if(kind==='load'&&request.snapshot)this.world.restoreRun(request.snapshot,true);
   if(this.view.modelErrors.length)throw Error(this.view.modelErrors.at(-1));
   this.update({phase:'ready',done:1,total:1,progress:1,label:(kind==='reinforcement'?'资源就绪':'就绪 · 请确认继续')+(httpAssetStatus()?.warning?' · 本次资源未能全部缓存，下次可能需补下载':'')});const token=this.readyToken;if(generation===this.generation&&token)this.onReady(kind,token);return true;
  }catch(error){if(generation===this.generation){this.generation++;entrance.abort();this.update({phase:'error',error:String((error as Error).message),label:'资源准备失败'});}return false;}finally{if(ownsView){if(generation!==this.generation)this.view.modelErrors=errorsBefore;this.view.preparationControl=undefined;this.view.entryPreparation=false;releaseGpuDecoder();}release?.();}
 }
}

