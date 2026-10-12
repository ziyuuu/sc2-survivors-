import test from 'node:test';
import assert from 'node:assert/strict';
import {BattleRenderer} from '../src/render/scene/battle-renderer';

test('opening warmup is shared and battle loading joins it before mutating the render scene',async()=>{
 let release!:()=>void,started!:()=>void,loads=0,warms=0,entered=false;
 const ready=new Promise<void>(r=>started=r),pending=new Promise<void>(r=>release=r);
 const view:any={openingPreparation:null,ensureUnitVariant:async(key:string,type:string)=>{assert.equal(key,'zergling');assert.equal(type,'zergling');loads++;started();await pending;return true;},warmPresentationBatches:async()=>{warms++;},prepareRescueAssets:async()=>{entered=true;throw Error('entry checkpoint');}};
 const first=BattleRenderer.prototype.prewarmOpeningAssets.call(view),second=BattleRenderer.prototype.prewarmOpeningAssets.call(view);
 assert.equal(first,second);await ready;
 const entry=BattleRenderer.prototype.load.call(view,()=>{},'terran',true);const checkpoint=assert.rejects(entry,/entry checkpoint/);
 await Promise.resolve();assert.equal(entered,false);release();await first;await checkpoint;
 assert.equal(loads,1);assert.equal(warms,1);assert.equal(entered,true);
});

test('optional opening failure leaves required entry available and never marks the full battlefield loaded',async()=>{
 let entered=false;const view:any={openingPreparation:null,initialAssetsLoaded:false,ensureUnitVariant:async()=>{throw Error('temporary source failure');},warmPresentationBatches:async()=>{throw Error('must not warm failed source');},prepareRescueAssets:async()=>{entered=true;throw Error('required entry retry');}};
 await BattleRenderer.prototype.prewarmOpeningAssets.call(view);assert.equal(view.initialAssetsLoaded,false);
 await assert.rejects(BattleRenderer.prototype.load.call(view,()=>{},'zerg',true),/required entry retry/);assert.equal(entered,true);
});
