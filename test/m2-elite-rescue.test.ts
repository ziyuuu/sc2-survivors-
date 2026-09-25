import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {MVP_TALENTS} from '../src/data/mvp-talents';

function setup(){const profile=new PermanentProfile(59),levels=Object.fromEntries(MVP_TALENTS.filter(node=>node.race==='terran'&&node.line==='army').map(node=>[node.id,node.maxRank]));const quote=profile.previewTalentAllocation('terran',0,levels);assert.ok(quote);assert.ok(profile.commitTalentAllocation(quote,quote.expectedRevision));const w=new World({race:'terran',permanentProfile:profile,seed:75,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.equal(w.start(),true);w.random=()=>0;return w;}
test('A14 creates a saved free rescue right with an explicit decline path',()=>{
 const w=setup(),egg=w.spawnEconomic('egg',{x:3,z:0});w.hit(egg,egg.maxHp+20,[],1,'terran');assert.equal(egg.status,'rescued');const right=w.eliteRescueChoice;assert.ok(right);assert.equal(w.requiresPlayerDecision,true);assert.equal(w.wallet.minerals,50);
 const copy=new World({race:'terran',permanentProfile:w.permanentProfile,seed:75,waves:false,sandbox:true,terrain:false,obstacles:[]});copy.restoreRun(w.captureRun());assert.deepEqual(copy.eliteRescueChoice,right);assert.equal(copy.declineEliteRescueRight(right.receipt),true);assert.equal(copy.declineEliteRescueRight(right.receipt),false);assert.equal(copy.requiresPlayerDecision,false);assert.equal(copy.wallet.minerals,50);
});
test('A14 claim is free and cannot mint a second elite from the same worker',()=>{
 const w=setup(),egg=w.spawnEconomic('egg',{x:3,z:0});w.hit(egg,egg.maxHp+20,[],1,'terran');const right=w.eliteRescueChoice;assert.ok(right);const variant=w.eliteVariants(w.expedition.familySlots.find(f=>w.eliteVariants(f).some(e=>e.id===right.eliteId))!)[0];assert.ok(variant);assert.equal(w.claimEliteRescueRight(right.receipt,variant.id),true);assert.equal(w.claimEliteRescueRight(right.receipt,variant.id),false);assert.equal(w.expedition.eliteRescueCompleted.filter(id=>id===right.receipt).length,1);assert.equal(w.wallet.minerals,50);
});
