import {bindBattleView} from '../src/ui/controls/battle-actions';
const heroView={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FAMILIES_BY_RACE} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {HEROES,ALL_HERO_IDS} from '../src/data/heroes';
import {acquireExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {tickNativeMode} from '../src/simulation/combat/expedition-combat';
import {familyModeState,vikingLandingBlocked,FAMILY_MODES} from '../src/simulation/combat/family-actions';
import {COMMAND_ACTIONS,actionForCode,battleActionState,activateBattleAction} from '../src/ui/controls/battle-actions';
import {skillPages,stickSkill} from '../src/ui/controls/skills';
import {canSupply,applySupply,supplyEligibility} from '../src/simulation/progression/supply-cards';
import {updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {draftContext} from '../src/simulation/expedition-economy';
import {inspectReinforcementPool} from '../src/simulation/progression/expedition-drafts';
import {blocked,distance} from '../src/simulation/movement/steering';
import {CharTerrain} from '../src/data/terrain';
const make=(extra:any={})=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],...extra});w.start();w.entities.clear();for(const p of Object.values(w.expedition.production))p!.enabled={};return w;};
test('all five native mode families cancel unfinished transitions without changing combat resources',()=>{
 for(const family of Object.keys(FAMILY_MODES) as (keyof typeof FAMILY_MODES)[]){const w=make(),u=w.addUnit(family,'terran',0,0);w.expedition.tech['unlock.hellion']=1;const [base,next]=FAMILY_MODES[family];u.hp-=10;u.energy=17;u.nextShotAt=23;const before=[u.hp,u.shield,u.energy,u.nextShotAt];assert.ok(w.setFamilyMode(family,next[0]));if(family==='tank'){w.updateTank(u,0,1/60);assert.ok(u.modeTimer>0);assert.ok(w.setFamilyMode(family,base[0]));assert.equal(u.modeTimer,0);}else{tickNativeMode(w,u);assert.ok(u.nativeModeUntil!==undefined);assert.ok(w.setFamilyMode(family,base[0]));assert.equal(u.nativeModeUntil,undefined);}assert.deepEqual([u.hp,u.shield,u.energy,u.nextShotAt],before);}
});
test('Viking waits at occupied landing point, cancel returns immediately, saved transition remains valid',()=>{
 const w=make(),u=w.addUnit('viking','terran',0,0),other=w.addUnit('marine','terran',0,0);assert.ok(vikingLandingBlocked(w,u));assert.ok(w.setFamilyMode('viking','viking_assault'));tickNativeMode(w,u);w.time=5;tickNativeMode(w,u);assert.equal(u.flying,true);assert.equal(familyModeState(w,'viking').blocked,1);const c=make();c.restoreRun(w.captureRun());c.paused=false;assert.equal(familyModeState(c,'viking').blocked,1);assert.ok(c.setFamilyMode('viking','viking'));assert.equal(c.entities.get(u.id)!.nativeModeUntil,undefined);other.hp=0;tickNativeMode(w,u);assert.equal(u.flying,false);
});
test('simultaneous Vikings reserve ground footprints by completed body; static and boundary landing fail',()=>{
 const w=make(),a=w.addUnit('viking','terran',0,0),b=w.addUnit('viking','terran',0,0);w.setFamilyMode('viking','viking_assault');tickNativeMode(w,a);tickNativeMode(w,b);w.time=5;tickNativeMode(w,a);tickNativeMode(w,b);assert.equal(a.flying,false);assert.equal(b.flying,true);a.x=w.mapHalf;assert.ok(vikingLandingBlocked(w,a));a.x=0;w.obstacles.push({x:0,z:0,w:3,h:3});assert.ok(vikingLandingBlocked(w,a));
});
test('mixed cloak can switch off without energy; failed blink and modes preserve transfer and cooldowns',()=>{
 const w=make(),a=w.addUnit('banshee','terran',0,0),b=w.addUnit('banshee','terran',1,0);w.expedition.tech.cloak=1;a.cloaked=true;a.energy=b.energy=0;assert.ok(w.castFamilyAbility('banshee'));assert.equal(a.cloaked,false);assert.equal(!!b.cloaked,false);const plan={} as any;w.talentTransferPlan=plan;assert.equal(w.castFamilyAbility('stalker',{x:0,z:0}),false);assert.equal(w.setFamilyMode('hellion','hellbat'),false);assert.equal(w.stim(),false);assert.equal(w.issueMove({x:NaN,z:0}),false);assert.equal(w.talentTransferPlan,plan);
});
test('held directional input detours a wall, release stops and never resumes older click order',()=>{
 const w=make({obstacles:[{x:2,z:0,w:1,h:2}]});w.addUnit('marine','terran',-3,0);w.anchor.x=0;w.anchor.z=0;w.issueMove({x:-20,z:0});w.input={x:1,z:0};for(let i=0;i<150;i++){w.step();assert.equal(blocked(w.anchor,.8,w.obstacles),false);}assert.ok(w.anchor.x>3,JSON.stringify(w.anchor));assert.equal(w.order,null);w.resetDirectionalInput();const before={...w.anchor};w.advance(.5);assert.deepEqual(w.anchor,before);const dto=JSON.stringify(w.captureRun());assert.ok(!dto.includes('directionRoute'));
});
test('fixed shortcuts and dynamic pages cover manual operations; unused radial sectors select nothing',()=>{
 const w=make();for(const family of ['tank','hellion','viking','thor','lurker','banshee','stalker'] as const)w.addUnit(family,'terran',0,0);w.expedition.tech['unlock.hellion']=w.expedition.tech.cloak=w.expedition.tech.blink=1;for(const item of COMMAND_ACTIONS)assert.equal(actionForCode(item.code),item.id);assert.equal(actionForCode('Digit3'),'hero-slot-2');const pages=skillPages(w);assert.ok(pages.flat().some(s=>s.id==='viking-mode'));const partial=pages.at(-1)!;if(partial.length<6){const a=partial.length*Math.PI/3;assert.equal(stickSkill(Math.sin(a),-Math.cos(a),null,partial),null);}const unit=w.familyBodies('viking')[0];unit.hp=0;assert.equal(battleActionState(w,'viking-mode').visible,false);assert.equal(Object.values(FAMILIES_BY_RACE).flat().length,30);assert.equal(Object.keys(ELITES).length,90);assert.equal(Object.keys(HEROES).length,18);
});
test('same-line paid shop deliveries coexist, retain capacity and release exactly once',()=>{
 const w=make();assert.ok(applySupply(w,'marine',1,'pod',{minerals:50,gas:0}));assert.ok(canSupply(w,'marine',1,'pod'));assert.ok(applySupply(w,'marine',1,'pod',{minerals:51,gas:0}));const before=structuredClone(w.expedition.ledger),restored=make();restored.restoreRun(w.captureRun());assert.deepEqual(restored.expedition.ledger,before);assert.equal(restored.nextJob,w.nextJob);updateExpeditionProduction(w,0,false);assert.equal(w.expedition.ledger.length,2);for(const [index,j] of w.expedition.ledger.entries()){assert.equal(j.state,'risk');assert.deepEqual(j.passengers.map(p=>p.paid),before[index].passengers.map(p=>p.paid));const p=w.pods.find(p=>p.id===j.podId)!;assert.ok(releasePaidPassenger(w,p,0,{x:index*3,z:0}));assert.equal(releasePaidPassenger(w,p,0,{x:index*3,z:0}),null);}assert.equal(w.familyUnits('marine').length,2);assert.ok(applySupply(w,'marine',3,'pod',{minerals:150,gas:0}));assert.equal(canSupply(w,'marine',1,'pod'),false);assert.ok(supplyEligibility(w,'marine',1,'pod').reasons.includes('capacity'));
});
test('pool inspection consumes no RNG, offers no wallet filtering and exposes actual conditional weights',()=>{
 const w=make(),before=w.captureRun(),rows=inspectReinforcementPool(draftContext(w));assert.deepEqual(w.captureRun(),before);w.wallet={minerals:999999,gas:999999};assert.deepEqual(inspectReinforcementPool(draftContext(w)),rows);assert.ok(rows.some(r=>r.effect.kind==='supply'));assert.ok(rows.every(r=>Number.isFinite(r.weight)&&r.weight>0));assert.ok(supplyEligibility(w,'stalker',1,'pod').reasons.includes('race'));
});

