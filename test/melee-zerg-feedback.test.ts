import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SC2_UNITS} from '../src/data/sc2-units';
import {SOURCE_PRODUCTION_RECIPES} from '../src/data/expansion-units';
import {ELITES} from '../src/data/elites';
import {productionQuote} from '../src/simulation/expedition-production';
import {unitData,selectWeapon,tickNativeMode} from '../src/simulation/combat/expedition-combat';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
import {tickZergEliteState} from '../src/simulation/combat/zerg-elite-runtime';
import {approachChargeProfile,tickApproachCharge,approachIgnoresContact} from '../src/simulation/movement/approach-charge';
import {distance} from '../src/simulation/movement/steering';
import type {UnitType} from '../src/data/sc2-units';
import {setup as mixedFormation} from '../tools/performance-s09-cases.mjs';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function world(){const w=new World({race:'zerg',waves:false,sandbox:true,terrain:false,obstacles:[],seed:619});w.start();w.entities.clear();w.anchor.x=w.anchor.z=0;w.anchorStoppedFor=0;return w;}
function target(w:World,x=6,z=0){const t=w.addUnit('roach','zerg',x,z);t.hp=t.maxHp=1e6;t.weaponDamage=0;t.armor=0;t.stoppedUntil=1e6;return t;}

test('Baneling player adaptation changes new quotes and speed, not the pinned recipe or enemy speed',()=>{
 const w=world(),u=w.addUnit('baneling','terran',0,0),enemy=w.addUnit('baneling','zerg',9,0);
 near(productionQuote(w,'baneling').seconds,20);assert.ok(SOURCE_PRODUCTION_RECIPES.baneling.productionTime>31);
 near(unitData(u).movementSpeed,4.2);near(unitData(enemy).movementSpeed,SC2_UNITS.baneling.movementSpeed);
 w.expedition.cardTotals['production.baneling']=.2;near(productionQuote(w,'baneling').seconds,16);
});
test('only hostile Baneling explosions reduce player Zergling damage by 40%, including armor and overkill',()=>{
 for(const armor of [0,2])for(const hp of [1000,10]){
  const w=world(),b=w.addUnit('baneling','zerg',0,0),ling=w.addUnit('zergling','terran',.8,0),other=w.addUnit('marine','terran',0,.8);
  for(const u of [ling,other]){u.hp=u.maxHp=hp;u.armor=armor;u.attributes=['Light'];}w.hash.rebuild(w.entities.values());
  const raw=(b.weaponDamage+19*(b.weaponDamage/16))*w.enemyDamageFactor(b);w.fire(b,ling);
  near(hp-ling.hp,Math.min(hp,(raw-armor)*.6));near(hp-other.hp,Math.min(hp,raw-armor));
 }
 const w=world(),ling=w.addUnit('zergling','terran',0,0),b=w.addUnit('baneling','zerg',1,0);ling.hp=ling.maxHp=1000;ling.armor=0;
 w.hit(ling,100,[],1,'zerg',0,0,b.id);near(ling.hp,900); // Source identity alone is insufficient: spells are not explosions.
 const enemyLing=w.addUnit('zergling','zerg',4,0),friendlyBane=w.addUnit('baneling','terran',3,0);enemyLing.hp=enemyLing.maxHp=1000;enemyLing.armor=0;w.hash.rebuild(w.entities.values());w.fire(friendlyBane,enemyLing);near(1000-enemyLing.hp,35*1.15);
});
for(const elite of [undefined,'lurker.1','lurker.2','lurker.3'] as const)test(`Lurker ${elite??'ordinary'} uses the same surface spine and deals 60% including research bonuses`,()=>{
 const damage:number[]=[],counts:number[]=[];
 for(const buried of [false,true]){const w=world(),u=w.addUnit('lurker','terran',0,0),t=target(w);w.expedition.tech['weapon.lurker']=2;
  if(elite){u.eliteId=elite;u.modelKey=ELITES[elite].model;}u.nativeMode=u.desiredNativeMode=buried?'lurker_burrowed':'lurker';w.refreshStats(u);selectWeapon(w,u,t);assert.ok(w.canFireAt(u,t));w.fire(u,t);
  counts.push(w.expedition.weaponAreas.length+w.zergElites.lines.length);
  for(let i=0;i<80;i++){w.time+=1/60;tickWeaponAreas(w);tickZergEliteState(w);}damage.push(t.maxHp-t.hp);
  assert.ok(w.visualEvents.some(e=>e.kind==='weapon-area'));assert.ok(damage.at(-1)!>0);
 }
 assert.equal(counts[0],counts[1]);assert.ok(counts[0]>0);near(damage[0],damage[1]*.6);
});
test('player Lurker keeps 70% movement underground, native enemy stays immobile, restoration does not compound stats',()=>{
 const w=world(),u=w.addUnit('lurker','terran',0,0);w.expedition.tech.lurker_deploy=1;w.refreshStats(u);const speed=u.moveSpeed,damage=u.weaponDamage;
 u.desiredNativeMode='lurker_burrowed';tickNativeMode(w,u);w.time=u.nativeModeUntil!;tickNativeMode(w,u);near(u.moveSpeed,speed*.7);near(u.weaponDamage,damage/.6);
 w.input={x:1,z:0};for(let i=0;i<30;i++){w.time+=1/60;w.updateUnit(u,1/60);}assert.ok(u.distanceWalked>.1);assert.equal(u.cloaked,true);
 const copy=world();copy.restoreRun(w.captureRun());const saved=copy.entities.get(u.id)!;for(let i=0;i<5;i++)copy.refreshStats(saved);near(saved.moveSpeed,speed*.7);near(saved.weaponDamage,damage/.6);
 const e=w.addUnit('lurker','zerg',8,0);e.nativeMode=e.desiredNativeMode='lurker_burrowed';w.refreshStats(e);near(e.moveSpeed,0);
});
test('charge eligibility uses both medium/large size and short reach, with an explicit Baneling exception',()=>{
 const w=world();for(const type of ['baneling','roach','ultralisk','zealot','adept'] as UnitType[])assert.ok(approachChargeProfile(w.addUnit(type,'terran',0,0)),type);
 for(const type of ['zergling','thor','colossus','immortal','tank','lurker','ravager','queen','mutalisk'] as UnitType[])assert.equal(approachChargeProfile(w.addUnit(type,'terran',0,0)),undefined,type);
 const hellbat=w.addUnit('hellion','terran',0,0);hellbat.nativeMode='hellbat';w.refreshStats(hellbat);assert.ok(approachChargeProfile(hellbat));
});
test('charge crosses friendly and hostile bodies with no free hit, preserves spent cooldown through restore and respects walls',()=>{
 const w=world(),u=w.addUnit('baneling','terran',0,0),t=target(w,5),ally=w.addUnit('marine','terran',1.5,0),blocker=target(w,2.6);w.hash.rebuild(w.entities.values());const hp=t.hp;
 assert.ok(tickApproachCharge(w,u,t,1/60));assert.ok(approachIgnoresContact(w,u,ally));assert.ok(approachIgnoresContact(w,u,blocker));near(u.approachChargeReadyAt!,4);assert.equal(t.hp,hp);
 const copy=world();copy.restoreRun(w.captureRun());copy.paused=false;const saved=copy.entities.get(u.id)!;assert.deepEqual(saved.approachCharge,u.approachCharge);near(saved.approachChargeReadyAt!,4);
 for(let i=1;i<49;i++){w.time=i/60;tickApproachCharge(w,u,t,1/60);}assert.ok(u.x>3);assert.ok(u.x<=4.000001);assert.ok(distance(u,ally)>=u.unitRadius+ally.unitRadius);assert.ok(distance(u,blocker)>=u.unitRadius+blocker.unitRadius);assert.equal(t.hp,hp);
 assert.equal(tickApproachCharge(w,u,t,1/60),false);near(u.approachChargeReadyAt!,4);
 const wall=world(),b=wall.addUnit('baneling','terran',0,0),v=target(wall,5);wall.obstacles.push({x:1.5,z:0,w:.5,h:8});wall.hash.rebuild(wall.entities.values());for(let i=0;i<60;i++){wall.time=i/60;tickApproachCharge(wall,b,v,1/60);}assert.ok(b.x<1.1,'no wall tunnelling');
});
test('manual movement, invalid targets, crowd control and recovery cancel charge without refunding cooldown',()=>{
 for(const reason of ['move','dead','stun','recover','transform']){const w=world(),u=w.addUnit('baneling','terran',0,0),t=target(w,5);w.hash.rebuild(w.entities.values());tickApproachCharge(w,u,t,1/60);const cooldown=u.approachChargeReadyAt;
  if(reason==='move')w.input={x:-1,z:0};if(reason==='dead')t.hp=0;if(reason==='stun')u.stoppedUntil=5;if(reason==='recover')u.recoveryUntil=1.5;if(reason==='transform')u.nativeModeUntil=1;
  assert.equal(tickApproachCharge(w,u,t,1/60),false,reason);assert.equal(u.approachCharge,undefined);assert.equal(u.approachChargeReadyAt,cooldown);
 }
});
test('melee begins pursuit before the stationary delay and retargets a killed windup target immediately',()=>{
 const w=world(),u=w.addUnit('zergling','terran',0,0),a=target(w,4),b=target(w,5,1);w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);assert.ok(u.x>0);assert.equal(u.attackTarget,a.id);
 u.pendingTarget=a.id;u.windup=.8;u.weaponCooldown=1;u.nextShotAt=0;a.hp=0;u.thinkAt=10;w.updateUnit(u,1/60);assert.equal(u.pendingTarget,null);assert.equal(u.attackTarget,b.id);assert.equal(u.windup,0);assert.ok(u.velocity.x>0);
 w.input={x:-1,z:0};u.approachChargeReadyAt=100;const old=u.x;for(let i=0;i<60;i++)w.step();assert.ok(u.x<old,'retreat overrides pursuit');
});

