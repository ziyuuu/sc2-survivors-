/** Bounded native loot inspection. No game source, player save, browser or deployment mutation. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {equipmentDropPolicy,dropEnemyEquipment} from '../src/simulation/starship/drops';
import {spawnEncounter,tickEncounters,flushEncounterRewards} from '../src/simulation/encounters/runtime';
import {spawnMission,tickMissions} from '../src/simulation/missions/runtime';
import {beginSpecialStage,markSpecialReady} from '../src/simulation/special-stages/runtime';
import {campaign18StageConfig,campaign18Schedule} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {BAIT_CHANCES} from '../src/simulation/fun-shop/state';

function world(stage:number,seed=529){
 const w=new World({difficulty:'easy',sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],seed,equipmentAccount:newEquipmentAccount(seed)});
 w.start();w.stage=stage;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;
}
const count=(w:World)=>{
 const items=Object.values(w.starship.account.items),qualities=Object.fromEntries([1,2,3,4,5].map(q=>[q,items.filter(i=>i.quality===q).length]));
 return {total:items.length,qualities};
};
function spawnGolden(stage:number){
 const w=world(stage);assert.equal(spawnEncounter(w,'golden'),true);
 for(let i=0;i<120;i++){w.tick++;w.time=w.tick/60;tickEncounters(w);}
 const m=w.encounters.active!,u=w.entities.get(m.subject!)!;
 const plans=m.plans.flat().flatMap(p=>p.items),highestSlots=m.plans[9][0].items.filter((_,i)=>i===3).length;
 w.hit(u,1e9,[],1,'terran',0,1);const first=count(w);assert.equal(first.total,8);
 const rng=w.starship.account.rng;w.hit(u,1e9,[],1,'terran',0,1);flushEncounterRewards(w);
 assert.deepEqual(count(w),first);assert.equal(w.starship.account.rng,rng);
 return {stage,...first,plannedItems:plans.length,guaranteedGreenItems:highestSlots,repeatedDeathAndFlushAdded:0};
}
function resourceRoom(stage:number){
 const w=world(stage);assert.equal(beginSpecialStage(w,'resources','fixture'),true);assert.equal(markSpecialReady(w),true);
 const chests=[...w.specialStages.active!.resources.values()].filter(b=>b.kind==='chest'||b.kind==='highChest');
 for(const chest of chests)w.hit(chest,1e9,[],1,'terran',0,1);
 const first=count(w);assert.equal(first.total,7);assert.ok(first.qualities[2]>=2);
 for(const chest of chests)w.hit(chest,1e9,[],1,'terran',0,1);
 assert.deepEqual(count(w),first);
 return {stage,chests:chests.length,...first,guaranteedGreenItems:2,repeatedChestHitsAdded:0,scope:'All 5 chests destroyed in controlled room; not a 30-second player clear or pickup claim'};
}
function hiveMission(stage:number){
 const w=world(stage);w.missions.enabled=true;assert.equal(spawnMission(w,'hives'),true);
 const m=w.missions.active!,n=m.bodyIds.length;
 for(const id of m.bodyIds)w.hit(w.missions.bodies.get(id)!,1e9,[],1,'terran',0,1);
 // Resolution queues the reward; the following native tick delivers it.
 tickMissions(w);tickMissions(w);const first=count(w);assert.ok(first.total>=n);
 for(let i=0;i<3;i++)tickMissions(w);assert.deepEqual(count(w),first);
 return {stage,hives:n,...first,guaranteedGreenItems:0,repeatedResolutionAdded:0};
}
function killReplay(stage:number,tier:'regular'|'elite'|'boss',trials:number){
 const w=world(stage),u=w.addUnit('zergling','zerg',20,20);u.enemyTier=tier;u.hp=0;u.deadAt=w.time;
 for(let i=0;i<trials;i++)dropEnemyEquipment(w,{...u,id:100000+i,bornAt:i/60});
 const first=count(w);assert.equal(dropEnemyEquipment(w,{...u,id:100000,bornAt:0}).length,0);assert.deepEqual(count(w),first);
 return {stage,tier,trials,...first,repeatedReceiptAdded:0};
}
const policies=[1,7,11,13].map(stage=>({stage,...equipmentDropPolicy({difficulty:'easy',stage,tier:'regular'})}));
const waves=Array.from({length:11},(_,i)=>{
 const stage=i+1,config=campaign18StageConfig(stage,'easy'),plan=campaign18Schedule(config,529),mixed=mixCampaignWaves(plan.waves,stage,'easy',529);
 const members=mixed.flatMap(w=>w.members??[]),eligible=members.filter(m=>m.stamp.density===1).length,p=equipmentDropPolicy({difficulty:'easy',stage,tier:'regular'}),green=p.base.filter(r=>r.quality===2).reduce((n,r)=>n+r.weight,0)/100;
 return {stage,scheduledWaveBodies:members.length,eligiblePrimaryBodies:eligible,excludedCompanions:members.length-eligible,naturalElites:plan.specials.filter(s=>s.tier==='elite').length,bosses:plan.specials.filter(s=>s.tier==='boss').length,expectedRegularItems:eligible*p.baseChance,expectedRegularGreen:eligible*p.baseChance*green};
});
const report={date:'2026-10-27',scope:'Current native loot policies and bounded controlled sources; not the user save, complete campaign, human playthrough or guaranteed loot budget',seed:529,policies,bait:BAIT_CHANCES,campaignWaveBaseline:{scope:'Seed 529 scheduled primary waves through completed stage 11; excludes reinforcements/guards, mission adds, equipment modifiers, bait, encounters and special rooms; assumes every eligible scheduled primary dies',stages:waves,totals:Object.fromEntries(['scheduledWaveBodies','eligiblePrimaryBodies','excludedCompanions','naturalElites','bosses','expectedRegularItems','expectedRegularGreen'].map(k=>[k,waves.reduce((n,w)=>n+(w as any)[k],0)]))},native:{regular:[killReplay(1,'regular',10000),killReplay(7,'regular',10000)],elite:killReplay(7,'elite',300),boss:killReplay(7,'boss',300),golden:[spawnGolden(4),spawnGolden(7)],resources:[resourceRoom(4),resourceRoom(7)],hives:[hiveMission(7)]},limitations:['Synthetic qualifying-death replay verifies the production loot function, not actual player kill counts.','No user save was loaded; exact attribution of the reported 80 items is unknown.','Bait probabilities are per eligible 20-second roll, with cooldown, busy and placement gates; no campaign-frequency estimate is asserted.']};
const output=process.argv[2];if(output){fs.mkdirSync(new URL('../reports/qa/',import.meta.url),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
console.log(JSON.stringify({policy:policies.map(p=>({stage:p.stage,rate:p.baseChance,qualityWeights:p.base.map(r=>[r.quality,r.weight])})),waveBaseline:report.campaignWaveBaseline.totals,native:report.native},null,2));
