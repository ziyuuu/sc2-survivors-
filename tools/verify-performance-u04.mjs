import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const run=process.argv[2]??'proof-1',revision=process.argv[3]??'r1',root='reports/local/performance-u04-20261020/'+run;
await fs.mkdir(root,{recursive:false});await fs.copyFile(import.meta.filename,root+'/runner.mjs');
await import('../preview/performance-u04-20261020-candidate-'+revision+'/modules.js');
const {World,observeRecovery,baseline,candidate,CONSENT_VERSION,IDENTITIES}=globalThis.U04;
const env=()=>({build:'local',release:'local',device:'desktop',orientation:'landscape',animation:'complete',diagnostic:true});
const report={run,build:JSON.parse(await fs.readFile('preview/performance-u04-20261020-candidate-'+revision+'/node-build-inputs.json','utf8')),checks:[]};
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex'),uid=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),settle=()=>new Promise(r=>setTimeout(r,0));
const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));
try{
 const make=(api)=>{const w=new World({sandbox:true,seed:529,initial:['marine','medivac'],waves:false,obstacles:[],terrain:false});w.start();w.runId=uid(900);const events=[],cards=[];const client={active:false,identity:{consentId:'consent-a'},record:e=>events.push(structuredClone(e)),readObservation:()=>null,writeObservation:value=>{client.saved=structuredClone(value);},persist:()=>{},flush:()=>{}};const o=new api.GameObserver(w,client,env);o.card=(...args)=>cards.push(args);return {w,o,client,events,cards};};
 const a=make(baseline),b=make(candidate);b.w.restoreRun(a.w.captureRun());b.w.paused=a.w.paused;
 const pair=[a,b],compare=name=>{
  assert.deepEqual(b.o.summary(),a.o.summary(),name+' summary');assert.deepEqual(b.events,a.events,name+' events');assert.deepEqual(b.cards,a.cards,name+' cards');assert.deepEqual(b.w.captureRun(),a.w.captureRun(),name+' World');
  report.checks.push({name,summary:hash(a.o.summary()),events:a.events.length,cards:a.cards.length,world:hash(a.w.captureRun())});
 };
 for(const x of pair){x.client.active=true;x.o.syncConsent();}compare('consent-start');
 for(let i=0;i<360;i++){
  for(const x of pair){if(i%3===0)x.w.step();if(i===25){const u=x.w.allies()[0],target=x.w.addUnit('roach','zerg',u.x+2,u.z,1);x.w.hit(target,20,[],1,'terran',0,1,u.id);observeRecovery(x.w,u,u,3,2);x.w.changed();}x.o.frame(i%7?16.7:24,.03,i<300);}
  compare('frame-'+i);
 }
 for(const x of pair){x.w.paused=true;x.w.changed();for(let i=0;i<50;i++)x.o.frame(100,.2,false);}compare('pause');
 for(const x of pair){x.w.allies()[0].rank=2;x.w.changed();x.w.allies()[0].rank=3;x.o.frame(100,.2,false);}compare('mutation-after-notification');
 const job=id=>({id,family:'marine',passengers:[{purpose:id%2?'body':'training',paid:{minerals:25,gas:3}}]});
 for(const x of pair){x.w.expedition.ledger.push(...Array.from({length:1100},(_,i)=>job(i+100)));x.w.changed();x.o.frame(100,.2,false);}compare('1100-new-orders');
 for(const x of pair){for(let i=0;i<10;i++)x.w.changed();}compare('1100-unchanged-orders');
 for(const x of pair){x.w.expedition.ledger=structuredClone(x.w.expedition.ledger);x.w.changed();x.w.expedition.ledger.length=3;x.w.changed();x.w.expedition.ledger.push(job(2000));x.w.changed();}compare('restore-shrink-append');
 // Use valid World state again after the isolated receipt fixtures.
 for(const x of pair)x.w.expedition.ledger=[];
 for(const x of pair){x.w.paused=false;x.w.endStage();x.o.frame(16.7,0,false);const r=x.w.rewards[0];r.sold=true;r.purchaseReceipt={minerals:10,gas:2};x.w.changed();x.w.economyTotals.rerolls+=3;x.w.changed();}compare('reward-purchase-reroll');
 for(const x of pair){x.w.stage++;x.w.phase='battle';x.w.time=0;x.w.tick=0;x.w.changed();x.o.frame(10,0,true);}compare('stage-time-rewind');
 for(const x of pair){x.client.active=false;x.o.syncConsent();x.w.changed();x.o.frame(10,0,true);}compare('withdrawn');
 for(const x of pair){x.client.active=true;x.client.identity.consentId='consent-b';x.o.syncConsent();x.o.frame(10,0,true);}compare('regrant');
 for(const x of pair){x.w.phase='lost';x.w.changed();x.o.leaving();}compare('failed-leaving');
 for(const x of pair){x.w.phase='menu';x.w.changed();x.w.runId=uid(901);x.w.phase='battle';x.w.changed();x.o.frame(10,0,true);}compare('new-run');
 // Transport comparisons use only a local stub, deterministic IDs and memory.
 class Storage{map=new Map();getItem(k){return this.map.get(k)??null;}setItem(k,v){this.map.set(k,v);}removeItem(k){this.map.delete(k);}}
 const config={enabled:true,version:CONSENT_VERSION,operator:'local-test',contact:'',backupDays:null,retention:{}};
 function transport(api,storage=new Storage()){
  let now=Date.now(),ids=0;const requests=[],state={status:200,gate:null};
  const client=new api.TelemetryClient({storage,protocol:'http:',now:()=>now,uuid:()=>uid(++ids),secret:()=> 'a'.repeat(43),request:async(url,options)=>{
   const body=options?.body?JSON.parse(options.body):null;requests.push({url,body});
   if(state.gate&&url.endsWith('/batch'))await state.gate;
   return new Response(JSON.stringify(url==='/api/config'?config:url.endsWith('/batch')?{accepted:body.events.map(e=>e.id)}:{}),{status:state.status});
  }});
  return {client,requests,state,storage,setNow:n=>now=n};
 }
 const ta=transport(baseline),tb=transport(candidate),trans=[ta,tb],now=Date.now();for(const t of trans){t.setNow(now);await t.client.initialize();await t.client.allow();}
 const identical=name=>{assert.deepEqual(tb.client.queue,ta.client.queue,name+' queue');assert.deepEqual(tb.requests,ta.requests,name+' requests');assert.deepEqual([...tb.storage.map],[...ta.storage.map],name+' storage');assert.equal(tb.client.dropped,ta.client.dropped);report.checks.push({name,queue:ta.client.queue.length,dropped:ta.client.dropped,requests:ta.requests.length,payloadHash:hash(ta.requests)});};
 identical('transport-allow');
 const summary=(n,big=false)=>({race:'terran',difficulty:'normal',stage:1,mode:'campaign',playerLevel:0,seconds:0,runSeconds:0,status:'reached',partial:false,damage:0,healed:0,shieldRestored:0,deaths:0,revivals:0,kills:0,
 roster:[...IDENTITIES].slice(0,n).map(id=>({id,rank:7,count:200})),contributions:[...IDENTITIES].slice(0,n).map(id=>({id,damage:big?999999999999:0,healed:big?999999999999:0,shieldRestored:big?999999999999:0,deaths:0,revivals:0})),talents:{},research:{},performance:{p95:0,p99:0,frames:0,longFrames:0,peakUnits:0,backlogDelta:0}});
 for(let i=0;i<250;i++)for(const t of trans)t.client.record({...env(),id:uid(1000+i),runId:uid(900),kind:i%4?'card':'heartbeat',data:i%4?{id:'terran.mines',action:'purchased',quality:'purple',level:1,minerals:25,gas:3,mode:'campaign',stage:1}:summary(12)});
 identical('250-events-heartbeat-first-count-and-byte-limit');
 for(const t of trans){await t.client.persist();await t.client.flush();}identical('first-32-event-batch');
 for(let i=0;i<14;i++)for(const t of trans)t.client.record({...env(),id:uid(2000+i),runId:uid(900),kind:'stage_summary',data:summary(160,i%2===0)});
 identical('large-queue-byte-limit');
 for(let i=0;i<5;i++){for(const t of trans)await t.client.flush();identical('large-flush-'+i);}
 for(const t of trans){t.state.status=503;t.client.record({...env(),id:uid(3000),runId:null,kind:'session_start',data:{}});await t.client.flush();}identical('failed-upload-retained');
 for(const t of trans){t.state.status=200;t.setNow(now+86400001);await t.client.persist();}identical('one-day-expiration');
 // Simultaneous stable-ID replacement while an older payload is in flight.
 const flights=[],release=[];
 for(const t of trans){t.setNow(now);t.state.gate=new Promise(r=>release.push(r));t.client.record({...env(),id:uid(4000),runId:null,kind:'card',data:{id:'terran.mines',action:'purchased',quality:'purple',level:1,minerals:20,gas:0}});flights.push(t.client.flush());}
 await settle();for(const t of trans)t.client.record({...env(),id:uid(4000),runId:null,kind:'card',data:{id:'terran.mines',action:'purchased',quality:'purple',level:2,minerals:20,gas:0}});
 for(const r of release)r();await Promise.all(flights);identical('older-ack-preserves-newer-payload');
 for(const t of trans){t.state.gate=null;t.state.status=401;await t.client.flush();}identical('401-withdrawal');
 for(const t of trans){t.state.status=200;await t.client.retryPrivacy();await t.client.allow();await t.client.withdraw(true);}identical('regrant-delete');
 report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;console.error(e);}
await save();console.log(JSON.stringify({run,pass:report.pass,checks:report.checks.length,failure:report.failure?.slice(0,700)}));


