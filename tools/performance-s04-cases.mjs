import assert from 'node:assert/strict';
import {make,elite,enemies,snapshot} from './performance-s01-s02-cases.mjs';
export {make,elite,enemies,snapshot};
export const effectSets={
 attributes:[],double:[['double_attack',1]],split:[['split',.7,1]],
 bounce:[['bounce',.8,.5,4,4]],cleave:[['cleave',.8,.7,120]],
 pierce:[['pierce',.2,3,.6]],dot:[['true_burn',.2,3]],
 moving:[['moving_extra',2,.5,2]],pursuit:[['crit_pursuit',1]],
 combined:[['double_attack',1],['split',.7,1],['bounce',.8,.5,4,4],['cleave',.8,.7,120],['pierce',.2,3,.6],['true_burn',.2,3],['moving_extra',2,.5,2],['crit_pursuit',1]],
 execute:[['execute',1,2],['execute_chain',3,.3,.5]],
 overload:[['overload',1,4,.8,.1,2],['overload_chain',3,.5]]
};
export function effects(entries){return entries.map(([key,...values])=>({key,values,source:'fixture:'+key,items:[]}));}
export function shotFor(source,target,fx){return {target:target.id,remaining:20,truePerHit:10,nativeDamage:source.weaponDamage,attackFactor:1,owner:source.id,sequence:1,hits:2,weaponDamage:25,bonuses:[{attribute:'Armored',amount:3}],effects:fx,handled:false,derived:false};}
export function setup(lib,name,n=300,seed=529){
 const w=make(lib,'terran',seed);let source,targets,call,shot;
 if(name in effectSets){
  source=w.addUnit(['cleave','combined'].includes(name)?'zealot':'marine','terran',0,0);source.attackRange=8;source.shotInterval=source.attackPeriod;targets=enemies(w,Math.max(1,n),seed);for(const t of targets)t.flying=false;targets[0].x=0;targets[0].z=2;
  const fx=effects(effectSets[name]);w.starship.effects=fx;w.starship.effectsRevision=w.starship.account.revision;w.starship.effectsRace=w.expedition.race;shot=shotFor(source,targets[0],fx);w.starship.numbers.set('moving-extra:'+source.id,100);
  call=()=>{shot.handled=false;w.visualEvents=[];w.effects=[];w.starship.combat.burns=[];lib.equipmentAttackEffects(w,source,targets[0],shot,2);};
 }else if(name==='acid'){
  source=elite(lib,w,'baneling.2');targets=enemies(w,n,seed);for(const t of targets)t.flying=false;
  for(let i=0;i<24;i++)w.zergElites.areas.push({id:w.nextId++,source:lib.cloneCombatSource(w,source),point:{x:(i%4-1.5)*1.5,z:(Math.floor(i/4)-2.5)*1.2},kind:i%3?'acid':'rain',radius:4,damage:10+i,next:1,until:20});
  w.time=1;call=()=>{for(const a of w.zergElites.areas)a.next=1;w.zergElites.gates={};w.zergElites.debuffs=[];w.visualEvents=[];w.effects=[];lib.tickZergEliteState(w);};
 }else if(name.startsWith('hero-')){
  const id=name.slice(5),h=lib.HEROES[id];source=w.addUnit(h.baseFamily,'terran',0,0);source.heroId=id;source.rank=3;const record={id,rank:3,entityId:source.id,skillReady:0,revivePaid:false,awaitingSpawn:false};w.heroes.set(id,record);lib.refreshExpeditionHero(w,source);source.hp=source.maxHp=1e8;
  targets=enemies(w,n,seed);for(const t of targets)t.flying=false;
  for(let i=0;i<8;i++){const t=w.addUnit(i%2?'stalker':'marine','terran',(i%4-1.5)*.7,1+Math.floor(i/4));t.hp*=.5;t.shield=(t.maxShield??0)*.5;}
  const view={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};w.hash.rebuild(w.entities.values());
  call=()=>{record.skillReady=0;w.heroCasts=[];w.visualEvents=[];w.effects=[];return lib.castExpeditionHero(w,id,view);};return {w,source,targets,call,view};
 }else if(name==='snapshot'){
  source=elite(lib,w,'hydralisk.1');targets=enemies(w,n,seed);source.shotSequence=1;call=()=>{w.weaponFlights=[];w.visualEvents=[];w.effects=[];w.fire(source,targets[0]);};
 }else throw Error(name);
 w.hash.rebuild(w.entities.values());return {w,source,targets,call,shot};
}
export function put(lib,w,template,slot,affixes){
 const a=w.starship.account,r=lib.grantEquipment(a,{template,race:w.selectedRace,slot,polluted:lib.EQUIPMENT_TEMPLATES[template].pollution==='required'},'s04:'+a.serial,{kind:'warehouse'});assert.ok(r.ok,template);
 if(affixes)r.value.affixes=affixes;if(r.value.pollution==='uncleansed'){a.dust=1e6;assert.ok(lib.cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);return r.value;
}
export function legal(lib,name,n=100,seed=529){
 const w=new lib.World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed,equipmentAccount:lib.newEquipmentAccount(seed)});
 put(lib,w,'attribute.2','offense4',[{key:'trueDps',score:200}]);
 if(name==='split')put(lib,w,'module.split.4','control');
 if(name==='cleave')put(lib,w,'module.blade.4','control');
 if(name==='pierce')put(lib,w,'module.telescope.4','control');
 if(name==='moving')put(lib,w,'module.moving_fire.4','control');
 if(name==='double')put(lib,w,'special.double.4','offense1');
 if(name==='dot')for(const slot of ['offense1','offense2'])put(lib,w,'set.special.flame.4',slot,[{key:'critDamage',score:200},{key:'range',score:200},{key:'attack',score:200}]);
 w.start();const runId=w.runId;w.runId='00000000-0000-4000-8000-000000000529';w.starship.account.run.id=w.runId;if(w.expedition.support.stageReceipt?.startsWith(runId+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(runId.length);
 w.entities.clear();w.heroes.clear();w.hive=null;w.expansionHives.clear();w.pods=[];w.effects=[];w.visualEvents=[];w.wallet={minerals:0,gas:0};
 for(const g of w.expedition.building?.groups??[])g.enabled=false;for(const p of Object.values(w.expedition.production))p.enabled={};w.expedition.ledger=[];w.expedition.pendingReceipt=null;w.expedition.pendingFreeDeliveries=[];w.waves=[];w.specialPlan=[];w.eventPlan=[];w.nextWave=Infinity;w.nextExpansionAt=Infinity;
 const source=w.addUnit(name==='cleave'?'zealot':name==='dot'||name==='double'?'reaper':'marine','terran',0,0);source.hp=source.maxHp=1e8;source.shotInterval=source.attackPeriod;const targets=enemies(w,n,seed);for(const t of targets)t.flying=false;targets[0].x=0;targets[0].z=name==='cleave'?1:2;w.starship.numbers.set('moving-extra:'+source.id,100);w.hash.rebuild(w.entities.values());
 return {w,source,targets,call:()=>w.fire(source,targets[0])};
}
