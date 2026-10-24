import type {boot} from '../src/app/bootstrap';
import {newEquipmentAccount,grantEquipment,equip} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import {campaign18StageConfig,campaign18Schedule} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
import {equipmentEffectsLoadout} from './equipment-effects-lab';
import {difficultyLoadout} from './difficulty-r2-loadout';

export function installB02Fixtures(app:Awaited<ReturnType<typeof boot>>,api:any){
 const {world:w,view:v,hud}=app;let sources:number[]=[],targets:number[]=[],label='';
 const park=(u:any)=>{u.moveSpeed=0;u.stoppedUntil=u.nextShotAt=u.specialReady=1e9;return u;};
 const add=(type:any,owner:'terran'|'zerg',dx:number,dz:number)=>{const at={x:w.anchor.x+dx,z:w.anchor.z+dz},p=w.freePosition(type,at,0,7);if(!p)throw Error('No fixture placement: '+type);const u=w.addUnit(type,owner,p.x,p.z,1,'regular',w.stage);u.prev={x:u.x,z:u.z};return u;};
 const base=async(name:string,race:any='terran',gear:'none'|'attribute'|'effects'='none',stage=15)=>{
  api.freeze();api.setCase(name);label=name;sources=[];targets=[];setDiagnosticHealthLock(w,false);w.resetRun();w.starship.account=newEquipmentAccount(529);w.selectRace(race);v.resetRun();
  if(gear==='attribute')difficultyLoadout(race,3,529,w.starship.account);if(gear==='effects')equipmentEffectsLoadout(w.starship.account);
  if(!w.start())throw Error('Fixture start rejected');w.stage=stage;w.difficulty='hell';w.stageStartedAt=w.time;w.stageElapsed=0;w.prepareStage();
  w.entities.clear();w.heroes.clear();w.pods=[];w.pickups=[];w.rewardDrops=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.effects=[];w.visualEvents=[];w.weaponFlights=[];w.swarm.pending=[];
  const a=w as any;a.autoWaves=false;a.ambientBacklog=[];a.waves=[];a.specialPlan=[];a.eventPlan=[];a.nextWave=Infinity;a.nextExpansionAt=Infinity;
  for(const p of w.expedition.building?.groups??[])p.enabled=false;
  // start() may already have paid for an initial job. This isolated scene has no production.
  w.expedition.ledger=[];w.expedition.pendingFreeDeliveries=[];w.expedition.pendingReceipt=null;
  w.paused=false;setDiagnosticHealthLock(w,true);v.setCameraMode('fixed');v.setCameraPitch(50);v.setCameraZoom(.9);
 };
 const done=async()=>{initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());await api.prepare();return {label,sources,targets,...api.checkpoint()};};
 const setup=async(name:string)=>{
  if(name==='melee-300'||name==='ranged-300'){
   await base(name,'terran','attribute');for(let i=0;i<12;i++){const u=add(i>=10?'medivac':i>=8?'marauder':'marine','terran',(i%4-1.5)*1.5,Math.floor(i/4)*1.7-2);sources.push(u.id);}
   const type=name==='melee-300'?'zergling':'hydralisk',waves=mixCampaignWaves([{at:0,bearing:0,types:Array.from({length:134},()=>type)}] as any,15,'hell',529),members=waves[0].members.slice(0,300);
   if(members.length!==300)throw Error('Expected 300 mixed members');
   for(const [i,m] of members.entries()){const angle=i*2.399963,radius=5+Math.sqrt(i)*.42,at={x:w.anchor.x+Math.cos(angle)*radius,z:w.anchor.z+Math.sin(angle)*radius},p=w.freePosition(m.type,at,0,15);if(!p)throw Error('No dense landing '+i);const u=w.addUnit(m.type,'zerg',p.x,p.z,1,'regular',15,m.stamp);u.enemyResources=m.resources;u.hp=u.maxHp=1e6;targets.push(u.id);}
  }else if(name==='medical'){
   await base(name);for(const [i,type]of ['medivac','science_vessel','queen'].entries()){const u=add(type,'terran',-3+i*3,-2);u.energy=u.maxEnergy;u.moveSpeed=0;sources.push(u.id);}
   for(let i=0;i<12;i++){const u=park(add(i<6?'marine':'tank','terran',(i%4-1.5)*1.4,Math.floor(i/4)*1.6));u.hp=u.maxHp*.1;targets.push(u.id);}
  }else if(name==='psionic'){
   await base(name,'protoss');for(const [i,type]of ['sentry','immortal','high_templar','colossus','void_ray'].entries()){const u=add(type,'terran',(i-2)*2,-2);u.energy=u.maxEnergy;u.moveSpeed=0;sources.push(u.id);}w.expedition.tech.storm=1;
   for(let i=0;i<16;i++){const u=add(i%3?'roach':'marine','zerg',(i%4-1.5)*1.6,1+Math.floor(i/4)*1.2);u.hp=u.maxHp=1e6;u.moveSpeed=0;targets.push(u.id);}
  }else if(name==='random-elite'||name==='boss'){
   const stage=name==='random-elite'?10:6;await base(name,'terran','none',stage);for(let i=0;i<4;i++)sources.push(park(add('marine','terran',(i-1.5)*1.5,0)).id);
   const e=campaign18Schedule(campaign18StageConfig(stage,'hell'),529).specials.find(e=>e.tier===(name==='random-elite'?'elite':'boss'));if(!e)throw Error('Missing seeded special');
   const u=(w as any).spawnCampaignSpecial(e);if(!u)throw Error('Native special spawn refused');const near=w.freePosition(u.unitType,{x:w.anchor.x,z:w.anchor.z+6},0,8);if(!near)throw Error('No special landing');u.x=near.x;u.z=near.z;u.prev={...near};targets.push(u.id);
  }else if(name==='main-hive'){
   await base(name,'terran','attribute',18);w.hive=null;w.prepareStage();const hive=w.hive!;if(!hive)throw Error('Missing native main hive');const p=w.freePosition('marine',{x:hive.x,z:hive.z+8},0,12);if(!p)throw Error('No main hive observer');w.anchor.x=p.x;w.anchor.z=p.z;
   for(let i=0;i<8;i++)sources.push(add('marine','terran',(i%4-1.5)*1.5,Math.floor(i/4)*1.5).id);
   const a=w as any;a.autoWaves=true;a.waves=[];a.specialPlan=[];a.eventPlan=[];a.nextWave=Infinity;a.nextExpansionAt=Infinity;
   // Enter the native main-hive skill phase explicitly; subsequent ticks are real.
   w.stageElapsed=44;w.time=44;w.tick=2640;w.campaign18Runtime!.hiveBatches=[];
   w.campaign18Runtime!.mainCombat={nextEvent:5,serial:0,casts:[],missiles:[]};
  }else if(name==='carrier-attributes'||name==='carrier-equipment'){
   await base(name,'protoss',name==='carrier-equipment'?'effects':'attribute');
   for(const [i,type]of ['carrier','marine','ravager','sentry','medivac'].entries()){const u=add(type,'terran',(i-2)*2,0);sources.push(u.id);}
   for(let i=0;i<18;i++){const u=add(i%2?'roach':'hydralisk','zerg',(i%6-2.5)*1.4,4+Math.floor(i/6)*1.4);u.hp=u.maxHp=1e7;u.moveSpeed=0;targets.push(u.id);}
   if(name==='carrier-equipment')w.starship.account.rng=1;
  }else throw Error('Unknown B02 fixture '+name);
  return done();
 };
 const stop=async(kind:'full-health'|'sources-dead'|'enemies-dead'|'all-combat')=>{
  api.freeze();if(kind==='full-health'){for(const id of targets){const u=w.entities.get(id);if(u)u.hp=u.maxHp;}for(const u of w.entities.values())if(u.owner==='zerg')park(u);}
  if(kind==='sources-dead'){setDiagnosticHealthLock(w,false);for(const id of sources){const u=w.entities.get(id);if(u&&u.hp>0)w.hit(u,1e12,[],1,'zerg',0,1);}setDiagnosticHealthLock(w,true);if(!w.allies().some(u=>!['medivac','science_vessel'].includes(u.unitType))){const u=park(add('marine','terran',-5,-5));u.hp=u.maxHp=100000;}}
  if(kind==='enemies-dead'||kind==='all-combat'){for(const u of [...w.entities.values()])if(u.owner==='zerg'&&u.hp>0)w.hit(u,1e12,[],1,'terran',0,1);if(w.hive&&w.hive.hp>0)w.hit(w.hive,1e12,[],1,'terran',0,1);(w as any).autoWaves=false;(w as any).ambientBacklog=[];}
  if(label==='main-hive')(w as any).autoWaves=true; // Preserve native missile expiry after hive death.
  if(kind==='all-combat')for(const u of w.entities.values())if(u.hp>0)park(u);
  w.hash.rebuild(w.entities.values());v.render(0,1);hud.update();return api.checkpoint();
 };
 const redamage=async()=>{api.freeze();for(const id of targets){const u=w.entities.get(id);if(u&&u.hp>0)u.hp=u.maxHp*.1;}for(const id of sources){const u=w.entities.get(id);if(u){u.energy=u.maxEnergy;u.abilityReady=w.time;}}return api.checkpoint();};
 return {setup,stop,redamage,identity:()=>({label,sources,targets})};
}
