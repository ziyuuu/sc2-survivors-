import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {tickStarship} from '../src/simulation/starship/runtime';
import {equipmentDevelopmentLimit,equipmentPeriodicResources,equipmentStageEconomy,equipmentPurchasePrice} from '../src/simulation/starship/economy';
import {equipmentReactorAmmo,consumeEquipmentReactor} from '../src/simulation/starship/support';
import {tickTalentSupport} from '../src/simulation/combat/talent-support';
import {type Race} from '../src/data/races';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function world(race:Race='terran'){return new World({race,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,template:string,slot:EquipmentSlot){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot},'test:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
function enemy(w:World){const u=w.addUnit('zergling','zerg',0,3);u.hp=u.maxHp=10000;u.armor=0;w.allies()[0].attackTarget=u.id;return u;}
test('loan and extra development pay real projects, keep distinct first choices, and clear the specified stages once',()=>{
 const w=world();put(w,'module.loan.4','gathering');for(const slot of ATTRIBUTE_SLOTS.slice(0,4))put(w,'set.advanced.choice.4',slot);const initial={...w.wallet};w.start();close(w.wallet.minerals-initial.minerals,4500);close(w.wallet.gas-initial.gas,3000);w.endStage();assert.equal(equipmentDevelopmentLimit(w),4);const chosen:string[]=[];
 for(let n=0;n<4;n++){assert.equal(w.rewardRound,'building');const offer=w.rewards.find(r=>w.canChooseReward(r))!;assert.ok(offer);chosen.push(offer.id);assert.ok(w.choose(offer.offerId));}
 assert.notEqual(chosen[0],chosen[1]);assert.equal(w.rewardRound,'random');assert.equal(w.starship.numbers.get('development-count:'+w.draftWindowId),4);assert.ok(w.economyTotals.purchases.minerals>0);
 w.stage=7;equipmentStageEconomy(w);assert.deepEqual(w.wallet,{minerals:0,gas:0});w.wallet.minerals=17;equipmentStageEconomy(w);assert.equal(w.wallet.minerals,17);w.stage=8;equipmentStageEconomy(w);assert.equal(w.wallet.minerals,0);
});
test('purple paid refresh earns one independent free refresh and only real payments enter the stable price counter',()=>{
 const w=world();put(w,'module.refresh.4','logistics');w.start();w.endStage();w.skipReward();assert.equal(w.rewardRound,'random');w.wallet.minerals=10000;const price=w.rerollCost(),before=w.wallet.minerals;assert.ok(price>0);assert.ok(w.reroll());close(before-w.wallet.minerals,price);assert.equal(w.starship.window.shop,1);assert.equal(w.rerollCost(),0);const paid=w.economyTotals.rerolls;assert.ok(w.reroll());assert.equal(w.economyTotals.rerolls,paid);assert.equal(w.starship.window.shop,0);assert.equal(w.starship.numbers.get('paid-refresh:'+w.draftWindowId),1);assert.equal(w.rerollCost(),price);
});
test('first purchase is free on the real page, while the next paid choice actually debits the wallet',()=>{
 const w=world();put(w,'module.unreasonable.4','logistics');w.start();w.endStage();w.skipReward();w.wallet={minerals:10000,gas:10000};const first=w.rewards.find(r=>r.minerals+r.gas>0&&w.canChooseReward(r))!;assert.ok(first);assert.equal(equipmentPurchasePrice(w,first).firstFree,true);const before={...w.wallet};assert.ok(w.choose(first.offerId));close(first.purchaseReceipt!.minerals,0);close(first.purchaseReceipt!.gas,0);assert.deepEqual(w.wallet,before);const second=w.rewards.find(r=>!r.sold&&r.minerals+r.gas>0&&w.canChooseReward(r));assert.ok(second);assert.equal(equipmentPurchasePrice(w,second).firstFree,false);const price={minerals:second.minerals,gas:second.gas};assert.ok(w.choose(second.offerId));close(w.wallet.minerals,before.minerals-price.minerals);close(w.wallet.gas,before.gas-price.gas);
});
test('purple supply interest uses the pre-payment balance and fires only every third actual supply',()=>{
 const w=world();put(w,'module.supply.4','logistics');w.start();w.wallet={minerals:10000,gas:5000};for(let n=0;n<2;n++)equipmentPeriodicResources(w,'source',15,5);close(w.wallet.minerals,10030);equipmentPeriodicResources(w,'source',15,5);close(w.wallet.minerals,10345);close(w.wallet.gas,5215);
});
test('purple bombardment resolves three paid waves and incendiary pays one gas grant with nonstacking overlap',()=>{
 const w=world();put(w,'module.suppression.4','support');w.start();const u=enemy(w);w.time=30;tickStarship(w);assert.equal(w.starship.strikes.length,1);for(const time of [30.6,31,31.6,32,32.6]){w.time=time;tickStarship(w);}close(u.maxHp-u.hp,540);assert.equal(w.starship.supportSequences.length,0);assert.equal(w.starship.strikes.length,0);
 const fire=world();put(fire,'module.incendiary.4','support');fire.start();const target=enemy(fire),gas=fire.wallet.gas;fire.time=60;tickStarship(fire);close(fire.wallet.gas-gas,50);assert.equal(fire.starship.strikes.length,5);fire.time=60.6;tickStarship(fire);const hp=target.hp;fire.time=61.6;tickStarship(fire);close(hp-target.hp,10);close(fire.wallet.gas-gas,50);
});
for(const race of ['terran','zerg','protoss'] as const)test(`${race}: joint support uses real native damage and recovery without a legacy talent`,()=>{
 const w=world(race);put(w,'module.joint.4','support');w.start();const u=enemy(w),friend=w.allies()[0];friend.maxHp=1000;friend.hp=100;if(race==='protoss'){friend.maxShield=1000;friend.shield=100;}w.time=35;tickStarship(w);assert.equal(w.talent('tank_support'),0);close(race==='protoss'?friend.shield!:friend.hp,163);assert.ok(w.talentSupportImpacts.length>0);w.time=35.8;tickTalentSupport(w);assert.ok(u.hp<u.maxHp);assert.equal(w.talentSupportImpacts.length,0);w.paused=true;const hp=friend.hp;w.time=36;tickStarship(w);close(friend.hp,hp);
});
test('reactor counts only its own stock, pauses full progress and resumes after real consumption',()=>{
 const w=world();put(w,'module.reactor.4','support');w.start();for(const time of [270,540,810]){w.time=time;tickStarship(w);}assert.equal(equipmentReactorAmmo(w),3);assert.equal(w.expedition.support.ammo,3);w.time=1800;tickStarship(w);consumeEquipmentReactor(w);w.expedition.support.ammo--;w.time=1801;tickStarship(w);assert.equal(equipmentReactorAmmo(w),2);w.time=2070;tickStarship(w);assert.equal(equipmentReactorAmmo(w),3);assert.equal(w.expedition.support.ammo,3);
});
test('purple air drop delivers its extra elite and restores the temporary attack-speed burst after five seconds',()=>{
 const w=world();put(w,'module.drop_pod.4','support');w.start();enemy(w);w.time=90;tickStarship(w);w.time=90.8;tickStarship(w);const units=w.allies().filter(u=>u.temporary);assert.equal(units.length,4);assert.equal(units.filter(u=>u.eliteId&&u.rank===2).length,1);assert.ok(units.every(u=>u.temporaryUntil===135.8));const marine=units.find(u=>!u.eliteId)!,period=marine.attackPeriod;w.time=96;w.refreshStats(marine);close(marine.attackPeriod,period*2);
});
