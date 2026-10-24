import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {scenario,buy,oldCards} from './lib/g02-fixtures.mts';
const rows:any[]=[];
for(const race of ['terran','zerg','protoss'] as const)for(const quality of [0,3,5] as const){
 const ids=Object.keys(oldCards).filter(id=>id.startsWith('team.')||id.startsWith('support.'+race+'.'));
 for(const id of ids){const {w}=scenario({race,quality,stage:9,seed:102202,members:1,rank:3}),receipts=[];for(let n=0;n<3;n++){const r=buy(w,id);assert.ok(r,id);receipts.push(r);}const wallet={...w.wallet};if(!id.endsWith('.strategic')){assert.equal(buy(w,id),null,id);assert.deepEqual(w.wallet,wallet);}
  const state=()=>({cards:structuredClone(w.expedition.cardTotals),support:structuredClone(w.expedition.support.levels),unique:structuredClone(w.expedition.support.unique.levels),ammo:w.expedition.support.ammo,wallet:{...w.wallet}}),before=state();assert.ok(w.skipReward());assert.equal(w.stage,10);assert.equal(w.phase,'battle');assert.deepEqual(state(),before,id);rows.push({race,quality,id,receipts,before,after:state(),stage:w.stage});
 }
}
await fs.writeFile('reports/local/g02-20261022/stacking-r1.json',JSON.stringify({method:'Native undiscounted purchases, three stacks, fourth capped rejection (strategic ammunition intentionally uncapped), then actual skipReward / nextStage transition. No synthetic save or natural shop appearance claim.',rows},null,2));console.log(JSON.stringify({rows:rows.length}));
