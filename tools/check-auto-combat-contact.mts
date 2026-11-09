/** Finite same-input contact comparison. Enemy fixtures remain stationary; hits use real combat. */
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {ELITES} from '../src/data/elites';
import {setup} from './performance-s09-cases.mjs';
const C=process.argv.includes('--baseline')?(await import('../reports/local/auto-combat-20261106/baseline-src/simulation/world')).World:World;
const results=[];
for(const kind of ['mixed-zergling','mixed-zealot','mixed-ultralisk','wall','neighbor','unreachable']){
 if(process.env.SC2_CONTACT_CASE&&process.env.SC2_CONTACT_CASE!==kind)continue;
 let w:World,units:any[],targets:any[];
 if(kind.startsWith('mixed-')){const fixture=setup({World:C,ELITES},{id:kind.slice(6),scenario:'mixed-live'});w=fixture.w;units=[fixture.u];targets=[fixture.target];}
 else{
  w=new C({sandbox:true,waves:false,terrain:false,obstacles:[],seed:619});w.start();w.entities.clear();w.anchor.x=w.anchor.z=0;
  units=Array.from({length:kind==='neighbor'?8:1},(_,i)=>w.addUnit(i%2?'zealot':'zergling','terran',-i*.6,0));
  targets=[w.addUnit('roach','zerg',4,0)];
  if(kind==='neighbor')targets.push(w.addUnit('roach','zerg',4,1.3));
  if(kind==='wall')w.obstacles.push({x:2,z:0,w:.5,h:3});
  if(kind==='unreachable'){targets.push(w.addUnit('roach','zerg',0,6));w.obstacles.push({x:2.8,z:0,w:.4,h:3.4},{x:5.2,z:0,w:.4,h:3.4},{x:4,z:1.5,w:2.8,h:.4},{x:4,z:-1.5,w:2.8,h:.4});}
  for(const e of targets){e.hp=e.maxHp=100000;e.stoppedUntil=100;}
 }
 const first=new Map<number,number>();let overlaps=0;
 for(let i=0;i<600;i++){w.step();for(const u of units)if(u.shotSequence&&!first.has(u.id))first.set(u.id,w.time);for(const u of units)for(const o of w.obstacles)if(Math.abs(u.x-o.x)<o.w/2-u.unitRadius*.2&&Math.abs(u.z-o.z)<o.h/2-u.unitRadius*.2)overlaps++;}
 results.push({kind,seconds:10,first:[...first.values()],shots:units.map(u=>u.shotSequence??0),damage:targets.map(t=>t.maxHp-t.hp),wallOverlaps:overlaps,units:units.map(u=>({id:u.id,x:u.x,z:u.z,target:u.attackTarget,action:u.action,unavailable:targets.map(t=>w.combatSlots.unavailable(u.id,t.id,w.time))}))});
}
fs.writeFileSync(process.argv[2],JSON.stringify(results,null,2));console.log(JSON.stringify(results));
