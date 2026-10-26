import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {EQUIPMENT_TEMPLATES} from '../../src/simulation/starship/catalog';
import {inheritancePool} from '../../src/simulation/starship/inheritance';
import {validBinding} from '../../src/simulation/starship/eligibility';
import {HEROES} from '../../src/data/heroes';
import {ELITES} from '../../src/data/elites';
import {PRODUCTION_LINES} from '../../src/data/expedition-buildings';
import {RACES,familyRace} from '../../src/data/races';
import {equipmentFixtureAccount,equipmentFixtureEffects,type EquipmentFixture} from './equipment-fixture';
import type {EquipmentBinding} from '../../src/simulation/starship/types';
const base='reports/local/t01-20261024',old=JSON.parse(await fs.readFile('reports/local/equipment-fx-performance-20261016/equipment-coverage-r6.json','utf8')),rows=[],audit=[],source=[];
for(const g of old.groups)for(const s of g.source??[])if(!source.some(x=>x.file===s.file)){const bytes=await fs.readFile(s.file);source.push({...s,currentSha256:createHash('sha256').update(bytes).digest('hex'),same:createHash('sha256').update(bytes).digest('hex')===s.sha256});}
for(const t of Object.values(EQUIPMENT_TEMPLATES))for(const race of RACES){
 const bindings:EquipmentBinding[]=t.binding==='hero'?Object.entries(HEROES).filter(([,h])=>h.race===race).map(([hero])=>({hero:hero as keyof typeof HEROES})):t.binding==='elite'?Object.values(ELITES).filter(e=>familyRace(e.family)===race).map(e=>({elite:e.id})):t.binding==='direction'?Object.entries(PRODUCTION_LINES).filter(([,l])=>l.race===race).map(([direction])=>({direction:direction as keyof typeof PRODUCTION_LINES})):[{}];
 const counts=t.kind==='set'?[...new Set([2,...Object.values(t.tiers??{}).flatMap(steps=>steps.map(s=>s.pieces)),...(t.repeat?[4,6,8]:[])])].sort((a,b)=>a-b):[1];
 for(const binding of bindings)for(const pieces of counts){assert.ok(validBinding(t,race,binding));const data:EquipmentFixture={template:t.id,race,pieces,binding},a=equipmentFixtureAccount(data),effects=equipmentFixtureEffects(a,race),key=Object.values(binding).join('-')||'unbound';
  const groups=[...new Set(effects.map(e=>old.groups.find(g=>g.keys.includes(e.key))?.id??(/^(stat\.|ordinary\.|direction\.|bound\.|elite\.)/.test(e.key)?'stats':'UNCLASSIFIED')))];
  const id=`equipment:${t.id}:${race}:${pieces}:${key}`;rows.push({id,group:'装备',name:`${t.name} · ${race} · ${pieces}件${key==='unbound'?'':' · '+key}`,runner:'equipment',race,actor:t.id,seconds:20,data:{...data,effects,groups},source:['src/simulation/starship/catalog.ts','src/simulation/starship/catalog-tiers.ts','src/simulation/starship/catalog-modules.ts','src/simulation/starship/selection.ts','src/simulation/starship/runtime.ts']});audit.push({id,valid:true,effects:effects.map(e=>e.key),groups});
 }
 // Every legal inherited clause is represented independently of the random roll.
 if(t.kind==='module')for(const inherited of inheritancePool(t,t.pollution!=='never')){const data:EquipmentFixture={template:t.id,race,pieces:1,binding:{},polluted:t.pollution!=='never',inheritance:inherited.id};const a=equipmentFixtureAccount(data),effects=equipmentFixtureEffects(a,race),id=`inheritance:${t.id}:${race}:${inherited.id}`;rows.push({id,group:'装备继承',name:`${t.name} · ${race} · ${inherited.id}`,runner:'equipment',race,actor:t.id,seconds:20,data:{...data,effects},source:['src/simulation/starship/inheritance.ts','src/simulation/starship/selection.ts']});audit.push({id,valid:true,effects:effects.map(e=>e.key),groups:[]});}
}
await fs.writeFile('tools/t01/equipment.generated.json',JSON.stringify(rows));await fs.writeFile(base+'/equipment-fixture-audit.json',JSON.stringify({templates:Object.keys(EQUIPMENT_TEMPLATES).length,rows:audit,sourceReuseAudit:source,oldEvidenceVisualAcceptance:'Bounded sampled review only; not full current coverage.',visualPass:false},null,2));console.log(JSON.stringify({templates:210,cases:rows.length,unclassified:audit.filter(r=>r.groups.includes('UNCLASSIFIED')).length,unchangedSource:source.filter(s=>s.same).length,source:source.length}));
