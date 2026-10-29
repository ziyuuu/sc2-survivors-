import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,collectEquipment} from '../src/simulation/starship/inventory';
import {equipmentDropPolicy,categoryTemplates,categorySlots,rollEquipmentTemplate,qualityWeightedPool,dropEnemyEquipment,markDerivedEquipmentEnemy} from '../src/simulation/starship/drops';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {EQUIPMENT_SLOTS,type Quality} from '../src/simulation/starship/types';
import {tickStarship} from '../src/simulation/starship/runtime';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);
test('all difficulties have one quantity trial and a separate endless quality upgrade',()=>{
 const rates={easy:.0035,normal:.0018,hard:.0012,hell:.001};
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(const [i,stage] of [1,7,13,18].entries())for(const tier of ['regular','elite','boss'] as const){const p=equipmentDropPolicy({difficulty,stage,tier,...(i===3?{endlessRound:13}:{})});close(p.baseChance,tier==='regular'?rates[difficulty]:tier==='elite'?(difficulty==='easy'?.3:.16):i===3?.35:1);close(p.base.reduce((n,r)=>n+r.weight,0),100);if(tier!=='regular')close(p.guaranteed.reduce((n,r)=>n+r.weight,0),100);else assert.equal(p.guaranteed.length,0);close(p.additionalChance,difficulty!=='easy'&&tier==='boss'&&i===3?.3:0);if(difficulty==='hard')assert.ok([...p.base,...p.guaranteed,...p.additional].every(r=>r.quality<=4));if(difficulty==='easy')assert.ok([...p.base,...p.guaranteed].every(r=>r.quality<=3));}
 const p=equipmentDropPolicy({difficulty:'hell',stage:18,endlessRound:37,tier:'boss'});close(p.additionalChance,.5);close(p.pollutionChance,.15);assert.deepEqual(p.additional.map(r=>r.weight),[60,28,12]);
});
test('normal pools have all twelve slots; set family counts remain 6/25/28/29/5/5 without identity weighting',()=>{
 for(const quality of [1,2,3,4] as Quality[]){assert.deepEqual(categorySlots('ordinary',quality),EQUIPMENT_SLOTS);for(const slot of EQUIPMENT_SLOTS)assert.ok(categoryTemplates('ordinary',quality).some(t=>t.pollution!=='required'&&t.slots.includes(slot)));}
 for(const [category,q,count] of [['greenSet',2,6],['blueSet',3,25],['lowerPurple',3,28],['purpleSet',4,29],['lowerOrange',4,5],['orangeSet',5,5]] as const)assert.equal(categoryTemplates(category,q).filter(t=>t.pollution!=='required').length,count);
 const a=newEquipmentAccount(129);for(let i=0;i<4000;i++){const q=([1,2,3,4] as Quality[])[i%4],r=rollEquipmentTemplate(a,{category:'ordinary',quality:q,weight:1},1),t=EQUIPMENT_TEMPLATES[r.template];assert.equal(t.quality,q);assert.ok(t.slots.includes(r.slot));assert.ok(t.kind==='attribute'||t.kind==='module');if(t.pollution==='never')assert.equal(r.polluted,false);}
});
test('pollution uses the same actual tier and slot, includes drop-only families, and cannot pollute adventure or blue modules',()=>{
 const a=newEquipmentAccount(528);let corrupted=0,adventure=0;for(let n=0;n<3000;n++){const orange=rollEquipmentTemplate(a,{category:'orangeSet',quality:5,weight:1},1);assert.equal(orange.polluted,true);if(orange.template==='set.orange.corrupted_hero.5')corrupted++;const purple=rollEquipmentTemplate(a,{category:'purpleSet',quality:4,weight:1},1);if(purple.template==='set.special.adventurer.4'){adventure++;assert.equal(purple.polluted,false);}const blue=rollEquipmentTemplate(a,{category:'ordinary',quality:3,weight:1},1);if(EQUIPMENT_TEMPLATES[blue.template].kind==='module')assert.equal(blue.polluted,false);}
 assert.ok(corrupted>400&&corrupted<600);assert.ok(adventure>60&&adventure<150);
});
test('green special-call rarity is one third per family and ordinary slot mass is independent of template count',()=>{
 const a=newEquipmentAccount(15),slotCounts=Object.fromEntries(EQUIPMENT_SLOTS.map(s=>[s,0])),families:Record<string,number>={};for(let n=0;n<24000;n++){const x=rollEquipmentTemplate(a,{category:'ordinary',quality:3,weight:1},0);slotCounts[x.slot]++;const y=rollEquipmentTemplate(a,{category:'greenSet',quality:2,weight:1},0);families[y.template]=(families[y.template]??0)+1;}for(const count of Object.values(slotCounts))assert.ok(count>1800&&count<2200);const ordinary=(24000-families['set.call.2'])/5;assert.ok(families['set.call.2']/ordinary>.29&&families['set.call.2']/ordinary<.38);
});
test('real enemy death grants a guaranteed item once, excludes derived bodies, and collects at actual anchor range',()=>{
 const a=newEquipmentAccount(529),w=new World({seed:529,difficulty:'easy',sandbox:true,waves:false,obstacles:[],terrain:false,equipmentAccount:a});w.start();const enemy=w.addUnit('zergling','zerg',20,20);enemy.enemyTier='boss';w.hit(enemy,1e9,[],1,'terran');const ids=Object.keys(a.items);assert.ok(ids.length>=1);assert.ok(ids.some(id=>EQUIPMENT_TEMPLATES[a.items[id].template].kind==='set'));const prior=structuredClone(a);assert.deepEqual(dropEnemyEquipment(w,enemy),[]);assert.deepEqual(a,prior);tickStarship(w);assert.ok(ids.every(id=>a.locations[id].kind==='ground'));w.anchor={x:20,z:20};tickStarship(w);assert.ok(ids.every(id=>a.locations[id].kind==='backpack'));
 const derived=w.addUnit('zergling','zerg',22,20);derived.enemyTier='boss';markDerivedEquipmentEnemy(w,derived);w.hit(derived,1e9,[],1,'terran');assert.equal(Object.keys(a.items).length,ids.length);
});
test('Boss quality modifier changes only highest actual quality and preserves same-tier category proportions',()=>{
 const a=newEquipmentAccount(5),w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:a}),r=grantEquipment(a,{template:'module.double_pickup.4',race:'terran',slot:'gathering'},'g',{kind:'warehouse'});assert.ok(r.ok);w.equipItem(r.value.id,r.value.slot);w.start();const p=equipmentDropPolicy({difficulty:'hell',stage:18,endlessRound:13,tier:'boss'}),out=qualityWeightedPool(w,p.additional,true);close(out[0].weight,60);close(out[1].weight,28*1.1);close(out[2].weight,12*1.1);assert.deepEqual(qualityWeightedPool(w,p.additional,false),p.additional);close(p.additionalChance,.3);close(p.pollutionChance,.15);
});
test('equipment snapshots include their runtime; existing empty-account game remains unchanged',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();assert.doesNotThrow(()=>w.captureRun());w.resetRun();assert.equal(w.starship.enabled,false);
 const equipped=new World({sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount()});equipped.start();assert.ok(equipped.captureRun().starship);equipped.resetRun();assert.equal(equipped.starship.enabled,true);
});
