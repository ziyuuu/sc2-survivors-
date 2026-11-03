// Runtime/persistence follow-up at 8d680ac. Synthetic fixtures only.
// Asserts the baseline defects; this is not a desired-behavior regression test.
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {ELITES} from '../src/data/elites';
import type {ZergEliteId} from '../src/data/zerg-elites';
import {zergEliteBile,tickZergEliteState} from '../src/simulation/combat/zerg-elite-runtime';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';

class Backend implements SaveBackend {
 raw:string|null=null;
 async read(){return [this.raw,null,null];}
 async commit(raw:string,expected?:string|null){if(expected!==undefined&&expected!==this.raw)throw Error('conflict');this.raw=raw;}
}
function fixture(){const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,equipmentAccount:newEquipmentAccount(529)});const backend=new Backend();const session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});return {w,backend,session};}
function equip(w:World,template:string,slot:EquipmentSlot,elite?:ZergEliteId){const r=grantEquipment(w.starship.account,{template,race:'zerg',slot,...(elite?{binding:{elite}}:{})},`runtime-audit:${template}:${slot}`,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
function elite(w:World,id:ZergEliteId){const u=w.allies().find(u=>u.eliteId===id)??w.addUnit(ELITES[id].family,'terran',0,0);u.eliteId=id;u.modelKey=ELITES[id].model;if(u.unitType==='lurker')u.nativeMode=u.desiredNativeMode='lurker_burrowed';w.refreshStats(u,true);return u;}

const results:unknown[]=[];
for(const id of ['baneling.2','ravager.3','lurker.1','hydralisk.2'] as const)for(const equipped of [false,true]){
 const {w,backend,session}=fixture();
 const area=id==='lurker.1'||id==='hydralisk.2';
 if(equipped){if(area)equip(w,'special.doom.3','offense1');else for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.orange.elite.5',slot,id);}
 assert.ok(w.start());await session.saveNow();const previous=backend.raw;
 const u=elite(w,id);if(!area){u.rank=5;w.refreshStats(u,true);}
 const target=w.addUnit('roach','zerg',u.x,u.z+1);target.hp=target.maxHp=1e7;u.attackFacing=0;w.hash.rebuild(w.entities.values());
 if(id==='ravager.3'){
  w.expedition.tech.bile=1;u.bileCooldown=0;zergEliteBile(w,u,0);assert.equal(w.zergElites.biles.length,1);
  // Advance the actual effect state through its launch and impact, without the renderer.
  tickZergEliteState(w);w.time=w.zergElites.biles[0].impactAt;tickZergEliteState(w);assert.equal(w.zergElites.biles.length,0);
 }else{
  w.fire(u,target);
  if(id==='hydralisk.2'){assert.ok(w.weaponFlights.length);w.time=.1;tickWeaponFlights(w,.1);}
 }
 const packet=area?w.zergElites.lines[0]:w.zergElites.areas[0];assert.ok(packet,`${id} emitted its actual pending effect`);
 const payload={damage:packet.damage,...('width'in packet?{width:packet.width}:{radius:packet.radius}),sourceDamage:packet.source.weaponDamage,rank:packet.source.rank};
 w.endStage();assert.equal(w.phase,'reward');const at=w.time;w.advance(10);assert.equal(w.time,at);
 let error='';try{await session.saveNow();}catch(e){error=String((e as Error).message);}
 if(equipped){assert.match(error,area?/脊刺冻结载荷不一致/:/腐蚀地面无效/);assert.equal(backend.raw,previous);assert.equal(session.saveFailed,true);assert.equal(w.interfacePaused,true);assert.equal(await session.saveBeforeAdvance(),false);assert.throws(()=>readArchive(session.exportJSON()));}
 else {assert.equal(error,'');assert.doesNotThrow(()=>readArchive(backend.raw!));assert.equal(session.saveFailed,false);}
 results.push({id,name:ELITES[id].name,equipped,payload,error,savePassed:!error,intermissionClockFrozen:w.time===at,...(equipped?{oldSavePreserved:backend.raw===previous,canAdvance:false,exportReadable:false}:{})});
}
console.log(JSON.stringify({baseline:'8d680ac',scope:'Controlled actual attack/effect → intermission → RunSession save; same SAVE-NATIVE defect family, four extensions plus controls',results},null,2));
