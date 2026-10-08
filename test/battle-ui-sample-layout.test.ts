import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {EnhancementJournal} from '../preview/battle-ui-feedback-20261008/enhancement-model';
import {liveSeats} from '../preview/battle-ui-feedback-20261008/roster-model';
import {familyAction} from '../preview/battle-ui-feedback-20261008/console-model';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {encodeGraph} from '../src/persistence/graph-codec';

function shop(){const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10808});w.start();w.wallet={minerals:100000,gas:100000};w.endStage();assert.ok(w.skipReward());return w;}
function card(w:World,kind:'card'|'teamCard'='teamCard'){for(let i=0;i<50;i++){const r=(w.rewards as ExpeditionReward[]).find(r=>r.expeditionEffect.kind===kind&&w.canChooseReward(r));if(r)return r;assert.ok(w.reroll());}throw Error('No native '+kind+' quote');}
test('shop journal records only completed native purchases, once, without changing saved state',()=>{
 const w=shop(),j=new EnhancementJournal(),r=card(w);assert.equal(j.record(r),false);assert.ok(w.choose(r.offerId));const before=JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()}));assert.ok(j.record(r));assert.equal(j.record(r),false);assert.equal(j.snapshot().length,1);assert.deepEqual(j.snapshot()[0].purchaseReceipt,r.purchaseReceipt);assert.deepEqual(j.totals(),w.expedition.cardTotals);assert.equal(JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()})),before);
});
test('shop totals use only recorded cards and never infer sources from research or assigned aggregates',()=>{
 const w=shop(),j=new EnhancementJournal();w.expedition.tech['research.barracks.weapon']=3;w.expedition.cardTotals['weapon.marine']=.08;assert.deepEqual(j.snapshot(),[]);assert.deepEqual(j.totals(),{});const r=card(w);assert.ok(w.choose(r.offerId));assert.ok(j.record(r));const totals=j.totals(),team=j.team();w.expedition.tech['research.barracks.defense']=3;assert.deepEqual(j.totals(),totals);assert.deepEqual(j.team(),team);assert.equal(j.totals()['weapon.marine'],undefined);
});
test('journal retains exact per-family purchased values and snapshots cannot mutate the original receipt',()=>{
 const w=shop(),j=new EnhancementJournal(),r=card(w,'card');assert.equal(r.expeditionEffect.kind,'card');assert.ok(w.choose(r.offerId));assert.ok(j.record(r));if(r.expeditionEffect.kind!=='card')throw Error('not card');assert.equal(j.totals()[r.expeditionEffect.key],r.expeditionEffect.amount);const copy=j.snapshot();copy[0].name='changed';copy[0].purchaseReceipt!.minerals=999;assert.equal(j.snapshot()[0].name,r.name);assert.deepEqual(j.snapshot()[0].purchaseReceipt,r.purchaseReceipt);
});
test('full live roster puts manual-skill families before medical transports and retains every identity',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.expedition.familySlots=['medivac','marine','hellion','tank','marauder'];w.upgrades.set('stim',1);w.expedition.tech['unlock.hellion']=1;for(const f of w.expedition.familySlots)for(let i=0;i<5;i++)w.addFamilyMember(f,{x:i,z:0},i+1);for(const id of ['raynor','tychus','nova']as const)assert.ok(w.acquireHero(id));const before=JSON.stringify(encodeGraph(w.captureRun())),seats=liveSeats(w);assert.equal(seats.length,28);assert.equal(new Set(seats.map(s=>s.key)).size,28);assert.deepEqual(seats.slice(0,4).map(s=>s.family),['marine','hellion','tank','marauder']);assert.ok(seats.slice(0,20).every(s=>s.family&&familyAction(w,s.family)));assert.ok(seats.slice(-5).every(s=>s.family==='medivac'));assert.equal(seats.filter(s=>s.hero).length,3);assert.equal(seats.filter(s=>s.unit).length,28);assert.equal(JSON.stringify(encodeGraph(w.captureRun())),before);
});
test('packed roster contains only owned units, shrinks after removal and never invents empty seats or heroes',()=>{
 const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.expedition.familySlots=['medivac','marine','hellion','tank','marauder'];w.upgrades.set('stim',1);w.expedition.tech['unlock.hellion']=1;for(const f of w.expedition.familySlots)w.addFamilyMember(f,{x:0,z:0},1);const before=JSON.stringify(encodeGraph(w.captureRun())),rows=liveSeats(w);assert.equal(rows.length,5);assert.equal(rows.filter(s=>s.unit).length,5);assert.equal(rows.filter(s=>!s.unit).length,0);assert.equal(rows.filter(s=>s.hero).length,0);assert.deepEqual(rows.slice(0,4).map(s=>s.family),['marine','hellion','tank','marauder']);assert.equal(rows.at(-1)?.family,'medivac');assert.equal(JSON.stringify(encodeGraph(w.captureRun())),before);w.entities.delete(w.familyUnits('marine')[0].id);assert.equal(liveSeats(w).length,4);assert.ok(liveSeats(w).every(s=>s.unit&&s.key.startsWith('entity:')));
});
test('roster identity remains attached to the actual soldier when another soldier disappears',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();const a=w.familyUnits('marine')[0],b=w.addFamilyMember('marine',{x:0,z:0},2),before=liveSeats(w).find(s=>s.unit?.id===b.id)!;w.entities.delete(a.id);const after=liveSeats(w).find(s=>s.unit?.id===b.id)!;assert.equal(after.key,before.key);assert.equal(after.unit?.rank,2);assert.equal(liveSeats(w).filter(s=>s.hero).length,0);
});
