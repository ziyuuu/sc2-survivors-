import {test} from 'node:test';
import assert from 'node:assert/strict';
import {equipmentDescription} from '../src/ui/starship/equipment-description';
import {selectEquipmentEffects} from '../src/simulation/starship/selection';
import {ATTRIBUTE_SLOTS,type EquipmentItem} from '../src/simulation/starship/types';
import {equipmentTemplate} from '../src/simulation/starship/catalog';
import {effectText} from '../src/ui/starship/effect-text';
import {bindingName,catalogItem,catalogRows} from '../src/ui/starship/presentation';

const pieces=(template:string,n:number):EquipmentItem[]=>Array.from({length:n},(_,index)=>({id:template+':'+index,template,race:'terran',slot:ATTRIBUTE_SLOTS[index],quality:equipmentTemplate(template).quality,binding:{},pollution:'none',allocation:2,affixes:[],inherited:[]}));
test('set description groups multiple effects under one threshold and separates other qualities',()=>{
 const items=pieces('set.advanced.sustain.3',4),before=JSON.stringify(items),d=equipmentDescription(items[0],items);
 assert.equal(d.setBonuses?.primaryQuality,3);assert.deepEqual(d.setBonuses?.tiers.map(t=>t.quality),[3,4]);
 assert.deepEqual(d.setBonuses?.tiers[0].steps.map(s=>s.pieces),[2,4,6]);assert.equal(d.setBonuses?.tiers[1].steps.filter(s=>s.pieces===6).length,1);
 assert.equal(JSON.stringify(items),before);
});
test('mixed qualities follow native four-piece quality gate and do not count polluted pieces',()=>{
 const items=[...pieces('set.advanced.sustain.4',4),...pieces('set.advanced.sustain.3',2)];items.forEach((i,n)=>i.slot=ATTRIBUTE_SLOTS[n]);
 const native=selectEquipmentEffects(items);assert.ok(native.every(e=>e.quality===4));assert.equal(equipmentDescription(items[4],items).setBonuses?.primaryQuality,4);
 items[0].pollution='uncleansed';const d=equipmentDescription(items[4],items);assert.equal(d.setBonuses?.count,5);assert.equal(d.setBonuses?.primaryQuality,3);assert.match(d.setBonuses!.tiers[1].gate,/3\/4件/);assert.ok(d.setBonuses!.tiers[1].steps.every(s=>s.rows.every(r=>!r.active)));
});
test('identical bonuses at two and six pieces do not falsely activate the six-piece row',()=>{
 const items=pieces('set.orange.army.5',4),d=equipmentDescription(items[0],items),tier=d.setBonuses!.tiers.find(t=>t.quality===5)!;
 assert.ok(selectEquipmentEffects(items).some(e=>e.key==='capacity_squads'));assert.equal(tier.steps[0].rows.find(r=>r.effect.key==='capacity_squads')?.active,true);assert.ok(tier.steps[2].rows.every(r=>!r.active));
});
test('unworn and higher-tier-suppressed set pieces do not claim activation',()=>{
 const items=pieces('set.team.2',2),higher=pieces('set.blue.team.3',2);higher.forEach((i,n)=>i.slot=ATTRIBUTE_SLOTS[n+2]);
 assert.ok(equipmentDescription(items[0],[]).setBonuses!.tiers[0].steps[0].rows.every(r=>!r.active));
 assert.ok(equipmentDescription(items[0],[...items,...higher]).setBonuses!.tiers[0].steps[0].rows.every(r=>!r.active));
});
test('repeatable two-piece sets retain a single two-piece description and native repeated bonuses',()=>{
 const items=pieces('set.dogs.2',4),d=equipmentDescription(items[0],items);assert.equal(selectEquipmentEffects(items).length,2);assert.equal(d.setBonuses!.tiers[0].steps.length,1);assert.equal(d.setBonuses!.tiers[0].steps[0].pieces,2);assert.ok(d.setBonuses!.tiers[0].steps[0].rows.every(r=>r.active));
});
test('concrete catalogue hero and elite descriptions resolve identity and production direction',()=>{
 const seen=new Set<string>();let checked=0;
 for(const row of catalogRows){if(row.polluted||!row.binding.hero&&!row.binding.elite)continue;const key=row.template+':'+bindingName(row.binding);if(seen.has(key))continue;seen.add(key);
  const item=catalogItem(row),before=JSON.stringify(item),d=equipmentDescription(item,[item]);assert.match(d.requirement,new RegExp(bindingName(item.binding)));assert.doesNotMatch(d.rows.map(r=>r.label).join('\n'),/绑定英雄|绑定精英|绑定身份|绑定方向/);
  for(const r of d.rows)if(r.effect.key.startsWith('bound.')||['opening_hero','opening_elite_bound','opening_elite_rank','hero_growth','hero_orange','replace_hero_proxy'].includes(r.effect.key))assert.ok(r.label.includes(bindingName(item.binding)),r.label);
  assert.equal(JSON.stringify(item),before);checked++;
 }assert.ok(checked>100);
});
test('Raynor wording names the hero while keeping direction and team-wide recipients distinct',()=>{
 const binding={hero:'raynor' as const};
 assert.equal(effectText({key:'opening_hero',values:[3],binding}),'开局获得Ⅲ级雷诺');
 assert.equal(effectText({key:'bound.health',values:[.5],binding}),'雷诺最大生命 +50%');
 assert.equal(effectText({key:'direction.health',values:[1],binding}),'兵营方向普通士兵生命加成 +100%');
 const elite=catalogRows.find(r=>r.binding.elite)!.binding,name=bindingName(elite);
 assert.equal(effectText({key:'bound.attack',values:[.5],binding:elite}),name+'攻击加成 +50%');
 assert.equal(effectText({key:'elite.attack',values:[.5],binding:elite}),'全队精英攻击加成 +50%');
});
test('replacement losses retain the removed hero identity instead of adopting the inspected item identity',()=>{
 const worn=pieces('set.orange.hero.5',6);for(const i of worn)i.binding={hero:'raynor'};
 const replacement={...worn[0],id:'tychus-replacement',binding:{hero:'tychus' as const}};
 const before=JSON.stringify(selectEquipmentEffects(worn)),d=equipmentDescription(replacement,worn);
 assert.ok(d.requirement.includes('泰凯斯'));assert.match(d.preview,/不再生效：.*雷诺/);assert.doesNotMatch(d.preview,/开局获得Ⅲ级泰凯斯/);assert.equal(JSON.stringify(selectEquipmentEffects(worn)),before);
});
