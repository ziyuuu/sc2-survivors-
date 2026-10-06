import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {captureCurrentRules} from './current-rules-capture';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {checksum,encodeGraph} from '../src/persistence/graph-codec';
import {SaveRepository} from '../src/persistence/save-repository';
import {RunSession} from '../src/app/run-session';
import {RUN_SCHEMA} from '../src/simulation/persistence/run-snapshot';

test('current cleanup preserves 72 complete campaign configurations and 690 body/rank fingerprints',()=>{
 const {commit,...expected}=JSON.parse(fs.readFileSync(new URL('./fixtures/current-rules-20261006.json',import.meta.url),'utf8'));
 assert.equal(commit,'07b3f68e56f02fae1902ba4e563cb67a3e821c05');
 assert.deepEqual(captureCurrentRules(),expected);
});

test('only the current run schema is accepted; rejected older/future archives never mutate a live run',()=>{
 const w=new World({sandbox:true,terrain:false,waves:false});w.start();
 const stable=w.captureRun(),profile=w.permanentProfile.exportJSON(),session=new RunSession(w,null,{run:null,savedAt:0,notice:''});
 for(const schema of [2,3,4,5,16,20,21,22,23,RUN_SCHEMA+1]){
  const run={...structuredClone(stable),schema};
  const raw=writeArchive({profile,run:run as typeof stable});
  assert.throws(()=>readArchive(raw),/版本不兼容/);
  assert.throws(()=>session.inspectSave(raw),/版本不兼容/);
  assert.deepEqual(w.captureRun(),stable);assert.equal(w.permanentProfile.exportJSON(),profile);
 }
 assert.equal(JSON.stringify(encodeGraph(readArchive(writeArchive({profile,run:stable})).bundle.run)),JSON.stringify(encodeGraph(stable)));
 assert.equal('p4Samples' in stable.state,false);assert.equal('enabled' in stable.state.eliteSupport,false);
 const sampleToggle=structuredClone(stable);Object.assign(sampleToggle.state.eliteSupport,{enabled:true});
 assert.throws(()=>readArchive(writeArchive({profile,run:sampleToggle})),/精英支援状态缺失/);
 const missingCap=structuredClone(stable);missingCap.state.eliteSupport.barriers.push({source:1,target:2,amount:1,until:1} as never);
 assert.throws(()=>readArchive(writeArchive({profile,run:missingCap})),/医疗屏障无效/);
 assert.deepEqual(w.captureRun(),stable);
 for(const key of ['productionChoices','productionPlan','guardRemainders','groupNext','groupUnlocks','lordWarningPoint','burns','buildings','nextBuilding','freeRerolls','freePurchases','evolution'])assert.equal(key in stable.state,false,key);
});

test('one current permanent profile preserves race wallets, allocations and award receipts, rejecting migration fields',()=>{
 const p=new PermanentProfile(300);p.award('zerg:earned',400,'zerg');p.award('protoss:earned',500,'protoss');
 assert.ok(p.buy('T-A01'));assert.ok(p.selectRace('zerg'));assert.ok(p.buy('Z-A01'));
 const current=p.toSnapshot();assert.equal(current.version,6);assert.equal('imports' in current,false);
 const restored=PermanentProfile.parseJSON(p.exportJSON())!;assert.deepEqual(restored.toSnapshot(),current);
 assert.equal(restored.award('zerg:earned',400,'zerg'),false);
 const encode=(value:object)=>JSON.stringify({...value,checksum:checksum(JSON.stringify(value))});
 for(const version of [1,2,3,4,5,7])assert.equal(PermanentProfile.parseJSON(encode({...current,version})),null);
 assert.equal(PermanentProfile.parseJSON(encode({...current,imports:['old-source']})),null);
});

test('repository skips unsupported versions and recovers a current backup without rewriting any input',async()=>{
 const w=new World({sandbox:true,terrain:false,waves:false});w.start();const profile=w.permanentProfile.exportJSON(),run=w.captureRun();
 const current=writeArchive({profile,run}),old=writeArchive({profile,run:{...run,schema:23} as typeof run});let writes=0;
 const slots=[old,current,null],repo=new SaveRepository({read:async()=>[...slots],commit:async()=>{writes++;}}),loaded=await repo.load();
 assert.equal(loaded.raw,current);assert.match(loaded.notice,/备份/);assert.equal(writes,0);assert.deepEqual(slots,[old,current,null]);
 const unsupported=await new SaveRepository({read:async()=>[old,null,null],commit:async()=>{writes++;}}).load();
 assert.equal(unsupported.bundle,null);assert.match(unsupported.notice,/当前版本/);assert.equal(writes,0);
});
