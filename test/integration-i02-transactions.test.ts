import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,itemsAt,BACKPACK_CAPACITY,WAREHOUSE_CAPACITIES,settleEquipment,DISMANTLE_VALUES,collectEquipment} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady,finishSpecialStage,specialAfterStep,quitSpecialStage} from '../src/simulation/special-stages/runtime';
import {collectSpecialRewards} from '../src/simulation/special-stages/rewards';
import {updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {createWorldStarshipHost} from '../src/ui/starship/world-host';
import {StarshipController,type CommandEnvelope,type ShipCommand} from '../src/ui/starship/controller';
import {spawnMission,tickMissions} from '../src/simulation/missions/runtime';
import {funShopCandidates} from '../src/simulation/fun-shop/state';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {planTaskEquipment,deliverTaskEquipment} from '../src/simulation/starship/drops';
import {tickShopSupport} from '../src/simulation/combat/shop-support';
import {beginExpeditionWindow} from '../src/simulation/progression/expedition-drafts';

function fixture(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine','marauder','reaper','hellion'],equipmentAccount:newEquipmentAccount()});assert.ok(w.start());w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;return w;}
function begin(w:World,kind:'resources'|'crossing'|'arena'='resources'){assert.ok(beginSpecialStage(w,kind,'fixture'));assert.ok(markSpecialReady(w));return w.specialStages.active!;}
function grant(w:World,receipt:string,kind:'backpack'|'ground'|'warehouse'='backpack'){const a=w.starship.account,r=grantEquipment(a,{template:'attribute.1',race:'terran',slot:'offense1'},receipt,kind==='warehouse'?{kind}:{kind,run:a.run!.id,...(kind==='ground'?{x:12,z:12}:{})});assert.ok(r.ok);return r.value;}
function envelope(c:StarshipController,id:string,command:ShipCommand):CommandEnvelope{return {id,revision:c.host.account().revision,managementRevision:c.host.management.revision,command};}
function crossingSuccess(w:World){const a=w.specialStages.active!;for(const id of a.participants)w.entities.get(id)!.z=-48;specialAfterStep(w);assert.equal(a.phase,'loot');return a;}
function boss(w:World){const u=w.addUnit('roach','zerg',12,12);u.enemyTier='boss';w.hit(u,1e12,[],1,'terran',0,1,w.allies()[0].id,true);const card=w.rewardDrops.find(d=>d.bossLootReceipt)!;assert.ok(card);return card;}
function shopOffer(w:World,id:'gland'|'eye'|'pandora'){
 const c=funShopCandidates(w.funShop.levels).find(c=>c.item===id)!;assert.ok(c);
 const r:ExpeditionReward={id:c.id,offerId:'i02-offer:'+w.nextId++,name:c.name,description:c.description,icon:c.icon,rarity:c.rarity,kind:'buff',value:c.item,...c.price,baseMinerals:c.price.minerals,baseGas:c.price.gas,discount:0,sold:false,expeditionWindow:w.draftWindowId,expeditionRound:'random',expeditionEffect:{kind:'funShop',item:id,level:1,expected:0}};w.rewards.push(r);return r;
}

test('I02 paid training and a launched passenger retain identity, payment and remaining work through a challenge',()=>{
 const w=fixture();w.wallet={minerals:1000,gas:1000};updateExpeditionProduction(w,0);const job=w.expedition.ledger[0];assert.ok(job);assert.ok(w.setProductionEnabled(job.family,false));
 const wallet={...w.wallet},before=structuredClone(job);begin(w);assert.equal(w.expedition.ledger.length,0);w.advance(2);assert.ok(finishSpecialStage(w,'timeout'));
 assert.equal(w.expedition.ledger[0],job);assert.deepEqual(job,before);assert.deepEqual(w.wallet,wallet);updateExpeditionProduction(w,100);assert.equal(job.state,'risk');const pod=w.pods.find(p=>p.id===job.podId)!;assert.ok(pod);
 const podBefore=structuredClone(pod),jobBefore=structuredClone(job);w.specialStages.used.delete(w.stage);begin(w);w.advance(1);assert.ok(finishSpecialStage(w,'timeout'));assert.deepEqual(pod,podBefore);assert.deepEqual(job,jobBefore);
 const p=w.freePosition(job.family,w.anchor,1,8)!;assert.ok(p);assert.ok(releasePaidPassenger(w,pod,0,p));const count=w.allies().length;assert.equal(releasePaidPassenger(w,pod,0,p),null);assert.equal(w.allies().length,count);assert.deepEqual(w.wallet,wallet);
});
test('I02 full backpack recovery uses the real equipment controller and never duplicates any of the three crossing rewards',()=>{
 const w=fixture(),a=w.starship.account;for(let n=0;n<BACKPACK_CAPACITY;n++)grant(w,'full:'+n);const host=createWorldStarshipHost(w,{resolveImage:k=>k}),control=new StarshipController(host);
 const stale=envelope(control,'old-discard',{type:'discard',ids:[itemsAt(a,'backpack')[0].id]});begin(w,'crossing');const special=crossingSuccess(w),ids=[...special.rewardIds];
 assert.equal(collectSpecialRewards(w),false);assert.equal(quitSpecialStage(w),false);assert.equal(itemsAt(w.starship.account,'ground').length,3);assert.equal(control.execute(stale).ok,false);
 const remove=itemsAt(w.starship.account,'backpack').slice(0,3).map(i=>i.id),request=envelope(control,'free-space',{type:'discard',ids:remove});const result=control.execute(request);assert.ok(result.ok);assert.deepEqual(control.execute(request),result);
 assert.ok(collectSpecialRewards(w));assert.equal(collectSpecialRewards(w),false);assert.equal(itemsAt(w.starship.account,'backpack').length,64);assert.ok(quitSpecialStage(w));assert.equal(quitSpecialStage(w),false);assert.equal(collectSpecialRewards(w),false);
 assert.ok(ids.every(id=>a.locations[id].kind==='backpack'));assert.ok(remove.every(id=>!a.items[id]));assert.equal(new Set(Object.keys(a.items)).size,Object.keys(a.items).length);host.dispose?.();
});
test('I02 full warehouse salvages once on actual extraction after special-field return',()=>{
 const w=fixture(),a=w.starship.account;for(let n=0;n<WAREHOUSE_CAPACITIES[0];n++)grant(w,'warehouse:'+n,'warehouse');const bag=[grant(w,'one'),grant(w,'two')];begin(w);assert.ok(finishSpecialStage(w,'timeout'));while(w.stage<6){w.endStage();while(w.phase==='reward')w.skipReward();}w.endStage();const dust=a.dust;
 assert.ok(w.extractEquipment());assert.equal(a.dust,dust+2*DISMANTLE_VALUES[1]);assert.ok(a.run!.ended);const once=structuredClone(a);assert.equal(w.extractEquipment(),false);settleEquipment(a,'success');settleEquipment(a,'failure');assert.deepEqual(a,once);assert.ok(bag.every(i=>!a.items[i.id]));
});
test('I02 original Boss cards stay frozen, while arena claims return once through the normal receipt path',()=>{
 const w=fixture(),normal=boss(w),original=structuredClone(normal);begin(w,'arena');const active=w.specialStages.active!;assert.ok(!w.rewardDrops.some(d=>d.id===normal.id));
 for(const id of active.enemies)w.hit(w.entities.get(id)!,1e12,[],1,'terran',0,1,w.allies()[0].id,true);specialAfterStep(w);assert.equal(active.phase,'loot');collectSpecialRewards(w);const receipts=active.cards.map(d=>d.bossLootReceipt).filter((r):r is string=>!!r);assert.ok(receipts.length);
 assert.ok(quitSpecialStage(w));assert.deepEqual(w.rewardDrops.find(d=>d.id===normal.id),original);const state=structuredClone({wallet:w.wallet,account:w.starship.account,claimed:w.expedition.bossLootClaimed,heroes:w.heroes});
 for(const card of active.cards)assert.equal(w.collectRewardDrop(card.id),false);assert.equal(quitSpecialStage(w),false);assert.deepEqual({wallet:w.wallet,account:w.starship.account,claimed:w.expedition.bossLootClaimed,heroes:w.heroes},state);
 assert.ok(receipts.every(r=>w.expedition.bossLootClaimed.includes(r)||w.rewardDrops.some(d=>d.bossLootReceipt===r)));assert.ok(w.collectRewardDrop(normal.id));assert.equal(w.collectRewardDrop(normal.id),false);
});
test('I02 task reward plans, old ground identities and drop lifetime survive return without minting again',()=>{
 const w=fixture(),a=w.starship.account,plan=planTaskEquipment(w,{difficulty:'hell',stage:12,tier:'boss',endlessRound:1},'i02:task')!;assert.ok(plan);assert.ok(deliverTaskEquipment(w,plan,{x:15,z:15}));const original=structuredClone({items:a.items,locations:a.locations,receipts:a.receipts,serial:a.serial,rng:a.rng});
 begin(w);w.advance(1);assert.ok(finishSpecialStage(w,'timeout'));assert.deepEqual({items:a.items,locations:a.locations,receipts:a.receipts,serial:a.serial,rng:a.rng},original);assert.ok(deliverTaskEquipment(w,plan,{x:0,z:0}));assert.deepEqual({items:a.items,locations:a.locations,receipts:a.receipts,serial:a.serial,rng:a.rng},original);
});
test('I02 repair task reservation and elapsed work stay frozen then grant one facility',()=>{
 const w=fixture();w.missions.enabled=true;w.workers=4;assert.ok(spawnMission(w,'repair'));const m=w.missions.active!,b=w.missions.bodies.get(m.bodyIds[0])!;Object.assign(w.anchor,{x:b.x,z:b.z});Object.assign(w.allies()[0],{x:b.x+3,z:b.z});tickMissions(w);assert.equal(m.phase,'active');
 for(let i=0;i<120;i++)tickMissions(w);const before=structuredClone(w.missions),building=structuredClone(w.expedition.building);begin(w);w.advance(1);assert.ok(finishSpecialStage(w,'timeout'));assert.deepEqual(w.missions,before);assert.deepEqual(w.expedition.building,building);
 for(let i=0;i<900&&w.missions.active;i++){w.time+=1/60;tickMissions(w);}assert.equal(w.missions.lastResult?.result,'succeeded');assert.ok(w.missions.receipts.has(m.id+':facilityGrant'));const after=structuredClone(w.expedition.building);tickMissions(w);tickMissions(w);assert.deepEqual(w.expedition.building,after);
});
test('I02 original temporary friends and their expiry are frozen rather than copied or extended',()=>{
 const w=fixture(),u=w.addUnit('baneling','terran',9,9);u.temporary=true;u.temporaryKind='shop-gland';u.temporaryUntil=30;const before=structuredClone(u);begin(w);assert.ok(!w.entities.has(u.id));w.advance(2);assert.ok(finishSpecialStage(w,'timeout'));assert.equal(w.entities.get(u.id),u);assert.deepEqual(u,before);
});
test('I02 once-only special payout remains atomic under synchronous UI notification replay',()=>{
 const w=fixture();begin(w,'crossing');const a=crossingSuccess(w);let reentered=false;w.listeners.add(()=>{if(!reentered){reentered=true;collectSpecialRewards(w);}});
 collectSpecialRewards(w);assert.equal(itemsAt(w.starship.account,'backpack').length,3);const ids=[...a.rewardIds];assert.ok(quitSpecialStage(w));assert.ok(ids.every(id=>w.starship.account.locations[id]?.kind==='backpack'));assert.equal(itemsAt(w.starship.account,'backpack').length,3);
});
test('I02 failed purchase retries and stale quotes cannot repeat a charge, a free use or Pandora payout',()=>{
 const w=fixture();w.endStage();assert.ok(w.skipReward());assert.equal(w.rewardRound,'random');w.wallet={minerals:0,gas:0};w.expedition.freePurchasesRemaining=0;const gland=shopOffer(w,'gland'),window=w.draftWindowKey;
 let revision=w.expedition.shopRevision;assert.equal(w.purchaseShopOffer(window,gland.offerId,revision),false);assert.equal(gland.sold,false);assert.equal(w.funShop.levels.gland,0);
 w.wallet={minerals:300,gas:100};assert.ok(w.purchaseShopOffer(window,gland.offerId,revision));const paid={...w.wallet};assert.equal(w.purchaseShopOffer(window,gland.offerId,revision),false);assert.deepEqual(w.wallet,paid);
 w.expedition.freePurchasesRemaining=2;const pandora=shopOffer(w,'pandora');revision=w.expedition.shopRevision;assert.ok(w.purchaseShopOffer(window,pandora.offerId,revision));assert.equal(w.expedition.freePurchasesRemaining,2);const payout={...w.wallet};assert.equal(w.purchaseShopOffer(window,pandora.offerId,revision),false);assert.deepEqual(w.wallet,payout);
 const eye=shopOffer(w,'eye');revision=w.expedition.shopRevision;assert.ok(w.purchaseShopOffer(window,eye.offerId,revision));assert.equal(w.expedition.freePurchasesRemaining,1);assert.deepEqual(w.wallet,payout);assert.equal(w.purchaseShopOffer(window,eye.offerId,revision),false);
 assert.ok(w.skipReward());assert.equal(w.phase,'battle');const before=structuredClone({wallet:w.wallet,shop:w.funShop,free:w.expedition.freePurchasesRemaining,claims:w.expedition.draftClaims});begin(w);w.advance(1);assert.ok(finishSpecialStage(w,'timeout'));
 assert.equal(w.purchaseShopOffer(window,eye.offerId,revision),false);assert.deepEqual({wallet:w.wallet,shop:w.funShop,free:w.expedition.freePurchasesRemaining,claims:w.expedition.draftClaims},before);
});
test('I02 a paid hero revival blocked on landing freezes through the challenge and deploys only once afterwards',()=>{
 const w=fixture();assert.ok(w.acquireHero('raynor'));const hero=w.heroEntity('raynor')!;assert.ok(hero);w.hit(hero,1e12,[],1,'zerg',0,1,undefined,true);w.endStage();w.wallet={minerals:10000,gas:10000};assert.ok(w.reviveHero('raynor'));const paid={...w.wallet};assert.equal(w.reviveHero('raynor'),false);assert.deepEqual(w.wallet,paid);
 const free=w.freePosition.bind(w);w.freePosition=()=>null;for(let n=0;n<4&&w.phase==='reward';n++)assert.ok(w.skipReward());assert.equal(w.phase,'battle');const h=w.heroes.get('raynor')!;assert.ok(h.awaitingSpawn);const original=structuredClone(h);begin(w);w.advance(1);assert.ok(finishSpecialStage(w,'timeout'));assert.equal(w.heroes.get('raynor'),h);assert.deepEqual(h,original);assert.deepEqual(w.wallet,paid);
 w.freePosition=free;w.step();assert.ok(w.heroEntity('raynor')!.hp>0);const id=w.heroEntity('raynor')!.id;w.step();assert.equal(w.heroEntity('raynor')!.id,id);assert.equal(w.allies().filter(u=>u.heroId==='raynor').length,1);assert.deepEqual(w.wallet,paid);
});
test('I02 stale equipment commands remain rejected after a failed full-backpack pickup and legal retry',()=>{
 const w=fixture(),a=w.starship.account;for(let i=0;i<64;i++)grant(w,'fill:'+i);const ground=grant(w,'ground','ground'),host=createWorldStarshipHost(w,{resolveImage:k=>k}),controller=new StarshipController(host);w.anchor={x:12,z:12,facing:0};
 const blocked=envelope(controller,'blocked-pickup',{type:'pickup',id:ground.id});assert.equal(controller.execute(blocked).ok,false);const remove=envelope(controller,'discard-one',{type:'discard',ids:[itemsAt(a,'backpack')[0].id]});assert.ok(controller.execute(remove).ok);
 assert.equal(controller.execute(blocked).ok,false);const retry=envelope(controller,'retry-pickup',{type:'pickup',id:ground.id});assert.ok(controller.execute(retry).ok);const once=structuredClone(a);assert.ok(controller.execute(retry).ok);assert.deepEqual(a,once);assert.equal(host.pickup(ground.id).ok,false);host.dispose?.();
});
test('I02 challenge wipe settles once and cannot restore the run through a stale claim or success callback',()=>{
 const w=fixture();grant(w,'risk');const a=begin(w);for(const id of a.participants)w.hit(w.entities.get(id)!,1e12,[],1,'zerg',0,1,undefined,true);specialAfterStep(w);assert.equal(w.phase,'lost');assert.ok(w.starship.account.run!.ended);
 const once=structuredClone(w.starship.account);assert.equal(finishSpecialStage(w,'success'),false);assert.equal(collectSpecialRewards(w),false);assert.equal(quitSpecialStage(w),false);settleEquipment(w.starship.account,'failure');assert.deepEqual(w.starship.account,once);assert.equal(w.phase,'lost');
});
test('I02 opening a bag, pausing or waiting in loot cannot move either field clock or advance production',()=>{
 const w=fixture();w.wallet={minerals:1000,gas:1000};updateExpeditionProduction(w,0);const job=structuredClone(w.expedition.ledger),host=createWorldStarshipHost(w,{resolveImage:k=>k});const a=begin(w,'crossing');
 const release=host.acquireWindow(),time=w.time;w.advance(3);assert.equal(w.time,time);assert.equal(a.clock,0);release();w.paused=true;w.advance(3);assert.equal(w.time,time);w.paused=false;crossingSuccess(w);w.advance(3);assert.equal(w.time,time);assert.equal(a.clock,0);collectSpecialRewards(w);quitSpecialStage(w);assert.deepEqual(w.expedition.ledger,job);host.dispose?.();
});
