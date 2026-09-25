import type {RunSnapshot} from '../simulation/persistence/run-snapshot';
import type {World} from '../simulation/world';
import type {BattleRenderer} from '../render/scene/battle-renderer';
import type {Race} from '../data/races';
import type {HeroId} from '../data/heroes';
import type {AudioEffects} from '../render/effects/audio';
import {ASSETS} from '../assets/manifest';
import {prepareEmbeddedAssetIds} from '../assets/offline-pack';

export type ReadinessKind='new'|'load'|'endless'|'reinforcement';
export type ReadinessState={kind:ReadinessKind|null;phase:'idle'|'read'|'models'|'audio'|'gpu'|'validate'|'ready'|'error';done:number;total:number;label:string;error:string|null};
export type ReadinessRequest={snapshot?:RunSnapshot;race?:Race;hero?:HeroId|null};

/** A single entrance gate for every operation that can reveal new battle assets. */
export class AssetReadinessCoordinator {
 state:ReadinessState={kind:null,phase:'idle',done:0,total:0,label:'',error:null};
 private generation=0;private last:{kind:ReadinessKind;request:ReadinessRequest}|null=null;private reader:FileReader|null=null;
 onChange=()=>{};
 constructor(private world:World,private view:BattleRenderer,private audio?:AudioEffects){}
 get blocking(){return this.state.kind!==null&&this.state.phase!=='ready'&&this.state.phase!=='error';}
 get readyToken(){return this.state.kind&&this.state.phase==='ready'?`${this.state.kind}:${this.generation}`:null;}
 private update(patch:Partial<ReadinessState>){this.state={...this.state,...patch};this.onChange();}
 cancel(){this.generation++;this.reader?.abort();this.reader=null;this.update({kind:null,phase:'idle',done:0,total:0,label:'',error:null});}
 async readImportFile(file:File):Promise<string|null>{
  if(file.size>32*1024*1024)throw Error('存档文件过大');
  const generation=++this.generation;this.update({kind:'load',phase:'read',done:0,total:file.size,label:'读取存档文件',error:null});
  const value=await new Promise<string>((resolve,reject)=>{const reader=this.reader=new FileReader();reader.onprogress=event=>{if(generation===this.generation)this.update({done:event.loaded,total:event.lengthComputable?event.total:file.size,label:'读取存档文件'});};reader.onload=()=>resolve(String(reader.result??''));reader.onerror=()=>reject(reader.error??Error('存档读取失败'));reader.onabort=()=>reject(Error('存档读取已取消'));reader.readAsText(file);});
  this.reader=null;if(generation!==this.generation)return null;this.update({phase:'validate',done:0,total:0,label:'校验存档内容'});return value;
 }
 fail(error:string){this.generation++;if(this.state.kind)this.update({phase:'error',error,label:'资源准备失败'});}
 retry(){return this.last?this.prepare(this.last.kind,this.last.request):Promise.resolve(false);}
 async prepare(kind:ReadinessKind,request:ReadinessRequest={}){
  const generation=++this.generation;this.last={kind,request};this.update({kind,phase:'models',done:0,total:0,label:'准备资源清单',error:null});
  try{
   if(!this.view.initialAssetsLoaded){
    const common=[...ASSETS.values()].filter(asset=>asset.status==='available'&&['map-data','map-model','texture','effect-texture','audio'].includes(asset.kind)).map(asset=>asset.id);
    const fixed=['model.scv','model.drone','model.egg','model.hive','model.droppod','model.loot.mineral','model.loot.gas','model.loot.large','model.projectile.marauder','model.projectile.hydralisk'];
    await prepareEmbeddedAssetIds([...common,...fixed],(done,total,label)=>{if(generation===this.generation)this.update({phase:'models',done,total,label:`准备内置资源 ${label}`});});
   }
   if(generation!==this.generation)return false;
   const audioReady=this.audio?.preload((done,total,label)=>{if(generation===this.generation)this.update({phase:'audio',done,total,label:`解码音效 ${label}`});}).then(()=>null,error=>error as Error);
   if(!this.view.initialAssetsLoaded){await this.view.load((label,done=0,total=0)=>{if(generation===this.generation)this.update({phase:label.startsWith('GPU')?'gpu':'models',label,done,total});});}
   if(generation!==this.generation)return false;
   if(kind==='load'&&request.snapshot)await this.view.prepareSnapshotAssets(request.snapshot,(done,total,label)=>{if(generation===this.generation)this.update({phase:'models',done,total,label});});
   else if(kind==='endless')await this.view.prepareEndlessAssets((done,total,label)=>{if(generation===this.generation)this.update({phase:'models',done,total,label});});
   else if(kind==='new'&&request.race)await this.view.prepareNewRunAssets(request.race,request.hero??null,(done,total,label)=>{if(generation===this.generation)this.update({phase:'models',done,total,label});});
   else if(kind==='reinforcement')await this.view.prepareCurrentAssets((done,total,label)=>{if(generation===this.generation)this.update({phase:'models',done,total,label});});
   await this.view.waitForPendingAssets();
   const audioError=await audioReady;if(audioError)throw audioError;
   if(generation!==this.generation)return false;
   this.update({phase:'gpu',done:0,total:1,label:'准备画面'});
   await this.view.renderer.compileAsync(this.view.scene,this.view.camera);
   if(generation!==this.generation)return false;
   const warmed=await this.view.warmPresentationBatches((done,total,label)=>{if(generation===this.generation)this.update({phase:'gpu',done,total,label:`准备实战模型 ${label}`});});
   if(generation!==this.generation)return false;
   if(warmed)await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
   if(generation!==this.generation)return false;
   this.update({phase:'validate',done:0,total:1,label:'校验战局与地图'});
   if(kind==='endless'&&!this.world.previewEndlessTransition())throw Error('无尽战场落点或状态校验失败');
   if(kind==='load'&&request.snapshot)this.world.restoreRun(request.snapshot,true);
   if(this.view.modelErrors.length)throw Error(this.view.modelErrors.at(-1));
   this.update({phase:'ready',done:1,total:1,label:'就绪 · 请确认继续'});return true;
  }catch(error){if(generation===this.generation)this.update({phase:'error',error:String((error as Error).message),label:'资源准备失败'});return false;}
 }
}
