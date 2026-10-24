import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {growthRuntime,ROOT} from './lib/g03-growth-runtime.mts';
import {gearFor} from './lib/g03-growth-cases.mts';
import {consumptionController} from './lib/g03-consumption-controller-r2.mts';
import {consumptionController as auditedController} from './lib/g03-consumption-controller-r3.mts';
import {farmMinorGear} from './lib/g03-farm-minor-cases.mts';
import {economyController,startMeasuredCase,stageKey,round,distance} from './lib/g03-economy-runtime-tier-objectives-r2.mts';
import {observeDeliveries} from './lib/g03-delivery-observer.mts';
const OUT=ROOT+'/reports/local/g03-farm-minor-20261023';
const input=process.argv[2],c=/^\d+$/.test(input)?JSON.parse(fs.readFileSync(OUT+'/plan.json','utf8')).cases[Number(input)]:JSON.parse(input),directory=process.argv[3]??'diagnostic',id=[c.version,c.policy,c.race,c.difficulty,c.tier,c.seed].join('-'),file=OUT+'/'+directory+'/'+id+'.json';
const sha=(path:string)=>createHash('sha256').update(fs.readFileSync(path)).digest('hex');
const toolFiles=['tools/measure-g03-farm-minor-20261023.mts','tools/lib/g03-delivery-observer.mts','tools/lib/g03-consumption-controller-r3.mts','tools/lib/g03-farm-minor-cases.mts','tools/lib/g03-growth-runtime.mts','tools/lib/g03-growth-cases.mts','tools/lib/g03-consumption-controller-r2.mts','tools/lib/g03-economy-runtime-tier-objectives-r2.mts','tools/qa-campaign-controller.ts'];
const runtimeBinding={sourceManifest:ROOT+'/reports/local/g03-growth-consumption-20261023/after.json',sourceManifestSha256:sha(ROOT+'/reports/local/g03-growth-consumption-20261023/after.json'),tools:Object.fromEntries(toolFiles.map(f=>[f,sha(ROOT+'/'+f)]))};
if(fs.existsSync(file)){console.log('EXISTS '+id);process.exit(0);}fs.mkdirSync(OUT+'/'+directory,{recursive:true});
const lock=fs.openSync(file+'.lock','wx'),r=await growthRuntime(c.version),{a,spec}=['farm','minor'].includes(c.tier)?farmMinorGear(r,c):gearFor(r,c),opening=structuredClone(a),map=r.chooseCampaignMap(c.seed);
const w=new r.World({race:c.race,difficulty:c.difficulty,seed:c.seed,waves:true,terrain:r.campaignTerrain(map),endlessTerrain:new r.FlatTerrain(),equipmentAccount:a});w.configureCampaign(map);
const p=c.policy==='legacy'?economyController(w,r,c.race,{preserveSets:true}):c.policy==='audited'?auditedController(w,r,c.race):consumptionController(w,r,c.race);
// Lightweight complete wallet ledger. Account for frozen-realm transfers separately.
const currencyRows=new Map<string,any>(),seenWallets=new WeakSet(),walletTransfers:any[]=[];let initial={...w.wallet},wallet=w.wallet;
function attach(v:any){if(seenWallets.has(v))return;seenWallets.add(v);for(const key of ['minerals','gas']){let value=v[key];Object.defineProperty(v,key,{enumerable:true,configurable:true,get:()=>value,set:next=>{const delta=next-value;value=next;if(delta&&v===wallet){const realm=w.specialStages.active?.id??'normal',label=[stageKey(w),realm,key,delta>0?'income':'spend'].join('|'),row=currencyRows.get(label)??{stage:stageKey(w),realm,currency:key,kind:delta>0?'income':'spend',amount:0,count:0};row.amount+=delta;row.count++;currencyRows.set(label,row);}}});}}
attach(wallet);Object.defineProperty(w,'wallet',{enumerable:true,configurable:true,get:()=>wallet,set:next=>{walletTransfers.push({stage:stageKey(w),realm:w.specialStages.active?.id??'normal',time:round(w.time),before:{...wallet},after:{...next}});wallet=next;attach(next);}});
const deliveryObserver=observeDeliveries(w);
p.initialize();startMeasuredCase(w,c.seed);p.configure();
const pressure:any[]=[],stages:any[]=[],specials:any[]=[],deathRows:any[]=[],dead=new Set<number>();let steps=0,iterations=0,nextThink=-1,last=stageKey(w),lastSpecial='',stop='step-censored',issue=null,started=Date.now(),lastPrint=started,baseCalls=0,normalCalls=0,objectiveCalls=0,maxEnemies=0;
const commitDeath=w.commitUnitDeath.bind(w);w.commitUnitDeath=(u:any,...args:any[])=>{if(u.deadAt===null&&u.owner==='terran'&&!u.temporary&&!u.summonKind){dead.add(u.id);deathRows.push({stage:stageKey(w),special:w.specialStages.active?.kind??null,time:round(w.time),id:u.id,type:u.unitType,rank:u.rank,hero:u.heroId??null,elite:u.eliteId??null,source:'native-death-callback'});}return commitDeath(u,...args);};
const sample=()=>({notice:w.notice,stage:stageKey(w),phase:w.phase,time:round(w.time),stageElapsed:round(w.stageElapsed),wallet:{...w.wallet},economy:structuredClone(w.economyTotals),tech:{...w.expedition.tech},production:structuredClone(w.expedition.production),groups:structuredClone(w.expedition.building.groups),ledger:structuredClone(w.expedition.ledger),allies:w.allies().filter((u:any)=>!u.temporary&&!u.summonKind).map((u:any)=>({id:u.id,type:u.unitType,hp:round(u.hp),maxHp:round(u.maxHp),shield:round(u.shield),rank:u.rank,hero:u.heroId??null,elite:u.eliteId??null})),heroes:[...w.heroes.values()],special:w.specialStages.active?.kind??null,gear:structuredClone(w.starship.account.equipped[c.race]),expansionHives:[...w.expansionHives.values()].map((h:any)=>({id:h.id,hp:h.hp,x:h.x,z:h.z}))});
stages.push(sample());
try{while(steps<260000){
 if(Date.now()-started>2400000){stop='wall-censored';break;}if(++iterations>530000)throw Error('phase loop');p.decisions();
 if(w.phase==='lost'){stop='lost';break;}if(w.endless){stop='entered-endless';break;}
 if(w.phase==='won'){assert.ok(w.chooseCampaignExit('endless'));continue;}
 if(w.phase==='endless-ready'){const e=w.previewEndlessTransition();assert.ok(e);const token=`${e.requestId}:${e.expectedRevision}:${e.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(e.requestId,e.expectedRevision,token));continue;}
 if(w.phase==='reward'){stages.push(sample());p.intermission();nextThink=-1;continue;}assert.equal(w.phase,'battle');
 if(stageKey(w)!==last){last=stageKey(w);stages.push(sample());nextThink=-1;}
 const special=w.specialStages.active;if(special&&special.id!==lastSpecial){lastSpecial=special.id;specials.push({stage:w.stage,id:special.id,kind:special.kind,participants:special.participants.length,outside:w.allies().filter((u:any)=>!w.terrain.canOccupy(u,u.unitRadius)).map((u:any)=>u.id)});}
 if(w.time>=nextThink-1e-8){const mandatory=!special&&(w.difficulty==='hell'||w.endless)&&[...w.expansionHives.values()].some((h:any)=>h.hp>0);if(mandatory)objectiveCalls++;const urgent=!mandatory&&!special&&[...w.entities.values()].some((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran')&&distance(e,w.anchor)<18);if(c.policy==='audited'&&p.protectDelivery()){normalCalls++;}else if(urgent){p.base.think();baseCalls++;}else{p.think();normalCalls++;}nextThink=w.time+.25;}
 const battleStage=stageKey(w),normalBattle=!w.specialStages.active;w.step();steps++;if(normalBattle&&steps%60===0){const us=w.allies().filter((u:any)=>!u.temporary&&!u.summonKind),hp=us.reduce((n:number,u:any)=>n+u.hp,0),maxHp=us.reduce((n:number,u:any)=>n+u.maxHp,0);pressure.push({stage:battleStage,time:round(w.time),units:us.length,hpFraction:round(maxHp?hp/maxHp:0),enemies:w.enemyCount(),wallet:{...w.wallet}});}maxEnemies=Math.max(maxEnemies,w.enemyCount());
 if(Date.now()-lastPrint>30000){lastPrint=Date.now();console.log(JSON.stringify({progress:id,stage:stageKey(w),steps,special:special?.kind??null}));}
 }}catch(e){stop='error';issue=String(e instanceof Error?e.stack:e);}
const rows=[...currencyRows.values()].map(row=>({...row,amount:round(row.amount)}));
// Every setter delta and wallet replacement is included; no silent frozen-return adjustment.
const reconciliation=Object.fromEntries(['minerals','gas'].map(key=>[key,round(w.wallet[key]-initial[key]-[...currencyRows.values()].filter(row=>row.currency===key).reduce((n,row)=>n+row.amount,0)-walletTransfers.reduce((n,t)=>n+t.after[key]-t.before[key],0))]));
const result={id,...c,spec,map,opening,stop,issue,stage:w.stage,time:round(w.time),steps,wallSeconds:(Date.now()-started)/1000,stages,specials,deathRows,final:sample(),finalAccount:w.starship.account,policyDetails:{name:c.policy,baseCalls,normalCalls,objectiveCalls,events:[...p.base.events,...('prior' in p?p.prior.events:[]),...p.events]},economyAudit:{initial,rows,walletTransfers,reconciliation},maxEnemies,pressure,deliveryEvents:deliveryObserver.events,runtimeBinding,limits:'Native continuous campaign with legal prepared gear. No forced heroes, kills, run money, stages or HP locks. Same seed can diverge after purchases; automatic policy is not a human win-rate or global optimum proof. Censors/errors kept separate.'};
fs.writeFileSync(file,JSON.stringify(result,null,2));console.log(JSON.stringify({id,stop,stage:w.stage,steps,wallSeconds:result.wallSeconds,issue,reconciliation}));fs.closeSync(lock);fs.unlinkSync(file+'.lock');if(issue)process.exitCode=1;
