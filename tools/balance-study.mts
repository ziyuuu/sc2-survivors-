/** Analysis only. Run: node --import tsx tools/balance-study.mts */
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world.ts';
import {SC2_UNITS,SC2_PROFILE,TERRAN,ZERG} from '../src/data/sc2-units.ts';
import {BALANCE_VERSION,ECONOMY,DROPS,PROPOSED_STAGES as stages,CARDS,CARD_ROUTE,BUDGET_SCENARIOS,wavePlan} from './balance-profile.mjs';
const dir='reports/balance';await fs.mkdir(dir,{recursive:true});
const round=(n:number)=>Math.round(n*100)/100;
const rng=(seed:number)=>()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
function duel(hp:number,marines:number,lings:number,angle:number,policy:string){
 const w=new World({waves:false,obstacles:[],initial:Array(marines).fill('marine')});w.start();
 for(const u of w.allies()){const p=w.moveGoal(u);u.x=p.x;u.z=p.z;u.facing=Math.PI/2;u.prev={...p};}
 for(let i=0;i<lings;i++){const x=8+Math.floor(i/3)*1.2,z=((i%3)-1)*1.4,e=w.addUnit('zergling','zerg',x*Math.cos(angle)-z*Math.sin(angle),x*Math.sin(angle)+z*Math.cos(angle));e.hp=e.maxHp=hp;}
 let think=0;
 while(w.phase==='battle'&&w.time<35&&w.enemyCount()){
  if(policy==='retreat'&&w.time>=think){think=w.time+.3;const allies=w.allies(),c={x:allies.reduce((s,u)=>s+u.x,0)/allies.length,z:allies.reduce((s,u)=>s+u.z,0)/allies.length};const e=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0).sort((a,b)=>Math.hypot(a.x-c.x,a.z-c.z)-Math.hypot(b.x-c.x,b.z-c.z))[0];if(e){const d=Math.hypot(c.x-e.x,c.z-e.z);w.input=d<6?{x:(c.x-e.x)/d,z:(c.z-e.z)/d}:{x:0,z:0};}}
  w.step();
 }
 return {hp,marines,lings,angle:angle===0?'front':'flank',policy,win:w.enemyCount()===0,seconds:round(w.time),alive:w.allies().length,hpLost:round(marines*45-w.allies().reduce((s,u)=>s+u.hp,0))};
}
function tuneEnemy(e:any,s:any){if(e.unitType==='zergling'){e.hp=e.maxHp=s.lingHp;e.moveSpeed*=s.speed;}if(e.unitType==='baneling'&&s.id>=9){e.hp=e.maxHp=35;e.moveSpeed*=1.3;}if(e.unitType==='roach'&&s.id>=8)e.armor+=1;}
function podBenchmark(s:any){
 const w=new World({waves:false,obstacles:[],initial:['marine']});w.start();w.anchor={x:-42,z:-42,facing:0};for(const m of w.allies()){m.x=-42;m.z=-42;}
 const pod=w.spawnPod('marine',{x:0,z:0});for(const id of pod.guardianIds)w.entities.delete(id);pod.guardianIds.clear();pod.hp=pod.maxHp=s.podHp;pod.armor=ECONOMY.podArmor;pod.expiresAt=Infinity;
 const types=s.guards.flatMap((n:number,i:number)=>Array(n).fill(ZERG[i]));
 types.forEach((type:any,i:number)=>{const a=i/types.length*Math.PI*2,e=w.addUnit(type,'zerg',Math.cos(a)*s.guardRadius,Math.sin(a)*s.guardRadius);tuneEnemy(e,s);e.guardianPod=pod.id;pod.guardianIds.add(e.id);});
 while(w.time<400&&pod.status==='active'){w.stageElapsed=0;w.step();assert.equal(w.phase,'battle');}
 assert.equal(pod.status,'destroyed');
 return {stage:s.id,guards:s.guards,hp:s.podHp,armor:ECONOMY.podArmor,secondsToDestroy:round(w.time)};
}
for(const s of stages)for(let type=0;type<4;type++)assert.equal(wavePlan(s).reduce((n:number,w:any)=>n+w.counts[type],0),s.ambient[type]);
const duels=[];for(const hp of [18,24,30,35])for(const marines of [1,2,3,5])for(const lings of [1,2,3,4,6,8,12])for(const angle of [0,Math.PI/2])for(const policy of ['hold','retreat'])duels.push(duel(hp,marines,lings,angle,policy));
const pods=stages.map(podBenchmark);
const cost=(type:string,discount:boolean)=>({m:Math.ceil(SC2_UNITS[type as keyof typeof SC2_UNITS].mineralCost*(discount?.85:1)),g:Math.ceil(SC2_UNITS[type as keyof typeof SC2_UNITS].gasCost*(discount?.85:1))});
function budget(scenario:any,seed:number){
 const random=rng(seed),wallet={m:ECONOMY.start.minerals,g:ECONOMY.start.gas};
 const roster:any={marine:[1],hellion:[],tank:[],medivac:[]};let scvs=0,serial=0,cursor=0,playerFreeAt=0;
 const acquired=new Set<string>(),buildings:any[]=[{type:'barracks',ready:0,job:null}],events:any[]=[],podList:any[]=[],ledger:any[]=[],rows:any[]=[];
 let totals:any={income:{start:{m:wallet.m,g:wallet.g},passive:{m:0,g:0},ambient:{m:0,g:0},guards:{m:0,g:0},drones:{m:0,g:0},clear:{m:0,g:0},cardGrant:{m:0,g:0}},expense:{production:{m:0,g:0},cards:{m:0,g:0},rerolls:{m:0,g:0}},started:0,completed:0,rescued:0,destroyed:0,losses:0};
 const add=(category:string,m:number,g:number)=>{wallet.m+=m;wallet.g+=g;totals.income[category].m+=m;totals.income[category].g+=g;};
 const pay=(category:string,m:number,g:number,t:number)=>{if(wallet.m+1e-8<m||wallet.g+1e-8<g)return false;wallet.m-=m;wallet.g-=g;totals.expense[category].m+=m;totals.expense[category].g+=g;assert(wallet.m>-1e-6&&wallet.g>-1e-6);return true;};
 const schedule=(event:any)=>{events.push(event);events.sort((a,b)=>a.at-b.at||a.order-b.order);};
 const reserved=(type:string)=>buildings.filter(b=>b.job?.type===type).length+podList.filter(p=>p.type===type&&['falling','active'].includes(p.status)).length;
 const capacity=(type:string)=>roster[type].reduce((a:number,b:number)=>a+b,0)+reserved(type)<25;
 const reinforce=(type:string)=>{const list=roster[type];if(list.length<5)list.push(1);else {const min=Math.min(...list);assert(min<5,'No wasted max-rank order');list[list.indexOf(min)]++;}assert(list.length<=5&&list.every((r:number)=>r>=1&&r<=5));};
 function auto(t:number){
  for(const b of buildings)if(b.job&&b.job.finish<=t+1e-8){const job=b.job;b.job=null;totals.completed++;const pod={id:job.id,type:job.type,status:'falling',paid:job.paid};podList.push(pod);schedule({at:t+ECONOMY.landingSeconds,order:++serial,kind:'landing',pod});}
  const n=buildings.length;let last=-1;for(let offset=0;offset<n;offset++){const i=(cursor+offset)%n,b=buildings[i];if(b.job||b.ready>t+1e-8)continue;const types=b.type==='barracks'?['marine']:b.type==='factory'?['tank','hellion']:['medivac'];
   for(const type of types){const c=cost(type,acquired.has('discount'));if(!capacity(type)||!pay('production',c.m,c.g,t))continue;const id=++serial;b.job={id,type,finish:t+SC2_UNITS[type as keyof typeof SC2_UNITS].productionTime,paid:c};totals.started++;ledger.push({t:round(t),kind:'order',building:b.type,type,m:c.m,g:c.g});last=i;break;}
  }
  if(last>=0)cursor=(last+1)%n;
 }
 auto(0);
 for(const s of stages){const begin=(s.id-1)*60,end=s.id*60,startTotals=structuredClone(totals),startWallet=s.id===1?{m:ECONOMY.start.minerals,g:ECONOMY.start.gas}:{...wallet};if(s.id===1){startTotals.expense.production={m:0,g:0};startTotals.started=0;}
  for(const wave of wavePlan(s))for(let type=0;type<4;type++)for(let i=0;i<wave.counts[type];i++){if(random()<scenario.kill*scenario.pickup){const [m,g]=DROPS.ambient[ZERG[type]];schedule({at:begin+wave.at+4,order:++serial,kind:'loot',category:'ambient',m,g});}}
  for(let i=0;i<s.drones;i++)if(random()<scenario.drone*scenario.pickup)schedule({at:begin+36+8*i,order:++serial,kind:'drone',category:'drones',m:30,g:15});
  if(s.egg&&random()<scenario.scv)schedule({at:begin+25,order:++serial,kind:'scv'});
  for(let tick=1;tick<=3600;tick++){
   const t=begin+tick/60;add('passive',(ECONOMY.passive.minerals+scvs*ECONOMY.perScv.minerals)/60,(ECONOMY.passive.gas+scvs*ECONOMY.perScv.gas)/60);
   while(events[0]?.at<=t+1e-8){const e=events.shift();
    if(e.kind==='loot')add(e.category,e.m,e.g);
    else if(e.kind==='scv'){playerFreeAt=Math.max(t,playerFreeAt)+4*scenario.serviceMultiplier;schedule({at:playerFreeAt,order:++serial,kind:'scv-resolved'});}
    else if(e.kind==='scv-resolved')scvs++;
    else if(e.kind==='drone'){playerFreeAt=Math.max(t,playerFreeAt)+4*scenario.serviceMultiplier;schedule({...e,at:playerFreeAt,order:++serial,kind:'loot'});}
    else if(e.kind==='landing'){const p=e.pod;p.status='active';p.stage=s.id;p.landedAt=t;const start=Math.max(t,playerFreeAt),service=ECONOMY.rescueServiceSeconds[s.id-1]*scenario.serviceMultiplier,approach=ECONOMY.approachSeconds[s.id-1]*scenario.serviceMultiplier;const canArrive=start+approach<t+pods[s.id-1].secondsToDestroy;const success=random()<scenario.rescue&&canArrive;
     // A single squad services one pod at a time. Clear time includes travel; no parallel teleport rescues. Damage after intervention is a cohort assumption, not a battle solution.
     if(success)playerFreeAt=start+service;
     schedule({at:success?playerFreeAt:t+pods[s.id-1].secondsToDestroy,order:++serial,kind:'resolve',pod:p,success});
    }else if(e.kind==='resolve'){const p=e.pod;p.status=e.success?'rescued':'destroyed';if(e.success){reinforce(p.type);totals.rescued++;const guardStage=stages[p.stage-1];guardStage.guards.forEach((n:number,i:number)=>{for(let k=0;k<n;k++)if(random()<scenario.pickup){const [m,g]=DROPS.guard[ZERG[i]];add('guards',m,g);}});}else totals.destroyed++;ledger.push({t:round(t),kind:p.status,type:p.type,id:p.id});}
   }
   auto(t);
  }
  if(scenario.lossStages.includes(s.id)&&roster.marine.length){const lostRank=roster.marine.shift();totals.losses++;ledger.push({t:end,kind:'assumed-front-Marine-loss',rank:lostRank});}
  // The stage bonus is granted AFTER the final battle production step. Reward time contains no auto-production ticks.
  add('clear',s.reward[0],s.reward[1]);const beforeCard={...wallet};let rerolls=0,chosen:string|null=null,desired:string|null=null;
  if(s.id<12){for(let i=0;i<scenario.rerolls;i++){const price=50+25*i;if(wallet.m-price<25-1e-8)break;if(pay('rerolls',price,0,end))rerolls++;}
   desired=CARD_ROUTE.find((id:string)=>!acquired.has(id))??'minerals';const c=CARDS[desired as keyof typeof CARDS];
   if(pay('cards',c.m,c.g,end)){chosen=desired;acquired.add(desired);if(c.kind==='build')buildings.push({type:desired,ready:end+(c as any).time,job:null});}
   else {chosen=wallet.g<c.g?'gas':'minerals';const fallback=CARDS[chosen as keyof typeof CARDS];assert(pay('cards',fallback.m,fallback.g,end));add('cardGrant',(fallback as any).gainM,(fallback as any).gainG);}
  }
  const delta=(kind:string)=>Object.fromEntries(Object.keys(totals[kind]).map(k=>[k,{m:round(totals[kind][k].m-startTotals[kind][k].m),g:round(totals[kind][k].g-startTotals[kind][k].g)}]));
  rows.push({stage:s.id,scvs,roster:structuredClone(roster),armyCount:Object.values(roster).reduce((sum:number,r:any)=>sum+r.length,0),rankPoints:Object.values(roster).reduce((sum:number,r:any)=>sum+r.reduce((a:number,b:number)=>a+b,0),0),startWallet:{m:round(startWallet.m),g:round(startWallet.g)},income:delta('income'),expense:delta('expense'),beforeCard:{m:round(beforeCard.m),g:round(beforeCard.g)},wallet:{m:round(wallet.m),g:round(wallet.g)},desired,chosen,rerolls,started:totals.started-startTotals.started,produced:totals.completed-startTotals.completed,rescued:totals.rescued-startTotals.rescued,destroyed:totals.destroyed-startTotals.destroyed,activePods:podList.filter(p=>p.status==='active').length});
 }
 const sum=(map:any,k:string)=>Object.values(map).reduce((a:number,b:any)=>a+b[k],0);
 assert(Math.abs(wallet.m-(sum(totals.income,'m')-sum(totals.expense,'m')))<1e-6);
 assert(Math.abs(wallet.g-(sum(totals.income,'g')-sum(totals.expense,'g')))<1e-6);
 assert(Math.abs(rows.reduce((sum:number,r:any)=>sum+r.expense.production.m,0)-totals.expense.production.m)<.01);
 assert.equal(podList.length,totals.completed);assert.equal(totals.started,totals.completed+buildings.filter(b=>b.job).length);
 assert.equal(podList.filter(p=>p.status==='rescued').length,totals.rescued);assert(scvs<=8);
 return {scenario:scenario.id,seed,rows,totals,ledger};
}
const budgets=BUDGET_SCENARIOS.map((s:any)=>budget(s,42));
const percentile=(a:number[],p:number)=>a.sort((x,y)=>x-y)[Math.floor((a.length-1)*p)];
const sensitivity=BUDGET_SCENARIOS.map((s:any)=>{const runs=Array.from({length:100},(_,i)=>budget(s,1000+i));return {scenario:s.id,seeds:100,rows:stages.map((stage:any)=>{const rows=runs.map(r=>r.rows[stage.id-1]);return {stage:stage.id,armyP10:percentile(rows.map(r=>r.armyCount),.1),armyMedian:percentile(rows.map(r=>r.armyCount),.5),armyP90:percentile(rows.map(r=>r.armyCount),.9),rankMedian:percentile(rows.map(r=>r.rankPoints),.5),mineralsMedian:round(percentile(rows.map(r=>r.wallet.m),.5)),gasMedian:round(percentile(rows.map(r=>r.wallet.g),.5)),rescuesMedian:percentile(rows.map(r=>r.rescued),.5)};})};});
function representativeFight(s:any,roster:any,angle:number,group:string){
 const w=new World({waves:false,obstacles:[],initial:[]});w.start();const row=budgets[0].rows[s.id-1];
 for(const type of TERRAN)for(const rank of roster[type]){const u=w.addUnit(type,'terran',0,0,rank),p=w.moveGoal(u);u.x=p.x;u.z=p.z;u.facing=Math.PI/2;u.prev={...p};}
 // Use only earlier purchased combat tech, never the card paid at this stage's end.
 for(const r of budgets[0].rows.slice(0,s.id-1)){if(r.chosen==='shield')w.upgrades.set('shield',1);if(r.chosen?.startsWith('infantry'))w.upgrades.set('infantry',+(r.chosen.slice(-1)));if(r.chosen?.startsWith('vehicle'))w.upgrades.set('vehicle',+(r.chosen.slice(-1)));}
 for(const u of w.allies())w.refreshStats(u,true);
 const counts=group==='guards'?s.guards:wavePlan(s).map((w:any)=>w.counts).sort((a:number[],b:number[])=>b.reduce((sum,n,i)=>sum+n*SC2_UNITS[ZERG[i]].maxHp,0)-a.reduce((sum,n,i)=>sum+n*SC2_UNITS[ZERG[i]].maxHp,0))[0];
 const types=counts.flatMap((n:number,i:number)=>Array(n).fill(ZERG[i]));
 types.forEach((type:any,i:number)=>{const x=13+Math.floor(i/5)*1.4,z=((i%5)-2)*1.6,e=w.addUnit(type,'zerg',x*Math.cos(angle)-z*Math.sin(angle),x*Math.sin(angle)+z*Math.cos(angle));tuneEnemy(e,s);});
 const hp=w.allies().reduce((sum,u)=>sum+u.hp,0),original=w.allies().length;
 while(w.phase==='battle'&&w.time<45&&w.enemyCount())w.step();
 return {stage:s.id,group,angle:angle===0?'front':'flank',army:roster,win:w.enemyCount()===0,seconds:round(w.time),deaths:original-w.allies().length,hpLost:round(hp-w.allies().reduce((sum,u)=>sum+u.hp,0))};
}
const representative=[];
for(const s of stages){const roster=s.id===1?{marine:[1],hellion:[],tank:[],medivac:[]}:budgets[0].rows[s.id-2].roster;for(const angle of [0,Math.PI/2])for(const group of ['ambient-wave','guards'])representative.push(representativeFight(s,roster,angle,group));}

