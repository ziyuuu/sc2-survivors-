import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {setup,snapshot} from './performance-s07-cases.mjs';
import {make} from './performance-s01-s02-cases.mjs';
const root='reports/local/performance-s07-20261020',libs={baseline:await import('../'+root+'/baseline-r3-logic/main.mjs'),candidate:await import('../'+root+'/candidate-r4-logic/main.mjs')},report={pass:false,rows:[]};
const paired=(name,run)=>{const old=run(libs.baseline),now=run(libs.candidate);assert.deepEqual(now,old,name);report.rows.push({name,exact:true,result:now.result});};
paired('same-tick cliff placement mutations',lib=>{
 const {w,source:u,target:to,data}=setup(lib,'cliff',0),result=[];
 const read=()=>{const value=lib.legalCliffCrossing(w,u,to);result.push(value);return value;};assert.equal(read(),true);
 const p={type:'PathingBlocker',blockerSize:1,position:[9.5,10,0],rotation:0,scale:[1,1,1],unit:false};data.placements.push(p);assert.equal(read(),false);
 p.position=[18,1,0];assert.equal(read(),true);p.position=[9.5,10,0];delete p.blockerSize;p.footprint='1x2';assert.equal(read(),false);
 p.rotation=Math.PI/3;read();data.placements=[];assert.equal(read(),true);
 return {result,state:snapshot(lib,w)};
});
paired('same-tick body movement death flight and cliff reservation',lib=>{
 const {w,source:u,target:to}=setup(lib,'cliff',0),b=w.addUnit('roach','zerg',to.x,to.z),result=[];
 const read=()=>{const value=lib.legalCliffCrossing(w,u,to);result.push(value);return value;};assert.equal(read(),false);b.hp=0;assert.equal(read(),true);b.hp=b.maxHp;b.flying=true;assert.equal(read(),true);b.flying=false;b.x=18;b.cliffTransit={kind:'jump',from:{x:b.x,z:b.z},to,startedAt:0,until:1};assert.equal(read(),false);b.cliffTransit=undefined;assert.equal(read(),true);
 return {result,state:snapshot(lib,w)};
});
paired('live cap and corpse lifecycle remain distinct',lib=>{
 const {w}=setup(lib,'step',300);for(let i=0;i<1000;i++){const b=w.addUnit('roach','zerg',30,30);b.hp=0;b.deadAt=w.time;}
 assert.equal(w.enemyCount(),300);const before=w.entities.size;w.step();assert.equal(w.entities.size,before);
 for(const b of w.entities.values())if(b.hp<=0)b.deadAt=w.time-2;w.step();assert.equal(w.entities.size,301);
 return {result:{before,after:w.entities.size,live:w.enemyCount()},state:snapshot(lib,w)};
});
paired('ordered blink commit with eight actual units',lib=>{
 const {w,units}=setup(lib,'blink',300),p={x:0,z:5},preview=lib.familyAbilityState(w,'stalker',p);assert.ok(preview.enabled);
 assert.ok(w.castFamilyAbility('stalker',p));const moved=units.filter(u=>(u.abilityReady??0)>w.time).length;assert.ok(moved>0);
 return {result:{moved,positions:units.map(u=>({x:u.x,z:u.z,ready:u.abilityReady}))},state:snapshot(lib,w)};
});
paired('transfer rechecks blocked commit and succeeds atomically after removal',lib=>{
 const profile=new lib.PermanentProfile(),race='terran',levels=Object.fromEntries(lib.MVP_TALENTS.filter(n=>n.race===race&&n.line==='micro').map(n=>[n.id,n.maxRank]));assert.ok(profile.award('s07-transfer',64,race));const quote=profile.previewTalentAllocation(race,0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));
 const w=new lib.World({race,permanentProfile:profile,seed:529,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';w.starship.account.run.id=w.runId;if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id.length);
 w.entities.clear();for(let i=0;i<8;i++)w.addUnit('marine','terran',(i%4-1.5)*1.4,-Math.floor(i/4)*1.4);const p={x:0,z:10};assert.ok(lib.prepareTalentTransfer(w,p));const block=w.addUnit('roach','zerg',p.x,p.z);block.unitRadius=30;w.time=w.talentTransferPlan.readyAt;assert.equal(lib.finishTalentTransfer(w),false);assert.equal(w.airliftReady,0);block.hp=0;
 assert.ok(lib.prepareTalentTransfer(w,p));w.time=w.talentTransferPlan.readyAt;assert.ok(lib.finishTalentTransfer(w));return {result:{moved:w.allies().length,cooldown:w.airliftReady,plan:w.talentTransferPlan},state:snapshot(lib,w)};
});
report.pass=true;await fs.writeFile(root+'/boundaries-r1.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
