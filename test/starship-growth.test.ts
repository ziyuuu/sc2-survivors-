import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {ATTRIBUTE_SLOTS,type EquipmentSlot,type EquipmentBinding} from '../src/simulation/starship/types';
import {activeEquipmentEffects} from '../src/simulation/starship/modules';
import {equipmentEnemyDied,collectEquipmentResource,tickEquipmentGrowth} from '../src/simulation/starship/growth';
import {tickStarship,equipmentUnitTotals} from '../src/simulation/starship/runtime';
import {heroGrowth} from '../src/data/hero-growth';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function world(){return new World({seed:529,difficulty:'easy',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});}
function put(w:World,template:string,slot:EquipmentSlot,binding?:EquipmentBinding){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot,binding,polluted:EQUIPMENT_TEMPLATES[template].pollution==='required'},'t:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);if(r.value.pollution==='uncleansed'){a.dust=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);}
function set(w:World,template:string,count:number,binding?:EquipmentBinding){for(const slot of ATTRIBUTE_SLOTS.slice(0,count))put(w,template,slot,binding);}
function kill(w:World,source=w.allies()[0],tier?:'elite'|'boss'){const u=w.addUnit('zergling','zerg',25,w.nextId%10);u.hp=u.maxHp=1;u.enemyTier=tier;w.hit(u,100,[],1,'terran',0,1,source.id);return u;}
test('orange hero grows through V and IX from real team kills, keeps wounds and ignores duplicate/temporary/summoned enemies',()=>{
 const w=world();set(w,'set.orange.hero.5',6,{hero:'raynor'});w.start();const hero=w.heroEntity('raynor')!,source=w.allies().find(u=>!u.heroId)!;hero.hp=hero.maxHp*.4;w.heroes.get('raynor')!.skillReady=100;const effect=activeEquipmentEffects(w).find(e=>e.key==='hero_growth')!;
 for(let n=0;n<49;n++)kill(w,source,'boss');assert.equal(hero.rank,10);assert.equal(w.heroes.get('raynor')!.rank,10);close(hero.hp/hero.maxHp,.4);assert.equal(w.heroes.get('raynor')!.skillReady,100);assert.equal(w.starship.numbers.get(effect.source+':hero-points'),0);assert.equal(w.starship.numbers.get(effect.source+':hero-gains'),7);
 const enemy=kill(w,source);equipmentEnemyDied(w,enemy,source.id);assert.equal(w.starship.numbers.get(effect.source+':hero-points'),1);const temporary=w.addUnit('marine','terran',0,0);temporary.temporary=true;kill(w,temporary,'boss');assert.equal(w.starship.numbers.get(effect.source+':hero-points'),1);const summoned=w.addUnit('zergling','zerg',20,0);summoned.temporary=true;w.hit(summoned,1e8,[],1,'terran',0,1,source.id);assert.equal(w.starship.numbers.get(effect.source+':hero-points'),1);assert.ok(hero.maxHp>10000);
});
test('orange soldier records capped-member mentoring and promotes the actual lowest eligible member once',()=>{
 const w=world();set(w,'set.orange.soldier.5',6,{direction:'barracks'});w.start();const source=w.allies()[0];source.rank=w.soldierCap('marine');w.refreshStats(source,true);const junior=w.addUnit('marine','terran',3,3,1);junior.hp=junior.maxHp*.3;for(let i=0;i<6;i++)kill(w,source);assert.equal(junior.rank,2);close(junior.hp/junior.maxHp,.3);assert.equal(source.rank,9);
});
test('bounty follows actual mineral pickups through one elite and one hero without reusing the evolution payment',()=>{
 const w=world();set(w,'set.advanced.bounty.4',4);w.start();const initial=w.allies().length;const pickup=(minerals:number)=>collectEquipmentResource(w,{id:w.nextId++,minerals,gas:0});pickup(500);const b=w.starship.bounty!,body=w.entities.get(b.body!)!;assert.ok(body.eliteId);assert.equal(body.rank,1);body.hp=body.maxHp*.5;for(let n=0;n<4;n++)pickup(500);assert.equal(b.phase,'hero');assert.equal(body.heroId,b.hero);assert.equal(body.rank,1);assert.equal(w.heroes.size,1);assert.equal(w.allies().length,initial+1);close(body.hp/body.maxHp,.5);pickup(1499);assert.equal(body.rank,1);pickup(1);assert.equal(body.rank,2);const repeated={id:w.nextId++,minerals:500,gas:0};const before=w.wallet.minerals;collectEquipmentResource(w,repeated);collectEquipmentResource(w,repeated);close(w.wallet.minerals-before,500);
});
test('devour collects real mineral and gas packages once, keeps the wallet and applies permanent percentage growth once',()=>{
 const w=world();put(w,'module.devour.5','gathering');w.start();const u=w.allies()[0],base=equipmentUnitTotals(w,u);u.hp=u.maxHp*.5;w.pickups=[{id:w.nextId++,x:30,z:30,minerals:300,gas:100}];const wallet={...w.wallet};for(let n=0;n<2;n++)kill(w,u,'boss');assert.equal(w.pickups.length,0);assert.ok(w.wallet.minerals>=wallet.minerals+300);assert.ok(w.wallet.gas>=wallet.gas+100);close(equipmentUnitTotals(w,u).attack-base.attack,.01);close(equipmentUnitTotals(w,u).health-base.health,.01);close(u.hp/u.maxHp,.5);assert.equal(w.starship.numbers.get('devour-progress'),0);
});
test('bounty order waits for real elite targets, marks at most three and pays each enemy only once',()=>{
 const w=world();put(w,'module.bounty_order.5','gathering');w.start();w.time=60;tickEquipmentGrowth(w);const units=Array.from({length:4},()=>{const u=w.addUnit('zergling','zerg',25,w.nextId%10);u.enemyTier='elite';return u;});tickEquipmentGrowth(w);assert.equal(units.filter(u=>w.starship.numbers.has('bounty-mark:'+u.id)).length,3);const before={...w.wallet};w.hit(units[0],1e9,[],1,'terran');equipmentEnemyDied(w,units[0]);close(w.wallet.minerals-before.minerals,300);close(w.wallet.gas-before.gas,150);
});
test('war plunder adds one allowed item independently of natural boss layers and one legal elite unit card',()=>{
 const w=world();put(w,'module.plunder.5','gathering');w.start();const elite=kill(w,undefined,'elite'),extra=w.rewardDrops.filter(d=>d.bossLootReceipt?.includes(':plunder:'));assert.equal(extra.length,1);assert.ok(['hero','elite'].includes((extra[0].reward as any).expeditionEffect.kind));equipmentEnemyDied(w,elite);assert.equal(w.rewardDrops.filter(d=>d.bossLootReceipt?.includes(':plunder:')).length,1);const boss=kill(w,undefined,'boss');assert.ok([...w.starship.account.run!.receipts].some(r=>r.includes(':plunder-gear:'+boss.id+':')));assert.ok(Object.values(w.starship.account.items).every(i=>i.quality<=2||i.template==='module.plunder.5'));
});
