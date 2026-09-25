import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {THREE_RACE_RULES} from '../src/data/races';
import {draftContext,mapReinforcement,collectMapReinforcement} from '../src/simulation/expedition-economy';
import {beginExpeditionWindow,drawExpeditionReinforcements} from '../src/simulation/progression/expedition-drafts';
const world=()=>new World({rulesVersion:THREE_RACE_RULES,race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[]});

test('undeployed Lurker and Carrier have weapon-card eligibility while pure healers do not',()=>{
 const w=world(),ctx=draftContext(w);
 for(const family of ['lurker','carrier'] as const)assert.equal(ctx.familyInfo(family).canAttack,true,family);
 for(const family of ['science_vessel','medivac'] as const)assert.equal(ctx.familyInfo(family).canAttack,false,family);
 w.expedition!.familySlots=['lurker'];w.entities.clear();w.addUnit('lurker','terran',0,0);beginExpeditionWindow(w.expedition!,1);
 let seen=false;for(let i=0;i<100;i++)for(const offer of drawExpeditionReinforcements(ctx,true))if(offer.expeditionEffect.kind==='card'&&offer.expeditionEffect.effect==='weapon'&&offer.expeditionEffect.family==='lurker')seen=true;
 assert.ok(seen,'legal weapon reinforcement must be obtainable without first burrowing');
});
test('a map weapon card can improve Lurker once without changing its deployment mode',()=>{
 const w=world(),s=w.expedition!;s.familySlots=['lurker'];w.entities.clear();const u=w.addUnit('lurker','terran',0,0);s.cardTotals['vitality.lurker']=.5;
 const offer=mapReinforcement(w);assert.ok(offer);assert.equal(offer.expeditionEffect.kind,'card');assert.equal(offer.id,'map.weapon.lurker');
 const mode=u.nativeMode;assert.equal(collectMapReinforcement(w,offer),true);assert.equal(collectMapReinforcement(w,offer),false);assert.equal(s.cardTotals['weapon.lurker'],.08);assert.equal(u.nativeMode,mode);
});
