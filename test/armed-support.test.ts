import {armedOrderSeconds,recordArmedAttackProc} from '../src/simulation/combat/armed-procs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectReinforcementPool,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {armedRank,prepareBuildChoices,validateBuildProgress} from '../src/simulation/progression/build-progress';
import {reserveArmedDispatch,armedFormalFree,armedFormalReservations,armedTrainingSeconds,tickArmedSupport} from '../src/simulation/combat/armed-support';
import {validateArmedSupport} from '../src/simulation/combat/armed-support-state';
import type {ArmedId} from '../src/simulation/progression/build-progress';
import {productionQuote,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {observeWorld} from '../src/simulation/observation';
import {planNukeVolley,commitArmedNuke} from '../src/simulation/combat/armed-nukes';
import {commitStrategic,previewStrategic} from '../src/simulation/combat/shop-support';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {armedNodeViews} from '../src/ui/presentation/armed-cards';
import {newArmedSupport} from '../src/simulation/combat/armed-support-state';
import {armedRootPosition,armedDebuff,grantArmedShield,absorbArmedShield} from '../src/simulation/combat/armed-fields';
import {armedContact,armedQueueHandoff,tickArmedHandoffs,tickArmedCalibration} from '../src/simulation/combat/armed-nodes';
import {acquireExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {catalogueCards} from '../src/ui/presentation/intermission';
import {preparePlanetaryTurret,resetPlanetaryTurret,orientPlanetaryTurret} from '../src/render/scene/planetary-turret';
import {Group,Object3D,Vector3} from 'three';

function make(seed=111101){const w=new World({race:'terran',seed,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());w.missions.enabled=w.encounters.enabled=false;w.starship.enabled=false;w.wallet={minerals:1e6,gas:1e6};return w;}
function shopping(w:World){if(w.phase==='battle')w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;}
function offer(w:World,id:ArmedId){shopping(w);const ctx={...draftContext(w),random:w.random,currentOffers:[]};for(let i=0;i<2000;i++){const shelf=drawExpeditionReinforcements(ctx,true),found=shelf.find(r=>r.expeditionEffect.kind==='armedSupport'&&r.expeditionEffect.cardId===id);if(found){w.rewards=shelf;assert.equal(shelf.length,3);return found;}}throw Error('No legal offer '+id);}
function buy(w:World,id:ArmedId){const r=offer(w,id);assert.ok(w.choose(r.offerId),id);return r;}
function own(w:World,...ids:ArmedId[]){const a=w.expedition.support.armed??=newArmedSupport();for(const id of ids)a.ranks[id]=1;return a;}
function proc(w:World){const old=w.random;w.random=()=>0;const u=w.allies().find(u=>!u.temporary&&!u.heroId)!,e=[...w.entities.values()].find(u=>u.owner==='zerg'&&u.hp>0)!;w.fire(u,e);w.random=old;}
function foe(w:World){const e=w.addUnit('roach','zerg',0,8);e.hp=e.maxHp=1e6;e.weaponDamage=0;e.moveSpeed=0;return e;}
function restored(w:World){const other=make(w.runConfig!.seed);other.restoreRun(w.captureRun());other.paused=w.paused;return other;}

test('armed purchase chain records 1→1→2→3, freezes receipts and restores without advancing',()=>{
 const w=make();shopping(w);for(const [id,progress,rank]of [['W01',1,1],['W01',1,2],['W04',2,1],['G01',3,1]] as const){const before={...w.wallet},r=buy(w,id),after={...w.wallet};assert.equal(w.expedition.build!.counts.armed,progress);assert.equal(armedRank(w.expedition.support,id),rank);assert.equal(before.minerals-after.minerals,r.purchaseReceipt!.minerals);assert.equal(before.gas-after.gas,r.purchaseReceipt!.gas);assert.equal(w.choose(r.offerId),false);assert.deepEqual(w.wallet,after);}
 assert.equal(w.expedition.build!.main,null);assert.equal(w.expedition.build!.milestones.length,1);assert.equal(w.expedition.build!.milestones[0].id,'armed:3');
 const copy=restored(w);assert.deepEqual(copy.expedition.build,w.expedition.build);assert.deepEqual(copy.expedition.support.armed,w.expedition.support.armed);
});
test('armed aliases migrate the six candidates, never duplicate execution or backfill old progress',()=>{
 const w=make();w.expedition.support.levels.mines=2;shopping(w);const pool=inspectReinforcementPool(draftContext(w));assert.ok(pool.some(c=>c.id==='armed.G01'));assert.ok(!pool.some(c=>c.id==='support.terran.mines'||c.id==='support.terran.bunker'));
 const r=buy(w,'G01');assert.equal(w.expedition.support.levels.mines,3);assert.equal(w.expedition.build!.counts.armed,1);assert.equal(w.expedition.support.armed!.purchases.length,1);assert.equal(w.choose(r.offerId),false);assert.equal(w.expedition.support.levels.mines,3);
});
test('old checkpoints without build/armed load without granting a milestone or converting legacy support',()=>{
 const w=make();w.expedition.support.levels.mines=2;const snap=w.captureRun();delete snap.state.expedition.build;delete snap.state.expedition.support.armed;const copy=make(w.runConfig!.seed);copy.restoreRun(snap);assert.equal(copy.expedition.build,undefined);assert.equal(copy.expedition.support.armed,undefined);assert.equal(armedRank(copy.expedition.support,'G01'),2);
});
test('legacy unclaimed locks reopen on restore and preserve deferred offers, the paid shelf and receipts',()=>{
 const w=make();buy(w,'W01');buy(w,'W04');buy(w,'G01');
 const m=pendingBuildChoice(w)!;
 assert.ok(w.deferBuildChoice(m.id,w.expedition.shopRevision));
 const snapshot=w.captureRun();snapshot.state.expedition.build!.main='armed';
 const copy=make(w.runConfig!.seed);copy.restoreRun(snapshot);
 assert.equal(snapshot.state.expedition.build!.main,'armed');
 assert.deepEqual(copy.expedition.build,{...snapshot.state.expedition.build,main:null});
 assert.deepEqual(copy.expedition.support.armed,w.expedition.support.armed);
 assert.deepEqual(copy.rewards,w.rewards);assert.deepEqual(copy.wallet,w.wallet);
 assert.equal(pendingBuildChoice(copy),undefined);assert.ok(copy.skipReward());copy.endStage();
 assert.deepEqual(pendingBuildChoice(copy)!.offers,m.offers);
 assert.ok(copy.claimBuildChoice(m.id,copy.expedition.shopRevision,m.offers[0]));
 assert.equal(restored(copy).expedition.build!.main,'armed');
});
test('an armed claim locks only on a valid receipt and retires other branches’ pending nodes',()=>{
 const w=make();buy(w,'W01');buy(w,'W04');buy(w,'G01');
 const b=w.expedition.build!,m=pendingBuildChoice(w)!,rev=w.expedition.shopRevision;
 b.counts.doomsday=3;
 b.milestones.unshift({...m,id:'doomsday:3',branch:'doomsday',offers:[...m.offers]});
 validateBuildProgress(b);
 assert.equal(w.claimBuildChoice('doomsday:3',rev,m.offers[0]),false);
 assert.equal(w.claimBuildChoice(m.id,rev-1,m.offers[0]),false);assert.equal(b.main,null);
 assert.ok(w.claimBuildChoice(m.id,rev,m.offers[0]));assert.equal(b.main,'armed');
 assert.equal(b.counts.doomsday,3);assert.deepEqual(b.milestones,[m]);
 assert.equal(w.claimBuildChoice(m.id,rev,m.offers[0]),false);
 const bad=structuredClone(b);bad.main=null;assert.throws(()=>validateBuildProgress(bad));
 bad.main='armed';bad.orange='O02';assert.throws(()=>validateBuildProgress(bad,w.expedition.support));
 assert.equal(restored(w).expedition.build!.main,'armed');
});
test('node choices freeze two legal candidates, prefer unlearned and survive reopening',()=>{
 const w=make();buy(w,'W01');buy(w,'W04');buy(w,'G01');const b=structuredClone(w.expedition.build);assert.equal(b!.milestones[0].offers.length,2);prepareBuildChoices(w.expedition,()=>{throw Error('Must not reroll');});assert.deepEqual(w.expedition.build,b);
});
test('W01 opens three real passengers once; a partial snapshot never recreates the first passenger',()=>{
 const w=make();buy(w,'W01');w.phase='battle';foe(w);assert.equal(reserveArmedDispatch(w,'W01'),1);w.advance(.25);assert.equal(w.allies().filter(u=>u.armed).length,0);w.advance(.1);assert.equal(w.allies().filter(u=>u.armed).length,1);
 const copy=restored(w);w.advance(.3);copy.advance(.3);for(const world of [w,copy]){const troops=world.allies().filter(u=>u.armed);assert.equal(troops.length,3);assert.ok(troops.every(u=>u.temporary&&u.temporaryKind==='armed'&&Math.abs(u.temporaryUntil!-u.bornAt-12)<1e-6));assert.equal(world.expedition.support.armed!.deployments[0].phase,'ended');}
 assert.deepEqual(copy.allies().filter(u=>u.armed).map(u=>u.id),w.allies().filter(u=>u.armed).map(u=>u.id));for(const u of w.allies())if(!u.temporary)u.stoppedUntil=1000;w.advance(12.5);assert.equal(w.allies().filter(u=>u.armed).length,0);
});
test('W01 actual landing contributes one frozen impact and no duplicate on the same tick',()=>{
 const w=make();buy(w,'W01');w.phase='battle';foe(w);const hits:number[]=[];observeWorld(w,(id,kind,amount)=>{if(id==='armed.W01'&&kind==='damage')hits.push(amount);});reserveArmedDispatch(w,'W01');w.advance(.2);const n=hits.length;assert.ok(n>0);tickArmedSupport(w);assert.equal(hits.length,n);
});
test('W02 reserves the final formal body against another dispatch and releases it once',()=>{
 const w=make();buy(w,'W02');w.phase='battle';const cap=w.familyMemberCap('marine');while(w.familySeatCount('marine')<cap-1)w.addFamilyMember('marine',{x:-5,z:w.familySeatCount('marine')*2});assert.equal(armedFormalFree(w,'marine'),1);reserveArmedDispatch(w,'W02');assert.equal(armedFormalReservations(w,'marine'),1);assert.equal(armedFormalFree(w,'marine'),0);assert.equal(reserveArmedDispatch(w,'W02'),null);w.advance(.6);assert.equal(w.familySeatCount('marine'),cap);assert.equal(armedFormalReservations(w,'marine'),0);assert.ok(w.allies().filter(u=>u.armed).every(u=>!u.temporary));
});
test('W03 quotes only new work, including the 10→8.8 second example',()=>{
 const w=make();const before=productionQuote(w,'marine');buy(w,'W03');const after=productionQuote(w,'marine');assert.equal(after.seconds,before.seconds);w.random=()=>0;assert.equal(armedOrderSeconds(w,10),8.8);assert.equal(armedTrainingSeconds(w,10),8.8);
 const s=w.expedition;s.ledger.push({id:100,family:'marine',line:'barracks',facilityIds:[],remaining:10,state:'training',podId:null,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});w.nextJob=101;w.phase='battle';updateExpeditionProduction(w,8.8,false);assert.ok(Math.abs(s.ledger.at(-1)!.remaining-1.2)<1e-8);
 assert.equal(armedTrainingSeconds(w,3,10),3);assert.equal(armedTrainingSeconds(w,4.2,10),4);
});
test('W04 uses five frozen per-shot receipts and preserves the remaining cursor on restore',()=>{
 const w=make();buy(w,'W04');w.phase='battle';foe(w);reserveArmedDispatch(w,'W04');const v=w.expedition.support.armed!.volleys[0];assert.deepEqual(v.shots.map(s=>s.tick),[6,15,24,33,42]);assert.ok(Math.abs(v.shots[0].damage-32.2)<1e-8);assert.ok(Math.abs(v.shots[0].bonuses![0].amount-24.15)<1e-8);w.advance(.3);assert.equal(v.nextIndex,2);const copy=restored(w);w.advance(.5);copy.advance(.5);assert.equal(w.expedition.support.armed!.volleys.length,0);assert.equal(copy.expedition.support.armed!.volleys.length,0);assert.equal(copy.visualEvents.filter(e=>e.kind==='projectile-impact'&&e.entityId===0).length,3);
});
test('build and armed validation reject corrupt progress, ranks and volley cursors',()=>{
 const w=make();buy(w,'W01');const a=structuredClone(w.expedition.support.armed!);a.ranks.W01=4;assert.throws(()=>validateArmedSupport(a));const b=structuredClone(w.expedition.build!);b.main='armed';assert.throws(()=>validateBuildProgress(b));
});
test('R3 nuclear plans preserve budgets, count clamps, finite inward placement and empty manual ground',()=>{
 const input={origin:'P01' as const,scorched:false,dense:false,tick:100,center:{x:0,z:0},bearing:0,legalTargets:1,budget:2400,radius:6};
 const base=planNukeVolley(input,()=>true);assert.equal(base.points.length,3);assert.equal(base.firstTick,115);assert.equal(base.damagePerHit,800);assert.equal(base.ammoDelta,0);assert.equal(base.gapTicks,5);
 const dense=planNukeVolley({...input,scorched:true,legalTargets:20,budget:3840,radius:7.8},()=>true);assert.equal(dense.points.length,8);assert.equal(dense.firstTick,100);assert.equal(dense.gapTicks,4);assert.equal(dense.damagePerHit,480);assert.equal(dense.ammoDelta,1);
 const edge=planNukeVolley(input,p=>p.x===0&&p.z===0);assert.ok(edge.points.every(p=>p.x===0&&p.z===0));
 const manual=planNukeVolley({...input,origin:'manual',legalTargets:0,budget:7500,radius:10},()=>true);assert.equal(manual.points.length,1);assert.equal(manual.firstTick,280);assert.equal(manual.blastRadius,10);assert.equal(manual.ammoDelta,-1);
});
test('P01 system rounds grant no ammo; N05 grants one per round and manual spends one for the entire saved round',()=>{
 const w=make();buy(w,'P01');w.phase='battle';const target=foe(w),a=w.expedition.support.armed!;assert.ok(commitArmedNuke(w,'P01',target));const ordinary=a.volleys[0];assert.equal(ordinary.shots.length,3);assert.equal(w.expedition.support.ammo,0);assert.equal(ordinary.nextIndex,0);
 w.advance(.5);assert.equal(a.volleys.length,0);a.ranks.N05=1;a.readyTick.P01=w.tick;assert.ok(commitArmedNuke(w,'P01',target));assert.equal(w.expedition.support.ammo,1);const system=a.volleys[0];assert.equal(system.shots.length,5);assert.equal(system.nextIndex,1);assert.ok(w.visualEvents.some(e=>e.kind==='strategic-impact'&&e.time===w.time));
 assert.ok(commitStrategic(w,{x:30,z:30}));assert.equal(w.expedition.support.ammo,0);const manual=a.volleys.find(v=>v.manual)!;assert.equal(manual.shots.length,5);assert.equal(manual.shots[0].damage,2400);assert.ok(Math.abs(manual.shots[0].radius-8.45)<1e-8);w.expedition.support.ammo=1;assert.equal(previewStrategic(w,{x:30,z:30}),false);assert.equal(commitStrategic(w,{x:30,z:30}),false);assert.equal(w.expedition.support.ammo,1);
 const copy=restored(w);for(const world of [w,copy]){world.advance(.4);assert.equal(world.expedition.support.armed!.volleys.length,0);assert.equal(world.expedition.support.ammo,1);assert.ok(previewStrategic(world,{x:30,z:30}));}assert.deepEqual(copy.expedition.support.armed,w.expedition.support.armed);
});
test('real milestone UI offers two purple nodes and rejects stale, double or bypassed claims',()=>{
 const w=make();buy(w,'W01');buy(w,'W04');buy(w,'G01');const m=pendingBuildChoice(w)!,revision=w.expedition.shopRevision,views=armedNodeViews(w);assert.equal(views.length,2);assert.ok(views.every(c=>c.rarity==='purple'&&c.kicker.includes('紫色节点')&&c.free));assert.equal(w.skipReward(),false);assert.equal(w.claimBuildChoice(m.id,revision-1,m.offers[0]),false);
 const copy=restored(w),before={...copy.wallet};assert.deepEqual(armedNodeViews(copy),views);assert.ok(copy.claimBuildChoice(m.id,revision,m.offers[0]));assert.deepEqual(copy.wallet,before);assert.equal(pendingBuildChoice(copy),undefined);assert.equal(copy.claimBuildChoice(m.id,revision,m.offers[0]),false);assert.equal(copy.expedition.build!.counts.armed,3);
});
test('N02 W01 makes four higher-rank passengers; its one reserved extra is temporary and consumed once',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.W01=1;a.ranks.N02=1;a.nodeReserves.N02=1;foe(w);reserveArmedDispatch(w,'W01');const d=a.deployments[0];assert.equal(d.passengers.length,5);assert.equal(a.readyTick.W01,720);assert.equal(a.nodeReserves.N02,0);assert.ok(d.passengers.every(p=>p.rank===2&&!p.formal));w.advance(.8);assert.equal(w.allies().filter(u=>u.armed?.cardId==='W01').length,5);assert.equal(a.nodeReserves.N02,0);
});
test('N02 only living actual G02 sources produce crew, with one clock surviving restore and destruction',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.N02=1;w.expedition.support.unique.levels['terran.bunker']=1;for(const g of w.expedition.building!.groups)g.enabled=false;w.advance(1.6);const fort=[...w.fortifications.values()].find(f=>f.supportOrigin?.cardId==='G02')!;assert.ok(fort);assert.equal(w.allies().filter(u=>u.armed?.cardId==='N02').length,0);w.advance(1.5);assert.equal(w.allies().filter(u=>u.armed?.cardId==='N02').length,1);const copy=restored(w);w.advance(6);copy.advance(6);assert.equal(copy.allies().filter(u=>u.armed?.cardId==='N02').length,2);assert.deepEqual(copy.expedition.support.armed!.crewSources,a.crewSources);w.hit(fort,1e6,[],1,'zerg');w.advance(6);assert.equal(w.allies().filter(u=>u.armed?.cardId==='N02').length,2);assert.equal(Object.keys(a.crewSources).length,0);
});
test('N03 freezes actual elite identity at release and restoration does not reroll the released member',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.W01=1;a.ranks.N03=1;a.nodeReserves.N03=1;foe(w);reserveArmedDispatch(w,'W01');assert.equal(a.nodeReserves.N03,1);w.advance(.35);const first=w.allies().find(u=>u.armed?.cardId==='W01')!;assert.ok(first.eliteId);assert.equal(first.rank,1);assert.equal(first.temporaryUntil!-first.bornAt,12);assert.equal(a.nodeReserves.N03,0);const copy=restored(w);w.advance(.3);copy.advance(.3);assert.deepEqual(copy.allies().filter(u=>u.armed).map(u=>({id:u.id,elite:u.eliteId})),w.allies().filter(u=>u.armed).map(u=>({id:u.id,elite:u.eliteId})));
});
test('P05 has four independent non-shooting bunkers; overlapping auras do not stack or feed N02',()=>{
 const w=make(),a=w.expedition.support.armed!;for(const g of w.expedition.building!.groups)g.enabled=false;const unit=w.allies()[0],before={armor:unit.armor,period:unit.attackPeriod};a.ranks.P05=1;a.ranks.N02=1;foe(w);reserveArmedDispatch(w,'P05');assert.equal(a.deployments.length,4);w.advance(.8);const forts=[...w.fortifications.values()].filter(f=>f.supportOrigin?.cardId==='P05');assert.equal(forts.length,4);for(const f of forts){assert.equal(f.hp,1100);assert.equal(f.armor,3);assert.ok(f.supportUntil!>w.time);}
 unit.x=forts[0].x+2;unit.z=forts[0].z;w.refreshStats(unit);w.advance(.1);assert.equal(unit.armor,before.armor+3);assert.ok(Math.abs(unit.attackPeriod-before.period/1.15)<1e-8);w.advance(1.5);assert.equal(w.allies().filter(u=>u.armed?.cardId==='N02').length,0);assert.equal(w.expedition.support.unique.packets.filter(p=>p.kind==='bunker').length,0);
 for(const f of forts)w.hit(f,1e6,[],1,'zerg');w.advance(.6);w.refreshStats(unit);assert.equal(unit.armor,before.armor);assert.ok(Math.abs(unit.attackPeriod-before.period)<1e-8);assert.ok(a.deployments.every(d=>d.phase==='ended'));
});
test('B05 camps use individual actual land/expiry clocks and destroyed camps cancel unreleased members',()=>{
 const w=make(),a=w.expedition.support.armed!;for(const g of w.expedition.building!.groups)g.enabled=false;a.ranks.B05=1;reserveArmedDispatch(w,'B05');assert.equal(a.deployments.length,2);assert.deepEqual(a.deployments.map(d=>d.landTick),[12,21]);w.advance(.2);const first=a.deployments[0],fort=w.fortifications.get(first.id)!;assert.ok(fort);assert.equal(first.endTick-first.landTick,480);w.hit(fort,1e6,[],1,'zerg');assert.equal(first.phase,'ended');assert.ok(first.passengers.every(p=>p.cancelled));const copy=restored(w);for(const world of [w,copy]){world.advance(1.1);const ds=world.expedition.support.armed!.deployments;assert.equal(ds[0].phase,'ended');assert.ok(ds[0].passengers.every(p=>p.cancelled));assert.equal(ds[1].passengers.filter(p=>p.entityId!==null).length,3);assert.equal(world.allies().filter(u=>u.armed?.cardId==='B05').length,3);}
});
test('G03 listens to committed formal deaths and retains reduced rank after one saved dispatch',()=>{
 const w=make(),a=w.expedition.support.armed!;for(const g of w.expedition.building!.groups)g.enabled=false;w.addFamilyMember('marine',{x:-6,z:0});const unit=w.allies()[0];unit.rank=4;w.refreshStats(unit,true);w.hit(unit,1e6,[],1,'zerg');assert.equal(a.losses.length,1);a.ranks.G03=1;reserveArmedDispatch(w,'G03');assert.equal(a.losses.length,0);const copy=restored(w);for(const world of [w,copy]){world.advance(.7);const replacement=world.allies().filter(u=>u.armed?.cardId==='G03');assert.equal(replacement.length,1);assert.equal(replacement[0].rank,3);assert.equal(replacement[0].temporary,undefined);assert.equal(world.expedition.support.armed!.deathReceipts.length,1);}
});
test('B04 freezes 25 real impacts in 15 beats, including R3 dense last step 81',()=>{
 for(const [dense,last,damage]of [[false,103,86.25],[true,81,99.1875]] as const){const w=make(),a=w.expedition.support.armed!;a.ranks.B04=1;if(dense)a.ranks.N01=1;foe(w);reserveArmedDispatch(w,'B04');const shots=a.volleys[0].shots;assert.equal(shots.length,25);assert.equal(new Set(shots.map(s=>s.tick)).size,15);assert.equal(shots.at(-1)!.tick,last);assert.ok(Math.abs(shots[0].damage-damage)<1e-8);assert.equal(shots[0].splash!.length,3);w.advance(.3);const copy=restored(w),cursor=copy.expedition.support.armed!.volleys[0].nextIndex;copy.advance(2);assert.equal(copy.expedition.support.armed!.volleys.length,0);assert.equal(copy.visualEvents.filter(e=>e.kind==='projectile-impact'&&e.entityId===0).length,25-cursor);}
});
test('B01 requires a successful real-fire roll, emits three rows and then stays on its own CD',()=>{
 const w=make(),a=own(w,'B01'),u=w.allies()[0],e=foe(w);e.z=4;w.random=()=>.99;w.fire(u,e);assert.equal(a.barrage,undefined);w.random=()=>0;u.temporary=true;w.fire(u,e);assert.equal(a.barrage,undefined);u.temporary=false;w.fire(u,e);assert.equal(a.barrage!.remainingRows,3);assert.equal(a.readyTick.B01,2160);u.stoppedUntil=100;w.advance(.11);assert.equal(a.volleys.filter(v=>v.cardId==='B01').length,1);assert.equal(a.volleys[0].shots.length,12);assert.ok(Math.abs(a.volleys[0].shots[0].damage-53.90625)<1e-8);w.advance(2);assert.equal(a.barrage!.remainingRows,0);const saved=structuredClone(a.barrage);w.fire(u,e);assert.deepEqual(a.barrage,saved);assert.equal(a.readyTick.B01,2160);
});

