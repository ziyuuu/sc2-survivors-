import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {routeDirection} from '../src/simulation/movement/direction-route';import {translateControlAnchor} from '../src/simulation/movement/control-anchor';import {translate,blocked} from '../src/simulation/movement/steering';import {campaignTerrain,MAP_THEMES} from '../src/data/campaign-map';import {TUNING} from '../src/data/game';
test('continuous command point ignores prop/terrain bodies and retains analog magnitude and invalid-input guard',()=>{
 const w={obstacles:[{x:0,z:0,w:20,h:20}],terrain:{canOccupy(){throw Error('Control point queried occupancy');},canStep(){throw Error('Control point queried elevation');}}} as unknown as World;
 assert.deepEqual(routeDirection(w,{x:.25,z:0},null,1/60),{direction:{x:.25,z:0},cache:null});const d=routeDirection(w,{x:1,z:1},null,1/60).direction;assert.ok(Math.abs(Math.hypot(d.x,d.z)-1)<1e-12);
 for(const x of [NaN,Infinity])assert.deepEqual(routeDirection(w,{x,z:0},null,1/60).direction,{x:0,z:0});
});
test('zero-volume anchor crosses solid props and elevation while actual ground translation remains blocked',()=>{
 const obstacles=[{x:1,z:0,w:2,h:4}],terrain={isOpen:()=>true,canStep:()=>false},anchor={x:-1,z:0},body={x:-1,z:0};
 translateControlAnchor(anchor,{x:3,z:0},20,terrain);assert.deepEqual(anchor,{x:2,z:0});translate(body,{x:3,z:0},.8,false,obstacles,20,terrain as never);assert.deepEqual(body,{x:-1,z:0});
});
test('control point preserves world edge, opened sectors and boundary sliding without a radius',()=>{
 const a={x:9.9,z:0};translateControlAnchor(a,{x:1,z:1},10);assert.deepEqual(a,{x:10,z:1});const b={x:0,z:0};translateControlAnchor(b,{x:3,z:1},10,{isOpen:p=>p.x<=1});assert.equal(b.x,0);assert.equal(b.z,1);
 const c={x:0,z:0};translateControlAnchor(c,{x:4,z:0},10,{isOpen:p=>p.x<1||p.x>2});assert.deepEqual(c,{x:0,z:0});
});
test('actual World continuous movement crosses a wall, soldiers retain collision, release stops and save restores exactly',()=>{
 const w=new World({sandbox:true,terrain:false,waves:false,obstacles:[{x:2,z:0,w:2,h:8}]});w.start();w.issueMove({x:-10,z:0});w.input={x:1,z:0};let entered=false;
 for(let i=0;i<150;i++){w.step();entered||=blocked(w.anchor,0,w.obstacles);for(const u of w.allies().filter(u=>!u.flying))assert.equal(blocked(u,u.unitRadius,w.obstacles),false);}
 assert.ok(entered);assert.ok(w.anchor.x>3);assert.equal(w.order,null);w.resetDirectionalInput();const at={...w.anchor};w.advance(.3);assert.deepEqual(w.anchor,at);w.paused=true;const run=w.captureRun(),clone=new World({sandbox:true,terrain:false,waves:false,obstacles:w.obstacles});clone.restoreRun(run);assert.deepEqual(clone.captureRun(),run);
});
test('all five current maps accept an anchor on solid cells and restore without granting bodies occupancy',()=>{
 for(const theme of Object.keys(MAP_THEMES) as (keyof typeof MAP_THEMES)[]){const terrain=campaignTerrain({version:3,theme,seed:10609});terrain.setStage(18);const d=terrain.definition,i=d.walk.findIndex((walk,i)=>!walk&&d.opening[i]>0&&d.opening[i]<=18&&Math.hypot((i%d.walkWidth+.5)*d.cellSize-d.origin[0],d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize)<50);assert.ok(i>=0,theme);const p={x:(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize};assert.equal(terrain.isOpen(p),true);assert.equal(terrain.canOccupy(p,0),false);
  const w=new World({waves:false,terrain});w.start();w.stage=18;w.prepareStage();w.anchor.x=p.x;w.anchor.z=p.z;w.input={x:.25,z:0};const x=w.anchor.x;w.step();assert.ok(Math.abs(w.anchor.x-x-TUNING.anchorSpeed*TUNING.step*.25)<1e-10,theme);w.paused=true;const r=w.captureRun(),clone=new World({waves:false,terrain:campaignTerrain(r.config.campaignMap!)});clone.restoreRun(r);assert.deepEqual(clone.captureRun(),r);
 }
});
