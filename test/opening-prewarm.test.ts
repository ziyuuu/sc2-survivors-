import test from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundPreparation} from '../src/app/background-preparation';
const flush=()=>new Promise<void>(r=>setTimeout(r,0));
test('optional warmup is deduplicated and required entrances drain the same lane',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);let release!:()=>void,loads=0;
 const job={key:'common',run:async()=>{loads++;await new Promise<void>(r=>release=r);}};
 lane.select([job,job]);lane.tick();await flush();
 let first=false,second=false;const a=lane.enter().then(r=>{first=true;return r;}),b=lane.enter().then(r=>{second=true;return r;});
 await flush();assert.equal(first,false);release();const leave=await a;assert.equal(second,false);leave();(await b)();
 lane.tick();await flush();assert.equal(loads,1);assert.equal(lane.pending,0);
});
test('selection replacement drops stale unstarted work and preserves completed common work',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),seen:string[]=[];
 const job=(key:string)=>({key,run:async()=>{seen.push(key);}});
 lane.select([job('common'),job('old')]);lane.tick();await flush();lane.select([job('common'),job('new')]);lane.tick();await flush();assert.deepEqual(seen,['common','new']);
});
test('optional failure stays local and does not prevent required retry',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);lane.select([{key:'fail',run:async()=>{throw Error('404');}}]);lane.tick();await flush();
 assert.deepEqual(lane.report().failed,['fail']);const release=await lane.enter();release();assert.equal(lane.report().held,0);
});
test('opening budget counts navigation time and releases the menu without awaiting a long task',async()=>{
 let now=12000,release!:()=>void;const lane=new BackgroundPreparation(()=>now,()=>true);
 lane.select([{key:'long',run:()=>new Promise<void>(r=>release=r)},{key:'later',run:async()=>{throw Error('not during opening');}}]);
 await lane.opening(now,async()=>{now+=100;await Promise.resolve();});assert.equal(now,15000);assert.equal(lane.busy,true);assert.equal(lane.report().opened,true);release();await flush();
});
test('opening finishes early when useful work is done and hidden/input/frame pressure defer optional starts',async()=>{
 let now=0,visible=false,count=0;const lane=new BackgroundPreparation(()=>now,()=>visible),job={key:'a',run:async()=>{count++;}};
 lane.select([job]);lane.tick();assert.equal(count,0);visible=true;lane.input();lane.tick();assert.equal(count,0);now=300;
 await lane.opening(0,async()=>{now+=10;await flush();});assert.equal(count,1);assert.ok(now<15000);
 lane.select([{key:'b',run:async()=>{count++;}}]);lane.frame(30);lane.tick();await flush();assert.equal(count,1);lane.frame(16);lane.tick();await flush();assert.equal(count,2);
});

test('evicted optional resources become eligible when their choice returns',async()=>{
 let ready=false,count=0;const lane=new BackgroundPreparation(()=>0,()=>true),job={key:'model',isReady:()=>ready,run:async()=>{count++;ready=true;}};
 lane.select([job]);lane.tick();await flush();assert.equal(count,1);ready=false;lane.select([job]);lane.tick();await flush();assert.equal(count,2);
});
