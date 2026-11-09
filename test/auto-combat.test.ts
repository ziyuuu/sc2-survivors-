import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ALL_FAMILIES} from '../src/data/races';
import {squadActor} from '../src/simulation/combat/tactics/intent';
import {approachSearches} from '../src/simulation/movement/melee-approach';
import {movementIntent} from '../src/simulation/combat/tactics/intent';
import {responsibility} from '../src/simulation/combat/tactics/candidates';
import {distance} from '../src/simulation/movement/steering';
import {defenseSnapshot,applyPredictedHit,packetEstimate,nextAttackEstimate,type PredictedHit} from '../src/simulation/combat/tactics/estimates';
import {committedHits} from '../src/simulation/combat/tactics/commitments';
import {holdForFlight,tacticsDiagnostics} from '../src/simulation/combat/tactics/planner';
import {planNativeMode} from '../src/simulation/combat/tactics/modes';
import {expeditionDamage,tickAutoAbilities,tickNativeMode} from '../src/simulation/combat/expedition-combat';
import {familyModeState} from '../src/simulation/combat/family-actions';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {launchProtossChildAttack} from '../src/simulation/combat/hero-attack-upgrades';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const world=()=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:619});w.start();w.entities.clear();w.anchor.x=w.anchor.z=0;w.anchorStoppedFor=1;return w;};
test('AC-01 tail retains movement after anchor arrival, including a target in firing range',()=>{
 const w=world(),u=w.addUnit('marine','terran',-6,0),enemy=w.addUnit('roach','zerg',-6,3);enemy.stoppedUntil=100;w.hash.rebuild(w.entities.values());
 w.issueMove({x:4,z:0});w.anchor.x=4;w.order!.arrived=true;const deadline=u.nextShotAt;
 for(let i=0;i<20;i++)w.step();assert.ok(movementIntent(w,u));assert.ok(u.x>-6);assert.ok(u.nextShotAt>=deadline);
});
test('AC-02 siege survives movement and restore; only explicit unsiege releases the tank',()=>{
 const w=world(),u=w.addUnit('tank','terran',0,0);w.toggleTanks();for(let i=0;i<180;i++)w.step();assert.equal(u.mode,'siege');
 w.issueMove({x:8,z:0});const p={x:u.x,z:u.z};for(let i=0;i<120;i++)w.step();assert.ok(distance(u,p)<1e-6);
 const restored=world();restored.restoreRun(w.captureRun());restored.paused=false;const tank=restored.entities.get(u.id)!;assert.equal(tank.desiredMode,'siege');restored.toggleTanks();for(let i=0;i<240;i++)restored.step();assert.equal(tank.mode,'tank');assert.ok(distance(tank,p)>1);assert.equal(tank.desiredMode,'tank');
});
test('AC-03 ranged intercepts Baneling before wounded boss; melee uses its own responsibilities',()=>{
 const w=world(),gun=w.addUnit('marine','terran',0,0),blade=w.addUnit('zergling','terran',0,-1),boss=w.addUnit('roach','zerg',1,0),bane=w.addUnit('baneling','zerg',5,0),caster=w.addUnit('high_templar','zerg',4,1);boss.hp=1;caster.energy=100;w.hash.rebuild(w.entities.values());
 assert.equal(w.findTarget(gun,10)?.id,bane.id);assert.ok(responsibility(w,blade,caster)<responsibility(w,blade,bane));assert.equal(w.findTarget(blade,10)?.id,caster.id);
});
test('AC-04 neighboring target rings reserve distinct world positions',()=>{
 const w=world(),a=w.addUnit('zergling','terran',0,0),b=w.addUnit('zergling','terran',0,.2),x=w.addUnit('roach','zerg',4,0),y=w.addUnit('roach','zerg',4,.2);a.attackTarget=x.id;b.attackTarget=y.id;
 const p=w.combatSlots.goal(a,x,[a,b],w.anchor,w.time,w.mapHalf,w.obstacles,w.terrain),q=w.combatSlots.goal(b,y,[a,b],w.anchor,w.time,w.mapHalf,w.obstacles,w.terrain);assert.ok(distance(p,q)>=a.unitRadius+b.unitRadius+.04);
});
test('AC-05 each armor/shield/barrier packet matches actual settlement without advancing RNG',()=>{
 for(const type of ['roach','stalker','immortal'] as const)for(const armor of [0,2,12])for(const hits of [1,2,4]){
  const w=world(),u=w.addUnit('marine','terran',0,0),b=w.addUnit(type,'zerg',2,0);b.hp=b.maxHp=200;b.armor=armor;b.shield=type==='roach'?0:13;b.shieldArmor=3;b.talentShield=5;
  const state=defenseSnapshot(w,b)!,before=JSON.stringify(w.captureRun()),p:PredictedHit={raw:10,hits,shieldBonus:2,penetration:0,minimum:.5,at:w.time,source:u,key:'test',confidence:'flight'};
  applyPredictedHit(state,p);assert.equal(JSON.stringify(w.captureRun()),before,'prediction is read-only');
  const actual=expeditionDamage(w,b,p.raw,hits,.5,0,u.owner,armor,u.id,2);b.hp-=actual;near(state.hp,b.hp);near(state.shield,b.shield??0);near(state.barrier,b.barrier??0);near(state.talentShield,b.talentShield??0);
 }
});
test('AC-05 ordinary frozen packet estimate matches live attackHit with multi-hit shields',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0),b=w.addUnit('stalker','zerg',3,0);b.hp=b.maxHp=500;b.shield=7;b.armor=3;b.shieldArmor=2;
 const packet=packetEstimate(w,u,b,12,[{attribute:'Armored',amount:4}],3,2,1.5)!;
 const state=defenseSnapshot(w,b)!;applyPredictedHit(state,{...packet,source:u,at:w.time,key:'frozen',confidence:'flight'});
 w.attackHit(u,b,12,[{attribute:'Armored',amount:4}],3,2,true,1.5);near(state.hp,b.hp);near(state.shield,b.shield!);
});
test('AC-06 sufficient first attacker leaves surplus fire for another target; soft plans never stop all fire',()=>{
 const w=world(),a=w.addUnit('marine','terran',0,0),b=w.addUnit('marine','terran',0,.8),boss=w.addUnit('roach','zerg',2,0),trash=w.addUnit('roach','zerg',3,1);boss.hp=10;boss.armor=0;trash.hp=100;w.hash.rebuild(w.entities.values());
 a.attackTarget=w.findTarget(a,10)!.id;b.attackTarget=w.findTarget(b,10)!.id;assert.equal(a.attackTarget,boss.id);assert.equal(b.attackTarget,trash.id);assert.equal(holdForFlight(w,a,boss),false);
 trash.hp=0;b.attackTarget=w.findTarget(b,10)!.id;assert.equal(b.attackTarget,boss.id);assert.equal(holdForFlight(w,b,boss),false);
});
test('AC-05 flight credit is removed immediately on loss, death or invisibility',()=>{
 const w=world(),u=w.addUnit('marauder','terran',0,0),b=w.addUnit('roach','zerg',3,0);b.hp=1;w.hash.rebuild(w.entities.values());w.fire(u,b);assert.equal(w.weaponFlights.length,1);assert.equal(committedHits(w,b).length,1);
 const p=w.weaponFlights[0];p.lost=true;assert.equal(committedHits(w,b).length,0);p.lost=false;b.cloaked=true;assert.equal(committedHits(w,b).length,0);b.cloaked=false;b.hp=0;assert.equal(committedHits(w,b).length,0);
});
test('AC-07 automatic storm chooses useful damage instead of overkilling the largest weak cluster',()=>{
 const w=world(),u=w.addUnit('high_templar','terran',0,0);u.energy=200;w.expedition.tech.storm=1;
 for(let i=0;i<4;i++){const e=w.addUnit('zergling','zerg',3+i*.1,0);e.hp=1;}
 const valuable=w.addUnit('roach','zerg',0,5);valuable.hp=valuable.maxHp=200;valuable.armor=1000;w.hash.rebuild(w.entities.values());tickAutoAbilities(w,u);
 const storm=w.expedition.spells.find(s=>s.kind==='storm')!;assert.ok(storm);near(storm.x,valuable.x);near(storm.z,valuable.z);const energy=u.energy;tickAutoAbilities(w,u);near(u.energy,energy);
});
test('AC-08 manual and legacy mode provenance persists, with consistent button next action',()=>{
 const w=world(),u=w.addUnit('lurker','terran',0,0);u.nativeMode=u.desiredNativeMode='lurker_burrowed';u.autoMode={mode:'lurker_burrowed',since:0};w.refreshStats(u);
 assert.equal(familyModeState(w,'lurker').next,'lurker');w.setFamilyMode('lurker','lurker');const before=u.desiredNativeMode;
 for(let i=0;i<120;i++){w.time+=1/60;planNativeMode(w,u);tickNativeMode(w,u);}assert.equal(u.desiredNativeMode,before);
 const saved=w.captureRun(),copy=world();copy.restoreRun(saved);const restored=copy.entities.get(u.id)!;assert.deepEqual(restored.autoMode,u.autoMode);assert.equal(copy.expedition.familyModes.lurker,'lurker');
 delete restored.autoMode;delete copy.expedition.familyModes.lurker;restored.nativeMode=restored.desiredNativeMode='lurker_burrowed';copy.input={x:1,z:0};planNativeMode(copy,restored);assert.equal(restored.desiredNativeMode,'lurker_burrowed');
});
test('AC-08 Viking will not auto-land on an occupied position or with an air threat',()=>{
 for(const air of [false,true]){const w=world(),u=w.addUnit('viking','terran',0,0);w.addUnit('roach','zerg',3,0);if(air)w.addUnit('mutalisk','zerg',4,0);else w.addUnit('marine','terran',0,0);w.time=2;w.hash.rebuild(w.entities.values());planNativeMode(w,u);assert.notEqual(u.desiredNativeMode,'viking_assault');}
});
test('AC-10 restoration clears derived target and position assignments without spending again',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0),b=w.addUnit('roach','zerg',3,0);w.hash.rebuild(w.entities.values());u.attackTarget=w.findTarget(u,10)!.id;assert.ok(tacticsDiagnostics(w).plans.length);const saved=w.captureRun();w.restoreRun(saved);assert.equal(tacticsDiagnostics(w).plans.length,0);assert.equal(w.entities.get(u.id)!.attackTarget,b.id);assert.deepEqual(w.wallet,saved.state.wallet);
});
test('AC-09 carrier mother contributes no imaginary shot; only its actual child packet is counted',()=>{
 const w=world(),mother=w.addUnit('carrier','terran',0,0),target=w.addUnit('roach','zerg',3,0);initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());const child=ownedInterceptors(w,mother.id)[0];
 assert.equal(nextAttackEstimate(w,mother,target),undefined);assert.equal(committedHits(w,target).length,0);
 launchProtossChildAttack(w,child,mother,target);const hits=committedHits(w,target);assert.equal(hits.length,1);assert.equal(hits[0].source.id,child.id);assert.ok(hits[0].key.startsWith('hero:'));mother.hp=0;assert.equal(committedHits(w,target).length,1,'already launched packet retains its frozen identity');
});
test('AC-05 an area receipt credits each victim once and releases that credit after actual impact',()=>{
 const w=world(),u=w.addUnit('lurker','terran',0,0),target=w.addUnit('roach','zerg',3,0);target.hp=target.maxHp=10000;w.hash.rebuild(w.entities.values());w.fire(u,target);assert.equal(committedHits(w,target).length,1);
 for(let i=0;i<60;i++){w.time+=1/60;tickWeaponAreas(w);}assert.ok(target.hp<target.maxHp);assert.equal(committedHits(w,target).length,0);
});
test('AC-08 all four native mode families accept beneficial changes without overriding a subsequent manual command',()=>{
 for(const family of ['hellion','viking','thor','lurker'] as const){const w=world(),u=w.addUnit(family,'terran',0,0);w.expedition.tech['unlock.hellion']=1;for(let i=0;i<(family==='hellion'?6:1);i++){const b=w.addUnit(family==='thor'?'corruptor':'roach','zerg',family==='hellion'?1.8:4,i*.2);b.hp=b.maxHp=10000;}w.hash.rebuild(w.entities.values());w.time=2;planNativeMode(w,u);assert.notEqual(u.desiredNativeMode??family,family,family);assert.ok(w.setFamilyMode(family,family));w.time=4;planNativeMode(w,u);assert.equal(u.desiredNativeMode,family);}
});
test('AC-07 repeated heal/guardian execution does not double-pay, and accepted cooldowns beat auto casting',()=>{
 const w=world(),a=w.addUnit('queen','terran',0,0),b=w.addUnit('queen','terran',0,1),patient=w.addUnit('roach','terran',2,0);patient.hp=1;a.energy=b.energy=200;
 tickAutoAbilities(w,a);const energy=a.energy,health=patient.hp;tickAutoAbilities(w,a);tickAutoAbilities(w,b);assert.equal(a.energy,energy);assert.equal(b.energy,200);assert.equal(patient.hp,health);assert.equal(w.expedition.spells.filter(s=>s.kind==='transfusion').length,1);
 const sentry=w.addUnit('sentry','terran',1,0),other=w.addUnit('sentry','terran',1,1);sentry.energy=other.energy=200;w.addUnit('hydralisk','zerg',4,0);tickAutoAbilities(w,sentry);tickAutoAbilities(w,other);assert.equal(w.expedition.spells.filter(s=>s.kind==='guardian').length,1);assert.equal(other.energy,200);
 a.abilityReady=w.time+5;const count=w.expedition.spells.length;tickAutoAbilities(w,a);assert.equal(w.expedition.spells.length,count);assert.equal(a.energy,energy);
});
test('AC-09 temporary and summoned bodies never acquire squad allocations',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0),target=w.addUnit('roach','zerg',3,0);u.temporary=true;u.temporaryKind='hero-baneling';w.hash.rebuild(w.entities.values());assert.equal(squadActor(u),false);assert.equal(w.findTarget(u,8)?.id,target.id);assert.equal(tacticsDiagnostics(w).plans.length,0);
});
test('AC-12 current thirty ordinary families retain finite legal combat, with bounded path searches',()=>{
 for(const family of ALL_FAMILIES){const w=world(),u=w.addUnit(family,'terran',0,0);w.expedition.tech.storm=1;w.expedition.tech['unlock.hellion']=1;
  for(const type of ['roach','mutalisk'] as const){const b=w.addUnit(type,'zerg',4,type==='roach'?0:2);b.hp=b.maxHp=10000;b.stoppedUntil=100;}
  for(let i=0;i<180;i++){w.step();assert.ok(approachSearches(w)<=8);}
  assert.ok([u.x,u.z,u.hp,u.energy,u.nextShotAt].every(Number.isFinite),family);const target=w.body(u.attackTarget);if(target)assert.ok(w.targetAllowed(u,target),family);
 }
});
