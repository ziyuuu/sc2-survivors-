import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {DYNAMIC_CASES} from './catalogue';
import type {EquipmentPreviewData} from './equipment-preview-spec';
const prior=await Promise.all([0,1,2].map(async n=>JSON.parse(await fs.readFile('.cache/t01-feedback-repairs/equipment-audit-'+n+'.json','utf8'))));
const rows=new Map(prior.flatMap(p=>p.rows).map((r:any)=>[r.id,r])),mapping=prior[0].mapping;
const cases=DYNAMIC_CASES.filter(c=>c.runner==='equipment'&&(c.data as EquipmentPreviewData).focusEffect),signatures=new Set<string>();
assert.equal(new Set(cases.map(c=>c.id)).size,cases.length);
const groups=new Map<string,Set<string>>();
for(const c of cases){const d=c.data as EquipmentPreviewData,r=rows.get(mapping[c.id]) as any;
 assert.ok(r?.verified&&r.triggered,c.id);assert.equal(r.key,d.focusEffect);assert.equal(r.race,d.race);assert.equal(r.phase,d.previewPhase);assert.deepEqual(r.binding,d.binding);
 signatures.add(JSON.stringify([d.race,d.binding,d.focusEffect,d.previewPhase,d.effects.map(e=>[e.key,e.values])]));
 const grouped=[c.id.replace(/:effect:.*$/,''),d.focusEffect,d.previewPhase].join('/');assert.ok(!groups.has(grouped),'duplicate visible effect configuration '+grouped);groups.set(grouped,new Set());
 const repeat=d.effects.filter(e=>e.key===d.focusEffect).length;if(repeat>1)assert.ok(d.description.includes('组'),c.id+' lacks active-group description');
}
assert.equal(signatures.size,3312);
const report={previewCases:cases.length,uniqueIds:cases.length,uniqueParameterScenarios:signatures.size,allMappedToVerifiedNativeScenario:true,repeatedGroupsDescribed:true,allDynamicCases:DYNAMIC_CASES.length};
await fs.writeFile('.cache/t01-feedback-repairs/equipment-final-mapping.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
