import test from 'node:test';import assert from 'node:assert/strict';
import {CoverPreference,COVER_PREFERENCE_KEY} from '../src/ui/presentation/cover-preference';
function storage(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},values};}
test('most frequently started race, recent tie and manual lock persist independently of gameplay state',()=>{
 const saved=storage(),p=new CoverPreference(saved);assert.equal(p.preferredRace('protoss'),'protoss');
 p.recordStartedRun('terran');p.recordStartedRun('terran');p.recordStartedRun('zerg');assert.equal(p.preferredRace('zerg'),'terran');p.recordStartedRun('zerg');assert.equal(p.preferredRace('terran'),'zerg');
 p.toggleLock('protoss');p.recordStartedRun('terran');assert.equal(p.preferredRace('terran'),'protoss');assert.equal(new CoverPreference(saved).preferredRace('terran'),'protoss');
 p.toggleLock('protoss');assert.equal(p.preferredRace('zerg'),'terran');assert.deepEqual([...saved.values.keys()],[COVER_PREFERENCE_KEY]);
});
test('invalid or unavailable preference storage falls back and never blocks menu use',()=>{
 for(const data of ['broken',JSON.stringify({version:1,starts:{terran:-1,zerg:0,protoss:0},lastRace:null,lockedRace:null})]){const saved=storage();saved.setItem(COVER_PREFERENCE_KEY,data);assert.equal(new CoverPreference(saved).preferredRace('zerg'),'zerg');}
 const p=new CoverPreference({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});p.recordStartedRun('zerg');p.toggleLock('protoss');assert.equal(p.preferredRace('terran'),'protoss');
});
