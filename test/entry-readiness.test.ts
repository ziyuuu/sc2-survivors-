import test from 'node:test';import assert from 'node:assert/strict';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';import {modelPreloadAssets,racePreloadModels} from '../src/app/race-preload';
import {overlayLayout} from '../src/ui/presentation/overlay-layout';
test('one uniform menu scale preserves landscape desktop proportions and reflows portrait',()=>{
 for(const [width,height] of [[844,390],[740,360],[932,430],[390,844],[320,640],[1440,900]]){const layout=overlayLayout(width,height);assert.ok(Math.abs(layout.width*layout.scale-width)<1e-8);assert.ok(Math.abs(layout.height*layout.scale-height)<1e-8);assert.ok(layout.scale>0&&layout.scale<=1);if(width>height&&height<600){assert.equal(layout.mode,'landscape');assert.ok(layout.width>=1280&&layout.height>=720);}else if(width<=700){assert.equal(layout.mode,'portrait');assert.equal(layout.width,480);}}
 assert.deepEqual(overlayLayout(1440,900),{mode:'desktop',scale:1,width:1440,height:900});
});
test('parallel audio and model batches produce ordered steps and one monotonic entrance progress',async()=>{
 let sound:((done:number,total:number,label:string)=>void)|undefined,rendered=0;const seen:{phase:string;progress:number}[]=[],calls:string[]=[];
 const audio={preload:async(cb:any)=>{sound=cb;cb(0,1,'音效');}};
 const view:any={initialAssetsLoaded:true,modelErrors:[],preparationKey:'same-roster',
  prepareNewRunAssets:async(_:any,_hero:any,cb:any)=>{calls.push('troops');for(let i=0;i<=999;i++){sound!(1,1,'音效');cb(i,999,'body');}cb(0,4,'forts');cb(4,4,'forts');},
  prepareCampaignAssets:async()=>{calls.push('field');},waitForPendingAssets:async()=>{},renderer:{compileAsync:async()=>{calls.push('compile');}},warmPresentationBatches:async(cb:any)=>{cb(1,1,'mesh');return 0;}};
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'}}as any,view,audio as any);
 gate.onChange=()=>{rendered++;seen.push({phase:gate.state.phase,progress:gate.state.progress??0});};
 assert.ok(await gate.prepare('new',{race:'terran',campaignMap:{version:3,seed:1,theme:'industrial'}}));
 assert.deepEqual(calls,['troops','field','compile']);assert.equal(gate.state.progress,1);assert.ok(rendered<60,'unchanged displayed percent should not rebuild the HUD');
 const phases=['read','models','audio','gpu','validate','ready'];for(let i=1;i<seen.length;i++){assert.ok(seen[i].progress>=seen[i-1].progress);assert.ok(phases.indexOf(seen[i].phase)>=phases.indexOf(seen[i-1].phase));}
 gate.cancel();calls.length=0;assert.ok(await gate.prepare('new',{race:'terran'}));assert.deepEqual(calls,['troops'],'same GPU preparation key reuses scene compilation');
});
test('cancelling a pending preparation invalidates late progress and completion without mutating the world',async()=>{
 let done:()=>void=()=>{},notify:any;const view:any={initialAssetsLoaded:true,prepareCurrentAssets:async(cb:any)=>{notify=cb;await new Promise<void>(r=>done=r);},waitForPendingAssets:async()=>{},modelErrors:[]};
 const world:any={expedition:{race:'terran'}},gate=new AssetReadinessCoordinator(world,view);let completed=0;gate.onReady=()=>completed++;
 const preparation=gate.prepare('reinforcement');gate.cancel();notify(1,1,'late');done();assert.equal(await preparation,false);assert.equal(gate.state.kind,null);assert.equal(gate.state.phase,'idle');assert.equal(completed,0);assert.deepEqual(world,{expedition:{race:'terran'}});
});
test('batched model bytes retain the complete native roster and all tank forms',()=>{
 const models=racePreloadModels('terran'),ids=modelPreloadAssets(models);for(const key of models.keys())assert.ok(ids.includes('model.'+key));
 for(const id of ['model.tank','model.tank.siege','model.tank.morph','model.tank.death','model.elite.tank.1.siege','model.elite.tank.1.morph','model.hero.raynor'])assert.ok(ids.includes(id),id);
 assert.equal(new Set(ids).size,ids.length);assert.ok(!ids.includes('model.hero.raynor.siege'));assert.ok(!ids.includes('model.hero.zeratul'));
});
test('one stalled resource reveals the loading screen after its grace period and cancel disarms the reveal',async()=>{
 let release:()=>void=()=>{};const view:any={initialAssetsLoaded:true,modelErrors:[],prepareCurrentAssets:async()=>{await new Promise<void>(r=>release=r);},waitForPendingAssets:async()=>{}};
 const gate=new AssetReadinessCoordinator({expedition:{race:'terran'}}as any,view);const visible:boolean[]=[];gate.onChange=()=>visible.push(gate.showLoading);
 const pending=gate.prepare('reinforcement');assert.equal(gate.showLoading,false);await new Promise(r=>setTimeout(r,180));assert.ok(visible.includes(true),'loading must appear without another resource callback');gate.cancel();release();assert.equal(await pending,false);
 const next=gate.prepare('reinforcement');gate.cancel();const count=visible.length;await new Promise(r=>setTimeout(r,180));assert.equal(visible.length,count,'canceled delayed reveal must not notify');release();assert.equal(await next,false);
});
