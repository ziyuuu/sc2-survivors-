import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {DOOMSDAY_CARDS,type DoomsdayId} from '../src/data/terran-doomsday';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectShopWeights,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {prepareBuildChoices,recordDoomsdayPurchase,validateBuildProgress,type ArmedId} from '../src/simulation/progression/build-progress';
import {availableNewBodies,doomsdayBodyLimit,reconcileMechanicalSeats} from '../src/simulation/combat/doomsday-roster';
import {tickDoomsdayPreheat,doomsdayAimFactor} from '../src/simulation/combat/doomsday-combat';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {supplyPlan} from '../src/simulation/progression/supply-plan';
import {tickDoomsdayPassives,doomsdayBattery} from '../src/simulation/combat/doomsday-passives';

function make(){const w=new World({race:'terran',seed:161101,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.wallet={minerals:100000,gas:100000};return w;}
function shop(w:World){if(w.phase==='battle')w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;}
function offer(w:World,id:DoomsdayId|ArmedId){shop(w);const ctx={...draftContext(w),random:w.random,currentOffers:[]};for(let i=0;i<5000;i++){const shelf=drawExpeditionReinforcements(ctx,true),found=shelf.find(r=>['doomsday','armedSupport'].includes(r.expeditionEffect.kind)&&'cardId' in r.expeditionEffect&&r.expeditionEffect.cardId===id);if(found){w.rewards=shelf;return found;}}throw Error('Offer missing '+id);}
function buy(w:World,id:DoomsdayId|ArmedId){const r=offer(w,id);assert.ok(w.choose(r.offerId),id);return r;}
function own(w:World,...ids:DoomsdayId[]){const a=w.expedition.doomsday??=newDoomsdayState();for(const id of ids)a.ranks[id]=1;return a;}
function restore(w:World){const copy=make();copy.restoreRun(w.captureRun());return copy;}
function close(actual:number,expected:number){assert.ok(Math.abs(actual-expected)<1e-6,`${actual} != ${expected}`);}
function enemy(w:World,x:number,z:number,armor=0){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=100000;u.armor=armor;u.moveSpeed=u.weaponDamage=0;return u;}
function preheat(w:World,u:ReturnType<World['addUnit']>){tickDoomsdayPreheat(w,u);u.distanceWalked+=3;u.velocity={x:0,z:0};for(let i=0;i<6;i++)tickDoomsdayPreheat(w,u);}

test('mechanical catalogue has 45 unique stable IDs, correct ranks and free nodes',()=>{
 assert.equal(DOOMSDAY_CARDS.length,45);assert.equal(new Set(DOOMSDAY_CARDS.map(c=>c.id)).size,45);
 assert.deepEqual(['W','G','B','P','N','O'].map(prefix=>DOOMSDAY_CARDS.filter(c=>c.id[2]===prefix).length),[9,9,9,6,9,3]);
 assert.ok(DOOMSDAY_CARDS.filter(c=>c.purchase==='node').every(c=>c.price[0]===0&&c.price[1]===0));
});
test('normal purchases count white once, nonwhite upgrades each time, and reject stale rank without debit',()=>{
 const w=make();buy(w,'M-W01');buy(w,'M-W01');assert.equal(w.expedition.build!.counts.doomsday,1);assert.equal(w.expedition.build!.main,null);
 const r=offer(w,'M-G01'),old=structuredClone(r);assert.ok(w.choose(r.offerId));assert.equal(w.expedition.build!.counts.doomsday,2);
 const a=w.expedition.doomsday!,before={...w.wallet};w.rewards=[old];assert.equal(w.choose(old.offerId),false);assert.deepEqual(w.wallet,before);assert.equal(a.purchases.length,3);
 assert.deepEqual(restore(w).expedition.doomsday,a);
});
test('the first branch to three purchases locks and blocks the other branch nodes',()=>{
 for(const branch of ['armed','doomsday'] as const){
  const w=make();w.reinforce('marine',{x:2,z:0});buy(w,'M-W01');buy(w,'M-G01');buy(w,'W01');buy(w,'W04');
  assert.equal(w.expedition.build!.main,null);buy(w,branch==='armed'?'G01':'M-W05');
  const current=pendingBuildChoice(w)!,rev=w.expedition.shopRevision,before={...w.wallet};assert.equal(current.branch,branch);
  assert.equal(w.expedition.build!.main,branch);assert.equal(w.deferBuildChoice(current.id,rev),false);
  assert.equal(w.claimBuildChoice(current.id,rev-1,current.offers[0]),false);
  assert.ok(w.claimBuildChoice(current.id,rev,current.offers[0]));assert.deepEqual(w.wallet,before);
  buy(w,branch==='armed'?'M-W05':'G01');assert.equal(pendingBuildChoice(w),undefined);
  assert.ok(w.expedition.build!.milestones.every(m=>m.branch===branch));assert.equal(restore(w).expedition.build!.main,branch);
 }
});

test('one incomplete branch cannot block freezing the other; foreign node IDs are rejected',()=>{
 const w=make();own(w,'M-W01','M-G01','M-W05');const b=w.expedition.build!;b.counts={armed:3,doomsday:3};b.milestones=[{id:'armed:3',branch:'armed',at:3,offers:[],claimed:null},{id:'doomsday:3',branch:'doomsday',at:3,offers:[],claimed:null}];
 prepareBuildChoices(w.expedition,()=>.1,id=>id.startsWith('M-'));assert.equal(b.milestones[0].offers.length,0);assert.equal(b.milestones[1].offers.length,3);
 prepareBuildChoices(w.expedition,()=>{throw Error('frozen choice rerolled');},id=>id.startsWith('M-'));
 b.milestones[0].offers=['M-N04','M-N05'];assert.throws(()=>validateBuildProgress(b));
});

test('the third purple claim is mandatory before the final three purchases and free ultimate',()=>{
 const w=make();w.addUnit('marine','terran',2,0);w.addUnit('tank','terran',-3,0,5);w.addUnit('thor','terran',-5,0,5);
 for(const id of ['M-W01','M-W05','M-G01','M-W03','M-B03','M-B01','M-W06','M-G02','M-G04'] as const){
  buy(w,id);const m=pendingBuildChoice(w);
  if(m&&m.at<9)assert.ok(w.claimBuildChoice(m.id,w.expedition.shopRevision,m.offers[0]));
 }
 const third=pendingBuildChoice(w)!;
 assert.equal(w.deferBuildChoice(third.id,w.expedition.shopRevision),false);assert.equal(w.skipReward(),false);
 assert.ok(w.claimBuildChoice(third.id,w.expedition.shopRevision,third.offers[0]));
 assert.equal(w.expedition.build!.orangeAt,12);
 for(const id of ['M-G01','M-G02'] as const){buy(w,id);assert.equal(pendingBuildChoice(w),undefined);}
 buy(w,'M-G03');const orange=pendingBuildChoice(w)!;
 assert.deepEqual(orange.offers,['M-O01','M-O02','M-O03']);
 const copy=restore(w),rev=copy.expedition.shopRevision;copy.wallet={minerals:0,gas:0};
 assert.ok(copy.claimBuildChoice(orange.id,rev,'M-O01')); // Can be collected before its hero.
 assert.equal(copy.claimBuildChoice(orange.id,rev,'M-O02'),false);
 assert.deepEqual(copy.wallet,{minerals:0,gas:0});
 assert.equal(restore(copy).expedition.build!.orange,'M-O01');
});
test('branch odds are split before choosing a card and side-branch mass halves',()=>{
 const w=make();shop(w);const ctx=draftContext(w),weights=inspectShopWeights(ctx).filter(c=>c.rarity==='white'),mass=(prefix:string)=>weights.filter(c=>c.id.startsWith(prefix)).reduce((n,c)=>n+c.weight,0);
 // Some armed entries may be temporarily illegal; the reference mass is still conserved.
 const all={...ctx,armedLegal:()=>true,doomsdayLegal:()=>true,doomsdayReady:()=>true};
 const sum=(branch:string)=>inspectShopWeights(all).filter(c=>c.rarity==='white'&&c.id.startsWith(branch)).reduce((n,c)=>n+c.weight,0);
 close(sum('armed.'),sum('doomsday.'));w.expedition.build!.main='armed';close(sum('armed.'),sum('doomsday.')*2);assert.ok(mass('doomsday.')>0);
});
test('gun card and armor penetration affect only the current native gun, without stacking refreshes',()=>{
 const w=make(),u=w.allies()[0];u.x=0;u.z=0;const target=enemy(w,0,4,10),base=u.weaponDamage;
 own(w,'M-W01','M-G01');w.fire(u,target);close(100000-target.hp,Math.max(.5,base*1.06-8.5));
 w.refreshStats(u);w.refreshStats(u);target.hp=100000;w.fire(u,target);close(100000-target.hp,Math.max(.5,base*1.06-8.5));
});
test('3 yards and six still ticks prepare exactly one shortened, stronger native round',()=>{
 const w=make(),u=w.allies()[0];u.x=u.z=0;const target=enemy(w,0,4);own(w,'M-W05');tickDoomsdayPreheat(w,u);u.distanceWalked+=2.9;for(let i=0;i<6;i++)tickDoomsdayPreheat(w,u);assert.equal(u.doomsday!.ready,false);
 u.distanceWalked+=.1;tickDoomsdayPreheat(w,u);assert.equal(u.doomsday!.ready,true);close(doomsdayAimFactor(w,u),.85);
 const damage=u.weaponDamage;w.fire(u,target);close(100000-target.hp,damage*1.06);assert.equal(u.doomsday!.ready,false);w.fire(u,target);close(100000-target.hp,damage*2.06);
});
test('N04 sends one independent salvo per preheated shooter, survives an in-flight checkpoint, and spends the fourth-person reserve once',()=>{
 const w=make();w.entities.clear();const units=[0,1,2,3].map(x=>w.addUnit('marine','terran',x,0));const target=enemy(w,1.5,5),a=own(w,'M-W05','M-N04');a.nodeReserves['M-N04']=1;
 for(const u of units)preheat(w,u);for(const u of units.slice(0,3))w.fire(u,target);assert.equal(a.nodeReserves['M-N04'],1);w.fire(units[3],target);assert.equal(a.nodeReserves['M-N04'],0);assert.equal(w.weaponFlights.filter(p=>p.doomsdayDerived).length,4);
 const copy=restore(w);const hp=target.hp,total=w.weaponFlights.reduce((n,p)=>n+p.damage*p.hits*p.crit*p.enemyFactor,0);
 for(const world of [w,copy])for(let i=0;i<20;i++){world.time+=1/60;world.tick++;tickWeaponFlights(world,1/60);}
 close(hp-target.hp,total);close(copy.entities.get(target.id)!.hp,target.hp);assert.equal(copy.weaponFlights.length,0);
});
test('N05 needs separated shooters and a real rear target, uses one cooldown and two-target reserve',()=>{
 const w=make();w.entities.clear();const left=w.addUnit('marine','terran',0,0),right=w.addUnit('marine','terran',2,0),target=enemy(w,2,3),rear=enemy(w,2,4),rear2=enemy(w,2,5);const a=own(w,'M-W01','M-G01','M-N05');a.nodeReserves['M-N05']=1;
 w.fire(left,target);assert.equal(rear.hp,100000);w.fire(right,target);const expected=right.weaponDamage*1.06*.45;close(100000-rear.hp,expected);close(100000-rear2.hp,expected);assert.equal(a.nodeReserves['M-N05'],0);
 w.fire(left,target);w.fire(right,target);close(100000-rear.hp,expected);
 assert.deepEqual(restore(w).expedition.doomsday,a);
});
test('five existing tanks retain identity and wounds; four seats persist and only refit at an ordinary intermission',()=>{
 const w=make();w.entities.clear();const tanks=[0,1,2,3,4].map(x=>w.addUnit('tank','terran',x*3,0,1));for(const u of tanks)u.hp-=20;const before=tanks.map(u=>[u.id,u.hp,u.rank]);own(w,'M-W01');w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);
 assert.equal(doomsdayBodyLimit(w,'tank'),4);assert.deepEqual(tanks.map(u=>[u.id,u.hp,u.rank]),before);assert.equal(w.expedition.doomsday!.seats.length,4);assert.equal(availableNewBodies(w,'tank'),0);
 tanks[0].hp=0;reconcileMechanicalSeats(w);assert.equal(w.expedition.doomsday!.seats.length,3);assert.equal(w.expedition.doomsday!.veterans.length,1);assert.equal(availableNewBodies(w,'tank'),0);
 w.phase='reward';reconcileMechanicalSeats(w);assert.equal(w.expedition.doomsday!.seats.length,4);assert.equal(w.expedition.doomsday!.veterans.length,0);tanks[1].hp=0;assert.equal(availableNewBodies(w,'tank'),1);
});
test('pre-lock paid body still arrives as the fifth tank once and does not turn into training',()=>{
 const w=make();w.entities.clear();w.expedition.familySlots=['tank'];for(let i=0;i<4;i++)w.addUnit('tank','terran',i*3,0,1);own(w,'M-W01');
 const pod=w.spawnPod('tank',{x:15,z:10},901,1);pod.status='opening';pod.guardianIds.clear();w.expedition.ledger.push({id:901,family:'tank',line:'factory',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{purpose:'body',paid:{minerals:150,gas:125},status:'waiting',entityId:null}]});
 w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);assert.equal(availableNewBodies(w,'tank'),0);
 const delivered=releasePaidPassenger(w,pod,0,{x:15,z:10});assert.ok(delivered);assert.equal(w.familyUnits('tank').length,5);assert.equal(releasePaidPassenger(w,pod,0,{x:15,z:10}),null);assert.equal(availableNewBodies(w,'tank'),0);
});
test('body and cultivation share facilities but keep separate frozen work times',()=>{
 const w=make();const group=w.grantFacility('factory')!;w.expedition.tech.factory=1;w.expedition.tech['unlock.hellion']=1;w.phase='reward';assert.ok(w.setBuildingGroupOutputs(group.id,['hellion']));w.grantFacility('factory');
 w.entities.clear();for(let i=0;i<3;i++)w.addUnit('hellion','terran',i*3,0,1);w.expedition.familySlots=['hellion'];own(w,'M-W01');w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);w.phase='battle';updateExpeditionProduction(w,0);
 const jobs=w.expedition.ledger.filter(j=>j.family==='hellion');assert.equal(jobs.length,2);const body=jobs.find(j=>j.passengers[0].purpose==='body')!,training=jobs.find(j=>j.passengers[0].purpose==='rankTraining')!;
 assert.ok(body&&training);close(body.remaining,training.remaining*1.25);assert.equal(new Set(jobs.flatMap(j=>j.facilityIds)).size,2);assert.equal(availableNewBodies(w,'hellion'),0);assert.equal(supplyPlan(w,'hellion',1,'direct').added,0);
 const original=body.remaining;w.expedition.build!.main=null;updateExpeditionProduction(w,.25,false);close(body.remaining,original-.25);
});
test('mechanical reload and movement rebuild once, preserve the already scheduled round, and leave infantry unchanged',()=>{
 const w=make(),tank=w.addUnit('tank','terran',3,0),air=w.addUnit('banshee','terran',6,0),infantry=w.allies()[0];const base={period:tank.attackPeriod,ground:tank.moveSpeed,air:air.moveSpeed,infantry:infantry.attackPeriod};
 own(w,'M-W03','M-G03');tank.nextShotAt=20;for(const u of [tank,air,infantry]){w.refreshStats(u);w.refreshStats(u);}
 close(tank.attackPeriod,base.period/1.05);close(tank.moveSpeed,base.ground*1.10);close(air.moveSpeed,base.air*1.05);close(infantry.attackPeriod,base.infantry);assert.equal(tank.nextShotAt,20);
});
test('nano shield refills only upgrade difference, delays four seconds and restores without a free refill',()=>{
 const w=make(),tank=w.addUnit('tank','terran',3,0);own(w,'M-G02');w.refreshStats(tank);const max=tank.maxHp*.1,hp=tank.hp;close(tank.doomsday!.nano!.remaining,max);
 w.hit(tank,max*.6,[],1,'zerg',0,1);close(tank.hp,hp);close(tank.doomsday!.nano!.remaining,max*.4);w.refreshStats(tank);close(tank.doomsday!.nano!.remaining,max*.4);
 for(let i=1;i<=240;i++){w.tick=i;tickDoomsdayPassives(w,1/60);}close(tank.doomsday!.nano!.remaining,max*.4);
 for(let i=241;i<=300;i++){w.tick=i;tickDoomsdayPassives(w,1/60);}close(tank.doomsday!.nano!.remaining,max*.5);
 const copy=restore(w);close(copy.entities.get(tank.id)!.doomsday!.nano!.remaining,max*.5);
 w.expedition.doomsday!.ranks['M-G02']=2;w.refreshStats(tank);close(tank.doomsday!.nano!.remaining,max);close(tank.doomsday!.nano!.max,max*1.5);
});
test('engineering assigns no more than two real workers to one damaged mechanical body',()=>{
 const w=make();w.entities.clear();for(let i=0;i<3;i++)w.addUnit('marine','terran',i*.5,0);const tank=w.addUnit('tank','terran',1,1);tank.maxHp=1000;tank.hp=500;own(w,'M-G04');for(let i=0;i<60;i++)tickDoomsdayPassives(w,1/60);close(tank.hp,520);
});
test('science-vessel rate changes actual healing and energy together',()=>{
 const run=(boost:boolean)=>{const w=make();w.entities.clear();const vessel=w.addUnit('science_vessel','terran',0,0),tank=w.addUnit('tank','terran',1,0);tank.hp-=100;vessel.energy=100;if(boost){own(w,'M-W04');w.refreshStats(vessel);}const hp=tank.hp,energy=vessel.energy;w.heal(vessel,.1);return {hp:tank.hp-hp,energy:energy-vessel.energy};};
 const normal=run(false),boosted=run(true);assert.ok(normal.hp>0);close(boosted.hp,normal.hp*1.1);close(boosted.energy,normal.energy*1.1);
});
test('battery crosses the energy threshold once per stage and its receipt survives restore',()=>{
 const w=make(),vessel=w.addUnit('science_vessel','terran',2,0);own(w,'M-W09');vessel.energy=14;doomsdayBattery(w,vessel,16);close(vessel.energy,22);const copy=restore(w),u=copy.entities.get(vessel.id)!;u.energy=14;doomsdayBattery(copy,u,16);close(u.energy,14);copy.stage++;doomsdayBattery(copy,u,16);close(u.energy,22);
});
test('quick mounts shorten only a newly begun transform, never unlock siege fire early',()=>{
 const w=make(),tank=w.addUnit('tank','terran',3,0);tank.desiredMode='siege';w.updateTank(tank,0,1/60);const original=tank.modeTimer;own(w,'M-W07');assert.equal(tank.modeTimer,original);w.updateTank(tank,0,.1);close(tank.modeTimer,original-.1);
 tank.modeTimer=0;tank.mode='tank';tank.desiredMode='siege';w.updateTank(tank,0,1/60);close(tank.modeTimer,original*.9);assert.equal(tank.mode,'tank');w.updateTank(tank,0,tank.modeTimer);assert.equal(tank.mode,'siege');
});
