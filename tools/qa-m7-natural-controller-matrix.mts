import fs from 'node:fs';
import path from 'node:path';
import {survive} from './qa-expedition-survival.mts';
import type {Race} from '../src/data/races';

const seeds=[7,271,89241],races:Race[]=['terran','zerg','protoss'],controllers=['v5','v6','v7'] as const;
const results=[];
for(const race of races)for(const controller of controllers)for(const seed of seeds){
 const run=survive(race,'original',seed,controller,18);
 results.push({race,controller,seed,completed:run.completed,failedAt:run.phase==='lost'?run.stage:null,combatSeconds:run.seconds,phase:run.phase,issue:run.issue,kills:run.stats.kills,rescued:run.stats.rescued,peakBodies:run.peakBodies});
}
const out=path.resolve('reports/local/m7-natural-controller-matrix.json');
fs.mkdirSync(path.dirname(out),{recursive:true});
fs.writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),method:'Current 60Hz World, original campaign map, Normal, zero talents, public actions and input only. Controllers read more game state than the UI and are not human playability evidence.',seeds,controllers,results},null,2));
console.log(JSON.stringify({count:results.length,bestByRace:Object.fromEntries(races.map(race=>[race,Math.max(...results.filter(r=>r.race===race).map(r=>r.completed))])),complete18:results.filter(r=>r.completed===18).length,issues:results.filter(r=>r.issue)}));
