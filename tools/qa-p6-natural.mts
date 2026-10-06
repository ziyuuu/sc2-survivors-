import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {World} from '../src/simulation/world';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS,allocationPoints,allocationCost,validateTalentAllocation} from '../src/data/mvp-talents';

import {BUILDS,observe,createCampaignController} from './qa-p6-controller';
export {BUILDS,observe};
const round=(n:number)=>Math.round(n*100)/100;
export function campaign(build:typeof BUILDS[number],seed:number,out:string){
 const recipe=chooseCampaignMap(seed);
 const difficulty=(process.argv.includes('--difficulty')?process.argv[process.argv.indexOf('--difficulty')+1]:'normal') as import('../src/data/stages').Difficulty;assert.ok(['easy','normal','hard','hell'].includes(difficulty));
 const points=process.argv.includes('--talents')?Number(process.argv[process.argv.indexOf('--talents')+1]):0;assert.ok([0,41,80].includes(points));
 const profile=new PermanentProfile(),levels:Record<string,number>={};
 if(points){for(const node of MVP_TALENTS.filter(n=>n.race===build.race)){
  const index=Number(node.id.slice(-2));if(node.line==='soldiers'||points===80&&node.line==='army'&&(index<=14||index===16))levels[node.id]=node.line==='army'&&index===16?1:node.maxRank;
 }assert.equal(validateTalentAllocation(build.race,levels),null);assert.equal(allocationPoints(levels),points);assert.ok(profile.award('p6-approved-profile-fixture',allocationCost(levels),build.race));const quote=profile.previewTalentAllocation(build.race,0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));}
 const w=new World({race:build.race,seed,difficulty,permanentProfile:profile,waves:true,terrain:campaignTerrain(recipe),endlessTerrain:new FlatTerrain(),obstacles:[]});
 const resume=process.argv.includes('--resume')?process.argv[process.argv.indexOf('--resume')+1]:null;
 if(!resume)assert.ok(w.configureCampaign(chooseCampaignMap(seed)));
 let completedActions=0;
 if(resume){const bundle=readArchive(fs.readFileSync(resume,'utf8')).bundle;assert.ok(bundle.run);assert.equal(bundle.run.config.race,build.race);assert.equal(bundle.run.seed,seed);w.restoreRun(bundle.run);w.paused=false;const historyPath=path.resolve(path.dirname(resume),'..',`${build.id}-${seed}.json`);if(fs.existsSync(historyPath)){const history=JSON.parse(fs.readFileSync(historyPath,'utf8'));completedActions=history.events.filter((e:any)=>e.kind==='development'&&e.time<=w.time).length;}}
 if(process.argv.includes('--health-lock')||process.argv.includes('--one-hit'))throw Error('P6 natural runner forbids combat diagnostic grants');const oneHit=false,locked=false;
 const s=w.expedition,samples:unknown[]=[],checkpoints:string[]=[],deaths:unknown[]=[];
 let lastProgress=Date.now(),nextThink=0,nextSample=0,completed=0,peakBodies=0,peakEnemies=0,issue:string|null=null,steps=0;
 const save=()=>{const key=w.endless?'endless':String(w.stage);if(!['1','4','7','10','13','16','endless'].includes(key)||checkpoints.includes(key))return;fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,`${build.id}-${seed}-stage-${key}.json`),writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));const archivePath=path.join(out,`${build.id}-${seed}-stage-${key}.json`);fs.writeFileSync(archivePath+'.provenance.json',JSON.stringify({race:build.race,build:build.id,seed,stage:w.stage,mode:w.endless?'endless':'campaign',controller:'visible-public-v9',diagnosticHealthLock:locked,diagnosticOneHit:oneHit,talentPoints:points,profileOrigin:points?'approved allocation fixture, not earned in this run':'empty natural starting profile',sourceRules:w.runConfig?.rulesId,mapHash:w.terrain?.definition?.source.sha256,historyHash:createHash('sha256').update(JSON.stringify(controller.events)).digest('hex'),archiveHash:createHash('sha256').update(fs.readFileSync(archivePath)).digest('hex'),path:archivePath},null,2));checkpoints.push(key);};
 const stopAt=process.argv.includes('--combat-seconds')?w.time+Number(process.argv[process.argv.indexOf('--combat-seconds')+1]):Infinity;
 const controller=createCampaignController(w,build,save,{completedActions});
 const {configure,think,decisions,intermission}=controller;
 w.setDevelopmentTarget(build.actions[completedActions]);if(!resume)w.start();configure();save();
 try{while(w.phase!=='lost'&&steps<60*2400){
  if(Date.now()-lastProgress>30000){lastProgress=Date.now();console.log(JSON.stringify({progress:true,build:build.id,difficulty,stage:w.stage,time:round(w.time),phase:w.phase,endless:w.endless?.round}));}
  if(w.time>=stopAt)break;
  decisions();if(w.phase==='won'){completed=18;assert.ok(w.chooseCampaignExit('endless'));continue;}
  if(w.phase==='reward'){intermission();completed=controller.completed;continue;}
  if(w.phase==='endless-ready'){const p=w.previewEndlessTransition();assert.ok(p);const token=`${p.requestId}:${p.expectedRevision}:${p.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(p.requestId,p.expectedRevision,token));save();continue;}
  if(w.endless&&w.endlessElapsed>=300)break;
  if(w.time>=nextThink){think();nextThink=w.time+.25;}const before=w.allies().map(u=>({id:u.id,family:u.unitType,hp:u.hp}));const oldTime=w.time;w.step();steps++;if(w.time===oldTime)throw Error('Unresolved paused player decision');
  for(const u of before)if((w.entities.get(u.id)?.hp??0)<=0)deaths.push({stage:w.stage,time:round(w.time),...u});peakBodies=Math.max(peakBodies,w.allies().length);peakEnemies=Math.max(peakEnemies,w.enemyCount());if(peakEnemies>300)throw Error("Enemy admission exceeded 300");
  if(w.time>=nextSample||w.phase==='lost'){nextSample=w.time+10;const o=observe(w);samples.push({stage:w.stage,time:round(w.time),wallet:{...w.wallet},anchor:{...w.anchor},army:o.allies.map(u=>({id:u.id,family:u.unitType,rank:u.rank,hp:round(u.hp),maxHp:round(u.maxHp),x:round(u.x),z:round(u.z)})),visibleEnemies:o.enemies.map(u=>({id:u.id,family:u.unitType,hp:round(u.hp),x:round(u.x),z:round(u.z)})),pods:w.pods.map(p=>({id:p.id,status:p.status,hp:round(p.hp),x:round(p.x),z:round(p.z)})),workers:w.workers,kills:w.stats.kills});}
 }}catch(e){issue=e instanceof Error?e.stack??e.message:String(e);}
 assert.equal(w.runConfig?.frozenTalents.allocated,points);
 return {resume,difficulty,talentPoints:points,frozenTalents:w.runConfig?.frozenTalents,diagnosticHealthLock:false,diagnosticOneHit:oneHit,swarm:w.swarm,build:build.id,race:build.race,seed,completed,stage:w.stage,phase:w.phase,time:round(w.time),endlessSeconds:round(w.endlessElapsed),steps,issue,peakBodies,peakEnemies,checkpoints,stats:w.stats,economy:w.economyTotals,wallet:w.wallet,objectives:{pendingGuards:w.pods.reduce((n,p)=>n+Math.max(0,p.guardTypes.length-p.guardianIds.size),0),finalBossId:w.campaign18Runtime?.finalBossId,hive:w.hive?.hp,finalBossKilled:w.campaign18Runtime?.finalBossKilled,bosses:[...w.entities.values()].filter(e=>e.enemyTier==='boss').map(e=>({type:e.unitType,hp:e.hp}))},unresolvedOrders:s.ledger.filter(j=>j.state!=='settled'),production:structuredClone(s.production),events:controller.events,samples,deaths,failure:w.phase==='lost'?{category:peakBodies<=2?'failed-early-rescue-and-force-growth':'army-attrition',recentDeaths:deaths.slice(-10),lastSamples:samples.slice(-3)}:null};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1])){
 const requested=process.argv.includes('--build')?process.argv[process.argv.indexOf('--build')+1]:null;
 const seeds=process.argv.includes('--seeds')?process.argv[process.argv.indexOf('--seeds')+1].split(',').map(Number):process.argv.includes('--seed')?[Number(process.argv[process.argv.indexOf('--seed')+1])]:[7,271,89241];
 assert.ok(seeds.length<=16&&seeds.every(seed=>Number.isSafeInteger(seed)&&seed>=0&&seed<=0xffffffff));
 const dir=path.resolve(process.argv.includes('--output')?process.argv[process.argv.indexOf('--output')+1]:'reports/local/p6-20261006/natural-normal');fs.mkdirSync(dir,{recursive:true});const results=[];
 for(const build of BUILDS.filter(b=>!requested||b.id===requested))for(const seed of seeds){const r=campaign(build,seed,path.join(dir,'checkpoints'));fs.writeFileSync(path.join(dir,`${build.id}-${seed}.json`),JSON.stringify(r,null,2));results.push({build:r.build,seed,completed:r.completed,stage:r.stage,phase:r.phase,time:r.time,issue:r.issue,peakBodies:r.peakBodies,checkpoints:r.checkpoints});console.log(JSON.stringify(results.at(-1)));if(process.argv.includes('--stop-on-complete')&&r.completed===18&&r.endlessSeconds>=180)break;}
 fs.writeFileSync(path.join(dir,requested?`summary-${requested}.json`:'summary.json'),JSON.stringify({controllerHash:createHash('sha256').update(fs.readFileSync('tools/qa-p6-controller.ts')).digest('hex'),diagnosticHealthLock:process.argv.includes('--health-lock'),diagnosticOneHit:process.argv.includes('--one-hit'),method:'Actual World 60 Hz, seeded radial campaign map, CLI-selected difficulty (Normal by default), talents as frozen in each saved run (0 by default, explicit preconfigured legal 41/80-point profile when requested); visible enemies only; public player actions. Diagnostic bot evidence, not human win rate.',results},null,2));
 if(results.some(r=>r.issue))process.exitCode=1;
}
