import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,type HeroId} from '../src/data/heroes';
import type {Race} from '../src/data/races';import type {Difficulty} from '../src/data/stages';
import {draftContext} from '../src/simulation/expedition-economy';
import {planFirstBossLoot,dropBossLoot} from '../src/simulation/boss-loot';
import {plannedBossPreloadModels} from '../src/app/battle-preload-plan';
function make(race:Race,difficulty:Difficulty,seed:number){
 const w=new World({race,difficulty,seed,waves:false,sandbox:true,terrain:false,obstacles:[]}),native=globalThis.crypto.randomUUID;
 try{globalThis.crypto.randomUUID=()=>`00000000-0000-4000-8000-${String(seed).padStart(12,'0')}`;assert.ok(w.start());}finally{globalThis.crypto.randomUUID=native;}
 w.stage=3;w.prepareStage();return w;
}
for(const difficulty of ['hard','hell'] as const)for(const race of ['terran','zerg','protoss'] as const)test(`G03 first Boss ${difficulty}/${race}: frozen hero is preloaded, locked until real death, restored and collected once`,()=>{
 let chosen:World|undefined,nonHero=false;
 for(let seed=1;seed<=100;seed++){const w=make(race,difficulty,seed),plan=w.expedition.firstBossLoot!;assert.ok(plan);assert.equal(w.expedition.heroRewardsUnlocked,undefined);assert.equal(draftContext(w).heroes.filter(h=>h.eligible).length,0);if(plan.reward.expeditionEffect.kind==='hero')chosen??=w;else nonHero=true;if(chosen&&nonHero)break;}
 assert.ok(chosen,'native receipt RNG must produce a hero branch');assert.ok(nonHero,'opening is not a guaranteed hero');const w=chosen,planned=structuredClone(w.expedition.firstBossLoot!),effect=planned.reward.expeditionEffect;assert.equal(effect.kind,'hero');if(effect.kind!=='hero')throw Error('expected hero');
 assert.ok(plannedBossPreloadModels(planned).has(HEROES[effect.heroId as HeroId].model));const rng=w.rngState,next=w.nextId;planFirstBossLoot(w);assert.deepEqual(w.expedition.firstBossLoot,planned);assert.equal(w.rngState,rng);assert.equal(w.nextId,next);
 const copy=make(race,difficulty,999);copy.restoreRun(w.captureRun());copy.paused=false;assert.deepEqual(copy.expedition.firstBossLoot,planned);assert.equal(draftContext(copy).heroes.filter(h=>h.eligible).length,0);
 const event=(copy as any).specialPlan.find((e:any)=>e.tier==='boss'),boss=(copy as any).spawnCampaignSpecial(event);assert.ok(boss);copy.hit(boss,1e9,[],1,'terran');assert.equal(copy.expedition.heroRewardsUnlocked,true);
 const drop=copy.rewardDrops.find(d=>d.bossLootReceipt)!;assert.deepEqual((drop.reward as any).expeditionEffect,effect);assert.equal(dropBossLoot(copy,boss),false);assert.ok(copy.collectRewardDrop(drop.id));assert.equal(copy.heroes.get(effect.heroId as HeroId)?.rank,1);assert.equal(copy.collectRewardDrop(drop.id),false);
 const restored=make(race,difficulty,998);restored.restoreRun(copy.captureRun());assert.equal(restored.heroes.get(effect.heroId as HeroId)?.rank,1);assert.equal(restored.collectRewardDrop(drop.id),false);
});
for(const difficulty of ['easy','normal'] as const)test(`G03 first Boss ${difficulty}: new heroes remain absent across receipt seeds`,()=>{
 for(let seed=1;seed<=32;seed++){const w=make('terran',difficulty,seed);assert.notEqual(w.expedition.firstBossLoot!.reward.expeditionEffect.kind,'hero');const boss=(w as any).spawnCampaignSpecial((w as any).specialPlan.find((e:any)=>e.tier==='boss'));w.hit(boss,1e9,[],1,'terran');assert.equal(w.expedition.heroRewardsUnlocked,undefined);assert.notEqual((w.rewardDrops.find(d=>d.bossLootReceipt)!.reward as any).expeditionEffect.kind,'hero');}
});
