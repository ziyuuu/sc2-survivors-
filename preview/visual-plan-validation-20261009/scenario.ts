import {World} from '../../src/simulation/world';
import {campaignTerrain,type CampaignTheme} from '../../src/data/campaign-map';
import {FAMILY_MODES,type Group,type Identity} from './catalog';
import type {Entity} from '../../src/simulation/types';
import type {FamilyId} from '../../src/data/races';
import type {UnitType} from '../../src/data/sc2-units';
export type Subject={identity:Identity;entity:Entity;initial:{x:number;z:number}};
export function cleanWorld(w:World){
 w.entities.clear();w.heroes.clear();w.pods=[];w.expedition.ledger=[];w.expedition.zerglingPairs=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.pickups=[];w.rewardDrops=[];
 for(const p of Object.values(w.expedition.production))p.enabled={};
}
/** Diagnostic placement, real geometry, native bodies, clocks and events. */
export function scenario(group:Group,theme:CampaignTheme='industrial',rank=5){
 const terrain=campaignTerrain({version:3,seed:10609,theme}),world=new World({race:group.race,seed:10609,waves:false,terrain});world.start();cleanWorld(world);world.stage=12;terrain.setStage(12);world.time=5;world.tick=300;world.stageStartedAt=5;world.stageElapsed=0;
 world.expedition.familySlots=[...new Set(group.identities.filter(i=>i.kind!=='hero').map(i=>i.family))] as FamilyId[];
 for(const f of world.expedition.familySlots)world.expedition.tech['unlock.'+f]=1;
 const subjects:Subject[]=[],positions=group.density?group.identities.map((_,n)=>({x:(n%12-5.5)*2.8,z:(Math.floor(n/12)-Math.floor(group.identities.length/24))*2.8})):group.identities.length===1?[{x:0,z:0}]:group.identities.length===3?[{x:-9,z:1},{x:0,z:1},{x:9,z:1}]:[{x:-7,z:-4},{x:7,z:-4},{x:-7,z:5},{x:7,z:5}];
 for(const [index,identity] of group.identities.entries()){
  const point=positions[index];let entity:Entity;
  if(group.enemyType){const tiers=['elite','boss','lord'] as const;const p=world.freePosition(identity.family as UnitType,point,0,5)??point;entity=world.spawnSpecial(group.enemyType as never,tiers[index],p)!;if(!entity)throw Error('No special enemy position '+identity.id);}
  else if(identity.hero){if(!world.acquireHero(identity.hero))throw Error('Hero acquisition failed: '+identity.id);entity=world.heroEntity(identity.hero)!;entity.rank=rank;world.heroes.get(identity.hero)!.rank=rank;entity.x=point.x;entity.z=point.z;world.refreshStats(entity,true);}
  else {entity=world.addUnit(identity.family as UnitType,'terran',point.x,point.z,rank);if(identity.elite){entity.eliteId=identity.elite;entity.modelKey=identity.model;world.refreshStats(entity,true);}}
  entity.prev={x:entity.x,z:entity.z};entity.facing=Math.PI;entity.specialReady=world.time;entity.energy=entity.maxEnergy;
  if(!entity.flying&&!terrain.canOccupy(entity,entity.unitRadius)){const legal=world.freePosition(entity.unitType,group.density?world.anchor:point,0,group.density?24:3);if(!legal)throw Error('No legal display position '+identity.id);Object.assign(entity,legal);entity.prev={...legal};}
  subjects.push({identity,entity,initial:{x:entity.x,z:entity.z}});
 }
 const guardType=group.race==='terran'?'marine':group.race==='zerg'?'zergling':'zealot',guardPoint=world.freePosition(guardType,{x:0,z:22},0,8);if(!guardPoint)throw Error('No fixture guard location');const guard=world.addUnit(guardType,'terran',guardPoint.x,guardPoint.z);guard.hp=guard.maxHp=2e6;guard.stoppedUntil=guard.nextShotAt=guard.specialReady=1e9;if(group.actors)prepareActors(world,group);
 world.anchor.x=0;world.anchor.z=0;world.hash.rebuild(world.entities.values());world.paused=true;return {world,subjects,group,theme};
}
export type Scenario=ReturnType<typeof scenario>;
export function prepareTargets(s:Scenario){
 const {world:w}=s,targets:Entity[]=[];
 for(const {entity:u} of s.subjects){
  for(const type of ['roach','mutalisk'] as const){const near={x:u.x+2.3,z:u.z-2},p=w.freePosition(type,near,0,2)??near,t=w.addUnit(type,u.owner==='terran'?'zerg':'terran',p.x,p.z);t.hp=t.maxHp=2e6;t.armor=0;t.shield=t.maxShield=500;t.shieldRegen=0;t.energy=100;t.moveSpeed=0;t.nextShotAt=t.specialReady=t.stoppedUntil=1e9;targets.push(t);}
  if(['medivac','science_vessel','queen','sentry','high_templar'].includes(u.unitType)||u.heroId){
   const family=u.race==='protoss'?'immortal':u.race==='zerg'?'roach':'marauder',p=w.freePosition(family,{x:u.x-2,z:u.z+1},0,2)??{x:u.x-2,z:u.z+1},patient=w.addUnit(family,'terran',p.x,p.z,3);patient.hp=patient.maxHp*.25;patient.shield=0;patient.lastDamagedAt=w.time;patient.nextShotAt=patient.stoppedUntil=1e9;
  }
 }
 w.hash.rebuild(w.entities.values());return targets;
}
export function activateMode(s:Scenario){const f=s.group.modeFamily;return f?{family:f,requested:FAMILY_MODES[f][1][0],accepted:s.world.setFamilyMode(f,FAMILY_MODES[f][1][0])}:null;}

