/** Historical pre-adjustment inspection; use its recorded source baseline, not the current candidate. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {ELITES} from '../src/data/elites';
import {SC2_UNITS} from '../src/data/sc2-units';
import {continuousEndlessGrowth,continuousSpecialProfile} from '../src/data/enemy-tuning';
import {campaign18StageConfig,campaign18Schedule} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {ENDLESS,endlessWaveTemplate,endlessFrequencyIntegral} from '../src/data/endless';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {equipmentDropPolicy,dropEnemyEquipment} from '../src/simulation/starship/drops';
import {absorbReaper,reaperContribution,eliteStatModifiers} from '../src/simulation/combat/terran-elite-runtime';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {spawnEncounter,tickEncounters,flushEncounterRewards} from '../src/simulation/encounters/runtime';
import {beginSpecialStage,markSpecialReady} from '../src/simulation/special-stages/runtime';
import {MISSION_DIFFICULTY,ENCOUNTER_DIFFICULTY,SPECIAL_DIFFICULTY,missionAllowed,encounterAllowed,specialAllowed} from '../src/simulation/progression/fun-availability';
import type {Difficulty} from '../src/data/stages';
import type {Entity} from '../src/simulation/types';

if(continuousEndlessGrowth(900).damage!==1.1**15)throw Error('此脚本对应2026-10-29调整前规则；当前候选请运行 measure-growth-loot-20261029.mts，勿覆盖历史核验报告。');

const difficulties:Difficulty[]=['easy','normal','hard','hell'];
const round=(v:number)=>Math.round(v*1e6)/1e6;
function world(difficulty:Difficulty='easy',stage=1){
 const w=new World({difficulty,race:'terran',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 w.start();w.stage=stage;w.prepareStage();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();
 for(const c of Object.values(w.expedition.production))c.enabled={};return w;
}
function stats(u:Entity){return {hp:round(u.maxHp),damage:round(u.weaponDamage),period:round(u.attackPeriod),armor:round(u.armor),move:round(u.moveSpeed)};}
function absorptionFireComparison(){
 function measure(absorb:boolean){
  const w=world(),units=(['reaper.3','reaper.1','reaper.2'] as const).map((id,i)=>{const u=w.addUnit('reaper','terran',0,i-1,5);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);return u;});
  const h=units[0];if(absorb)for(const u of units.slice(1))assert.ok(absorbReaper(w,h,u));
  const target=w.addUnit('roach','zerg',4,0);target.hp=target.maxHp=1e8;target.armor=0;target.shield=0;target.attributes=[];w.hash.rebuild(w.entities.values());
  let firstTen=0,laterTen=0;
  for(let cycle=0;cycle<20;cycle++){
   w.time=cycle*.5;const hp=target.hp;for(const u of units)if(u.hp>0)w.fire(u,target);
   let steps=0;while(w.weaponFlights.length&&steps++<120){w.time+=1/60;tickWeaponFlights(w,1/60);}assert.equal(w.weaponFlights.length,0);
   if(cycle<10)firstTen+=hp-target.hp;else laterTen+=hp-target.hp;
  }
  return {livingReapers:w.familyUnits('reaper').length,growth:round(h.eliteCombat!.absorbed),firstTenCycleDamage:round(firstTen),laterTenCycleDamage:round(laterTen)};
 }
 const before=measure(false),after=measure(true),g=after.growth*2,oldDamage=1+3*after.growth/(after.growth+20),newDamage=1+3*g/(g+20)+.01*g,newSpeed=1+Math.min(1,.005*g);
 return {scope:'Controlled rank-V three-Reaper group versus same hunter after absorbing the other two; no gear, armor, attributes, splash victims or AI. Actual twenty firing-cycle transactions, not a human battle or measured sustained DPS.',before,after,steadyRatio:round(after.laterTenCycleDamage/before.laterTenCycleDamage),proposal:{effectiveGrowth:g,damageFactor:round(newDamage),attackSpeedFactor:round(newSpeed),estimatedSteadyOutputVsPreviousThree:round(after.laterTenCycleDamage/before.laterTenCycleDamage*newDamage/oldDamage*newSpeed),scope:'Arithmetic with doubled elite contribution and proposed growth, not executed candidate combat; excludes opening burst, armor, attributes, movement and splash.'}};
}
function loneHunter(){
 const w=world();w.expedition.familySlots=['reaper'];assert.ok(w.acquireElite('reaper.3'));
 const h=w.eliteOwned('reaper.3')!,acquisition=[];
 for(const id of ['reaper.1','reaper.2'] as const){
  const before=w.canAcquireElite(id),g=h.eliteCombat!.absorbed;assert.equal(before,true);assert.ok(w.acquireElite(id));
  acquisition.push({id,before,after:w.canAcquireElite(id),gained:round(h.eliteCombat!.absorbed-g),repeatResult:w.acquireElite(id)});
  assert.equal(w.canAcquireElite(id),false);
 }
 const saved=w.captureRun(),restored=world();restored.restoreRun(saved);
 assert.deepEqual(restored.terranElites.absorptions,w.terranElites.absorptions);
 assert.deepEqual(stats(restored.entities.get(h.id)!),stats(h));
 assert.equal(restored.canAcquireElite('reaper.1'),false);
 const growth=world();growth.expedition.familySlots=['reaper'];assert.ok(growth.acquireElite('reaper.3'));
 const hunter=growth.eliteOwned('reaper.3')!;for(let i=1;i<5;i++)assert.ok(growth.acquireElite('reaper.3'));
 const samples=[{bodies:0,growth:0,stats:stats(hunter),modifiers:eliteStatModifiers(growth,hunter)}];
 for(let i=1;i<=200;i++){
  const body=growth.addUnit('reaper','terran',4,0,1);assert.ok(absorbReaper(growth,hunter,body));assert.equal(absorbReaper(growth,hunter,body),false);
  if([1,20,50,100,200].includes(i))samples.push({bodies:i,growth:hunter.eliteCombat!.absorbed,stats:stats(hunter),modifiers:eliteStatModifiers(growth,hunter)});
 }
 for(let i=1;i<samples.length;i++){assert.ok(samples[i].stats.damage>samples[i-1].stats.damage);assert.ok(samples[i].stats.hp>samples[i-1].stats.hp);assert.equal(samples[i].stats.period,samples[0].stats.period);assert.equal(samples[i].stats.move,samples[0].stats.move);}
 const proposal=samples.map(s=>{const g=s.growth,old=s.modifiers;return {g,oldDamage:round(old.damage),oldHp:round(old.hp),damage:round(old.damage+.01*g),hp:round(old.hp+.01*g),attackSpeed:round(1+Math.min(1,.005*g)),move:round(1+Math.min(.35,.0015*g)),relativeDps:round((old.damage+.01*g)*(1+Math.min(1,.005*g))/old.damage)};});
 return {acquisition,restorePreserved:true,normalGrowth:samples,fireComparison:absorptionFireComparison(),contributions:[1,3,5].map(rank=>({rank,normal:reaperContribution(rank,null),midnight:reaperContribution(rank,'reaper.1'),barrel:reaperContribution(rank,'reaper.2'),proposedMidnight:2*reaperContribution(rank,'reaper.1'),proposedBarrel:2*reaperContribution(rank,'reaper.2')})),proposal,proposalStatus:'Arithmetic only; ordinary contributions retained, elite contribution doubled via derived effective growth while saved receipts stay unchanged. Existing early curve retained, plus 1% base damage/HP per effective growth point; speed capped at +100%, move at +35%. Not implemented.'};
}
function endless(){
 const curves=[1,6,12,16,24].map(r=>{const minutes=r-1,current=continuousEndlessGrowth(minutes*60),proposedDamage=1.1**Math.min(5,minutes)*1.16**Math.max(0,minutes-5);return {round:r,elapsedMinutes:minutes,...Object.fromEntries(Object.entries(current).map(([k,v])=>[k,round(v)])),weaponDps:round(current.damage*current.attackSpeed),proposalDamage:round(proposedDamage),proposalDps:round(proposedDamage*current.attackSpeed)};});
 const native=difficulties.map(difficulty=>({difficulty,rounds:[1,16].map(r=>{
  const w=world(difficulty,18),seconds=(r-1)*60;w.endless={round:r,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};
  return {round:r,units:(['zergling','roach','hydralisk','ultralisk'] as const).map(type=>{
   const u=w.addUnit(type,'zerg',25,0,1,'regular',18,{stage:18,progress:1,endlessSeconds:seconds,density:1});
   const d=SC2_UNITS[type],boss=continuousSpecialProfile(difficulty,type,'boss',{stage:18,progress:1,endlessSeconds:seconds,density:1},{hp:d.maxHp,damage:d.attackDamage,period:d.attackPeriod,armor:d.armor});
   return {type,ordinary:stats(u),boss:{hp:round(boss.hp),damage:round(boss.damage),period:round(boss.period),armor:boss.armor,skillFactor:round(boss.skillDamage)}};
  })};
 })}));
 for(const d of native)for(let i=0;i<d.rounds[0].units.length;i++){assert.equal(d.rounds[0].units[i].ordinary.armor,d.rounds[1].units[i].ordinary.armor);assert.equal(d.rounds[0].units[i].boss.armor,d.rounds[1].units[i].boss.armor);}
 return {curves,native,proposalStatus:'Only damage changes after five elapsed endless combat minutes; HP, speed, armor and admission schedules retained. Not implemented.'};
}
function schedule(difficulty:Difficulty){
 const campaign=Array.from({length:18},(_,i)=>{
  const stage=i+1,config=campaign18StageConfig(stage,difficulty),plan=campaign18Schedule(config,529),members=mixCampaignWaves(plan.waves,stage,difficulty,529).flatMap(w=>w.members??[]),policy=equipmentDropPolicy({difficulty,stage,tier:'regular'});
  const elite=plan.specials.filter(s=>s.tier==='elite').length,boss=plan.specials.filter(s=>s.tier==='boss'||s.tier==='lord').length;
  return {stage,seconds:config.durationSeconds,primary:members.filter(m=>m.stamp.density===1).length,elite,boss,rate:policy.baseChance};
 });
 const infinite=Array.from({length:16},(_,i)=>{const r=i+1,members=endlessWaveTemplate(529,r,difficulty).flatMap(w=>w.members??[]);return {round:r,primary:members.filter(m=>m.stamp.density===1).length,rate:equipmentDropPolicy({difficulty,stage:18,endlessRound:r,tier:'regular'}).baseChance};});
 const specials:{time:number;round:number;tier:'elite'|'boss'}[]=[];
 for(const tier of ['elite','boss'] as const){let progress=0;const interval=ENDLESS[tier].interval*(tier==='elite'&&difficulty==='easy'?2:1);
  for(let tick=1;tick<=960*60;tick++){const time=tick/60;progress=Math.min(1,progress+(endlessFrequencyIntegral(time)-endlessFrequencyIntegral(time-1/60))/interval);if(progress<1-1e-8)continue;specials.push({time,round:Math.min(16,Math.ceil((time-1e-8)/60)),tier});progress=0;}
 }
 const cp=campaign.reduce((n,s)=>n+s.primary,0),ep=infinite.reduce((n,s)=>n+s.primary,0),ce=campaign.reduce((n,s)=>n+s.elite,0),cb=campaign.reduce((n,s)=>n+s.boss,0),ee=specials.filter(s=>s.tier==='elite').length,eb=specials.filter(s=>s.tier==='boss').length;
 const regular=campaign.reduce((n,s)=>n+s.primary*s.rate,0)+infinite.reduce((n,s)=>n+s.primary*s.rate,0);
 const optional=campaign.reduce((n,s)=>n+s.elite*equipmentDropPolicy({difficulty,stage:s.stage,tier:'elite'}).baseChance+s.boss*equipmentDropPolicy({difficulty,stage:s.stage,tier:'boss'}).baseChance,0)+specials.reduce((n,s)=>{const p=equipmentDropPolicy({difficulty,stage:18,endlessRound:s.round,tier:s.tier});return n+p.baseChance+p.additionalChance;},0);
 const regularChance={easy:.0035,normal:.0018,hard:.0012,hell:.001}[difficulty],eliteChance=difficulty==='easy'?.3:.16,proposal={regularChance,eliteChance,campaignBossChance:1,endlessBossChance:.35,maxItemsPerNaturalEnemy:1,expectedRegular:round((cp+ep)*regularChance),expectedElite:round((ce+ee)*eliteChance),expectedBoss:round(cb+eb*.35),expectedSubtotal:round((cp+ep)*regularChance+(ce+ee)*eliteChance+cb+eb*.35)};
 return {difficulty,campaign,infinite,specials,summary:{campaignPrimary:cp,endlessPrimary:ep,campaignElites:ce,campaignBosses:cb,endlessElites:ee,endlessBosses:eb,guaranteedFromScheduledSpecials:ce+cb+ee+eb,expectedRegular:round(regular),expectedOptionalSpecialLayers:round(optional),expectedSubtotal:round(ce+cb+ee+eb+regular+optional)},proposal};
}
function fixedEvents(difficulty:Difficulty){
 function fixture(){const w=world(difficulty,13);w.addUnit('marine','terran',0,0,5);return w;}
 const w=fixture();assert.ok(spawnEncounter(w,'golden'));
 for(let i=0;i<120;i++){w.tick++;w.time=w.tick/60;tickEncounters(w);}
 const u=w.entities.get(w.encounters.active!.subject!)!;w.hit(u,1e12,[],1,'terran',0,1);
 const golden=Object.values(w.starship.account.items),n=golden.length;w.hit(u,1e12,[],1,'terran',0,1);flushEncounterRewards(w);assert.equal(Object.keys(w.starship.account.items).length,n);assert.equal(n,8);
 const resource=fixture();assert.ok(beginSpecialStage(resource,'resources','fixture'));assert.ok(markSpecialReady(resource));
 const boxes=[...resource.specialStages.active!.resources.values()].filter(b=>b.kind==='chest'||b.kind==='highChest');for(const b of boxes)resource.hit(b,1e12,[],1,'terran',0,1);
 const items=Object.values(resource.starship.account.items);assert.equal(items.length,7);for(const b of boxes)resource.hit(b,1e12,[],1,'terran',0,1);assert.equal(Object.keys(resource.starship.account.items).length,7);
 let arena:null|{bodies:number;items:number;elites:number;bosses:number}=null;
 if(specialAllowed(difficulty,'arena')){const a=fixture();assert.ok(beginSpecialStage(a,'arena','fixture'));assert.ok(markSpecialReady(a));const actors=a.specialStages.active!.enemies.map(id=>a.entities.get(id)!);for(const actor of actors)dropEnemyEquipment(a,actor);arena={bodies:actors.length,items:Object.keys(a.starship.account.items).length,elites:actors.filter(u=>u.enemyTier==='elite').length,bosses:actors.filter(u=>u.enemyTier==='boss').length};}
 return {difficulty,golden:{items:golden.length,qualities:golden.map(i=>i.quality)},resources:{boxes:boxes.length,items:items.length,qualities:items.map(i=>i.quality)},arena,repeatAdded:0,allowed:{missions:Object.keys(MISSION_DIFFICULTY).filter(k=>missionAllowed(difficulty,k as keyof typeof MISSION_DIFFICULTY)),encounters:Object.keys(ENCOUNTER_DIFFICULTY).filter(k=>encounterAllowed(difficulty,k as keyof typeof ENCOUNTER_DIFFICULTY)),specials:Object.keys(SPECIAL_DIFFICULTY).filter(k=>specialAllowed(difficulty,k as keyof typeof SPECIAL_DIFFICULTY))}};
}

const sources=['src/data/terran-elites.ts','src/simulation/combat/terran-elite-runtime.ts','src/simulation/combat/expedition-elites.ts','src/simulation/combat/expedition-combat.ts','src/data/enemy-tuning.ts','src/data/enemy-progression.ts','src/data/endless.ts','src/simulation/world.ts','src/simulation/starship/drops.ts','src/simulation/encounters/runtime.ts','src/simulation/encounters/expanded.ts','src/simulation/special-stages/rewards.ts','src/simulation/special-stages/arena.ts','src/simulation/progression/fun-availability.ts','src/simulation/field-events/pacing.ts','src/simulation/fun-shop/bait.ts'];
const report={date:'2026-10-29',scope:'Current local working-tree inspection and candidate arithmetic; no gameplay modification or deployment',sourceHashes:Object.fromEntries(sources.map(p=>[p,crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')])),lone:loneHunter(),endless:endless(),loot:{seed:529,horizon:'Campaign 1–18 plus completed endless rounds 1–16',schedules:difficulties.map(schedule).map(({difficulty,summary,proposal})=>({difficulty,summary,proposal})),events:difficulties.map(fixedEvents)},limits:['Scheduled baseline assumes every admitted primary/elite/boss is killed at its scheduled round and all equipment is counted, before pickup, dismantling or loss. No natural playthrough.','Scheduled counts exclude pod guards, main/expansion hive guards, mission adds, bait, random encounters, special stages, plunder and equipment modifiers; not total loot. Horde replacement can displace baseline waves.','Controlled golden/resources/arena reward probes check sources independently; not their frequency or successful human completion.','No user save or physical device examined. Current source findings do not identify the exact Coze build or attribute each item from the reported run.']};
const output=process.argv[2]??'reports/qa/growth-loot-inspection-20261029.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({output,lone:{acquisition:report.lone.acquisition,growth:report.lone.normalGrowth.map(s=>({bodies:s.bodies,...s.stats})),fireComparison:report.lone.fireComparison},endless:report.endless.curves,loot:report.loot.schedules.map(s=>({difficulty:s.difficulty,...s.summary,proposal:s.proposal})),events:report.loot.events.map(e=>({difficulty:e.difficulty,golden:e.golden.items,resources:e.resources.items,arena:e.arena}))},null,2));
