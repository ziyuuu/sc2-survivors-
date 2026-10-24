import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {scenario,buy,lcg,type Case} from './lib/g02-fixtures.mts';
import {observeWorld} from '../src/simulation/observation';
import {commitStrategic} from '../src/simulation/combat/shop-support';
import {castTactical} from '../src/simulation/combat/unique-support';
const out='reports/local/g02-20261022',tag=process.env.G02_TAG??'r1',rows:any[]=[],skips:any[]=[],cases:Case[]=[];
for(const race of ['terran','zerg','protoss'] as const)for(const quality of [0,3,4,5] as const)for(const stage of [3,9,15])cases.push({race,quality,stage,seed:102202,targets:8});
// High-quality critical damage adds variance: repeat the late baseline and key equal-cost alternatives.
for(const race of ['terran','zerg','protoss'] as const)for(const seed of [102203,102204])cases.push({race,quality:5,stage:15,seed,targets:8});
// Single target and dense cluster are separate geometry cases, not natural occurrence claims.
for(const race of ['terran','zerg','protoss'] as const)for(const targets of [1,24])cases.push({race,quality:5,stage:15,seed:102202,targets});
const selected=process.env.G02_SMOKE?cases.slice(0,1):cases;
for(const c of selected){const ids=['none','team.firepower.white','team.firepower.blue','team.firepower.orange','support.'+c.race+'.strategic','support.'+c.race+'.bombardment','support.'+c.race+'.mutation',...(c.race==='terran'?['ricochet','bunker','missiles','overdrive']:c.race==='protoss'?['echo','prism']:[]).map(x=>'support.'+c.race+'.'+x)];
 for(const id of ids){const {w,family,gear,loadout,buildingWitness,members,rank}=scenario(c);const receipt=id==='none'?null:buy(w,id);if(id!=='none'&&!receipt){skips.push({...c,id,reason:'Not in current lawful pool for this family/stage'});continue;}w.phase='battle';w.random=lcg(c.seed);w.nextId=10000;
  const targets=[];for(let i=0;i<c.targets!;i++){const e=w.addUnit('roach','zerg',(i%6-2.5)*.8,3+Math.floor(i/6)*.8);e.hp=e.maxHp=1e8;e.armor=0;e.shield=e.maxShield=0;e.moveSpeed=0;e.weaponDamage=0;e.stoppedUntil=1e9;targets.push(e);}w.hash.rebuild(w.entities.values());
  const bySource:Record<string,number>={};observeWorld(w,(source,kind,amount)=>{if(kind==='damage')bySource[source]=(bySource[source]??0)+amount;});
  const initialPools=w.allies().reduce((n,u)=>n+u.maxHp+(u.maxShield??0),0);if(id.endsWith('.strategic'))assert.ok(commitStrategic(w,{x:0,z:4}));if(id.endsWith('.overdrive')||id.endsWith('.prism'))assert.ok(castTactical(w,{x:0,z:12}));
  while(w.time<30-1e-8&&w.phase==='battle')w.step();assert.ok(Math.abs(w.time-30)<1e-7,JSON.stringify({c,id,time:w.time,phase:w.phase}));
  const actual=Object.values(bySource).reduce((a,b)=>a+b,0);assert.ok(targets.every(t=>t.hp>0));rows.push({...c,id,family,members,rank,gear,loadout,buildingWitness,receipt,seconds:w.time,actualDamage:actual,dps:actual/w.time,bySource,initialPools,allyDeaths:members-w.allies().filter(u=>!u.temporary&&!u.summonKind).length,phase:w.phase});
 }
 await fs.writeFile(out+'/offense-'+tag+'.json',JSON.stringify({method:'Controlled 30s production World.step with native purchased card and same seed/roster/legal equipment and fixed target ID baseline 10000. Native zero-armor passive durable targets isolate output; no hero or enemy percent-HP mechanic. Common family follows an earlier I03 native paid building witness. Full native undiscounted prices; shelf placement is a fixture, not a probability claim. Geometry and high-gear repetitions are separate.',rows,skips},null,2));console.log(JSON.stringify({case:c,rows:rows.length,skips:skips.length}));
}