test('P06 freezes all six rows and stops a surviving ordinary target at most once per second',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.P06=1;const enemy=foe(w);reserveArmedDispatch(w,'P06');const shots=a.volleys[0].shots;assert.equal(shots.length,24);assert.deepEqual([...new Set(shots.map(s=>s.tick))],[9,21,33,45,57,69]);enemy.x=shots[0].point.x;enemy.z=shots[0].point.z;w.advance(.2);assert.ok((enemy.stoppedUntil??0)>w.time);assert.equal(a.unitStatus[enemy.id].stopReadyTick,69);const until=enemy.stoppedUntil;w.advance(.3);assert.equal(enemy.stoppedUntil,until);
});
test('G05 has three native rank-III cars, one detonation receipt and one death/retirement burn each',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.G05=1;const enemy=foe(w);reserveArmedDispatch(w,'G05');assert.deepEqual(a.deployments.map(d=>d.passengers[0].exitTick),[9,18,27]);w.advance(.6);const cars=w.allies().filter(u=>u.armed?.cardId==='G05');assert.equal(cars.length,3);assert.ok(cars.every(u=>u.rank===3&&u.temporaryUntil!-u.bornAt===10));const car=cars[0],comparison=w.addUnit('hellion','terran',-10,-10,3);assert.ok(Math.abs(car.attackPeriod-comparison.attackPeriod)<1e-8);w.refreshStats(car);assert.ok(Math.abs(car.attackPeriod-comparison.attackPeriod)<1e-8);car.x=enemy.x;car.z=enemy.z;w.expireUnit(car);assert.equal(w.expedition.support.burns.filter(b=>b.source===car.id&&b.armedCardId==='G05').length,1);w.expireUnit(car);assert.equal(w.expedition.support.burns.filter(b=>b.source===car.id).length,1);
});
test('reserve dispatch waits for the previous real squad, consumes one stock and preserves the normal cooldown',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.B03=1;a.reserves.B03=1;foe(w);reserveArmedDispatch(w,'B03');w.advance(.4);const ready=a.readyTick.B03;assert.equal(w.allies().filter(u=>u.armed?.cardId==='B03').length,4);assert.equal(a.reserves.B03,1);assert.equal(reserveArmedDispatch(w,'B03'),null);for(const u of w.allies().filter(u=>u.armed?.cardId==='B03'))w.expireUnit(u);assert.ok(reserveArmedDispatch(w,'B03'));assert.equal(a.reserves.B03,0);assert.equal(a.readyTick.B03,ready);const copy=restored(w);copy.advance(.5);assert.equal(copy.allies().filter(u=>u.armed?.cardId==='B03').length,4);assert.equal(copy.expedition.support.armed!.reserves.B03,0);
});
test('B08 lands one actual rank-IV siege tank with its native minimum range and eighteen-second service',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.B08=1;foe(w);reserveArmedDispatch(w,'B08');w.advance(.5);const tank=w.allies().find(u=>u.armed?.cardId==='B08')!;assert.ok(tank);assert.equal(tank.rank,4);assert.equal(tank.mode,'siege');assert.equal(tank.attackRange,13);assert.equal(tank.temporaryUntil!-tank.bornAt,18);const p={x:tank.x,z:tank.z},close=w.addUnit('roach','zerg',tank.x+.5,tank.z);assert.equal(w.canFireAt(tank,close),false);w.advance(.3);assert.equal(tank.mode,'siege');assert.deepEqual({x:tank.x,z:tank.z},p);
});
test('P02 creates the three real named elite Thors outside the ordinary cap and retires their actual instances',()=>{
 const w=make(),a=w.expedition.support.armed!;a.ranks.P02=1;for(let i=0;i<18;i++){const u=w.addUnit('marine','terran',-10+i,-10);u.temporary=true;u.temporaryKind='mercenary';u.temporaryUntil=100;}foe(w);assert.ok(reserveArmedDispatch(w,'P02'));w.advance(.4);const thors=w.allies().filter(u=>u.armed?.cardId==='P02');assert.deepEqual(thors.map(u=>u.eliteId),['thor.1','thor.2','thor.3']);assert.ok(thors.every(u=>u.rank===5&&u.temporaryUntil!-u.bornAt===22));for(const u of thors){const before={damage:u.weaponDamage,armor:u.armor};w.refreshStats(u);assert.deepEqual({damage:u.weaponDamage,armor:u.armor},before);assert.equal(w.eliteOwned(u.eliteId!),undefined);}
});

