import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RACES,type Race} from '../src/data/races';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {activeEquipmentEffects,prepareEquipmentShelf} from '../src/simulation/starship/modules';
import {tickStarship} from '../src/simulation/starship/runtime';
import {talentModifiers} from '../src/simulation/combat/expedition-combat';
import {tickShopSupport} from '../src/simulation/combat/shop-support';
import type {EquipmentSlot} from '../src/simulation/starship/types';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function fixture(race:Race='terran',sandbox=true){return new World({seed:529,race,sandbox,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,template:string,slot:EquipmentSlot){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot},'test:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);return r.value;}
for(const race of RACES)test(`gear ${race}: initial training/team/elite conversion and independent dogs share actual deployment rules`,()=>{
 const w=fixture(race);for(const [template,slots]of [['training',['offense1','offense2']],['team',['offense3','offense4']],['call',['defense1','defense2']],['dogs',['defense3','defense4']]] as const)for(const slot of slots)put(w,'set.'+template+'.2',slot);
 assert.ok(w.start());const independent=w.allies().filter(u=>w.starship.members.get(u.id)?.independent),formal=w.allies().filter(u=>!w.starship.members.get(u.id)?.independent);
 assert.equal(independent.length,2);assert.ok(independent.every(u=>u.unitType==='zergling'&&!u.eliteId&&u.rank===2));assert.equal(formal.length,race==='zerg'?4:2);assert.ok(formal.every(u=>u.rank===2&&!!u.eliteId));assert.equal(w.familySeatCount(formal[0].unitType as any),2);assert.equal(w.starship.account.run!.locked.size,8);
 tickStarship(w);assert.equal(w.allies().length,formal.length+2);assert.equal(w.unequipItem('offense1').ok,false);
});
test('green choices yield four independent operating refreshes and never consume a shop refresh',()=>{
 const w=fixture();for(const slot of ['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'] as const)put(w,'set.choice.2',slot);w.start();w.endStage();w.wallet={minerals:0,gas:0};assert.equal(activeEquipmentEffects(w).filter(e=>e.key==='development_refresh').length,4);
 for(let i=0;i<5;i++){assert.equal(w.rerollCost(),0);assert.ok(w.reroll());}assert.ok(w.rerollCost()>0);w.rewardRound='random';assert.ok(w.rerollCost()>0);assert.equal(w.starship.window.shop,0);near(w.wallet.minerals,0);
});
test('green supply grants one stage reward, while periodic grants freeze in intermission',()=>{
 const w=fixture();put(w,'module.supply.2','logistics');w.start();const wallet={...w.wallet},base=w.config.reward;w.time=60;tickStarship(w);near(w.wallet.minerals,wallet.minerals+15);near(w.wallet.gas,wallet.gas+5);w.endStage();near(w.clearReceipt!.minerals,base[0]+10);near(w.clearReceipt!.gas,base[1]+3);const paid={...w.wallet};w.time=180;tickStarship(w);w.endStage();assert.deepEqual(w.wallet,paid);
});
test('green economic modules alter real worker income and one actual rescue, without changing passive base income',()=>{
 const plain=fixture('terran',false),gear=fixture('terran',false);put(gear,'module.workers.2','gathering');plain.start();gear.start();plain.workers=1;const a={...plain.wallet},b={...gear.wallet};plain.updateEconomy(10);gear.updateEconomy(10);assert.ok(gear.wallet.minerals-b.minerals>plain.wallet.minerals-a.minerals);
 const rescue=fixture();put(rescue,'module.rescue.2','gathering');rescue.start();const egg=rescue.spawnEconomic('egg',{x:3,z:0});rescue.hit(egg,10000,[],1,'terran');rescue.hit(egg,10000,[],1,'terran');assert.equal(rescue.workers,2);
});
test('green support waits for engagement and pays once per launch, while mines use the existing real mine system',()=>{
 const w=fixture();put(w,'module.golden_egg.2','support');put(w,'set.traps.2','offense1');put(w,'set.traps.2','offense2');w.start();tickShopSupport(w);w.time=30;const money=w.wallet.minerals;tickStarship(w);near(w.wallet.minerals,money);assert.equal(w.expedition.support.mines.length,1);
 const e=w.addUnit('zergling','zerg',0,3);e.maxHp=e.hp=10000;e.armor=0;w.allies()[0].attackTarget=e.id;tickStarship(w);near(w.wallet.minerals,money+50);assert.equal(w.starship.strikes.length,1);w.time=30.6;tickStarship(w);near(e.maxHp-e.hp,30);tickStarship(w);near(w.wallet.minerals,money+50);
});
test('green control changes actual native aiming and only legal manual cooldowns',()=>{
 const moving=fixture();put(moving,'module.moving_fire.2','control');moving.start();const m=talentModifiers(moving,moving.allies()[0]);near(m.aimingSpeedMultiplier!,1.75);near(m.movingFireChance!,.5);
 const skills=fixture();put(skills,'module.formation.2','control');skills.start();near(talentModifiers(skills,skills.allies()[0],'hero').abilityCooldownReductionPct!,.1);assert.equal(talentModifiers(skills,skills.allies()[0],'bile').abilityCooldownReductionPct,undefined);
});
test('green shop discount applies once to each generated shelf and the actual refresh payment',()=>{
 const w=fixture();put(w,'module.purchase.2','logistics');w.start();w.endStage();w.rewardRound='random';const offers=w.generateReinforcementDraft('fixture');const copy=structuredClone(offers);prepareEquipmentShelf(w,offers);assert.deepEqual(offers,copy);
 const refresh=fixture();put(refresh,'module.refresh.2','logistics');refresh.start();refresh.endStage();refresh.rewardRound='random';refresh.expedition.developmentBought=true;refresh.wallet.minerals=1000;const price=refresh.rerollCost(),before=refresh.wallet.minerals;assert.ok(refresh.reroll());near(before-refresh.wallet.minerals,price);assert.equal(refresh.expedition.refreshCount,1);
});
