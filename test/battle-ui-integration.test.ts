import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {encodeGraph} from '../src/persistence/graph-codec';
import {shopProgress} from '../src/ui/presentation/shop-progress';
import {offerView,catalogueCards} from '../src/ui/presentation/intermission';
import {renderProductionWindow} from '../src/ui/hud/expedition-panel';
import {facilities,technology,researchOverview,renderEnhancements} from '../src/ui/presentation/base-panels';
import {packedSeats} from '../src/ui/hud/packed-roster';
import {commandPositions} from '../src/ui/hud/command-layout';
import {RunSession} from '../src/app/run-session';
import {readArchive} from '../src/persistence/archive';
import {FAMILIES_BY_RACE,type Race} from '../src/data/races';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
const serial=(w:World)=>JSON.stringify(encodeGraph({run:w.captureRun(),profile:w.permanentProfile.exportJSON()}));
const fresh=(race:Race='terran')=>{const w=new World({race,seed:10812,terrain:false,waves:false,sandbox:true});w.start();w.wallet={minerals:1e6,gas:1e6};shopProgress(w).observe();return w;};
function buyCards(w:World,n:number){w.endStage();w.skipReward();let bought=0;for(let i=0;i<150&&bought<n;i++){for(const r of [...w.rewards]as ExpeditionReward[]){if(bought>=n)break;if(['card','teamCard'].includes(r.expeditionEffect.kind)&&w.canChooseReward(r)){assert.ok(w.choose(r.offerId));shopProgress(w).observe();bought++;}}if(bought<n)assert.ok(w.reroll());}assert.equal(bought,n);}
for(const race of ['terran','zerg','protoss']as const)test(race+' approved UI projections preserve all World/profile fields and native unlocks',()=>{
 const w=fresh(race);buyCards(w,3);const before=serial(w),cards=w.rewards.map(r=>offerView(w,r));
 for(const view of cards){assert.doesNotMatch(view.stat,/不解锁持续生产|已付批次|保持原进度/);}
 for(const html of [facilities(w),technology(w),researchOverview(w),renderEnhancements(w,'summary'),renderEnhancements(w,'sources'),renderProductionWindow(w,'production')])assert.doesNotMatch(html,/下次发展目标|>订单<|>部署</);
 const lib=catalogueCards(w);assert.ok(lib.filter(c=>c.group==='team').every(c=>c.bodyIdentities?.length===1));assert.ok(lib.filter(c=>c.group==='supply').every(c=>!c.detail.includes('不解锁')));assert.equal(serial(w),before);
 const journal=shopProgress(w).snapshot();assert.equal(journal.entries.length,3);assert.equal(journal.complete,true);
 for(const r of journal.entries){const e=r.expeditionEffect,v=offerView(w,r);assert.ok(v.progress);assert.match(v.progress!.purchases,/已购/);if(e.kind==='card'){assert.equal(shopProgress(w).count(r).count,journal.entries.filter(p=>p.expeditionEffect.kind==='card'&&p.expeditionEffect.key===e.key).length);}else assert.ok(v.bodyIdentities?.every(f=>FAMILIES_BY_RACE[race].includes(f as never)));}
});
test('purchase journal follows save/export/import and same-run rollback without adding World state',()=>{
 const w=fresh();buyCards(w,2);const session=new RunSession(w,null,{run:null,savedAt:0,notice:''});const raw=session.exportJSON(),bundle=readArchive(raw).bundle,before=serial(w);assert.equal(bundle.shopProgress?.entries.length,2);assert.equal(JSON.stringify(encodeGraph(bundle.run)),JSON.stringify(encodeGraph(w.captureRun())));
 const next=fresh(),other=new RunSession(next,null,{run:null,savedAt:0,notice:''});next.phase='menu';other.importJSON(raw);assert.equal(JSON.stringify(encodeGraph(shopProgress(next).snapshot())),JSON.stringify(encodeGraph(bundle.shopProgress)));assert.equal(serial(w),before);
 assert.ok(w.reroll());shopProgress(w).observe();assert.equal(shopProgress(w).snapshot().entries.length,2);
 shopProgress(next).restore(undefined);assert.equal(shopProgress(next).snapshot().complete,false);shopProgress(next).restore(bundle.shopProgress);assert.equal(shopProgress(next).snapshot().entries.length,2);
 const bad=structuredClone(bundle.shopProgress!);bad.runId='different-run';shopProgress(next).restore(bad);assert.equal(shopProgress(next).snapshot().complete,false);
});
test('actual roster has skill users first, no vacant seats, and ordinary medivac last',()=>{
 const w=fresh();w.expedition.familySlots=['medivac','marine','tank'];w.addFamilyMember('medivac',{x:1,z:0},1);w.addFamilyMember('tank',{x:2,z:0},1);w.upgrades.set('stim',1);assert.ok(w.acquireHero('nova'));const before=serial(w),rows=packedSeats(w);assert.deepEqual(rows.map(r=>r.family??r.hero),['marine','tank','nova','medivac']);assert.ok(rows.every(r=>r.unit||r.hero));assert.equal(serial(w),before);
});
test('paired zerg members retain both actual bodies in one seat',()=>{const w=fresh('zerg'),rows=packedSeats(w);assert.equal(rows[0].family,'zergling');assert.equal(rows[0].bodies.length,2);});
test('owned skills fill clockwise without hero gaps; centre and fold space remain distinct',()=>{
 const ids=['hero-slot-0','hero-slot-1','hero-slot-2','dash','detection','airlift','tactical','strategic'],p=commandPositions(ids);assert.deepEqual(p.map(x=>x.point),[[50,0],[100,0],[100,50],[100,100],[50,50],[0,100],[0,50],[0,0]]);assert.equal(new Set(p.map(x=>x.point.join(','))).size,8);assert.deepEqual(commandPositions(['dash','detection','strategic']).map(x=>x.point),[[50,0],[50,50],[100,0]]);
});
