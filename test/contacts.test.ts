import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {resolveContacts} from '../src/simulation/movement/contacts';
import {locomote,blocked} from '../src/simulation/movement/steering';
const fixture=()=>{const w=new World({sandbox:true,waves:false,obstacles:[],initial:[]});return w;};
const solve=(w:World)=>{w.hash.rebuild(w.entities.values());return resolveContacts(w.entities.values(),w.hash,w.obstacles,w.mapHalf,1/60);};
test('ground contact stops overlapping movement while preserving the stationary defender',()=>{const w=fixture(),a=w.addUnit('marine','terran',0,0),b=w.addUnit('zergling','zerg',.7,0);a.prev={x:0,z:0};b.prev={x:.8,z:0};solve(w);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=.75-.001);assert.equal(a.x,0);assert.ok(b.x-b.prev.x<=.001);});
test('air can pass ground actors but same-layer aircraft have collision volume',()=>{const w=fixture(),g=w.addUnit('tank','terran',0,0),a=w.addUnit('medivac','terran',0,0);assert.equal(solve(w),0);assert.equal(g.x,0);assert.equal(a.x,0);const b=w.addUnit('medivac','terran',1.45,0);b.prev={x:1.55,z:0};solve(w);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>=1.5-.001);});
test('sieged tank is immovable and other units yield to its actual radius',()=>{const w=fixture(),t=w.addUnit('tank','terran',0,0),m=w.addUnit('marine','terran',1.2,0);t.mode='siege';m.prev={x:1.3,z:0};solve(w);assert.equal(t.x,0);assert.ok(m.x>=1.25-.001);});
test('initial overlap corrections are bounded, finite and never teleport',()=>{const w=fixture(),a=w.addUnit('marine','terran',0,0),b=w.addUnit('zergling','zerg',0,0);solve(w);assert.ok(Math.hypot(a.x,a.z)<=a.moveSpeed/60*1.5+.001);assert.ok(Math.hypot(b.x,b.z)<=b.moveSpeed/60*1.5+.001);assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>0);});
test('closed pod volume blocks ground troops without moving the pod',()=>{const w=fixture(),m=w.addUnit('marine','terran',1.58,0),p=w.spawnPod('marine',{x:0,z:0});w.landPod(p);m.prev={x:1.7,z:0};w.hash.rebuild([m,p]);resolveContacts([m],w.hash,[],w.mapHalf,1/60);assert.ok(m.x>=1.625-.001);assert.equal(p.x,0);});
test('owner-indexed targeting preserves result order and avoids friendly scanning',()=>{const w=fixture();for(let i=0;i<60;i++)w.addUnit(i%2?'marine':'zergling',i%2?'terran':'zerg',i*.01,0);w.hash.rebuild(w.entities.values());const a:number[]=[],b:number[]=[];w.hash.query({x:0,z:0},4,u=>{if(u.owner==='terran')a.push(u.id);});const all=w.hash.visits;w.hash.visits=0;w.hash.query({x:0,z:0},4,u=>{b.push(u.id);},'terran');assert.deepEqual(a,b);assert.ok(w.hash.visits<all);});

test('radius-sized choke admits a Marine but blocks a Tank even when contact correction pushes it',()=>{
 const walls=[{x:0,z:2,w:5,h:2.6},{x:0,z:-2,w:5,h:2.6}],w=fixture(),m=w.addUnit('marine','terran',-4,0),t=w.addUnit('tank','terran',-4,0);m.facing=t.facing=Math.PI/2;
 for(let i=0;i<240;i++){locomote(m,{x:4,z:0},m.moveSpeed,{x:0,z:0},1/60,walls,56);locomote(t,{x:4,z:0},t.moveSpeed,{x:0,z:0},1/60,walls,56);}
 assert.ok(m.x>2.5);assert.ok(t.x<-3.3);assert.equal(blocked(t,t.unitRadius,walls),false);
 const back=w.addUnit('hellion','terran',t.x-1.45,t.z);back.prev={x:back.x-.1,z:0};w.hash.rebuild([t,back]);resolveContacts([t,back],w.hash,walls,56,1/60);assert.equal(blocked(t,t.unitRadius,walls),false);
});
test('ground swarm settles around the Marine perimeter instead of passing through its center',()=>{
 const w=fixture(),m=w.addUnit('marine','terran',0,0),goal=w.moveGoal(m);m.x=goal.x;m.z=goal.z;m.prev={...goal};m.hp=m.maxHp=100000;m.weaponCooldown=100000;
 for(let i=0;i<8;i++){const angle=i*Math.PI/4,e=w.addUnit('zergling','zerg',m.x+Math.cos(angle)*4,m.z+Math.sin(angle)*4);e.weaponDamage=0;}
 w.start();w.advance(6);for(const e of w.entities.values())if(e.owner==='zerg')assert.ok(Math.hypot(e.x-m.x,e.z-m.z)>=m.unitRadius+e.unitRadius-.025);
 assert.ok([...w.entities.values()].filter(e=>e.owner==='zerg'&&Math.hypot(e.x-m.x,e.z-m.z)<1.5).length>=5);
});
