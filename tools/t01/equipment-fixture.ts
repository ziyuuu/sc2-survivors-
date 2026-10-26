import type {World} from '../../src/simulation/world';
import {EQUIPMENT_TEMPLATES} from '../../src/simulation/starship/catalog';
import {grantEquipment,equip,cleanseEquipment,newEquipmentAccount,equippedItems,validateItem} from '../../src/simulation/starship/inventory';
import {selectEquipmentEffects} from '../../src/simulation/starship/selection';
import {activeEquipmentEffects} from '../../src/simulation/starship/modules';
import {equipmentPresentationReceipts} from '../../src/simulation/starship/presentation';
import {HEROES} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import {PRODUCTION_LINES} from '../../src/data/expedition-buildings';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import type {EquipmentBinding,EquipmentAccount} from '../../src/simulation/starship/types';
import type {Race,FamilyId} from '../../src/data/races';
export type EquipmentFixture={template:string;race:Race;pieces:number;binding:EquipmentBinding;polluted?:boolean;inheritance?:string};
export function equipmentFixtureAccount(data:EquipmentFixture){
 const a=newEquipmentAccount(529),t=EQUIPMENT_TEMPLATES[data.template];if(!t)throw Error('Unknown equipment template');
 for(const [index,slot]of t.slots.slice(0,data.pieces).entries()){
  const g=grantEquipment(a,{template:t.id,race:data.race,slot,binding:data.binding,polluted:data.polluted??t.pollution==='required'},`t01:${index}`,{kind:'warehouse'});if(!g.ok)throw Error(g.error);
  if(data.inheritance){g.value.inherited=[data.inheritance];if(!validateItem(g.value))throw Error('Invalid native inheritance selection');}
  if(g.value.pollution==='uncleansed'){a.dust=100000;const c=cleanseEquipment(a,g.value.id);if(!c.ok)throw Error(c.error);}
  const e=equip(a,data.race,g.value.id,slot);if(!e.ok)throw Error(e.error);
 }
 return a;
}
export function equipmentFixtureEffects(a:EquipmentAccount,race:Race){return selectEquipmentEffects(equippedItems(a,race));}
export function prepareEquipmentFixture(w:World,data:EquipmentFixture){
 w.resetRun('normal');w.starship.account=equipmentFixtureAccount(data);w.selectRace(data.race);w.terrain=new FlatTerrain();w.obstacles=[];
 if(!w.start())throw Error('Equipment controlled start failed');
 for(const [id,u]of w.entities)if(u.owner==='zerg')w.entities.delete(id);w.hive=null;w.expansionHives.clear();w.pods=[];w.swarm.pending=[];
 Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;
 Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];
 const b=data.binding;let actor=b.hero?w.heroEntity(b.hero):b.elite?w.eliteOwned(b.elite):undefined;
 if(!actor&&b.hero){w.expedition.heroRewardsUnlocked=true;if(!w.acquireHero(b.hero))throw Error('Bound hero acquisition failed');actor=w.heroEntity(b.hero);}
 if(!actor&&b.elite){w.expedition.familySlots.push(ELITES[b.elite].family);if(!w.acquireElite(b.elite))throw Error('Bound elite acquisition failed');actor=w.eliteOwned(b.elite);}
 if(!actor){const family=(b.direction?PRODUCTION_LINES[b.direction].families[0]:({terran:'marine',zerg:'roach',protoss:'stalker'} as const)[data.race]) as FamilyId;actor=w.allies().find(u=>u.unitType===family)??w.addFamilyMember(family,{x:0,z:0});}
 if(!actor)throw Error('Equipment inspection actor missing');Object.assign(actor,{x:0,z:0,prev:{x:0,z:0}});
 const allies=w.allies().filter(u=>u.id!==actor.id);for(const[i,u]of allies.entries())Object.assign(u,{x:-3-(i%4),z:-1-Math.floor(i/4),prev:{x:-3-(i%4),z:-1-Math.floor(i/4)}});
 const targets=['roach','roach','mutalisk'].map((type,i)=>{const u=w.addUnit(type as 'roach','zerg',(i-1)*2,4);u.hp=u.maxHp=1e8;u.weaponCooldown=u.nextShotAt=1e6;u.moveSpeed=0;return u;});
 const patient=w.addUnit(data.race==='terran'?'tank':data.race==='zerg'?'roach':'stalker','terran',-2,1);patient.hp=patient.maxHp*.2;patient.shield=0;patient.weaponCooldown=patient.nextShotAt=1e6;
 w.wallet={minerals:100000,gas:100000};w.hash.rebuild(w.entities.values());const poly=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}];w.starship.battleView=()=>({ground:poly,air:poly,occludedGround:[],occludedAir:[]});
 w.paused=false;w.changed();return {actorId:actor.id,targetId:targets[0].id,patientId:patient.id,effects:activeEquipmentEffects(w)};
}
export function equipmentFixtureSnapshot(w:World){return {effects:activeEquipmentEffects(w),receipts:equipmentPresentationReceipts(w),cycles:[...w.starship.cycles],numbers:[...w.starship.numbers],projections:[...w.starship.projections],forts:[...w.starship.forts],pendingMembers:w.starship.pendingMembers,burnZones:w.starship.burnZones,heroJobs:w.starship.hero.jobs,workers:w.workers,wallet:{...w.wallet},bodies:[...w.entities.values()].map(u=>({id:u.id,unitType:u.unitType,heroId:u.heroId,eliteId:u.eliteId,rank:u.rank,hp:u.hp,shield:u.shield,temporary:u.temporary,summonKind:u.summonKind,deadAt:u.deadAt}))};}
