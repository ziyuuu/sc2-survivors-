import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {selectEquipmentEffects} from '../src/simulation/starship/selection';
import {newEquipmentAccount,grantEquipment,validateItem,equip,cleanseEquipment,craftEquipment,beginAffixReroll,beginEliteReroll,finishEquipmentReroll} from '../src/simulation/starship/inventory';
import {PURPLE_INHERITANCE,ORANGE_INHERITANCE,inheritancePool} from '../src/simulation/starship/inheritance';
import {ATTRIBUTE_SLOTS,type EquipmentAccount,type EquipmentSlot,type EquipmentBinding} from '../src/simulation/starship/types';
import {rankStats} from '../src/data/ranks';
import {heroGrowth} from '../src/data/hero-growth';
import {equipmentUnitTotals} from '../src/simulation/starship/runtime';
function item(a:EquipmentAccount,template:string,slot:EquipmentSlot,binding?:EquipmentBinding){const t=EQUIPMENT_TEMPLATES[template],r=grantEquipment(a,{template,race:'terran',slot,binding,polluted:t.pollution==='required'},'t:'+a.serial,{kind:'warehouse'});assert.ok(r.ok,r.ok?'':r.error);if(r.value.pollution==='uncleansed'){a.dust+=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);}return r.value;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('compiled catalog contains the approved 70 families and 91 modules, with no orange loose attributes',()=>{
 const templates=Object.values(EQUIPMENT_TEMPLATES),sets=templates.filter(t=>t.kind==='set'),modules=templates.filter(t=>t.kind==='module');assert.equal(new Set(sets.map(t=>t.setFamily)).size,70);assert.equal(modules.length,91);assert.equal(templates.filter(t=>t.kind==='special').length,11);assert.ok(!templates.some(t=>t.kind==='attribute'&&t.quality===5));
 for(const t of templates){const a=newEquipmentAccount(),gear=item(a,t.id,t.slots[0]);assert.ok(validateItem(gear),t.id);assert.equal(gear.affixes.length,t.affixCount);if(t.kind==='set')assert.equal(gear.allocation,t.allocation);if(t.quality<3||t.kind==='module'&&t.quality===3||t.id.includes('adventurer')||t.kind==='special'&&!t.affixCount)assert.equal(t.pollution,'never');}
});
test('mixed set thresholds distinguish 4 purple plus 2 lower pieces, wrong identities and independent blue families',()=>{
 const a=newEquipmentAccount(),pieces=ATTRIBUTE_SLOTS.slice(0,6).map((slot,i)=>item(a,'set.advanced.hero.'+(i<4?4:3),slot,{hero:'raynor'}));let effects=selectEquipmentEffects(pieces);assert.equal(effects.find(e=>e.key==='bound.native')?.values[0],.4);
 pieces[0]=item(a,'set.advanced.hero.3','offense1',{hero:'raynor'});effects=selectEquipmentEffects(pieces);assert.equal(effects.find(e=>e.key==='bound.native')?.values[0],.2);
 pieces[0]=item(a,'set.blue.hero.3','offense1',{hero:'raynor'});assert.ok(!selectEquipmentEffects(pieces).some(e=>e.key==='opening_hero'));
 pieces[0]=item(a,'set.advanced.hero.4','offense1',{hero:'nova'});assert.ok(!selectEquipmentEffects(pieces).some(e=>e.key==='opening_hero'));
});
test('choice quality replacement preserves same-quality repeated groups without mixing leftovers',()=>{
 const a=newEquipmentAccount(),pieces=['set.blue.choice.3','set.blue.choice.3','set.choice.2','set.choice.2'].map((t,i)=>item(a,t,ATTRIBUTE_SLOTS[i]));assert.equal(selectEquipmentEffects(pieces).filter(e=>e.key==='development_refresh').reduce((n,e)=>n+e.values[0],0),2);
 pieces[1]=item(a,'set.choice.2','offense2');assert.equal(selectEquipmentEffects(pieces).filter(e=>e.key==='development_refresh').reduce((n,e)=>n+e.values[0],0),1);
 const four=ATTRIBUTE_SLOTS.slice(0,4).map(slot=>item(a,'set.blue.choice.3',slot));assert.equal(selectEquipmentEffects(four).filter(e=>e.key==='development_refresh').reduce((n,e)=>n+e.values[0],0),4);
});
test('inheritance keeps all 43 legal blue clauses and 16 orange clauses, filters host effects and cannot import special cores',()=>{
 assert.equal(PURPLE_INHERITANCE.length,43);assert.equal(ORANGE_INHERITANCE.length,16);
 for(const t of Object.values(EQUIPMENT_TEMPLATES).filter(t=>t.kind==='module'&&t.quality>=4)){const pool=inheritancePool(t,true);assert.ok(pool.every(p=>p.origin!==t.id.split('.')[1]&&!['swarm','konstant','plague','rewind'].includes(p.origin)),t.id);}
 const a=newEquipmentAccount(),r=item(a,'module.workers.4','gathering');assert.equal(r.inherited.length,0);
 const q=grantEquipment(a,{template:'module.workers.4',race:'terran',slot:'gathering',polluted:true},'polluted',{kind:'warehouse'});assert.ok(q.ok);assert.equal(q.value.inherited.length,1);assert.ok(!q.value.inherited.some(id=>['C01','C02','C03'].includes(id)));
});
test('crafting and both rerolls make real dust payments, reject invalid targets before RNG and preserve pollution maxima',()=>{
 const a=newEquipmentAccount();a.dust=10000;const forged=structuredClone(a);assert.equal(craftEquipment(a,{quality:5,race:'terran',setTemplate:'set.orange.corrupted_hero.5',receipt:'bad'}).ok,false);assert.deepEqual(a,forged);
 const args={quality:3 as const,race:'terran' as const,setTemplate:'set.advanced.elite.3',slot:'offense1' as const,binding:{elite:'marine.1' as const},receipt:'ok'};assert.ok(grantEquipment(a,{...args,template:args.setTemplate},'known-recipe',{kind:'warehouse'}).ok);const made=craftEquipment(a,args);assert.ok(made.ok);assert.equal(a.dust,9750);assert.deepEqual(craftEquipment(a,args),made);assert.equal(a.dust,9750);
 const old=structuredClone(made.value),roll=beginAffixReroll(a,made.value.id,0);assert.ok(roll.ok);assert.equal(a.dust,9740);assert.ok(finishEquipmentReroll(a,roll.value.id,1).ok);assert.deepEqual(made.value.affixes.slice(1),old.affixes.slice(1));assert.deepEqual(made.value.binding,old.binding);
 const binding=beginEliteReroll(a,[made.value.id]);assert.ok(binding.ok);assert.equal(a.dust,9720);assert.equal(binding.value.choices.length,3);assert.ok(finishEquipmentReroll(a,binding.value.id,0).ok);assert.ok(validateItem(made.value));
 const full=grantEquipment(a,{template:'attribute.4',race:'terran',slot:'defense1',polluted:true},'full',{kind:'warehouse'});assert.ok(full.ok);assert.ok(cleanseEquipment(a,full.value.id).ok);const reroll=beginAffixReroll(a,full.value.id,2);assert.ok(reroll.ok);assert.ok(reroll.value.choices.every(c=>'score' in c&&c.score===200));assert.ok(finishEquipmentReroll(a,reroll.value.id,0).ok);assert.ok(full.value.affixes.every(x=>x.score===200));
});
test('approved high ranks increase real stats beyond old clamps without changing I–V',()=>{
 close(rankStats(5).damage*rankStats(5).attackSpeed,5);close(rankStats(6).damage*rankStats(6).attackSpeed,6.8);close(rankStats(7).health,8);close(rankStats(13).damage*rankStats(13).attackSpeed,22.2);close(rankStats(13).health,15.2);
 close(heroGrowth(5).health,2.4);close(heroGrowth(9).health,2.4*1.8);close(heroGrowth(9).damage/heroGrowth(9).period,2.4*1.8);close(heroGrowth(9).skill,23920*1.8);assert.ok(heroGrowth(30).health>heroGrowth(29).health);
 const w=new World({waves:false,sandbox:true,terrain:false,obstacles:[]}),u=w.allies()[0];u.rank=13;w.refreshStats(u,true);const hp=u.maxHp;u.rank=14;w.refreshStats(u);assert.ok(u.maxHp>hp);assert.ok(Number.isFinite(u.weaponDamage));
});
test('unlimited formation plus two direction sets yields 8 squads, 12 matching seats and rank XIII in the production world',()=>{
 const a=newEquipmentAccount(),module=item(a,'module.unlimited.5','logistics');assert.ok(equip(a,'terran',module.id,module.slot).ok);
 for(let i=0;i<8;i++){const gear=item(a,'set.orange.'+(i<4?'soldier':'army')+'.5',ATTRIBUTE_SLOTS[i],{direction:'barracks'});assert.ok(equip(a,'terran',gear.id,gear.slot).ok);}
 const w=new World({waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:a});assert.ok(w.start());assert.equal(w.squadCap(),8);assert.equal(w.familyMemberCap('marine'),12);assert.equal(w.soldierCap('marine'),13);assert.equal(w.familyMemberCap('tank'),7);assert.equal(w.soldierCap('tank'),9);
 const marine=w.allies()[0],tank=w.addUnit('tank','terran',4,0);assert.ok(equipmentUnitTotals(w,marine).attack>equipmentUnitTotals(w,tank).attack);
});
