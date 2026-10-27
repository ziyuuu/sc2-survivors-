import {chooseCampaignMap,type CampaignMapRecipe} from '../data/campaign-map';
import type {World} from '../simulation/world';
import type {RunSnapshot} from '../simulation/persistence/run-snapshot';
import {PermanentProfile} from '../simulation/progression/permanent-profile';
import {SaveRepository,IndexedSaveBackend} from '../persistence/save-repository';
import {readArchive,writeArchive} from '../persistence/archive';
import {RACE_NAMES} from '../data/races';
import type {Race} from '../data/races';
import type {Difficulty} from '../data/stages';
import {HERO_IDS_BY_RACE,type HeroId} from '../data/heroes';
import {talentRank} from '../data/mvp-talents';
import type {PresetSlot} from '../simulation/progression/permanent-profile';
import type {SaveBundle} from '../persistence/archive';
import {shopProgress,type ShopProgressSnapshot} from '../ui/presentation/shop-progress';
import type {EquipmentAccount} from '../simulation/starship/types';
import {newManagementState,type ManagementState} from '../ui/starship/host';

export interface LoadPreview {id:string;source:'local'|'import';summary:string;snapshot:RunSnapshot|null}
export interface NewRunPreview {id:string;race:Race;difficulty:Difficulty;preset:PresetSlot;hero:HeroId|null;expectedRevision:number;campaignMap?:CampaignMapRecipe}
export async function openSaveProfile(factory?:IDBFactory){
 let repository:SaveRepository|null=null,notice='',run:RunSnapshot|null=null,savedAt=0,archiveProfile:string|undefined,progress:ShopProgressSnapshot|undefined,equipment:EquipmentAccount|undefined,management:ManagementState|undefined;
 const profile=new PermanentProfile();
 try{
  if(!factory)throw Error('浏览器本地存储不可用');
  repository=new SaveRepository(new IndexedSaveBackend(factory));
  const loaded=await repository.load();
  notice=loaded.notice;savedAt=loaded.savedAt;
  if(loaded.bundle){
   if(!profile.importJSON(loaded.bundle.profile))throw Error('永久档案无效');
   run=loaded.bundle.run;archiveProfile=loaded.bundle.profile;progress=loaded.bundle.shopProgress;equipment=loaded.bundle.equipment;management=loaded.bundle.management;
  }
 }catch(e){notice='无法读取本地存档，请使用导入／导出。'+String((e as Error).message);repository=null;}
 return {repository,profile,notice,run,savedAt,archiveProfile,progress,equipment,management};
}
export class RunSession {
 get memoryOnly(){return this.isolated;}
 get checkpointMode(){return this.world.starship.enabled&&!this.memoryOnly;}
 readonly management:ManagementState;
 private checkpoint:RunSnapshot|null=null;private checkpointRevision=-1;private checkpointProgress:ShopProgressSnapshot|undefined;private isolated=false;private releaseSavePause:(()=>void)|null=null;
 message='';startupNotice='';savedAt=0;busy=false;saveFailed=false;onChange=()=>{};
 private memoryContinuation:{phase:World['phase'];runId:string}|null=null;
 private pending:RunSnapshot|null;
 private pendingProgress:ShopProgressSnapshot|undefined;
 private archiveProfile:string;private loadTicket:{preview:LoadPreview;bundle:SaveBundle}|null=null;
 private newTicket:NewRunPreview|null=null;
 private queue:Promise<unknown>=Promise.resolve();private scheduled=false;private restoring=false;private lastTime=0;private lastSignature='';private sequence=0;private saveSequence=0;
 constructor(readonly world:World,private repository:SaveRepository|null,initial:{run:RunSnapshot|null;savedAt:number;notice:string;archiveProfile?:string;progress?:ShopProgressSnapshot;management?:ManagementState;memoryOnly?:boolean}){
  this.isolated=initial.memoryOnly??false;this.management=initial.management??newManagementState();this.checkpoint=initial.run;this.checkpointProgress=initial.progress;
  this.pendingProgress=initial.progress;shopProgress(world).observe();
  this.pending=initial.run;this.savedAt=initial.savedAt;this.message=initial.notice;this.startupNotice=initial.notice;this.archiveProfile=initial.archiveProfile??world.permanentProfile.exportJSON();
  if(this.pending){try{world.restoreRun(this.pending,true);}catch(e){this.pending=null;this.checkpoint=null;this.repository?.preserveUnreadable();this.saveFailed=true;this.message='本地续局与当前规则或地图不兼容，已停止覆盖原档：'+String((e as Error).message);}}
  world.listeners.add(()=>this.observe());
  world.permanentProfile.listeners.add(()=>{if(!this.restoring)this.requestSave();});
 }
 get canResume(){if(this.memoryContinuation)return this.world.runId===this.memoryContinuation.runId&&!this.world.starship.account.run?.ended;return !!this.pending&&!['lost','finished'].includes(this.pending.state.phase);}
 get hasLiveContinuation(){return !!this.memoryContinuation;}
 /** Read-only UI projection source; no preparation ticket or restoration is issued. */
 get savedSnapshot():Readonly<RunSnapshot>|null{return this.pending;}
 get summary(){const s=this.pending?.state;if(!s)return '';return s.phase==='lost'?'上一局已结束':RACE_NAMES[s.runConfig!.race]+'／'+({easy:'简单',normal:'普通',hard:'困难',hell:'地狱'}[s.difficulty])+' · '+(s.endless?'无尽第 '+s.endless.round+' 轮':'第 '+s.stage+' 关')+' · '+Math.floor(s.time/60)+':'+String(Math.floor(s.time%60)).padStart(2,'0');}
 private observe(){if(this.memoryOnly||this.restoring)return;const w=this.world;
  if(this.checkpointMode){if(w.phase==='menu'){this.requestSave();return;}if(!w.runId)return;if(!w.specialStages.active&&(w.phase!=='battle'||!this.checkpoint||this.checkpoint.state.runId!==w.runId)){try{shopProgress(w).observe();this.captureCheckpoint();this.requestSave();}catch(error){this.recordSaveFailure(error);}}return;}
  if(w.phase==='menu'||!w.runId)return;
  shopProgress(w).observe();
  const signature=[w.runId,w.phase,w.stage,w.endless?.round??0,w.paused,w.requiresPlayerDecision,w.stats.started,w.stats.produced,w.stats.rescued,w.stats.failed,w.rerolls,w.rewards.filter(r=>r.sold).map(r=>r.offerId).join(',')].join('|');
  if(w.phase!=='battle'||w.paused||signature!==this.lastSignature||w.time-this.lastTime>=10){this.lastSignature=signature;this.requestSave();}
 }
 requestSave(){if(this.memoryOnly||this.scheduled)return;this.scheduled=true;queueMicrotask(()=>{if(!this.scheduled)return;this.scheduled=false;if(!this.memoryOnly)void this.saveNow().catch(()=>{});});}
 private captureCheckpoint(){this.checkpoint=this.world.captureRun();this.checkpointRevision=this.world.revision;this.checkpointProgress=shopProgress(this.world).snapshot();}
 private recordSaveFailure(error:unknown){this.saveFailed=true;this.message='保存失败，请重试保存或导出备份；当前进度仍在本页。'+String((error as Error).message);if(this.checkpointMode&&!this.releaseSavePause){this.restoring=true;try{if(this.world.phase==='battle')this.world.paused=true;this.releaseSavePause=this.world.acquireInterfacePause();}finally{this.restoring=false;}}this.onChange();}
 exportJSON(){if(this.memoryOnly)throw Error('独立试玩不写入正式存档');
  if(this.checkpointMode){const w=this.world;if(!this.restoring&&w.phase!=='menu'&&!w.specialStages.active&&w.phase!=='battle'&&this.checkpointRevision!==w.revision)this.captureCheckpoint();let run=this.checkpoint;const equipment=run?.starship&&!['lost','finished'].includes(run.state.phase)?run.starship.runtime.account:w.starship.account;
   // Terminal/account management changes replace the account in the terminal snapshot as one transaction.
   if(run?.starship&&['lost','finished'].includes(run.state.phase))run={...run,starship:{...run.starship,runtime:{...run.starship.runtime,account:equipment}}};
   return writeArchive({profile:w.permanentProfile.exportJSON(),run,equipment,management:this.management,shopProgress:this.checkpointProgress});}
  return writeArchive({profile:this.world.permanentProfile.exportJSON(),run:this.world.phase==='menu'?this.pending:this.world.runId?this.world.captureRun():null,shopProgress:this.world.phase==='menu'?this.pendingProgress:this.world.runId?shopProgress(this.world).snapshot():undefined});}
 async saveNow(){this.scheduled=false;let raw:string;try{raw=this.exportJSON();}catch(error){this.recordSaveFailure(error);throw error;}const version=++this.saveSequence;this.lastTime=this.world.time;this.busy=true;this.onChange();
  const operation=this.queue.catch(()=>{}).then(async()=>{if(!this.repository)throw Error('本地存储不可用，请导出存档文件');return this.repository.commit(raw);});this.queue=operation;
  try{const savedAt=await operation;if(version===this.saveSequence){this.savedAt=savedAt;this.saveFailed=false;this.startupNotice='';this.archiveProfile=this.world.permanentProfile.exportJSON();this.message=this.checkpointMode?'装备与关间存档已保存。':'战局与永久档案已保存。';this.restoring=true;try{this.releaseSavePause?.();this.releaseSavePause=null;}finally{this.restoring=false;}}}
  catch(e){if(version===this.saveSequence)this.recordSaveFailure(e);throw e;}
  finally{if(version===this.saveSequence){this.busy=false;this.onChange();}}
 }
 /** Read-only candidate validation; no profile or World mutation. */
 inspectSave(raw:string):{kind:'current';bundle:SaveBundle}{
  if(this.memoryOnly)throw Error('舰装入口暂不读取正式存档');
  const {bundle}=readArchive(raw);
  if(this.checkpointMode&&!bundle.equipment)throw Error('此档案不含旗舰装备，请保留并使用对应版本');
  if(bundle.run)this.world.restoreRun(bundle.run,true);
  return {kind:'current',bundle};
 }
 prepareNewRun(race:Race,difficulty:Difficulty,preset:PresetSlot,hero:HeroId|null):NewRunPreview{
  if(this.world.phase!=='menu')throw Error('只能从标题开始新战局');
  if(!this.world.permanentProfile.difficultyUnlocked(difficulty))throw Error(difficulty==='hard'?'完成普通战役后解锁困难':'完成困难无尽第6关后解锁地狱');
  if(this.checkpointMode&&(this.canResume||this.world.starship.account.run&&!this.world.starship.account.run.ended))throw Error('请先继续已有战局，在撤退关间结算装备后再开始新游戏');
  const allocation=this.world.permanentProfile.previewTalentAllocation(race,preset);
  if(!allocation)throw Error('天赋预设前置或资源不足');
  const required=talentRank(allocation.levels,race,'hero_support')>0;
  if(required&&(!hero||!HERO_IDS_BY_RACE[race].includes(hero as never)))throw Error('请选择本族开局英雄');
  const preview:NewRunPreview={id:`new:${++this.sequence}`,race,difficulty,preset,hero:required?hero:null,expectedRevision:this.world.permanentProfile.revision};
  if(this.world.campaignRecipe){const seed=globalThis.crypto.getRandomValues(new Uint32Array(1))[0];preview.campaignMap=chooseCampaignMap(seed,this.world.campaignRecipe.theme);}
  this.newTicket=preview;return preview;
 }
 cancelPreparedNewRun(){this.newTicket=null;}
 commitNewRun(id:string,readyToken:string,currentReadyToken:string){
  const ticket=this.newTicket,p=this.world.permanentProfile;
  if(!ticket||ticket.id!==id||!readyToken||readyToken!==currentReadyToken||ticket.expectedRevision!==p.revision||this.world.phase!=='menu')return false;
  const oldProfile=p.exportJSON();
  this.restoring=true;
  try{
   if(ticket.campaignMap&&!this.world.configureCampaign(ticket.campaignMap))throw Error('地图未就绪');
   if(!p.activatePreset(ticket.race,ticket.preset)||!this.world.selectRace(ticket.race)||!this.world.setDifficulty(ticket.difficulty)||!this.world.start(ticket.hero??undefined))throw Error('新局配置提交失败');
   shopProgress(this.world).restore(undefined);this.pendingProgress=undefined;this.pending=null;this.memoryContinuation=null;this.newTicket=null;this.loadTicket=null;this.lastTime=this.world.time;if(this.checkpointMode){this.checkpoint=this.world.captureRun();this.checkpointProgress=shopProgress(this.world).snapshot();}this.message='新战局已开始。';this.requestSave();return true;
  }catch(error){p.importJSON(oldProfile);this.world.selectRace(p.activeRace);this.world.resetRun();this.message='新局启动失败，原续局保留：'+String((error as Error).message);return false;}
  finally{this.restoring=false;this.onChange();}
 }
 /** Inspection never changes the live World or permanent profile. The preview ID is single-use. */
 prepareLoad(raw?:string):LoadPreview{
  const source=raw===undefined?'local':'import';
  // Local continuation keeps current in-memory settings even if durable saving
  // is delayed or unavailable. Explicit file imports still own their profile.
  const candidate=raw===undefined?{kind:'current' as const,bundle:{profile:this.world.permanentProfile.exportJSON(),run:this.pending,shopProgress:this.pendingProgress,...(this.checkpointMode?{equipment:this.pending?.starship?.runtime.account??this.world.starship.account,management:this.management}:{})}}:this.inspectSave(raw);
  const {bundle}=candidate;
  if(!PermanentProfile.parseJSON(bundle.profile))throw Error('永久档案无效');
  if(bundle.run)this.world.restoreRun(bundle.run,true);
  const state=bundle.run?.state;
  const decision=state?.expedition.pendingReceipt?'待决定换兵':state?.expedition.eliteRescueRights.length?'待领取精英救援':state?.pendingElites.length?'待决定精英编入':state?.expedition.pendingTalentLoot?'待领取特殊强化':state?.phase==='reward'?'待选择关间强化':state?.phase==='won'?'待选择撤离或无尽':state?.phase==='endless-ready'?'无尽整备已完成':state?.phase==='battle'&&state.paused?'战斗已暂停':'';
  const summary=state?`${RACE_NAMES[state.runConfig!.race]}／${({easy:'简单',normal:'普通',hard:'困难',hell:'地狱'}[state.difficulty])} · ${state.endless?'无尽第'+state.endless.round+'轮':'第'+state.stage+'关'}${decision?' · '+decision:''}`:'仅永久档案';
  const preview:LoadPreview={id:`load:${++this.sequence}`,source,summary,snapshot:bundle.run};
  this.loadTicket={preview,bundle};return preview;
 }
 cancelPreparedLoad(){this.loadTicket=null;}
 commitLoad(id:string,readyToken:string,currentReadyToken:string){
  const ticket=this.loadTicket;if(!ticket||ticket.preview.id!==id||!readyToken||readyToken!==currentReadyToken||this.world.phase!=='menu')return false;
  const oldProfile=this.world.permanentProfile.exportJSON(),oldPending=this.pending,oldArchive=this.archiveProfile,oldProgress=this.pendingProgress;
  this.restoring=true;
  try{
   if(ticket.bundle.run)this.world.restoreRun(ticket.bundle.run,true);
   if(!this.world.permanentProfile.importJSON(ticket.bundle.profile))throw Error('永久档案无效');
   if(ticket.bundle.equipment)this.world.starship.account=structuredClone(ticket.bundle.equipment);
   if(ticket.bundle.management)Object.assign(this.management,structuredClone(ticket.bundle.management));
   if(this.checkpointMode){this.checkpoint=ticket.bundle.run;this.checkpointProgress=ticket.bundle.shopProgress;this.memoryContinuation=null;this.repository?.allowRecovery();}
   this.pending=ticket.bundle.run;this.archiveProfile=ticket.bundle.profile;this.pendingProgress=undefined;
   if(this.pending){this.world.restoreRun(this.pending);shopProgress(this.world).restore(ticket.bundle.shopProgress);this.pendingProgress=undefined;this.pending=null;this.lastTime=this.world.time;this.message='已按档内种族和难度恢复；战斗保持暂停。';}
   else {this.world.selectRace(this.world.permanentProfile.activeRace);this.message='永久档案已导入。';}
   this.loadTicket=null;this.requestSave();return true;
  }catch(e){this.world.permanentProfile.importJSON(oldProfile);this.pending=oldPending;this.archiveProfile=oldArchive;this.pendingProgress=oldProgress;this.message='读档失败，当前战局未改变：'+String((e as Error).message);return false;}
  finally{this.restoring=false;this.onChange();}
 }
 resume(){if(this.memoryContinuation){if(!this.canResume)return false;this.world.phase=this.memoryContinuation.phase;this.memoryContinuation=null;this.pending=null;this.pendingProgress=undefined;this.world.input={x:0,z:0};if(this.world.phase==='battle')this.world.paused=true;this.world.changed();return true;}if(!this.canResume)return false;this.restoring=true;try{this.world.restoreRun(this.pending!);shopProgress(this.world).restore(this.pendingProgress);this.checkpoint=this.pending;this.checkpointProgress=this.pendingProgress;this.pendingProgress=undefined;this.pending=null;this.lastTime=this.world.time;this.message=this.checkpointMode?'已恢复最近检查点；未保存的当前关需要重新挑战。':'已恢复战局；确认后继续行动。';return true;}catch(e){this.message=String((e as Error).message);return false;}finally{this.restoring=false;this.onChange();}}
 keepRun(){if(this.memoryOnly||this.checkpointMode){const w=this.world;if(w.runId&&['battle','reward','won','endless-ready'].includes(w.phase)){if(this.checkpointMode){this.exportJSON();this.pending=this.checkpoint;this.pendingProgress=this.checkpointProgress;}this.memoryContinuation={phase:w.phase,runId:w.runId};w.phase='menu';w.input={x:0,z:0};w.changed();}else if(this.checkpointMode){this.exportJSON();this.pending=null;w.phase='menu';w.changed();}return;}if(this.world.runId&&this.world.phase!=='menu'){const bundle=readArchive(this.exportJSON()).bundle;this.pending=bundle.run;this.pendingProgress=bundle.shopProgress;this.requestSave();}this.lastSignature='';}
 importJSON(raw:string){
  if(this.world.phase!=='menu')throw Error('请先返回标题再导入存档');
  const candidate=this.inspectSave(raw);
  const oldProfile=this.world.permanentProfile.exportJSON(),oldPending=this.pending,oldProgress=this.pendingProgress;
  this.restoring=true;
  try{
   if(!this.world.permanentProfile.importJSON(candidate.bundle.profile))throw Error('永久档案无效');
   if(candidate.bundle.equipment)this.world.starship.account=structuredClone(candidate.bundle.equipment);
   if(candidate.bundle.management)Object.assign(this.management,structuredClone(candidate.bundle.management));
   if(this.checkpointMode){this.checkpoint=candidate.bundle.run;this.checkpointProgress=candidate.bundle.shopProgress;this.memoryContinuation=null;this.repository?.allowRecovery();}
   this.pending=candidate.bundle.run;this.pendingProgress=candidate.bundle.shopProgress;
   const hasRun=!!this.pending;
   if(this.pending){
    if(!this.resume())throw Error(this.message);
   }else this.world.selectRace(this.world.permanentProfile.activeRace);
   this.message=hasRun?'战局已恢复，保持暂停。':'永久档案已导入。';
  }catch(e){this.world.permanentProfile.importJSON(oldProfile);this.pending=oldPending;this.pendingProgress=oldProgress;throw e;}
  finally{this.restoring=false;this.onChange();}
  this.requestSave();return 'current' as const;
 }
 report(){return {canResume:this.canResume,savedAt:this.savedAt,busy:this.busy,message:this.message,...(this.memoryOnly?{mode:'memory-only'}:{})};}
 /** The caller owns readiness/input. A failed write keeps the present checkpoint and prevents departure. */
 async saveBeforeAdvance(){if(this.memoryOnly||!this.checkpointMode)return true;try{await this.saveNow();return true;}catch{return false;}}
}
