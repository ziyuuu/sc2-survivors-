import fs from 'node:fs/promises';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {prepareCardEffect,triggerCardEffect,stepCardEffectFixture,cardEffectSnapshot,cardEffectSeconds} from './card-effect-fixture';
import type {Case} from './catalogue';
import entries from './native-cards.generated.json';
const output=process.argv[2]??'reports/local/t01-20261024/card-effect-simulation-r1.json';
const report:{scope:string;rows:any[];complete:boolean}={scope:'Per-card actual purchase and effect-specific production simulation in a controlled fixture. This does not establish rendered visual acceptance. Conditional effect witnesses are recorded separately.',rows:[],complete:false};
const selected=process.argv[4]?entries.filter(c=>process.argv[4]!.split(',').includes(c.id)):entries.slice(0,Number(process.argv[3]??entries.length));
for(const [index,c]of selected.entries()){
 const row:any={id:c.id,status:'running'};report.rows.push(row);
 try{
  const naturalEvent=c.data.effect.kind==='funShop'&&['tavern','bait'].includes((c.data.effect as {item:string}).item);
  const w=new World({seed:529,waves:naturalEvent,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)}),f=prepareCardEffect(w,c as Case),initial=cardEffectSnapshot(w),events=new Set<string>();
  row.fixture=f.receipt;row.before=initial;row.samples=[];
  triggerCardEffect(w,c as Case,f.actorId,f.targetId);const start=w.time;
  if(f.immediate){row.samples.push({elapsed:0,state:cardEffectSnapshot(w)});row.status='immediate-effect';row.conditionalAcceptance='pending explicit effect-specific witness review';continue;}
  const seconds=cardEffectSeconds(c.data.effect),samples=new Set([1,30,60,120,300,600,1200,1500,1800,2100,2160,2400,2700,3000,3300,Math.round(seconds*60)]);row.seconds=seconds;
  for(let i=0;i<Math.round(seconds*60);i++){
   stepCardEffectFixture(w);w.step();for(const e of w.visualEvents)events.add(e.kind);
   if(samples.has(i+1))row.samples.push({elapsed:w.time-start,state:cardEffectSnapshot(w)});
   if(w.phase!=='battle'){row.failureState={snapshot:cardEffectSnapshot(w),entities:[...w.entities.values()]};throw Error('Card fixture ended at '+(w.time-start)+': '+w.phase);}
  }
  if(w.time-start<seconds-1e-7)throw Error('Simulation did not advance through requested cycle');
  row.status='cycle-simulated';row.eventKinds=[...events];row.conditionalAcceptance='pending explicit effect-specific witness review';
 }catch(e){row.status='failed';row.failure=String(e);}
 if(index%25===0){console.log(JSON.stringify({done:index+1,total:selected.length,failed:report.rows.filter(r=>r.status==='failed').length}));await fs.writeFile(output,JSON.stringify(report));}
}
report.complete=true;await fs.writeFile(output,JSON.stringify(report));console.log(JSON.stringify({done:report.rows.length,failed:report.rows.filter(r=>r.status==='failed').length}));
