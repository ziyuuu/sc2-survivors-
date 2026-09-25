import type {World} from '../simulation/world';
import type {RunSnapshot} from '../simulation/persistence/run-snapshot';
import {PermanentProfile} from '../simulation/progression/permanent-profile';
import {SaveRepository,IndexedSaveBackend,type LegacySaveCandidate,type IncompatibleSaveCandidate} from '../persistence/save-repository';
import {readArchive,writeArchive} from '../persistence/archive';
import {inspectDevArchive,isVerifiedDevEnvelope,wrapDevTalentProfile,type DevImportReport} from '../persistence/dev-profile-import';
import {RACE_NAMES} from '../data/races';
import type {Race} from '../data/races';
import type {Difficulty} from '../data/stages';
import {HERO_IDS_BY_RACE,type HeroId} from '../data/heroes';
import {talentRank} from '../data/mvp-talents';
import type {PresetSlot} from '../simulation/progression/permanent-profile';
import type {SaveBundle} from '../persistence/archive';

export type LegacyCandidate=LegacySaveCandidate;
export interface LoadPreview {id:string;source:'local'|'import';summary:string;snapshot:RunSnapshot|null}
export interface NewRunPreview {id:string;race:Race;difficulty:Difficulty;preset:PresetSlot;hero:HeroId|null;expectedRevision:number}
export async function openSaveProfile(storage?:Pick<Storage,'getItem'|'setItem'|'removeItem'>,factory?:IDBFactory){
 let repository:SaveRepository|null=null,notice='',run:RunSnapshot|null=null,savedAt=0,legacy:LegacyCandidate|null=null,incompatible:IncompatibleSaveCandidate|null=null,archiveProfile:string|undefined;
 const profile=new PermanentProfile();
 try{
  if(!factory)throw Error('浏览器本地存储不可用');
  repository=new SaveRepository(new IndexedSaveBackend(factory));
  const loaded=await repository.load();
  notice=loaded.notice;savedAt=loaded.savedAt;legacy=loaded.legacy;incompatible=loaded.incompatible;
  if(loaded.bundle){
   if(!profile.importJSON(loaded.bundle.profile))throw Error('永久档案无效');
   run=loaded.bundle.run;archiveProfile=loaded.bundle.profile;
  }
 }catch(e){notice='无法读取本地存档，请使用导入／导出。'+String((e as Error).message);repository=null;}
 if(!run&&!legacy&&storage){for(const key of ['sc2-survivors-talents-v1','sc2-survivors-talents-v1-backup','sc2-survivors-talents-v1-pending']){try{const old=storage.getItem(key);if(!old)continue;const raw=wrapDevTalentProfile(old);legacy={raw,report:inspectDevArchive(raw)};notice='检测到旧本地天赋档，可先导出再选择仅导入永久资源。';break;}catch{}}}
 return {repository,profile,notice,run,savedAt,legacy,incompatible,archiveProfile};
}
export class RunSession {
 message='';savedAt=0;busy=false;onChange=()=>{};
 private pending:RunSnapshot|null;private legacy:LegacyCandidate|null;private incompatible:IncompatibleSaveCandidate|null;
 private archiveProfile:string;private loadTicket:{preview:LoadPreview;bundle:SaveBundle}|null=null;
 private newTicket:NewRunPreview|null=null;
 private queue=Promise.resolve();private scheduled=false;private restoring=false;private lastTime=0;private lastSignature='';private sequence=0;
 constructor(readonly world:World,private repository:SaveRepository|null,initial:{run:RunSnapshot|null;savedAt:number;notice:string;legacy?:LegacyCandidate|null;incompatible?:IncompatibleSaveCandidate|null;archiveProfile?:string}){
  this.pending=initial.run;this.legacy=initial.legacy??null;this.incompatible=initial.incompatible??null;this.savedAt=initial.savedAt;this.message=initial.notice;this.archiveProfile=initial.archiveProfile??world.permanentProfile.exportJSON();
  if(this.pending){try{world.restoreRun(this.pending,true);}catch(e){this.pending=null;this.message='本地续局与当前规则或地图不兼容：'+String((e as Error).message);}}
  world.listeners.add(()=>this.observe());
  world.permanentProfile.listeners.add(()=>{if(!this.restoring&&(!this.legacy||world.phase!=='menu'))this.requestSave();});
 }
 get canResume(){return !!this.pending&&!['lost','finished'].includes(this.pending.state.phase);}
 get hasLegacyCandidate(){return !!this.legacy;}
 get hasIncompatibleCandidate(){return !!this.incompatible;}
 get incompatibleError(){return this.incompatible?.error??'';}
 exportIncompatibleJSON(){return this.incompatible?.raw??null;}
 get legacyReport(){return this.legacy?.report??null;}
 get legacyError(){return this.legacy?.error??'';}
 get summary(){const s=this.pending?.state;if(!s)return '';return s.phase==='lost'?'上一局已结束':RACE_NAMES[s.runConfig!.race]+'／'+({easy:'简单',normal:'普通',hard:'困难',hell:'地狱'}[s.difficulty])+' · '+(s.endless?'无尽第 '+s.endless.round+' 轮':'第 '+s.stage+' 关')+' · '+Math.floor(s.time/60)+':'+String(Math.floor(s.time%60)).padStart(2,'0');}
 private observe(){if(this.restoring||this.world.phase==='menu')return;const w=this.world;if(!w.runId)return;
  const signature=[w.runId,w.phase,w.stage,w.endless?.round??0,w.paused,w.requiresPlayerDecision,w.stats.started,w.stats.produced,w.stats.rescued,w.stats.failed,w.rerolls,w.rewards.filter(r=>r.sold).map(r=>r.offerId).join(',')].join('|');
  if(w.phase!=='battle'||w.paused||signature!==this.lastSignature||w.time-this.lastTime>=10){this.lastSignature=signature;this.requestSave();}
 }
 requestSave(){if(this.scheduled)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;void this.saveNow().catch(()=>{});});}
 exportJSON(){return writeArchive({profile:this.world.permanentProfile.exportJSON(),run:this.world.phase==='menu'?this.pending:this.world.runId?this.world.captureRun():null});}
 exportLegacyJSON(){return this.legacy?.raw??null;}
 async saveNow(){const raw=this.exportJSON(),version=++this.sequence;this.lastTime=this.world.time;this.busy=true;this.onChange();
  const operation=this.queue.catch(()=>{}).then(async()=>{if(!this.repository)throw Error('本地存储不可用，请导出存档文件');await this.repository.commit(raw);});this.queue=operation;
  try{await operation;if(version===this.sequence){this.savedAt=readArchive(raw).savedAt;this.archiveProfile=this.world.permanentProfile.exportJSON();this.message='战局与永久档案已保存。';}}
  catch(e){if(version===this.sequence)this.message='保存失败，当前进度仍在内存中，请导出存档。'+String((e as Error).message);throw e;}
  finally{if(version===this.sequence){this.busy=false;this.onChange();}}
 }
 /** Read-only candidate validation; no profile or World mutation. */
 inspectSave(raw:string):{kind:'current';bundle:SaveBundle}|{kind:'legacy';report:DevImportReport|null;error?:string}|{kind:'incompatible';raw:string;error:string}{
  try{
   const {bundle}=readArchive(raw);
   if(bundle.run)this.world.restoreRun(bundle.run,true);
   return {kind:'current',bundle};
  }catch(e){
   if(String((e as Error).message).includes('旧 Acropolis 无尽档'))return {kind:'incompatible',raw,error:String((e as Error).message)};
   try{return {kind:'legacy',report:inspectDevArchive(raw)};}catch(error){if(isVerifiedDevEnvelope(raw))return {kind:'legacy',report:null,error:String((error as Error).message)};throw e;}
  }
 }
 prepareNewRun(race:Race,difficulty:Difficulty,preset:PresetSlot,hero:HeroId|null):NewRunPreview{
  if(this.world.phase!=='menu')throw Error('只能从标题开始新战局');
  const allocation=this.world.permanentProfile.previewTalentAllocation(race,preset);
  if(!allocation)throw Error('天赋预设前置或资源不足');
  const required=talentRank(allocation.levels,race,'hero_support')>0;
  if(required&&(!hero||!HERO_IDS_BY_RACE[race].includes(hero as never)))throw Error('请选择本族开局英雄');
  const preview:NewRunPreview={id:`new:${++this.sequence}`,race,difficulty,preset,hero:required?hero:null,expectedRevision:this.world.permanentProfile.revision};
  this.newTicket=preview;return preview;
 }
 cancelPreparedNewRun(){this.newTicket=null;}
 commitNewRun(id:string,readyToken:string,currentReadyToken:string){
  const ticket=this.newTicket,p=this.world.permanentProfile;
  if(!ticket||ticket.id!==id||!readyToken||readyToken!==currentReadyToken||ticket.expectedRevision!==p.revision||this.world.phase!=='menu')return false;
  const oldProfile=p.exportJSON();
  this.restoring=true;
  try{
   if(!p.activatePreset(ticket.race,ticket.preset)||!this.world.selectRace(ticket.race)||!this.world.setDifficulty(ticket.difficulty)||!this.world.start(ticket.hero??undefined))throw Error('新局配置提交失败');
   this.pending=null;this.newTicket=null;this.loadTicket=null;this.lastTime=this.world.time;this.message='新战局已开始。';this.requestSave();return true;
  }catch(error){p.importJSON(oldProfile);this.world.selectRace(p.activeRace);this.world.resetRun();this.message='新局启动失败，原续局保留：'+String((error as Error).message);return false;}
  finally{this.restoring=false;this.onChange();}
 }
 /** Inspection never changes the live World or permanent profile. The preview ID is single-use. */
 prepareLoad(raw?:string):LoadPreview{
  const source=raw===undefined?'local':'import';
  const candidate=raw===undefined?{kind:'current' as const,bundle:{profile:this.archiveProfile,run:this.pending}}:this.inspectSave(raw);
  if(candidate.kind==='incompatible'){this.incompatible={raw:candidate.raw,error:candidate.error};throw Error(candidate.error);}
  if(candidate.kind==='legacy')throw Error(candidate.error??'旧开发战局不能续玩；可在读档页导出原档并单独导入永久资源');
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
  const oldProfile=this.world.permanentProfile.exportJSON(),oldPending=this.pending,oldArchive=this.archiveProfile;
  this.restoring=true;
  try{
   if(ticket.bundle.run)this.world.restoreRun(ticket.bundle.run,true);
   if(!this.world.permanentProfile.importJSON(ticket.bundle.profile))throw Error('永久档案无效');
   this.pending=ticket.bundle.run;this.archiveProfile=ticket.bundle.profile;
   if(this.pending){this.world.restoreRun(this.pending);this.pending=null;this.lastTime=this.world.time;this.message='已按档内种族和难度恢复；战斗保持暂停。';}
   else {this.world.selectRace(this.world.permanentProfile.activeRace);this.message='永久档案已导入。';}
   this.loadTicket=null;this.requestSave();return true;
  }catch(e){this.world.permanentProfile.importJSON(oldProfile);this.pending=oldPending;this.archiveProfile=oldArchive;this.message='读档失败，当前战局未改变：'+String((e as Error).message);return false;}
  finally{this.restoring=false;this.onChange();}
 }
 resume(){if(!this.canResume)return false;this.restoring=true;try{this.world.restoreRun(this.pending!);this.pending=null;this.lastTime=this.world.time;this.message='已恢复战局；确认后继续行动。';return true;}catch(e){this.message=String((e as Error).message);return false;}finally{this.restoring=false;this.onChange();}}
 keepRun(){if(this.world.runId&&this.world.phase!=='menu'){this.pending=readArchive(this.exportJSON()).bundle.run;this.requestSave();}this.lastSignature='';}
 importJSON(raw:string){
  if(this.world.phase!=='menu')throw Error('请先返回标题再导入存档');
  const candidate=this.inspectSave(raw);
  if(candidate.kind==='incompatible'){this.incompatible={raw:candidate.raw,error:candidate.error};this.message=candidate.error;this.onChange();return 'incompatible' as const;}
  if(candidate.kind==='legacy'){
   this.legacy={raw,report:candidate.report,error:candidate.error};
   this.message=candidate.report?'旧开发战局不可续玩。请导出原档，再决定是否仅导入永久资源。':'旧档资源核算被拒绝。可以导出原档；'+candidate.error;
   this.onChange();return 'legacy' as const;
  }
  const oldProfile=this.world.permanentProfile.exportJSON(),oldPending=this.pending,oldLegacy=this.legacy;
  this.restoring=true;
  try{
   if(!this.world.permanentProfile.importJSON(candidate.bundle.profile))throw Error('永久档案无效');
   this.pending=candidate.bundle.run;this.legacy=null;
   const hasRun=!!this.pending;
   if(this.pending){
    if(!this.resume())throw Error(this.message);
   }else this.world.selectRace(this.world.permanentProfile.activeRace);
   this.message=hasRun?'战局已恢复，保持暂停。':'永久档案已导入。';
  }catch(e){this.world.permanentProfile.importJSON(oldProfile);this.pending=oldPending;this.legacy=oldLegacy;throw e;}
  finally{this.restoring=false;this.onChange();}
  this.requestSave();return 'current' as const;
 }
 confirmLegacyImport(checksum:string){
  if(this.world.phase!=='menu'||!this.legacy?.report||this.legacy.report.sourceArchiveChecksum!==checksum)return false;
  const report=this.legacy.report;
  this.restoring=true;
  try{
   if(!this.world.permanentProfile.replaceWithLegacy(checksum,report.principal,report.awardReceipts))return false;
   this.pending=null;this.legacy=null;this.world.selectRace('terran');
   this.message='已仅导入永久资源；旧战局没有被加载。';
  }finally{this.restoring=false;}
  this.requestSave();this.onChange();return true;
 }
 cancelLegacyImport(){this.legacy=null;this.message='已取消旧档导入，原档保持不变。';this.onChange();}
 report(){return {canResume:this.canResume,savedAt:this.savedAt,busy:this.busy,message:this.message,legacy:this.legacy?.report??null,legacyError:this.legacyError};}
}
