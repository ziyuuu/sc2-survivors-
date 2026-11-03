// Read-only product audit at 8d680ac. Synthetic accounts only; asserts current defects.
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {ELITES} from '../src/data/elites';
import type {ZergEliteId} from '../src/data/zerg-elites';
import {zergEliteCombat,zergEliteBile,zergEliteQueenAbility,tickZergElite} from '../src/simulation/combat/zerg-elite-runtime';
import {equipmentNativeFactor} from '../src/simulation/starship/native-effects';

class Backend implements SaveBackend {
 raw:string|null=null;
 async read(){return [this.raw,null,null];}
 async commit(raw:string,expected?:string|null){if(expected!==undefined&&expected!==this.raw)throw Error('conflict');this.raw=raw;}
}
function fixture(){const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529)});const backend=new Backend();const session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});return {w,backend,session};}
function equip(w:World,template:string,slot:EquipmentSlot,elite?:ZergEliteId){const r=grantEquipment(w.starship.account,{template,race:'zerg',slot,...(elite?{binding:{elite}}:{})},`audit:${template}:${slot}`,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);return r.value;}
function elite(w:World,id:ZergEliteId){const u=w.allies().find(u=>u.eliteId===id)??w.addUnit(ELITES[id].family,'terran',0,0);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);return u;}

const results:unknown[]=[];
for(const id of ['ravager.2','queen.2'] as const){
 const {w,backend,session}=fixture();
 for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.orange.elite.5',slot,id);
 assert.ok(w.start());await session.saveNow();const previous=backend.raw;
 const u=elite(w,id),factor=equipmentNativeFactor(w,u);assert.ok(factor>1);
 if(id==='ravager.2'){
  const target=w.addUnit('roach','zerg',u.x+5,u.z);target.hp=target.maxHp=100000;
  w.expedition.tech.bile=1;u.bileCooldown=0;w.hash.rebuild(w.entities.values());zergEliteBile(w,u,0);
  assert.ok(w.zergElites.biles.length);
 }else{
  const patient=w.allies().find(v=>v.id!==u.id)!;patient.x=u.x+1;patient.z=u.z;patient.hp=Math.max(1,patient.maxHp/2);u.energy=100;zergEliteQueenAbility(w,u);assert.ok(w.zergElites.heals.length);
 }
 const pendingCount=w.zergElites.biles.length+w.zergElites.heals.length;
 w.endStage();assert.equal(w.phase,'reward');assert.equal(w.zergElites.biles.length+w.zergElites.heals.length,pendingCount);
 const at=w.time;w.advance(10);assert.equal(w.time,at);assert.equal(w.zergElites.biles.length+w.zergElites.heals.length,pendingCount);
 let error='';try{await session.saveNow();}catch(e){error=String((e as Error).message);}
 assert.match(error,id==='ravager.2'?/胆汁延迟或冻结载荷无效/:/输血窗口或冻结载荷无效/);
 assert.equal(backend.raw,previous);assert.equal(session.saveFailed,true);assert.equal(w.interfacePaused,true);
 assert.equal(await session.saveBeforeAdvance(),false);assert.throws(()=>readArchive(session.exportJSON()));
 results.push({case:'native-factor:'+id,name:ELITES[id].name,factor,damage:w.zergElites.biles[0]?.damage,amount:w.zergElites.heals[0]?.amount,error,pendingCount,intermissionClockFrozen:w.time===at,oldSavePreserved:backend.raw===previous,canAdvance:false,exportReadable:false});
}

{
 const {w,backend,session}=fixture();equip(w,'attribute.4','defense1');assert.ok(w.start());
 const u=elite(w,'mutalisk.3');
 // Charge through the production state machine, then emit its actual attack.
 for(let n=0;n<481;n++){w.time=n/60;tickZergElite(w,u,1/60);}
 assert.equal(zergEliteCombat(u).charge,1);
 const target=w.addUnit('mutalisk','zerg',u.x+3,u.z);target.hp=target.maxHp=100000;w.hash.rebuild(w.entities.values());w.fire(u,target);
 const hpBefore=u.maxHp,barrier=zergEliteCombat(u).barrier;assert.ok(barrier>0);
 w.endStage();await session.saveNow();const previous=backend.raw;readArchive(previous!);
 assert.ok(w.unequipItem('defense1').ok);assert.ok(barrier>u.maxHp*.8);
 let error='';try{await session.saveNow();}catch(e){error=String((e as Error).message);}
 assert.match(error,/虫族精英有限状态越界/);assert.equal(backend.raw,previous);assert.equal(w.interfacePaused,true);
 const at=w.time;w.advance(10);assert.equal(w.time,at);assert.equal(zergEliteCombat(u).barrier,barrier);
 assert.equal(await session.saveBeforeAdvance(),false);assert.throws(()=>readArchive(session.exportJSON()));
 results.push({case:'max-hp-shrink:mutalisk.3',name:ELITES['mutalisk.3'].name,hpBefore,hpAfter:u.maxHp,barrier,newCap:u.maxHp*.8,error,intermissionClockFrozen:w.time===at,oldSavePreserved:backend.raw===previous,canAdvance:false,exportReadable:false});
}
console.log(JSON.stringify({baseline:'8d680ac',results},null,2));
