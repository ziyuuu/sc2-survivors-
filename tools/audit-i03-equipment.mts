import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {rollEquipmentTemplate,equipmentDropPolicy} from '../src/simulation/starship/drops';
import {newEquipmentAccount,createEquipmentItem,validateItem} from '../src/simulation/starship/inventory';
const base='reports/local/integration-i03-20261022',catalog=JSON.parse(await fs.readFile(base+'/catalog-structural.json','utf8'));
const witnesses=new Map<string,unknown>(),bindings=new Set<string>(),inheritance=new Set<string>();
const rows=new Map<string,any>();for(const t of catalog.templates)for(const source of t.sources)rows.set(source.row.category+':'+source.row.quality,source);
for(const source of rows.values())for(let i=1;i<=24000;i++){
 const seed=Math.imul(i,0x9e3779b9)>>>0,policy=equipmentDropPolicy(source.ctx);
 for(const race of ['terran','zerg','protoss'] as const){
  const a=newEquipmentAccount(seed),rolled=rollEquipmentTemplate(a,source.row,policy.pollutionChance),item=createEquipmentItem(a,{...rolled,race});assert.ok(item.ok);assert.ok(validateItem(item.value));
  const key=race+':'+rolled.template;for(const id of item.value.inherited)inheritance.add(id);for(const [kind,id] of Object.entries(item.value.binding))bindings.add(kind+':'+id);
  if(!witnesses.has(key))witnesses.set(key,{seed,race,source,rolled,binding:item.value.binding,inherited:item.value.inherited,finalRng:a.rng});
 }
}
const expected=Object.keys(EQUIPMENT_TEMPLATES).flatMap(t=>['terran','zerg','protoss'].map(r=>r+':'+t)),missing=expected.filter(id=>!witnesses.has(id));
await fs.writeFile(base+'/equipment-seeds.json',JSON.stringify({at:new Date().toISOString(),scope:'Unmodified production category/template/pollution/binding/affix/inheritance samplers, fixed initial account seeds. Each conditional category has a positive natural-drop policy path from catalog-structural.json; no claim of campaign appearance frequency.',expected,witnesses:Object.fromEntries(witnesses),bindings:[...bindings].sort(),inheritance:[...inheritance].sort(),missing},null,2));
console.log(JSON.stringify({templates:Object.keys(EQUIPMENT_TEMPLATES).length,witnesses:witnesses.size,missing,bindings:bindings.size,inheritance:inheritance.size}));
