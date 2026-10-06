import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {DEVELOPMENT,PRODUCTION_LINES,familyUnlock,lineSystem,lineResearch,seatRecipe,type ProductionLineId} from '../src/data/expedition-buildings';
import {beginExpeditionWindow,expeditionDevelopmentActions,canTakeExpeditionOffer,drawExpeditionReinforcements,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {draftContext,purchaseOffer} from '../src/simulation/expedition-economy';
import {teamCardEffects,teamCardKey} from '../src/simulation/progression/team-cards';
import {trainingTargets,applyTrainingTargets} from '../src/simulation/progression/training-cards';
import {canSupply,applySupply} from '../src/simulation/progression/supply-cards';
import {buySupport,tickShopSupport,commitStrategic,recordMutation} from '../src/simulation/combat/shop-support';
import {tickBroods} from '../src/simulation/zerg-brood';
import {aggregateMvpTalentEffects} from '../src/simulation/progression/mvp-talent-effects';
import {initializeCarrierSubsystem,ownedInterceptors} from '../src/simulation/combat/carriers';
import {ELITES} from '../src/data/elites';
const make=(race:'terran'|'zerg'|'protoss'='terran')=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.wallet={minerals:100000,gas:100000};return w;};
const window=(w:World,stage=12)=>{w.stage=stage;w.phase='reward';w.rewardRound='random';beginExpeditionWindow(w.expedition,stage);};
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('nine lines expose shared family unlocks and exactly six research levels',()=>{
 for(const [key,line] of Object.entries(PRODUCTION_LINES)){const id=key as ProductionLineId,w=make(line.race);window(w);w.expedition.facilities.push({id:99,kind:line.race==='zerg'?'hatchery':key,line:id,techLab:false});
  const before=expeditionDevelopmentActions(draftContext(w));for(const f of line.families)if(!w.expedition.tech[familyUnlock(f)]){const a=before.find(a=>a.definition.id===familyUnlock(f));assert.ok(a,f);assert.deepEqual({minerals:a.definition.minerals,gas:a.definition.gas},seatRecipe(f));}
  w.expedition.tech[lineSystem(id)]=1;for(const kind of ['weapon','defense'] as const){const def=DEVELOPMENT.find(d=>d.id===lineResearch(id,kind))!;assert.equal(def.maxLevel,3);for(let lv=0;lv<3;lv++){w.expedition.tech[def.id]=lv;assert.ok(expeditionDevelopmentActions(draftContext(w)).some(a=>a.definition.id===def.id));}w.expedition.tech[def.id]=3;assert.ok(!expeditionDevelopmentActions(draftContext(w)).some(a=>a.definition.id===def.id));}
 }
});
test('future facilities share unlocked recipes without a local laboratory',()=>{const w=make();w.expedition.tech[familyUnlock('marauder')]=1;assert.ok(w.isFamilyAvailable('marauder'));w.expedition.facilities.push({id:9,kind:'barracks',line:'barracks',techLab:false});assert.ok(w.isFamilyAvailable('marauder'));assert.ok(!w.isFamilyAvailable('reaper'));});
test('team cards add within their group, retain wounds and refresh idempotently',()=>{const w=make(),u=w.allies()[0],base={hp:u.maxHp,damage:u.weaponDamage,period:u.attackPeriod};u.hp-=10;w.expedition.cardTotals[teamCardKey('firepower','white')]=3;w.expedition.cardTotals[teamCardKey('firepower','orange')]=1;w.expedition.cardTotals[teamCardKey('defense','blue')]=2;w.refreshStats(u);near(u.weaponDamage,base.damage*1.25);near(u.attackPeriod,base.period/1.14);near(u.maxHp,base.hp*1.2);near(u.maxHp-u.hp,10);for(let i=0;i<5;i++)w.refreshStats(u);near(u.weaponDamage,base.damage*1.25);assert.equal(teamCardEffects(w.expedition).armor,.6);});
test('two-seat training rejects an incomplete quote and upgrades both twins once',()=>{const w=make('zerg');assert.equal(trainingTargets(w,3),null);w.addFamilyMember('zergling',{x:4,z:0});const quote=trainingTargets(w,3)!;assert.equal(quote.targets.length,2);assert.equal(quote.minerals,seatRecipe('zergling').minerals*4);assert.ok(applyTrainingTargets(w,3,quote.targets));assert.ok(w.familyBodies('zergling').every(u=>u.rank===3));assert.equal(applyTrainingTargets(w,3,quote.targets),false);});
test('direct locked-family cards do not unlock production and pair cards reserve full quantity',()=>{const w=make();w.expedition.tech[lineResearch('barracks','weapon')]=2;assert.ok(canSupply(w,'reaper',2,'direct'));assert.ok(applySupply(w,'reaper',2,'direct',{minerals:0,gas:0}));assert.equal(w.familyUnits('reaper').length,2);assert.equal(w.isFamilyAvailable('reaper'),false);const z=make('zerg');assert.ok(applySupply(z,'zergling',3,'pod',{minerals:151,gas:1}));const j=z.expedition.ledger[0];assert.equal(j.passengers.length,6);assert.equal(j.passengers.reduce((n,p)=>n+p.paid.minerals,0),151);assert.equal(canSupply(z,'zergling',1,'pod'),true);assert.ok(applySupply(z,'zergling',1,'pod',{minerals:50,gas:0}));assert.equal(canSupply(z,'zergling',1,'pod'),false);});
test('strategic support is manual, atomic, no friendly damage, and resumes in flight once',()=>{const w=make(),u=w.allies()[0],e=w.addUnit('roach','zerg',2,0);e.hp=e.maxHp=10000;e.armor=0;buySupport(w,'strategic');const hp=u.hp;assert.equal(commitStrategic(w,{x:999,z:0}),false);assert.equal(w.expedition.support.ammo,1);assert.ok(commitStrategic(w,{x:2,z:0}));assert.equal(commitStrategic(w,{x:2,z:0}),false);const other=make();other.restoreRun(w.captureRun());other.paused=false;other.time=3;tickShopSupport(other);near(other.entities.get(e.id)!.hp,7000);tickShopSupport(other);near(other.entities.get(e.id)!.hp,7000);near(other.entities.get(u.id)!.hp,hp);});
test('bombardment waits for visibility and burning maintains three independent layers',()=>{const w=make(),u=w.allies()[0],e=w.addUnit('roach','zerg',2,0);e.hp=e.maxHp=10000;buySupport(w,'bombardment');e.cloaked=true;w.time=21;tickShopSupport(w);assert.equal(w.expedition.support.impacts.length,0);e.cloaked=false;tickShopSupport(w);assert.equal(w.expedition.support.impacts.length,1);buySupport(w,'mutation');for(let i=0;i<4;i++)recordMutation(w,u,e,100);assert.equal(w.expedition.support.burns.length,3);assert.ok(w.expedition.support.burns.every(b=>b.damage===10));});
test('three races keep original talent allocations with approved increased effects',()=>{for(const [race,prefix] of [['terran','T'],['zerg','Z'],['protoss','P']] as const){const e=aggregateMvpTalentEffects({[prefix+'-S01']:3,[prefix+'-S05']:3,[prefix+'-M02']:3},race,{team:'player',race,kind:'ordinary',familyId:race==='terran'?'marine':race==='zerg'?'zergling':'zealot',attributes:['Biological']});near(e.weaponDamagePct!,.225);near(e.critChance!,.225);near(e.rangePct!,.15);}});
test('direct reinforcements at five families cancel without payment and commit after paused restore only once',()=>{
 const w=make();window(w);w.expedition.familySlots=['marine','marauder','hellion','tank','medivac'];w.expedition.tech[lineResearch('barracks','weapon')]=2;
 const template=drawExpeditionReinforcements(draftContext(w),true)[0];
 const r:ExpeditionReward={...template,offerId:'direct-test',sold:false,minerals:123,gas:17,expeditionEffect:{kind:'supply',family:'reaper',count:2,mode:'direct'}};w.rewards=[r];const wallet={...w.wallet};
 assert.ok(w.choose(r.offerId));assert.deepEqual(w.wallet,wallet);assert.ok(w.cancelShopSupply());assert.deepEqual(w.wallet,wallet);assert.equal(w.familyUnits('reaper').length,0);
 assert.ok(w.choose(r.offerId));const loaded=make();loaded.restoreRun(w.captureRun());assert.ok(loaded.confirmShopSupply('marine'));assert.equal(loaded.familyUnits('reaper').length,2);assert.equal(loaded.expedition.familySlots.includes('marine'),false);assert.equal(loaded.isFamilyAvailable('reaper'),false);assert.equal(loaded.wallet.minerals,wallet.minerals-123);assert.equal(loaded.confirmShopSupply('marine'),false);
});
test('orange paired elite becomes V on both bodies with one paid receipt',()=>{
 const w=make('zerg');window(w);const e=Object.values(ELITES).find(e=>e.family==='zergling')!;
 const r:ExpeditionReward={...drawExpeditionReinforcements(draftContext(w),true)[0],offerId:'elite-v-test',kind:'elite',sold:false,minerals:300,gas:0,expeditionEffect:{kind:'elite',eliteId:e.id,family:'zergling',targetRank:5}};w.rewards=[r];
 assert.ok(w.choose(r.offerId,e.id));assert.equal(w.familyBodies('zergling').filter(u=>u.eliteId===e.id&&u.rank===5).length,2);assert.equal(w.choose(r.offerId,e.id),false);
});
test('team health and firepower reach hero and children once, never enemy bodies',()=>{
 const w=make('protoss'),carrier=w.addUnit('carrier','terran',3,0),enemy=w.addUnit('roach','zerg',10,0);w.acquireHero('purifier_flagship');initializeCarrierSubsystem(w);const child=ownedInterceptors(w,carrier.id)[0],hero=w.heroEntity('purifier_flagship')!;
 const base={childHp:child.maxHp,childDamage:child.weaponDamage,heroHp:hero.maxHp,enemyHp:enemy.maxHp};w.expedition.cardTotals[teamCardKey('firepower','blue')]=1;w.expedition.cardTotals[teamCardKey('defense','blue')]=1;for(const u of w.entities.values())w.refreshStats(u);for(const u of w.entities.values())w.refreshStats(u);
 near(child.maxHp,base.childHp*1.35/1.25);near(child.weaponDamage,base.childDamage*1.38/1.3);near(hero.maxHp,base.heroHp*1.35/1.25);near(enemy.maxHp,base.enemyHp);
});
test('mines deploy on next stage, persist without duplication, then are reclaimed',()=>{
 const w=make();tickShopSupport(w);buySupport(w,'mines');tickShopSupport(w);assert.equal(w.expedition.support.mines.length,0);w.stage++;tickShopSupport(w);assert.equal(w.expedition.support.mines.length,6);const ids=w.expedition.support.mines.map(m=>m.id);const loaded=make();loaded.restoreRun(w.captureRun());loaded.paused=false;tickShopSupport(loaded);assert.deepEqual(loaded.expedition.support.mines.map(m=>m.id),ids);loaded.stage++;tickShopSupport(loaded);assert.equal(loaded.expedition.support.mines.length,6);assert.ok(loaded.expedition.support.mines.every(m=>!ids.includes(m.id)));
});

test('air reinforcements cannot bypass the open chapter boundary',()=>{const w=make();w.expedition.facilities.push({id:99,kind:'starport',line:'starport',techLab:false});w.freePosition=()=>({x:99,z:99});w.terrain={isOpen:()=>false,canOccupy:()=>true} as unknown as NonNullable<World['terrain']>;const wallet={...w.wallet};assert.equal(canSupply(w,'medivac',1,'direct'),false);assert.equal(applySupply(w,'medivac',1,'direct',{minerals:100,gas:100}),false);assert.deepEqual(w.wallet,wallet);});
