import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {spawnMission} from '../src/simulation/missions/runtime';
import {tickRescue} from '../src/simulation/missions/rescue';
import {TUNING} from '../src/data/game';
import {advanceEndlessPacing,initialEndlessPacing,type EndlessState} from '../src/data/endless';
import {ZERG_ENDLESS} from '../src/data/zerg-six-encounters';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {mixCampaignWaves} from '../src/data/mixed-waves';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {planZergCampaign,zergCampaignQuotas,ZERG_ENEMY_BASE} from '../src/data/zerg-six-encounters';
import {admitZergEncounters,applyEnemySixBody,applyExperienceBody,beginZergEncounters,clearExperienceFor,isExperience} from '../src/simulation/zerg-encounters';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {continuousOrdinaryGrowth} from '../src/data/enemy-tuning';
import {ZERG_SIX,type ZergSixFamily} from '../src/data/zerg-six';
import {tickZergSixEffects,enemyCloudMoveFactor,infectionWeakness,warnEnemyBrood,corrosionArmor,recordZergSixHit,zergShellReduction,zergSixKillCredit} from '../src/simulation/combat/zerg-six';
import {launchWeaponFlight,tickWeaponFlights} from '../src/simulation/combat/weapon-flight';

const seed=17;
const recipe=chooseCampaignMap(seed);
function battle(waves=false,terrain=false){
 const w=new World({seed,race:'zerg',waves,terrain:terrain?campaignTerrain(recipe):false,obstacles:[]});
 if(w.starship.account.tutorial)w.starship.account.tutorial.status='completed';
 assert.ok(w.start());
 w.missions.enabled=w.encounters.enabled=false;
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.pods=[];w.expedition.ledger=[];
 return w;
}
const stamp={stage:1,progress:0,density:1} as const;
const foes=(w:World,family:ZergSixFamily,x=0,z=0)=>{
 const u=w.addUnit(family,'zerg',x,z,1,'regular',1,stamp);
 applyEnemySixBody(w,u,stamp);
 return u;
};
const advance=(w:World,seconds:number)=>{for(let t=0;t<Math.round(seconds/TUNING.step);t++)w.step();};
function sentry(w:World,x:number,z:number){
 const u=w.addUnit('ghost','terran',x,z);
 u.hp=u.maxHp=3000;
 u.moveSpeed=0;u.weaponDamage=0;u.weaponCooldown=100;u.nextShotAt=100;u.armor=0;
 return u;
}
const clone=(w:World)=>readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;

test('R2 campaign schedules four difficulties × 18 stages and all new plans leave old mixed waves untouched',()=>{
 for(const d of ['easy','normal','hard','hell'] as const)for(let stage=1;stage<=18;stage++)for(const random of [1,17,71,101]){
  const config=campaign18StageConfig(stage,d),base=campaign18Schedule(config,random);
  const mixed=mixCampaignWaves(base.waves,stage,d,random),saved=JSON.stringify(mixed);
  const {mothers,experience}=planZergCampaign(stage,d,mixed,config.durationSeconds);
  assert.equal(JSON.stringify(mixed),saved);
  assert.deepEqual(ZERG_SIX.map(f=>mothers.filter(b=>b.type===f).length),zergCampaignQuotas(stage,d));
  assert.equal(new Set(experience.map(b=>b.id)).size,experience.length);
  assert.ok(experience.every(b=>b.at>=6&&b.at<config.durationSeconds&&b.resources.minerals+b.resources.gas===0));
  assert.ok(experience.filter(b=>b.type==='zergling').length>=Math.floor(experience.length*.8));
 }
});

test('ten thousand experience deaths consume zero normal rewards, drops, reward RNG or kills',()=>{
 const w=battle(true);
 const s=w.expedition.zergEncounters!;
 const before={wallet:{...w.wallet},drops:w.pickups.length,equip:w.starship.account.rng,rng:w.rngState,kills:w.stats.kills,
  loot:structuredClone(w.expedition.mapLootStats)};
 for(let i=0;i<10000;i++){
  const u=w.addUnit(i%5?'zergling':'baneling','zerg',10,10,1,'regular',1,stamp);
  applyExperienceBody(w,u,[.05,.1,.2,.3,.5][i%5] as .05,'r2');
  w.hit(u,1e6,[],1,'terran');
  w.hit(u,1e6,[],1,'terran');
  w.entities.delete(u.id);
 }
 assert.equal(s.counters.experienceKills,10000);
 assert.deepEqual({wallet:w.wallet,drops:w.pickups.length,equip:w.starship.account.rng,rng:w.rngState,kills:w.stats.kills,loot:w.expedition.mapLootStats},before);
});

