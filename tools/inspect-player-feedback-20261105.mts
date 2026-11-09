/** Investigation only: synthetic state, native shop/equipment transactions; no production changes. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,canEquip} from '../src/simulation/starship/inventory';
import {draftContext} from '../src/simulation/expedition-economy';
import {inspectShopWeights,drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
import {effectiveReaperGrowth} from '../src/simulation/combat/terran-elite-runtime';
import {quickEquipPlan} from '../src/simulation/starship/quick-equip';

function world(seed=529){return new World({seed,race:'terran',difficulty:'normal',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(seed)});}
function shop(seed=529){const w=world(seed);w.start();w.entities.clear();w.heroes.clear();w.expedition.familySlots=['reaper'];w.stage=7;assert.ok(w.acquireElite('reaper.3'));w.wallet={minerals:100000,gas:100000};w.endStage();w.skipReward();assert.equal(w.rewardRound,'random');return w;}
function state(w:World){const h=w.eliteOwned('reaper.3')!;return {wallet:{...w.wallet},hunter:h.id,rank:h.rank,growth:effectiveReaperGrowth(w,h),damage:h.weaponDamage,receipts:w.terranElites.absorptions.length,bodies:w.allies().filter(u=>u.unitType==='reaper').map(u=>({id:u.id,elite:u.eliteId,hp:u.hp})),sold:w.rewards.filter(r=>r.sold).map(r=>r.offerId)};}
const shopCases=[];
for(const rank of [1,5])for(const rarity of ['purple','orange'])for(const variant of ['reaper.1','reaper.2'] as const){
 const w=shop(),h=w.eliteOwned('reaper.3')!;for(let i=1;i<rank;i++)assert.ok(w.acquireElite('reaper.3'));
 let offer:any;let draws=0;
 for(;draws<300&&!offer;draws++){w.rewards=drawExpeditionReinforcements(draftContext(w),true);offer=w.rewards.find((r:any)=>r.rarity===rarity&&r.expeditionEffect?.kind==='elite'&&r.expeditionEffect.family==='reaper');}
 assert.ok(offer,`missing ${rarity}`);assert.ok(w.canChooseReward(offer));
 const before=state(w),attempts=[];
 for(let n=0;n<2;n++){let returned:any,error:any;try{returned=w.choose(offer.offerId,variant);}catch(e){error=String(e);}attempts.push({returned,error,after:state(w),offerSold:offer.sold,paid:offer.purchaseReceipt});}
 const restored=world();restored.restoreRun(w.captureRun());assert.deepEqual(state(restored),state(w));
 if(rarity==='orange'){assert.match(attempts[0].error,/setting 'rank'/);assert.deepEqual(attempts[1].after.wallet,before.wallet);assert.equal(attempts[1].offerSold,false);assert.equal(attempts[1].after.receipts-before.receipts,2);}
 else {assert.equal(attempts[0].returned,true);assert.equal(attempts[1].returned,false);assert.equal(attempts[1].after.receipts-before.receipts,1);}
 shopCases.push({rank,rarity,variant,draws,offer:{id:offer.offerId,effect:offer.expeditionEffect,minerals:offer.minerals,gas:offer.gas},eligible:w.canAcquireElite(variant),before,attempts,snapshotRestoresUnpaidGrowth:rarity==='orange'});
}
const equipmentCases=[];
for(const phase of ['outside','intermission'])for(const oldTemplate of ['attribute.1','attribute.3','set.training.2','special.doom.3']){
 const w=world(),a=w.starship.account;
 const g=(template:string,location:any)=>{const r=grantEquipment(a,{template,race:'terran',slot:'offense1',polluted:false},'fixture:'+a.serial,location);assert.ok(r.ok,template+':'+JSON.stringify(r));return r.value;};
 const old=g(oldTemplate,{kind:'warehouse'});assert.ok(w.equipItem(old.id,old.slot).ok);
 if(phase==='intermission'){w.start();w.endStage();}
 const candidate=g(oldTemplate==='attribute.3'?'attribute.3':'attribute.4',phase==='outside'?{kind:'warehouse'}:{kind:'backpack',run:a.run!.id});
 const plan=quickEquipPlan(a,'terran'),manual=canEquip(a,'terran',candidate.id,candidate.slot),rev=a.revision;
 const start=performance.now(),result=w.autoEquipItems(new Set()),elapsed=performance.now()-start;
 equipmentCases.push({phase,oldTemplate,candidate:candidate.template,manual,plan:plan.map(i=>i.id),result,elapsedMs:elapsed,equipped:a.equipped.terran.offense1,revisionDelta:a.revision-rev});
}
const w=shop();for(let i=1;i<5;i++)w.acquireElite('reaper.3');
const report={date:'2026-11-05',scope:'Current local source; synthetic isolated World; finite native candidate draws, not natural play or player save.',maxRankCandidates:inspectShopWeights(draftContext(w)).filter(r=>r.group==='elite'),shopCases,equipmentCases};
fs.mkdirSync('reports/local/player-feedback-20261105',{recursive:true});fs.writeFileSync('reports/local/player-feedback-20261105/simulation.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
