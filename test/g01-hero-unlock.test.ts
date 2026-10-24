import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS} from '../src/simulation/starship/types';
import {BOSSES} from '../src/data/enemies';
import type {Difficulty} from '../src/data/stages';
import type {Race} from '../src/data/races';
import {ALL_HERO_IDS,HEROES} from '../src/data/heroes';
import {ordinaryHeroUnlockStage,ordinaryHeroAllowed} from '../src/simulation/progression/hero-availability';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawBossLoot,inspectReinforcementPool,drawEquipmentUnitLoot,drawFixedRarityTalentLoot,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {identityCandidates,planIntelReward} from '../src/simulation/missions/rewards';
import {dropBossLoot,planFirstBossLoot,collectBossLoot} from '../src/simulation/boss-loot';
import {validateExpedition} from '../src/simulation/expedition-state';
import {difficultyRules} from '../src/ui/hud/m3-menu';
function world(difficulty:Difficulty='easy',race:Race='terran'){const w=new World({race,difficulty,seed:102202,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(102202)});assert.ok(w.start());w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function killBoss(w:World,stage:number){w.stage=stage;const e=w.spawnSpecial((BOSSES[stage]?.type??'zergling'),'boss',{x:15,z:0},{stage,progress:stage/18,density:1})!;assert.ok(e);w.hit(e,1e9,[],1,'terran');const drop=w.rewardDrops.find(d=>d.bossLootReceipt?.includes(':boss:'+e.id+':'));assert.ok(drop);return {e,drop};}
for(const [difficulty,stage] of [['easy',12],['normal',9],['hard',3],['hell',3]] as const)for(const race of ['terran','zerg','protoss'] as const)test(`hero gate ${difficulty}/${race}: unlock on stage ${stage} Boss death, not stage entry`,()=>{
 const w=world(difficulty,race);assert.equal(ordinaryHeroUnlockStage(difficulty),stage);w.random=()=>0;
 const early=killBoss(w,Math.max(1,stage-3));assert.notEqual((early.drop.reward as ExpeditionReward).expeditionEffect.kind,'hero');assert.equal(w.expedition.heroRewardsUnlocked,undefined);
 w.stage=stage;const before=draftContext(w);assert.equal(before.heroes.filter(h=>h.eligible).length,0);assert.equal(identityCandidates(w,2).length,0);assert.ok(!inspectReinforcementPool(before).some(c=>c.effect.kind==='hero'));assert.notEqual(drawEquipmentUnitLoot(before,'before')?.expeditionEffect.kind,'hero');assert.ok(drawFixedRarityTalentLoot(before,'orange','before').every(c=>c.expeditionEffect.kind!=='hero'));
 const {e,drop}=killBoss(w,stage);assert.equal(w.expedition.heroRewardsUnlocked,true);assert.equal((drop.reward as ExpeditionReward).expeditionEffect.kind,'hero');assert.equal(draftContext(w).heroes.filter(h=>h.eligible).length,6);const promised=(drop.reward as ExpeditionReward).expeditionEffect;assert.equal(identityCandidates(w,2).length,5);assert.ok(promised.kind==='hero'&&!identityCandidates(w,2).includes(promised.heroId));
 assert.equal(dropBossLoot(w,e),false);assert.ok(collectBossLoot(w,drop));assert.equal(w.heroes.size,1);assert.ok(collectBossLoot(w,drop)===false);assert.match(difficultyRules(difficulty),new RegExp('第'+stage+'关'));
});
test('hero gate keeps nominal Boss chance and every unlocked draw identical to the unrestricted old pool',()=>{
 const w=world();killBoss(w,12);const c=draftContext(w);let heroes=0;
 for(let i=0;i<100;i++){const rng=()=>{let call=0;return ()=>call++===0?(i+.5)/100:.5;};const a=drawBossLoot({...c,random:rng(),nextOfferId:()=> 'same'},'same');const b=drawBossLoot({...c,heroes:c.heroes.map(h=>({...h,eligible:w.canAcquireHero(h.id as any)})),random:rng(),nextOfferId:()=> 'same'},'same');assert.deepEqual(a,b);if(a.expeditionEffect.kind==='hero')heroes++;}assert.equal(heroes,20);
});
test('hero gate does not unlock on wrong Boss identity, carried early Boss, special arena, or no-loot targets',()=>{
 for(const mode of ['early','wrong','special','no-loot'] as const){const w=world('normal');w.stage=9;const stage=mode==='early'?6:9,e=w.spawnSpecial(mode==='wrong'?'ravager':(BOSSES[stage]?.type??'zergling'),'boss',{x:15,z:0},{stage,progress:stage/18,density:1})!;if(mode==='special')w.specialStages.active={kind:'arena'} as any;if(mode==='no-loot')e.mission={noLoot:true} as any;w.hit(e,1e9,[],1,'terran');assert.equal(w.expedition.heroRewardsUnlocked,undefined,mode);}
});
test('hero gate preserves actual orange set opening hero and same-name cultivation while other new heroes stay locked',()=>{
 const w=new World({race:'terran',difficulty:'easy',seed:102202,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(102202)});
 for(const slot of ATTRIBUTE_SLOTS.slice(0,6)){const r=grantEquipment(w.starship.account,{template:'set.orange.hero.5',race:'terran',slot,binding:{hero:'raynor'}},'hero:'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}assert.ok(w.start());assert.ok(w.heroes.has('raynor'));assert.equal(w.stage,1);assert.equal(w.expedition.heroRewardsUnlocked,undefined);assert.ok(ordinaryHeroAllowed(w,'raynor'));assert.equal(ordinaryHeroAllowed(w,'nova'),false);assert.deepEqual(draftContext(w).heroes.filter(h=>h.eligible).map(h=>h.id),['raynor']);
});
test('hero gate highest intel before unlock plans legal equipment, then offers original hero candidates after unlock',()=>{
 const w=world('normal'),m={id:'g01-intel'} as any;w.random=()=>0;assert.ok(planIntelReward(w,m,2));assert.equal(m.reward.kind,'equipment');killBoss(w,9);const n={id:'g01-intel-after'} as any;assert.ok(planIntelReward(w,n,2));assert.equal(n.reward.kind,'hero');
});
test('hero gate survives detached memory validation and rejects corrupt flag; old undefined state remains locked',()=>{
 const w=world();killBoss(w,12);const state=structuredClone(w.expedition);validateExpedition(state);w.expedition=state;assert.ok(ordinaryHeroAllowed(w,'raynor'));const bad=structuredClone(state);(bad as any).heroRewardsUnlocked='yes';assert.throws(()=>validateExpedition(bad),/英雄奖励开放/);delete w.expedition.heroRewardsUnlocked;assert.equal(ordinaryHeroAllowed(w,'raynor'),false);validateExpedition(w.expedition);
});
test('hero gate first Boss prewarm freezes an allowed reward without spending combat RNG',()=>{
 const w=world('hell');w.stage=3;const rng=w.rngState,id=w.nextId;planFirstBossLoot(w);assert.ok(w.expedition.firstBossLoot);assert.equal(w.expedition.heroRewardsUnlocked,undefined);assert.equal(draftContext(w).heroes.filter(h=>h.eligible).length,0);assert.equal(w.rngState,rng);assert.equal(w.nextId,id);
});
test('hero gate accepts later campaign Boss and endless; owned dead heroes keep training eligibility',()=>{
 const w=world('normal');killBoss(w,12);assert.ok(ordinaryHeroAllowed(w,'raynor'));const v=world();v.endless={round:1} as any;assert.ok(ordinaryHeroAllowed(v,'raynor'));const u=world();assert.ok(u.acquireHero('raynor'));const body=u.heroEntity('raynor')!;u.hit(body,1e9,[],1,'zerg');assert.ok(ordinaryHeroAllowed(u,'raynor'));assert.ok(draftContext(u).heroes.find(h=>h.id==='raynor')!.eligible);
});