test('normal six-unit rewards are independent of experience capacity and child deaths',()=>{
 const w=battle(true),state=w.expedition.zergEncounters!;
 const u=foes(w,'aberration',10,9),growth=continuousOrdinaryGrowth(w.difficulty,0);
 assert.equal(u.maxHp,ZERG_ENEMY_BASE.aberration.hp*growth.health);
 const count=w.pickups.length;
 w.hit(u,1e5,[],1,'terran');
 assert.equal(w.stats.kills,1);
 assert.ok(w.pickups.length>count);
 const cap=w.missionEnemyCapacity();
 for(let i=0;i<cap;i++){
  const weak=w.addUnit('zergling','zerg',16,i%26,1,'regular',1,stamp);
  applyExperienceBody(w,weak,.05,'r2');
 }
 clearExperienceFor(w,9);
 assert.equal(w.enemyCount(),cap-9);
 assert.equal(state.counters.cleared,9);
 assert.equal(state.counters.experienceKills,0);
 assert.equal(w.stats.kills,1);
});

test('normal and experience body admission use the real plan, per-step limit and TTL',()=>{
 const w=battle(true),s=w.expedition.zergEncounters!;
 const state=s.counters.experience;
 assert.ok(state.planned>0);
 assert.equal(admitZergEncounters(w,'experience',4),0);
 w.time=s.experience[0].at;
 assert.ok(admitZergEncounters(w,'experience',4)>0);
 assert.ok([...w.entities.values()].filter(isExperience).length<=4);
 assert.equal(state.entered,[...w.entities.values()].filter(isExperience).length);
 const last=s.experience.at(-1)!;
 w.time=last.at+7;
 assert.equal(admitZergEncounters(w,'experience',4),0);
 assert.equal(state.planned,state.entered+state.skipped);
});

test('experience may neither attack a carrier nor stall its phase through nearby threat, including a flight snapshot',()=>{
 const w=battle(true),pod=w.spawnPod('zergling',{x:9,z:0},0,1,true);
 pod.guardTypes=[];w.landPod(pod);
 const e=w.addUnit('roach','zerg',9,1,1,'regular',1,stamp);
 applyExperienceBody(w,e,.05,'r2');
 assert.equal(w.targetAllowed(e,pod),false);
 const hp=pod.hp;
 w.missions.packetSource=structuredClone(e);
 w.entities.delete(e.id);
 w.hit(pod,1e4,[],1,'zerg',0,0,e.id);
 delete w.missions.packetSource;
 assert.equal(pod.hp,hp);
 w.entities.set(e.id,e);w.hash.rebuild([e,pod]);
 w.updatePods();assert.equal(pod.status,'opening');
});

test('real rescue creates the same roster, armor, guard kinds and reward against a full experience crowd',()=>{
 const play=(dense:boolean)=>{
  const w=battle(true);w.stage=12;w.prepareStage();
  assert.ok(spawnMission(w,'rescue'));
  const m=w.missions.active!,r=m.rescue!;
  if(dense){
   const cap=w.missionEnemyCapacity();
   for(let i=0;i<cap;i++){
    const experience=i<180,u=w.addUnit('zergling','zerg',experience?r.center.x+(i%9)*.5:55,experience?r.center.z+(i%7)*.5:55,1,'regular',12);
    if(experience)applyExperienceBody(w,u,.05,'r2');
   }
  }
  let ticks=0;
  while(r.target===null&&ticks++<300)tickRescue(w,m);
  assert.ok(r.target!==null);
  assert.ok(w.enemyCount()<=300);
  const blockers=w.expedition.zergEncounters!.counters.cleared;
  assert.equal(blockers,dense?r.initial:0);
  const body=w.entities.get(r.target)!;
  return {ticks,progress:m.progress,completed:m.completed,reward:m.reward,armor:body.armor,
   target:body.unitType,guards:m.enemyIds.map(id=>w.entities.get(id)!.unitType),friends:r.friends.length};
 };
 assert.deepEqual(play(true),play(false));
});

