import fs from 'node:fs/promises';
import {World} from '../src/simulation/world';
import {PlayPolicy} from './play-policy';
import {TERRAN} from '../src/data/sc2-units';
const report:any={date:new Date().toISOString(),method:'Actual fixed-step World; controller sends movement, dash, card purchase/skip/reroll. No injected HP, resource, kills, stage skips or guaranteed offers. Automated controller is not human skill evidence.',runs:[]};
for(const difficulty of ['easy','normal'] as const)for(const style of ['careful','wasteful','idle'] as const)for(const seed of (style==='careful'?[89241,271828,1776]:[89241])){
 const w=new World({difficulty,seed}),policy=new PlayPolicy(style),rows:any[]=[];w.start();let stage=1,maxStretch=0;
 while(w.phase==='battle'||w.phase==='reward'){
  if(w.phase==='reward'){rows.push({stage:w.stage,time:w.time,stats:{...w.stats},wallet:{...w.wallet},scvs:w.scvs,roster:TERRAN.map(t=>w.allies().filter(u=>u.unitType===t).map(u=>({rank:u.rank,hp:Math.round(u.hp)}))),maxStretch});maxStretch=0;}
  policy.update(w);w.step();maxStretch=Math.max(maxStretch,w.maxStretch);if(w.time>2890)throw Error('Campaign exceeded configured time');
 }
 const row={difficulty,style,seed,phase:w.phase,stage:w.stage,time:w.time,stats:w.stats,scvs:w.scvs,wallet:w.wallet,ledger:w.economyTotals,choices:policy.choices,rows};report.runs.push(row);console.log(difficulty,style,seed,w.phase,'stage',w.stage,'time',w.time.toFixed(1),'rescued',w.stats.rescued,'scvs',w.scvs);await fs.writeFile('reports/local/v4-campaign.json',JSON.stringify(report,null,2));
}
