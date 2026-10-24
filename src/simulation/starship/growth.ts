import {equipmentArkKill} from './advanced-support';
import type {World} from '../world';
import {isDensityCompanion} from '../../data/enemy-tuning';
import type {Entity,Point} from '../types';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES,ALL_HERO_IDS,type HeroId} from '../../data/heroes';
import {familyRace} from '../../data/races';
import {familyLine} from '../../data/expedition-buildings';
import {pairFor,rosterMembers} from '../zerg-brood';
import {activeEquipmentEffects,equipmentValue,equipmentPickupFactor,lockEquipmentSource} from './modules';
import {equipmentRandom} from './inventory';
import {equipmentCanGrow,permanentEquipmentBody,directionMatches,HERO_DIRECTIONS} from './eligibility';
import {refreshEquipmentMember,deliverEquipmentMembers,evolveEquipmentMembers} from './members';
import {draftContext} from '../expedition-economy';
import {drawEquipmentUnitLoot} from '../progression/expedition-drafts';
import {freezeLootVariant} from '../boss-loot';
import {dropPlunderEquipment} from './drops';

export interface EquipmentBounty {source:string;elite:EliteId;hero:HeroId;body:number|null;issued:boolean;progress:number;phase:'elite'|'hero';}
const roll=(w:World)=>equipmentRandom(w.starship.account);
const choose=<T>(w:World,pool:readonly T[])=>pool.length?pool[Math.floor(roll(w)*pool.length)]:undefined;
const cap=(w:World,u:Entity)=>u.heroId?Math.max(5,equipmentValue(w,'hero_cap')):u.eliteId?5:w.soldierCap(u.unitType as never);
const growingOrdinary=(w:World)=>rosterMembers(w,w.allies().filter(u=>!u.heroId&&!u.eliteId&&equipmentCanGrow(w,u))).sort((a,b)=>a.rank-b.rank||a.id-b.id);
function promote(w:World,u:Entity){if(!equipmentCanGrow(w,u)||u.rank>=cap(w,u))return false;refreshEquipmentMember(w,u,()=>{u.rank++;});if(u.heroId)w.heroes.get(u.heroId)!.rank=u.rank;evolveEquipmentMembers(w);return true;}