test('infection converts a real experience victim through zero-reward death, then expires once',()=>{
 const w=battle(true),p=w.addUnit('infestor','terran',0,0),victim=w.addUnit('roach','zerg',1,2);
 applyExperienceBody(w,victim,.05,'r2');victim.hp=1;
 victim.zergSix={infections:[{source:p.id,generation:p.bornAt,owner:'terran',applied:0,next:1,until:6,damage:4}]};
 w.time=1;
 tickZergSixEffects(w);
 const controlled=[...w.entities.values()].find(e=>e.zergSix?.temp?.kind==='converted')!;
 assert.ok(controlled&&isExperience(controlled));
 assert.equal(w.expedition.zergEncounters?.counters.experienceKills,1);
 assert.equal(w.stats.kills,0);assert.equal(w.pickups.length,0);
 w.time=9;tickZergSixEffects(w);
 assert.equal(controlled.hp,0);
 assert.equal(w.expedition.zergEncounters?.counters.experienceKills,1);
 assert.equal(w.pickups.length,0);
});

test('old lightly stamped units migrate only with ambient provenance and the active old wave does not gain new scheduled units',()=>{
 const w=battle(true,true);
 delete w.expedition.zergEncounters;
 const low={...stamp,density:.3 as const};
 const ambient=w.addUnit('roach','zerg',5,6,1,'regular',1,low);
 const guard=w.addUnit('roach','zerg',6,6,1,'regular',1,low);
 guard.guardOrigin=true;
 const snapshot=clone(w);
 const copy=battle(true,true);copy.restoreRun(snapshot);
 assert.ok(isExperience(copy.entities.get(ambient.id)));
 assert.ok(!isExperience(copy.entities.get(guard.id)));
 assert.ok(copy.expedition.zergEncounters?.legacyOnly);
 assert.equal(copy.expedition.zergEncounters?.counters.mother.planned,0);
});

test('enemy infection has a real four-second one-source DOT; a lethal tick never acquires an ally',()=>{
 const w=battle(),u=foes(w,'infestor',0,4),target=sentry(w,0,0),second=foes(w,'infestor',.5,4);
 w.hash.rebuild(w.entities.values());
 assert.ok(launchWeaponFlight(w,u,target,[],0,1));
 assert.ok(launchWeaponFlight(w,second,target,[],0,1));
 tickWeaponFlights(w,1);
 const marks=target.zergSix?.infections!;
 assert.equal(marks.length,1);assert.equal(marks[0].until,4);
 assert.equal(marks[0].owner,'zerg');assert.equal(infectionWeakness(w,target),.05);
 target.hp=1;
 advance(w,1.03);
 assert.equal(target.hp,0);
 assert.equal([...w.entities.values()].filter(e=>e.zergSix?.temp?.kind==='converted').length,0);
});

test('enemy Viper applies its warning, slows in the cloud, and never displaces defenders',()=>{
 const w=battle(),u=foes(w,'viper',0,5),target=sentry(w,0,0);
 u.moveSpeed=0;u.weaponCooldown=100;u.nextShotAt=100;
 const before={x:target.x,z:target.z};
 let warned=false,slowed=false;
 for(let i=0;i<520;i++){
  w.step();
  warned||=w.visualEvents.some(e=>e.zergCue==='enemy-warning'&&e.entityId===u.id);
  slowed||=enemyCloudMoveFactor(w,target)<1;
 }
 assert.ok(warned&&slowed);
 assert.equal(target.zergSix?.displacement,undefined);
 assert.ok(Math.hypot(target.x-before.x,target.z-before.z)<3);
});

test('endless planning advances one absolute minute at a time through 36 rounds in all four difficulties',()=>{
 for(const d of ['easy','normal','hard','hell'] as const){
  const w=battle(true);w.difficulty=d;
  const s:EndlessState={round:1,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{},pacing:initialEndlessPacing(d)};
  w.endless=s;beginZergEncounters(w,[],0);
  const r2=w.expedition.zergEncounters!;
  const quota=ZERG_ENDLESS.countPerWindow[d].reduce((a,b)=>a+b,0);
  let roundBoundary=s.pacing!.duration;
  for(let minute=0;s.round<=36;minute++){
   w.time=minute*60;
   while(w.time>=roundBoundary&&s.round<=36){s.pacing=advanceEndlessPacing(s,d,roundBoundary);s.round++;roundBoundary+=s.pacing.duration;}
   if(s.round>36)break;
   const before=r2.counters.mother.planned;
   admitZergEncounters(w,'mother',0);
   assert.equal(r2.counters.mother.planned-before,quota);
   assert.equal(r2.nextMinute,minute+1);
   admitZergEncounters(w,'mother',0);
   assert.equal(r2.counters.mother.planned-before,quota);
   assert.equal(new Set(r2.experience.map(b=>b.id)).size,r2.experience.length);
   r2.counters.experience.skipped+=r2.experience.length;
   r2.experience.length=0;
  }
 }
});

