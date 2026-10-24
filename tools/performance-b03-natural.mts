import fs from 'node:fs/promises';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
import {difficultyLoadout} from './difficulty-r2-loadout';
import {validateItem} from '../src/simulation/starship/inventory';
import {selectRunData} from '../src/simulation/persistence/run-fields';
const run=process.env.SC2_B03_RUN??'natural-1',root=`reports/local/performance-b03-20261019/${run}`;
await fs.mkdir(root,{recursive:true});
const seed=529,build=BUILDS.find(b=>b.id==='bio')!,account=difficultyLoadout('terran',1,seed),map=chooseCampaignMap(seed);
const w=new World({race:'terran',seed,difficulty:'easy',waves:true,terrain:campaignTerrain(map),endlessTerrain:new FlatTerrain(),equipmentAccount:account});w.configureCampaign(map);
const controller=createCampaignController(w,build);controller.initialize();w.start();controller.configure();
const started=performance.now(),report:any={run,build:JSON.parse(await fs.readFile('reports/local/performance-b03-20261019/logic-build/build-inputs.json','utf8')),method:'Native World fixed-step replay; easy terran bio seed529, legal quality1 gear assigned before start, real production/economy, no health lock/jump/cash injection. Logic timing only, not browser FPS or human natural-play acceptance.',map,initialItems:structuredClone(account.items),validEquipment:Object.values(account.items).every(validateItem),samples:[],checkpoints:[],peaks:{enemies:0,queue:0,mineral:0,gas:0,pickups:0,equipmentGround:0,backpack:0,ledger:0,receipts:0},stages:[],errors:[]};
let nextThink=0,nextSample=0,nextProgress=30,steps=0,completed=0,lastStage='';const recorded=new Set<string>();
const counts=()=>{let mineral=0,gas=0;for(const p of w.pickups){if(p.minerals>0)mineral++;if(p.gas>0)gas++;}const loc=Object.values(account.locations);return {time:w.time,tick:w.tick,stage:w.stage,endless:w.endless?.round,endlessElapsed:w.endlessElapsed,phase:w.phase,allies:w.allies().length,enemies:w.enemyCount(),queue:(w as any).ambientBacklog.length,mineral,gas,pickups:w.pickups.length,equipmentGround:loc.filter(l=>l.kind==='ground').length,backpack:loc.filter(l=>l.kind==='backpack').length,ledger:w.expedition.ledger.length,receipts:account.run?.receipts.size??0,history:w.expedition.draftHistory.length,entities:w.entities.size,kills:w.stats.kills,wallet:{...w.wallet},heap:process.memoryUsage().heapUsed};};
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
async function checkpoint(label:string){const snapshot=JSON.stringify({run:selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account},(_k,v)=>v instanceof Map?{__map:[...v]}:v instanceof Set?{__set:[...v]}:v);await fs.writeFile(root+'/'+label+'.state.json',snapshot);report.checkpoints.push({label,...counts(),sha256:createHash('sha256').update(snapshot).digest('hex')});await save();}
try{
 while(steps<60*2700&&w.phase!=='lost'){
  const wall=(performance.now()-started)/1000;if(wall>=nextProgress){nextProgress=wall+30;console.log(JSON.stringify({progress:run,...counts()}));}
  controller.decisions();
  if(w.phase==='won'){completed=18;await checkpoint('campaign-18-ended');if(!w.chooseCampaignExit('endless'))throw Error('Endless refused');continue;}
  if(w.phase==='reward'){completed=Math.max(completed,w.stage);controller.intermission();continue;}
  if(w.phase==='endless-ready'){const p=w.previewEndlessTransition();if(!p)throw Error('Missing endless plan');const token=`${p.requestId}:${p.expectedRevision}:${p.mapHash}`;if(!w.registerEndlessReadyToken(token)||!w.commitEndlessTransition(p.requestId,p.expectedRevision,token))throw Error('Endless commit refused');continue;}
  for(const n of [6,12])if(w.endless&&w.endlessElapsed>=n*60&&!recorded.has('endless-'+n)){recorded.add('endless-'+n);await checkpoint('endless-'+n);}
  if(w.endless&&w.endlessElapsed>=720)break;
  const key=w.endless?'endless:'+w.endless.round:'campaign:'+w.stage;if(key!==lastStage){lastStage=key;report.stages.push({key,...counts()});}
  if(w.time>=nextThink){controller.think();nextThink=w.time+.25;}
  const old=w.tick;w.step();steps++;if(w.tick===old)throw Error('Native step stopped');
  const c=counts();for(const key of Object.keys(report.peaks))report.peaks[key]=Math.max(report.peaks[key],c[key]??0);if(c.enemies>300)throw Error('Enemy cap exceeded');
  if(w.time>=nextSample){nextSample=w.time+10;report.samples.push(c);}
 }
 report.completed=completed;report.final=counts();report.wallMs=performance.now()-started;report.steps=steps;report.events=controller.events;report.passed=completed===18&&w.endlessElapsed>=720;await checkpoint('final');
}catch(e){report.errors.push(String(e instanceof Error?e.stack:e));report.passed=false;}
await save();console.log(JSON.stringify({run,passed:report.passed,completed,final:report.final,peaks:report.peaks,errors:report.errors}));if(!report.passed)process.exitCode=1;
