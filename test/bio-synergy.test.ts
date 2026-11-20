import test from 'node:test';
import assert from 'node:assert/strict';
import {BIO_CARDS} from '../src/data/terran-bio';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {World} from '../src/simulation/world';
import {bioScenario,startBioScene} from '../preview/bio-synergy-20261118/scenarios';
import {applyBioPurchase} from '../src/simulation/combat/bio-acquisition';
import {pendingBuildChoice,prepareArmedChoices} from '../src/simulation/combat/armed-support';
import {bioLifeTick} from '../src/simulation/combat/bio-life';
import {bioAfterDamage,bioOnEnemyDeath,bioTickCombat,stableDps} from '../src/simulation/combat/bio-combat';
import {newBioState} from '../src/simulation/combat/bio-state';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,inspectShopWeights} from '../src/simulation/progression/expedition-drafts';
import {RARITIES} from '../src/data/rewards';

for(const card of BIO_CARDS)test(card.id+' '+card.name+' plays and restores during battle',()=>{
 const w=bioScenario(card.id).world;w.restoreRun(w.captureRun());startBioScene(w,card.id);w.advance(2);
 assert.equal(w.phase,'battle');assert.equal(w.tick,120);const state=structuredClone(w.expedition.bio);w.restoreRun(w.captureRun());assert.deepEqual(w.expedition.bio,state);
 for(const u of w.entities.values())assert.ok(Number.isFinite(u.hp)&&u.hp<=u.maxHp&&Number.isFinite(u.weaponDamage));
});
function blank(){
 const w=new World({race:'terran',seed:181145,waves:false,terrain:new FlatTerrain(),obstacles:[]});w.start();w.entities.clear();w.expedition.bio=newBioState();return w;
}
test('three ordinary purchases settle from the real shelf and grant one free frozen choice',()=>{
 const w=blank();w.addUnit('marine','terran',0,0);w.endStage();w.wallet={minerals:100000,gas:100000};w.rewardRound='random';w.expedition.developmentBought=true;
 const ctx=draftContext(w),groups=new Set<string>(),tiers=Object.keys(RARITIES);
 const draws=['bio.BIO-W01','bio.BIO-W02','bio.BIO-W03'].map((id,i)=>{
  const pool=inspectShopWeights(ctx,i===0).filter(c=>c.weight>0&&!groups.has(c.group)).sort((a,b)=>tiers.indexOf(a.rarity)-tiers.indexOf(b.rarity));
  const index=pool.findIndex(c=>c.id===id);assert.ok(index>=0);groups.add(pool[index].group);const sum=(xs:typeof pool)=>xs.reduce((n,c)=>n+c.weight,0);return (sum(pool.slice(0,index))+pool[index].weight/2)/sum(pool);
 });
 const random=ctx.random;ctx.random=()=>draws.shift()??random();w.rewards=drawExpeditionReinforcements(ctx,true);
 const shelf=[...w.rewards];for(const [i,card] of shelf.entries()){assert.equal(card.expeditionEffect.kind,'bio');assert.ok(w.purchaseShopOffer(w.draftWindowKey,card.offerId));assert.equal(w.expedition.build!.counts.bio,i+1);}
 const m=pendingBuildChoice(w)!;assert.equal(m.offers.length,3);w.restoreRun(w.captureRun());w.wallet={minerals:0,gas:0};assert.ok(w.claimBuildChoice(m.id,w.expedition.shopRevision,m.offers[0]));assert.equal(w.expedition.build!.main,'bio');assert.deepEqual(w.wallet,{minerals:0,gas:0});assert.equal(w.claimBuildChoice(m.id,w.expedition.shopRevision,m.offers[0]),false);
});
test('white repurchase changes rank without counting a new milestone and duplicate receipts do nothing',()=>{
 const w=blank();w.addUnit('marine','terran',0,0);for(const [index,id] of (['BIO-W01','BIO-W01','BIO-W02','BIO-W03'] as const).entries()){assert.ok(applyBioPurchase(w,id,'item'+index));assert.equal(w.expedition.build!.counts.bio,[1,1,2,3][index]);assert.equal(applyBioPurchase(w,id,'item'+index),false);}
});
test('jungle keeps the lone-star Reaper and its existing twin across restore',()=>{
 const w=blank(),s=w.expedition.bio!;s.ranks['BIO-G05']=1;const reaper=w.addUnit('reaper','terran',0,0,3);reaper.eliteId='reaper.3';w.addUnit('reaper','terran',1,0,12);bioLifeTick(w,1/60);const twin=reaper.bio!.twin!;s.ranks['BIO-O03']=1;bioLifeTick(w,1/60);
 assert.equal(w.familyUnits('reaper').length,1);assert.equal(reaper.rank,25);assert.equal(w.entities.get(twin)?.rank,25);w.restoreRun(w.captureRun());bioLifeTick(w,1/60);assert.equal(w.entities.get(reaper.id)?.bio?.twin,twin);
});
test('one surviving twin keeps the seat and restores the same formal identity only once',()=>{
 const w=blank(),s=w.expedition.bio!;s.ranks['BIO-G05']=1;s.ranks['BIO-B03']=1;const u=w.addUnit('reaper','terran',0,0);bioLifeTick(w,1/60);const twin=u.bio!.twin!;
 w.hit(u,1e9,[],1,'zerg',0,1);assert.equal(s.appointments?.length,1);assert.equal(s.appointments![0].kind,'twin');assert.equal(w.familySeatCount('reaper'),1);w.restoreRun(w.captureRun());
 w.tick=1500;w.time=25;bioLifeTick(w,1/60);const revived=w.entities.get(u.id)!;assert.equal(revived.hp,revived.maxHp*.5);assert.equal(revived.bio!.twin,twin);assert.equal(w.expedition.bio!.appointments!.length,0);
});
test('cocoon freezes a reserved result through save and pays only for a successful hatch',()=>{
 const w=blank(),s=w.expedition.bio!;s.ranks={'BIO-B03':1,'BIO-N07':1};s.nodeReserves['BIO-N07']=1;const u=w.addUnit('marine','terran',0,0);w.hit(u,1e9,[],1,'zerg',0,1);assert.equal(s.appointments?.length,1);assert.equal(s.nodeReserves['BIO-N07'],1);
 w.restoreRun(w.captureRun());w.time=3;w.tick=180;bioLifeTick(w,1/60);assert.equal(w.expedition.bio!.nodeReserves['BIO-N07'],0);const revived=w.entities.get(u.id)!;assert.equal(revived.hp,revived.maxHp*.75);
});
test('venom stacks per source, armor reduction and plague share one target cap',()=>{
 const w=blank(),s=w.expedition.bio!;s.ranks={'BIO-W02':1,'BIO-B09':3,'BIO-N04':1};const u=w.addUnit('marine','terran',0,0),e=w.addUnit('roach','zerg',0,2);e.hp=e.maxHp=1e6;e.armor=50;
 for(let i=0;i<20;i++)w.attackHit(u,e,150,[],2);assert.equal(e.bio!.poisons!.length,3);assert.equal(e.bio!.armorLayers!.length,4);assert.equal(e.bio!.plague!.length,5);const before=e.hp;w.time=1;bioTickCombat(w,1/60);assert.ok(before-e.hp>=25000);
});