test('enemy shell uses the original HP damage receipt, with its separate enemy thresholds',()=>{
 const w=battle(),a=foes(w,'aberration',0,5);
 a.hp=a.maxHp*.29;
 recordZergSixHit(w,a,a.maxHp*.35);
 assert.equal(a.zergSix?.strain,a.maxHp*.25);
 assert.equal(a.zergSix?.shellReady,24);
 assert.equal(zergShellReduction(w,a),.15);
});

test('enemy Devourer acid stacks share the difficulty cap and expire',()=>{
 const w=battle(),t=sentry(w,0,0);
 const enemies=Array.from({length:5},(_,i)=>foes(w,'devourer',.03*i,4));
 w.hash.rebuild(w.entities.values());
 for(const u of enemies)assert.ok(launchWeaponFlight(w,u,t,[],0,1));
 tickWeaponFlights(w,1);
 assert.equal(t.zergSix?.corrosion?.layers,2);
 assert.equal(corrosionArmor(w,t),.5);
 w.time=4.01;
 assert.equal(corrosionArmor(w,t),0);
});

test('each experience tier scales life and armor independently of its common output',()=>{
 const w=battle(true);
 w.stage=16;
 const frozen={stage:16,progress:.87,density:1} as const;
 for(const type of ['zergling','roach','baneling'] as const){
  const baseline=w.addUnit(type,'zerg',8,8,1,'regular',1,frozen);
  for(const health of [.05,.1,.2,.3,.5] as const){
   const weak=w.addUnit(type,'zerg',8,8,1,'regular',1,frozen);
   applyExperienceBody(w,weak,health,health===.5?'legacy':'r2');
   assert.equal(weak.maxHp,Math.max(1,baseline.maxHp*health));
   assert.equal(weak.armor,baseline.armor*health);
   assert.equal(weak.weaponDamage,baseline.weaponDamage*.2);
   assert.equal(weak.attackPeriod,baseline.attackPeriod);
   assert.equal(weak.moveSpeed,baseline.moveSpeed);
  }
 }
});

test('enemy hosts deploy real capped locusts and leave them to expire after the mothers die',()=>{
 const w=battle(true);
 w.difficulty='normal';
 w.starship.enabled=false;
 w.entities.clear();
 const target=w.addUnit('marine','terran',0,0);
 target.hp=target.maxHp=3000;
 target.moveSpeed=0;target.weaponDamage=0;target.nextShotAt=target.weaponCooldown=100;
 const hosts=Array.from({length:8},(_,i)=>foes(w,'swarm_host',i%4-2,4+(i>=4?2:0)));
 advance(w,7);
 const parentIds=new Set(hosts.map(u=>u.id));
 const locusts=()=>[...w.entities.values()].filter(u=>u.hp>0&&u.owner==='zerg'&&u.zergSix?.temp?.kind==='locust'&&parentIds.has(u.zergSix.temp.parent));
 assert.ok(locusts().length>=2&&locusts().length<=12,'legal birth positions and the shared admission budget may leave slots unfilled');
 assert.ok(hosts.every(u=>locusts().filter(child=>child.zergSix?.temp?.parent===u.id).length<=2));
 assert.ok(target.hp<target.maxHp);
 const spawned=w.expedition.zergEncounters!.counters.children;
 for(const host of hosts)w.hit(host,1e5,[],1,'terran');
 assert.ok(hosts.every(host=>host.hp<=0));
 assert.equal(locusts().length,spawned);
 const deadline=Math.max(...locusts().map(u=>u.zergSix!.temp!.until));
 w.time=deadline+TUNING.step;
 tickZergSixEffects(w);
 assert.equal(locusts().length,0);
 assert.equal(w.expedition.zergEncounters!.counters.children,spawned);
});

