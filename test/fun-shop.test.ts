import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {newFunShop,funShopCandidates,funShopQuote,shopRarityWeights,TAVERN_MULTIPLIERS,FUN_SHOP_IDS,type FunShopId} from '../src/simulation/fun-shop/state';
import {buyFunShop,tickFunShop,glandDeath} from '../src/simulation/fun-shop/runtime';
import {tickBait} from '../src/simulation/fun-shop/bait';
import {draftContext,purchaseOffer,offerEligible} from '../src/simulation/expedition-economy';
import {beginExpeditionWindow,drawExpeditionReinforcements,drawMapLoot,inspectReinforcementPool,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {eventCategoryWeights} from '../src/simulation/field-events/pacing';
import {spawnEncounter} from '../src/simulation/encounters/runtime';
import {spawnFunEncounter} from '../src/simulation/encounters/expanded';
import {startReplacementHorde} from '../src/simulation/field-events/hordes';
import {beginSpecialStage,markSpecialReady,quitSpecialStage,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {nydusPose} from '../src/render/units/fun-presentation';

function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});w.start();w.stage=8;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function shop(w:World){w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,w.draftStage,w.draftWindowId);w.wallet={minerals:10000,gas:10000};}
function offer(w:World,id:FunShopId,level:number){const c=funShopCandidates(w.funShop.levels).find(c=>c.item===id&&c.level===level)!;assert.ok(c);const r:ExpeditionReward={id:c.id,offerId:'test:'+w.nextId++,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:'buff',value:c.item,...c.price,baseMinerals:c.price.minerals,baseGas:c.price.gas,discount:0,sold:false,expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:{kind:'funShop',item:id,level,expected:c.expected}};w.rewards.push(r);return r;}
for(const id of FUN_SHOP_IDS)test('real shop transaction and duplicate receipt: '+id,()=>{const w=fixture();shop(w);const r=offer(w,id,1),before={...w.wallet};assert.equal(offerEligible(w,r),true);assert.equal(purchaseOffer(w,r.offerId),true);assert.equal(w.funShop.levels[id],1);assert.equal(w.wallet.minerals,before.minerals-r.minerals+(id==='pandora'?3000:0));assert.equal(w.wallet.gas,before.gas-r.gas+(id==='pandora'?1500:0));assert.equal(purchaseOffer(w,r.offerId),false);});
test('upgrade differences, direct high tiers, stale quotes, insufficient funds and sequential dice',()=>{
 const w=fixture();shop(w);const stale=offer(w,'tavern',3),one=offer(w,'tavern',1);assert.equal(purchaseOffer(w,one.offerId),true);assert.equal(offerEligible(w,stale),false);assert.equal(purchaseOffer(w,stale.offerId),false);
 const three=offer(w,'tavern',3);assert.deepEqual([three.minerals,three.gas],[250,75]);w.wallet.gas=74;assert.equal(purchaseOffer(w,three.offerId),false);assert.equal(w.funShop.levels.tavern,1);w.wallet.gas=75;assert.equal(purchaseOffer(w,three.offerId),true);
 assert.equal(funShopQuote(w.funShop.levels,'dice',2),null);for(let l=1;l<=5;l++){const q=funShopQuote(w.funShop.levels,'dice',l)!;assert.ok(q);assert.equal(buyFunShop(w,'dice',l,l-1),true);}assert.equal(funShopQuote(w.funShop.levels,'dice',5),null);
 const x=fixture();shop(x);const max=offer(x,'bait',3);assert.deepEqual([max.minerals,max.gas],[350,100]);assert.equal(purchaseOffer(x,max.offerId),true);
});
test('free Pandora leaves ordinary free purchase credit intact and grants only once',()=>{const w=fixture();shop(w);w.expedition.freePurchasesRemaining=2;const r=offer(w,'pandora',1);assert.equal(purchaseOffer(w,r.offerId),true);assert.equal(w.expedition.freePurchasesRemaining,2);assert.deepEqual(r.purchaseReceipt,{minerals:0,gas:0,freeSource:null});assert.equal(buyFunShop(w,'pandora',1,0),false);});
test('all seven groups join actual shop pool and map drops retain their own quality path',()=>{const w=fixture();shop(w);const ctx=draftContext(w),pool=inspectReinforcementPool(ctx);for(const id of FUN_SHOP_IDS)assert.ok(pool.some(c=>c.effect.kind==='funShop'&&c.effect.item===id));const a=fixture(),b=fixture();shop(a);shop(b);b.funShop.levels.dice=5;const ca=draftContext(a),cb=draftContext(b);for(let i=0;i<40;i++)assert.deepEqual(drawMapLoot(ca),drawMapLoot(cb));});
test('dice boosts both normalized high tiers including early orange; current shelf consumes no RNG',()=>{
 for(let level=1;level<=5;level++){const base=[45,35,16,4,0],weights=shopRarityWeights(base,level,.5),sum=weights.reduce((a,b)=>a+b);assert.ok(weights[3]/sum>4/100);assert.ok(weights[4]>0);assert.deepEqual(weights.slice(0,3),base.slice(0,3));}
 const w=fixture();shop(w);w.rewards=drawExpeditionReinforcements(draftContext(w));const before=structuredClone(w.rewards),rng=w.snapshotData().rngState;buyFunShop(w,'dice',1,0);assert.deepEqual(drawExpeditionReinforcements(draftContext(w)),before);assert.equal(w.snapshotData().rngState,rng);
});
test('tavern weights the mission category without changing existing mission clocks',()=>{
 for(let level=0;level<=3;level++)assert.deepEqual(eventCategoryWeights(level),{mission:45*TAVERN_MULTIPLIERS[level],encounter:35,horde:20});
 const w=fixture(),state=w.missions;state.check=500;state.gcd=123;buyFunShop(w,'tavern',3,0);assert.equal(state.check,500);assert.equal(state.gcd,123);
});
test('moving local eye reveals cloak at 14m and never reveals distant enemies',()=>{const w=fixture(),e=w.addUnit('lurker','zerg',13,0);e.cloaked=true;assert.equal(w.visibleTo(e,'terran'),false);buyFunShop(w,'eye',1,0);assert.equal(w.visibleTo(e,'terran'),true);e.x=30;assert.equal(w.visibleTo(e,'terran'),false);w.anchor.x=20;assert.equal(w.visibleTo(e,'terran'),true);assert.equal(w.expedition.detectionFields.length,0);});
test('gland uses real lethal path, source cap ten, mortality and no recursive hatch',()=>{
 const w=fixture();buyFunShop(w,'gland',1,0);const source=w.allies()[0];w.random=()=>0;
 for(let i=0;i<12;i++){const e=w.addUnit('roach','zerg',12+i*2,0);w.hit(e,1e9,[],1,'terran',0,1,source.id);}
 let living=()=>[...w.entities.values()].filter(u=>u.hp>0&&u.temporaryKind==='shop-gland');assert.equal(living().length,10);const b=living()[0];w.hit(b,1e9,[],1,'zerg',0,1);assert.equal(b.hp,0);assert.equal(living().length,9);
 const e=w.addUnit('roach','zerg',20,5);w.hit(e,1e9,[],1,'terran',0,1,living()[0].id);assert.equal(living().length,9);const f=w.addUnit('roach','zerg',20,7);w.hit(f,1e9,[],1,'terran',0,1,source.id);assert.equal(living().length,10);
});
test('gland baneling actually explodes once and is never a recovering ordinary baneling',()=>{const w=fixture();buyFunShop(w,'gland',1,0);w.random=()=>0;const source=w.allies()[0],victim=w.addUnit('roach','zerg',8,0);w.hit(victim,1e9,[],1,'terran',0,1,source.id);const b=w.allies().find(u=>u.temporaryKind==='shop-gland')!,target=w.addUnit('roach','zerg',b.x+.2,b.z);w.hash.rebuild([...w.entities.values()]);w.fire(b,target);assert.equal(b.hp,0);assert.equal(b.recoveryUntil,undefined);assert.ok(target.hp<target.maxHp);});
test('Pandora is future enemy only, preserves population/RNG, boosts special health once and damage once',()=>{
 const a=fixture(),b=fixture(),old=b.addUnit('roach','zerg',18,0),oldHp=old.maxHp;buyFunShop(b,'pandora',1,0);assert.equal(old.maxHp,oldHp);
 const x=a.addUnit('roach','zerg',20,0),y=b.addUnit('roach','zerg',20,0);assert.equal(y.maxHp,x.maxHp*1.25);assert.equal(y.weaponDamage,x.weaponDamage*1.15);const hp=y.maxHp;b.refreshStats(y);assert.equal(y.maxHp,hp);
 const p=a.spawnSpecial('hydralisk','elite',{x:25,z:0})!,q=b.spawnSpecial('hydralisk','elite',{x:25,z:0})!;assert.equal(q.maxHp,p.maxHp*1.25);b.refreshStats(q);assert.ok(Math.abs(q.maxHp-p.maxHp*1.25)<1e-9);
 const ta=a.allies()[0],tb=b.allies()[0];ta.hp=tb.hp=1000;ta.maxHp=tb.maxHp=1000;a.hit(ta,x.weaponDamage,[],1,'zerg',0,1,x.id);b.hit(tb,y.weaponDamage,[],1,'zerg',0,1,y.id);assert.ok(Math.abs((1000-tb.hp)/(1000-ta.hp)-1.15)<1e-9);assert.equal(a.snapshotData().rngState,b.snapshotData().rngState);assert.equal(b.enemyCount(),a.enemyCount()+1);
});
test('nydus performs sequential native kill receipts with protected targets excluded and reverses birth clip',()=>{
 const w=fixture();buyFunShop(w,'nydus',1,0);for(let i=0;i<7;i++)w.addUnit('roach','zerg',10+i*.2,0);const air=w.addUnit('mutalisk','zerg',10,0),elite=w.spawnSpecial('roach','elite',{x:12,z:0})!,guard=w.addUnit('roach','zerg',11,0);guard.mission={taskId:'protected',sourceId:0,noLoot:false,escortOnly:false,pulse:false,nextAction:0};
 w.time=18;tickFunShop(w);const n=w.funShop.nydus!;assert.ok(n);assert.equal(n.targets.length,6);assert.ok(!n.targets.includes(air.id)&&!n.targets.includes(elite.id)&&!n.targets.includes(guard.id));const before=w.stats.kills;
 for(let i=0;i<1300;i++){w.time+=1/60;tickFunShop(w);if(!w.funShop.nydus)break;}
 assert.equal(w.stats.kills-before,6);assert.ok(w.pickups.length>=6);assert.equal(air.hp,air.maxHp);assert.equal(guard.hp,guard.maxHp);assert.equal(w.funShop.nydus,null);assert.equal(w.entities.has(n.id),false);
});
test('bait rolls while native event busy, caps pending result and leaves native used set intact',()=>{
 const w=fixture();Object.defineProperty(w,'diagnosticRun',{value:false});Object.defineProperty(w,'missionAutoEnabled',{value:true});buyFunShop(w,'bait',3,0);w.random=()=>0;w.stageElapsed=20;const boss=w.spawnSpecial('roach','boss',{x:24,z:0})!;tickBait(w);assert.deepEqual(w.funShop.bait.pending,{encounter:true,elite:true,horde:true});assert.deepEqual(w.funShop.bait.counts,{encounter:0,elite:0,horde:0});w.stageElapsed=25;tickBait(w);assert.deepEqual(w.funShop.bait.pending,{encounter:true,elite:true,horde:true});boss.hp=0;tickBait(w);assert.equal(w.funShop.bait.counts.encounter,1);assert.equal(w.encounters.used.size,0);assert.equal(w.encounters.active?.bait,true);
});
test('native and bait encounter/horde quotas stay separate even after native kind already used',()=>{
 const w=fixture();w.encounters.used.add('golden');assert.equal(spawnEncounter(w,'golden'),false);assert.equal(spawnEncounter(w,'golden',true),true);assert.equal(w.encounters.active?.bait,true);
 const h=fixture();assert.equal(h.fieldEvents.hordeTried,false);assert.equal(startReplacementHorde(h,'zerglings',true),true);assert.equal(h.fieldEvents.hordeTried,false);
 const f=fixture();f.encounters.expanded.used.add('whitePack');assert.equal(spawnFunEncounter(f,'whitePack'),false);assert.equal(spawnFunEncounter(f,'whitePack',undefined,true),true);assert.equal(f.encounters.expanded.short?.bait,true);
});
test('special stage freezes original purchased state, clocks and actors; new run clears items',()=>{
 const w=fixture();buyFunShop(w,'gland',1,0);buyFunShop(w,'eye',1,0);buyFunShop(w,'nydus',1,0);const state=w.funShop,before=structuredClone(state);assert.equal(beginSpecialStage(w,'resources','fixture'),true);markSpecialReady(w);w.advance(2);assert.equal(w.funShop.levels.nydus,0);finishSpecialStage(w,'timeout');assert.equal(w.funShop,state);assert.deepEqual(w.funShop,before);w.resetRun();assert.deepEqual(w.funShop,newFunShop());
});
