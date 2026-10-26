import fs from 'node:fs/promises';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {World} from '../../src/simulation/world';
import {DYNAMIC_CASES} from './catalogue';
import {prepareEquipmentPreview,beforeEquipmentPreview,equipmentPreviewSnapshot} from './equipment-preview-runtime';
import type {EquipmentPreviewData} from './equipment-preview-spec';
const cases=DYNAMIC_CASES.filter(c=>c.runner==='equipment'&&(c.data as EquipmentPreviewData).focusEffect);
const selected=new Map<string,typeof cases[number]>();
for(const c of cases){const d=c.data as EquipmentPreviewData,key=d.focusEffect+':'+d.previewPhase+(process.env.T01_ALL_VARIANTS?':'+d.race+':'+JSON.stringify(d.binding)+':'+d.effects.map(e=>e.key+'='+e.values.join('/')).join('|'):d.focusEffect==='hero_orange'?':'+d.binding.hero+':'+d.template:'');if(!selected.has(key))selected.set(key,c);}
const filter=process.env.T01_EFFECTS?.split(','),rows=[];
for(const [key,c]of selected){if(filter&&!filter.some(x=>key.startsWith(x+':')))continue;
 try{const w=new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)}),f=prepareEquipmentPreview(w,c),snapshots=[];
  for(let i=0;i<Math.round((c.seconds??12)*60);i++){beforeEquipmentPreview(w,f);w.step();if(i%60===0)snapshots.push(equipmentPreviewSnapshot(w,f));if(w.phase!=='battle')break;}
  const initial=f.initial,current=equipmentPreviewSnapshot(w,f).current;
  const row={key,id:c.id,data:f.data,phase:w.phase,elapsed:w.time,actor:current.bodies.find(b=>b.id===f.actorId),initialBodies:initial.bodies.length,bodies:current.bodies.length,receiptKinds:[...new Set([...initial.receipts,...current.receipts,...f.observed.flatMap(o=>(o.receipts??[]) as {kind:string}[])].map(r=>r.kind))],allReceiptKinds:[...new Set(f.observed.flatMap(o=>o.events as string[]))],changedNumbers:current.numbers.filter(([k,v])=>!initial.numbers.some(([ik,iv])=>ik===k&&iv===v)),projections:current.projections.length,mines:w.expedition.support.mines.length,forts:current.forts.length,burns:current.burnZones.length,workers:current.workers-initial.workers,initial,current,observed:f.observed,members:[...w.starship.members],locked:[...w.starship.account.run!.locked],hero:w.starship.hero,bounty:w.starship.bounty,rewind:w.starship.life.rewindUsed,snapshots:process.env.T01_COMPACT?undefined:snapshots};rows.push(row);console.log(JSON.stringify({...row,data:undefined,initial:undefined,current:undefined,observed:undefined,members:undefined,locked:undefined,hero:undefined,bounty:undefined,snapshots:undefined,actor:row.actor?{hp:row.actor.hp,rank:row.actor.rank}:null}));
 }catch(e){const row={key,id:c.id,error:String(e)};rows.push(row);console.log(JSON.stringify(row));}
}
await fs.mkdir('.cache/t01-feedback-repairs',{recursive:true});await fs.writeFile('.cache/t01-feedback-repairs/equipment-probe.json',JSON.stringify(rows,null,2));
