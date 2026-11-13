import {ARMED_CARDS,ARMED_CARD_BY_ID,ARMED_RULES,type ArmedCard} from '../../data/terran-armed-support';
import type {ExpeditionState} from '../expedition-state';
import type {ShopSupportState} from '../combat/shop-support';

export type ArmedId=ArmedCard['id'];
export type BuildBranch='armed'|'doomsday'|'bio';
export interface BuildMilestone {id:string;branch:BuildBranch;at:number;offers:ArmedId[];claimed:ArmedId|null;deferredWindow?:number}
export interface BuildProgress {counts:Partial<Record<BuildBranch,number>>;main:BuildBranch|null;milestones:BuildMilestone[];orange:ArmedId|null}
export interface ArmedPurchaseReceipt {offerId:string;cardId:ArmedId;rank:number;progress:number}
export const newBuildProgress=():BuildProgress=>({counts:{},main:null,milestones:[],orange:null});
export const LEGACY_ARMED={G01:'mines',G02:'terran.bunker',G07:'terran.ricochet',G08:'mutation',B07:'terran.missiles',B09:'terran.overdrive'} as const;
export function armedRank(s:ShopSupportState,id:ArmedId):number {
 const stored=s.armed?.ranks[id]??0,legacy=LEGACY_ARMED[id as keyof typeof LEGACY_ARMED];
 return Math.max(stored,!legacy?0:legacy in s.levels?s.levels[legacy as keyof typeof s.levels]:s.unique.levels[legacy as keyof typeof s.unique.levels]??0);
}
export function armedPurchaseLegal(s:ShopSupportState,id:ArmedId){
 const c=ARMED_CARD_BY_ID[id],rank=armedRank(s,id);if(!c||c.purchase==='node'||c.purchase==='orange')return false;
 return c.purchase==='white-rank'||c.purchase==='rank'?rank<ARMED_RULES.maxRank:c.purchase==='reserve'?rank===0||(s.armed?.reserves[id]??0)<ARMED_RULES.reserveLimit:rank===0;
}
export function armedOrangeEligible(s:ExpeditionState){const b=s.build;return s.race==='terran'&&b?.main==='armed'&&!b.orange&&(b.counts.armed??0)>=ARMED_RULES.orangeAt&&b.milestones.filter(m=>m.branch==='armed'&&m.claimed).length>=ARMED_RULES.orangeClaims;}
/** Called once after a real wallet/effect transaction; old acquisitions never backfill progress. */
export function recordArmedPurchase(s:ExpeditionState,id:ArmedId,offerId:string,previousRank:number){
 const a=s.support.armed!;if(a.purchases.some(r=>r.offerId===offerId))return false;
 const c=ARMED_CARD_BY_ID[id],rank=c.purchase==='white-rank'||c.purchase==='rank'?previousRank+1:1;
 a.ranks[id]=rank;
 if(c.purchase==='reserve'&&previousRank>0)a.reserves[id]=(a.reserves[id]??0)+1;
 const progress=c.purchase==='orange'||c.purchase==='white-rank'&&previousRank>0?0:1,b=s.build??=newBuildProgress();
 if(c.purchase==='orange')b.orange=id;
 a.purchases.push({offerId,cardId:id,rank,progress});b.counts.armed=(b.counts.armed??0)+progress;
 if(!b.main||b.main==='armed')for(let at=ARMED_RULES.nodeEvery;at<=(b.counts.armed??0);at+=ARMED_RULES.nodeEvery){const key='armed:'+at;if(!b.milestones.some(m=>m.id===key))b.milestones.push({id:key,branch:'armed',at,offers:[],claimed:null});}
 return true;
}
const owned=(s:ShopSupportState,ids:readonly ArmedId[])=>ids.some(id=>armedRank(s,id)>0);
export function armedNodeLegal(s:ExpeditionState,id:ArmedId){
 if(!id.startsWith('N')||s.race!=='terran')return false;
 const a=s.support;if((a.armed?.nodeReserves[id]??0)>=ARMED_RULES.reserveLimit)return false;
 const has=(ids:readonly ArmedId[])=>owned(a,ids);
 switch(id){
 case 'N01':return has(['W01','W04','B01','B04','B07','P01','P06']);
 case 'N02':return has(['W01','W02','G03','G05','G06','B03','B05','B06'])||!!s.building?.groups.some(g=>g.outputs.length>0);
 case 'N03':return has(['W01','W02','G03','G05','G06','B03','B05','B06','B08'])||!!s.building?.groups.some(g=>g.outputs.length>0);
 case 'N04':return has(['G01','B02','P04','W05','W06']);
 case 'N05':return has(['P01','O01']);
 case 'N06':return has(['W01','B05','P02'])&&has(['W04','B04','B07']);
 case 'N07':return has(['G01','G02','W05'])&&has(['W04','B01','B04']);
 case 'N08':return has(['B02','W05'])&&has(['G04','P03','G05']);
 case 'N09':return has(['W02','G03','B05'])&&has(['G02','P05']);
 default:return false;
 }
}
/** Only freeze when two legal options exist; reopen/failure never rerolls a choice. */
export function prepareBuildChoices(s:ExpeditionState,random:()=>number,ready:(id:ArmedId)=>boolean=()=>true){
 const b=s.build;if(!b||b.main&&b.main!=='armed')return;
 for(const m of b.milestones){if(m.branch!=='armed'||m.claimed)continue;if(m.offers.length)return;
  const legal=ARMED_CARDS.filter(c=>c.purchase==='node'&&ready(c.id)&&armedNodeLegal(s,c.id)).map(c=>c.id);
  if(legal.length<2)return;
  const fresh=legal.filter(id=>!armedRank(s.support,id)),repeat=legal.filter(id=>armedRank(s.support,id)>0),picked:ArmedId[]=[];
  for(const pool of [fresh,repeat])while(pool.length&&picked.length<2){const index=Math.min(pool.length-1,Math.floor(Math.max(0,random())*pool.length));picked.push(pool.splice(index,1)[0]);}
  m.offers=picked;return;
 }
}
export function validateBuildProgress(b:BuildProgress|undefined,support?:ShopSupportState){
 if(b===undefined)return;
 const branches=['armed','doomsday','bio'];
 if(!b||!b.counts||typeof b.counts!=='object'||Object.entries(b.counts).some(([key,v])=>!branches.includes(key)||!Number.isSafeInteger(v)||v!<0)||b.main!==null&&!branches.includes(b.main)||!Array.isArray(b.milestones)||b.orange!==null&&!['O01','O02','O03'].includes(b.orange))throw Error('构筑进度无效');
 if(b.main&&!(b.counts[b.main]!>=ARMED_RULES.lockAt)||new Set(b.milestones.map(m=>m.id)).size!==b.milestones.length)throw Error('构筑主分支无效');
 for(const m of b.milestones)if((b.main!==null||m.claimed!==null)&&m.branch!==b.main||!branches.includes(m.branch)||!Number.isSafeInteger(m.at)||m.at<ARMED_RULES.nodeEvery||m.at%ARMED_RULES.nodeEvery||m.at>(b.counts[m.branch]??0)||m.id!==m.branch+':'+m.at||!Array.isArray(m.offers)||![0,2].includes(m.offers.length)||new Set(m.offers).size!==m.offers.length||m.offers.some(id=>!ARMED_CARD_BY_ID[id]||!id.startsWith('N'))||m.claimed!==null&&!m.offers.includes(m.claimed))throw Error('构筑节点选择无效');
 for(const m of b.milestones)if(m.deferredWindow!==undefined&&(!Number.isSafeInteger(m.deferredWindow)||m.deferredWindow<1))throw Error('节点留待下关状态无效');
 if(b.main&&!b.milestones.some(m=>m.claimed)&&!(b.main==='armed'&&b.milestones.some(m=>m.at===ARMED_RULES.nodeEvery)))throw Error('构筑主分支缺少节点');
 if(b.orange&&(b.main!=='armed'||(b.counts.armed??0)<ARMED_RULES.orangeAt||b.milestones.filter(m=>m.claimed).length<ARMED_RULES.orangeClaims||support&&!support.armed?.purchases.some(r=>r.cardId===b.orange)))throw Error('构筑橙卡成交无效');
}
