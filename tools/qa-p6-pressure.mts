import fs from 'node:fs/promises';import assert from 'node:assert/strict';import os from 'node:os';
import {World} from '../src/simulation/world';import {FAMILIES_BY_RACE,type Race} from '../src/data/races';import {HERO_IDS_BY_RACE} from '../src/data/heroes';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';import {initializeCarrierSubsystem} from '../src/simulation/combat/carriers';
const report:any={at:new Date().toISOString(),method:'Separate synthetic CPU-only pressure. Manually constructed35 ordinary bodies/three heroes,100 or300 initial enemies, explicit diagnostic player health lock,600 fixed steps. No rendered FPS or natural-campaign claim.',cpu:os.cpus()[0]?.model,runs:[]};
for(const race of ['terran','zerg','protoss'] as Race[])for(const enemies of [100,300]){
 const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10607});w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.expedition.ledger=[];w.expedition.zerglingPairs=[];w.wallet={minerals:0,gas:0};w.stage=16;setDiagnosticHealthLock(w,true);
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const families=FAMILIES_BY_RACE[race].slice(-5);w.expedition.familySlots=[...families];
 for(const [j,f]of families.entries())for(let i=0;i<7;i++)w.addUnit(f,'terran',w.anchor.x+j*1.2,w.anchor.z+i,5);
 for(const hero of HERO_IDS_BY_RACE[race].slice(-3))assert.ok(w.acquireHero(hero));initializeCarrierSubsystem(w);
 for(let i=0;i<enemies;i++){const a=i*2.399,r=6+Math.floor(i/30);w.addUnit(i%10===0?'baneling':i%3===0?'roach':'zergling','zerg',w.anchor.x+Math.sin(a)*r,w.anchor.z+Math.cos(a)*r);}
 w.hash.rebuild(w.entities.values());const times=[],begin=w.time,initialBodies=w.allies().length;let peakEnemies=0;
 for(let i=0;i<600;i++){const t=performance.now();w.step();times.push(performance.now()-t);peakEnemies=Math.max(peakEnemies,w.enemyCount());}
 times.sort((a,b)=>a-b);assert.equal(w.tick,600);assert.ok([...w.entities.values()].every(u=>[u.hp,u.maxHp,u.x,u.z].every(Number.isFinite)));
 report.runs.push({race,initialEnemies:enemies,initialBodies,peakEnemies,finalEntities:w.entities.size,steps:600,combatSeconds:w.time-begin,p50StepMs:times[300],p95StepMs:times[570],p99StepMs:times[594],maxStepMs:times.at(-1),kills:w.stats.kills,finite:true});console.log(JSON.stringify(report.runs.at(-1)));
}
await fs.writeFile('reports/local/p6-20261006/pressure.json',JSON.stringify(report,null,2));
