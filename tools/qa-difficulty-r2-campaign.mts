import fs from 'node:fs';
import path from 'node:path';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
import {difficultyLoadout} from './difficulty-r2-loadout';
import {validateItem} from '../src/simulation/starship/inventory';
import type {Difficulty} from '../src/data/stages';
const output=path.resolve('reports/local/difficulty-r2-implementation-20261016/campaigns');fs.mkdirSync(output,{recursive:true});
const difficulties:Difficulty[]=['easy','normal','hard','hell'],builds=BUILDS.filter(b=>['bio','entrench','shield'].includes(b.id));
const summaries=[];
for(const difficulty of difficulties)for(const build of builds){
 const quality=difficulty==='hard'?3:difficulty==='hell'?4:difficulty==='easy'?1:0,seed=529,account=difficultyLoadout(build.race,quality,seed),initialItems=structuredClone(account.items),map=chooseCampaignMap(seed);
 const w=new World({race:build.race,seed,difficulty,waves:true,terrain:campaignTerrain(map),endlessTerrain:new FlatTerrain(),equipmentAccount:account});w.configureCampaign(map);
 const controller=createCampaignController(w,build);controller.initialize();w.start();controller.configure();let nextThink=0,nextSample=0,peakEnemies=0,peakQueue=0,steps=0,issue:string|null=null,completed=0,wallStart=Date.now(),lastProgress=wallStart;
 const samples:unknown[]=[],deaths:unknown[]=[],stages:unknown[]=[];let lastStage='';
 try{while(steps<60*2400&&w.phase!=='lost'){
  if(Date.now()-lastProgress>30000){lastProgress=Date.now();console.log(JSON.stringify({progress:true,difficulty,race:build.race,time:w.time,stage:w.stage,endless:w.endless?.round,enemies:w.enemyCount(),queue:(w as any).ambientBacklog.length}));}
  controller.decisions();
  if(w.phase==='won'){completed=18;if(!w.chooseCampaignExit('endless'))throw Error('Endless exit refused');continue;}
  if(w.phase==='reward'){completed=Math.max(completed,w.stage);controller.intermission();continue;}
  if(w.phase==='endless-ready'){const p=w.previewEndlessTransition();if(!p)throw Error('Missing endless plan');const token=`${p.requestId}:${p.expectedRevision}:${p.mapHash}`;if(!w.registerEndlessReadyToken(token)||!w.commitEndlessTransition(p.requestId,p.expectedRevision,token))throw Error('Endless commit refused');continue;}
  if(w.endless&&w.endlessElapsed>=360)break;
  const key=w.endless?'endless:'+w.endless.round:'campaign:'+w.stage;if(key!==lastStage){lastStage=key;stages.push({key,time:w.time,wallet:{...w.wallet},allies:w.allies().length,enemies:w.enemyCount()});}
  if(w.time>=nextThink){controller.think();nextThink=w.time+.25;}
  const before=w.allies().map(u=>({id:u.id,type:u.unitType,hp:u.hp})),old=w.time;w.step();steps++;if(w.time===old)throw Error('Unresolved decision or pause');
  for(const u of before)if((w.entities.get(u.id)?.hp??0)<=0)deaths.push({...u,time:w.time,stage:w.stage});
  peakEnemies=Math.max(peakEnemies,w.enemyCount());peakQueue=Math.max(peakQueue,(w as any).ambientBacklog.length);if(peakEnemies>300)throw Error('Enemy admission above 300');
  if(w.time>=nextSample||w.phase==='lost'){nextSample=w.time+10;const enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0);samples.push({time:w.time,stage:w.stage,endless:w.endless?.round,allies:w.allies().length,enemies:enemies.length,tiers:[1,.3,.5].map(d=>enemies.filter(u=>u.enemySpawn?.density===d).length),queue:(w as any).ambientBacklog.length,wallet:{...w.wallet},kills:w.stats.kills,gearGround:Object.values(account.locations).filter(l=>l.kind==='ground').length});}
 }}catch(e){issue=String(e instanceof Error?e.stack:e);}
 const summary={difficulty,race:build.race,quality,seed,phase:w.phase,stage:w.stage,completed,time:w.time,endlessSeconds:w.endlessElapsed,peakEnemies,peakQueue,steps,issue,wallMs:Date.now()-wallStart};summaries.push(summary);
 fs.writeFileSync(path.join(output,`${difficulty}-${build.race}.json`),JSON.stringify({...summary,method:'Continuous native World, seed 529, existing visible-public controller, actual campaign terrain and production/economy; no health lock, one-hit, jump, cash injection or talents. Equipment assigned before start using valid quality/slots and 140 scores. Diagnostic bot, not human win-rate evidence.',validEquipment:Object.values(initialItems).every(validateItem),initialItems,stages,samples,deaths,events:controller.events,stats:w.stats,wallet:w.wallet},null,2));console.log(JSON.stringify(summary));
 fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({summaries},null,2));
}
if(summaries.some(r=>r.issue))process.exitCode=1;
