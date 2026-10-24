import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {setup,snapshot} from './performance-s07-cases.mjs';
import {run as baneling} from './performance-s09-cases.mjs';
const root='reports/local/performance-s07-20261020',revision=process.env.SC2_BATCH_REVISION??'-r4',a=await import('../'+root+'/baseline-r3-logic/main.mjs'),b=await import('../'+root+'/candidate'+revision+'-logic/main.mjs');
const report={pass:false,checks:0,local:[],steps:[],baneling:[],method:'Full production state/return pairs. World runs retain actual simulation; diagnostic dense initial placement and native diagnostic health lock are explicit. S09 actual 900-step behavior unchanged.'};
const equal=(x,y,name)=>{assert.deepEqual(y,x,name);report.checks++;};
try{
 for(const name of ['contacts','separation','cliff','cliff-blocked','cliff-placements','engage-hot','engage-cold','formation-hot','formation-cold','marauder','immortal','blink'])for(const n of [0,1,16,300]){
  if(name.startsWith('engage')&&n===0)continue;
  for(const seed of [529,1777]){
   const old=setup(a,name,n,seed),now=setup(b,name,n,seed);equal(snapshot(a,old.w),snapshot(b,now.w),name+' initial');
   for(let i=0;i<4;i++){equal(old.call()??null,now.call()??null,name+' return');equal(snapshot(a,old.w),snapshot(b,now.w),name+' state');}
   report.local.push({name,n,seed,exact:true});
  }
 }
 for(const theme of [undefined,...Object.keys(a.MAP_THEMES)])for(const n of [30,300]){
  const old=setup(a,'step',n,529,theme),now=setup(b,'step',n,529,theme);let maxContacts=0;
  for(let i=0;i<360;i++){old.w.step();now.w.step();maxContacts=Math.max(maxContacts,now.w.collisionContacts);if(i%60===59)equal(snapshot(a,old.w),snapshot(b,now.w),'step '+theme+' '+n+' '+i);}
  assert.equal(now.w.tick,960);assert.equal(now.w.phase,'battle');report.steps.push({theme:theme??'flat',n,ticks:360,maxContacts,exact:true});
 }
 for(const id of ['baneling','baneling.1','baneling.2','baneling.3','temporary','enemy'])for(const n of [12,24]){
  const options={id,n,scenario:id==='enemy'?(n===12?'mixed':'approach'):'mixed-live'},old=baneling(a,options),now=baneling(b,options);equal(old,now,'S09 '+id+' '+n);assert.ok(now.shots.length>0);report.baneling.push({options,shots:now.shots.length,minClearance:now.minClearance,exact:true});
 }
 for(const theme of Object.keys(a.MAP_THEMES)){const options={scenario:'mixed-live',theme},old=baneling(a,options),now=baneling(b,options);equal(old,now,'S09 '+theme);assert.equal(now.shots.length,3);report.baneling.push({options,shots:3,minClearance:now.minClearance,exact:true});}
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{await fs.writeFile(root+'/equivalence'+(process.env.SC2_REPORT_REVISION??revision)+'.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