test('W06 freezes its real injured cluster, heals at opening and cannot repeat after restore',()=>{
 const w=make();const a=own(w,'W06'),patients=w.allies();for(const [i,u]of patients.entries()){u.x=i*.25;u.z=0;u.hp=Math.max(1,u.maxHp-50);}const healed:number[]=[];observeWorld(w,(id,kind,amount)=>{if(id==='armed.W06'&&kind==='healed')healed.push(amount);});assert.ok(reserveArmedDispatch(w,'W06'));w.advance(.2);assert.equal(healed.length,0);const copy=restored(w);w.advance(.1);copy.advance(.1);assert.ok(healed.length>0&&healed.length<=4);assert.ok(healed.every(n=>n>0&&n<=35));assert.equal(a.fields![0].captured,true);assert.deepEqual(copy.allies().map(u=>u.hp),w.allies().map(u=>u.hp));const count=healed.length;tickArmedSupport(w);assert.equal(healed.length,count);
});
test('B02 captures once including air; late arrivals stay mobile, same-body roots survive restore',()=>{
 const w=make();own(w,'B02','N04');const e=foe(w),air=w.addUnit('mutalisk','zerg',4,8);air.hp=air.maxHp=1e6;assert.ok(reserveArmedDispatch(w,'B02'));w.advance(.2);const f=w.expedition.support.armed!.fields![0];assert.equal(f.radius,4.5);assert.equal(f.endTick-f.activeTick,240);assert.ok(armedRootPosition(w,e));assert.ok(armedRootPosition(w,air));const late=w.addUnit('zergling','zerg',0,8);tickArmedSupport(w);assert.equal(armedRootPosition(w,late),undefined);const copy=restored(w);assert.deepEqual(armedRootPosition(copy,copy.entities.get(e.id)!),armedRootPosition(w,e));
});
test('G09 repairs an actual damaged temporary fort by eight committed capped ticks, without extending retirement',()=>{
 const w=make();const a=own(w,'W05','G09');foe(w);reserveArmedDispatch(w,'W05');w.advance(.2);const fort=[...w.fortifications.values()].find(f=>f.supportOrigin?.cardId==='W05')!;fort.hp=100;const until=fort.supportUntil;reserveArmedDispatch(w,'G09');w.advance(.7);const f=a.fields!.find(f=>f.cardId==='G09')!;assert.equal(f.ticksLeft,7);const copy=restored(w);w.advance(3.5);copy.advance(3.5);assert.equal(fort.hp,308);assert.equal(copy.fortifications.get(fort.id)!.hp,308);assert.equal(fort.supportUntil,until);assert.equal(a.fields!.some(f=>f.cardId==='G09'),false);
});
test('P03 attaches to saved bodies but oil remains at its frozen ground position; overlapping oil ticks once',()=>{
 const w=make();const a=own(w,'P03');const e=foe(w);const f2=w.addUnit('roach','zerg',.1,8);f2.hp=f2.maxHp=1e6;f2.weaponDamage=0;let oil=0;observeWorld(w,(id,k,n)=>{if(id==='armed.P03'&&k==='damage')oil+=n;});reserveArmedDispatch(w,'P03');w.advance(.3);const point={...a.fields![0].point};assert.equal(armedDebuff(w,e).armor,4);assert.equal(armedDebuff(w,e).damage,.75);assert.equal(armedDebuff(w,e).move,.65);e.x=15;e.prev.x=15;assert.deepEqual(a.fields![0].point,point);const copy=restored(w);w.advance(1);copy.advance(1);assert.ok(oil>0);assert.deepEqual(copy.expedition.support.armed!.fields,a.fields);
});
test('P04/N04 shields absorb two 200 hits from 472.5, preserve source expiry and survive a missing beacon',()=>{
 const w=make();own(w,'P04','N04');const u=w.allies()[0];u.hp=u.maxHp=1000;grantArmedShield(w,u,'P04',1000*.35*1.35,w.tick+480);assert.equal(absorbArmedShield(w,u,200),0);assert.equal(absorbArmedShield(w,u,200),0);assert.ok(Math.abs(w.expedition.support.armed!.unitStatus[u.id].cardShields![0].amount-72.5)<1e-8);const copy=restored(w);assert.ok(Math.abs(absorbArmedShield(copy,copy.entities.get(u.id)!,100)-27.5)<1e-8);grantArmedShield(w,u,'O01',1500,w.tick+720);assert.equal(absorbArmedShield(w,u,100),0);assert.equal(w.expedition.support.armed!.unitStatus[u.id].cardShields!.find(s=>s.source==='O01')!.amount,1472.5);
});
test('G06 creates three individual friendly zerglings and records first-pounce armor only once',()=>{
 const w=make();own(w,'G06');const e=foe(w);reserveArmedDispatch(w,'G06');w.advance(.4);const members=w.allies().filter(u=>u.armed?.cardId==='G06');assert.equal(members.length,3);assert.ok(members.every(u=>u.unitType==='zergling'&&u.rank===2&&u.temporaryUntil!-u.bornAt===12));const u=members[0];w.attackHit(u,e,1,[]);const first=w.expedition.support.armed!.unitStatus[e.id].armorLoss!.untilTick;w.tick++;w.attackHit(u,e,1,[]);assert.equal(w.expedition.support.armed!.unitStatus[e.id].armorLoss!.untilTick,first);
});

