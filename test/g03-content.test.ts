import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {World} from '../src/simulation/world';
import type {Difficulty} from '../src/data/stages';
import type {Race} from '../src/data/races';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {MISSION_KINDS} from '../src/simulation/missions/state';
import {missionCandidates,spawnMission} from '../src/simulation/missions/runtime';
import {ENCOUNTER_KINDS} from '../src/simulation/encounters/state';
import {FUN_KINDS,FUN_MIN_STAGE} from '../src/simulation/encounters/expanded-state';
import {encounterCandidates,spawnPacedEncounter,tickEventPacing,eventCategoryWeights,naturalEventChance} from '../src/simulation/field-events/pacing';
import {HORDE_KINDS,HORDE_RULES,FIELD_PICKUPS} from '../src/simulation/field-events/state';
import {hordeCandidates,startReplacementHorde} from '../src/simulation/field-events/hordes';
import {SPECIAL_STAGE_KINDS} from '../src/simulation/special-stages/state';
import {legalSpecialKinds,beginSpecialStage,claimSpecialTicket,enterSpecialTicket,offerSpecialTicket,tickSpecialEntrance,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {withSpecialTicket} from '../src/simulation/special-stages/tickets';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {FUN_SHOP_IDS,funShopCandidates,funShopDescription,newFunShop} from '../src/simulation/fun-shop/state';
import {spawnFieldPickup,collectFieldPickup} from '../src/simulation/field-events/pickups';
import {draftContext,offerEligible,purchaseOffer} from '../src/simulation/expedition-economy';
import {inspectReinforcementPool,beginExpeditionWindow,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {offerView} from '../src/ui/presentation/intermission';
import {difficultyRules} from '../src/ui/hud/m3-menu';

const difficulties:Difficulty[]=['easy','normal','hard','hell'],races:Race[]=['terran','zerg','protoss'];
// Acceptance lists are deliberately independent of the production lookup tables.
const expected={easy:{missions:['repair','hives'],encounters:['golden','giant'],special:['resources','dodge']},normal:{missions:['escort','repair','intel','rescue','hives'],encounters:['golden','giant','gentle','whitePack','flyingRoaches'],special:['resources','crossing','dodge']},hard:{missions:[...MISSION_KINDS],encounters:[...ENCOUNTER_KINDS,...FUN_KINDS],special:[...SPECIAL_STAGE_KINDS]}};
const allowed=(d:Difficulty)=>expected[d==='hell'?'hard':d],full=(d:Difficulty)=>d==='hard'||d==='hell';
const rows:unknown[]=[];
after(async()=>{if(process.env.G03_MATRIX_OUTPUT)await writeFile(process.env.G03_MATRIX_OUTPUT,JSON.stringify({scope:'Controlled production admissions, not natural full campaigns',rows},null,2));});
function world(difficulty:Difficulty,race:Race='terran',stage=12){
 const initial=race==='terran'?['marine','marine','marauder','reaper','hellion','medivac'] as const:race==='zerg'?['hydralisk','hydralisk','hydralisk','hydralisk','queen','queen'] as const:['stalker','stalker','stalker','stalker','zealot','zealot'] as const;
 const w=new World({difficulty,race,seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:[...initial],equipmentAccount:newEquipmentAccount(529)});assert.ok(w.start());w.stage=stage;w.prepareStage();w.pods=[];w.workers=4;w.nextExpansionAt=Infinity;(w as any).specialPlan=[];return w;
}
function normalScheduler(w:World){Object.defineProperty(w,'diagnosticRun',{value:false});Object.defineProperty(w,'missionAutoEnabled',{get:()=>!w.fieldEvents.horde});w.missions.enabled=true;w.encounters.enabled=true;w.time=25;w.stageElapsed=25;}
function unchangedReject(w:World,call:()=>boolean){const before=w.snapshotData();assert.equal(call(),false);assert.deepEqual(w.snapshotData(),before);}

for(const difficulty of difficulties)for(const race of races)test(`${difficulty}/${race}: every mission, encounter, horde and special entry follows its content tier`,()=>{
 for(const kind of MISSION_KINDS){const w=world(difficulty,race),legal=allowed(difficulty).missions.includes(kind);assert.equal(missionCandidates(w).includes(kind),legal,kind+' candidate');if(legal)assert.ok(spawnMission(w,kind),kind);else unchangedReject(w,()=>spawnMission(w,kind));rows.push({difficulty,race,category:'mission',kind,legal});}
 for(const kind of [...ENCOUNTER_KINDS,...FUN_KINDS])for(const bait of [false,true]){const w=world(difficulty,race),legal=allowed(difficulty).encounters.includes(kind);assert.equal(encounterCandidates(w,bait).includes(kind),legal,kind+' candidate');if(legal)assert.ok(spawnPacedEncounter(w,kind,bait),kind);else unchangedReject(w,()=>spawnPacedEncounter(w,kind,bait));rows.push({difficulty,race,category:'encounter',kind,bait,legal});}
 for(const kind of HORDE_KINDS)for(const bait of [false,true]){const w=world(difficulty,race),legal=full(difficulty);assert.equal(hordeCandidates(w).includes(kind),legal);if(legal)assert.ok(startReplacementHorde(w,kind,bait),kind);else unchangedReject(w,()=>startReplacementHorde(w,kind,bait));rows.push({difficulty,race,category:'horde',kind,bait,legal});}
 for(const kind of SPECIAL_STAGE_KINDS)for(const source of ['fixture','ticket','portal'] as const){const w=world(difficulty,race),legal=allowed(difficulty).special.includes(kind);assert.equal(legalSpecialKinds(w).includes(kind),legal);if(source==='ticket')w.specialStages.ticket={stage:w.stage,kind,claimed:true};if(source==='portal')w.specialStages.portal={kind,point:{...w.anchor},until:w.time+30};if(legal){const normalTime=w.time;assert.ok(beginSpecialStage(w,kind,source),kind+':'+source);assert.equal(w.specialStages.used.size,1);assert.equal(beginSpecialStage(w,kind,source),false);assert.ok(finishSpecialStage(w,'timeout'));assert.equal(w.time,normalTime);}else unchangedReject(w,()=>beginSpecialStage(w,kind,source));rows.push({difficulty,race,category:'special',kind,source,legal});}
});

for(const difficulty of difficulties)test(`${difficulty}: ticket generation, claim, purchase and entry reject forbidden or stale challenges without spending`,()=>{
 for(const kind of SPECIAL_STAGE_KINDS){const w=world(difficulty),legal=allowed(difficulty).special.includes(kind);w.stage=11;w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId);w.specialStages.ticket={stage:12,kind,claimed:false};const wallet={...w.wallet},free=w.expedition.freePurchasesRemaining;
  const offers=withSpecialTicket(w,[]);assert.equal(offers.length,legal?1:0);if(legal){const offer=offers[0];w.rewards=offers;assert.ok(offerEligible(w,offer));assert.ok(purchaseOffer(w,offer.offerId!));assert.equal(purchaseOffer(w,offer.offerId!),false);}else unchangedReject(w,()=>claimSpecialTicket(w));
  assert.deepEqual(w.wallet,wallet);assert.equal(w.expedition.freePurchasesRemaining,free);assert.equal(w.specialStages.used.size,0);
  w.phase='battle';w.stage=12;w.specialStages.ticket!.claimed=true;assert.equal(enterSpecialTicket(w),legal);if(!legal){assert.equal(w.specialStages.ticket,null);assert.equal(w.specialStages.used.size,0);assert.equal(w.specialStages.active,null);}rows.push({difficulty,category:'ticket-roundtrip',kind,legal});
 }
 const stale=world(difficulty);stale.specialStages.ticket={stage:11,kind:'resources',claimed:true};assert.equal(enterSpecialTicket(stale),false);assert.equal(stale.specialStages.ticket,null);
 // Sweep every selection bucket using the native generators with deterministic RNG.
 for(const roll of [.01,.26,.51,.76,.99]){const t=world(difficulty);t.phase='reward';t.stage=11;let n=0;t.random=()=>n++===0?0:roll;offerSpecialTicket(t);assert.ok(t.specialStages.ticket);assert.ok(allowed(difficulty).special.includes(t.specialStages.ticket!.kind));
  const p=world(difficulty);normalScheduler(p);p.random=()=>0;tickSpecialEntrance(p);assert.ok(p.specialStages.portal);assert.ok(allowed(difficulty).special.includes(p.specialStages.portal!.kind));
 }
 if(!full(difficulty)){const p=world(difficulty);normalScheduler(p);p.specialStages.portalChecked=p.stage;p.specialStages.portal={kind:'arena',point:{...p.anchor},until:p.time+30};tickSpecialEntrance(p);assert.equal(p.specialStages.portal,null);assert.equal(p.specialStages.used.size,0);}
 const absent=world(difficulty);absent.entities.clear();assert.deepEqual(legalSpecialKinds(absent),[]);absent.phase='reward';absent.random=()=>0;offerSpecialTicket(absent);assert.equal(absent.specialStages.ticket,null);
});

for(const difficulty of difficulties)test(`${difficulty}: disabled horde lottery expires once; bait cannot bank or substitute a locked horde`,()=>{
 for(const stage of [4,7,13]){const w=world(difficulty,'terran',stage);normalScheduler(w);const rolls=[0,.999,0];w.random=()=>rolls.shift()??0;tickEventPacing(w);assert.equal(!!w.fieldEvents.horde,full(difficulty));assert.equal(w.fieldEvents.pacing.pending,false);assert.equal(w.fieldEvents.pacing.started,full(difficulty));assert.equal(w.missions.active,null);assert.equal(w.encounters.active,null);if(!full(difficulty)){const state=w.snapshotData();w.random=()=>{throw Error('consumed roll retried');};w.time++;w.stageElapsed++;tickEventPacing(w);assert.equal(w.fieldEvents.pacing.rolled,true);assert.equal(w.fieldEvents.pacing.started,false);assert.equal(state.fieldEvents.pacing.lastKey,w.fieldEvents.pacing.lastKey);}rows.push({difficulty,category:'natural-horde-lottery',stage,spawned:full(difficulty)});}
 const w=world(difficulty);normalScheduler(w);w.funShop.levels.bait=3;w.funShop.bait={...newFunShop().bait,stage:w.stage,next:100,pending:{encounter:false,elite:false,horde:true}};tickBait(w);assert.equal(!!w.fieldEvents.horde,full(difficulty));assert.equal(w.funShop.bait.pending.horde,false);assert.deepEqual(w.funShop.bait.counts,{encounter:0,elite:0,horde:full(difficulty)?1:0});
 const blocked=world(difficulty);normalScheduler(blocked);blocked.funShop.levels.bait=3;blocked.spawnSpecial('roach','boss',{x:30,z:0});let rolls=0;blocked.random=()=>{rolls++;return 0;};tickBait(blocked);assert.equal(rolls,full(difficulty)?3:2);assert.deepEqual(blocked.funShop.bait.pending,{encounter:true,elite:true,horde:full(difficulty)});assert.deepEqual(blocked.funShop.bait.counts,{encounter:0,elite:0,horde:0});
 blocked.stageElapsed=blocked.duration-19;tickBait(blocked);assert.deepEqual(blocked.funShop.bait.pending,{encounter:false,elite:false,horde:false});
});

for(const difficulty of difficulties)test(`${difficulty}: all five pickups and seven shop groups remain usable with current-difficulty descriptions`,()=>{
 for(const kind of FIELD_PICKUPS){const w=world(difficulty);assert.ok(spawnFieldPickup(w,kind,w.anchor));assert.ok(collectFieldPickup(w,w.fieldEvents.pickups[0].id));rows.push({difficulty,category:'pickup',kind,legal:true});}
 for(const id of FUN_SHOP_IDS){const w=world(difficulty);w.phase='reward';w.rewardRound='random';w.wallet={minerals:10000,gas:10000};beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId);const pool=inspectReinforcementPool(draftContext(w));assert.ok(pool.some(c=>c.effect.kind==='funShop'&&c.effect.item===id));const c=funShopCandidates(w.funShop.levels,w.difficulty).find(c=>c.item===id)!;
  const r:ExpeditionReward={id:c.id,offerId:'g03:'+id,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:'buff',value:id,...c.price,baseMinerals:c.price.minerals,baseGas:c.price.gas,discount:0,sold:false,expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:{kind:'funShop',item:id,level:c.level,expected:0}};w.rewards=[r];const copy=offerView(w,r);if(id==='bait'){assert.match(copy.detail,full(difficulty)?/虫群仅困难／地狱/:/当前难度不触发虫群/);assert.equal(copy.detail.includes('当前难度不触发虫群'),!full(difficulty));r.description='old stale description';assert.equal(offerView(w,r).detail,copy.detail);}assert.ok(purchaseOffer(w,r.offerId!));assert.equal(w.funShop.levels[id],1);assert.equal(purchaseOffer(w,r.offerId!),false);rows.push({difficulty,category:'shop',id,legal:true,price:c.price});
 }
 assert.match(difficultyRules(difficulty),/趣味内容/);assert.match(funShopDescription('tavern',3,difficulty),/机会落空/);
});

