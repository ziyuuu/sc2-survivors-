import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {GameObserver} from '../src/services/game-observer';
import {TelemetryClient} from '../src/services/telemetry-client';
import {CONSENT_VERSION} from '../tools/backend/contracts.mjs';
const env=()=>({build:'local',release:'local',device:'desktop' as const,orientation:'landscape' as const,animation:'complete',diagnostic:true});
const world=()=>{const w=new World({sandbox:true,initial:['marine'],waves:false,obstacles:[],terrain:false});w.start();return w;};
function fixture(){
 const w=world(),events:any[]=[],client={active:true,identity:{consentId:'test'},record:(e:any)=>events.push(structuredClone(e)),readObservation:()=>null,writeObservation:()=>{}} as unknown as TelemetryClient;
 const o=new GameObserver(w,client,env);o.syncConsent();return {w,o,client,events};
}
test('U04 repeated display frames preserve histograms; notified same-tick changes and post-notification mutations are observed',()=>{
 const {w,o}=fixture();let scans=0;const original=(o as any).updateRoster.bind(o);(o as any).updateRoster=()=>{scans++;original();};
 for(let i=0;i<120;i++)o.frame(16.7,i/100,true);
 assert.equal(scans,1);assert.equal((o.summary().performance as any).frames,120);
 assert.equal((o.summary().performance as any).p95,16.7);
 const unit=w.allies()[0];unit.rank=2;w.changed();unit.rank=3;o.frame(10,0,true);
 assert.equal((o.summary().roster as any[])[0].rank,3);
 assert.equal(scans,3);w.step();o.frame(10,0,true);assert.equal(scans,4);
 w.paused=true;for(let i=0;i<30;i++)o.frame(100,0,false);
 assert.equal((o.summary().performance as any).frames,122);
 w.stage++;o.frame(100,0,false);assert.equal(o.summary().stage,w.stage);
});
test('U04 ledger append, same-ID restore, shrink and new run retain purchase receipt deduplication',()=>{
 const {w,o}=fixture(),cards:any[]=[];(o as any).card=(...args:any[])=>cards.push(args);
 const job=(id:number)=>({id,family:'marine',passengers:[{purpose:'body',paid:{minerals:25,gas:1}}]}) as any;
 w.expedition.ledger.push(job(1));w.changed();w.changed();assert.equal(cards.length,1);
 w.expedition.ledger=structuredClone(w.expedition.ledger);w.changed();assert.equal(cards.length,1);
 w.expedition.ledger.push(job(2));w.changed();assert.equal(cards.length,2);
 w.expedition.ledger.length=0;w.changed();w.expedition.ledger.push(job(3));w.changed();assert.equal(cards.length,3);
 w.runId=crypto.randomUUID();w.changed();w.expedition.ledger.push(job(4));w.changed();assert.equal(cards.length,4);
 assert.deepEqual(cards.map(c=>c[6]),['production:1','production:2','production:3','production:4']);
});
test('U04 consent revoke and regrant at the same tick invalidates the observation reuse',()=>{
 const {w,o,client,events}=fixture();o.frame(10,0,true);
 (client as any).active=false;o.syncConsent();const before=events.length;
 for(let i=0;i<20;i++){w.changed();o.frame(10,0,true);}assert.equal(events.length,before);
 (client as any).active=true;(client.identity as any).consentId='new-consent';o.syncConsent();o.frame(10,0,true);
 assert.equal(events.filter(e=>e.kind==='session_start').length,2);
 assert.equal((o.summary().performance as any).frames,1);
});
test('U04 queue trimming preserves heartbeat priority and exact serialized-length budget at boundary',()=>{
 const client=new TelemetryClient({protocol:'http:',now:()=>100000000});
 const event=(i:number,size:number,kind='fault')=>({id:String(i),kind,at:100000000,data:{text:'界😀"\\\n'.repeat(size)}});
 const oldTrim=(queue:any[])=>{let bytes=JSON.stringify(queue).length*3;while(queue.length>200||bytes>256*1024){const i=queue.findIndex(e=>e.kind==='heartbeat');queue.splice(i<0?0:i,1);bytes=JSON.stringify(queue).length*3;}return queue;};
 for(const count of [0,1,2,32,199,200,201,260])for(const size of (count<=2?[0,30,200,10000]:[0,30,200])){
  const values=Array.from({length:count},(_,i)=>event(i,size,i%3?'fault':'heartbeat'));client.queue=structuredClone(values) as any;
  (client as any).trim();assert.deepEqual(client.queue,oldTrim(values));
 }
 assert.equal(client.active,false);client.config={enabled:true,version:CONSENT_VERSION} as any;assert.equal(client.active,false);
});
