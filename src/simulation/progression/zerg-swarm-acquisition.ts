import {ZERG_SWARM_BY_ID,type ZswCardId} from '../../data/zerg-swarm';
import {SWARM_AIR,SWARM_PERIODIC} from '../../data/zerg-swarm-rules';
import {newZergSwarmState,swarmLifespan,swarmProductionFactor,swarmRank,swarmRoll,swarmUnlocked,tier} from '../combat/zerg-swarm-state';
import {addBuildProgress,ordinaryBuildCardAllowed} from './build-progress';
import type {World} from '../world';

export function swarmRuntimeReady(w:World,id:ZswCardId){
 return w.expedition.race==='zerg'&&!w.campaignRecipe?.lesson
  &&(id!=='ZSW-P02'||SWARM_AIR.some(f=>swarmUnlocked(w,f)))
  &&(id!=='ZSW-N04'||swarmRank(w.expedition.zergSwarm,'B01')>0);
}
export function swarmOfferLegal(w:World,id:ZswCardId){
 return swarmRuntimeReady(w,id)&&ordinaryBuildCardAllowed(w.expedition,id)
  &&swarmRank(w.expedition.zergSwarm,ZERG_SWARM_BY_ID[id].short)<3;
}
function period(w:World,id:ZswCardId,rank:number){
 const s=w.expedition.zergSwarm!,code=ZERG_SWARM_BY_ID[id].short;
 if(code==='G01'||code==='N01'){
  const g=swarmRank(s,'G01'),n=swarmRank(s,'N01');
  return Math.min(g?tier(g,[24,20,16]):Infinity,n?tier(n,[30,24,18]):Infinity);
 }
 if(code==='G07')return tier(rank,[14,12,10]);
 if(code==='N02')return tier(rank,[20,16,12]);
 return Object.hasOwn(SWARM_PERIODIC,code)?tier(rank,SWARM_PERIODIC[code as keyof typeof SWARM_PERIODIC].cd):undefined;
}
function setClock(w:World,key:string,nextPeriod:number,first:number){
 const s=w.expedition.zergSwarm!,old=s.clocks[key];
 if(old){if(!old.batch)old.next=w.time+Math.max(0,old.next-w.time)/old.period*nextPeriod;old.period=nextPeriod;}
 else s.clocks[key]={period:nextPeriod,next:w.time+first,first:true};
}
export function applySwarmCard(w:World,id:ZswCardId,offerId?:string,hero?:import('../../data/heroes').HeroId){
 if(!swarmRuntimeReady(w,id))return false;
 const c=ZERG_SWARM_BY_ID[id],s=w.expedition.zergSwarm??=newZergSwarmState(w.runConfig?.seed??w.contentSeed),old=s.ranks[id]??0;
 if(old>=c.maxRank||offerId&&(!swarmOfferLegal(w,id)||s.purchases.some(p=>p.offerId===offerId)))return false;
 if(c.short==='O01'&&(hero?!w.heroes.has(hero):w.heroes.size>1))return false;
 if(c.purchase==='orange'&&Object.keys(s.ranks).some(id=>id.startsWith('ZSW-O')))return false;
 const before=swarmProductionFactor(s),rank=old+1;s.ranks[id]=rank;
 const cd=period(w,id,rank);
 if(cd!==undefined){
  const overflow=c.short==='G01'||c.short==='N01';
  setClock(w,overflow?'overflow':c.short,cd,overflow||c.short==='G07'||c.short==='N02'?cd:c.short[0]==='P'?8:5);
 }
 if(c.short==='G01'){const cd=tier(rank,[8,6,4]);setClock(w,'delivery',cd,cd);}
 if(c.short==='W01')for(const j of w.expedition.ledger)if(j.state==='training'&&!j.refit)j.remaining*=swarmProductionFactor(s)/before;
 if(c.short==='B01')fillSwarmExpansions(w);
 if(c.short==='N08')for(const u of w.entities.values())if(u.hp>0&&u.zergSwarm)u.zergSwarm.expires=u.bornAt+swarmLifespan(s,u.zergSwarm.baseLife);
 if(c.short==='O01')s.twin={hero:hero??[...w.heroes.keys()][0]};
 if(offerId){s.purchases.push({offerId,id,rank});addBuildProgress(w.expedition,'zerg-swarm',c.purchase==='white-rank'&&old?0:1);}
 return true;
}
export function fillSwarmExpansions(w:World){
 const s=w.expedition.zergSwarm,rank=swarmRank(s,'B01');if(!s||s.expanded.length>=rank)return;
 const slots=w.expedition.familySlots.slice(0,5).map((_f,i)=>i).filter(i=>!s.expanded.includes(i));
 while(slots.length&&s.expanded.length<rank)s.expanded.push(slots.splice(Math.floor(swarmRoll(s,'spawn')*slots.length),1)[0]);
}
