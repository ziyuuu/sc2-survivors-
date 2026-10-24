import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
const run=process.argv[2]??'measure-1',revision=process.argv[3]??'r1',folder='performance-u04-20261020-candidate-'+revision,root=path.resolve('reports/local/performance-u04-20261020',run);
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
await fs.writeFile('preview/'+folder+'/measure.html','<!doctype html><html><body><script src="modules.js"></script></body></html>');
const report={run,build:JSON.parse(await fs.readFile('preview/'+folder+'/node-build-inputs.json')),counts:{},samples:[],errors:[]},hash=x=>createHash('sha256').update(x).digest('hex'),save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
let browser;
try{
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>report.errors.push(e.message));
 const served=[];page.on('response',r=>{if(r.url().endsWith('modules.js'))served.push(r.body().then(b=>({url:r.url(),sha256:hash(b)})));});
 await page.goto('http://127.0.0.1:4436/'+folder+'/measure.html');await page.waitForFunction(()=>window.U04);
 report.served=await Promise.all(served);assert.ok(report.served.some(r=>r.sha256===report.build.outputs[0].sha256));
 await page.evaluate(()=>{
  const env=()=>({build:'local',release:'local',device:'desktop',orientation:'landscape',animation:'complete',diagnostic:true}),uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
  const make=(variant,history)=>{
   const w=new U04.World({sandbox:true,initial:['marine'],waves:false,terrain:false,obstacles:[]});w.start();w.runId=uid(900);
   for(let i=1;i<16;i++)w.addUnit('marine','terran',i,0);for(let i=0;i<300;i++)w.addUnit('roach','zerg',i,20);
   w.expedition.ledger=Array.from({length:history},(_,i)=>({id:i,family:'marine',passengers:[]}));
   const client={active:true,identity:{consentId:'local-test'},record:()=>{},readObservation:()=>null,writeObservation:()=>{},persist:()=>{},flush:()=>{}},o=new U04[variant].GameObserver(w,client,env);o.syncConsent();o.frame(16.7,0,true);
   return {w,o,client};
  };
  const fixtures={};for(const v of ['baseline','candidate'])fixtures[v]={short:make(v,0),long:make(v,10000)};
  const summary=(n,big=false)=>({race:'terran',difficulty:'normal',stage:1,mode:'campaign',playerLevel:0,seconds:0,runSeconds:0,status:'reached',partial:false,damage:0,healed:0,shieldRestored:0,deaths:0,revivals:0,kills:0,
   roster:[...U04.IDENTITIES].slice(0,n).map(id=>({id,rank:7,count:200})),contributions:[...U04.IDENTITIES].slice(0,n).map(id=>({id,damage:big?999999999999:0,healed:big?999999999999:0,shieldRestored:big?999999999999:0,deaths:0,revivals:0})),talents:{},research:{},performance:{p95:0,p99:0,frames:0,longFrames:0,peakUnits:0,backlogDelta:0}});
  const queues={
   normal:Array.from({length:200},(_,i)=>({...env(),id:uid(i+1000),sessionId:uid(100),runId:null,kind:'session_start',at:Date.now(),data:{}})),
   overflow:Array.from({length:200},(_,i)=>({...env(),id:uid(i+1000),sessionId:uid(100),runId:uid(900),kind:i%3?'stage_summary':'heartbeat',at:Date.now(),data:summary(120)})),
   batch:Array.from({length:100},(_,i)=>({...env(),id:uid(i+1000),sessionId:uid(100),runId:uid(900),kind:'heartbeat',at:Date.now(),data:summary(12)})),
  };
  queues.bounded=queues.batch.slice(0,32);
  if(JSON.stringify(queues.bounded).length*3>256*1024)throw Error('Bounded flush fixture exceeds queue cap');
  const transports={};for(const v of ['baseline','candidate']){const c=new U04[v].TelemetryClient({protocol:'http:',request:async()=>new Response('{"accepted":[]}')});c.config={enabled:true,version:U04.CONSENT_VERSION};c.identity={status:'active',version:U04.CONSENT_VERSION,consentId:'local',uploadToken:'local',optedAt:0};c.sessionId=uid(100);transports[v]=c;}
  window.U04Bench={fixtures,queues,transports,
   counts(variant){
    const {o,w,client}=make(variant,10000),c={changed:0,roster:0,economy:0,ledgerIds:0};
    for(const [name,key]of [['changed','changed'],['updateRoster','roster'],['observeEconomy','economy']]){const original=o[name].bind(o);o[name]=(...args)=>{c[key]++;return original(...args);};}
    for(const j of w.expedition.ledger){const id=j.id;Object.defineProperty(j,'id',{get:()=>{c.ledgerIds++;return id;},configurable:true});}
    const result={};for(const active of [false,true]){Object.keys(c).forEach(k=>c[k]=0);client.active=active;for(let i=0;i<120;i++){if(i%6===0)w.changed();o.frame(16.7,0,active);}result[active?'enabled':'disabled']={...c};}
    return result;
   },
   async measure(variant,kind,n){
    const {o,w,client}=fixtures[variant][kind.includes('long')?'long':'short'];client.active=kind!=='off';
    const c=transports[variant],queue=queues[kind==='trim-overflow'?'overflow':kind==='flush-bounded'?'bounded':kind==='flush'?'batch':'normal'];
    const fn=kind.startsWith('trim')?()=>{c.queue=queue.slice();c.trim();}:kind==='off'?()=>o.frame(16.7,0,true):(kind==='changed'||kind==='changed-long')?()=>o.changed():kind.includes('advance')?()=>{w.tick++;w.time=w.tick/60;o.frame(16.7,0,true);}:()=>o.frame(16.7,0,true);
    if(kind.startsWith('flush')){for(let i=0;i<5;i++){c.queue=queue.slice();await c.flush();}const at=performance.now();for(let i=0;i<n;i++){c.queue=queue.slice();await c.flush();}return (performance.now()-at)/n;}
    for(let i=0;i<(kind==='trim-overflow'?1:20);i++)fn();const at=performance.now();for(let i=0;i<n;i++)fn();return (performance.now()-at)/n;
   }
  };
 });
 for(const variant of ['baseline','candidate'])report.counts[variant]=await page.evaluate(v=>U04Bench.counts(v),variant);
 const scenarios=process.env.SC2_U04_BATCH_ONLY==='1'?[['flush-bounded',120]]:[['off',50000],['unchanged',5000],['changed',3000],['advance',3000],['unchanged-long',1000],['changed-long',1000],['advance-long',1000],['trim-normal',300],['trim-overflow',2],['flush',60]];
 for(const [kind,n]of scenarios){
  for(let round=0;round<8;round++)for(const variant of round%2?['candidate','baseline']:['baseline','candidate'])report.samples.push({kind,n,round,variant,ms:await page.evaluate(({variant,kind,n})=>U04Bench.measure(variant,kind,n),{variant,kind,n})});
  await save();console.log('Measured '+kind);
 }
 assert.deepEqual(report.counts.candidate.disabled,report.counts.baseline.disabled);assert.equal(report.errors.length,0);report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);}finally{await save();await browser?.close();}
console.log(JSON.stringify({run,pass:report.pass,counts:report.counts,failure:report.failure?.slice(0,500)}));