function rescueArrival(s:any,roster:any,pathDistance:number,waitSeconds:number,policy:string){
 const w=new World({waves:false,obstacles:[],initial:[]});w.start();w.anchor={x:-pathDistance,z:0,facing:Math.PI/2};w.trail=[{x:-pathDistance,z:0}];
 for(const type of TERRAN)for(const rank of roster[type]){const u=w.addUnit(type,'terran',0,0,rank),p=w.moveGoal(u);u.x=p.x;u.z=p.z;u.facing=Math.PI/2;u.prev={...p};}
 for(const r of budgets[0].rows.slice(0,s.id-1)){if(r.chosen==='shield')w.upgrades.set('shield',1);if(r.chosen?.startsWith('infantry'))w.upgrades.set('infantry',+(r.chosen.slice(-1)));if(r.chosen?.startsWith('vehicle'))w.upgrades.set('vehicle',+(r.chosen.slice(-1)));}
 for(const u of w.allies())w.refreshStats(u,true);
 const pod=w.spawnPod('marine',{x:0,z:0});for(const id of pod.guardianIds)w.entities.delete(id);pod.guardianIds.clear();pod.expiresAt=Infinity;pod.hp=pod.maxHp=s.podHp;pod.armor=ECONOMY.podArmor;
 const types=s.guards.flatMap((n:number,i:number)=>Array(n).fill(ZERG[i]));types.forEach((type:any,i:number)=>{const a=i/types.length*Math.PI*2,e=w.addUnit(type,'zerg',Math.cos(a)*s.guardRadius,Math.sin(a)*s.guardRadius);tuneEnemy(e,s);e.guardianPod=pod.id;pod.guardianIds.add(e.id);});
 const originalIds=w.allies().map(u=>u.id);let firstArrival:number|null=null,peakStretch=0;
 while(w.phase==='battle'&&w.time<60&&pod.status==='active'){let goal={x:-4.5,z:0};if(policy==='advance-on-ranged'&&firstArrival!==null&&w.time-firstArrival>3){const ranged=[...w.entities.values()].filter(e=>e.owner==='zerg'&&e.hp>0&&['ravager','roach'].includes(e.unitType)).sort((a,b)=>(a.unitType==='ravager'?0:1)-(b.unitType==='ravager'?0:1)||Math.hypot(a.x-w.anchor.x,a.z-w.anchor.z)-Math.hypot(b.x-w.anchor.x,b.z-w.anchor.z))[0];if(ranged){const d=Math.max(.01,Math.hypot(w.anchor.x-ranged.x,w.anchor.z-ranged.z));goal={x:ranged.x+(w.anchor.x-ranged.x)/d*3,z:ranged.z+(w.anchor.z-ranged.z)/d*3};}}const dx=goal.x-w.anchor.x,dz=goal.z-w.anchor.z,len=Math.hypot(dx,dz);w.input=w.time>=waitSeconds&&len>.35?{x:dx/len,z:dz/len}:{x:0,z:0};w.step();peakStretch=Math.max(peakStretch,w.maxStretch);if(firstArrival===null&&w.allies().some(u=>Math.hypot(u.x,u.z)<=6))firstArrival=w.time;}
 return {stage:s.id,pathDistance,waitSeconds,policy,status:pod.status,seconds:round(w.time),podHp:round(pod.hp),originalDeaths:originalIds.filter(id=>(w.entities.get(id)?.hp??0)<=0).length,firstArrival:firstArrival===null?null:round(firstArrival),peakStretch:round(peakStretch)};
}
const rescueArrivals=[];for(const s of stages){const roster=s.id===1?{marine:[1],hellion:[],tank:[],medivac:[]}:budgets[0].rows[s.id-2].roster;for(const d of [12,24])for(const wait of [0,8])for(const policy of ['edge-hold','advance-on-ranged'])rescueArrivals.push(rescueArrival(s,roster,d,wait,policy));}