/** Remember ownership while the actual committed weapon/skill can still be in flight. */
export function rememberEquipmentSource(w:World,u:Entity){if(w.starship.enabled)w.starship.combatSources.set(u.id,u);}
export function equipmentKillSource(w:World,id:number|undefined){if(id===undefined)return;let u=w.entities.get(id)??w.starship.combatSources.get(id);if(!u)return;if(u.summonKind){if(!u.summonOwnerId)return;u=w.entities.get(u.summonOwnerId)??w.starship.combatSources.get(u.summonOwnerId);}return u&&permanentEquipmentBody(w,u)?u:undefined;}
export function realEquipmentEnemy(w:World,u:Entity){return !u.encounter&&u.owner==='zerg'&&!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure')&&!w.starship.derivedEnemies.has(u.id);}
export function equipmentEnemyPoints(u:Entity){return u.enemyTier==='boss'||u.enemyTier==='lord'?50:u.enemyTier==='elite'?10:1;}

function bountyEvolution(w:World){const b=w.starship.bounty,e=activeEquipmentEffects(w).find(e=>e.key==='bounty_hero');if(!b||b.phase!=='elite'||!e||b.body===null)return false;const u=w.entities.get(b.body);if(!u||u.hp<=0||!u.eliteId||u.rank<5)return false;
 const old=w.heroes.get(b.hero);if(old){const hero=w.heroEntity(b.hero);if(old.rank<1)old.rank=1;w.entities.delete(u.id);w.statuses.removeTarget(u.id);b.body=hero?.id??null;}
 else {if(w.heroes.size>=3)return false;const data=HEROES[b.hero];w.heroes.set(b.hero,{id:b.hero,rank:1,entityId:u.id,skillReady:Math.max(w.time,u.specialReady??w.time),revivePaid:false,awaitingSpawn:false});refreshEquipmentMember(w,u,()=>{u.heroId=b.hero;u.eliteId=undefined;u.eliteCombat=undefined;u.zergEliteCombat=undefined;u.protossEliteCombat=undefined;u.unitType=data.baseFamily;u.modelKey=data.model;u.rank=1;u.slot=100+[...w.heroes.keys()].indexOf(b.hero);});}
 b.phase='hero';b.progress=0;w.starship.numbers.set('bounty-hero-id',ALL_HERO_IDS.indexOf(b.hero));lockEquipmentSource(w,e);return true;
}
function bountyPickup(w:World,minerals:number){const effect=activeEquipmentEffects(w).find(e=>e.key==='bounty');if(!effect||minerals<=0)return;let b=w.starship.bounty;
 if(!b){const elite=choose(w,Object.values(ELITES).filter(e=>familyRace(e.family)===w.expedition.race));if(!elite)return;const heroes=ALL_HERO_IDS.filter(id=>HEROES[id].race===w.expedition.race&&HERO_DIRECTIONS[id]===familyLine(elite.family)),hero=choose(w,heroes);if(!hero)return;b=w.starship.bounty={source:effect.source,elite:elite.id,hero,body:null,issued:false,progress:0,phase:'elite'};w.starship.numbers.set('bounty-hero-id',ALL_HERO_IDS.indexOf(hero));}
 if(bountyEvolution(w))return;
 if(b.body!==null&&(!w.entities.get(b.body)||w.entities.get(b.body)!.hp<=0))return;
 if(b.phase==='hero'){const hero=w.heroes.get(b.hero),body=hero&&w.heroEntity(b.hero),next=equipmentValue(w,'bounty_hero');if(!hero||!body||body.hp<=0||hero.rank>=5||!next)return;b.progress+=minerals;while(b.progress>=next&&hero.rank<5){b.progress-=next;refreshEquipmentMember(w,body,()=>{hero.rank++;body.rank=hero.rank;});}if(hero.rank>=5)b.progress=0;return;}
 b.progress+=minerals;if(!b.issued&&b.progress>=effect.values[0]){b.progress-=effect.values[0];b.issued=true;w.starship.pendingMembers.push({source:effect,type:ELITES[b.elite].family,rank:1,count:1,independent:true,eliteId:b.elite,origin:'bounty'});deliverEquipmentMembers(w);}
 b.body??=w.allies().find(u=>w.starship.members.get(u.id)?.source===b!.source&&w.starship.members.get(u.id)?.origin==='bounty')?.id??null;const body=b.body!==null?w.entities.get(b.body):null;if(!body)return;
 while(b.progress>=effect.values[0]&&body.rank<effect.values[1]){b.progress-=effect.values[0];promote(w,body);if(bountyEvolution(w))return;}if(body.rank>=effect.values[1]){bountyEvolution(w);b.progress=0;}
}
/** One completed pickup receipt is the only source for wallet, bounty and devour accounting. */
export function collectEquipmentResource(w:World,p:{id:number;minerals:number;gas:number},extraReceipt='pickup'){
 const run=w.starship.account.run,key=extraReceipt+':'+p.id;if(run?.receipts.has(key))return {minerals:0,gas:0};run?.receipts.add(key);const factor=(1+.25*w.talent('recycle'))*equipmentPickupFactor(w),minerals=p.minerals*factor,gas=p.gas*factor;
 w.wallet.minerals+=minerals;w.wallet.gas+=gas;w.economyTotals.drops.minerals+=minerals;w.economyTotals.drops.gas+=gas;bountyPickup(w,minerals);return {minerals,gas};
}
function devour(w:World,points:number){const effect=activeEquipmentEffects(w).find(e=>e.key==='devour');if(!effect)return;let progress=(w.starship.numbers.get('devour-progress')??0)+points;if(progress>=effect.values[0]){progress%=effect.values[0];const pickups=w.pickups;w.pickups=[];let value=0;for(const pickup of pickups){const received=collectEquipmentResource(w,pickup);value+=received.minerals+received.gas*2;}const total=(w.starship.numbers.get('devour-value')??0)+value,growth=Math.floor(total/effect.values[1]);w.starship.numbers.set('devour-value',total%effect.values[1]);if(growth){w.starship.numbers.set('devour-growth',(w.starship.numbers.get('devour-growth')??0)+growth*effect.values[2]);for(const u of w.allies())refreshEquipmentMember(w,u,()=>{});}lockEquipmentSource(w,effect);}w.starship.numbers.set('devour-progress',progress);}
export function equipmentEnemyDied(w:World,enemy:Entity,sourceId?:number){if(isDensityCompanion(enemy)||!realEquipmentEnemy(w,enemy))return;const run=w.starship.account.run,key='gear-death:'+enemy.id+':'+enemy.bornAt;if(!run||run.receipts.has(key))return;run.receipts.add(key);equipmentArkKill(w,sourceId);const points=equipmentEnemyPoints(enemy),killer=equipmentKillSource(w,sourceId),effects=activeEquipmentEffects(w);
 if(w.starship.numbers.has('bounty-mark:'+enemy.id)){const e=effects.find(e=>e.key==='bounty_order');if(e){const boss=points===50;w.wallet.minerals+=e.values[boss?4:2];w.wallet.gas+=e.values[boss?5:3];}w.starship.numbers.delete('bounty-mark:'+enemy.id);}
 if(!enemy.mission?.noLoot&&equipmentValue(w,'plunder')){if(points===50)dropPlunderEquipment(w,enemy);else if(points===10){const receipt=w.runId+':plunder:'+enemy.id,reward=drawEquipmentUnitLoot(draftContext(w),receipt);if(reward){w.expedition.bossLootReceipts.push(receipt);w.rewardDrops.push({id:w.nextId++,x:enemy.x,z:enemy.z,reward,bossLootReceipt:receipt,bossLootVariant:freezeLootVariant(w,reward,receipt)});}}}
 if(!killer)return;
 for(const e of effects){
  if(e.key==='hero_growth'&&e.binding?.hero){const hero=w.heroes.get(e.binding.hero);if(!hero)continue;const body=w.heroEntity(hero.id);if(!body||body.hp<=0)continue;let progress=(w.starship.numbers.get(e.source+':hero-points')??0)+points,g=w.starship.numbers.get(e.source+':hero-gains')??0;while(progress>=e.values[0]+e.values[1]*g){progress-=e.values[0]+e.values[1]*g;g++;refreshEquipmentMember(w,body,()=>{hero.rank++;body.rank=hero.rank;});}w.starship.numbers.set(e.source+':hero-points',progress);w.starship.numbers.set(e.source+':hero-gains',g);}
  if(e.key==='kill_training'&&!killer.heroId&&!killer.eliteId&&directionMatches(e.binding,killer.unitType)){let n=(w.starship.numbers.get(e.source+':kills')??0)+(killer.rank>=w.soldierCap(killer.unitType as never)?e.values[1]:1);while(n>=e.values[0]){n-=e.values[0];const unit=growingOrdinary(w).find(u=>directionMatches(e.binding,u.unitType)&&u.rank<w.soldierCap(u.unitType as never));if(unit)promote(w,unit);}w.starship.numbers.set(e.source+':kills',n);}
  if(e.key==='pack_kill'&&enemy.unitType==='zergling'&&roll(w)<e.values[0]){const own=w.allies().filter(u=>w.starship.members.get(u.id)?.source===e.source);if(own.length<e.values[1]){w.starship.pendingMembers.push({source:e,type:'zergling',rank:e.values[2],count:1,independent:true,origin:'opening_pack'});deliverEquipmentMembers(w);}}
 }devour(w,points);bountyEvolution(w);
}
export function equipmentDroneDied(w:World,point:Point,id:number,sourceId?:number){const run=w.starship.account.run,key='gear-drone:'+id;if(!run||run.receipts.has(key))return;run.receipts.add(key);const killer=equipmentKillSource(w,sourceId),effect=activeEquipmentEffects(w).find(e=>e.key==='drone_hunter');if(!killer||killer.heroId||!effect||!equipmentCanGrow(w,killer)||killer.rank>=cap(w,killer)||roll(w)>=effect.values[0])return;if(!promote(w,killer))return;if(equipmentValue(w,'drone_mentor')){const twin=pairFor(w,killer)?.members??[killer.id],candidate=growingOrdinary(w).filter(u=>!twin.includes(u.id)&&u.rank<cap(w,u)&&Math.hypot(u.x-point.x,u.z-point.z)<=12).sort((a,b)=>a.rank-b.rank||Math.hypot(a.x-point.x,a.z-point.z)-Math.hypot(b.x-point.x,b.z-point.z)||a.id-b.id)[0];if(candidate)promote(w,candidate);}bountyEvolution(w);}
export function tickEquipmentGrowth(w:World){for(const u of w.allies())rememberEquipmentSource(w,u);bountyEvolution(w);for(const e of activeEquipmentEffects(w)){if(e.key!=='bounty_order'||w.time<(w.starship.cycles.get(e.source+':'+e.key)??Infinity))continue;const candidates=[...w.entities.values()].filter(u=>u.hp>0&&realEquipmentEnemy(w,u)&&equipmentEnemyPoints(u)>1&&!w.starship.numbers.has('bounty-mark:'+u.id)).sort((a,b)=>a.id-b.id);if(!candidates.length)continue;for(const u of candidates.slice(0,e.values[1]))w.starship.numbers.set('bounty-mark:'+u.id,w.stage);w.starship.cycles.set(e.source+':'+e.key,w.time+e.values[0]);lockEquipmentSource(w,e);}}