test('all 18 recruited heroes share slot dispatch, preserve shot timing and reject repeated cooldown or death',()=>{
 for(const id of ALL_HERO_IDS){const w=make({race:HEROES[id].race});w.heroes.clear();assert.ok(acquireExpeditionHero(w,id,()=>true));const hero=w.heroEntity(id)!;hero.x=hero.z=0;hero.nextShotAt=21;
 for(const family of ['marine','tank','zealot'] as const){const u=w.addUnit(family,'terran',1,0);u.hp=1;u.shield=0;}
 const e=w.addUnit('roach','zerg',2,0);e.hp=e.maxHp=100000;w.hash.rebuild(w.entities.values());bindBattleView(w,()=>heroView);assert.equal(battleActionState(w,'hero-slot-0').enabled,w.canCastHero(id,heroView),id);assert.ok(activateBattleAction(w,'hero-slot-0'),id);assert.equal(hero.nextShotAt,21,id);const stable=()=>structuredClone({entities:w.entities,casts:w.heroCasts,wallet:w.wallet,heroes:w.heroes,rng:w.rngState});const after=stable();assert.equal(activateBattleAction(w,'hero-slot-0'),false,id);assert.deepEqual(stable(),after,id);hero.hp=0;w.heroes.get(id)!.skillReady=0;assert.equal(battleActionState(w,'hero-slot-0').enabled,false,id);assert.equal(activateBattleAction(w,'hero-slot-0'),false,id);}
});

