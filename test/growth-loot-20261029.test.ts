import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {ELITES} from '../src/data/elites';
import {continuousEndlessGrowth} from '../src/data/enemy-tuning';
import {absorbReaper,effectiveReaperGrowth,eliteStatModifiers} from '../src/simulation/combat/terran-elite-runtime';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {newEquipmentAccount,collectEquipment,grantEquipment,equipmentRandom} from '../src/simulation/starship/inventory';
import {dropEnemyEquipment,dropPlunderEquipment,planTaskEquipment,deliverTaskEquipment,planOrdinaryEncounterEquipment,equipmentDropPolicy} from '../src/simulation/starship/drops';
import {spawnEncounter,tickEncounters,flushEncounterRewards,goldenEquipmentNodes} from '../src/simulation/encounters/runtime';
import {spawnFunEncounter,funDeath,commitFunMedical} from '../src/simulation/encounters/expanded';
import {spawnMission,tickMissions} from '../src/simulation/missions/runtime';
import {tickHives} from '../src/simulation/missions/encounters';
import {beginSpecialStage,markSpecialReady,finishSpecialStage,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {resolveSpecialResource} from '../src/simulation/special-stages/rewards';
import type {Difficulty} from '../src/data/stages';
import type {Entity} from '../src/simulation/types';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function world(difficulty:Difficulty='easy',stage=7,seed=529){
 const w=new World({difficulty,seed,race:'terran',sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount(seed)});
 w.start();w.stage=stage;w.prepareStage();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();
 for(const channel of Object.values(w.expedition.production))channel.enabled={};return w;
}
function hunter(w:World){w.entities.clear();w.heroes.clear();w.expedition.familySlots=['reaper'];assert.ok(w.acquireElite('reaper.3'));return w.eliteOwned('reaper.3')!;}
function absorb(w:World,h:Entity,elite?:'reaper.1'|'reaper.2',rank=1){const u=w.addUnit('reaper','terran',2,0,rank);if(elite){u.eliteId=elite;u.modelKey=ELITES[elite].model;w.refreshStats(u,true);}assert.ok(absorbReaper(w,h,u));return u;}
const items=(w:World)=>Object.values(w.starship.account.items);
test('repeated elite acquisition adds exactly one doubled contribution and still respects reservations and hunter cap',()=>{
 const w=world(),h=hunter(w);
 for(let n=0;n<4;n++)for(const id of ['reaper.1','reaper.2'] as const){const before=effectiveReaperGrowth(w,h);assert.ok(w.canAcquireElite(id));assert.ok(w.acquireElite(id));const receipt=w.terranElites.absorptions.at(-1)!;near(effectiveReaperGrowth(w,h)-before,receipt.contribution*2);assert.equal(w.eliteOwned(id),undefined);}
 for(let n=1;n<5;n++)assert.ok(w.acquireElite('reaper.3'));assert.equal(w.canAcquireElite('reaper.3'),false);
 w.pendingElites.push('reaper.1');assert.equal(w.canAcquireElite('reaper.1'),false);w.pendingElites=[];
 const save=w.captureRun(),copy=world();copy.restoreRun(save);near(effectiveReaperGrowth(copy,copy.entities.get(h.id)!),effectiveReaperGrowth(w,h));assert.deepEqual(copy.terranElites.absorptions,w.terranElites.absorptions);
});
test('ordinary growth remains permanent beyond speed caps without replaying absorbed bodies',()=>{
 const w=world(),h=hunter(w);let previous=eliteStatModifiers(w,h);const initialArmor=previous.armor;
 for(let n=0;n<260;n++){const u=absorb(w,h);assert.equal(absorbReaper(w,h,u),false);const now=eliteStatModifiers(w,h);assert.ok(now.damage>previous.damage&&now.hp>previous.hp);assert.ok(now.speed>=previous.speed&&now.move>=previous.move);assert.ok(now.armor<initialArmor+10);previous=now;}
 near(previous.speed,2);near(previous.move,1.35);near(effectiveReaperGrowth(w,h),260);assert.equal(w.terranElites.absorptions.length,260);
});
test('old raw absorption receipts upgrade on restore without changing money, bodies or wound fraction',()=>{
 const w=world(),h=hunter(w);absorb(w,h,'reaper.1',5);absorb(w,h,undefined,3);const g=h.eliteCombat!.absorbed;
 const expected=eliteStatModifiers(w,h),save=w.captureRun(),saved=save.state.entities.get(h.id)!;
 saved.weaponDamage/=expected.damage;saved.weaponDamage*=1+3*g/(g+20);saved.maxHp/=expected.hp;saved.maxHp*=1+4*g/(g+20);saved.hp=saved.maxHp*.37;saved.attackPeriod*=expected.speed;saved.moveSpeed/=expected.move;
 const copy=world(),before=structuredClone(save.state.terranElites.absorptions);copy.restoreRun(save);const restored=copy.entities.get(h.id)!;
 near(restored.hp/restored.maxHp,.37);near(restored.weaponDamage,h.weaponDamage);near(restored.attackPeriod,h.attackPeriod);near(restored.moveSpeed,h.moveSpeed);assert.deepEqual(copy.terranElites.absorptions,before);assert.deepEqual(copy.wallet,save.state.wallet);
 const roundTrip=world();roundTrip.restoreRun(copy.captureRun());near(roundTrip.entities.get(h.id)!.weaponDamage,restored.weaponDamage);near(roundTrip.entities.get(h.id)!.hp,restored.hp);
});
test('special-stage entry and return preserve elite-derived hunter growth',()=>{
 const w=world(),h=hunter(w);absorb(w,h,'reaper.2',5);const damage=h.weaponDamage,period=h.attackPeriod,raw=structuredClone(w.terranElites.absorptions);
 assert.ok(beginSpecialStage(w,'resources','fixture'));assert.ok(markSpecialReady(w));near(w.entities.get(h.id)!.weaponDamage,damage);near(w.entities.get(h.id)!.attackPeriod,period);
 assert.ok(finishSpecialStage(w,'timeout'));near(w.entities.get(h.id)!.weaponDamage,damage);assert.deepEqual(w.terranElites.absorptions,raw);
});
test('rank-V combined hunter retains steady single-target output at its real attack cadence',()=>{
 function damage(combined:boolean){const w=world();w.entities.clear();w.heroes.clear();const group=(['reaper.3','reaper.1','reaper.2'] as const).map(id=>{const u=w.addUnit('reaper','terran',0,0,5);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);return u;});if(combined)for(const u of group.slice(1))assert.ok(absorbReaper(w,group[0],u));
  const target=w.addUnit('roach','zerg',4,0);target.hp=target.maxHp=1e10;target.armor=0;target.attributes=[];target.shield=0;w.hash.rebuild(w.entities.values());const next=new Map(group.map(u=>[u.id,0]));let start=0;
  for(let tick=0;tick<3600;tick++){w.time=tick/60;for(const u of group)if(u.hp>0&&w.time>=next.get(u.id)!){w.fire(u,target);next.set(u.id,w.time+u.attackPeriod);}tickWeaponFlights(w,1/60);if(tick===1799)start=target.hp;}
  return start-target.hp;
 }
 const separate=damage(false),combined=damage(true);assert.ok(combined/separate>=.99&&combined/separate<1.12,`steady ratio ${combined/separate}`);
});
for(const difficulty of ['easy','normal','hard','hell'] as const)test(difficulty+' endless ordinary and special weapon/skill growth applies once at 1/6/12/16/24',()=>{
 const w=world(difficulty,18);let first:any;
 for(const round of [1,6,12,16,24]){const seconds=(round-1)*60,stamp={stage:18,progress:1,endlessSeconds:seconds,density:1 as const},regular=w.addUnit('roach','zerg',25,0,1,'regular',18,stamp),boss=w.spawnSpecial('ravager','boss',{x:25,z:5},stamp)!;
  const now={hp:regular.maxHp,damage:regular.weaponDamage,armor:regular.armor,period:regular.attackPeriod,boss:boss.weaponDamage,skill:boss.specialDamageMultiplier!,bossArmor:boss.armor};first??=now;
  const g=continuousEndlessGrowth(seconds);near(now.damage/first.damage,g.damage);near(now.boss/first.boss,g.damage);near(now.skill/first.skill,g.damage);near(now.hp/first.hp,g.health);near(now.armor,first.armor);near(now.bossArmor,first.bossArmor);
  w.refreshStats(boss);near(boss.weaponDamage,now.boss);w.entities.delete(regular.id);w.entities.delete(boss.id);
 }
 near(continuousEndlessGrowth(300).damage,1.1**5);near(continuousEndlessGrowth(900).damage,1.1**5*1.16**10);assert.ok(continuousEndlessGrowth(300.001).damage>continuousEndlessGrowth(300).damage);
});

