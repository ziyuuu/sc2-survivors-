import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaignTerrain} from '../src/data/campaign-map';
import {advanceTrackingMine,newSupportMine,trackingMineObstacles} from '../src/simulation/combat/tracking-mines';
import {mineClearLine,mineRouteGoal} from '../src/simulation/movement/mine-routing';
import {blocked,clearLine,distance} from '../src/simulation/movement/steering';
const make=()=>{const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();return w;};
const fort=(id:number,x=2.2,z=1.6)=>({id,x,z,hp:100,maxHp:100,armor:0,unitRadius:1.6,flying:false,attributes:[],owner:'terran' as const,kind:'bunker' as const,nextActionAt:0});
test('Char seed529 bunker corner reaches target continuously without the B03 sampling leak',()=>{
 const w=make();w.terrain=campaignTerrain({version:3,seed:529,theme:'char'});w.terrain.setStage!(18);w.fortifications.set(100,fort(100));
 const target=w.addUnit('zergling','zerg',3.6,-1.2),m=newSupportMine(101,{x:0,z:0});let hit=false;
 const a={x:.28460498941515416,z:-.09486832980505137};
 assert.equal(clearLine(a,target,.3,trackingMineObstacles(w),w.terrain),true);
 assert.equal(mineClearLine(a,target,.3,trackingMineObstacles(w),w.terrain),false);
 for(let i=0;i<360&&!hit;i++){w.time=i/60;const before={...m.point};hit=advanceTrackingMine(w,m,[target]);assert.ok(distance(before,m.point)<=.100001);assert.ok(mineClearLine(before,m.point,.3,trackingMineObstacles(w),w.terrain));assert.equal(blocked(m.point,.3,trackingMineObstacles(w)),false);}
 assert.ok(hit,JSON.stringify(m));
});
test('geometry identity survives stable bodies and invalidates moves, hp, flight, resize and static mutation',()=>{
 const w=make(),f=fort(100);w.fortifications.set(f.id,f);let old=trackingMineObstacles(w);assert.equal(trackingMineObstacles(w),old);
 for(const mutate of [()=>f.x++,()=>f.z++,()=>f.unitRadius++,()=>f.flying=true,()=>f.flying=false,()=>f.hp=0,()=>f.hp=100,()=>w.obstacles.push({x:10,z:0,w:1,h:1}),()=>w.obstacles[0].w++]){mutate();const next=trackingMineObstacles(w);assert.notEqual(next,old);assert.equal(trackingMineObstacles(w),next);old=next;}
 w.fortifications.delete(f.id);assert.notEqual(trackingMineObstacles(w),old);
});
test('cached visibility graph reuses edges and invalidates terrain stages',()=>{
 const w=make();w.fortifications.set(100,fort(100,1,0));const obstacles=trackingMineObstacles(w);let calls=0;
 const terrain:any={definition:{},stage:1,canOccupy:()=>true,walkLine:()=>{calls++;return true;},routeGoal:(_:any,b:any)=>b};
 const route=()=>mineRouteGoal({x:-2,z:0},{x:4,z:0},.3,obstacles,terrain,80);
 route();const cold=calls;calls=0;route();const warm=calls;assert.ok(warm<cold,{cold,warm} as any);
 terrain.stage=2;calls=0;route();assert.equal(calls,cold);
});
test('continuous obstacle intersections preserve tangents and catch thin blockers',()=>{
 const o=[{x:0,z:0,w:.01,h:2}];assert.equal(mineClearLine({x:-1,z:0},{x:1,z:0},.3,o),false);
 assert.equal(mineClearLine({x:-1,z:1.3},{x:1,z:1.3},.3,o),true);
 assert.equal(mineClearLine({x:-1,z:1.299},{x:1,z:1.299},.3,o),false);
});
test('pod and economic lifecycle changes, main hive and expansion removal invalidate snapshots',()=>{
 const w=make();let old=trackingMineObstacles(w);
 const changed=()=>{const next=trackingMineObstacles(w);assert.notEqual(next,old);old=next;};
 const pod:any={...fort(110),status:'falling'};w.pods.push(pod);changed();
 pod.status='active';assert.equal(trackingMineObstacles(w),old);
 pod.status='opening';assert.equal(trackingMineObstacles(w),old);
 pod.status='gone';changed();
 const economic:any={...fort(111),status:'active'};w.economicTargets.set(111,economic);changed();economic.status='building';changed();economic.status='active';changed();w.economicTargets.delete(111);changed();
 w.hive=fort(112) as any;changed();w.hive=null;changed();w.expansionHives.set(113,fort(113) as any);changed();w.expansionHives.clear();changed();
});
test('narrow detour uses the actual mine radius when extra clearance is unavailable',()=>{
 const w=make();w.obstacles=[{x:1.5,z:0,w:.3,h:1},{x:1.5,z:1.35,w:8,h:.2},{x:1.5,z:-1.35,w:8,h:.2}];
 const m=newSupportMine(100,{x:0,z:0}),target=w.addUnit('zergling','zerg',3,0);let hit=false;
 for(let i=0;i<360&&!hit;i++){w.time=i/60;const before={...m.point};hit=advanceTrackingMine(w,m,[target]);assert.ok(mineClearLine(before,m.point,.3,trackingMineObstacles(w)));}
 assert.ok(hit,JSON.stringify(m));
});
