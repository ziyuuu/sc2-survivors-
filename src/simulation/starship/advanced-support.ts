import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Body,Entity,HeroRecord,Point} from '../types';
import {SC2_UNITS,type CombatUnitType} from '../../data/sc2-units';
import {TUNING} from '../../data/game';
import {ELITES,type EliteId} from '../../data/elites';
import {HEROES} from '../../data/heroes';
import {refreshExpeditionStats} from '../combat/expedition-combat';
import {refreshExpeditionHero,castEquipmentHero} from '../combat/expedition-heroes';
import {activeEquipmentEffects,equipmentEngagementTarget,lockEquipmentSource} from './modules';
import {equipmentRandom} from './inventory';
import {applyEquipmentStats,detachEquipmentStats} from './runtime';
import type {ActiveEquipmentEffect} from './selection';

export interface AdvancedEquipmentBody {
 kind:'swarm'|'plague'|'behemoth'|'ark';autonomous:boolean;until:number;explosion:number;radius:number;spawnHp:number;exploded:boolean;
 eliteLeviathan?:boolean;tentacleAt?:number;failures:number;
}
export interface EquipmentNativeHero {record:HeroRecord;source:'ark'|'projection';}
export interface EquipmentYamatoSequence {effect:ActiveEquipmentEffect;next:number;remaining:number;targets:number[];}
export function autonomousEquipmentBody(w:World,u:Entity){return !!w.starship.advancedBodies.get(u.id)?.autonomous;}
export function equipmentOutputFactor(w:World,id?:number):number {if(id===undefined)return 1;const u=w.entities.get(id)??w.starship.combatSources.get(id);if(!u)return 1;const owner=u.summonOwnerId?(w.entities.get(u.summonOwnerId)??w.starship.combatSources.get(u.summonOwnerId)):u;
 return owner&&w.starship.advancedBodies.get(owner.id)?.kind==='ark'?2*(1+.15*Math.max(0,(w.starship.numbers.get('ark-native-rank:'+owner.id)??owner.rank)-5)):1;
}
export function equipmentNativeRank(w:World,u:Entity){return w.starship.advancedBodies.get(u.id)?.kind==='ark'?5:u.rank;}
export function refreshAdvancedEquipmentBody(w:World,u:Entity,fill=false){const body=w.starship.advancedBodies.get(u.id);if(!body||body.kind!=='ark'&&!body.eliteLeviathan)return false;
 const hp=u.maxHp?u.hp/u.maxHp:0,shield=u.maxShield?(u.shield??0)/u.maxShield:0,rank=u.rank;detachEquipmentStats(w,u);
 if(body.eliteLeviathan){u.maxHp=24864.84;u.maxShield=0;u.armor=11.9;u.weaponDamage=828;u.attackPeriod=.55/1.6/1.15;u.moveSpeed=2.875;u.attackRange=7.5;u.maxEnergy=0;u.energyRegen=0;u.healRate=0;u.race='zerg';u.attributes=['Biological','Armored','Massive'];applyEquipmentStats(w,u,fill);}
 else {u.rank=5;w.starship.numbers.set('ark-native-rank:'+u.id,rank);try{if(u.heroId)refreshExpeditionHero(w,u,fill);else refreshExpeditionStats(w,u,fill);}finally{u.rank=rank;w.starship.numbers.delete('ark-native-rank:'+u.id);}}
 u.hp=fill?u.maxHp:u.maxHp*hp;u.shield=fill?u.maxShield:(u.maxShield??0)*shield;return true;
}
type Spawn={type:CombatUnitType;rank:number;elite?:EliteId;eliteLeviathan?:boolean};
/** Reserve every landing point before any member, RNG receipt or successful cooldown is committed. */
function plan(w:World,spawns:Spawn[],origin:Point){const points:{point:Point;radius:number;flying:boolean}[]=[];
 for(const spec of spawns){const d=SC2_UNITS[spec.type],radius=d.unitRadius*TUNING.unitScale;let found:Point|undefined;
  for(let n=0;n<160&&!found;n++){const r=1+Math.sqrt(n)*1.15,a=n*2.399963,q={x:origin.x+Math.sin(a)*r,z:origin.z+Math.cos(a)*r},p=w.freePosition(spec.type,q,0,2);if(p&&points.every(other=>other.flying!==d.flying||Math.hypot(other.point.x-p.x,other.point.z-p.z)>=other.radius+radius+.12))found=p;}
  if(!found)return null;points.push({point:found,radius,flying:d.flying});
 }return points.map(p=>p.point);
}
export function spawnAdvancedEquipmentGroup(w:World,e:ActiveEquipmentEffect,spawns:Spawn[],origin:Point,seconds:number,explosion:number,radius:number,autonomous=true){const points=plan(w,spawns,origin);if(!points)return [];
 const result:Entity[]=[];for(let n=0;n<spawns.length;n++){const spec=spawns[n],p=points[n],u=w.addUnit(spec.type,'terran',p.x,p.z,spec.rank);u.temporary=true;u.temporaryUntil=w.time+seconds;u.attributes=u.attributes.filter(a=>a!=='Heroic');
  if(spec.elite){u.eliteId=spec.elite;u.modelKey=ELITES[spec.elite].model;}if(spec.type==='hots_leviathan')u.modelKey=HEROES.hots_leviathan.model;
  const body:AdvancedEquipmentBody={kind:e.key as AdvancedEquipmentBody['kind'],autonomous,until:w.time+seconds,explosion,radius,spawnHp:0,exploded:false,eliteLeviathan:spec.eliteLeviathan,tentacleAt:spec.eliteLeviathan?w.time+2:undefined,failures:0};
  if(spec.eliteLeviathan)u.enemyTier='elite';w.starship.advancedBodies.set(u.id,body);w.starship.members.set(u.id,{source:e.source,items:e.items,independent:true,cannotGrow:true,cannotRevive:true,origin:e.key});w.refreshStats(u,true);u.attributes=u.attributes.filter(a=>a!=='Heroic');body.spawnHp=u.maxHp;equipmentPresentation(w,'reinforcement',u,undefined,e.key);w.visual('squad-transfer',u);result.push(u);
 }w.hash.invalidatePlanes();lockEquipmentSource(w,e);return result;
}
export function advancedEquipmentDeath(w:World,u:Entity){const body=w.starship.advancedBodies.get(u.id);if(!body||!body.explosion||body.exploded||w.phase!=='battle')return;body.exploded=true;
 for(const target of [...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])])if(target.owner!==u.owner&&target.hp>0&&Math.hypot(target.x-u.x,target.z-u.z)<=body.radius+target.unitRadius&&(!w.terrain||w.terrain.lineOfFire(u,target,false,target.flying)))w.hit(target,body.spawnHp*body.explosion,[],1,u.owner,0,0,u.id);
 w.effect('explosion',u,u,body.radius,.6);w.visual('support-impact',u);
}
export function expireAdvancedEquipmentBody(w:World,u:Entity){const body=w.starship.advancedBodies.get(u.id);if(!body||body.kind==='ark'||w.time+1e-8<body.until)return false;
 if(u.hp>0){equipmentPresentation(w,'expiry',u,undefined,body.kind);w.expireUnit(u);}return true;
}
export function clearAdvancedEquipmentTemporaries(w:World){for(const [id,body] of w.starship.advancedBodies)if(body.kind!=='ark'){body.exploded=true;const u=w.entities.get(id);if(u){u.hp=0;u.deadAt=w.time;u.pendingTarget=null;u.attackTarget=null;}}w.starship.yamatoSequences=[];}
function ark(w:World,e:ActiveEquipmentEffect){const run=w.starship.account.run,receipt=e.source+':ark';if(!run||run.receipts.has(receipt))return;const type=w.expedition.race==='terran'?'yamato_battlecruiser':w.expedition.race==='zerg'?'hots_leviathan':'carrier',p=w.freePosition(type,w.anchor,1,10);if(!p)return;
 const u=w.addUnit(type,'terran',p.x,p.z,5);if(type!=='carrier'){u.heroId=type;u.modelKey=HEROES[type].model;w.starship.nativeHeroes.set(u.id,{source:'ark',record:{id:type,entityId:u.id,rank:5,skillReady:w.time,revivePaid:false,awaitingSpawn:false}});}
 w.starship.advancedBodies.set(u.id,{kind:'ark',autonomous:false,until:Infinity,spawnHp:0,explosion:0,radius:0,exploded:false,failures:0});w.starship.members.set(u.id,{source:e.source,items:e.items,independent:true,cannotGrow:true,origin:'ark'});w.refreshStats(u,true);if(u.zergCombat)u.zergCombat.tentacleAt=w.time+2;run.receipts.add(receipt);lockEquipmentSource(w,e);equipmentPresentation(w,'reinforcement',u,undefined,e.key);w.visual('squad-transfer',u);
}
export function equipmentArkKill(w:World,sourceId:number|undefined){if(sourceId===undefined)return;let source=w.entities.get(sourceId)??w.starship.combatSources.get(sourceId);if(source?.summonOwnerId)source=w.entities.get(source.summonOwnerId)??w.starship.combatSources.get(source.summonOwnerId);if(!source||source.hp<=0)return;const body=w.starship.advancedBodies.get(source.id);if(body?.kind!=='ark')return;
 const chance=Math.min(1,(.01+.0002*body.failures)/(1+.15*(source.rank-1)));if(equipmentRandom(w.starship.account)<chance){source.rank++;body.failures=0;w.refreshStats(source);for(const child of w.entities.values())if(child.summonOwnerId===source.id&&child.hp>0)w.refreshStats(child);}else body.failures++;
}
function yamato(w:World,sequence:EquipmentYamatoSequence){const enemies=[...w.entities.values(),...w.expansionHives.values(),...(w.hive?[w.hive]:[])].filter(u=>u.owner==='zerg'&&u.hp>0&&w.visibleTo(u,'terran')),target=enemies.sort((a,b)=>Number(sequence.targets.includes(a.id))-Number(sequence.targets.includes(b.id))||Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z)||a.id-b.id)[0],base=w.allies()[0];if(!target||!base)return false;
 const u=structuredClone(base),data=HEROES.yamato_battlecruiser;u.id=w.nextId++;u.unitType='yamato_battlecruiser';u.heroId='yamato_battlecruiser';u.modelKey=data.model;u.rank=5;u.hp=u.maxHp=data.hp;u.flying=true;u.x=target.x;u.z=target.z-10;u.unitRadius=1;u.temporary=true;w.starship.skillSources.set(u.id,u);w.starship.combatSources.set(u.id,u);
 const record:HeroRecord={id:'yamato_battlecruiser',entityId:u.id,rank:5,skillReady:w.time,revivePaid:false,awaitingSpawn:false};const cast=castEquipmentHero(w,u,record,target);if(!cast){w.starship.skillSources.delete(u.id);w.starship.combatSources.delete(u.id);return false;}sequence.targets.push(target.id);return true;
}
export function tickAdvancedEquipmentSupport(w:World){for(const e of activeEquipmentEffects(w)){if(e.key==='ark'){ark(w,e);continue;}if(!['swarm','plague','behemoth','yamato_support'].includes(e.key))continue;
  const key=e.source+':'+e.key,now=w.time,last=w.starship.numbers.get(key+':last')??now;w.starship.numbers.set(key+':last',now);if(w.missions.fleet.ceasefire)continue;if(now<(w.starship.numbers.get(key+':ready')??0))continue;
  const target=equipmentEngagementTarget(w);if(!target)continue;const elapsed=(w.starship.numbers.get(key+':elapsed')??0)+Math.max(0,now-last);w.starship.numbers.set(key+':elapsed',elapsed);if(elapsed+1e-8<e.values[0])continue;w.starship.numbers.set(key+':elapsed',0);if(equipmentRandom(w.starship.account)>=e.values[1])continue;
  let success=false;if(e.key==='yamato_support'){const sequence:EquipmentYamatoSequence={effect:e,next:now,remaining:e.values[4],targets:[]};success=yamato(w,sequence);if(success){sequence.remaining--;sequence.next=now+e.values[3]/e.values[4];w.starship.yamatoSequences.push(sequence);}}
  else {let spawns:Spawn[]=[];if(e.key==='swarm'||e.key==='plague'){const types:CombatUnitType[]=e.key==='swarm'?['zergling','mutalisk']:['ultralisk','hots_leviathan'];spawns=[...Array.from({length:e.values[5]},()=>({type:types[0],rank:e.values[4]})),...Array.from({length:e.values[6]},()=>({type:types[1],rank:e.values[4]}))];}
   else {const leviathan=equipmentRandom(w.starship.account)>=.5,variants=Object.values(ELITES).filter(v=>v.family==='ultralisk');spawns=[leviathan?{type:'hots_leviathan',rank:5,eliteLeviathan:true}:{type:'ultralisk',rank:5,elite:variants[Math.floor(equipmentRandom(w.starship.account)*variants.length)].id}];}
   success=spawnAdvancedEquipmentGroup(w,e,spawns,w.anchor,e.values[3],e.key==='behemoth'?e.values[5]:e.values[7],e.key==='behemoth'?e.values[6]:e.values[8]).length===spawns.length;
  }if(success){w.starship.numbers.set(key+':ready',now+e.values[2]);lockEquipmentSource(w,e);}
 }
 for(const sequence of w.starship.yamatoSequences)if(!w.missions.fleet.ceasefire&&sequence.remaining&&w.time+1e-8>=sequence.next){if(yamato(w,sequence))sequence.remaining--;sequence.next=w.time+sequence.effect.values[3]/sequence.effect.values[4];}w.starship.yamatoSequences=w.starship.yamatoSequences.filter(s=>s.remaining>0);
 for(const [id,body] of w.starship.advancedBodies){const u=w.entities.get(id);if(!u||u.hp<=0||expireAdvancedEquipmentBody(w,u))continue;if(body.eliteLeviathan&&w.time+1e-8>=body.tentacleAt!){body.tentacleAt=w.time+2;const targets=[...w.entities.values()].filter(a=>a.owner!==u.owner&&a.hp>0&&!a.attributes.includes('Structure')&&w.visibleTo(a,u.owner)&&w.targetAllowed(u,a)&&w.edgeDistance(u,a)<=6&&w.hasAttackLine(u,a)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)||a.id-b.id).slice(0,4);for(const a of targets){w.hit(a,1440,[],1,u.owner,0,0,u.id);w.visual('hero-tentacle',u,a);}}}
 for(const [id,native] of w.starship.nativeHeroes){const u=w.entities.get(id);if(u&&u.hp>0)castEquipmentHero(w,u,native.record);}
 for(const [id] of w.starship.skillSources)if(!w.heroCasts.some(c=>c.source===id)){w.starship.skillSources.delete(id);w.starship.combatSources.delete(id);}
}
