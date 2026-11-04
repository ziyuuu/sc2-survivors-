import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {receiptNeeded} from '../src/simulation/expedition-production';
import {registerEquipmentRoster,tickEquipmentLife,equipmentSurvivesWipe} from '../src/simulation/starship/lifecycle';
import {hasCombatPotential} from '../src/simulation/combat/combat-presence';

function setup(module?:string){
 const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 if(module){const a=w.starship.account,t=EQUIPMENT_TEMPLATES[module],r=grantEquipment(a,{template:module,race:'terran',slot:'control',polluted:t.pollution==='required'},'regression-module',{kind:'warehouse'});assert.ok(r.ok);if(r.value.pollution==='uncleansed'){a.dust=100000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,'control').ok);}
 assert.ok(w.start());return w;
}
function fill(w:World){const s=w.expedition;s.familySlots=['marine','marauder','reaper','hellion','tank'];s.tech.starport=1;s.tech.factory=1;s.tech.starport_lab=1;s.familySlots.forEach((t,i)=>{if(!w.familyUnits(t).length)w.addUnit(t,'terran',-12,i*3);});registerEquipmentRoster(w);}
function replace(w:World){const s=w.expedition,pod=w.spawnPod('viking',{x:8,z:0},99,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();s.ledger.push({id:99,family:'viking',line:'starport',facilityIds:[1],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:125,gas:75},status:'waiting',entityId:null,purpose:'body'}]});assert.equal(receiptNeeded(w,pod,0),true);const p=w.previewFamilyReplacement(s.pendingReceipt!.id,'marine');assert.ok(p);assert.ok(w.commitFamilyReplacement(s.pendingReceipt!.id,'marine',p.revision));}
test('retirement cancels phase recovery and its projections, while preserving independent same-family bodies',()=>{
 const w=setup('module.phase.5'),old=w.allies()[0];fill(w);w.hit(old,1e9,[],1,'zerg',0,1);const r=w.starship.life.pending.get(old.id)!;assert.equal(r.source,'phase');
 const independent=w.addUnit('marine','terran',0,4);w.starship.members.set(independent.id,{source:'independent-fixture',items:[],independent:true});registerEquipmentRoster(w);
 replace(w);assert.equal(w.starship.life.pending.has(old.id),false);assert.equal(w.starship.life.roster.has(old.id),false);assert.ok(r.projections.every(id=>(w.entities.get(id)?.hp??0)===0));
 w.time=30;w.tick=1800;tickEquipmentLife(w);assert.equal(w.entities.get(old.id)?.hp??0,0);assert.ok(w.entities.get(independent.id)!.hp>0);assert.equal(w.expedition.familySlots.length,5);
 const copy=setup('module.phase.5');copy.restoreRun(w.captureRun());copy.time=60;tickEquipmentLife(copy);assert.equal(copy.entities.get(old.id)?.hp??0,0);
});
test('replacing a family leaves a usable rewind snapshot for the resulting roster',()=>{
 const w=setup('module.rewind.4'),old=w.allies()[0];fill(w);replace(w);registerEquipmentRoster(w);assert.equal(w.starship.life.roster.has(old.id),false);assert.ok(w.starship.life.snapshot!.members.every(u=>u.id!==old.id));
 const ids=w.allies().filter(u=>!u.temporary).map(u=>u.id);for(const id of ids)w.hit(w.entities.get(id)!,1e9,[],1,'zerg',0,1);
 assert.equal(equipmentSurvivesWipe(w),true);assert.equal(w.starship.life.rewindUsed,true);assert.ok(ids.every(id=>w.entities.get(id)!.hp>0));assert.equal(w.entities.has(old.id),false);
 for(const id of ids)w.hit(w.entities.get(id)!,1e9,[],1,'zerg',0,1);assert.equal(equipmentSurvivesWipe(w),false);
});
for(const type of ['medivac','science_vessel'] as const)test(`empty equipment account does not let ${type} prevent defeat`,()=>{
 const w=setup(),fighter=w.allies()[0];w.expedition.familySlots.push(type);const support=w.addUnit(type,'terran',0,5);assert.equal(hasCombatPotential(w,support),false);w.hit(fighter,1e9,[],1,'zerg',0,1);w.step();assert.equal(w.phase,'lost');
});
test('lawful combat recovery keeps the run alive and restores only once',()=>{
 const w=setup('module.phase.5'),fighter=w.allies()[0];registerEquipmentRoster(w);w.hit(fighter,1e9,[],1,'zerg',0,1);assert.equal(equipmentSurvivesWipe(w),true);w.time=30;tickEquipmentLife(w);const revived=w.entities.get(fighter.id)!;assert.ok(revived.hp>0);assert.equal(w.starship.life.pending.size,0);tickEquipmentLife(w);assert.equal(w.entities.get(fighter.id),revived);
});
