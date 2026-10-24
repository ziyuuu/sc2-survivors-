import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {DeliveryLedger} from '../src/simulation/expedition-state';
import {deliveryJobs,deliveryJob,deliveryChanged,productionGroupJob} from '../src/simulation/production-queries';
import {paidReservations,tacticalReservations,updateExpeditionProduction} from '../src/simulation/expedition-production';
import {passengerReservation,tickBroods,joinPair} from '../src/simulation/zerg-brood';
const world=()=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.expedition.ledger=[];return w;};
const job=(id:number,state:DeliveryLedger['state']='settled'):DeliveryLedger=>({id,family:'marine',line:'barracks',facilityIds:[1],producerId:'barracks',remaining:10,state,podId:null,passengers:[{paid:{minerals:50,gas:0},status:state==='settled'?'released':'waiting',entityId:null,purpose:'body'}]});
test('production queries keep all history but hot reads visit no settled entries',()=>{
 const w=world(),history=Array.from({length:1000},(_,i)=>job(i)),active=job(2000,'training');let reads=0;
 w.expedition.ledger=new Proxy([...history,active],{get(a,key,r){if(typeof key==='string'&&/^\d+$/.test(key))reads++;return Reflect.get(a,key,r);}});
 assert.equal(paidReservations(w,'marine'),1);assert.equal(reads,1001);reads=0;
 for(let n=0;n<20;n++){assert.equal(paidReservations(w,'marine'),1);assert.equal(tacticalReservations(w,'marine'),0);assert.equal(productionGroupJob(w,{id:'barracks',ids:[1]}),active);assert.equal(deliveryJob(w,10),history[10]);}
 assert.equal(reads,0);assert.equal(w.expedition.ledger.length,1001);assert.equal(JSON.parse(JSON.stringify(w.expedition)).ledger.length,1001);
 active.passengers[0].status='lost';active.state='settled';deliveryChanged(w,active);assert.equal([...deliveryJobs(w)].length,0);assert.equal(deliveryJob(w,active.id),active);
});
test('append, replacement, truncation and explicit reopening rebuild the right work order',()=>{
 const w=world(),a=job(7,'training'),b=job(2,'training');w.expedition.ledger=[a,b];assert.deepEqual([...deliveryJobs(w)],[a,b]);
 a.state='settled';a.passengers[0].status='released';deliveryChanged(w,a);assert.deepEqual([...deliveryJobs(w)],[b]);
 const c=job(9,'training');w.expedition.ledger.push(c);assert.deepEqual([...deliveryJobs(w)],[b,c]);
 a.state='training';a.passengers[0].status='waiting';deliveryChanged(w,a);assert.deepEqual([...deliveryJobs(w)],[a,b,c]);
 w.expedition.ledger=structuredClone([c]);assert.deepEqual([...deliveryJobs(w)],w.expedition.ledger);assert.equal(deliveryJob(w,7),undefined);
 w.expedition.ledger.length=0;assert.equal([...deliveryJobs(w)].length,0);assert.equal(deliveryJob(w,9),undefined);
});
test('live passenger status and twin death change reservation within the same tick',()=>{
 const w=world();w.entities.clear();const u=w.addUnit('zergling','terran',0,0);joinPair(w,u,'paid:1:0');
 const j=job(1,'risk');j.family='zergling';j.passengers=[{...j.passengers[0],pairId:'paid:1:0',pairHalf:0},{...j.passengers[0],pairId:'paid:1:0',pairHalf:1}];w.expedition.ledger=[j];
 assert.equal(paidReservations(w,'zergling'),1);j.passengers[0].status='released';assert.equal(passengerReservation(j.passengers[1],w),0);
 u.hp=0;assert.equal(passengerReservation(j.passengers[1],w),1);assert.equal(paidReservations(w,'zergling'),1);
 j.passengers[1].status='lost';assert.equal(paidReservations(w,'zergling'),0);
});
test('two complete twins do not inspect ledger while maintaining pair state',()=>{
 const w=world();w.entities.clear();const a=w.addUnit('zergling','terran',0,0),b=w.addUnit('zergling','terran',1,0);joinPair(w,a,'pair');const p=joinPair(w,b,'pair');
 p.regrowAt=99;p.birthPending=true;w.expedition.ledger=new Proxy([],{get(){throw Error('Unneeded history read');}});
 tickBroods(w);assert.equal(p.regrowAt,null);assert.equal(p.birthPending,false);
});
test('settled jobs with waiting cargo retain original reservation semantics',()=>{
 const w=world(),j=job(1);j.passengers[0].status='waiting';w.expedition.ledger=[j];assert.equal(paidReservations(w,'marine'),1);assert.equal(productionGroupJob(w,{id:'barracks',ids:[1]}),undefined);
});
test('deleting current work entries during production cannot skip later jobs',()=>{
 const w=world(),a=job(1,'risk'),b=job(2,'training'),c=job(3,'risk');const p=w.spawnPod('marine',{x:10,z:0},1,1),q=w.spawnPod('marine',{x:20,z:0},3,1);
 p.passengers[0].status='lost';q.passengers[0].status='released';a.podId=p.id;c.podId=q.id;w.expedition.ledger=[a,b,c];
 updateExpeditionProduction(w,1,false);assert.equal(a.state,'settled');assert.equal(c.state,'settled');assert.equal(b.remaining,9);assert.deepEqual([...deliveryJobs(w)],[b]);
});