test('direction input crosses an actual ramp legally, preserves analog speed in a narrow passage and turns immediately',()=>{
 const terrain=new CharTerrain(),r=make({terrain});r.addUnit('marine','terran',20,0);r.anchor={x:20,z:0,facing:Math.PI/2};r.input={x:1,z:0};for(let i=0;i<120;i++){const before={...r.anchor};r.step();assert.ok(terrain.canStep(before,r.anchor,.8));assert.ok(distance(before,r.anchor)<.1);}assert.ok(r.anchor.x>28);assert.equal(terrain.height(r.anchor),3);
 const n=make({obstacles:[{x:-2,z:0,w:2,h:12},{x:2,z:0,w:2,h:12}]});n.addUnit('marine','terran',0,-4);n.anchor={x:0,z:-4,facing:0};n.input={x:0,z:.25};const start={...n.anchor};for(let i=0;i<120;i++){n.step();assert.equal(blocked(n.anchor,.8,n.obstacles),false);}assert.ok(Math.abs(n.anchor.z-start.z-2.8)<1e-6);assert.equal(n.anchor.x,0);n.input={x:0,z:-1};const last=n.anchor.z;n.step();assert.ok(n.anchor.z<last);n.resetDirectionalInput();const stopped={...n.anchor};n.advance(.2);assert.deepEqual(n.anchor,stopped);
});

test('a multi-stalker blink revalidates each landing after the previous body moves, preserving resources and rejecting blocked repeats',()=>{
 const w=make({race:'protoss'}),a=w.addUnit('stalker','terran',-3,0),b=w.addUnit('stalker','terran',-3,2);w.expedition.tech.blink=1;for(const u of [a,b]){u.hp-=10;u.shield!-=10;u.nextShotAt=19;}
 const before=[a,b].map(u=>[u.hp,u.shield,u.energy,u.nextShotAt]);assert.ok(w.castFamilyAbility('stalker',{x:2,z:0}));assert.ok(distance(a,b)>=a.unitRadius+b.unitRadius+.1);assert.ok([a,b].every(u=>(u.abilityReady??0)>0));assert.deepEqual([a,b].map(u=>[u.hp,u.shield,u.energy,u.nextShotAt]),before);const points=[a,b].map(u=>[u.x,u.z,u.abilityReady]);assert.equal(w.castFamilyAbility('stalker',{x:2,z:0}),false);assert.deepEqual([a,b].map(u=>[u.x,u.z,u.abilityReady]),points);
});