test('a saved field preserves remaining experience packets and an infection kill through expiry',()=>{
 const w=battle(true,true);
 w.entities.clear();
 const p=w.addUnit('infestor','terran',w.anchor.x,w.anchor.z);
 p.weaponCooldown=100;p.nextShotAt=100;
 const target=w.addUnit('roach','zerg',w.anchor.x+1,w.anchor.z);
 applyExperienceBody(w,target,.1,'r2');
 target.moveSpeed=0;target.nextShotAt=target.weaponCooldown=100;target.hp=1;
 target.zergSix={infections:[{source:p.id,generation:p.bornAt,owner:'terran',applied:0,next:1,until:6,damage:40}]};
 w.hash.rebuild(w.entities.values());
 const saved=clone(w),copy=battle(true,true);
 copy.restoreRun(saved);
 assert.equal(copy.paused,true);
 copy.paused=false;
 const signature=(world:World)=>({
  counters:structuredClone(world.expedition.zergEncounters!.counters),
  queue:world.expedition.zergEncounters!.experience.map(e=>[e.id,e.at]),
  controls:[...world.entities.values()].filter(e=>e.hp>0&&e.zergSix?.temp?.kind==='converted').map(e=>({id:e.id,bornAt:e.bornAt,temp:e.zergSix?.temp})),
  kills:world.stats.kills,pickups:world.pickups.length,
 });
 for(const seconds of [1.1,5.7,2.5]){
  advance(w,seconds);advance(copy,seconds);
  assert.deepEqual(signature(copy),signature(w));
  if(seconds===1.1){
   assert.equal(w.expedition.zergEncounters!.counters.experienceKills,1);
   assert.equal(signature(w).controls.length,1);
  }
 }
 assert.ok(w.expedition.zergEncounters!.counters.experience.entered>0);
 assert.ok(signature(w).controls.every(e=>e.bornAt>1.1));
});

test('active enemy mothers and real children on both teams round-trip without changing kill credit',()=>{
 const w=battle(true,true),anchor={...w.anchor};
 w.entities.clear();
 const friendly=w.addUnit('swarm_host','terran',anchor.x,anchor.z);
 const enemy=foes(w,'swarm_host',anchor.x+4,anchor.z);
 const visible=w.addUnit('marine','terran',anchor.x+1,anchor.z);
 visible.weaponCooldown=100;visible.nextShotAt=100;
 const ground=w.addUnit('roach','zerg',anchor.x+3,anchor.z);
 ground.weaponCooldown=100;ground.nextShotAt=100;ground.moveSpeed=0;
 advance(w,6);
 const children=[...w.entities.values()].filter(u=>u.hp>0&&u.zergSix?.temp?.kind==='locust');
 const allyChild=children.find(u=>u.owner==='terran'),foeChild=children.find(u=>u.owner==='zerg');
 assert.ok(allyChild&&foeChild);
 assert.equal(zergSixKillCredit(w,allyChild.id),friendly.id);
 assert.equal(zergSixKillCredit(w,foeChild.id),foeChild.id);
 const copy=battle(true,true);
 copy.restoreRun(clone(w));
 for(const u of [friendly,enemy,allyChild,foeChild]){
  const restored=copy.entities.get(u.id)!;
  assert.deepEqual(restored.zergSix,u.zergSix);
  assert.deepEqual(restored.enemySix,u.enemySix);
  assert.equal(restored.team,u.team);
  assert.equal(restored.rewardOwnerId,u.rewardOwnerId);
 }
 assert.equal(zergSixKillCredit(copy,allyChild.id),friendly.id);
 copy.entities.get(friendly.id)!.hp=0;
 assert.equal(zergSixKillCredit(copy,allyChild.id),allyChild.id);
});

test('enemy Brood warning fixes the landing point and only its second valid round can hatch',()=>{
 const w=battle(true),a=foes(w,'brood_lord',0,5),target=sentry(w,0,0);
 w.hash.rebuild(w.entities.values());
 a.shotSequence=1;warnEnemyBrood(w,a,target);
 assert.ok(launchWeaponFlight(w,a,target,[],0,1));
 tickWeaponFlights(w,1);assert.equal(target.hp,3000);
 w.time=.71;tickWeaponFlights(w,1);
 assert.ok(target.hp<3000);
 assert.equal(w.expedition.zergEncounters!.counters.children,0);
 a.shotSequence=2;warnEnemyBrood(w,a,target);assert.ok(launchWeaponFlight(w,a,target,[],0,1));
 w.time=1.42;tickWeaponFlights(w,1);
 assert.equal(w.expedition.zergEncounters!.counters.children,1);
 const before=target.hp;
 a.shotSequence=3;warnEnemyBrood(w,a,target);assert.ok(launchWeaponFlight(w,a,target,[],0,1));
 target.x=4;w.hash.rebuild(w.entities.values());w.time=2.13;tickWeaponFlights(w,1);
 assert.equal(target.hp,before);
});
