import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {beginSpecialStage,markSpecialReady,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {collectSpecialRewards} from '../src/simulation/special-stages/rewards';
import type {Race} from '../src/data/races';
import type {UnitType} from '../src/data/sc2-units';
test('crossing mixed mobile rear ranks obey the exit order instead of settling behind the line',()=>{
 const types=['marine','reaper','medivac','viking'] as UnitType[];
 const w=new World({difficulty:'normal',seed:529,waves:false,terrain:new FlatTerrain(),initial:[],obstacles:[]});w.start();w.stage=4;w.prepareStage();w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(let i=0;i<36;i++)w.addUnit(types[i%4],'terran',0,0,1);
 assert.ok(beginSpecialStage(w,'crossing','fixture'));assert.ok(markSpecialReady(w));const a=w.specialStages.active!;
 // Isolate the exit at legal open positions, then use only normal movement.
 for(const [i,u] of w.allies().entries()){u.x=(i%6-2.5)*1.4;u.z=-42+Math.floor(i/6)*.7;u.prev={x:u.x,z:u.z};}
 w.anchor={x:0,z:-46,facing:Math.PI};w.trail=[{x:0,z:-46}];assert.ok(w.issueMove({x:0,z:-50}));
 for(let i=0;i<3600&&a.phase==='active';i++)w.step();
 assert.equal(a.phase,'loot',JSON.stringify(w.allies().map(u=>({type:u.unitType,z:u.z}))));assert.equal(a.escaped.size,36);
});
for(const [race,type] of [['terran','marine'],['zerg','ravager'],['protoss','immortal']] as [Race,UnitType][])for(const count of [16,30,32,48,64])test(`crossing ${race} ${count}: legal entry, native evacuation and frozen return`,()=>{
 const w=new World({race,difficulty:'normal',seed:529,waves:false,terrain:new FlatTerrain(),initial:[],obstacles:[]});w.start();w.stage=4;w.prepareStage();w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(let i=0;i<count;i++)w.addUnit(type,'terran',(i%5-2)*2,Math.floor(i/5)*2,1);
 const positions=w.allies().map(u=>({id:u.id,x:u.x,z:u.z})),time=w.time;
 assert.ok(beginSpecialStage(w,'crossing','fixture'));assert.ok(markSpecialReady(w));const a=w.specialStages.active!;
 assert.equal(a.participants.length,count);
 const entered=w.allies().map(u=>({id:u.id,x:u.x,z:u.z}));
 for(const u of w.allies()){assert.ok(w.terrain!.canOccupy(u,u.unitRadius),JSON.stringify({type,count,id:u.id,x:u.x,z:u.z,r:u.unitRadius}));assert.deepEqual(u.prev,{x:u.x,z:u.z});}
 if(count<=30)for(const [i,u] of w.allies().entries()){const columns=Math.min(7,Math.ceil(Math.sqrt(count)));assert.equal(u.z,47.25+Math.floor(i/columns)*1.4);}
 assert.ok(w.issueMove({x:0,z:44}));for(let i=0;i<600;i++)w.step();
 for(const p of entered){const u=w.entities.get(p.id)!;assert.ok(w.terrain!.canOccupy(u,u.unitRadius));assert.ok(Math.hypot(u.x-p.x,u.z-p.z)>.1,'entry member must move');}
 // Straight centre commands exercise native wall routing and rear-rank exit.
 assert.ok(w.issueMove({x:0,z:-51}));for(let i=0;i<18000&&a.phase==='active';i++)w.step();
 assert.equal(a.phase,'loot');assert.equal(a.participants.length,count);
 // Native fork guards may kill bodies. Every participant must be accounted
 // for as escaped or dead; no living body may remain stranded at entry.
 const dead=positions.filter(p=>!a.escaped.has(p.id));
 for(const p of dead)assert.ok(!w.entities.has(p.id)||w.entities.get(p.id)!.hp<=0);
 assert.equal(a.escaped.size+dead.length,count);assert.ok(a.escaped.size>0);
 collectSpecialRewards(w);assert.ok(quitSpecialStage(w));assert.equal(w.time,time);
 for(const p of positions.filter(p=>a.escaped.has(p.id))){const u=w.entities.get(p.id)!;assert.ok(u.hp>0);assert.equal(u.x,p.x);assert.equal(u.z,p.z);}
});
