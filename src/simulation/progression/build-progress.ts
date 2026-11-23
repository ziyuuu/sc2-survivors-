import {ZERG_SWARM_BY_ID,ZERG_SWARM_CARDS,isZswId,type ZswCardId} from '../../data/zerg-swarm';
import {swarmRoll,type ZergSwarmState} from '../combat/zerg-swarm-state';
import {BIO_BY_ID,BIO_CARDS,isBioId,type BioId} from '../../data/terran-bio';
import {bioRank,type BioState} from '../combat/bio-state';
import {ARMED_CARDS,ARMED_CARD_BY_ID,ARMED_RULES,type ArmedCard} from '../../data/terran-armed-support';
import {DOOMSDAY_CARDS,DOOMSDAY_CARD_BY_ID,isDoomsdayId,type DoomsdayId} from '../../data/terran-doomsday';
import {doomsdayRank,newDoomsdayState,type DoomsdayState} from '../combat/doomsday-state';
import type {ExpeditionState} from '../expedition-state';
import type {ShopSupportState} from '../combat/shop-support';

export type ArmedId=ArmedCard['id'];
export type BuildCardId=ArmedId|DoomsdayId|BioId|ZswCardId;
export type BuildBranch='armed'|'doomsday'|'bio'|'zerg-swarm';
export interface BuildMilestone {id:string;branch:BuildBranch;at:number;offers:BuildCardId[];claimed:BuildCardId|null;deferredWindow?:number}
export interface BuildProgress {counts:Partial<Record<BuildBranch,number>>;main:BuildBranch|null;milestones:BuildMilestone[];orangeAt?:number;orange:BuildCardId|null}
export interface ArmedPurchaseReceipt {offerId:string;cardId:ArmedId;rank:number;progress:number}
export const newBuildProgress=():BuildProgress=>({counts:{},main:null,milestones:[],orange:null});
export function buildCard(id:BuildCardId){return isZswId(id)?ZERG_SWARM_BY_ID[id]:isBioId(id)?BIO_BY_ID[id]:isDoomsdayId(id)?DOOMSDAY_CARD_BY_ID[id]:ARMED_CARD_BY_ID[id];}
export function buildCardBranch(id:BuildCardId):BuildBranch{return isZswId(id)?'zerg-swarm':isBioId(id)?'bio':isDoomsdayId(id)?'doomsday':'armed';}
export function ordinaryBuildCardAllowed(s:ExpeditionState,id:BuildCardId){const c=buildCard(id);return !!c&&s.race===(isZswId(id)?'zerg':'terran')&&c.purchase!=='node'&&c.purchase!=='orange'&&(c.quality!=='purple'||s.build?.main===buildCardBranch(id));}
/** First earned milestone wins, including old deferred saves; frozen candidates stay intact. */
export function lockEarnedBuildBranch(b:BuildProgress){
 const previous=b.main;
 if(!b.main)b.main=b.milestones.find(m=>m.at===ARMED_RULES.nodeEvery)?.branch??null;
 if(b.main)b.milestones=b.milestones.filter(m=>m.branch===b.main);
 for(const m of b.milestones)delete m.deferredWindow;
 return previous===null&&b.main!==null;
}
export function buildCardRank(s:ExpeditionState,id:BuildCardId){return isZswId(id)?s.zergSwarm?.ranks[id]??0:isBioId(id)?bioRank(s,id):isDoomsdayId(id)?doomsdayRank(s.doomsday,id):armedRank(s.support,id);}
export function addBuildProgress(s:ExpeditionState,branch:BuildBranch,progress:number){
 const b=s.build??=newBuildProgress();b.counts[branch]=(b.counts[branch]??0)+progress;
 if(b.main&&b.main!==branch)return;
 const count=b.counts[branch]!,step=ARMED_RULES.nodeEvery;
 const add=(at:number)=>{
  const id=branch+':'+at;
  if(!b.milestones.some(m=>m.id===id))b.milestones.push({id,branch,at,offers:[],claimed:null});
 };
 const third=step*ARMED_RULES.orangeClaims;
 for(let at=step;at<=Math.min(count,third);at+=step)add(at);
 lockEarnedBuildBranch(b);
 // A legacy paid ultimate has no orange milestone. Its subsequent purple cadence continues.
 const next=b.orangeAt??(b.orange?third+step:undefined);
 if(next!==undefined)for(let at=next;at<=count&&(branch!=='zerg-swarm'||at===next);at+=step)add(at);
}
export function doomsdayPurchaseLegal(s:ExpeditionState,id:DoomsdayId){
 const c=DOOMSDAY_CARD_BY_ID[id];
 return ordinaryBuildCardAllowed(s,id)&&doomsdayRank(s.doomsday,id)<c.maxRank;
}
/** Effect executors validate before this commit; this never grants historical progress. */
export function recordDoomsdayPurchase(s:ExpeditionState,id:DoomsdayId,offerId:string){
 if(!doomsdayPurchaseLegal(s,id)||s.doomsday?.purchases.some(p=>p.offerId===offerId))return false;
 const a=s.doomsday??=newDoomsdayState(),c=DOOMSDAY_CARD_BY_ID[id],rank=doomsdayRank(a,id)+1;
 const progress=c.purchase==='white-rank'&&rank>1?0:1;
 a.ranks[id]=rank;a.purchases.push({offerId,cardId:id,rank,progress});addBuildProgress(s,'doomsday',progress);
 return true;
}
export const LEGACY_ARMED={G01:'mines',G02:'terran.bunker',G07:'terran.ricochet',G08:'mutation',B07:'terran.missiles',B09:'terran.overdrive'} as const;
export function armedRank(s:ShopSupportState,id:ArmedId):number {
 const stored=s.armed?.ranks[id]??0,legacy=LEGACY_ARMED[id as keyof typeof LEGACY_ARMED];
 return Math.max(stored,!legacy?0:legacy in s.levels?s.levels[legacy as keyof typeof s.levels]:s.unique.levels[legacy as keyof typeof s.unique.levels]??0);
}
export function armedPurchaseLegal(s:ShopSupportState,id:ArmedId){
 const c=ARMED_CARD_BY_ID[id],rank=armedRank(s,id);if(!c||c.purchase==='node'||c.purchase==='orange')return false;
 return c.purchase==='white-rank'||c.purchase==='rank'?rank<ARMED_RULES.maxRank:c.purchase==='reserve'?rank===0||(s.armed?.reserves[id]??0)<ARMED_RULES.reserveLimit:rank===0;
}
/** Called once after a real wallet/effect transaction; old acquisitions never backfill progress. */
export function recordArmedPurchase(s:ExpeditionState,id:ArmedId,offerId:string,previousRank:number){
 const a=s.support.armed!;if(a.purchases.some(r=>r.offerId===offerId))return false;
 const c=ARMED_CARD_BY_ID[id];if(c.purchase==='orange'||c.purchase==='node')return false;
 const rank=c.purchase==='white-rank'||c.purchase==='rank'?previousRank+1:1;
 a.ranks[id]=rank;
 if(c.purchase==='reserve'&&previousRank>0)a.reserves[id]=(a.reserves[id]??0)+1;
 const progress=c.purchase==='white-rank'&&previousRank>0?0:1;
 a.purchases.push({offerId,cardId:id,rank,progress});addBuildProgress(s,'armed',progress);
 return true;
}
export function buildNodeLegal(s:ExpeditionState,id:BuildCardId){
 const card=buildCard(id);
 if(s.race!==(isZswId(id)?'zerg':'terran')||!card)return false;
 if(card.purchase==='orange')return !s.build?.orange;
 if(isZswId(id))return card.purchase==='node'&&buildCardRank(s,id)<3;
 const reserves=isBioId(id)?s.bio?.nodeReserves[id]:isDoomsdayId(id)?s.doomsday?.nodeReserves[id]:s.support.armed?.nodeReserves[id];
 return card.purchase==='node'&&(reserves??0)<ARMED_RULES.reserveLimit;
}
/** Keep frozen candidates, including the two cards promised by older saves. */
export function prepareBuildChoices(s:ExpeditionState,random:()=>number,ready:(id:BuildCardId)=>boolean=()=>true){
 const b=s.build;if(!b)return;
 const seen=new Set<BuildBranch>();
 for(const m of b.milestones){
  if(m.claimed||b.main&&m.branch!==b.main||seen.has(m.branch))continue;
  seen.add(m.branch);
  if(m.offers.length===3)continue;
  const catalogue=m.branch==='armed'?ARMED_CARDS:m.branch==='doomsday'?DOOMSDAY_CARDS:m.branch==='zerg-swarm'?ZERG_SWARM_CARDS:BIO_CARDS;
  const orange=b.orangeAt===m.at;
  const legal=catalogue.filter(c=>c.purchase===(orange?'orange':'node')&&ready(c.id)&&buildNodeLegal(s,c.id)&&!m.offers.includes(c.id)).map(c=>c.id);
  if(legal.length+m.offers.length<3)continue;
  if(orange){m.offers=legal;continue;}
  const fresh=legal.filter(id=>!buildCardRank(s,id)),repeat=legal.filter(id=>buildCardRank(s,id)>0);
  const draw=m.branch==='zerg-swarm'&&s.zergSwarm?()=>swarmRoll(s.zergSwarm!,'offers'):random;
  if(m.branch==='zerg-swarm'&&repeat.length&&!m.offers.some(id=>buildCardRank(s,id)))m.offers.push(repeat.splice(Math.floor(draw()*repeat.length),1)[0]);
  for(const pool of [fresh,repeat])while(pool.length&&m.offers.length<3){
   const index=Math.min(pool.length-1,Math.floor(Math.max(0,draw())*pool.length));
   m.offers.push(pool.splice(index,1)[0]);
  }
 }
}
/** Start the final three purchases only once the third purple claim has settled. */
export function scheduleOrangeChoice(b:BuildProgress){
 if(b.orange||b.orangeAt!==undefined||!b.main)return;
 const claimed=b.milestones.filter(m=>m.branch===b.main&&m.claimed);
 if(claimed.length>=ARMED_RULES.orangeClaims)b.orangeAt=(b.counts[b.main]??0)+ARMED_RULES.nodeEvery;
}
export function validateBuildProgress(b:BuildProgress|undefined,support?:ShopSupportState,doomsday?:DoomsdayState,bio?:BioState,swarm?:ZergSwarmState,race?:string){
 if(b===undefined)return;
 const branches=race==='zerg'?['zerg-swarm']:race&&race!=='terran'?[]:['armed','doomsday','bio',...(race?[]:['zerg-swarm'])];
 if(!b||!b.counts||typeof b.counts!=='object'||Object.entries(b.counts).some(([key,v])=>!branches.includes(key)||!Number.isSafeInteger(v)||v!<0)||b.main!==null&&!branches.includes(b.main)||!Array.isArray(b.milestones)||b.orange!==null&&!['O01','O02','O03','M-O01','M-O02','M-O03','BIO-O01','BIO-O02','BIO-O03','ZSW-O01','ZSW-O02','ZSW-O03'].includes(b.orange))throw Error('构筑进度无效');
 if(b.main&&!(b.counts[b.main]!>=ARMED_RULES.lockAt)||new Set(b.milestones.map(m=>m.id)).size!==b.milestones.length)throw Error('构筑主分支无效');
 if(b.orangeAt!==undefined&&(!Number.isSafeInteger(b.orangeAt)||b.orangeAt<ARMED_RULES.orangeAt||!b.main||b.orangeAt>(b.counts[b.main]??0)+ARMED_RULES.nodeEvery||b.milestones.filter(m=>m.branch===b.main&&m.at<b.orangeAt!&&m.claimed).length<ARMED_RULES.orangeClaims))throw Error('橙色节点门槛无效');
 for(const m of b.milestones){
  const orange=m.at===b.orangeAt;
  const offset=b.orangeAt!==undefined&&m.at>=b.orangeAt?m.at-b.orangeAt:m.at;
  if(!branches.includes(m.branch)||(b.main!==null||m.claimed!==null)&&m.branch!==b.main||
     !Number.isSafeInteger(m.at)||m.at<ARMED_RULES.nodeEvery||offset%ARMED_RULES.nodeEvery||
     m.at>(b.counts[m.branch]??0)||m.id!==m.branch+':'+m.at)throw Error('构筑节点门槛无效');
  // A historical purple pair is valid on disk. Pending pairs gain a third card on preparation.
  if(!Array.isArray(m.offers)||!(orange?[0,3]:[0,2,3]).includes(m.offers.length)||
     new Set(m.offers).size!==m.offers.length||
     m.offers.some(id=>buildCard(id)?.purchase!==(orange?'orange':'node')||buildCardBranch(id)!==m.branch)||
     m.claimed!==null&&!m.offers.includes(m.claimed))throw Error('构筑节点选择无效');
  if(m.deferredWindow!==undefined&&(!Number.isSafeInteger(m.deferredWindow)||m.deferredWindow<1))throw Error('节点留待下关状态无效');
 }
 const last=new Map<BuildBranch,number>(),pending=new Set<BuildBranch>();
 for(const m of b.milestones){if(m.at<=(last.get(m.branch)??0)||m.claimed&&pending.has(m.branch))throw Error('构筑节点顺序无效');last.set(m.branch,m.at);if(!m.claimed)pending.add(m.branch);}
 if(b.main&&!b.milestones.some(m=>m.claimed)&&!b.milestones.some(m=>m.branch===b.main&&m.at===ARMED_RULES.nodeEvery))throw Error('构筑主分支缺少节点');
 const ultimate=b.milestones.find(m=>m.at===b.orangeAt);
 if(ultimate&&ultimate.claimed!==b.orange)throw Error('橙色节点回执无效');
 if(b.orange){
  const id=b.orange;
  if(b.main!==buildCardBranch(id)||b.milestones.filter(m=>m.claimed&&m!==ultimate).length<ARMED_RULES.orangeClaims)throw Error('构筑橙卡成交无效');
  if(isZswId(id)){if(ultimate?.claimed!==id||swarm?.ranks[id]!==1)throw Error('虫群增殖橙节点无效');return;}
  const state=isBioId(id)?bio:isDoomsdayId(id)?doomsday:support?.armed;
  if(b.orangeAt!==undefined){
   if(ultimate?.claimed!==id||(isBioId(id)?!bio?.ranks[id]:isDoomsdayId(id)?doomsday&&!doomsday.ranks[id]:support&&!support.armed?.ranks[id]))throw Error('橙色节点领取无效');
  }else if(isBioId(id)||(b.counts[b.main]??0)<ARMED_RULES.nodeEvery*ARMED_RULES.orangeClaims||((isDoomsdayId(id)?doomsday:support)&&!state?.purchases.some(r=>r.cardId===id)))throw Error('构筑橙卡购买回执无效');
 }
}
