import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {stats} from './performance-a02-stats.mjs';
const variant=process.argv[2]??'baseline';
const lib=await import(`../reports/local/performance-a02-20261020/${variant}-probe/main.mjs`);
const probe=globalThis.__A02Stats=stats(),rows=[];
function make(race){
 const w=new lib.World({race,seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:lib.newEquipmentAccount(529)});assert.ok(w.start());
 w.wallet={minerals:10000,gas:10000};w.pods=[];w.expedition.ledger=[];
 return w;
}
function record(name,w,fn){
 probe.start();const at=performance.now(),result=fn(),ms=performance.now()-at,data=probe.stop();
 rows.push({name,race:w.expedition.race,time:w.time,tick:w.tick,phase:w.phase,round:w.rewardRound,ms,counts:{entities:w.entities.size,heroes:w.heroes.size,offers:w.rewards.length,drops:w.rewardDrops.length},...data,result:typeof result==='boolean'?result:null});return result;
}
for(const race of ['terran','zerg','protoss']){
 const w=make(race);
 record('ordinary-300-deaths',w,()=>{for(let i=0;i<300;i++){const e=w.addUnit('zergling','zerg',5,5);w.hit(e,1e9,[],1,'terran',0,1);}return w.rewardDrops.length;});
 const enemy=w.addUnit('roach','zerg',5,5);enemy.enemyTier='boss';
 record('boss-death',w,()=>w.hit(enemy,1e9,[],1,'terran',0,1));
 const drop=w.rewardDrops.find(d=>d.bossLootReceipt);
 if(drop)record('boss-collect',w,()=>lib.collectBossLoot(w,drop));
 record('intermission',w,()=>w.endStage());
 if(w.rewardRound==='building')record('open-shop',w,()=>w.skipReward());
 record('check-visible-offers',w,()=>w.rewards.map(r=>w.canChooseReward(r)));
 record('shop-reroll',w,()=>w.reroll());
 const reward=w.rewards.find(r=>w.canChooseReward(r)&&r.expeditionEffect?.kind==='teamCard');
 if(reward)record('shop-purchase',w,()=>w.choose(reward.offerId));
 record('finish-shop',w,()=>w.skipReward());
}
const local=[];
for(const race of ['terran','zerg','protoss'])for(const n of [0,300]){
 const w=make(race);for(let i=0;i<n;i++)w.addUnit('zergling','zerg',5,5);
 for(const name of ['context','boss','equipment']){
  const f=name==='context'?()=>lib.draftContext(w):name==='boss'?()=>lib.drawBossLoot(lib.draftContext(w),'A02'):()=>lib.drawEquipmentUnitLoot(lib.draftContext(w),'A02');
  probe.start();for(let i=0;i<30;i++)f();const data=probe.stop();
  local.push({race,n,name,...data});
 }
}
const report={scope:'Current production operations with diagnostic timers. Ordinary/Boss kills and shop actions are controlled World calls, not natural campaign or frame FPS. Timings include probe overhead; separate uninstrumented alternating measurements required for candidate claims.',variant,rows,local};
await fs.writeFile(`reports/local/performance-a02-20261020/reward-probe-${variant}.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({rows:rows.map(r=>({name:r.name,race:r.race,ms:r.ms,calls:Object.fromEntries(Object.entries(r.rows).map(([k,v])=>[k,v.calls]))})),local:local.map(r=>({race:r.race,n:r.n,name:r.name,contextMs:r.rows['reward.context']?.totalMs/30,totalPoolMs:r.rows['reward.fullPool']?.totalMs/30}))}));
