import {test} from 'node:test';
import assert from 'node:assert/strict';
import {terrainFireClear} from '../src/simulation/combat/terrain-fire';
import {CharTerrain} from '../src/data/terrain';
import {translate} from '../src/simulation/movement/steering';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import type {MapDefinition} from '../src/data/map-definition';
import {World} from '../src/simulation/world';
test('ranged weapons can fire down a ledge without hitting their own plateau',()=>{
 const height=(p:{x:number})=>p.x>=0?3:0,high={x:3,z:0},low={x:-2,z:0};
 assert.ok(terrainFireClear(height,high,low));assert.ok(terrainFireClear(height,low,high));
 assert.equal(terrainFireClear(p=>p.x>0&&p.x<2?6:height(p),high,low),false);
 assert.ok(terrainFireClear(height,high,low,true,false));
});
test('high-ground Marine actually damages low-ground enemies; lings cannot bite through a cliff',()=>{
 const terrain=new CharTerrain(),w=new World({sandbox:true,waves:false,terrain,obstacles:[],initial:['marine']});w.start();
 const m=w.allies()[0];Object.assign(m,{x:26,z:8,moveSpeed:0});w.anchor={x:26,z:8,facing:0};
 const e=w.addUnit('roach','zerg',22,8);e.moveSpeed=0;e.weaponDamage=0;e.hp=e.maxHp=10000;
 for(let i=0;i<120;i++)w.step();assert.ok(e.hp<10000);assert.ok(m.lastShotAt>0);
 const ling=w.addUnit('zergling','zerg',23.7,8);Object.assign(m,{x:24.3,z:8});assert.equal(w.hasAttackLine(ling,m),false);
});

test('a legal diagonal slope step is not rejected by two illegal axis-only steps',()=>{
 const width=8,height=8,walkWidth=14,walkHeight=14,N=196;
 const d={version:1,source:{worldUnitsPerSc2Unit:1},width,height,walkWidth,walkHeight,cellSize:.5,origin:[0,0],heights:Array.from({length:64},(_,i)=>(i%8-Math.floor(i/8))*2),walk:Array(N).fill(1),opening:Array(N).fill(1),clearance:Array(N).fill(5)} as unknown as MapDefinition;
 const t=new MapTerrain(d),p={x:3,z:-3};assert.equal(t.canStep(p,{x:3.1,z:-3},.375),false);assert.ok(t.canStep(p,{x:3.1,z:-3.1},.375));translate(p,{x:.1,z:-.1},.375,false,[],20,t);assert.ok(Math.abs(p.x-3.1)<1e-9&&Math.abs(p.z+3.1)<1e-9);
});
