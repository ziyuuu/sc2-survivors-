/** Read-only product audit against 8d680ac. Synthetic worlds only; assertions
 * intentionally describe the observed defects, not desired fixed behavior. */
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import type {EquipmentSlot} from '../src/simulation/starship/types';
import {receiptNeeded} from '../src/simulation/expedition-production';
import {registerEquipmentRoster,tickEquipmentLife,equipmentSurvivesWipe} from '../src/simulation/starship/lifecycle';
import {hasCombatPotential} from '../src/simulation/combat/combat-presence';

function setup(module:string){
  const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
  const a=w.starship.account,template=EQUIPMENT_TEMPLATES[module];
  const g=grantEquipment(a,{template:module,race:'terran',slot:'control' as EquipmentSlot,polluted:template.pollution==='required'},'audit-module',{kind:'warehouse'});
  assert.ok(g.ok);if(g.value.pollution==='uncleansed'){a.dust=100000;assert.ok(cleanseEquipment(a,g.value.id).ok);}
  assert.ok(w.equipItem(g.value.id,'control').ok);assert.ok(w.start());
  return w;
}
function fillFamilyRoster(w:World){
  const s=w.expedition;s.familySlots=['marine','marauder','reaper','hellion','tank'];s.tech.starport=1;s.tech.factory=1;s.tech.starport_lab=1;
  s.familySlots.forEach((type,i)=>{if(!w.familyUnits(type).length)w.addUnit(type,'terran',-12,i*3);});
}
function replacement(w:World){
  const s=w.expedition;
  const pod=w.spawnPod('viking',{x:8,z:0},99,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();
  s.ledger.push({id:99,family:'viking',line:'starport',facilityIds:[1],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:125,gas:75},status:'waiting',entityId:null,purpose:'body'}]});
  assert.equal(receiptNeeded(w,pod,0),true);
  const preview=w.previewFamilyReplacement(s.pendingReceipt!.id,'marine');assert.ok(preview);
  assert.equal(w.commitFamilyReplacement(s.pendingReceipt!.id,'marine',preview.revision),true);
  return pod;
}
const phase=setup('module.phase.5'),marine=phase.allies()[0];fillFamilyRoster(phase);
registerEquipmentRoster(phase);phase.hit(marine,1e9,[],1,'zerg',0,1);
assert.equal(phase.starship.life.pending.get(marine.id)?.source,'phase');
replacement(phase);
assert.equal(phase.expedition.familySlots.includes('marine'),false);
assert.equal(phase.familyUnits('marine').length,0);
phase.time=30;phase.tick=1800;tickEquipmentLife(phase);
assert.equal(phase.familyUnits('marine').length,1);
let restoreError:string|null=null;try{const restored=setup('module.phase.5');restored.restoreRun(phase.captureRun());}catch(error){restoreError=String(error);}
console.log(JSON.stringify({case:'retired-family-phase-revival',familySlots:phase.expedition.familySlots,revivedFamily:phase.familyUnits('marine').map(u=>({id:u.id,hp:u.hp})),restoreError}));

const rewind=setup('module.rewind.4'),old=rewind.allies()[0];fillFamilyRoster(rewind);registerEquipmentRoster(rewind);
replacement(rewind);registerEquipmentRoster(rewind);
const live=rewind.allies().filter(u=>!u.temporary);for(const u of live)rewind.hit(u,1e9,[],1,'zerg',0,1);
const survives=equipmentSurvivesWipe(rewind);
assert.equal(survives,false);assert.equal(rewind.starship.life.rewindUsed,false);
console.log(JSON.stringify({case:'retired-family-rewind-roster',retiredId:old.id,roster:[...rewind.starship.life.roster].map(([id,u])=>({id,type:u.unitType,hp:u.hp})),version:rewind.starship.life.version,snapshotVersion:rewind.starship.life.snapshot?.version,survives,rewindUsed:rewind.starship.life.rewindUsed}));

const rewindControl=setup('module.rewind.4');fillFamilyRoster(rewindControl);registerEquipmentRoster(rewindControl);
for(const u of rewindControl.allies())rewindControl.hit(u,1e9,[],1,'zerg',0,1);
assert.equal(equipmentSurvivesWipe(rewindControl),true);assert.equal(rewindControl.starship.life.rewindUsed,true);
console.log(JSON.stringify({case:'rewind-without-family-replacement-control',survives:true,rewindUsed:true}));

for(const type of ['medivac','science_vessel'] as const){
  for(const equipmentEnabled of [false,true]){
    const w=new World({seed:529,race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[],...(equipmentEnabled?{equipmentAccount:newEquipmentAccount(529)}:{})});
    assert.ok(w.start());w.expedition.familySlots.push(type);const fighter=w.allies()[0],support=w.addUnit(type,'terran',0,5);
    w.hit(fighter,1e9,[],1,'zerg',0,1);assert.equal(hasCombatPotential(w,support),false);w.step();
    const afterStep=w.phase;w.stageElapsed=w.duration;w.step();
    assert.equal(afterStep,equipmentEnabled?'battle':'lost');
    console.log(JSON.stringify({case:'noncombat-support-prevents-defeat',type,equipmentEnabled,activeEffects:w.starship.effects.length,pendingRecoveries:w.starship.life.pending.size,afterStep,afterStageDuration:w.phase}));
  }
}
