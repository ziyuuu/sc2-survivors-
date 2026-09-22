import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS,TERRAN,ZERG,SIEGE,HEAL,type TerranType,type ZergType} from '../src/data/sc2-units';
import {STAGES,stageConfig,stageSchedule,incomeFactor,type Difficulty} from '../src/data/stages';
import {rankStats} from '../src/data/ranks';
import {TUNING} from '../src/data/game';
import {DROPS,ECONOMY} from '../src/data/economy';
import {rewardPool,unlockedReward} from '../src/simulation/progression/rewards';
// Analytical envelope, NOT a playthrough. Only reuse the actual payment/capacity/queue code.
// Collection, rescues, losses and card availability below are explicit scenario assumptions.
const round=(n:number)=>Math.round(n*100)/100;
const plans=[
 {id:'ordinary-investment',scvEvery:1,loot:.8,droneFraction:.5,rescue:.8,lossStages:[6,9,11],cardRoute:['tech.shield','tech.infantry','tech.vehicle','tech.infernal','tech.medivac','tech.infantry','tech.vehicle','tech.infantry','tech.vehicle']},
 {id:'missed-economy',scvEvery:3,loot:.5,droneFraction:0,rescue:.6,lossStages:[4,6,8,10,11],cardRoute:['tech.shield','tech.infantry','tech.vehicle','tech.infernal','tech.medivac','tech.infantry','tech.vehicle','tech.infantry','tech.vehicle']},
];
function enemyHp(type:ZergType,stage:number){return type==='zergling'?STAGES[stage-1].lingHp:type==='baneling'&&stage>=9?35:SC2_UNITS[type].maxHp;}
function fireCapacity(w:World,stage:number,counts:number[],area=false){
 const hp=counts.reduce((sum,n,i)=>sum+n*enemyHp(ZERG[i],stage),0);let total=0;
 for(const u of w.allies()){
  if(u.unitType==='medivac')continue;const d=SC2_UNITS[u.unitType],rank=rankStats(u.rank).damage,vehicle=w.upgrades.get('vehicle')??0;
  const perTarget=ZERG.map((type,i)=>{const e=SC2_UNITS[type],armor=e.armor+(type==='roach'&&stage>=8?1:0),bonus=d.bonusDamage.reduce((s,b)=>s+(e.attributes.includes(b.attribute)?(b.amount+(u.unitType==='hellion'&&w.upgrades.has('infernal')?5:0))*rank:0),0);
   const period=Math.ceil(u.attackPeriod/TUNING.step)*TUNING.step;
   const normal=Math.max(.5,u.weaponDamage+bonus-armor)*d.attacks/period;
   if(u.unitType==='tank'){const siegeBonus=SIEGE.bonus.reduce((s,b)=>s+(e.attributes.includes(b.attribute)?b.amount*rank:0),0),siege=Math.max(.5,(SIEGE.damage+vehicle*4)*rank+siegeBonus-armor)/(Math.ceil(SIEGE.period/rankStats(u.rank).attackSpeed/TUNING.step)*TUNING.step);return .5*normal+.5*siege*(area?1.5:1);}
   return normal*(area&&u.unitType==='hellion'?2:1);
  });total+=hp?counts.reduce((s,n,i)=>s+n*enemyHp(ZERG[i],stage)*perTarget[i]/hp,0):perTarget[0];
 }return total;
}
async function budget(difficulty:Difficulty,plan:typeof plans[number]){
 const w=new World({difficulty,seed:89241,waves:false}),rows:any[]=[],f=incomeFactor(difficulty);w.start();let freeAt=0,podSerial=0,nextCard=0;
 const resolving=new Map<number,{at:number;success:boolean}>();const events:any[]=[];let collected={minerals:0,gas:0},guardsTotal=0,assumedLostRanks=0;
 const grant=(m:number,g:number)=>{w.wallet.minerals+=m;w.wallet.gas+=g;collected.minerals+=m;collected.gas+=g;};
 for(let stage=1;stage<=12;stage++){
  w.stage=stage;w.stageStartedAt=w.time;w.prepareStage();const s=stageConfig(stage,difficulty),start=w.time,end=start+s.durationSeconds,rosterBefore=Object.fromEntries(TERRAN.map(t=>[t,w.allies().filter(u=>u.unitType===t).map(u=>u.rank)]));
  let hp=s.ambient.reduce((n,count,i)=>n+count*enemyHp(ZERG[i],stage),0)+(stage===12?w.hive!.maxHp:0),singleCapacity=0,areaCapacity=0,landed=0,successes=0,failures=0;
  const schedule=stageSchedule(s,89241);schedule.waves.forEach(wave=>{const count=[0,0,0,0];wave.types.forEach(t=>count[ZERG.indexOf(t)]++);events.push({at:start+wave.at+4,kind:'loot',m:count.reduce((n,k,i)=>n+k*DROPS.ambient[ZERG[i]][0],0)*plan.loot*f*ECONOMY.dropMultiplier,g:count.reduce((n,k,i)=>n+k*DROPS.ambient[ZERG[i]][1],0)*plan.loot*f*ECONOMY.dropMultiplier});});
  let eggs=0,drones=0;for(const e of schedule.events){if(e.kind==='egg'&&eggs++===0&&stage%plan.scvEvery===0)events.push({at:start+e.at+12,kind:'scv'});if(e.kind==='drone'&&drones++<Math.floor(s.drones*plan.droneFraction))events.push({at:start+e.at+12,kind:'loot',m:DROPS.drone[0]*f*ECONOMY.dropMultiplier,g:DROPS.drone[1]*f*ECONOMY.dropMultiplier});}events.sort((a,b)=>a.at-b.at);
  for(let tick=0;tick<s.durationSeconds*60;tick++){
   w.time=start+(tick+1)/60;w.updateEconomy(1/60);
   while(events[0]?.at<=w.time){const e=events.shift();if(e.kind==='scv')w.scvs++;else grant(e.m,e.g);}
   w.updateProduction(1/60);
   for(const p of w.pods){if(p.status==='falling'&&p.landedAt<=w.time){p.status='active';landed++;guardsTotal+=p.guardTypes.length;hp+=p.guardTypes.reduce((n,t)=>n+enemyHp(t,p.stage),0);
     const serial=++podSerial,success=Math.floor(serial*plan.rescue)>Math.floor((serial-1)*plan.rescue),service=stage<=3?14:stage<=9?22:28;
     const at=success?Math.max(w.time,freeAt)+service:w.time+service*2;if(success)freeAt=at;resolving.set(p.id,{at,success});}
    const event=resolving.get(p.id);if(!event||event.at>w.time)continue;resolving.delete(p.id);
    if(event.success){p.status='rescued';successes++;w.reinforce(p.unitType,p);for(const t of p.guardTypes)grant(DROPS.guard[t][0]*plan.loot*f*ECONOMY.dropMultiplier,DROPS.guard[t][1]*plan.loot*f*ECONOMY.dropMultiplier);}else {p.status='destroyed';failures++;}}
   if(tick%60===0){singleCapacity+=fireCapacity(w,stage,s.ambient);areaCapacity+=fireCapacity(w,stage,s.ambient,true);}
  }
  // Explicit attrition assumption, never a hidden game refund/heal. Economic analysis does not simulate HP.
  if(plan.lossStages.includes(stage)){const m=w.allies().filter(u=>u.unitType==='marine').sort((a,b)=>b.rank-a.rank)[0];if(m){assumedLostRanks+=m.rank;w.entities.delete(m.id);}}
  grant(s.reward[0]*f,s.reward[1]*f);const beforeCard={...w.wallet};let chosen:string[]=[];
  if(stage<12){w.phase='reward';w.rewardRound='building';w.rewardClaimed=false;
   const building=stage>=2&&!w.buildingsOf('factory').length?'factory':stage>=3&&!w.buildingsOf('starport').length?'starport':stage>=6&&w.buildingsOf('barracks').length<2?'barracks':null;
   const build=building?rewardPool().find(r=>r.id==='build.'+building):null;w.rewards=build?[build]:[];if(build&&w.choose(build.offerId))chosen.push(build.id);w.skipReward();
   const id=plan.cardRoute[nextCard],lab=rewardPool(w).find(r=>r.kind==='upgrade'),r=lab??rewardPool(w).find(r=>r.id===id);
   if(r&&unlockedReward(w,r)){
    if(['infantry','vehicle'].includes(r.value)){const level=w.upgrades.get(r.value)??0;if(level>0){r.minerals=r.value==='infantry'?(level===1?250:350):(level===1?250:300);r.gas=r.value==='infantry'?(level===1?75:125):(level===1?75:100);}}
    w.rewards=[r];if(w.choose(r.offerId)){chosen.push(r.id);if(!lab)nextCard++;}
   }
   w.skipReward();
  }
  const roster=Object.fromEntries(TERRAN.map(t=>[t,w.allies().filter(u=>u.unitType===t).map(u=>u.rank)]));
  rows.push({stage,seconds:s.durationSeconds,scvs:w.scvs,rosterBefore,roster,landed,assumedRescued:successes,assumedFailed:failures,enemyHpBudget:round(hp),singleTargetCapacity:round(singleCapacity),areaSensitivityCapacity:round(areaCapacity),requiredFiringUptime:round(hp/singleCapacity),areaSensitivityUptime:round(hp/areaCapacity),sustainableBiologicalHealingPerSecond:round(w.allies().filter(u=>u.unitType==='medivac').reduce((n,u)=>n+u.energyRegen/HEAL.energyPerHp,0)),chosen,beforeCard:Object.fromEntries(Object.entries(beforeCard).map(([k,v])=>[k,round(v)])),wallet:Object.fromEntries(Object.entries(w.wallet).map(([k,v])=>[k,round(v)])),orders:w.stats.started,pendingPods:w.pods.filter(p=>p.status==='active'||p.status==='falling').length});
 }
 const expectedM=50+w.economyTotals.passive.minerals+collected.minerals-w.economyTotals.production.minerals-w.economyTotals.purchases.minerals,expectedG=w.economyTotals.passive.gas+collected.gas-w.economyTotals.production.gas-w.economyTotals.purchases.gas;assert.ok(Math.abs(expectedM-w.wallet.minerals)<1e-6);assert.ok(Math.abs(expectedG-w.wallet.gas)<1e-6);assert.ok(w.wallet.minerals>=0&&w.wallet.gas>=0);
 return {difficulty,scenario:plan,rows,ledger:{start:{minerals:50,gas:0},passive:w.economyTotals.passive,assumedCollectedAndClear:collected,production:w.economyTotals.production,cards:w.economyTotals.purchases,final:w.wallet},guardsTotal,assumedLostRanks};
}
const report={generatedAt:new Date().toISOString(),rankTable:[1,2,3,4,5].map(r=>({rank:r,...rankStats(r),marineHp:45*rankStats(r).health,marineDps:6/SC2_UNITS.marine.attackPeriod*r,tankHp:175*rankStats(r).health,marineLingHit:5-rankStats(r).armor,medivacPeakHealing:HEAL.hpPerSecond*r,medivacSustainedHealing:HEAL.regen*r/HEAL.energyPerHp})),scope:'Analytical resource/firepower envelope, NOT automatic or manual victory evidence. No gameplay modifications. Ordinary card sequence is an availability assumption, not forced in the game. Damage intake, aim/overkill, terrain, actual arrival, simultaneous threats, healing targets and survival are NOT solved.',assumptions:{step:1/60,SCV:'One egg per stage rescued after 12s in ordinary-investment; one every third stage in missed-economy.',loot:'Specified fraction of ambient and successful-guard drops is killed/collected. Failed-pod guards still count in HP budget.',pods:'A single sequential service queue: 14/22/28s including movement/clearing. Assumed success fractions; no demonstrated actual travel or combat clear.',cards:'Full prices, zero random discount, two rounds per pause: Factory from stage 2, Starport from stage 3 after a completed Factory, a second Barracks from stage 6; retry a missing facility when legal/affordable. The first eligible per-Factory Tech Lab takes a random-round card before the planned tech sequence. Otherwise skip. Availability is hypothetical. No rerolls, high-rarity cards or map rewards are assumed; this is deliberately not a simulation of the weighted draw pool.',fire:'Integrates changing ranks/upgrades each second; armor and bonus damage included; cooldown rounded up to fixed ticks. Half tank-mode / half siege-mode; baseline single target, sensitivity two targets per Hellion flame and 1.5 weighted siege splash. No Stim.',uptime:'Enemy HP / integrated ideal DPS is the necessary shooting-time share. It is not a survival probability. Includes all generated pod guards and final Hive HP. Values below 1 are a firepower feasibility screen, not a guaranteed clear.',healing:'Displays energy-regeneration-limited biological HP/sec, not unlimited peak healing. Mechanical units require the optional Nanite Repair card, excluded from these routes.'},runs:[] as any[]};
for(const difficulty of ['normal','easy'] as const)for(const plan of plans)report.runs.push(await budget(difficulty,plan));
await fs.writeFile('reports/balance/v13-envelope.json',JSON.stringify(report,null,2)+'\n');
for(const run of report.runs)console.log(run.difficulty,run.scenario.id,run.rows.map((r:any)=>({stage:r.stage,roster:r.roster,uptime:r.requiredFiringUptime,area:r.areaSensitivityUptime,card:r.chosen,wallet:r.wallet})));
