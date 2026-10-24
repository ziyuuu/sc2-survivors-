import test from 'node:test';
import assert from 'node:assert/strict';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
const flush=()=>new Promise<void>(r=>setTimeout(r,0));

test('stage window finishes immediately when ready and does not repeat completed work',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),leave=await lane.enter();let calls=0;
 const job={key:'a',run:async()=>{calls++;}};
 const result=await lane.prepareStage([job,job],9000);
 assert.deepEqual(result,{budgetMs:5000,elapsedMs:0,completed:1,remaining:0,failed:0,reason:'ready'});
 await lane.prepareStage([job],5000);assert.equal(calls,1);leave();
});
test('expired stage window releases without draining in-flight work and keeps one background lane',async()=>{
 const lane=new BackgroundPreparation(()=>performance.now(),()=>true),leave=await lane.enter(),seen:string[]=[];let finish!:()=>void;
 const jobs=[{key:'slow',run:async()=>{seen.push('slow');await new Promise<void>(r=>finish=r);}},{key:'next',run:async()=>{seen.push('next');}}];
 const result=await lane.prepareStage(jobs,40);assert.equal(result.reason,'budget');assert.equal(result.remaining,2);assert.equal(lane.busy,true);leave();
 lane.select([]);lane.tick();await flush();assert.deepEqual(seen,['slow']);finish();await flush();lane.tick();await flush();assert.deepEqual(seen,['slow','next']);
});
test('zero or invalid budget queues work without starting and fresh selection wins for a stage key',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),seen:string[]=[];lane.select([{key:'shared',run:async()=>{seen.push('old');}}]);
 const leave=await lane.enter();await lane.prepareStage([{key:'shared',run:async()=>{seen.push('new');}}],NaN);assert.deepEqual(seen,[]);leave();lane.tick();await flush();assert.deepEqual(seen,['new']);
});
test('failed optional jobs are reported as incomplete and can retry at the next entrance',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),leave=await lane.enter();let calls=0,ready=false;
 const job={key:'retry',isReady:()=>ready,run:async()=>{if(++calls===1)throw Error('injected failure');ready=true;}};
 const failed=await lane.prepareStage([job],5000);assert.equal(failed.reason,'failed');assert.equal(failed.failed,1);assert.equal(failed.completed,0);
 assert.equal((await lane.prepareStage([job],5000)).reason,'ready');assert.equal(calls,2);leave();
});
test('cancelling a window releases its waiter while a replacement entrance drains the active job',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true),leave=await lane.enter(),abort=new AbortController();let finish!:()=>void;
 const pending=lane.prepareStage([{key:'slow',run:()=>new Promise<void>(r=>finish=r)}],5000,abort.signal);
 while(!finish)await Promise.resolve();abort.abort();assert.equal((await pending).reason,'cancelled');leave();let entered=false;
 const next=lane.enter().then(release=>{entered=true;return release;});await flush();assert.equal(entered,false);finish();(await next)();assert.equal(lane.report().held,0);
});
test('an in-flight checkpoint yields back to ordinary background pacing after its window expires',async()=>{
 let now=0,passed=false;const lane=new BackgroundPreparation(()=>now,()=>true),leave=await lane.enter();
 const report=await lane.prepareStage([{key:'chunk',run:async()=>{now=100;await lane.checkpoint(()=>false,true,true);passed=true;}}],50);
 assert.equal(report.reason,'budget');assert.equal(passed,false);leave();await flush();await flush();assert.equal(passed,true);
});
test('stage preparation requires an owned entrance and cannot open two simultaneous windows',async()=>{
 const lane=new BackgroundPreparation(()=>0,()=>true);await assert.rejects(lane.prepareStage([],0),/独占/);
 const leave=await lane.enter(),abort=new AbortController();let finish!:()=>void;
 const pending=lane.prepareStage([{key:'slow',run:()=>new Promise<void>(r=>finish=r)}],5000,abort.signal);while(!finish)await Promise.resolve();
 await assert.rejects(lane.prepareStage([],0),/独占/);abort.abort();await pending;finish();leave();await flush();
});
test('stage admission uses only the time left after mandatory resources and ordinary reinforcement gets no window',async()=>{
 const calls:number[]=[],world:any={expedition:{race:'terran'}},view:any={initialAssetsLoaded:true,modelErrors:[],preparationKey:'same',prepareCurrentAssets:async()=>{await new Promise(r=>setTimeout(r,20));},waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0,stagePreparationJobs:()=>[]};
 const background:any={enter:async()=>()=>{},checkpoint:async()=>{},prepareStage:async(_:any,budget:number)=>{calls.push(budget);}};
 const gate=new AssetReadinessCoordinator(world,view,undefined,background);let ready=0;gate.onReady=()=>ready++;
 assert.equal(await gate.prepare('reinforcement'),true);assert.deepEqual(calls,[]);assert.equal(await gate.prepare('reinforcement',{stageAdvance:true}),true);
 assert.equal(calls.length,1);assert.ok(calls[0]>0&&calls[0]<4990);assert.equal(ready,2);assert.deepEqual(world,{expedition:{race:'terran'}});
});
test('cancelling a stage window cannot send a stale ready token or mutate World',async()=>{
 const world:any={expedition:{race:'terran'}},lane=new BackgroundPreparation(()=>0,()=>true);let finish!:()=>void;
 const view:any={initialAssetsLoaded:true,modelErrors:[],preparationKey:'same',prepareCurrentAssets:async()=>{},waitForPendingAssets:async()=>{},compilePresentation:async()=>{},warmPresentationBatches:async()=>0,stagePreparationJobs:()=>[{key:'slow',run:()=>new Promise<void>(r=>finish=r)}]};
 const gate=new AssetReadinessCoordinator(world,view,undefined,lane);let tokens=0;gate.onReady=()=>tokens++;
 const pending=gate.prepare('reinforcement',{stageAdvance:true});while(!finish)await Promise.resolve();gate.cancel();assert.equal(await pending,false);assert.equal(tokens,0);assert.equal(gate.state.kind,null);assert.deepEqual(world,{expedition:{race:'terran'}});finish();await flush();assert.equal(lane.report().held,0);
});