test('B06 waits for visible air, uses three distinct real native bodies and restores the pending ordinary cruiser',()=>{
 const w=make();const a=own(w,'B06');foe(w);assert.equal(reserveArmedDispatch(w,'B06'),null);assert.equal(a.readyTick.B06,undefined);const air=w.addUnit('mutalisk','zerg',0,8);air.hp=air.maxHp=1e6;assert.ok(reserveArmedDispatch(w,'B06'));assert.equal(a.deployments.length,3);w.advance(.4);assert.equal(w.allies().filter(u=>u.armed?.cardId==='B06').length,2);const copy=restored(w);w.advance(.3);copy.advance(.3);for(const world of [w,copy]){const cruiser=world.allies().find(u=>u.unitType==='battlecruiser')!;assert.equal(cruiser.rank,3);assert.equal(cruiser.heroId,undefined);assert.equal(cruiser.eliteId,undefined);assert.ok(cruiser.temporaryUntil!-cruiser.bornAt===16);assert.ok(Math.abs(cruiser.maxHp-550*2.6*1.15)<1e-6);assert.equal(world.heroes.has('yamato_battlecruiser'),false);}
});
test('O02 reserves exactly six exclusive bodies and four real opening shells; every arrival retains its own lifetime',()=>{
 const w=make();const a=own(w,'O02');foe(w);assert.ok(reserveArmedDispatch(w,'O02'));assert.equal(a.deployments.length,6);assert.deepEqual(a.volleys[0].shots.map(s=>s.tick),[6,9,12,15]);assert.ok(a.volleys[0].shots.every(s=>s.damage===70));w.advance(.3);assert.equal(w.allies().filter(u=>u.armed?.cardId==='O02').length,3);const copy=restored(w);w.advance(8);copy.advance(8);for(const world of [w,copy]){const troops=world.allies().filter(u=>u.armed?.cardId==='O02');assert.equal(troops.length,6);assert.ok(troops.every(u=>u.rank===5));assert.equal(troops.filter(u=>u.unitType==='thor').length,3);assert.equal(troops.find(u=>u.eliteId==='tank.1')!.mode,'tank');assert.equal(troops.find(u=>u.eliteId==='tank.2')!.mode,'siege');assert.equal(troops.find(u=>u.unitType==='battlecruiser')!.temporaryUntil!-troops.find(u=>u.unitType==='battlecruiser')!.bornAt,24);}
});

