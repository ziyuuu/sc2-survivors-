import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive} from '../src/persistence/archive';
import {encodeGraph} from '../src/persistence/graph-codec';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {applySupply} from '../src/simulation/progression/supply-cards';
import {validateExpedition} from '../src/simulation/expedition-state';
import type {Race,FamilyId} from '../src/data/races';

class Backend implements SaveBackend{
 slots:(string|null)[]=[null,null,null];
 async read(){return [...this.slots];}
 async commit(raw:string){this.slots=[raw,this.slots[0],this.slots[1]];}
}
function make(race:Race){return new World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function fullArmy(race:Race,family:FamilyId){const w=make(race);assert.ok(w.start());while(w.familySeatCount(family)<w.familyMemberCap(family))w.addFamilyMember(family,{x:w.anchor.x+2,z:w.anchor.z+2},1);w.endStage();return w;}

for(const [race,family] of [['terran','marine'],['zerg','zergling'],['protoss','zealot']] as const){
 test(`V01 ${race}: native pod supply used for training survives checkpoint save and resume`,async()=>{
  const w=fullArmy(race,family),backend=new Backend(),s=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});
  assert.ok(applySupply(w,family,1,'pod',{minerals:43,gas:7}));const job=w.expedition.ledger.at(-1)!;
  assert.ok(job.passengers.length>0);assert.ok(job.passengers.every(p=>p.source==='shop-supply'&&p.purpose==='rankTraining'));
  assert.equal(job.passengers.reduce((n,p)=>n+p.paid.minerals,0),43);assert.equal(job.passengers.reduce((n,p)=>n+p.paid.gas,0),7);
  w.changed();await s.saveNow();assert.equal(s.saveFailed,false);assert.equal(w.interfacePaused,false);
  const bundle=readArchive(backend.slots[0]!).bundle,copy=make(race);copy.permanentProfile.importJSON(bundle.profile);copy.restoreRun(bundle.run!);
  assert.deepEqual(encodeGraph(copy.expedition.ledger),encodeGraph(w.expedition.ledger));assert.deepEqual(encodeGraph(copy.starship.account),encodeGraph(w.starship.account));
  assert.deepEqual(encodeGraph(copy.captureRun().state.expedition),encodeGraph(bundle.run!.state.expedition));
 });
}
test('V01 source-specific supply validation still rejects forged purpose, source and injection payments',()=>{
 const w=fullArmy('terran','marine');assert.ok(applySupply(w,'marine',1,'pod',{minerals:43,gas:0}));
 for(const patch of [{source:'invalid'},{purpose:'tacticalProgress',targetEntityId:1,targetGeneration:0,direction:'assault'},{source:'queen-inject',paid:{minerals:0,gas:0}},{source:'queen-inject',purpose:'body',paid:{minerals:1,gas:0}}]){
  const s=structuredClone(w.expedition);Object.assign(s.ledger.at(-1)!.passengers[0],patch);assert.throws(()=>validateExpedition(s),/运输付款账本无效/);
 }
});
