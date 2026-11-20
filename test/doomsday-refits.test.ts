import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {acquireDoomsdayBlueprint,reconcileDoomsdayRefits,doomsdayHasHost,doomsdayDetection} from '../src/simulation/combat/doomsday-refits';
import {updateExpeditionProduction,releasePaidPassenger,productionQuote} from '../src/simulation/expedition-production';
import {reconcileMechanicalSeats,doomsdayOrderFactor} from '../src/simulation/combat/doomsday-roster';
function make(){const w=new World({race:'terran',seed:161103,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.wallet={minerals:100000,gas:100000};w.expedition.doomsday=newDoomsdayState();const group=w.grantFacility('factory')!;w.expedition.tech.factory=1;w.expedition.tech['unlock.hellion']=1;w.phase='reward';w.setBuildingGroupOutputs(group.id,['hellion']);w.phase='battle';w.expedition.familySlots=['hellion'];return w;}
function blueprint(w:World){w.expedition.doomsday!.ranks['M-G06']=1;acquireDoomsdayBlueprint(w,'M-G06');return w.expedition.doomsday!.blueprints!['M-G06']!;}
test('one blueprint prefers rank, keeps identity and wounds, and receives a locked mechanical seat',()=>{
 const w=make(),cars=Array.from({length:5},(_,i)=>w.addUnit('hellion','terran',i*3,0,i===4?3:1));cars[4].hp-=25;const hp=cars[4].hp,b=blueprint(w);assert.equal(b.host!.entityId,cars[4].id);assert.equal(cars[4].hp,hp);
 acquireDoomsdayBlueprint(w,'M-G06');assert.equal(Object.keys(w.expedition.doomsday!.blueprints!).length,1);w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);assert.ok(w.expedition.doomsday!.seats.some(s=>s.entityId===cars[4].id));assert.equal(w.familyUnits('hellion').length,5);
});
test('after chassis loss an old paid incoming body receives the blueprint exactly once on its original timer',()=>{
 const w=make(),host=w.addUnit('hellion','terran',0,0),b=blueprint(w),pod=w.spawnPod('hellion',{x:15,z:10},901,1);pod.status='opening';pod.guardianIds.clear();w.expedition.ledger.push({id:901,family:'hellion',line:'factory',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{purpose:'body',paid:{minerals:100,gas:0},status:'waiting',entityId:null}]});host.hp=0;reconcileDoomsdayRefits(w);assert.equal(b.losses,1);assert.deepEqual(b.order,{kind:'incoming',jobId:901,passengerIndex:0});
 const next=releasePaidPassenger(w,pod,0,{x:15,z:10})!;reconcileDoomsdayRefits(w);assert.ok(doomsdayHasHost(w,'M-G06',next));assert.equal(releasePaidPassenger(w,pod,0,{x:15,z:10}),null);reconcileDoomsdayRefits(w);assert.equal(b.losses,1);
});
test('a paid recruit takes the vacant mechanical seat before the next production reconciliation',()=>{
 const w=make(),cars=Array.from({length:4},(_,i)=>w.addUnit('hellion','terran',i*3,0,5)),b=blueprint(w);
 w.expedition.build!.main='doomsday';reconcileMechanicalSeats(w,true);
 const pod=w.spawnPod('hellion',{x:15,z:10},901,1);pod.status='opening';pod.guardianIds.clear();
 w.expedition.ledger.push({id:901,family:'hellion',line:'factory',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{purpose:'body',paid:{minerals:100,gas:0},status:'waiting',entityId:null}]});
 cars[0].hp=0;reconcileDoomsdayRefits(w);const wallet={...w.wallet};
 const next=releasePaidPassenger(w,pod,0,{x:15,z:10})!;assert.ok(next);
 // updatePods runs after the combat seat reconciliation; next tick starts with production.
 updateExpeditionProduction(w,0,false);
 assert.equal(b.host?.entityId,next.id);assert.equal(b.order,undefined);assert.equal(next.doomsday?.special,'M-G06');
 assert.equal(w.familyUnits('hellion').length,4);assert.equal(w.expedition.ledger.filter(j=>j.refit).length,0);assert.deepEqual(w.wallet,wallet);
});
test('a full family uses one onsite facility, restores remaining work, and cannot create another body or charge',()=>{
 const w=make(),cars=Array.from({length:5},(_,i)=>w.addUnit('hellion','terran',i*3,0)),b=blueprint(w);cars[0].hp=0;w.addUnit('hellion','terran',15,0);reconcileDoomsdayRefits(w);assert.equal(b.host,null);assert.equal(b.order!.kind,'onsite');const job=w.expedition.ledger.find(j=>j.refit)!;assert.equal(job.passengers.length,0);assert.equal(job.remaining,productionQuote(w,'hellion').seconds);const wallet={...w.wallet};
 updateExpeditionProduction(w,1,false);const remaining=job.remaining,copy=make();copy.restoreRun(w.captureRun());assert.equal(copy.expedition.ledger.find(j=>j.refit)!.remaining,remaining);const ids=copy.familyUnits('hellion').map(u=>u.id);updateExpeditionProduction(copy,remaining+.01,false);assert.equal(copy.expedition.ledger.find(j=>j.refit)!.state,'settled');assert.ok(copy.expedition.doomsday!.blueprints!['M-G06']!.host);assert.deepEqual(copy.familyUnits('hellion').map(u=>u.id),ids);assert.deepEqual(copy.wallet,wallet);assert.equal(copy.pods.length,0);
});
test('losing an onsite target releases the work without refund, extra body, or stale attachment',()=>{
 const w=make(),cars=Array.from({length:5},(_,i)=>w.addUnit('hellion','terran',i*3,0)),b=blueprint(w);cars[0].hp=0;w.addUnit('hellion','terran',15,0);reconcileDoomsdayRefits(w);const order=b.order!;assert.equal(order.kind,'onsite');if(order.kind!=='onsite')throw Error('No onsite job');w.entities.get(order.target.entityId)!.hp=0;const wallet={...w.wallet};reconcileDoomsdayRefits(w);assert.equal(b.host,null);assert.equal(b.order,undefined);assert.equal(w.expedition.ledger.find(j=>j.id===order.jobId)!.state,'settled');assert.deepEqual(w.wallet,wallet);assert.equal(w.familyUnits('hellion').length,4);
});
test('light module follows a single live ground host and leaves no detection field behind',()=>{
 const w=make(),host=w.addUnit('hellion','terran',0,0);w.expedition.doomsday!.ranks['M-G07']=1;acquireDoomsdayBlueprint(w,'M-G07');assert.ok(doomsdayDetection(w,{x:0,z:4,unitRadius:0},'terran'));host.z=-1;assert.equal(doomsdayDetection(w,{x:0,z:4,unitRadius:0},'terran'),false);host.hp=0;assert.equal(doomsdayDetection(w,{x:0,z:-1,unitRadius:0},'terran'),false);assert.equal(w.expedition.detectionFields.length,0);
});
test('new orange work and mechanical work use mutually exclusive time factors and cultivation keeps its clock',()=>{
 const w=make();w.expedition.build!.main='doomsday';w.expedition.doomsday!.ranks['M-O02']=1;acquireDoomsdayBlueprint(w,'M-O02');assert.equal(doomsdayOrderFactor(w,'thor','body',0),1.5);assert.equal(doomsdayOrderFactor(w,'thor','body',1),1.25);assert.equal(doomsdayOrderFactor(w,'thor','rankTraining'),1);
});
