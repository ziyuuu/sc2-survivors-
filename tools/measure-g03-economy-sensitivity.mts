import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {BASE,newCase,startMeasuredCase,economyController,observeEconomy,comparableState,stageKey,realmKey,round} from './lib/g03-economy-runtime.mts';
const args=new Map(process.argv.slice(2).map(v=>{const [k,...rest]=v.replace(/^--/,'').split('=');return [k,rest.join('=')||'true'];}));
const tag=args.get('tag')??'sensitivity-r1',out=BASE+'/'+tag;fs.mkdirSync(out,{recursive:true});
function json(file:string,value:any){fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function cautiousController(w:any,r:any,race:string){
 const declined:any[]=[];
 // Only the controller sees this policy facade. Native World logic continues on the original object.
 const facade=new Proxy(w,{get(target,key){if(key==='purchaseShopOffer')return (...args:any[])=>{const offer=target.rewards.find((o:any)=>o.offerId===args[1]);if(target.stage<=6&&offer?.expeditionEffect.kind==='funShop'){declined.push({stage:stageKey(w),time:round(w.time),kind:'policy-decline-early-fun',data:offer.id});return false;}return target.purchaseShopOffer(...args);};const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const nativeRuntime={...r,markSpecialReady:()=>r.markSpecialReady(w),collectSpecialRewards:()=>r.collectSpecialRewards(w),quitSpecialStage:()=>r.quitSpecialStage(w)};const p=economyController(facade,nativeRuntime,race);p.events.push({kind:'policy',data:'Skip optional fun-shop purchases through stage6; all other development, production and movement unchanged.'});
 const native=p.intermission;p.intermission=()=>{native();p.events.push(...declined.splice(0));};return p;
}
function canonical(value:any,id:string){return JSON.parse(JSON.stringify(value,(_key,v)=>typeof v==='string'?v.replaceAll(id,'<run>'):v instanceof Set?{set:[...v]}:v instanceof Map?{map:[...v]}:v));}
async function route(c:any,probed=true,maxSteps=220000,maxWall=240000){
 const {w,r,a,map}=await newCase(c),initialItems=structuredClone(a.items),policy=cautiousController(w,r,c.race),observer=probed?observeEconomy(w):null;
 const started=Date.now();policy.initialize();const sessionIdentity=startMeasuredCase(w,c.seed);policy.configure();observer?.sample('start');
 let steps=0,iterations=0,nextThink=0,nextSample=5,peakEnemies=0,peakQueue=0,lastKey=stageKey(w),lastRealm=realmKey(w),lastProgress=started,completed=0,issue:string|null=null,stop='unknown',endlessReached=false,settled=false;const stageEnds:any[]=[];
 try{while(steps<maxSteps){
  if(Date.now()-started>maxWall){stop='wall-clock-censored';break;}
  if(Date.now()-lastProgress>20000){lastProgress=Date.now();console.log(JSON.stringify({progress:true,id:c.id,steps,stage:stageKey(w),phase:w.phase,time:round(w.time),special:w.specialStages.active?.kind??null,wallSeconds:round((Date.now()-started)/1000)}));}
  if(++iterations>maxSteps*2+1000)throw Error('Unresolved zero-time phase loop');
  policy.decisions();observer?.inspect();
  if(w.phase==='lost'||w.phase==='finished'){stop=w.phase;break;}
  if(w.endless&&w.endlessElapsed>=360-1e-8){stop='endless-six-minutes';observer?.sample('endless-target');if(['reward','won','endless-ready'].includes(w.phase)){settled=w.extractEquipment();}break;}
  if(w.phase==='won'){completed=18;endlessReached=true;observer?.sample('campaign-won');if(!w.chooseCampaignExit('endless'))throw Error('Native endless choice refused');continue;}
  if(w.phase==='reward'){completed=Math.max(completed,w.stage);observer?.sample('intermission-before');stageEnds.push({stage:stageKey(w),wallet:{...w.wallet},time:round(w.time),steps,allies:w.allies().length});policy.intermission();observer?.sample('intermission-after');nextThink=-1;continue;}
  if(w.phase==='endless-ready'){const p=w.previewEndlessTransition();if(!p)throw Error('Missing endless transition');const token=`${p.requestId}:${p.expectedRevision}:${p.mapHash}`;if(!w.registerEndlessReadyToken(token)||!w.commitEndlessTransition(p.requestId,p.expectedRevision,token))throw Error('Native endless commit refused');nextThink=-1;continue;}
  if(w.phase!=='battle')throw Error('Unexpected phase '+w.phase);
  const key=stageKey(w),realm=realmKey(w);if(key!==lastKey||realm!==lastRealm){observer?.sample('stage-or-realm-start');lastKey=key;lastRealm=realm;nextThink=-1;nextSample=w.time+5;}
  if(w.time>=nextThink-1e-8){policy.think();nextThink=w.time+.25;}
  const tick=w.tick,time=w.time;w.step();steps++;
  if(w.tick===tick&&w.time===time&&!w.requiresPlayerDecision&&!w.specialStages.active)throw Error('World did not advance');
  peakEnemies=Math.max(peakEnemies,w.enemyCount());peakQueue=Math.max(peakQueue,w.ambientBacklog.length);assert.ok(peakEnemies<=300,'Production enemy cap exceeded');
  if(steps%15===0)observer?.inspect();if(w.time>=nextSample){nextSample=w.time+5;observer?.sample();}
 }}catch(e){issue=String(e instanceof Error?e.stack:e);stop='controller-or-runtime-error';}
 if(stop==='unknown')stop='step-count-censored';observer?.sample('final');
 const data=observer?.finish()??null,summary={...c,map,sessionIdentity,steps,stop,issue,phase:w.phase,stage:w.stage,completed,time:round(w.time),endlessSeconds:round(w.endlessElapsed),endlessReached,settled,peakEnemies,peakQueue,wallMs:Date.now()-started,wallet:{...w.wallet},dust:a.dust,allies:w.allies().length,kills:w.stats.kills,itemsGenerated:data?.items.length??null,itemsCollected:data?.items.filter((i:any)=>i.collected).length??null,reconciliation:data?.reconciliation??null,objectives:{mainHive:w.hive?{hp:w.hive.hp,maxHp:w.hive.maxHp}:null,finalBossKilled:w.campaign18Runtime?.finalBossKilled??null,expansionHives:[...w.expansionHives.values()].map((h:any)=>({hp:h.hp,maxHp:h.maxHp})),mission:w.missions.active?.kind??null},funShop:{...w.funShop.levels},permanent:w.permanentProfile.raceBalance(c.race)};
 return {summary,method:'Continuous production World fixed steps from a native campaign start, with legal pre-run equipment and actual campaign terrain. World/equipment seed and native UUID input are both fixed; first-Boss receipt-seeded reward selection remains native. Sensitivity policy skips optional fun-shop purchases through stage6 using a controller-only facade. Other movement/development/production choices are identical. Deterministic public-action policy; no HP lock, damage override, coin injection, stage skipping, guaranteed offers, enemy removal or talents. Headless readiness acknowledges prepared simulation scenes without GPU loading; not human play or FPS evidence. Defeat and censoring stop the run.',initialItems,gearAtStart:initialItems,stageEnds,measurement:data,policyEvents:[...policy.base.events,...policy.events],finalState:comparableState(w),finalAccount:structuredClone(a)};
}
if(args.has('probe')){
 const cases=[{race:'terran',difficulty:'easy',quality:3,seed:529},{race:'zerg',difficulty:'normal',quality:3,seed:529},{race:'protoss',difficulty:'hard',quality:3,seed:529}].filter(c=>!args.has('race')||args.get('race')!.split(',').includes(c.race));const rows=[];
 for(const [i,c] of cases.entries()){const scenario={...c,version:'current',id:'probe-'+i},plain=await route(scenario,false,Number(args.get('steps')??7200),Number(args.get('wall')??120000)),observed=await route(scenario,true,Number(args.get('steps')??7200),Number(args.get('wall')??120000));json(out+'/probe-'+i+'-plain.json',plain);json(out+'/probe-'+i+'-observed.json',observed);assert.equal(plain.summary.issue,null);assert.equal(observed.summary.issue,null);assert.deepEqual(canonical(observed.finalState,observed.finalAccount.run.id),canonical(plain.finalState,plain.finalAccount.run.id));assert.deepEqual(canonical(observed.finalAccount,observed.finalAccount.run.id),canonical(plain.finalAccount,plain.finalAccount.run.id));assert.ok(Object.values(observed.summary.reconciliation).every((n:any)=>Math.abs(n)<.00001));rows.push({case:c,steps:observed.summary.steps,stop:observed.summary.stop,exact:true,excludedOnly:'Random UUID run identity normalized consistently, not RNG or gameplay state',reconciliation:observed.summary.reconciliation});}
 json(out+'/probe.json',{pass:true,rows});console.log(JSON.stringify({probe:true,pass:true,rows}));
}else{
 const cases:any[]=[];const races=args.get('race')?args.get('race')!.split(','):['terran','zerg','protoss'];const difficulties=args.get('difficulty')?args.get('difficulty')!.split(','):['easy','normal','hard','hell'];const qualities=args.get('quality')?args.get('quality')!.split(',').map(Number):[0,3,5];const seeds=args.get('seed')?args.get('seed')!.split(',').map(Number):[529];const version=args.get('version')??'current';
 for(const race of races)for(const difficulty of difficulties)for(const quality of qualities)for(const seed of seeds)cases.push({race,difficulty,quality,seed,version,id:[version,race,difficulty,quality,seed].join('-')});
 json(out+'/manifest-'+races.join('-')+'-'+version+'.json',{planned:cases,policy:'g03-economy-runtime.mts',secondsTarget:'campaign plus six endless minutes',maxSteps:Number(args.get('steps')??220000),maxWallMs:Number(args.get('wall')??240000)});
 const rows=[];for(const c of cases){const file=out+'/'+c.id+'.json';if(fs.existsSync(file)){rows.push(JSON.parse(fs.readFileSync(file,'utf8')).summary);continue;}const result=await route(c,true,Number(args.get('steps')??220000),Number(args.get('wall')??240000));json(file,result);rows.push(result.summary);console.log(JSON.stringify(result.summary));json(out+'/summary-'+races.join('-')+'-'+version+'.json',{rows});}
 if(rows.some(r=>r.issue))process.exitCode=1;
}
