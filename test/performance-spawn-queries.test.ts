import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {findCarrierLanding,validCarrierLanding} from '../src/simulation/movement/carrier-landing';
function field(){const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:529});w.start();w.entities.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();return w;}
test('carrier retries see same-tick structural death and newly created structure',()=>{
 const w=field(),p=findCarrierLanding(w,'marine');assert.ok(p);
 const pod=w.spawnPod('marine',p);assert.equal(validCarrierLanding(w,'marine',p),false);
 pod.hp=0;assert.deepEqual(findCarrierLanding(w,'marine',p),p);
 pod.hp=100;pod.status='active';assert.equal(validCarrierLanding(w,'marine',p),false);
 assert.equal(validCarrierLanding(w,'marine',p,pod.id),true);
});
test('carrier clearance uses current large ground allies and excludes dead/air bodies',()=>{
 const w=field(),p={x:w.mapHalf-4,z:0};assert.equal(validCarrierLanding(w,'marine',p),true);
 const u=w.addUnit('ultralisk','terran',0,0);u.unitRadius=3;assert.equal(validCarrierLanding(w,'marine',p),false);
 u.hp=0;assert.equal(validCarrierLanding(w,'marine',p),true);
 u.hp=1;u.flying=true;assert.equal(validCarrierLanding(w,'marine',p),true);
});
test('free-position and hive searches refresh bodies between consecutive calls',()=>{
 const w=field(),x=w as any,origin={x:0,z:0},hive={...origin,unitRadius:3};
 const p=w.freePosition('zergling',origin),h=x.hiveSpawnPoint(hive,0);assert.ok(p);assert.ok(h);
 const u=w.addUnit('ultralisk','zerg',0,0);u.unitRadius=100;
 assert.equal(w.freePosition('zergling',origin),null);assert.equal(x.hiveSpawnPoint(hive,0),null);
 u.hp=0;assert.deepEqual(w.freePosition('zergling',origin),p);assert.deepEqual(x.hiveSpawnPoint(hive,0),h);
});
test('ambient release preserves cap, future deadlines and one fallback RNG draw per birth',()=>{
 const w=field(),x=w as any;
 for(let i=0;i<299;i++)w.addUnit('roach','zerg',20,20);
 const stamp=x.enemyStamp();x.ambientBacklog=[0,0,1].map((at,i)=>({type:'roach',bearing:0,at,lane:i,stamp,resources:{minerals:1,gas:1}}));
 let draws=0;const random=w.random.bind(w);w.random=()=>{draws++;return random();};
 x.releaseAmbient();assert.equal(w.enemyCount(),300);assert.equal(x.ambientBacklog.length,2);assert.equal(draws,1);
 x.releaseAmbient();assert.equal(draws,1);
 w.entities.clear();w.anchor.x=4;x.releaseAmbient();assert.equal(w.enemyCount(),1);assert.equal(x.ambientBacklog.length,1);assert.equal(draws,2);
 w.time=1;x.releaseAmbient();assert.equal(w.enemyCount(),2);assert.equal(x.ambientBacklog.length,0);assert.equal(draws,3);
});
