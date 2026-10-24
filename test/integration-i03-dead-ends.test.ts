import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {legalSpecialKinds,enterSpecialTicket,beginSpecialStage,tickSpecialEntrance} from '../src/simulation/special-stages/runtime';
import {spawnMission} from '../src/simulation/missions/runtime';
import {draftContext,purchaseOffer} from '../src/simulation/expedition-economy';
import {beginExpeditionWindow,drawExpeditionReinforcements,inspectReinforcementPool} from '../src/simulation/progression/expedition-drafts';
const make=()=>{const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});assert.ok(w.start());w.pods=[];w.stage=12;w.prepareStage();return w;};
test('I03 an invalidated four-member ticket cancels without consuming the stage or blocking ordinary battle',()=>{
 const w=make();assert.ok(!legalSpecialKinds(w).includes('dodge'));w.specialStages.ticket={kind:'dodge',stage:12,claimed:true};const time=w.time;assert.equal(enterSpecialTicket(w),false);assert.equal(w.specialStages.ticket,null);assert.equal(w.specialStages.used.has(12),false);assert.equal(w.specialStages.active,null);w.step();assert.ok(w.time>time);assert.equal(w.phase,'battle');
});
test('I03 a blocked portal keeps ordinary movement and expires without a modal or spent entry',()=>{
 const w=new World({seed:529,waves:true,sandbox:false,terrain:false,obstacles:[]});assert.ok(w.start());w.stage=12;w.prepareStage();w.specialStages.portal={kind:'resources',point:{x:0,z:2},until:w.time+30};w.obstacles.push({x:0,z:1,w:10,h:1});assert.equal(beginSpecialStage(w,'resources','portal'),false);assert.equal(w.specialStages.active,null);assert.equal(w.specialStages.used.size,0);assert.equal(w.requiresPlayerDecision,false);w.time=31;tickSpecialEntrance(w);assert.equal(w.specialStages.portal,null);
});
test('I03 a training recipient lost after the quote rejects payment and leaves a usable intermission',()=>{
 const w=make();w.addUnit('marine','terran',2,0);w.wallet={minerals:10000,gas:10000};w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,w.stage);let offer;for(let n=0;n<10000&&!offer;n++)offer=drawExpeditionReinforcements(draftContext(w),true).find(r=>r.expeditionEffect.kind==='training');assert.ok(offer&&offer.expeditionEffect.kind==='training');w.rewards=[offer];w.entities.get(offer.expeditionEffect.targets[0].id)!.hp=0;const wallet={...w.wallet};assert.equal(purchaseOffer(w,offer.offerId),false);assert.deepEqual(w.wallet,wallet);assert.equal(w.requiresPlayerDecision,false);w.skipReward();assert.equal(w.phase,'battle');
});
test('I03 blocked mission admission creates no partial task or reservation and can retry after space clears',()=>{
 const w=make();w.workers=1;w.obstacles.push({x:0,z:0,w:10000,h:10000});const serial=w.missions.serial;assert.equal(spawnMission(w,'repair'),false);assert.equal(w.missions.active,null);assert.equal(w.missions.serial,serial);assert.equal(Object.values(w.expedition.building!.missionReserved??{}).reduce((n,x)=>n+x,0),0);assert.equal(w.requiresPlayerDecision,false);w.obstacles=[];assert.ok(spawnMission(w,'repair'));
});
