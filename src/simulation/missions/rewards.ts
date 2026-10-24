import {MISSION_RULES} from './config';
import {ordinaryHeroAllowed} from '../progression/hero-availability';
import {activeEquipmentEffects} from '../starship/modules';
import {notifyUnitArrival} from '../boss-loot';
import type {World} from '../world';
import type {MissionReward,MissionRecord} from './state';
import {PROJECTS,eligible} from '../building/rules';
import {worldBuildingContext,syncBuildingEffects,syncBuildingWindow} from '../building/expedition';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES,type HeroId} from '../../data/heroes';
import {acquireEliteImmediately} from '../elite-claim';
import {planTaskEquipment,deliverTaskEquipment} from '../starship/drops';
export function reservation(w:World){const m=w.missions.active;return m&&w.missions.claiming!==m.id?m.reward:undefined;}
export function reservedHeroSeats(w:World){const r=reservation(w);return (r?.kind==='hero'&&!w.heroes.has(r.id)?1:0)+(w.encounters.expanded.queen?.hero&&!w.encounters.expanded.queenClaiming?1:0);}
export function reservedEliteSeats(w:World,family:string){const r=reservation(w);return r?.kind==='elite'&&ELITES[r.id].family===family?r.seats:0;}
export function reservedEliteRanks(w:World,family:string){const r=reservation(w);return r?.kind==='elite'&&ELITES[r.id].family===family?r.ranks:0;}
export function identityReserved(w:World,kind:'hero'|'elite',id:string){const r=reservation(w);return r?.kind===kind&&r.id===id||kind==='hero'&&!w.encounters.expanded.queenClaiming&&w.encounters.expanded.queen?.hero===id;}
/** Earlier concrete promises win; a mission never steals a queued identity. */
export function priorIdentityPromise(w:World,kind:'hero'|'elite',id:string){
 const entries=[...w.expedition.bossLootQueue,...w.rewardDrops.filter(d=>d.bossLootReceipt).map(d=>({reward:d.reward,variant:d.bossLootVariant}))];
 if(entries.some(entry=>{const e='expeditionEffect' in entry.reward?entry.reward.expeditionEffect:null;return kind==='hero'?e?.kind==='hero'&&e.heroId===id:e?.kind==='elite'&&entry.variant===id;}))return true;
 if(kind==='hero')return w.starship.bounty?.hero===id||activeEquipmentEffects(w).some(e=>e.key==='opening_hero'&&e.binding?.hero===id&&!w.starship.account.run?.receipts.has(e.source+':hero'));
 return w.starship.pendingMembers.some(p=>p.count>0&&(p.eliteId===id||p.elite&&p.type===ELITES[id as EliteId]?.family))||w.expedition.eliteRescueRights.some(r=>r.eliteId===id);
}
/** Distinguish a temporary mission reservation from a permanently invalid drop. */
export function missionBlocksIdentity(w:World,kind:'hero'|'elite',id:string){const m=w.missions.active;if(!m?.reward)return false;if(identityReserved(w,kind,id))return true;const previous=w.missions.claiming;w.missions.claiming=m.id;try{return kind==='hero'?w.canAcquireHero(id as HeroId):w.canAcquireElite(id as EliteId);}finally{w.missions.claiming=previous;}}
export function identityCandidates(w:World,tier:0|1|2,source:'ordinary'|'queen'='ordinary'):string[]{
 if(tier===0){const b=worldBuildingContext(w);return b?PROJECTS.filter(p=>p.kind==='technology'&&!(b.tech[p.id]>0)&&eligible(b,p)).map(p=>p.id).sort():[];}
 return tier===1?Object.keys(ELITES).filter(id=>!priorIdentityPromise(w,'elite',id)&&w.canAcquireElite(id as EliteId)).sort():Object.keys(HEROES).filter(id=>(source==='queen'||ordinaryHeroAllowed(w,id as HeroId))&&!priorIdentityPromise(w,'hero',id)&&w.canAcquireHero(id as HeroId)).sort();
}
export function planIdentity(w:World,tier:0|1|2,id:string):MissionReward {
 if(tier===0)return {kind:'technology',id};if(tier===2)return {kind:'hero',id:id as HeroId};
 const elite=id as EliteId,family=ELITES[elite].family,owned=w.eliteOwned(elite),seat=!owned&&w.familySeatCount(family)<w.familyMemberCap(family)?1:0;
 const target=w.eliteCandidates(elite).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];
 return {kind:'elite',id:elite,seats:seat,ranks:owned||seat?0:target?w.soldierCap(family)-target.rank:5};
}
export function planIntelReward(w:World,m:MissionRecord,tier:0|1|2){
 const ids=identityCandidates(w,tier),gear=w.starship.enabled&&!!w.starship.account.run&&!w.starship.account.run.ended;
 if(!ids.length&&!gear)return false;
 if(ids.length&&(!gear||w.random()<MISSION_RULES.intel.identityChance))m.reward=planIdentity(w,tier,ids[Math.floor(w.random()*ids.length)]);
 else {const plan=planTaskEquipment(w,{difficulty:w.difficulty,stage:w.stage,tier:tier===0?'elite':'boss',...(tier===2?{endlessRound:1}:{})},m.id+':intelReward');if(!plan)return false;m.reward={kind:'equipment',plan};}
 if(m.reward.kind==='technology'){const s=worldBuildingContext(w)!;s.missionTechnology=m.reward.id;s.revision++;syncBuildingWindow(w.expedition,s);}return true;
}
export function releaseReward(w:World,m:MissionRecord){const b=w.expedition.building;if(b&&m.reward?.kind==='technology'&&b.missionTechnology===m.reward.id){delete b.missionTechnology;b.revision++;syncBuildingWindow(w.expedition,b);}}
export function deliverReward(w:World,m:MissionRecord,point:{x:number;z:number}){
 const r=m.reward;if(!r)return false;const key=m.id+':reward';if(w.missions.receipts.has(key))return true;
 w.missions.claiming=m.id;
 try{
  let ok=false;const promoted=r.kind==='hero'?w.heroes.has(r.id):r.kind==='elite'?!!w.eliteOwned(r.id):false;
  if(r.kind==='equipment')ok=deliverTaskEquipment(w,r.plan,point);
  else if(r.kind==='hero')ok=w.acquireHero(r.id);
  else if(r.kind==='elite'){const target=w.eliteCandidates(r.id).sort((a,b)=>a.rank-b.rank||a.id-b.id)[0];ok=acquireEliteImmediately(w,r.id,target?.id);}
  else {const b=worldBuildingContext(w),p=PROJECTS.find(p=>p.id===r.id);if(b&&p&&b.missionTechnology===r.id){delete b.missionTechnology;if(!b.tech[r.id]&&eligible(b,p)){b.tech[r.id]=1;b.revision++;syncBuildingWindow(w.expedition,b);syncBuildingEffects(w);ok=true;}else b.missionTechnology=r.id;}}
  if(ok){w.missions.receipts.add(key);if(r.kind==='hero'||r.kind==='elite')notifyUnitArrival(w,{identity:r.id,kind:r.kind,name:r.kind==='hero'?HEROES[r.id].name:ELITES[r.id].name,rank:r.kind==='hero'?w.heroes.get(r.id)!.rank:w.eliteOwned(r.id)?.rank??1,promoted});}return ok;
 }finally{delete w.missions.claiming;}
}
