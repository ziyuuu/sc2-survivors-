import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {validateItem} from '../src/simulation/starship/inventory';
import {equipmentTemplate} from '../src/simulation/starship/catalog';
import {selectEquipmentEffects} from '../src/simulation/starship/selection';
import {CAMPAIGN_QUANTITY,CAMPAIGN_WAVES,continuousOrdinaryGrowth,continuousMainHiveHp} from '../src/data/enemy-tuning';

const dir='reports/local/g03-tier-balance-20261023';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const slots=['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'];
const round=(x:number)=>Math.round(x*100)/100;
const summarizeFile=(file:string)=>{
 const r=read(file),opening=Object.values(r.opening.equipped[r.race]).map((id:any)=>r.opening.items[id]);
 assert.equal(opening.length,12,r.id);assert.ok(opening.every((i:any)=>validateItem(i)),r.id);
 assert.deepEqual(slots.map(s=>r.opening.items[r.opening.equipped[r.race][s]].quality),r.spec.qs,r.id);
 const qualities=(ids:any,items:any)=>slots.reduce((o:any,s)=>{const q=items[ids[s]]?.quality??'missing';o[q]=(o[q]??0)+1;return o;},{});
 const effects=selectEquipmentEffects(opening as any).map(e=>({key:e.key,values:e.values,binding:e.binding,source:e.source}));
 const ends=r.stages.filter((s:any)=>s.phase==='reward');
 const repairs=r.policy.events.filter((e:any)=>e.kind==='repair'&&e.data?.ok),revives=r.policy.events.filter((e:any)=>e.kind==='revive'&&e.data?.ok);
 const combatDeaths=r.deathRows.filter((d:any)=>!d.special),specialDeaths=r.deathRows.filter((d:any)=>d.special);
 const replaced=slots.filter(s=>r.final.gear[s]!==r.opening.equipped[r.race][s]);
 return {id:r.id,file,sha256:sha(file),race:r.race,difficulty:r.spec.difficulty,tier:r.spec.tier,seed:r.seed,stop:r.stop,stage:r.stage,issue:r.issue,
  runtime:file.includes('/objective-firepower/')?'objective-firepower':file.includes('/objective-priority/')?'objective-priority':file.includes('/behemoth-fixed/')?'behemoth-fixed':r.runtimeBinding?'final-entry-and-exit':'entry-only-exploratory',runtimeBinding:r.runtimeBinding??null,
  opening:{qualityCounts:qualities(r.opening.equipped[r.race],r.opening.items),slots:opening.map((i:any)=>({slot:i.slot,template:i.template,name:equipmentTemplate(i.template).name,binding:i.binding,quality:i.quality,affixes:i.affixes,inherited:i.inherited})),effects,heroes:r.stages[0].heroes,allies:r.stages[0].allies.length},
  final:{notice:r.final.notice??null,expansionHives:r.final.expansionHives??null,reinforcementReceipts:r.final.ledger?.flatMap((j:any)=>j.passengers).reduce((o:any,p:any)=>(o[p.status]=(o[p.status]??0)+1,o),{})??null,wallet:r.final.wallet,allies:r.final.allies.length,heroes:r.final.heroes,qualityCounts:qualities(r.final.gear,r.finalAccount.items),replacedSlots:replaced},
  deaths:{measurement:r.deathMeasurement??'Sampled every 15 frames; unique IDs; lower bound only.',events:r.deathRows.length,uniqueIds:new Set(r.deathRows.map((d:any)=>d.id)).size,combat:combatDeaths.length,special:specialDeaths.length,heroes:r.deathRows.filter((d:any)=>d.hero).length,byStage:r.deathRows.reduce((o:any,d:any)=>(o[d.stage]=(o[d.stage]??0)+1,o),{})},
  recovery:{paidRepairs:repairs.length,minerals:round(repairs.reduce((s:number,e:any)=>s+(e.data.quote.minerals??0),0)),gas:round(repairs.reduce((s:number,e:any)=>s+(e.data.quote.gas??0),0)),paidHeroRevives:revives.length},
  rewardSnapshots:{count:ends.length,lowestLiving:ends.length?Math.min(...ends.map((s:any)=>s.allies.length)):null,lowestMeanHpFraction:ends.length?round(Math.min(...ends.map((s:any)=>s.allies.length?s.allies.reduce((v:number,u:any)=>v+u.hp/u.maxHp,0)/s.allies.length:0))):null},
  specials:r.specials,outsideCrossing:r.specials.filter((s:any)=>s.kind==='crossing'&&s.outside.length),policy:r.policy.name,objectiveCalls:r.policy.objectiveCalls??null,policyDetails:{crossing:r.policy.crossing,equipment:r.policy.equipment},steps:r.steps,wallSeconds:r.wallSeconds};
};
const rows=fs.readdirSync(dir).filter(n=>/^(terran|zerg|protoss)-.*-\d+\.json$/.test(n)).sort().map(n=>summarizeFile(dir+'/'+n));
const supportReruns=fs.readdirSync(dir+'/behemoth-fixed').filter(n=>/^(terran|zerg|protoss)-.*-\d+\.json$/.test(n)).sort().map(n=>summarizeFile(dir+'/behemoth-fixed/'+n));
const objectiveReruns=fs.readdirSync(dir+'/objective-priority').filter(n=>/^(terran|zerg|protoss)-.*-\d+\.json$/.test(n)).sort().map(n=>summarizeFile(dir+'/objective-priority/'+n));
const firepowerReruns=fs.readdirSync(dir+'/objective-firepower').filter(n=>/^(terran|zerg|protoss)-.*-\d+\.json$/.test(n)).sort().map(n=>summarizeFile(dir+'/objective-firepower/'+n));
const groups:any[]=[];
for(const r of rows){let g=groups.find(g=>g.runtime===r.runtime&&g.difficulty===r.difficulty&&g.tier===r.tier);if(!g){g={runtime:r.runtime,difficulty:r.difficulty,tier:r.tier,total:0,entered:0,lost:0,censored:0,error:0,rows:[]};groups.push(g);}g.total++;g[r.stop==='entered-endless'?'entered':r.stop==='lost'?'lost':r.stop==='error'?'error':'censored']++;g.rows.push(r.id);}
const pressure={file:'src/data/enemy-tuning.ts',sha256:sha('src/data/enemy-tuning.ts'),curves:[0,1/3,2/3,1].map(progress=>({progress,hard:continuousOrdinaryGrowth('hard',progress),hell:continuousOrdinaryGrowth('hell',progress),mainHive:{hard:continuousMainHiveHp('hard',progress),hell:continuousMainHiveHp('hell',progress)}})),quantity:{hard:CAMPAIGN_QUANTITY.hard,hell:CAMPAIGN_QUANTITY.hell},waves:{hard:CAMPAIGN_WAVES.hard,hell:CAMPAIGN_WAVES.hell}};
const summary={firepowerReruns,firepowerRerunsExpected:6,firepowerRerunsComplete:firepowerReruns.length===6,objectiveReruns,objectiveRerunsExpected:12,objectiveRerunsComplete:objectiveReruns.length===12,supportReruns,supportRerunsExpected:6,supportRerunsComplete:supportReruns.length===6,date:'2026-10-23',count:rows.length,expected:84,complete:rows.length===84,groups,pressure,rows,limits:['Seed 529 has 36 exploratory rows from entry-only runtime. Final runtime rows are reported separately.','Deaths from exploratory rows are sampled lower bounds, not exact or comparable to final native callback event counts.','Final native death events include repeat hero deaths after revival; they are not permanent roster losses.','Loadouts are legal pre-equipped candidates, not proven global optimum or natural acquisition duration.','Native loot and attribute replacement are permitted; final quality and replaced slots are recorded.','Automated combat priority and public actions are not a human skill certification or player win-rate estimate.','Reward snapshots do not measure minimum HP during combat. Passing 18 stages is not itself evidence of effortless completion.','No new game balance numbers, probabilities, camera/input changes, build, GPU test, FPS result or publication.']};
fs.writeFileSync(dir+'/summary.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify({count:summary.count,expected:summary.expected,groups,errors:rows.filter(r=>r.issue).map(r=>({id:r.id,issue:r.issue})),outsideCrossing:rows.filter(r=>r.outsideCrossing.length).map(r=>r.id)},null,2));
