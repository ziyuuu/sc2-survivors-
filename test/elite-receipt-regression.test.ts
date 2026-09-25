import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {World} from '../src/simulation/world';
import {mapReinforcement} from '../src/simulation/expedition-economy';

test('a HUD notification requesting the same unloaded elite shares one pending load',async()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
 Object.defineProperty(globalThis,'window',{value:{},configurable:true});
 try{
  let notifications=0,nested:Promise<boolean>|undefined;
  const view=Object.assign(Object.create(BattleRenderer.prototype),{
   gpu:new Map(),variantLoads:new Map(),variantQueue:Promise.resolve(),assetsPending:0,modelErrors:[],
   world:{paused:false,announce(){},changed(){
    assert.ok(++notifications<10,'loading notifications must not recursively start the same asset');
    if(view.assetsPending)nested=view.ensureUnitVariant('qa-missing-elite','medivac');
   }},
  });
  const first=view.ensureUnitVariant('qa-missing-elite','medivac');
  assert.equal(first,nested);
  assert.equal(view.assetsPending,1);
  assert.equal(await first,false);
  assert.equal(view.assetsPending,0);
  assert.equal(view.modelErrors.length,1);
  assert.equal(view.world.paused,true);
 }finally{
  if(previous)Object.defineProperty(globalThis,'window',previous);
  else Reflect.deleteProperty(globalThis,'window');
 }
});

test('M1 map reinforcement commits its drop before UI and save listeners run',()=>{
 const w=new World({sandbox:true,waves:false,obstacles:[],race:'terran'});w.start();
 const reward=mapReinforcement(w);assert.ok(reward);
 w.rewardDrops.push({id:900001,x:0,z:0,reward});
 let snapshot:ReturnType<World['captureRun']>|undefined,notifications=0;
 w.listeners.add(()=>{
  notifications++;
  assert.equal(w.rewardDrops.length,0,'a claimed pickup cannot remain collectible');
  snapshot=w.captureRun();
 });
 assert.equal(w.collectRewardDrop(900001),true);
 assert.equal(notifications,1);
 assert.equal(w.requiresPlayerDecision,false);
 const restored=new World({sandbox:true,waves:false,obstacles:[],race:'terran'});
 restored.restoreRun(snapshot!);
 assert.equal(restored.collectRewardDrop(900001),false);
 assert.equal(restored.expedition.cardTotals[(reward as any).expeditionEffect.key]>0,true);
});

test('a full-family elite choice survives save/load and can only be committed once',()=>{
 const w=new World({sandbox:true,waves:false,obstacles:[],race:'terran'});w.start();
 for(let i=0;i<4;i++)w.addUnit('marine','terran',i+1,0);
 assert.equal(w.familyUnits('marine').length,5);
 assert.equal(w.acquireElite('marine.1'),true);
 assert.equal(w.requiresPlayerDecision,true);
 const snapshot=w.captureRun();
 const copy=new World({sandbox:true,waves:false,obstacles:[],race:'terran'});copy.restoreRun(snapshot);
 assert.equal(copy.requiresPlayerDecision,true);
 const candidate=copy.eliteCandidates('marine.1')[0];
 assert.ok(candidate);
 const before=copy.wallet.minerals;
 assert.equal(copy.replaceWithElite('marine.1',candidate.id),true);
 assert.equal(copy.replaceWithElite('marine.1',candidate.id),false);
 assert.equal(copy.wallet.minerals,before);
 assert.equal(copy.requiresPlayerDecision,false);
 assert.equal(copy.familyUnits('marine').filter(u=>u.eliteId==='marine.1').length,1);
});