test('W02 pays four ordinary poison ticks after one hit and stops at expiry, including after restore',()=>{
 const w=bioScenario('BIO-W02').world;
 const shooter=w.allies()[0],target=[...w.entities.values()].find(e=>e.owner==='zerg')!;
 const tickDamage=stableDps(shooter)*.03-w.effectiveArmor(target);
 assert.ok(tickDamage>0);
 w.attackHit(shooter,target,10,[],1);
 const hpAfterShot=target.hp,snapshot=w.captureRun();
 for(const restore of [false,true]){
  if(restore)w.restoreRun(snapshot);
  const body=w.entities.get(target.id)!;
  for(let second=1;second<=5;second++){
   w.tick=second*60;w.time=second;bioTickCombat(w,1/60);
   assert.ok(Math.abs(body.hp-(hpAfterShot-Math.min(second,4)*tickDamage))<1e-7);
  }
  assert.equal(body.bio!.poisons!.length,0);
 }
});
test('stacking growth and armor refresh preserves existing wounds',()=>{
 const w=blank(),u=w.addUnit('marine','terran',0,0,5);const hp=u.maxHp,armor=u.armor;w.expedition.bio!.ranks={'BIO-G03':3,'BIO-P01':3,'BIO-B02':3,'BIO-N01':1};w.refreshStats(u,true);assert.ok(Math.abs(u.maxHp/hp-2.4)<1e-6);assert.ok(Math.abs(u.armor/armor-2.65)<1e-6);
 u.hp*=.65;const wounded=u.hp;for(let i=0;i<20;i++)w.refreshStats(u);assert.ok(Math.abs(wounded-u.hp)<1e-6);
});