for(const id of ['zergling','zealot','ultralisk'])test(`${id} reaches and attacks through a live twelve-unit ranged formation`,()=>{
 const {w,u,target,blockers}=mixedFormation({World,ELITES},{id,scenario:'mixed-live'});let first:number|undefined;
 for(let tick=0;tick<600;tick++){w.step();if(u.shotSequence&&first===undefined)first=w.time;}
 assert.ok(first!==undefined&&first<3,`first melee attack: ${first}`);assert.ok(u.shotSequence>3);assert.ok(target.hp<target.maxHp);assert.ok(blockers.some(b=>b.shotSequence>0),'ranged units continue firing');
});

test('melee leaves a nearer unreachable target for an available contact path',()=>{
 const w=world(),u=w.addUnit('zergling','terran',0,0),boxed=target(w,4,0),open=target(w,0,6);
 w.obstacles.push({x:2.8,z:0,w:.4,h:3.4},{x:5.2,z:0,w:.4,h:3.4},{x:4,z:1.5,w:2.8,h:.4},{x:4,z:-1.5,w:2.8,h:.4});
 for(let tick=0;tick<360;tick++)w.step();
 assert.equal(boxed.hp,boxed.maxHp);assert.ok(open.hp<open.maxHp);assert.ok(u.shotSequence>0);
});
