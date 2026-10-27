import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {spawnEncounter,tickEncounters} from '../src/simulation/encounters/runtime';
import {glandDeath} from '../src/simulation/fun-shop/runtime';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {equipmentDropPolicy} from '../src/simulation/starship/drops';
import {naturalEventChance} from '../src/simulation/field-events/pacing';
import {CAMPAIGN_WAVES,continuousOrdinaryGrowth,continuousSpecialProfile} from '../src/data/enemy-tuning';
import {SC2_UNITS} from '../src/data/sc2-units';
import {spawnMission,releaseMissionQueue,missionAwayFromSquad} from '../src/simulation/missions/runtime';
import {beginSpecialStage,markSpecialReady} from '../src/simulation/special-stages/runtime';
import {resolveSpecialResource} from '../src/simulation/special-stages/rewards';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';

function fixture(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:529,difficulty:'easy',equipmentAccount:newEquipmentAccount(529)});w.start();w.stage=7;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}

test('a fresh real profile cannot select hard, and an actual normal campaign victory unlocks it',()=>{
 const w=new World({terrain:new FlatTerrain(),waves:false,obstacles:[],seed:529});assert.equal(w.setDifficulty('hard'),false);assert.equal(w.difficulty,'normal');assert.ok(w.start());
 w.stage=18;w.prepareStage();w.hive!.hp=0;w.stageElapsed=w.duration;
 const boss=(w as any).spawnCampaignSpecial(campaign18Schedule(campaign18StageConfig(18,'normal'),529).specials[0]);
 assert.equal(w.permanentProfile.difficultyUnlocked('hard'),false);if(!w.allies().length)w.addUnit('marine','terran',0,0);w.hit(boss,1e9,[],1,'terran');w.endStage();assert.equal(w.phase,'won');assert.equal(w.permanentProfile.difficultyUnlocked('hard'),true);
});

test('restoring a current-schema four-card ticket shelf keeps payments but presents three slots',()=>{
 const w=fixture();w.stage=3;w.prepareStage();w.specialStages.ticket={stage:4,kind:'resources',claimed:false};w.specialStages.offerChecked=4;w.endStage();w.skipReward();
 const extra=structuredClone(w.rewards[0]);extra.offerId+=':old-third';w.rewards.splice(2,0,extra);const wallet={...w.wallet},rng=w.rngState,snapshot=w.captureRun();
 const copy=fixture();copy.restoreRun(snapshot);assert.equal(copy.rewards.length,3);assert.deepEqual(copy.wallet,wallet);assert.equal(copy.rngState,rng);
 const ticket=copy.rewards.find(r=>r.offerId.includes(':special-ticket:'))!;assert.ok(copy.choose(ticket.offerId));const claimed=copy.captureRun();w.restoreRun(claimed);assert.equal(w.specialStages.ticket?.claimed,true);assert.equal(w.choose(ticket.offerId),false);assert.deepEqual(w.wallet,wallet);
});

test('difficulty qualification is shared, durable and requires the completed milestone',()=>{
 const p=new PermanentProfile();assert.equal(p.difficultyUnlocked('normal'),true);assert.equal(p.difficultyUnlocked('hard'),false);assert.equal(p.difficultyUnlocked('hell'),false);
 p.recordDifficultyProgress('easy',18);p.recordDifficultyProgress('normal',17);assert.equal(p.difficultyUnlocked('hard'),false);
 p.recordDifficultyProgress('normal',18);assert.equal(p.difficultyUnlocked('hard'),true);p.recordDifficultyProgress('hard',18,5);assert.equal(p.difficultyUnlocked('hell'),false);
 p.recordDifficultyProgress('hard',18,6);const revision=p.revision;assert.equal(p.recordDifficultyProgress('hard',18,6),false);assert.equal(p.revision,revision);
 const restored=PermanentProfile.parseJSON(p.exportJSON())!;assert.ok(restored);restored.selectRace('protoss');assert.equal(restored.difficultyUnlocked('hell'),true);
});

test('gland baneling pursues beyond squad leash and deals its native explosion once',()=>{
 const w=fixture();w.funShop.levels.gland=1;w.random=()=>0;const source=w.allies()[0],victim=w.addUnit('roach','zerg',30,0);glandDeath(w,victim,source.id);victim.hp=0;
 const b=w.allies().find(u=>u.temporaryKind==='shop-gland')!;assert.ok(b);const target=w.addUnit('roach','zerg',b.x+9,b.z);target.hp=target.maxHp=1000;const before={x:b.x,z:b.z};
 for(let i=0;i<900&&b.hp>0;i++){w.time+=1/60;w.tick++;w.hash.rebuild([...w.entities.values()]);w.updateUnit(b,1/60);}
 assert.ok(Math.hypot(b.x-before.x,b.z-before.z)>5);assert.equal(b.hp,0);assert.ok(target.hp<1000);assert.equal(b.recoveryUntil,undefined);
});