test('endless Ravager impact and Queen acid ticks deal the increased damage exactly once',()=>{
 function impact(difficulty:Difficulty,type:'ravager'|'queen',round:number){
  const w=world(difficulty,18);w.entities.clear();w.heroes.clear();
  const target=w.addUnit('marine','terran',0,0);target.hp=target.maxHp=1e7;target.armor=0;target.shield=0;
  const source=w.spawnSpecial(type,'boss',{x:5,z:0},{stage:18,progress:1,endlessSeconds:(round-1)*60,density:1})!;source.specialReady=0;source.corrosiveBileReady=0;
  w.hash.rebuild(w.entities.values());w.enemySpecials.act(source,1/60);assert.equal(w.enemySpecials.casts.length,1);
  const cast=w.enemySpecials.casts[0];w.time=cast.at;w.enemySpecials.update(1/60);
  if(type==='queen')for(let tick=1;tick<=240;tick++){w.time=cast.at+tick/60;w.statuses.tick(w.time,(s,amount,owner)=>{const body=w.entities.get(s.target);if(body)w.hit(body,amount,[],1,owner,0,1,s.source);});}
  const damage=1e7-target.hp;assert.ok(damage>0);w.enemySpecials.update(1/60);near(1e7-target.hp,damage);return damage;
 }
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(const type of ['ravager','queen'] as const){const first=impact(difficulty,type,1);for(const round of [6,12,16,24])near(impact(difficulty,type,round)/first,continuousEndlessGrowth((round-1)*60).damage);}
});
test('one natural drop per body, final easy boss minimum green, explicit plunder still extra',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){const w=world(difficulty,18);for(let i=0;i<100;i++){const u=w.addUnit('roach','zerg',20,0);u.enemyTier=i%2?'elite':'boss';const n=dropEnemyEquipment(w,u);assert.ok(n.length<=1);if(difficulty==='easy'&&u.enemyTier==='boss')assert.ok(w.starship.account.items[n[0]].quality>=2);assert.deepEqual(dropEnemyEquipment(w,u),[]);w.entities.delete(u.id);}}
 const w=world(),u=w.addUnit('roach','zerg',20,0);u.enemyTier='boss';assert.equal(dropEnemyEquipment(w,u).length,1);assert.ok(dropPlunderEquipment(w,u));assert.equal(items(w).length,2);assert.equal(dropPlunderEquipment(w,u),undefined);
});
for(const difficulty of ['easy','normal','hard','hell'] as const)test(difficulty+' golden repetition counts paid events across restore; unstarted events do not spend a reward',()=>{
 let w=world(difficulty);const expected=difficulty==='easy'?[4,2,1]:[8,4,2];
 for(const total of expected){assert.equal(goldenEquipmentNodes(w).reduce((n,x)=>n+x,0),total);assert.ok(spawnEncounter(w,'golden',true));for(let i=0;i<120;i++)tickEncounters(w);const m=w.encounters.active!,u=w.entities.get(m.subject!)!,n=items(w).length;w.hit(u,1e12,[],1,'terran',0,1);flushEncounterRewards(w);assert.equal(items(w).length-n,total);tickEncounters(w);const copy=world(difficulty);copy.restoreRun(w.captureRun());copy.paused=false;w=copy;}
});
test('already generated golden plans retain old promised items after restore',()=>{
 const w=world();assert.ok(spawnEncounter(w,'golden'));const m=w.encounters.active!;m.plans=Array.from({length:10},(_,i)=>i%2?[planOrdinaryEncounterEquipment(w,{difficulty:'easy',stage:7,tier:'regular'},m.id+':node:'+(i+1),i===9?4:1)!]:[]);
 const copy=world();copy.restoreRun(w.captureRun());copy.paused=false;for(let i=0;i<120;i++)tickEncounters(copy);copy.hit(copy.entities.get(copy.encounters.active!.subject!)!,1e12,[],1,'terran',0,1);assert.equal(items(copy).length,8);
});
test('infected healing and death share cumulative milestones, including restore between victims',()=>{
 const w=world('hard');const healer=w.addUnit('medivac','terran',0,2);assert.ok(spawnFunEncounter(w,'infectedTerrans'));const m=w.encounters.expanded.short!;
 for(let i=0;i<2;i++){const u=w.entities.get(m.actors[i])!;commitFunMedical(w,healer,u,u.maxHp);funDeath(w,u);flushEncounterRewards(w);}assert.equal(items(w).length,0);
 const copy=world('hard');copy.restoreRun(w.captureRun());copy.paused=false;const restored=copy.encounters.expanded.short!;
 for(let i=2;i<10;i++){const u=copy.entities.get(restored.actors[i])!;funDeath(copy,u);funDeath(copy,u);flushEncounterRewards(copy);assert.equal(items(copy).length,[3,6,10].filter(n=>n<=i+1).length);}
 assert.equal(items(copy).length,3);assert.ok(items(copy).every(i=>i.slot.startsWith('offense')));
});
test('hive group freezes one first reward and one 50 percent completion trial; restore never rerolls',()=>{
 let bonus=0;
 for(let seed=1;seed<=12;seed++){const w=world('easy',7,seed);assert.ok(spawnMission(w,'hives'));const m=w.missions.active!,plans=structuredClone(m.hiveEquipment!);bonus+=Number(!!plans.completion);const copy=world('easy',7,seed);copy.restoreRun(w.captureRun());copy.paused=false;const restored=copy.missions.active!;
  const first=copy.missions.bodies.get(restored.bodyIds[0])!;first.hp=0;tickHives(copy,restored);tickMissions(copy);assert.equal(items(copy).length,1);
  for(const b of copy.missions.bodies.values())b.hp=0;tickHives(copy,restored);tickMissions(copy);assert.equal(items(copy).length,1+Number(!!plans.completion));tickMissions(copy);assert.equal(items(copy).length,1+Number(!!plans.completion));}
 assert.ok(bonus>0&&bonus<12);
});
test('arena rewards use cumulative five elite deaths, not chosen spawn IDs, and resource counts differ by difficulty',()=>{
 for(const stage of [4,7,13]){const w=world('hard',stage);assert.ok(beginSpecialStage(w,'arena','fixture'));markSpecialReady(w);const a=w.specialStages.active!,actors=a.enemies.map(id=>w.entities.get(id)!).reverse();let elites=0,bosses=0;
  for(const u of actors){if(u.arenaElite)elites++;else bosses++;dropEnemyEquipment(w,u);dropEnemyEquipment(w,u);assert.equal(items(w).length,bosses+Math.floor(elites/5));}assert.equal(items(w).length,stage===4?2:stage===7?3:4);}
 for(const difficulty of ['easy','normal','hard','hell'] as const){const w=world(difficulty,13);assert.ok(beginSpecialStage(w,'resources','fixture'));markSpecialReady(w);for(const b of w.specialStages.active!.resources.values()){b.hp=0;resolveSpecialResource(w,b.id);resolveSpecialResource(w,b.id);}assert.equal(items(w).length,difficulty==='easy'?5:7);}
});
test('easy premium rewards are weighted rather than always selecting the rarest quality',()=>{
 const w=world('easy',13);const counts=[0,0,0,0];for(let n=0;n<1000;n++){const plan=planOrdinaryEncounterEquipment(w,{difficulty:'easy',stage:13,tier:'regular'},'premium:'+n,1,true)!;counts[plan.items[0].item.quality]++;}
 assert.ok(counts[1]>540&&counts[1]<660);assert.ok(counts[3]>5&&counts[3]<40);
});
