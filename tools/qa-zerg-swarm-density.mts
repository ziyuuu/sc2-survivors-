import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {applySwarmCard} from '../src/simulation/progression/zerg-swarm-acquisition';
import {spawnSwarmEvent,swarmPart} from '../src/simulation/combat/zerg-swarm-spawn';
import {setDiagnosticHealthLock} from '../src/diagnostics/combat-lock';

for(const cap of [60,90]){
 const seed=17,w=new World({race:'zerg',difficulty:'normal',seed,terrain:campaignTerrain(chooseCampaignMap(seed)),obstacles:[]});
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());assert.ok(setDiagnosticHealthLock(w,true));
 w.missions.enabled=w.encounters.enabled=false;
 w.expedition.ledger=[];w.pods=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.stage=11;w.endStage();while(w.phase==='reward')assert.ok(w.skipReward());
 assert.equal(w.stage,12);
 assert.ok(applySwarmCard(w,'ZSW-W05'));
 if(cap===90)assert.ok(applySwarmCard(w,'ZSW-O03'));
 let peak=0,enemyPeak=0,experiencePeak=0,childrenPeak=0;
 const times:number[]=[];
 for(let i=0;i<2400;i++){
  if(i%60===0&&i<660){
   const a=i/60*2.399;
   const p={x:w.anchor.x+Math.sin(a)*7,z:w.anchor.z+Math.cos(a)*7};
   spawnSwarmEvent(w,'density',[swarmPart('zergling',9,7,40),swarmPart('swarm_host',2,7,40),swarmPart('brood_lord',2,7,40)],p);
  }
  const ms=performance.now();w.step();if(i>=180)times.push(performance.now()-ms);
  const live=[...w.entities.values()].filter(u=>u.hp>0);
  peak=Math.max(peak,live.filter(u=>u.zergSwarm).length);
  enemyPeak=Math.max(enemyPeak,live.filter(u=>u.owner==='zerg').length);
  experiencePeak=Math.max(experiencePeak,live.filter(u=>u.owner==='zerg'&&u.experience).length);
  childrenPeak=Math.max(childrenPeak,live.filter(u=>u.owner==='terran'&&u.zergSix?.temp).length);
 }
 assert.equal(peak,cap);assert.ok(enemyPeak>0&&experiencePeak>0&&childrenPeak>0);
 assert.ok(w.stats.damage>0);assert.equal(w.phase,'battle');
 const p95=times.sort((a,b)=>a-b)[Math.floor(.95*times.length)];
 console.log(JSON.stringify({seed,cap,peak,enemyPeak,experiencePeak,childrenPeak,damage:w.stats.damage,p95,simulated:w.time}));
}