test('giant grows near the squad without approaching or attacking until damaged',()=>{
 const w=fixture();assert.equal(spawnEncounter(w,'giant'),true);for(let i=0;i<120;i++)tickEncounters(w);const m=w.encounters.active!,u=w.entities.get(m.subject!)!,p={x:u.x,z:u.z};
 w.anchor.x=u.x+15;w.anchor.z=u.z;const ally=w.allies()[0];ally.x=u.x+10;ally.z=u.z;
 for(let i=0;i<730;i++){w.time+=1/60;tickEncounters(w);w.updateUnit(u,1/60);}
 assert.equal(m.tier,1);assert.deepEqual({x:u.x,z:u.z},p);assert.equal(w.targetAllowed(u,ally),false);assert.equal(u.attackTarget,null);
 w.hit(u,1,[],1,'terran',0,1,ally.id);assert.equal(w.targetAllowed(u,ally),true);
});

test('golden worker pays eight total with one guaranteed highest-quality item, without duplicates',()=>{
 const w=fixture();assert.equal(spawnEncounter(w,'golden'),true);for(let i=0;i<120;i++)tickEncounters(w);const m=w.encounters.active!,u=w.entities.get(m.subject!)!;
 w.hit(u,1e9,[],1,'terran',0,1);assert.equal(Object.keys(w.starship.account.items).length,8);assert.equal(m.plans[9][0].items.at(-1)!.item.quality,2);
 w.hit(u,1e9,[],1,'terran',0,1);assert.equal(Object.keys(w.starship.account.items).length,8);
});

test('resource stage pays seven pieces; premium chests guarantee one highest piece each',()=>{
 const w=fixture();assert.equal(beginSpecialStage(w,'resources','fixture'),true);markSpecialReady(w);const a=w.specialStages.active!;
 for(const b of a.resources.values()){b.hp=0;resolveSpecialResource(w,b.id);resolveSpecialResource(w,b.id);}
 assert.equal(Object.keys(w.starship.account.items).length,7);assert.equal([...a.resources.values()].filter(b=>b.kind==='highChest').length,2);
});

test('natural chance halves; bait admits at most one extra category even after queueing',()=>{
 assert.deepEqual([3,4,7,13,19].map(naturalEventChance),[0,.3,.35,.4,0]);const w=fixture();Object.defineProperty(w,'diagnosticRun',{value:false});w.funShop.levels.bait=3;w.funShop.bait.stage=w.stage;w.funShop.bait.counts.elite=1;w.funShop.bait.pending.encounter=true;w.stageElapsed=40;w.random=()=>0;
 tickBait(w);assert.equal(w.encounters.active,null);assert.deepEqual(w.funShop.bait.pending,{encounter:false,elite:false,horde:false});
 const pool=equipmentDropPolicy({difficulty:'easy',stage:7,tier:'elite'}).guaranteed;assert.deepEqual(pool.map(r=>[r.quality,r.weight]),[[1,55],[2,45]]);
});

for(const difficulty of ['easy','normal','hard','hell'] as const)test(difficulty+' ordinary/special growth and chapter wave frequency never decrease',()=>{
 const d=SC2_UNITS.roach,base={hp:d.maxHp,damage:d.attackDamage,period:d.attackPeriod,armor:d.armor};let previous=[0,0,0,0,0];
 for(let step=0;step<=180;step++){const p=step/180,g=continuousOrdinaryGrowth(difficulty,p),b=continuousSpecialProfile(difficulty,'roach','boss',{stage:Math.max(1,Math.ceil(p*18)),progress:p,density:1},base),now=[g.health,g.damage,b.hp,b.damage,1/b.period];for(let i=0;i<now.length;i++)assert.ok(now[i]+1e-9>=previous[i],`${step}/${i}`);previous=now;}
 const durations=[60,75,90,105,120,150],rates=CAMPAIGN_WAVES[difficulty].map((n,i)=>n/durations[i]);for(let i=1;i<rates.length;i++)assert.ok(rates[i]+1e-9>=rates[i-1]);
});

test('task clusters and late queue admission remain clear of the moved squad',()=>{
 const w=fixture();assert.equal(spawnMission(w,'hives'),true);const m=w.missions.active!;for(const b of w.missions.bodies.values())assert.ok(missionAwayFromSquad(w,b,b.unitRadius,12));
 const p={x:20,z:10};w.anchor.x=p.x;w.anchor.z=p.z;w.allies()[0].x=p.x;w.allies()[0].z=p.z;
 m.queue.push({taskId:m.id,sourceId:m.bodyIds[0],type:'roach',stamp:{stage:7,progress:6/18,density:1},point:p});releaseMissionQueue(w);assert.equal(m.queue.length,0);const u=w.entities.get(m.enemyIds.at(-1)!)!;assert.ok(missionAwayFromSquad(w,u,u.unitRadius));
});