/** Fresh legal neighbours for native casts after movement; never fabricates cast events. */
export function prepareCastTargets(s:Scenario){
 const w=s.world,added:Entity[]=[];
 for(const {entity:u,identity} of s.subjects){
  if(!identity.hero)continue;
  const type:UnitType=identity.hero==='swann'?'tank':identity.hero==='artanis'?'immortal':'roach';
  const owner=['swann','niadra','artanis'].includes(identity.hero)?'terran':'zerg';
  let target:Entity|undefined;
  for(const radius of [1.6,2.1,2.6]){
   for(let i=0;i<16;i++){
    const p={x:u.x+Math.cos(i*Math.PI/8)*radius,z:u.z+Math.sin(i*Math.PI/8)*radius};
    if(!w.terrain!.canOccupy(p,.5)||!w.terrain!.lineOfFire(u,p,u.flying,false))continue;
    target=w.addUnit(type,owner,p.x,p.z,3);break;
   }
   if(target)break;
  }
  if(!target)throw Error('No legal skill target for '+identity.id);
  if(owner==='terran'){target.hp=target.maxHp*.2;target.shield=0;target.lastDamagedAt=w.time;}
  else{target.hp=target.maxHp=2e6;target.armor=0;target.shield=0;target.maxShield=0;}
  target.moveSpeed=0;target.nextShotAt=target.specialReady=target.stoppedUntil=1e9;u.stoppedUntil=0;added.push(target);
 }
 w.hash.rebuild(w.entities.values());return added;
}
function prepareActors(w:World,group:Group){
 const family=group.identities[0].family as UnitType;
 const pod=w.spawnPod(family,{x:5,z:0},0,1,true);pod.guardTypes=[];
 w.spawnEconomic('egg',{x:-5,z:0});w.spawnEconomic('egg',{x:-5,z:5});w.spawnEconomic('drone',{x:5,z:5});
 w.hive={id:w.nextId++,x:0,z:-7,hp:12000,maxHp:12000,armor:3,unitRadius:3,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};
 (w as unknown as {placeEndlessFortifications():void}).placeEndlessFortifications();
 let n=0;for(const [id,fort] of w.fortifications){if(fort.kind==='bunker'&&n++>0){w.fortifications.delete(id);continue;}fort.x=fort.kind==='bunker'?-9:9;fort.z=-5;}
 w.drop({x:-8,z:7},[8,0]);w.drop({x:0,z:7},[0,8]);w.drop({x:8,z:7},[60,30]);
}
export function resolveActors(s:Scenario){
 const w=s.world;
 for(const e of [...w.economicTargets.values()])if(e.status==='active')w.hit(e,1e8,[],1,e.kind==='egg'&&e.z<2?'terran':'zerg');
 for(const p of w.pods)if(p.status==='falling')w.landPod(p);
}
export function destroyActors(s:Scenario){
 const w=s.world;
 for(const p of w.pods)if(p.hp>0)w.hit(p,1e8,[],1,'zerg');
 for(const f of [...w.fortifications.values()])w.hit(f,1e8,[],1,'zerg');
 if(w.hive&&w.hive.hp>0)w.hit(w.hive,1e8,[],1,'terran');
}