test('difficulty availability never removes stage, roster, endless or quota restrictions',()=>{
 for(const difficulty of difficulties){for(const kind of MISSION_KINDS){const w=world(difficulty,'terran',3);assert.equal(spawnMission(w,kind),false);}for(const kind of [...ENCOUNTER_KINDS,...FUN_KINDS]){const min=kind==='gentle'?7:(ENCOUNTER_KINDS as readonly string[]).includes(kind)?4:FUN_MIN_STAGE[kind as keyof typeof FUN_MIN_STAGE],w=world(difficulty,'terran',min-1);assert.equal(spawnPacedEncounter(w,kind,true),false);}for(const kind of HORDE_KINDS){const w=world(difficulty,'terran',HORDE_RULES[kind].stage-1);assert.equal(startReplacementHorde(w,kind,true),false);}
  const w=world(difficulty);w.endless={round:1} as any;for(const kind of MISSION_KINDS)assert.equal(spawnMission(w,kind),false);for(const kind of [...ENCOUNTER_KINDS,...FUN_KINDS])assert.equal(spawnPacedEncounter(w,kind,true),false);for(const kind of HORDE_KINDS)assert.equal(startReplacementHorde(w,kind,true),false);for(const kind of SPECIAL_STAGE_KINDS)assert.equal(beginSpecialStage(w,kind,'fixture'),false);
  const capped=world(difficulty);capped.specialStages.used=new Set([4,7,10]);assert.equal(beginSpecialStage(capped,'resources','fixture'),false);
 }
});

