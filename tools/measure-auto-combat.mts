import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {World} from '../src/simulation/world';
import type {UnitType} from '../src/data/sc2-units';
import {tacticsDiagnostics} from '../src/simulation/combat/tactics/planner';
import {approachSearches} from '../src/simulation/movement/melee-approach';
import {campaign18Schedule} from '../src/data/campaign18';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
const Constructor=process.argv.includes('--baseline')?(await import('../reports/local/auto-combat-20261106/baseline-src/simulation/world')).World:World;
const Terrain=process.argv.includes('--baseline')?(await import('../reports/local/auto-combat-20261106/baseline-src/simulation/movement/flat-terrain')).FlatTerrain:FlatTerrain;
const rows=[];
for(const scene of (process.argv.includes('--campaign')?['first','endless4']:['mixed']))for(const race of ['terran','zerg','protoss'] as const){
 const samples:number[]=[],runs=[];
 for(let repeat=0;repeat<3;repeat++){
  const w:World=new Constructor({race,waves:scene!=='mixed',sandbox:true,terrain:scene==='mixed'?false:new Terrain(),endlessTerrain:new Terrain(),obstacles:[],seed:619});w.start();
  if(scene==='endless4'){
   w.stage=18;w.prepareStage();w.hive!.hp=0;const boss=(w as any).spawnCampaignSpecial(campaign18Schedule((w as any).config,619).specials[0]);w.hit(boss,1e12,[],1,'terran');w.stageElapsed=w.duration;w.endStage();w.chooseCampaignExit('endless');while(w.phase==='reward')w.skipReward();const p=w.previewEndlessTransition()!,token=p.requestId+':'+p.expectedRevision+':'+p.mapHash;w.registerEndlessReadyToken(token);w.commitEndlessTransition(p.requestId,p.expectedRevision,token);
   for(let r=1;r<4;r++){w.time=w.stageStartedAt+w.duration;w.tick=Math.round(w.time*60);w.stageElapsed=w.duration;w.endStage();while(w.phase==='reward')w.skipReward();}
  }
  if(scene==='mixed'){w.entities.clear();w.anchor.x=w.anchor.z=0;}
  const types:UnitType[]=race==='terran'?['marine','marauder','hellion','tank']:race==='zerg'?['zergling','roach','hydralisk','lurker']:['zealot','stalker','immortal','colossus'];
  if(scene!=='first')for(let i=0;i<24;i++)w.addUnit(types[i%4],'terran',w.anchor.x-4+(i%6)*1.3,w.anchor.z-4+Math.floor(i/6)*1.3);
  if(scene==='mixed')for(let i=0;i<48;i++){const e=w.addUnit(i%6===0?'baneling':i%3===0?'hydralisk':'roach','zerg',4+i%8, -4+Math.floor(i/8)*1.5);e.hp=e.maxHp=10000;}
  let decisions=0,decisionMs=0,paths=0,idle=0;const find=w.findTarget.bind(w);w.findTarget=(...args)=>{const start=performance.now();const result=find(...args);decisionMs+=performance.now()-start;decisions++;return result;};
  for(let tick=0;tick<(scene==='mixed'?360:1200);tick++){const start=performance.now();w.step();if(tick>=60)samples.push(performance.now()-start);if(Constructor===World)paths+=approachSearches(w);idle+=w.allies().filter(u=>u.action==='idle').length;}
  runs.push({shots:w.stats.shots,damage:w.stats.damage,alive:w.allies().length,decisions,decisionMs,paths:Constructor===World?paths:null,idleUnitSteps:idle,switches:Constructor===World?tacticsDiagnostics(w).switches:null});
 }
 samples.sort((a,b)=>a-b);rows.push({scene,race,p50:samples[Math.floor(samples.length*.5)],p95:samples[Math.floor(samples.length*.95)],runs});
}
const file=process.argv[2]??'reports/local/auto-combat-20261106/measurement.json';fs.writeFileSync(file,JSON.stringify({steps:process.argv.includes('--campaign')?1200:360,repeats:3,rows},null,2));console.log(JSON.stringify(rows));
