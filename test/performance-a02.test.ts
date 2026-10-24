import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawBossLoot,drawEquipmentUnitLoot} from '../src/simulation/progression/expedition-drafts';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';

test('unit rewards do not evaluate unrelated training or support while keeping current unit eligibility',()=>{
 const w=new World({race:'terran',seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});assert.ok(w.start());
 const ctx=draftContext(w),fail=()=>{throw Error('unrelated pool evaluated');};
 ctx.training=fail;ctx.supportLegal=fail;ctx.supplyLegal=fail;
 assert.ok(['hero','elite','economy'].includes(drawBossLoot(ctx,'a02').kind));
 const gear=drawEquipmentUnitLoot(ctx,'a02-equipment');
 assert.ok(!gear||['hero','elite'].includes(gear.kind));
 for(const id of ['raynor','tychus','nova'] as const)for(let i=0;i<5;i++)assert.ok(w.acquireHero(id));
 const current=draftContext(w);assert.ok(current.heroes.filter(h=>h.owned).every(h=>h.rank===5));
 assert.ok(current.heroes.filter(h=>h.race==='terran'&&!h.owned).every(h=>!h.eligible));
});

test('empty unit pool keeps Boss fallback and equipment null without touching unrelated generators',()=>{
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});assert.ok(w.start());
 const ctx=draftContext(w);ctx.heroes=[];ctx.elites=[];ctx.training=()=>{throw Error('unrelated training');};ctx.supportLegal=()=>{throw Error('unrelated support');};
 const boss=drawBossLoot(ctx,'empty','orange');assert.equal(boss.id,'boss.exhausted');
 assert.equal(boss.offerId,'empty');assert.equal(drawEquipmentUnitLoot(ctx,'empty-equipment'),null);
});