test('category weights and natural probability remain unchanged; quantify the unfilled low-tier horde share',()=>{
 for(let tavern=0;tavern<=3;tavern++){const weights=eventCategoryWeights(tavern),total=weights.mission+weights.encounter+weights.horde;for(const stage of [4,7,13]){const chance=naturalEventChance(stage);rows.push({category:'analytical-admission-ceiling',stage,tavern,assumption:'All original physical categories eligible, no placement failure',high:chance,low:chance*(total-weights.horde)/total,hordeShare:weights.horde/total});}}
 assert.deepEqual([4,7,13].map(naturalEventChance),[.6,.7,.8]);assert.deepEqual(eventCategoryWeights(0),{mission:45,encounter:35,horde:20});
});

for(const difficulty of difficulties)test(`${difficulty}: natural mission/encounter lottery and extra bait use only the allowed stage pool`,()=>{
 for(const race of races)for(const stage of [4,8,18])for(const tavern of [0,3])for(const category of ['mission','encounter'] as const){
  const w=world(difficulty,race,stage);normalScheduler(w);w.funShop.levels.tavern=tavern;const weights=eventCategoryWeights(tavern),total=weights.mission+weights.encounter+(w.replacementWindowSafe()?weights.horde:0),draws=[0,category==='mission'?0:(weights.mission+.5)/total],rng=w.random;w.random=()=>draws.length?draws.shift()!:rng();
  for(let attempt=0;attempt<16&&!w.fieldEvents.pacing.started;attempt++){tickEventPacing(w);w.time++;w.stageElapsed++;}
  assert.ok(w.fieldEvents.pacing.started,JSON.stringify({difficulty,race,stage,tavern,category,choice:w.fieldEvents.pacing.choice}));const kind=category==='mission'?w.missions.active?.kind:w.encounters.active?.kind??w.encounters.expanded.short?.kind??w.encounters.expanded.queen?.kind;
  assert.ok(kind,JSON.stringify({difficulty,race,stage,tavern,category,choice:w.fieldEvents.pacing.choice,actual:w.fieldEvents.pacing.lastKey}));assert.ok((category==='mission'?allowed(difficulty).missions:allowed(difficulty).encounters).includes(kind));rows.push({difficulty,race,stage,tavern,category:'natural-'+category,kind});
 }
 for(const race of races){const w=world(difficulty,race);normalScheduler(w);w.funShop.levels.bait=3;w.funShop.bait={...newFunShop().bait,stage:w.stage,next:100,pending:{encounter:true,elite:false,horde:false}};tickBait(w);assert.equal(w.funShop.bait.counts.encounter,1);const kind=w.encounters.active?.kind??w.encounters.expanded.short?.kind??w.encounters.expanded.queen?.kind;assert.ok(kind);assert.ok(allowed(difficulty).encounters.includes(kind));rows.push({difficulty,race,category:'bait-admission',kind});}
});
