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

export interface LoadPreview {id:string;source:'local'|'import';summary:string;snapshot:RunSnapshot|null}
export interface NewRunPreview {id:string;race:Race;difficulty:Difficulty;preset:PresetSlot;hero:HeroId|null;expectedRevision:number;campaignMap?:CampaignMapRecipe}
export async function openSaveProfile(factory?:IDBFactory){
 let repository:SaveRepository|null=null,notice='',run:RunSnapshot|null=null,savedAt=0,archiveProfile:string|undefined;
 const profile=new PermanentProfile();
 try{
  if(!factory)throw Error('浏览器本地存储不可用');
  repository=new SaveRepository(new IndexedSaveBackend(factory));
  const loaded=await repository.load();
  notice=loaded.notice;savedAt=loaded.savedAt;
  if(loaded.bundle){
   if(!profile.importJSON(loaded.bundle.profile))throw Error('永久档案无效');
   run=loaded.bundle.run;archiveProfile=loaded.bundle.profile;
  }
 }catch(e){notice='无法读取本地存档，请使用导入／导出。'+String((e as Error).message);repository=null;}
 return {repository,profile,notice,run,savedAt,archiveProfile};
}
export class RunSession {
 message='';savedAt=0;busy=false;onChange=()=>{};
 private pending:RunSnapshot|null;
 private archiveProfile:string;private loadTicket:{preview:LoadPreview;bundle:SaveBundle}|null=null;
 private newTicket:NewRunPreview|null=null;
 private queue=Promise.resolve();private scheduled=false;private restoring=false;private lastTime=0;private lastSignature='';private sequence=0;
 constructor(readonly world:World,private repository:SaveRepository|null,initial:{run:RunSnapshot|null;savedAt:number;notice:string;archiveProfile?:string}){
  this.pending=initial.run;this.savedAt=initial.savedAt;this.message=initial.notice;this.archiveProfile=initial.archiveProfile??world.permanentProfile.exportJSON();
  if(this.pending){try{world.restoreRun(this.pending,true);}catch(e){this.pending=null;this.message='本地续局与当前规则或地图不兼容：'+String((e as Error).message);}}
  world.listeners.add(()=>this.observe());
  world.permanentProfile.listeners.add(()=>{if(!this.restoring)this.requestSave();});
 }
 get canResume(){return !!this.pending&&!['lost','finished'].includes(this.pending.state.phase);}
 /** Read-only UI projection source; no preparation ticket or restoration is issued. */
 get savedSnapshot():Readonly<RunSnapshot>|null{return this.pending;}
 get summary(){const s=this.pending?.state;if(!s)return '';return s.phase==='lost'?'上一局已结束':RACE_NAMES[s.runConfig!.race]+'／'+({easy:'简单',normal:'普通',hard:'困难',hell:'地狱'}[s.difficulty])+' · '+(s.endless?'无尽第 '+s.endless.round+' 轮':'第 '+s.stage+' 关')+' · '+Math.floor(s.time/60)+':'+String(Math.floor(s.time%60)).padStart(2,'0');}
 private observe(){if(this.restoring||this.world.phase==='menu')return;const w=this.world;if(!w.runId)return;
  const signature=[w.runId,w.phase,w.stage,w.endless?.round??0,w.paused,w.requiresPlayerDecision,w.stats.started,w.stats.produced,w.stats.rescued,w.stats.failed,w.rerolls,w.rewards.filter(r=>r.sold).map(r=>r.offerId).join(',')].join('|');
  if(w.phase!=='battle'||w.paused||signature!==this.lastSignature||w.time-this.lastTime>=10){this.lastSignature=signature;this.requestSave();}
 }
 requestSave(){if(this.scheduled)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;void this.saveNow().catch(()=>{});});}
 exportJSON(){return writeArchive({profile:this.world.permanentProfile.exportJSON(),run:this.world.phase==='menu'?this.pending:this.world.runId?this.world.captureRun():null});}
 async saveNow(){const raw=this.exportJSON(),version=++this.sequence;this.lastTime=this.world.time;this.busy=true;this.onChange();
  const operation=this.queue.catch(()=>{}).then(async()=>{if(!this.repository)throw Error('本地存储不可用，请导出存档文件');await this.repository.commit(raw);});this.queue=operation;
  try{await operation;if(version===this.sequence){this.savedAt=readArchive(raw).savedAt;this.archiveProfile=this.world.permanentProfile.exportJSON();this.message='战局与永久档案已保存。';}}
  catch(e){if(version===this.sequence)this.message='保存失败，当前进度仍在内存中，请导出存档。'+String((e as Error).message);throw e;}
  finally{if(version===this.sequence){this.busy=false;this.onChange();}}
 }
 /** Read-only candidate validation; no profile or World mutation. */
 inspectSave(raw:string):{kind:'current';bundle:SaveBundle}{
  const {bundle}=readArchive(raw);
  if(bundle.run)this.world.restoreRun(bundle.run,true);
  return {kind:'current',bundle};
 }
 prepareNewRun(race:Race,difficulty:Difficulty,preset:PresetSlot,hero:HeroId|null):NewRunPreview{
  if(this.world.phase!=='menu')throw Error('只能从标题开始新战局');
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
   this.pending=null;this.newTicket=null;this.loadTicket=null;this.lastTime=this.world.time;this.message='新战局已开始。';this.requestSave();return true;
  }catch(error){p.importJSON(oldProfile);this.world.selectRace(p.activeRace);this.world.resetRun();this.message='新局启动失败，原续局保留：'+String((error as Error).message);return false;}
  finally{this.restoring=false;this.onChange();}
 }
 /** Inspection never changes the live World or permanent profile. The preview ID is single-use. */
 prepareLoad(raw?:string):LoadPreview{
  const source=raw===undefined?'local':'import';
  const candidate=raw===undefined?{kind:'current' as const,bundle:{profile:this.archiveProfile,run:this.pending}}:this.inspectSave(raw);
  const {bundle}=candidate;
  if(!PermanentProfile.parseJSON(bundle.profile))throw Error('永久档案无效');
  if(bundle.run)this.world.restoreRun(bundle.run,true);
  const state=bundle.run?.state;
  const decision=state?.expedition.bossLootQueue.length?'待领取首领奖励':state?.expedition.pendingReceipt?'待决定换兵':state?.expedition.eliteRescueRights.length?'待领取精英救援':state?.pendingElites.length?'待决定精英编入':state?.expedition.pendingTalentLoot?'待领取特殊强化':state?.phase==='reward'?'待选择关间强化':state?.phase==='won'?'待选择撤离或无尽':state?.phase==='endless-ready'?'无尽整备已完成':state?.phase==='battle'&&state.paused?'战斗已暂停':'';
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
  const oldProfile=this.world.permanentProfile.exportJSON(),oldPending=this.pending;
  this.restoring=true;
  try{
   if(!this.world.permanentProfile.importJSON(candidate.bundle.profile))throw Error('永久档案无效');
   this.pending=candidate.bundle.run;
   const hasRun=!!this.pending;
   if(this.pending){
    if(!this.resume())throw Error(this.message);
   }else this.world.selectRace(this.world.permanentProfile.activeRace);
   this.message=hasRun?'战局已恢复，保持暂停。':'永久档案已导入。';
  }catch(e){this.world.permanentProfile.importJSON(oldProfile);this.pending=oldPending;throw e;}
  finally{this.restoring=false;this.onChange();}
  this.requestSave();return 'current' as const;
 }
 report(){return {canResume:this.canResume,savedAt:this.savedAt,busy:this.busy,message:this.message};}
}