test('N06 links actual ready casts; N07 keeps its mark when the first row already belongs to landing coordination',()=>{
 const w=make();const a=own(w,'W01','W04','N06','N07');const e=foe(w);const back=w.addUnit('hydralisk','zerg',0,10);back.hp=back.maxHp=1e6;armedContact(w,'G02',e);proc(w);tickArmedSupport(w);assert.equal(a.nodes!.links!.length,1);const v=a.volleys.find(v=>v.cardId==='W04')!;assert.equal(v.calibrated,'N06');assert.equal(v.shots.length,5);assert.ok(v.shots.every(s=>s.suppressTicks===36));assert.equal(a.readyTick.N07,undefined);assert.ok(a.nodes!.mark);w.advance(.12);assert.ok(a.unitStatus[e.id].suppressUntil!>w.tick);const copy=restored(w);w.advance(.5);copy.advance(.5);assert.equal(w.allies().filter(u=>u.armed?.cardId==='W01').length,3);assert.deepEqual(copy.expedition.support.armed!.nodes,a.nodes);
});
test('N06 keeps B07 flight at 0.60 seconds and postpones this new carrier until one step after the first impact',()=>{
 const w=make();const a=own(w,'W01','B07','N06');w.expedition.support.unique.levels['terran.missiles']=1;w.expedition.support.unique.missilesReady=0;foe(w);proc(w);w.advance(1/60);const d=a.deployments.find(d=>d.cardId==='W01')!,packets=w.expedition.support.unique.packets.filter(p=>p.kind==='missile');assert.equal(packets.length,4);assert.ok(packets.every(p=>Math.abs(p.at-p.start-.6)<1e-8&&p.suppressTicks===36));assert.equal(d.landTick,Math.round(packets[0].at*60)+1);assert.equal(a.nodes!.missilePair,undefined);assert.equal(a.readyTick.N06,w.tick+600);
});
test('N07 calibrates only one real existing row to a visible ranged body, with no additional shells',()=>{
 const w=make();const a=own(w,'W04','N07'),front=foe(w),back=w.addUnit('hydralisk','zerg',0,10);back.hp=back.maxHp=1e6;armedContact(w,'G02',front);reserveArmedDispatch(w,'W04');const v=a.volleys[0];tickArmedCalibration(w);assert.equal(v.calibrated,'N07');assert.equal(v.shots.length,5);assert.deepEqual(v.shots[0].point,{x:0,z:10});assert.equal(a.readyTick.N07,360);assert.equal(a.nodes!.mark,undefined);const saved=structuredClone(v);tickArmedCalibration(w);assert.deepEqual(v,saved);
});
test('N08 waits for actual B02 control and widens a single real oil field to the saved exit',()=>{
 const w=make();const a=own(w,'B02','G04','N08');foe(w);proc(w);w.advance(.1);assert.equal(a.fields!.some(f=>f.cardId==='G04'),false);w.advance(.5);const oil=a.fields!.find(f=>f.cardId==='G04')!;assert.equal(oil.width,3.75);assert.deepEqual(oil.point,a.nodes!.control!.exit);assert.ok(a.readyTick.N08!>w.tick);assert.equal(a.fields!.filter(f=>f.cardId==='G04').length,1);const copy=restored(w);assert.deepEqual(copy.expedition.support.armed!.nodes,a.nodes);
});
test('N09 changes future aggro, keeps existing flight identity, reduces a real 100 hit to 80 and routes the wounded body back',()=>{
 const w=make();const a=own(w,'N09');w.expedition.familySlots.push('marauder');const old=w.addFamilyMember('marauder',{x:0,z:3},5);old.hp=old.maxHp-100;const original={x:old.x,z:old.z},incoming=w.addFamilyMember('marine',{x:.8,z:2});incoming.armed={cardId:'W02',castId:a.nextCast++,deploymentId:incoming.id,hpFactor:1};const id=w.nextId++;w.fortifications.set(id,{id,x:0,z:4,hp:1100,maxHp:1100,armor:3,unitRadius:1.3,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',race:'terran',team:'player',kind:'bunker',nextActionAt:0,supportUntil:24,supportOrigin:{cardId:'P05',castId:a.nextCast++,slot:0,landTick:0}});const e=foe(w);e.z=5;e.prev.z=5;e.pendingTarget=old.id;e.windup=.5;armedQueueHandoff(w,incoming);tickArmedHandoffs(w);assert.equal(e.pendingTarget,old.id);assert.equal(e.attackTarget,incoming.id);const before=old.hp;w.hit(old,100,[],1,'zerg',0,1);assert.ok(Math.abs(before-old.hp-80)<1e-6);const copy=restored(w);w.advance(.5);copy.advance(.5);assert.ok(Math.hypot(old.x-original.x,old.z-original.z)>.1);assert.ok(Math.hypot(old.x-original.x,old.z-original.z)<=3.2);assert.deepEqual(copy.expedition.support.armed!.nodes,a.nodes);
});
test('O03 charges from actual HP loss at 1499+1, never repair or shield, and owns its queued garrison and retirement',()=>{
 const w=make();const a=own(w,'O03');foe(w);assert.equal(reserveArmedDispatch(w,'O03'),null);w.advance(2.05);proc(w);w.advance(.4);const d=a.deployments.find(d=>d.cardId==='O03')!,fort=w.fortifications.get(d.id)!;assert.equal(fort.kind,'planetary');assert.equal(d.endTick-d.landTick,1800);w.hit(fort,1499,[],1,'zerg',0,1);assert.equal(d.charges,0);fort.hp+=100;assert.equal(d.chargeDamage,1499);w.hit(fort,1,[],1,'zerg',0,1);assert.equal(d.charges,1);assert.equal(d.chargeDamage,0);const copy=restored(w);w.advance(.3);copy.advance(.3);for(const world of [w,copy]){const troops=world.allies().filter(u=>u.armed?.cardId==='O03');assert.equal(troops.length,3);assert.ok(troops.every(u=>u.rank===3&&u.temporaryUntil!-u.bornAt===12));assert.equal(world.expedition.support.armed!.deployments.find(d=>d.id===fort.id)!.charges,0);}w.hit(fort,3000,[],1,'zerg',0,1);assert.equal(d.charges,2);w.advance(.5);assert.equal(d.charges,2);w.advance(61);assert.equal(d.phase,'ended');assert.equal(w.fortifications.has(fort.id),false);
});
test('O01 commits only the tenth real formal death, grants a single system ammo and preserves a permanent same-name hero',()=>{
 const w=make();w.random=()=>0;const a=own(w,'O01','N05');foe(w);assert.ok(acquireExpeditionHero(w,'raynor'));const permanent=structuredClone(w.heroes.get('raynor')!);
 for(let i=0;i<9;i++){const u=w.addFamilyMember('marine',{x:4,z:0});w.hit(u,1e6,[],1,'zerg',0,1);}assert.equal(a.counter!.losses.length,9);assert.equal(a.counter!.activation,undefined);const tenth=w.addFamilyMember('marine',{x:4,z:0});w.hit(tenth,1e6,[],1,'zerg',0,1);assert.equal(a.counter!.activation!.losses.length,10);assert.equal(w.expedition.support.ammo,1);assert.equal(a.counter!.invulnerableUntil,180);const survivor=w.allies()[0],hp=survivor.hp;w.hit(survivor,1000,[],1,'zerg',0,1);assert.equal(survivor.hp,hp);w.advance(.2);const copy=restored(w);w.advance(.5);copy.advance(.5);
 for(const world of [w,copy]){assert.equal(world.expedition.support.ammo,1);assert.equal(world.expedition.support.armed!.counter!.activation!.finished,true);assert.deepEqual(world.heroes.get('raynor'),permanent);const temp=world.allies().find(u=>u.armed?.cardId==='O01'&&u.heroId)!;assert.ok(temp);assert.equal(temp.heroId,'raynor');assert.equal(temp.rank,5);assert.ok(Math.abs(temp.temporaryUntil!-temp.bornAt-120)<1e-6);world.expireUnit(temp);assert.deepEqual(world.heroes.get('raynor'),permanent);assert.equal(world.heroEntity('raynor')!.hp>0,true);}
});

test('normal orange shelf freezes three paid candidates at nine progress and three claims, then accepts only one purchase',()=>{
 const w=make(),a=own(w,'W01','W04','G01','N01','N02','N03');w.expedition.build={main:'armed',counts:{armed:9},orange:null,milestones:[{id:'armed:3',branch:'armed',at:3,offers:['N01','N02'],claimed:'N01'},{id:'armed:6',branch:'armed',at:6,offers:['N02','N03'],claimed:'N02'},{id:'armed:9',branch:'armed',at:9,offers:['N03','N04'],claimed:'N03'}]};shopping(w);const shelf=drawExpeditionReinforcements({...draftContext(w),currentOffers:[]},true);assert.deepEqual(shelf.map(r=>r.expeditionEffect.kind==='armedSupport'?r.expeditionEffect.cardId:null),['O01','O02','O03']);assert.ok(shelf.every(r=>r.baseMinerals===325&&r.baseGas===140));w.rewards=shelf;const before={...w.wallet};assert.ok(w.choose(shelf[1].offerId));assert.equal(w.wallet.minerals,before.minerals-shelf[1].minerals!);assert.equal(w.wallet.gas,before.gas-shelf[1].gas!);assert.equal(w.expedition.build.orange,'O02');assert.equal(w.expedition.build.counts.armed,9);assert.equal(a.ranks.O02,1);assert.equal(w.choose(shelf[0].offerId),false);assert.equal(w.choose(shelf[1].offerId),false);const copy=restored(w);assert.equal(copy.expedition.build!.orange,'O02');
});

test('deferring a frozen purple choice preserves it across the next normal intermission and restore',()=>{
 const w=make();buy(w,'W01');buy(w,'W04');buy(w,'G01');const m=pendingBuildChoice(w)!,offers=[...m.offers],revision=w.expedition.shopRevision;assert.ok(w.deferBuildChoice(m.id,revision));assert.equal(w.deferBuildChoice(m.id,revision),false);assert.equal(pendingBuildChoice(w),undefined);const copy=restored(w);assert.equal(pendingBuildChoice(copy),undefined);assert.ok(w.skipReward());assert.equal(w.phase,'battle');w.endStage();assert.deepEqual(pendingBuildChoice(w)!.offers,offers);assert.equal(w.expedition.build!.counts.armed,3);
});
test('the existing card book contains all 45 armed cards with no duplicate migrated Terran effects',()=>{
 const w=make(),cards=catalogueCards(w),armed=cards.filter(c=>c.armedId);assert.equal(armed.length,45);assert.equal(new Set(armed.map(c=>c.armedId)).size,45);assert.ok(armed.every(c=>c.detail&&c.stat));assert.ok(!cards.some(c=>c.race==='terran'&&['terran.bunker','terran.missiles','terran.ricochet','terran.overdrive'].some(id=>c.id==='terran:'+id)));
});
test('W08 can detect an otherwise hidden target around the squad without targeting its hidden position',()=>{
 const w=make();own(w,'W08');const e=w.addUnit('roach','zerg',1,0);e.cloaked=true;assert.equal(w.visibleTo(e,'terran'),false);assert.ok(reserveArmedDispatch(w,'W08'));const f=w.expedition.support.armed!.fields![0];assert.deepEqual(f.point,{x:w.anchor.x,z:w.anchor.z});w.advance(.15);assert.equal(w.visibleTo(e,'terran'),true);
});
test('Planetary source turret yaw uses parent-space world up and does not roll its native body',()=>{
 const root=new Group(),adapter=new Group(),bone=new Object3D(),muzzle=new Object3D();adapter.rotation.x=-Math.PI/2;root.add(adapter);bone.name='Bldg_Terran_CommandCenter_Turret';adapter.add(bone);muzzle.name='Ref_Weapon';muzzle.position.set(0,-2,0);bone.add(muzzle);preparePlanetaryTurret(root);
 for(const facing of [0,Math.PI/2,-Math.PI/2,Math.PI]){resetPlanetaryTurret(root);orientPlanetaryTurret(root,facing);root.updateMatrixWorld(true);const p=bone.getWorldPosition(new Vector3()),q=muzzle.getWorldPosition(new Vector3()),angle=Math.atan2(q.x-p.x,q.z-p.z);assert.ok(Math.abs(Math.atan2(Math.sin(angle-facing),Math.cos(angle-facing)))<1e-6);assert.ok(Math.abs(q.y-p.y)<1e-6);}
});
