import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SpatialHash} from '../src/simulation/movement/spatial-hash';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import type {Body} from '../src/simulation/types';

test('plane query visits the same current-position neighbours in the same order',()=>{
 const hash=new SpatialHash<Body>();
 const bodies=Array.from({length:120},(_,id)=>({id,x:(id%12)*.38-2,z:Math.floor(id/12)*.4-2,hp:10,maxHp:10,armor:0,unitRadius:.3,flying:id%3===0,attributes:[],owner:id%2?'terran':'zerg'} as Body));
 hash.rebuild(bodies);
 const compare=(flying:boolean)=>{const old:number[]=[],plane:number[]=[];
  hash.visits=0;hash.query({x:0,z:0},2.8,b=>{if(b.flying!==flying)return;old.push(b.id);if(old.length===12)return false;});const oldVisits=hash.visits;
  hash.visits=0;hash.queryPlane({x:0,z:0},2.8,flying,b=>{plane.push(b.id);if(plane.length===12)return false;});assert.deepEqual(plane,old);return {oldVisits,planeVisits:hash.visits};
 };
 const ground=compare(false),air=compare(true);assert.ok(ground.planeVisits<ground.oldVisits);assert.ok(air.planeVisits<air.oldVisits);
 bodies[1].x=20;bodies[3].x=0;assert.deepEqual(compare(false).planeVisits<120,true);
});

test('a Viking changing planes between rebuilds preserves the current-plane query',()=>{
 const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();
 const v=w.addUnit('viking','terran',0,0),ground=w.addUnit('marine','terran',.5,0),air=w.addUnit('mutalisk','zerg',.8,0);
 w.hash.rebuild(w.entities.values());
 const ids=(flying:boolean)=>{const old:number[]=[],plane:number[]=[];w.hash.query(v,2,b=>{if(b.flying===flying)old.push(b.id);});w.hash.queryPlane(v,2,flying,b=>plane.push(b.id));assert.deepEqual(plane,old);return plane;};
 assert.deepEqual(ids(true),[v.id,air.id]);assert.deepEqual(ids(false),[ground.id]);
 v.nativeMode='viking_assault';w.refreshStats(v);assert.equal(v.flying,false);assert.deepEqual(ids(false),[v.id,ground.id]);assert.deepEqual(ids(true),[air.id]);
 w.hash.rebuild(w.entities.values());assert.deepEqual(ids(false),[v.id,ground.id]);
});

test('mixed-air battle steps match the unfiltered spatial-query control',()=>{
 const make=()=>{const w=new World({rulesVersion:THREE_RACE_RULES,sandbox:true,waves:false,terrain:false,obstacles:[],seed:421});w.start();w.entities.clear();w.autoWaves=false;
  for(let i=0;i<15;i++)w.addUnit(i===0?'viking':'marine','terran',i%5*.65,Math.floor(i/5)*.7);
  for(let i=0;i<75;i++)w.addUnit(i%4===0?'mutalisk':i%3===0?'roach':'zergling','zerg',4+i%15*.7,Math.floor(i/15)*.7);
  w.hash.rebuild(w.entities.values());return w;};
 const control=make(),optimized=make();
 control.hash.queryPlane=(p,r,flying,visit)=>control.hash.query(p,r,b=>b.flying===flying?visit(b):undefined);
 const state=(w:World)=>({rng:w.rngState,stats:{...w.stats},wallet:{...w.wallet},contacts:w.collisionContacts,units:[...w.entities.values()].map(u=>[u.id,u.x,u.z,u.hp,u.flying,u.attackTarget,u.action,u.weaponCooldown])});
 for(let tick=0;tick<90;tick++){if(tick===30)for(const w of [control,optimized]){const v=[...w.entities.values()].find(u=>u.unitType==='viking')!;v.nativeMode='viking_assault';w.refreshStats(v);}
  control.step();optimized.step();if(tick%15===0||tick===89)assert.deepEqual(state(optimized),state(control),`tick ${tick}`);
 }
});
