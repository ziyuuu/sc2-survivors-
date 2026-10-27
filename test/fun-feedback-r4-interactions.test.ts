import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,equip,equippedItems} from '../src/simulation/starship/inventory';
import type {EquipmentAccount,EquipmentSlot} from '../src/simulation/starship/types';
import {equipmentDescription} from '../src/ui/starship/equipment-description';
import {tickSpecialEntrance,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {offerView,renderIntermission,IntermissionNavigation} from '../src/ui/presentation/intermission';
import {fieldInteractionEntries} from '../src/ui/hud/field-interactions';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

function item(a:EquipmentAccount,slot:EquipmentSlot,template='set.team.2'){
 const r=grantEquipment(a,{template,race:'terran',slot},'r4:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);return r.value;
}
function world(a=newEquipmentAccount()){const w=new World({seed:529,waves:false,sandbox:true,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:a});assert.ok(w.start());w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
test('R4 single team piece never claims activation; native opening 0/1/2 pieces yields 1/1/2 marines',()=>{
 for(let count=0;count<=2;count++){
  const a=newEquipmentAccount(),pieces=[item(a,'defense1'),item(a,'offense1')];for(const p of pieces.slice(0,count))assert.ok(equip(a,'terran',p.id,p.slot).ok);
  const d=equipmentDescription(pieces[0],equippedItems(a,'terran'));assert.equal(d.rows[0].active,count===2);assert.match(d.benefit,/总数为 2/);assert.match(d.requirement,/至少2件/);assert.match(d.status,count===2?/已激活/:count===1?/未激活.*1\/2件/:/未装备/);
  const w=world(a);w.advance(.25);assert.equal(w.allies().filter(u=>u.unitType==='marine').length,count===2?2:1);
 }
});
test('R4 replacement preview does not mark an unworn item active and higher complete sets suppress green effects',()=>{
 const a=newEquipmentAccount(),one=item(a,'defense1'),two=item(a,'offense1');assert.ok(equip(a,'terran',one.id,one.slot).ok);
 const d=equipmentDescription(two,equippedItems(a,'terran'));assert.equal(d.rows[0].active,false);assert.match(d.preview,/总数为 2/);
 assert.ok(equip(a,'terran',two.id,two.slot).ok);for(const slot of ['defense2','offense2'] as const){const p=item(a,slot,'set.blue.team.3');assert.ok(equip(a,'terran',p.id,slot).ok);}
 const lower=equipmentDescription(one,equippedItems(a,'terran'));assert.equal(lower.rows[0].active,false);assert.match(lower.status,/替代/);
});
function rewardWorld(){const w=world();w.stage=3;w.prepareStage();w.specialStages.ticket={stage:4,kind:'resources',claimed:false};w.specialStages.offerChecked=4;w.endStage();assert.ok(w.skipDevelopment());return w;}
const ticket=(w:World)=>w.rewards.find(r=>(r as ExpeditionReward).expeditionEffect.kind==='specialTicket')!;
test('R4 ticket is a real free reward card, survives refresh, claims once without consuming ordinary purchases',()=>{
 const w=rewardWorld();w.wallet.minerals=10000;let r=ticket(w);assert.ok(r);assert.equal(w.rewards.length,3);assert.equal(r.minerals+r.gas,0);
 const html=renderIntermission(w,'',new IntermissionNavigation());assert.match(html,new RegExp('data-card-id="'+r.offerId+'"'));assert.doesNotMatch(html,/class="special-ticket"|data-action="special-ticket"/);assert.equal(offerView(w,r).free,true);
 const id=r.offerId;assert.ok(w.reroll());r=ticket(w);assert.equal(r.offerId,id);assert.equal(w.rewards.length,3);
 w.expedition.freePurchasesRemaining=1;const wallet={...w.wallet},claims=[...w.expedition.draftClaims];assert.ok(w.choose(id));assert.equal(w.choose(id),false);assert.deepEqual(w.wallet,wallet);assert.equal(w.expedition.freePurchasesRemaining,1);assert.deepEqual(w.expedition.draftClaims,claims);assert.equal(w.specialStages.ticket?.claimed,true);
 const ordinary=w.rewards.find(r=>r.offerId!==id&&w.canChooseReward(r));assert.ok(ordinary);assert.ok(w.choose(ordinary.offerId));assert.equal(w.expedition.freePurchasesRemaining,0);
 assert.ok(w.finishIntermission());assert.equal(w.stage,4);assert.equal(w.specialStages.active?.kind,'resources');assert.equal(w.specialStages.used.size,1);
});
test('R4 stale or ineligible tickets cannot claim and unclaimed tickets do not enter',()=>{
 const w=rewardWorld(),r=ticket(w);w.specialStages.ticket!.kind='dodge';assert.equal(w.choose(r.offerId),false);w.specialStages.ticket!.kind='resources';(r as ExpeditionReward).expeditionEffect={kind:'specialTicket',stage:5,challenge:'resources'};assert.equal(w.choose(r.offerId),false);assert.ok(w.finishIntermission());assert.equal(w.specialStages.active,null);assert.equal(w.specialStages.used.size,0);
});
test('R4 proximity entry respects pause, range, expiry, clear paths and once-only use in native step',()=>{
 const w=world();w.stage=4;w.prepareStage();w.specialStages.portal={kind:'resources',point:{x:w.anchor.x+2,z:w.anchor.z},until:w.time+30};assert.deepEqual(fieldInteractionEntries(w),[]);
 w.paused=true;tickSpecialEntrance(w);assert.equal(w.specialStages.active,null);w.paused=false;
 const walk=w.terrain!.walkLine;w.terrain!.walkLine=()=>false;tickSpecialEntrance(w);assert.equal(w.specialStages.active,null);w.terrain!.walkLine=walk;
 w.specialStages.portal.point.x+=4;tickSpecialEntrance(w);assert.equal(w.specialStages.active,null);w.specialStages.portal.point.x-=4;
 w.step();assert.equal(w.specialStages.active?.kind,'resources');assert.equal(w.specialStages.active?.phase,'loading');assert.equal(w.specialStages.active?.clock,0);assert.equal(w.specialStages.used.size,1);
 finishSpecialStage(w,'timeout');w.specialStages.portal={kind:'resources',point:{...w.anchor},until:w.time+30};tickSpecialEntrance(w);assert.equal(w.specialStages.active,null);assert.equal(w.specialStages.used.size,1);
 const fresh=world();fresh.stage=4;fresh.specialStages.portal={kind:'resources',point:{...fresh.anchor},until:fresh.time};tickSpecialEntrance(fresh);assert.equal(fresh.specialStages.active,null);assert.equal(fresh.specialStages.portal,null);
});