test('pain sharing requires another wounded soldier before it consumes the reserve',()=>{
 const w=blank(),s=w.expedition.bio!;
 s.ranks={'BIO-N09':1};s.nodeReserves['BIO-N09']=1;
 const soldier=w.addUnit('marine','terran',0,0),ally=w.addUnit('marauder','terran',1,0);
 soldier.hp*=.8;bioAfterDamage(w,soldier,undefined,soldier.maxHp*.2,true);
 assert.equal(s.nodeReserves['BIO-N09'],1);assert.equal(ally.bio?.shareEnd,undefined);
 ally.hp*=.9;bioAfterDamage(w,soldier,undefined,soldier.maxHp*.2,true);
 assert.equal(s.nodeReserves['BIO-N09'],0);assert.equal(ally.bio?.shareEnd,10);
});

test('the original and its twin share one growth clock and one kill account',()=>{
 const w=blank(),s=w.expedition.bio!;
 s.ranks={'BIO-G05':1,'BIO-G03':1,'BIO-N01':1,'BIO-P02':1};
 const host=w.addUnit('reaper','terran',0,0);
 bioLifeTick(w,1/60);const twin=w.entities.get(host.bio!.twin!)!;
 const enemy=w.addUnit('roach','zerg',2,0);bioOnEnemyDeath(w,enemy,twin.id);
 assert.equal(host.bio!.kills,1);assert.equal(twin.bio!.kills,undefined);
 twin.bio!.lastCombat=w.time;host.bio!.surviveTime=19;
 bioTickCombat(w,1);assert.equal(host.bio!.survival,1);assert.equal(host.bio!.surviveTime,0);
});

test('the twin receives its share of the queen aura once and the jungle preserves wounds',()=>{
 const w=blank(),s=w.expedition.bio!;s.ranks={'BIO-G05':1};
 const host=w.addUnit('reaper','terran',0,0);
 bioLifeTick(w,1/60);const twin=w.entities.get(host.bio!.twin!)!;
 const base={hp:twin.maxHp,damage:twin.weaponDamage};
 s.ranks['BIO-O02']=1;bioLifeTick(w,1/60);
 const queen=w.heroEntity('kerrigan')!;queen.x=host.x;queen.z=host.z;
 w.refreshStats(host);bioLifeTick(w,1/60);
 assert.ok(Math.abs(twin.maxHp/base.hp-1.2625)<1e-6);
 assert.ok(Math.abs(twin.weaponDamage/base.damage-1.375)<1e-6);
 host.hp=host.maxHp*.35;s.ranks['BIO-O03']=1;bioLifeTick(w,1/60);
 assert.ok(Math.abs(host.hp/host.maxHp-.35)<1e-6);assert.equal(host.bio!.twin,twin.id);
});