const sources=['src/data/sc2-units.ts','src/data/game.ts','src/simulation/world.ts','src/simulation/movement/steering.ts','src/simulation/rules.mjs','tools/balance-profile.mjs'];
const sourceHashes=Object.fromEntries(await Promise.all(sources.map(async path=>[path,createHash('sha256').update(await fs.readFile(path)).digest('hex')])));
const report={version:BALANCE_VERSION,simulationBaseCommit:'22918e60f8da1d10bb146aebc1ae23ce2d70715c',sc2:SC2_PROFILE,sourceHashes,scope:'Measured current web simulation isolated fights + hypothetical economy ledger. Not an SC2 client test, integrated 12-stage playthrough, win-rate estimate, or a shipped rules change.',conditions:{duel:'Rank 1, full HP, no upgrades/obstacles, at existing formation slots, facing +X, enemy 3-column grid starts at X=8, spacing X=1.2/Z=1.4, 35-second cap, 60 Hz. Flank rotates spawn by 90 degrees. Retreat steers anchor away from nearest enemy within 6 units every 0.3 s; no Stim or Dash.',pod:'600/900/1200/1500/1800/2100/2400... HP by stage / 2 armor, ring radius 4 for stages 1-3 / 6 for 4-8 / 8 for 9-12, no player intervention, 30-second deadline disabled only in experiment, stage-end pauses bypassed only to measure HP destruction.',economy:'60 Hz ledger, hypothetical killed/collected/rescued proportions, one squad service queue with per-stage travel/clear durations and 4-second SCV/Drone detours, 100 deterministic seeds each; desired card guaranteed offered, no discounts, fair cyclic building scheduling, assumed single front-Marine losses. Budgets do not solve battle, travel, reward draw probability or survival.',rescue:'Same earlier-stage roster, no obstacles or ambient enemies; anchor approaches to 4.5 units before pod; edge-hold stays there, advance-on-ranged approaches 3 units from a Ravager/Roach after first arrival + 3 s, no Stim/Dash; nominal distances 12/24, waits 0/8 s. Existing guardian retargeting retained. A fixture, not a complete player run.',representative:'Full healed army from previous budget stage, stationary anchor, largest actual ambient wave by base HP or all guards attacking squad, 13-unit approach, no obstacles, no simultaneous waves, 45-second cap. Guards normally attack pods; this is a retargeting stress fixture.'},wavePlans:stages.map(s=>({stage:s.id,waves:wavePlan(s)})),duels,pods,budgets,sensitivity,representative,rescueArrivals};
await fs.writeFile(dir+'/study.json',JSON.stringify(report,null,2)+'\n');
const csv=['stage,name,ling_hp,ling_speed_multiplier,map_width,waves,ambient_ling,ambient_roach,ambient_bane,ambient_ravager,pod_ling,pod_roach,pod_bane,pod_ravager,clear_minerals,clear_gas,pod_hp,pod_no_intervention_seconds'];
for(const s of stages)csv.push([s.id,s.name,s.lingHp,s.speed,s.width,s.waves,...s.ambient,...s.guards,...s.reward,s.podHp,pods[s.id-1].secondsToDestroy].join(','));await fs.writeFile(dir+'/stages.csv','\ufeff'+csv.join('\n')+'\n');
console.log(JSON.stringify({duelFixtures:duels.length,podFixtures:pods.length,representativeFixtures:representative.length,rescueFixtures:rescueArrivals.length,budgetSeeds:sensitivity.length*100,ledgerAssertions:'passed',pods,reference:budgets[0].rows.map(r=>({stage:r.stage,roster:r.roster,card:r.chosen,desired:r.desired,wallet:r.wallet,produced:r.produced,rescued:r.rescued,active:r.activePods})),sensitivity},null,2));
