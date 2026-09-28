import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {createPair,pairFor,pairBodies,tickBroods,injectCarrier} from '../src/simulation/zerg-brood';
import {updateExpeditionProduction,releasePaidPassenger,paidReservations,receiptNeeded} from '../src/simulation/expedition-production';
import {SC2_UNITS} from '../src/data/sc2-units';
import {SOURCE_UNIT_DETAILS} from '../src/data/expansion-units';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {setDiagnosticOneHit} from '../src/diagnostics/combat-lock';
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const world=(race:'terran'|'zerg'|'protoss'='zerg')=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();return w;};
test('player modifiers compound once, native shield damage stays separate',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){const w=new World({race:'protoss',difficulty,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const u=w.allies()[0],d=SC2_UNITS.zealot;
 close(u.maxHp,d.maxHp*1.15);close(u.maxShield!,SOURCE_UNIT_DETAILS.zealot.shields*1.15);close(u.weaponDamage,d.attackDamage*1.15);close(u.moveSpeed,d.movementSpeed*1.15);close(u.attackPeriod,d.attackPeriod/1.15);close(u.armor,d.armor*1.15);
 w.hit(u,10,[],1,'zerg',0);close(u.hp,u.maxHp);const shield=u.shield;for(let n=0;n<20;n++)w.refreshStats(u);close(u.shield!,shield!);
 }
});
test('starter is one seat, true loss regenerates at exactly tick 900 without healing survivor',()=>{
 const w=world(),[a,b]=w.allies(),p=pairFor(w,a)!;assert.equal(w.familyUnits('zergling').length,1);assert.equal(w.familyBodies('zergling').length,2);
 a.hp-=4;w.hit(b,100000,[],1,'zerg',0,1);assert.equal(p.regrowAt,900);w.tick=899;tickBroods(w);assert.equal(pairBodies(w,p).length,1);w.tick=900;tickBroods(w);assert.equal(pairBodies(w,p).length,2);close(a.hp,a.maxHp-4);const fresh=pairBodies(w,p).find(u=>u!==a)!;close(fresh.hp,fresh.maxHp);
});
test('whole-pair loss cancels regeneration, separate pairs never refill each other',()=>{
 const w=world(),first=w.familyUnits('zergling')[0],p=pairFor(w,first)!,other=createPair(w,{x:6,z:0},3),q=pairFor(w,other)!;
 for(const u of pairBodies(w,p))w.hit(u,100000,[],1,'zerg',0,1);w.tick=2000;tickBroods(w);assert.deepEqual(p.members,[]);assert.equal(p.regrowAt,null);assert.equal(pairBodies(w,q).length,2);assert.equal(w.familyUnits('zergling').length,1);
 const saved=w.captureRun(),copy=world();copy.restoreRun(saved);assert.deepEqual(copy.expedition.zerglingPairs.find(q=>q.id===p.id)?.members,[]);const replacement=createPair(copy,{x:12,z:0});assert.equal(pairFor(copy,replacement)!.slot,p.slot);assert.equal(copy.expedition.zerglingPairs.filter(q=>q.slot===p.slot).length,1);
});
test('elite recruit and cultivation share a single identity across two actual bodies',()=>{
 const w=world();assert.ok(w.acquireElite('zergling.1'));const elite=w.eliteOwned('zergling.1')!,p=pairFor(w,elite)!;assert.equal(pairBodies(w,p).length,2);assert.ok(pairBodies(w,p).every(u=>u.eliteId==='zergling.1'));
 assert.ok(w.acquireElite('zergling.1'));assert.ok(pairBodies(w,p).every(u=>u.rank===2));const normal=w.ordinaryUnits('zergling')[0];normal.rank=4;w.refreshStats(normal);assert.ok(pairBodies(w,pairFor(w,normal)!).every(u=>u.rank===4));
});
test('paid pair has two payments but reserves one slot; waiting companion never fissions',()=>{
 const w=world();w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const j=w.expedition.ledger[0];assert.equal(j.passengers.length,2);assert.equal(j.passengers.reduce((n,c)=>n+c.paid.minerals,0),50);assert.equal(paidReservations(w,'zergling'),1);
 const pod=w.spawnPod('zergling',{x:5,z:0},j.id,2);j.podId=pod.id;j.state='risk';pod.status='opening';const a=releasePaidPassenger(w,pod,0,{x:5,z:2})!;const p=pairFor(w,a)!;w.tick=1000;tickBroods(w);assert.equal(pairBodies(w,p).length,1);assert.equal(p.regrowAt,null);
 releasePaidPassenger(w,pod,1,{x:6,z:2});assert.equal(pairBodies(w,p).length,2);assert.equal(w.wallet.minerals,0);
});
test('queen injection is free, reserves real seats and only one queen succeeds per carrier',()=>{
 const w=world();w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const j=w.expedition.ledger[0],pod=w.spawnPod('zergling',{x:4,z:0},j.id,2);j.podId=pod.id;j.state='risk';pod.status='active';const q=w.addUnit('queen','terran',4,2),q2=w.addUnit('queen','terran',4,-2),energy=q.energy;
 assert.ok(injectCarrier(w,q,pod));assert.equal(pod.passengers.length,6);assert.equal(paidReservations(w,'zergling'),3);assert.equal(q.injectReady,45);assert.equal(q.energy,energy);assert.equal(w.wallet.minerals,0);assert.ok(j.passengers.slice(2).every(p=>p.paid.minerals===0&&p.source==='queen-inject'));assert.equal(injectCarrier(w,q2,pod),false);assert.equal(q2.injectReady,undefined);
});
test('queen respects prepaid capacity and does not spend cooldown with no room',()=>{
 const w=world();for(let i=0;i<3;i++)createPair(w,{x:10+i*3,z:0});w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const j=w.expedition.ledger[0],pod=w.spawnPod('zergling',{x:3,z:0},j.id,2);pod.status='active';j.podId=pod.id;j.state='risk';const q=w.addUnit('queen','terran',3,1);assert.equal(injectCarrier(w,q,pod),false);assert.equal(q.injectReady,undefined);
});
test('zealot closes to moving economic target without standing outside its weapon reach',()=>{
 const w=world('protoss'),u=w.allies()[0],d=w.spawnEconomic('drone',{x:u.x+2,z:u.z});let idleNear=0;for(let i=0;i<180&&!(u.shotSequence??0);i++){w.step();if(u.action==='idle'&&w.edgeDistance(u,d)<.3&&!u.windup)idleNear+=1/60;}assert.ok(u.shotSequence);assert.ok(idleNear<.35,`unproductive contact wait ${idleNear}`);
});
test('full paired roster trains once for both paid bodies and preserves wounds',()=>{
 const w=world();for(let i=0;i<4;i++)createPair(w,{x:6+i*2,z:0});assert.equal(w.familyBodies('zergling').length,10);
 const first=w.familyUnits('zergling')[0];first.hp-=5;w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const job=w.expedition.ledger[0];assert.ok(job.passengers.every(p=>p.purpose==='rankTraining'));assert.equal(paidReservations(w,'zergling'),1);
 const pod=w.spawnPod('zergling',{x:4,z:4},job.id,2);pod.status='opening';job.state='risk';job.podId=pod.id;const rank=w.familyUnits('zergling').reduce((n,u)=>n+u.rank,0);
 assert.ok(releasePaidPassenger(w,pod,0,pod));assert.equal(releasePaidPassenger(w,pod,1,pod),null);assert.equal(w.familyBodies('zergling').length,10);assert.equal(w.familyUnits('zergling').reduce((n,u)=>n+u.rank,0),rank+1);close(first.maxHp-first.hp,5);
});
test('pair regrowth, queen cooldown and zero-payment receipt survive archive; pause freezes',()=>{
 const w=world(),[a,b]=w.allies();w.hit(b,1e6,[],1,'zerg');w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const job=w.expedition.ledger[0],pod=w.spawnPod('zergling',{x:4,z:0},job.id,2);job.state='risk';job.podId=pod.id;pod.status='active';const queen=w.addUnit('queen','terran',4,1);assert.ok(injectCarrier(w,queen,pod));
 const copy=world();copy.restoreRun(readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!);assert.equal(copy.paused,true);assert.equal(copy.entities.get(queen.id)!.injectReady,45);assert.equal(copy.pods[0].injectedSeats,2);const before=copy.tick;copy.advance(20);assert.equal(copy.tick,before);
 copy.paused=false;copy.tick=900;tickBroods(copy);assert.equal(pairBodies(copy,pairFor(copy,copy.entities.get(a.id)!)!).length,2);assert.equal(injectCarrier(copy,copy.entities.get(queen.id)!,copy.pods[0]),false);
 const invalid=copy.captureRun();invalid.state.expedition.ledger[0].passengers[2].paid.minerals=10;assert.throws(()=>world().restoreRun(invalid),/账本/);
});
test('blocked regeneration waits; one remaining seat injects one; 45 second cooldown is exact',()=>{
 const w=world(),[a,b]=w.allies();w.hit(b,1e6,[],1,'zerg');const free=w.freePosition.bind(w);w.freePosition=()=>null;w.tick=900;tickBroods(w);assert.equal(pairBodies(w,pairFor(w,a)!).length,1);w.freePosition=free;tickBroods(w);assert.equal(pairBodies(w,pairFor(w,a)!).length,2);
 createPair(w,{x:8,z:0});createPair(w,{x:11,z:0});w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const j=w.expedition.ledger[0],pod=w.spawnPod('zergling',{x:4,z:0},j.id,2);j.state='risk';j.podId=pod.id;pod.status='active';const q=w.addUnit('queen','terran',4,1);assert.ok(injectCarrier(w,q,pod));assert.equal(pod.injectedSeats,1);
 const other=world();other.wallet={minerals:50,gas:0};updateExpeditionProduction(other,0,true);const j2=other.expedition.ledger[0],p2=other.spawnPod('zergling',{x:4,z:0},j2.id,2),q2=other.addUnit('queen','terran',4,1);p2.status='active';j2.state='risk';j2.podId=p2.id;q2.injectReady=45;other.time=44.999;assert.equal(injectCarrier(other,q2,p2),false);other.time=45;assert.ok(injectCarrier(other,q2,p2));
});
test('diagnostic one-hit still records one legal death/reward and is absent from save',()=>{
 const w=world('terran'),u=w.allies()[0],enemy=w.addUnit('roach','zerg',0,3);setDiagnosticOneHit(w,true);const kills=w.stats.kills;w.fire(u,enemy);assert.equal(enemy.hp,0);assert.equal(w.stats.kills,kills+1);w.fire(u,enemy);assert.equal(w.stats.kills,kills+1);assert.ok(!JSON.stringify(w.captureRun()).includes('oneHit'));
});
test('a paid second twin keeps its seat when the first is killed before disembarking',()=>{
 const w=world();for(let i=0;i<3;i++)createPair(w,{x:8+i*3,z:0});w.wallet={minerals:50,gas:0};updateExpeditionProduction(w,0,true);const job=w.expedition.ledger[0],pod=w.spawnPod('zergling',{x:4,z:0},job.id,2);job.podId=pod.id;job.state='risk';pod.status='opening';
 const first=releasePaidPassenger(w,pod,0,{x:4,z:2})!;assert.equal(paidReservations(w,'zergling'),0);w.hit(first,1e8,[],1,'zerg');assert.equal(paidReservations(w,'zergling'),1);
 const queen=w.addUnit('queen','terran',4,1);assert.equal(injectCarrier(w,queen,pod),false);assert.equal(queen.injectReady,undefined);
 const survivor=releasePaidPassenger(w,pod,1,{x:5,z:2})!;assert.ok(survivor.hp>0);assert.equal(w.familyUnits('zergling').length,5);assert.equal(paidReservations(w,'zergling'),0);
});
test('retiring five paired seats yields five credits and retires all ten bodies without kills',()=>{
 const w=world();const first=w.familyUnits('zergling')[0];first.rank=5;w.refreshStats(first);for(let i=0;i<4;i++)createPair(w,{x:8+i*3,z:0},5);
 w.expedition.familySlots=['zergling','roach','baneling','queen','hydralisk'];const pod=w.spawnPod('mutalisk',{x:-8,z:0},99,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();w.expedition.ledger.push({id:99,family:'mutalisk',line:'zerg.air',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:100,gas:100},status:'waiting',entityId:null,purpose:'body'}]});receiptNeeded(w,pod,0);
 const request=w.expedition.pendingReceipt!,preview=w.previewFamilyReplacement(request.id,'zergling')!,kills=w.stats.kills;assert.equal(w.familyBodies('zergling').length,10);assert.deepEqual(preview.credits.map(c=>c.rank),[3,3,3,3,3]);assert.ok(w.commitFamilyReplacement(request.id,'zergling',preview.revision));assert.equal(w.familyBodies('zergling').length,0);assert.equal(w.expedition.zerglingPairs.length,0);assert.equal(w.familyUnits('mutalisk')[0].rank,3);assert.equal(w.expedition.credits.mutalisk!.length,4);assert.equal(w.stats.kills,kills);
});
