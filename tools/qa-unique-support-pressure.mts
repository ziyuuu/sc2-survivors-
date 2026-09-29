import {World} from '../src/simulation/world';
import {buySupport} from '../src/simulation/combat/shop-support';
import {UNIQUE_SUPPORT,tacticalCard} from '../src/data/unique-support';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';
import fs from 'node:fs/promises';
const results=[];
for(const race of ['terran','zerg','protoss'] as const){const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.stage=16;setDiagnosticHealthLock(w,true);w.wallet={minerals:0,gas:0};for(const p of Object.values(w.expedition.production))p.enabled={};
 for(const [j,f] of FAMILIES_BY_RACE[race].slice(0,5).entries())for(let i=0;i<5;i++)w.addUnit(f,'terran',w.anchor.x+j,w.anchor.z+i,5);
 for(let i=0;i<300;i++){const a=i*2.399,r=5+Math.floor(i/30);w.addUnit(i%10===0?'baneling':i%3===0?'roach':'zergling','zerg',w.anchor.x+Math.sin(a)*r,w.anchor.z+Math.cos(a)*r);}
 for(const [id,d] of Object.entries(UNIQUE_SUPPORT))if(d.race===race)for(let i=0;i<3;i++)buySupport(w,id as keyof typeof UNIQUE_SUPPORT);for(const id of ['mines','bombardment','mutation','strategic'] as const)for(let i=0;i<3;i++)buySupport(w,id);
 w.castTactical(race==='protoss'?{x:w.anchor.x+10,z:w.anchor.z}:undefined);const times=[];for(let i=0;i<600;i++){const t=performance.now();w.step();times.push(performance.now()-t);}
 times.sort((a,b)=>a-b);const snapshot=w.captureRun();const clone=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});clone.restoreRun(snapshot);if([...w.entities.values()].some(u=>![u.hp,u.x,u.z].every(Number.isFinite)))throw Error('non-finite combat state');
 results.push({race,diagnostic:'300 initial enemies, all unique cards rank3, health lock, 600 real fixed steps; CPU only, not natural play or 60FPS acceptance',time:w.time,phase:w.phase,entities:w.entities.size,kills:w.stats.kills,packets:w.expedition.support.unique.packets.length,orbs:w.expedition.support.unique.orbs.length,p95StepMs:times[Math.floor(times.length*.95)],p99StepMs:times[Math.floor(times.length*.99)],maxStepMs:times.at(-1),snapshotValidated:true});}
await fs.mkdir('reports/local/race-fun-pressure',{recursive:true});await fs.writeFile('reports/local/race-fun-pressure/report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results));
