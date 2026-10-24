import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {make} from './performance-s01-s02-cases.mjs';import {setup} from './performance-s09-cases.mjs';
const root='reports/local/performance-s09-20261020',libs={baseline:await import('../'+root+'/baseline-logic/main.mjs'),candidate:await import('../'+root+'/candidate-r4-logic/main.mjs')},report={pass:false,rows:[]};
try{
 for(const [mode,lib] of Object.entries(libs))for(const targets of [true,false]){
  const w=make(lib,'zerg',529);assert.ok(w.acquireHero('zagara'));const hero=[...w.entities.values()].find(u=>u.heroId==='zagara');hero.x=-2;hero.z=-3;hero.prev={x:hero.x,z:hero.z};hero.stoppedUntil=1e9;hero.zergCombat.kills=10;
  if(targets){const target=w.addUnit('roach','zerg',0,6);target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;for(let i=0;i<12;i++)w.addUnit('hydralisk','terran',(i%4-1.5)*.8,1+Math.floor(i/4)*.8);}
  w.step();const children=w.allies().filter(u=>u.temporaryKind==='hero-baneling');assert.equal(children.length,2);
  for(const u of children)assert.equal(u.temporaryUntil-u.bornAt,10);
  const ended=new Map();for(let i=0;i<900;i++){w.step();for(const u of children)if((u.hp<=0||!w.entities.has(u.id))&&!ended.has(u.id))ended.set(u.id,w.time);}
  const rows=children.map(u=>({id:u.id,shots:u.shotSequence??0,bornAt:u.bornAt,until:u.temporaryUntil,hp:u.hp,recoveryUntil:u.recoveryUntil,ended:ended.get(u.id)}));
  if(mode==='candidate'&&targets)for(const u of children){assert.equal(u.shotSequence,1);assert.ok(u.hp<=0);assert.equal(u.recoveryUntil,undefined);}
  if(!targets)for(const u of children){assert.equal(u.shotSequence??0,0);assert.ok(ended.get(u.id)<=u.temporaryUntil+1/60);assert.equal(w.entities.has(u.id),false);}
  report.rows.push({mode,scenario:'native-zagara-hatch',targets,children:rows});
 }
 const lib=libs.candidate;
 for(const mutation of ['new-blocker','blockers-fly','blockers-die']){
  const {w,u,blockers}=setup(lib,{scenario:'mixed-live'});for(let i=0;i<60;i++)w.step();
  if(mutation==='new-blocker'){const other=w.addUnit('hydralisk','terran',u.x+.5,u.z+.6);other.stoppedUntil=1e9;}
  else for(const b of blockers)if(mutation==='blockers-fly')b.flying=true;else b.hp=0;
  for(let i=0;i<840;i++)w.step();assert.ok((u.shotSequence??0)>=2,mutation);report.rows.push({mode:'candidate',scenario:mutation,shots:u.shotSequence});
 }
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(root+'/boundaries-r1.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
