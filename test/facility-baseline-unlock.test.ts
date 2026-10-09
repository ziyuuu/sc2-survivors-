import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {updateExpeditionProduction} from '../src/simulation/expedition-production';
const make=()=>{const w=new World({sandbox:true,terrain:false,obstacles:[],waves:false,seed:9});w.start();w.wallet={minerals:10000,gas:10000};return w;};
function offer(w:World,line:'factory'|'starport'){
 w.expedition.developmentTarget=line;w.endStage();assert.ok(w.setDevelopmentDirection(line));
 const r=w.rewards.find(r=>r.value===line||('expeditionEffect' in r&&(r.expeditionEffect as any).definitionId===line));assert.ok(r,JSON.stringify(w.rewards.map(r=>r.value)));return r;
}
for(const [line,family]of [['factory','hellion'],['starport','medivac']]as const){
 test(line+' first construction unlocks and enables its baseline unit atomically, without granting a body',()=>{
  const w=make();if(line==='starport')w.expedition.tech.factory=1;const r=offer(w,line),money={...w.wallet},units=w.allies().length;assert.ok(w.choose(r.offerId));assert.equal(w.expedition.tech['unlock.'+family],1);assert.deepEqual(w.expedition.production[line]!.outputs,[family]);assert.equal(w.expedition.production[line]!.enabled[family],true);assert.equal(w.allies().length,units);assert.equal(w.wallet.minerals,money.minerals-r.minerals);assert.equal(w.wallet.gas,money.gas-r.gas);assert.equal(w.choose(r.offerId),false);
  const restored=make();restored.restoreRun(w.captureRun());assert.deepEqual(restored.expedition.production[line],w.expedition.production[line]);restored.paused=false;restored.skipReward();updateExpeditionProduction(restored,0);assert.ok(restored.expedition.ledger.some(j=>j.family===family));
 });
 test(line+' failed purchase changes neither unlock nor production',()=>{const w=make();if(line==='starport')w.expedition.tech.factory=1;const r=offer(w,line);w.wallet={minerals:0,gas:0};const before=w.captureRun();assert.equal(w.choose(r.offerId),false);assert.deepEqual(w.captureRun(),before);});
 test(line+' existing choice and unlock survive first construction and expansion',()=>{const w=make();if(line==='starport')w.expedition.tech.factory=1;const other=line==='factory'?'tank':'viking';w.expedition.tech['unlock.'+family]=1;w.expedition.tech['unlock.'+other]=1;w.expedition.production[line]={outputs:[other],enabled:{[other]:false},cursor:0};const plan=structuredClone(w.expedition.production[line]);const r=offer(w,line);assert.ok(w.choose(r.offerId));assert.deepEqual(w.expedition.production[line],plan);assert.equal(w.expedition.tech['unlock.'+family],1);w.skipReward();const second=offer(w,line);assert.ok(w.choose(second.offerId));assert.equal(w.expedition.tech[line],2);assert.equal(w.expedition.tech['unlock.'+family],1);assert.deepEqual(w.expedition.production[line],plan);});
}
