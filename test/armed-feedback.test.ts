import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newArmedSupport} from '../src/simulation/combat/armed-support-state';
import {tickArmedSupport,armedStageKey} from '../src/simulation/combat/armed-support';
import {recordArmedAttackProc,armedOrderSeconds} from '../src/simulation/combat/armed-procs';
import {prepareArmedField,tickArmedFields} from '../src/simulation/combat/armed-fields';
import {planArmedField} from '../src/simulation/combat/armed-fire-plan';
import {prepareArmedFleet} from '../src/simulation/combat/armed-fleet-dispatch';
import {tickUnique,uniquePrimary,castTactical} from '../src/simulation/combat/unique-support';
import {productionQuote} from '../src/simulation/expedition-production';
import {recordArmedFormalDeath} from '../src/simulation/combat/armed-reinforcements';
import type {ArmedId} from '../src/simulation/progression/build-progress';
function setup(...ids:ArmedId[]){const w=new World({race:'terran',seed:11113,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.missions.enabled=w.encounters.enabled=false;w.starship.enabled=false;const a=w.expedition.support.armed??=newArmedSupport();for(const id of ids)a.ranks[id]=1;for(const u of w.allies())u.stoppedUntil=1000;const e=w.addUnit('roach','zerg',0,5);e.hp=e.maxHp=1e6;e.armor=0;e.moveSpeed=e.weaponDamage=0;return {w,a,e,u:w.allies()[0]};}
test('CD readiness and idle steps never grant a card; failed fire rolls spend no CD; one weapon cycle rolls once',()=>{
 const {w,a,e,u}=setup('B03');w.advance(2);assert.equal(a.nextCast,1);w.random=()=>.99;w.fire(u,e);w.advance(.1);assert.equal(a.readyTick.B03,undefined);w.random=()=>0;w.fire(u,e);const pending=structuredClone(a.procs);recordArmedAttackProc(w,u);assert.deepEqual(a.procs,pending);tickArmedSupport(w);assert.equal(a.nextCast,2);const deadline=a.readyTick.B03;const copy=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());assert.deepEqual(copy.expedition.support.armed!.procs,a.procs);w.advance(38);assert.equal(a.nextCast,2);assert.equal(a.readyTick.B03,deadline);
});
test('fleet probability is driven by formal fire and cannot be triggered by a temporary passenger',()=>{
 const {w,a,e,u}=setup('B06');const air=w.addUnit('mutalisk','zerg',2,6);air.hp=air.maxHp=1e6;air.weaponDamage=0;w.random=()=>0;u.temporary=true;w.fire(u,e);tickArmedSupport(w);assert.equal(a.nextCast,1);u.temporary=false;w.fire(u,e);tickArmedSupport(w);assert.equal(a.deployments.length,3);assert.equal(a.readyTick.B06,1500);
});
test('W03 rolls only at a new order, keeps preview pure, and freezes successful work with an internal CD',()=>{
 const {w,a}=setup('W03');let rolls=0;w.random=()=>{rolls++;return .99;};const q=productionQuote(w,'marine');productionQuote(w,'marine');assert.equal(rolls,0);assert.equal(armedOrderSeconds(w,10),10);assert.equal(a.readyTick.W03,undefined);w.random=()=>0;assert.equal(armedOrderSeconds(w,10),8.8);assert.equal(armedOrderSeconds(w,10),10);w.tick=15;assert.equal(armedOrderSeconds(w,10),8.8);assert.ok(q.seconds>0);
});
test('B09 requires a successful event, applies its true buff and has no manual-card activation',()=>{
 const {w,a,e,u}=setup('B09');w.expedition.support.unique.levels['terran.overdrive']=1;const before=u.attackPeriod;assert.equal(castTactical(w),false);w.random=()=>.99;w.fire(u,e);tickArmedSupport(w);assert.equal(w.expedition.support.unique.activeUntil,0);w.random=()=>0;w.fire(u,e);tickArmedSupport(w);assert.ok(u.attackPeriod<before);assert.equal(a.readyTick.B09,3600);
});
test('B02 deals 5 percent maximum HP per second to each captured body, including bosses; late entrants are excluded',()=>{
 const {w,a,e}=setup('B02');e.maxHp=e.hp=1000;const boss=w.addUnit('roach','zerg',.8,5);boss.enemyTier='boss';boss.maxHp=boss.hp=1000;boss.armor=0;boss.weaponDamage=0;const key=armedStageKey(w),f=prepareArmedField(w,'B02',key)![0];f.id=w.nextId++;a.fields=[f];w.tick=f.activeTick;tickArmedFields(w,key);const late=w.addUnit('roach','zerg',0,5);late.maxHp=late.hp=1000;late.armor=0;for(let n=1;n<=3;n++){w.tick=f.activeTick+60*n;tickArmedFields(w,key);}assert.equal(e.hp,850);assert.equal(boss.hp,850);assert.equal(late.hp,1000);assert.equal(a.fields.length,0);
});
test('W09 requires 1.5 units of actual rearward displacement, not a mostly-sideways movement',()=>{
 const {w,a}=setup('W09');a.rear={point:{x:0,z:0},threat:{x:0,z:5}};w.anchor.x=3;w.anchor.z=-.1;assert.equal(prepareArmedField(w,'W09',armedStageKey(w)),null);w.anchor.z=-1.49;assert.equal(prepareArmedField(w,'W09',armedStageKey(w)),null);w.anchor.z=-1.5;const f=prepareArmedField(w,'W09',armedStageKey(w))![0];assert.deepEqual(f.point,{x:0,z:0});assert.equal(f.activeTick-w.tick,30);
});
test('G02 settles two actual 12 damage shots and emits two distinct port/trace receipts',()=>{
 const {w,a,e}=setup('G02');w.expedition.support.unique.levels['terran.bunker']=1;const id=w.nextId++;w.fortifications.set(id,{id,x:0,z:3,hp:1200,maxHp:1200,armor:2,unitRadius:1.6,flying:false,attributes:['Mechanical','Structure'],owner:'terran',race:'terran',team:'player',kind:'bunker',nextActionAt:0,supportUntil:30,supportRank:1,supportOrigin:{cardId:'G02',castId:a.nextCast++,slot:0,landTick:0}});tickUnique(w);assert.equal(e.maxHp-e.hp,12);w.time=.08;tickUnique(w);assert.equal(e.maxHp-e.hp,24);const shots=w.visualEvents.filter(e=>e.supportVisual==='bunker-shot');assert.equal(shots.length,2);assert.notEqual(shots[0].x,shots[1].x);assert.deepEqual(shots.map(s=>s.time),[0,.08]);
});
test('G07 records the actual hop path at launch and only damages the next body on arrival',()=>{
 const {w,a,e,u}=setup('G07');w.expedition.support.unique.levels['terran.ricochet']=1;const next=w.addUnit('roach','zerg',1.2,5);next.maxHp=next.hp=1000;next.armor=0;w.random=()=>0;uniquePrimary(w,u,e,100);const p=w.expedition.support.unique.packets[0];assert.ok(p);assert.equal(next.hp,1000);assert.equal(w.visualEvents.at(-1)!.supportVisual,'ricochet');w.time=p.at;tickUnique(w);assert.equal(next.hp,970);assert.equal(w.visualEvents.find(e=>e.supportVisual==='ricochet-hit')?.supportSound,'impact-source:'+u.id);assert.ok(a.readyTick.G07!>0);
});
test('salvo rows and fleet entry axes follow left/right threats instead of the squad facing',()=>{
 for(const sign of [-1,1]){const {w}=setup('B04','B06');w.anchor.facing=0;const target={x:sign*7,z:0};const shots=planArmedField(w,'B04',target);const first=shots.filter(s=>s.tick===Math.min(...shots.map(s=>s.tick))),last=shots.filter(s=>s.tick===Math.max(...shots.map(s=>s.tick)));assert.ok((last.reduce((n,s)=>n+s.point.x,0)/last.length-first.reduce((n,s)=>n+s.point.x,0)/first.length)*sign>0);const air=w.addUnit('mutalisk','zerg',sign*7,0);air.hp=1e6;const fleet=prepareArmedFleet(w,'B06',armedStageKey(w),p=>p)!;assert.ok(fleet.deployments.every(d=>d.point.x*sign>0));}
});
test('a saved successful attack opportunity is consumed once, while its CD survives restoration',()=>{
 const {w,a,e,u}=setup('B03');w.random=()=>0;w.fire(u,e);assert.ok(a.procs!.pending.B03!==undefined);const copy=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());copy.paused=false;tickArmedSupport(copy);const state=copy.expedition.support.armed!;assert.equal(state.deployments.length,4);assert.equal(state.procs!.pending.B03,undefined);const next=state.nextCast,ready=state.readyTick.B03;tickArmedSupport(copy);assert.equal(state.nextCast,next);assert.equal(state.readyTick.B03,ready);
});
test('N04 percentage ticks resume without repeating the pre-checkpoint tick or skipping the last tick',()=>{
 const {w,a,e}=setup('B02','N04');e.maxHp=e.hp=1000;const key=armedStageKey(w),f=prepareArmedField(w,'B02',key)![0];f.id=w.nextId++;a.fields=[f];w.tick=f.activeTick;tickArmedFields(w,key);w.tick=f.activeTick+60;w.time=w.tick/60;tickArmedFields(w,key);assert.equal(e.hp,950);const copy=new World({race:'terran',waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());tickArmedFields(copy,key);assert.equal(copy.entities.get(e.id)!.hp,950);for(let i=2;i<=4;i++){copy.tick=f.activeTick+i*60;copy.time=copy.tick/60;tickArmedFields(copy,key);}assert.equal(copy.entities.get(e.id)!.hp,800);assert.equal(copy.expedition.support.armed!.fields.length,0);
});
test('G03 and O01 rescue rolls need a new deduplicated formal death; idle steps and attacks cannot retry',()=>{
 const {w,a,e,u}=setup('G03','O01');let rolls=0;w.random=()=>{rolls++;return .99;};for(let i=0;i<10;i++){const victim=w.addFamilyMember('marine',{x:0,z:0});w.hit(victim,1e6,[],1,'zerg');const afterDeath=rolls;recordArmedFormalDeath(w,victim,false);assert.equal(rolls,afterDeath);}assert.ok(rolls>=11);assert.equal(a.readyTick.G03,undefined);assert.equal(a.readyTick.O01,undefined);const saved=rolls;w.fire(u,e);w.advance(2);assert.equal(rolls,saved);assert.equal(a.counter!.activation,undefined);assert.equal(a.procs!.pending.G03,undefined);
});
test('N06 cannot bypass its base cards event chances while idle or after CD expiry',()=>{
 const {w,a,e,u}=setup('W01','W04','N06');w.advance(1);assert.equal(a.nextCast,1);w.random=()=>.99;w.fire(u,e);tickArmedSupport(w);assert.equal(a.nextCast,1);w.random=()=>0;w.fire(u,e);tickArmedSupport(w);assert.ok(a.nextCast>1);const next=a.nextCast;w.advance(62);assert.equal(a.nextCast,next);
});
