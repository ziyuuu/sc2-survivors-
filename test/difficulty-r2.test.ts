import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {campaign18StageConfig,campaign18Schedule,CAMPAIGN18_STAGES,CAMPAIGN18_ENEMIES} from '../src/data/campaign18';
import {mixCampaignWaves,ambientResources,baselineCampaignResources} from '../src/data/mixed-waves';
import {campaignProgress,continuousLingHp,continuousEndlessGrowth,type EnemySpawnStamp} from '../src/data/enemy-tuning';
import {endlessWaveTemplate,endlessEconomicEvents,endlessInterval,baselineEndlessResources} from '../src/data/endless';
import {SC2_UNITS,BILE} from '../src/data/sc2-units';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {expeditionWeaponBonuses} from '../src/simulation/combat/expedition-combat';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {ATTRIBUTE_SLOTS,type EquipmentSlot,type EquipmentBinding} from '../src/simulation/starship/types';
import {activeEquipmentEffects} from '../src/simulation/starship/modules';
import {equipmentEnemyDied} from '../src/simulation/starship/growth';
import {dropEnemyEquipment} from '../src/simulation/starship/drops';
import {zergState} from '../src/simulation/combat/zerg-hero-passives';
import {protossState} from '../src/simulation/combat/protoss-hero-passives';
import {incomeFactor} from '../src/data/stages';
import {ECONOMY} from '../src/data/economy';
const difficulties=['easy','normal','hard','hell'] as const;
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<=Math.max(1,Math.abs(b))*1e-9,`${a} != ${b}`);
const stats=(u:ReturnType<World['addUnit']>)=>[u.maxHp,u.weaponDamage,u.armor,u.attackPeriod,u.moveSpeed,u.attackRange];
const world=(difficulty:typeof difficulties[number]='normal')=>{const w=new World({waves:false,terrain:false,obstacles:[],difficulty});assert.ok(w.start());return w;};
const stamp=(p:number,density:1|.3|.5=1,endlessSeconds?:number):EnemySpawnStamp=>({stage:Math.min(18,1+Math.floor(p*18)),progress:p,density,...endlessSeconds===undefined?{}:{endlessSeconds}});

for(const [di,difficulty] of difficulties.entries())test(`R2 ${difficulty}: 54 seeded campaign plans conserve exact ratios, introductions, economy and source budgets`,()=>{
 for(const seed of [41,529,20261016]){
  let main=0,weak30=0,weak50=0,bosses=0;
  for(let stage=1;stage<=18;stage++){
   const config=campaign18StageConfig(stage,difficulty),plan=campaign18Schedule(config,seed),waves=mixCampaignWaves(plan.waves,stage,difficulty,seed),unlocked=new Set(CAMPAIGN18_ENEMIES.filter(type=>CAMPAIGN18_STAGES.findIndex(s=>s.mix[type]>0)+1<stage)),revenue={minerals:0,gas:0};
   for(const wave of waves){wave.types.forEach(t=>unlocked.add(t));const members=wave.members!;assert.equal(members.filter(m=>m.stamp.density===1).length,wave.types.length);
    for(const m of members){assert.ok(unlocked.has(m.type),`${stage}/${wave.at}: ${m.type} introduced early`);assert.ok(wave.at+m.offset<config.durationSeconds);assert.equal(m.stamp.endlessSeconds,undefined);near(m.stamp.progress,campaignProgress(stage,wave.at+m.offset,config.durationSeconds));const d=m.stamp.density;if(d===1)main++;else if(d===.3)weak30++;else weak50++;assert.ok(members.some(a=>a.stamp.density===1&&a.lane===m.lane&&a.offset===m.offset));const [min,gas]=ambientResources(m.type);revenue.minerals+=min*m.resources.minerals;revenue.gas+=gas*m.resources.gas;}
   }
   near(revenue.minerals,baselineCampaignResources(stage,difficulty).minerals);near(revenue.gas,baselineCampaignResources(stage,difficulty).gas);
   assert.equal(weak30,main);assert.equal(weak50,Math.floor(main/4));bosses+=plan.specials.filter(s=>s.tier==='boss').length;
   const a=plan.accounting;assert.equal(a.budget,a.waves+a.specials+a.mainHive+a.expansionHive+a.withheld+a.unspent);
  }
  assert.equal(main,[1347,2744,4251,5022][di]);assert.equal(bosses,6);
 }
});

for(const difficulty of difficulties)test(`R2 ${difficulty}: all primary species preserve density through real refresh; only HP, damage, armor change`,()=>{
 const w=world(difficulty);
 for(const p of [0,2.5/18,6/18,8/18,12/18,17.5/18,1])for(const type of CAMPAIGN18_ENEMIES){
  const main=w.addUnit(type,'zerg',20,20,1,'regular',stamp(p).stage,stamp(p));
  for(const d of [.3,.5] as const){const u=w.addUnit(type,'zerg',21,20,1,'regular',stamp(p).stage,stamp(p,d));for(const key of ['maxHp','weaponDamage','armor'] as const)near(u[key],main[key]*d);for(const key of ['attackPeriod','moveSpeed','attackRange','unitRadius'] as const)near(u[key],main[key]);u.hp*=.6;const before=[u.hp,...stats(u)];w.stage=18;w.refreshStats(u);[u.hp,...stats(u)].forEach((v,i)=>near(v,before[i]));}
  w.entities.clear();
 }
});

for(const difficulty of ['normal','hard','hell'] as const)test(`R2 ${difficulty}: real constructors are continuous at all 17 campaign boundaries and the endless entry`,()=>{
 const w=world(difficulty);let previous:number[]|undefined;
 for(let sample=0;sample<=180;sample++){const p=sample/180,u=w.addUnit('zergling','zerg',20,20,1,'regular',stamp(p).stage,stamp(p));if(previous){assert.ok(u.maxHp>=previous[0]);assert.ok(u.weaponDamage>=previous[1]);assert.ok(u.attackPeriod<=previous[3]+1e-10);}previous=stats(u);w.entities.clear();}
 for(let stage=1;stage<18;stage++)for(const type of CAMPAIGN18_ENEMIES){const left=w.addUnit(type,'zerg',20,20,1,'regular',stage,{stage,progress:campaignProgress(stage,1,1),density:1}),right=w.addUnit(type,'zerg',20,20,1,'regular',stage+1,{stage:stage+1,progress:campaignProgress(stage+1,0,1),density:1});stats(left).forEach((v,i)=>near(v,stats(right)[i]));w.entities.clear();}
 for(const type of CAMPAIGN18_ENEMIES){const a=w.addUnit(type,'zerg',20,20,1,'regular',18,stamp(1)),b=w.addUnit(type,'zerg',20,20,1,'regular',18,stamp(1,1,0));stats(a).forEach((v,i)=>near(v,stats(b)[i]));}
 const first=w.addUnit('zergling','zerg',20,20,1,'regular',1,stamp(0));near(first.maxHp,difficulty==='normal'?6.93:difficulty==='hard'?36:72);
});

test('R2 mixed-wave admission retains scheduled stats, ratio, rewards and a common approach across a full queue and stage change',()=>{
 const w=world('hard'),a=w as any;w.stage=6;w.prepareStage();const wave=a.waves.find((v:any)=>v.types.length>=4);a.stageWave=a.waves.indexOf(wave);w.time=wave.at;w.stageElapsed=wave.at;
 for(let n=0;n<300;n++)w.addUnit('zergling','zerg',20,20);w.spawnWave();assert.equal(w.enemyCount(),300);const pending=structuredClone(a.ambientBacklog);assert.equal(pending.length,wave.members.length);assert.equal(w.swarm.planned,0);
 w.entities.clear();w.stage=13;w.time=100;w.stageElapsed=0;a.releaseAmbient();const units=[...w.entities.values()];assert.equal(units.length,pending.length);
 units.forEach((u,i)=>{assert.deepEqual(u.enemySpawn,pending[i].stamp);assert.deepEqual(u.enemyResources,pending[i].resources);const ref=w.addUnit(u.unitType,'zerg',20,20,1,'regular',pending[i].stamp.stage,pending[i].stamp);stats(u).forEach((v,j)=>near(v,stats(ref)[j]));w.entities.delete(ref.id);});
 for(let i=0;i+1<units.length;i++)if(pending[i].lane===pending[i+1].lane)assert.ok(Math.hypot(units[i].x-units[i+1].x,units[i].z-units[i+1].z)<4);
});

test('R2 current snapshot preserves mixed queue metadata without recalculating growth',()=>{
 const w=new World({terrain:new FlatTerrain(),waves:false,difficulty:'hell'});w.start();w.stage=9;w.prepareStage();w.time=100;w.spawnWave();const snapshot=w.captureRun(),copy=new World({terrain:new FlatTerrain(),waves:false});copy.restoreRun(snapshot);assert.deepEqual((copy as any).ambientBacklog,(w as any).ambientBacklog);for(const [id,u] of w.entities)assert.deepEqual(copy.entities.get(id)?.enemySpawn,u.enemySpawn);
});

test('R2 native damage paths include weak baneling bonus and delayed ravager bile exactly once',()=>{
 const w=world('hell');w.entities.clear();const main=w.addUnit('baneling','zerg',0,0,1,'regular',18,stamp(1)),weak=w.addUnit('baneling','zerg',0,0,1,'regular',18,stamp(1,.3));const a=expeditionWeaponBonuses(w,main),b=expeditionWeaponBonuses(w,weak);a.bonuses.forEach((v,i)=>near(b.bonuses[i].amount,v.amount*.3));
 w.entities.clear();const target=w.addUnit('marine','terran',0,5);target.hp=target.maxHp=1e6;target.armor=0;
 const r=w.addUnit('ravager','zerg',0,0,1,'regular',18,stamp(1,.3));r.bileCooldown=0;w.updateBile(r,1/60);const fx=w.effects.find(e=>e.kind==='bile')!;assert.ok(fx);near(fx.damage!,BILE.damage*r.weaponDamage/SC2_UNITS.ravager.attackDamage);const fixed=fx.damage;w.stage=1;w.entities.delete(r.id);assert.equal(fx.damage,fixed);
});

test('R2 primary and weak ordinary weapons deliver their ratio through actual hits and flights',()=>{
 for(const type of ['zergling','roach','baneling','hydralisk','ravager'] as const){const damages=[];
  for(const density of [1,.3,.5] as const){const w=world('hell');w.entities.clear();const target=w.addUnit('marine','terran',0,1),u=w.addUnit(type,'zerg',0,0,1,'regular',18,stamp(1,density));target.hp=target.maxHp=1e6;target.armor=0;u.shotInterval=u.attackPeriod;w.hash.rebuild(w.entities.values());w.fire(u,target);for(let i=0;i<120;i++){w.time+=1/60;tickWeaponFlights(w,1/60);}damages.push(target.maxHp-target.hp);}
  assert.ok(damages[0]>0,type);near(damages[1],damages[0]*.3);near(damages[2],damages[0]*.5);
 }
});

test('R2 actual mixed kills preserve the original mineral/gas budget and only primary bodies enter drop-card checks',()=>{
 for(const difficulty of difficulties){const w=world(difficulty);w.entities.clear();w.pickups=[];const stage=9,config=campaign18StageConfig(stage,difficulty),waves=mixCampaignWaves(campaign18Schedule(config,529).waves,stage,difficulty,529),members=waves.flatMap(w=>w.members!);w.stage=stage;
  const attempts=w.expedition.mapLootStats.regular.attempts;
  for(const m of members){const u=w.addUnit(m.type,'zerg',20,20,1,'regular',stage,m.stamp);u.enemyResources=m.resources;w.hit(u,1e9,[],1,'terran');w.entities.delete(u.id);}
  const expected=baselineCampaignResources(stage,difficulty),factor=incomeFactor(difficulty)*ECONOMY.dropMultiplier;near(w.pickups.reduce((n,p)=>n+p.minerals,0),expected.minerals*factor);near(w.pickups.reduce((n,p)=>n+p.gas,0),expected.gas*factor);assert.equal(w.stats.kills,members.length);assert.equal(w.expedition.mapLootStats.regular.attempts-attempts,members.filter(m=>m.stamp.density===1).length);
 }
});

function putRewardGear(w:World,template:string,slot:EquipmentSlot,binding?:EquipmentBinding){const a=w.starship.account,r=grantEquipment(a,{template,race:w.selectedRace,slot,binding,polluted:EQUIPMENT_TEMPLATES[template].pollution==='required'},'r2-reward:'+a.serial,{kind:'warehouse'});assert.ok(r.ok);if(r.value.pollution==='uncleansed'){a.dust=10000;assert.ok(cleanseEquipment(a,r.value.id).ok);}assert.ok(w.equipItem(r.value.id,slot).ok);}
test('R2 weak kills bypass gear, cards, talent promotions and kill growth without spending reward RNG or receipts',()=>{
 const w=new World({seed:529,waves:false,sandbox:true,terrain:false,equipmentAccount:newEquipmentAccount(529)});
 for(const slot of ATTRIBUTE_SLOTS.slice(0,6))putRewardGear(w,'set.orange.soldier.5',slot,{direction:'barracks'});putRewardGear(w,'module.devour.5','gathering');w.start();const source=w.allies()[0];
 const a=w as any,calls={cards:0,qualify:0,talents:0},cards=w.tryRewardDrop.bind(w),qualified=a.qualifiedKill.bind(w),talents=a.issueTalentLoot.bind(w);
 w.tryRewardDrop=(...args)=>{calls.cards++;return cards(...args);};a.qualifiedKill=(...args:any[])=>{calls.qualify++;return qualified(...args);};a.issueTalentLoot=(...args:any[])=>{calls.talents++;return talents(...args);};
 const rewardState=()=>({worldRng:w.rngState,gearRng:w.starship.account.rng,talentRng:w.expedition.talentLootRngState,receipts:[...w.starship.account.run!.receipts],items:structuredClone(w.starship.account.items),numbers:[...w.starship.numbers],rank:source.rank,cards:w.rewardDrops.length,free:w.expedition.pendingFreeDeliveries.length});
 // Ordinary damage bookkeeping is independent of kill rewards and remains active.
 const survivor=w.addUnit('roach','zerg',20,20);w.hit(survivor,1,[],1,'terran',0,1,source.id);
 const before=rewardState(),kills=w.stats.kills;
 for(const type of ['zergling','roach','baneling'] as const)for(const density of [.3,.5] as const){const u=w.addUnit(type,'zerg',2,2,1,'regular',9,{stage:9,progress:.5,density}),n=w.pickups.length;w.hit(u,1e9,[],1,'terran',0,1,source.id);assert.equal(w.pickups.length,n+1);const packet=w.pickups.at(-1)!,base=ambientResources(type),factor=incomeFactor(w.difficulty)*ECONOMY.dropMultiplier;near(packet.minerals,base[0]*density*factor);near(packet.gas,base[1]*density*factor);assert.deepEqual(dropEnemyEquipment(w,u),[]);equipmentEnemyDied(w,u,source.id);w.hit(u,1e9,[],1,'terran',0,1,source.id);assert.equal(w.pickups.length,n+1);}
 assert.deepEqual(rewardState(),before);assert.deepEqual(calls,{cards:0,qualify:0,talents:0});assert.equal(w.stats.kills-kills,6);
 const main=w.addUnit('zergling','zerg',2,2,1,'regular',9,stamp(.5));w.hit(main,1e9,[],1,'terran',0,1,source.id);assert.deepEqual(calls,{cards:1,qualify:1,talents:1});assert.equal(w.starship.numbers.get('devour-progress'),1);assert.ok(w.starship.account.run!.receipts.size>before.receipts.length);
});

test('R2 weak kills do not progress equipped hero ranks while primary kills still do',()=>{
 const w=new World({seed:529,waves:false,sandbox:true,terrain:false,equipmentAccount:newEquipmentAccount(529)});for(const slot of ATTRIBUTE_SLOTS.slice(0,6))putRewardGear(w,'set.orange.hero.5',slot,{hero:'raynor'});w.start();const hero=w.heroEntity('raynor')!,source=w.allies().find(u=>!u.heroId)!,effect=activeEquipmentEffects(w).find(e=>e.key==='hero_growth')!,rank=hero.rank;
 for(const density of [.3,.5] as const){const e=w.addUnit('zergling','zerg',2,2,1,'regular',1,stamp(0,density));w.hit(e,1e9,[],1,'terran',0,1,source.id);}assert.equal(hero.rank,rank);assert.equal(w.starship.numbers.get(effect.source+':hero-points')??0,0);
 const e=w.addUnit('zergling','zerg',2,2,1,'regular',1,stamp(0));w.hit(e,1e9,[],1,'terran',0,1,source.id);assert.equal(w.starship.numbers.get(effect.source+':hero-points'),1);
});

test('R2 weak deaths skip innate kill growth but retain marked death combat and cleanup',()=>{
 for(const id of ['alarak','dehaka','zagara'] as const){const w=new World({seed:529,race:id==='alarak'?'protoss':'zerg',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();assert.ok(w.acquireHero(id));const hero=w.heroEntity(id)!;hero.x=hero.z=0;
  const counter=()=>id==='alarak'?protossState(hero).power:id==='dehaka'?zergState(hero).essence:zergState(hero).kills;
  for(const density of [.3,.5] as const){const e=w.addUnit('zergling','zerg',1,1,1,'regular',1,stamp(0,density));w.hit(e,1e9,[],1,'terran',0,1,hero.id);}assert.equal(counter(),0,id);
  const e=w.addUnit('zergling','zerg',1,1,1,'regular',1,stamp(0));w.hit(e,1e9,[],1,'terran',0,1,hero.id);assert.ok(counter()>0,id);
 }
 const w=new World({race:'zerg',seed:529,waves:false,sandbox:true,terrain:false});w.start();const s=w.expedition.support.unique;s.levels['zerg.hatch']=1;s.levels['zerg.consume']=1;const e=w.addUnit('roach','zerg',w.anchor.x+1,w.anchor.z,1,'regular',1,stamp(0,.3)),nearby=w.addUnit('roach','zerg',e.x+1,e.z);nearby.hp=nearby.maxHp=1000;s.parasites[e.id]={damage:100,until:w.time+4};w.hash.rebuild(w.entities.values());w.hit(e,1e9,[],1,'terran');assert.ok(nearby.hp<1000);assert.equal(s.parasites[e.id],undefined);assert.equal(s.kills,0);assert.equal(s.orbs.length,0);
});

test('R2 capturing a weak baneling preserves its actual base and bonus damage across refresh',()=>{
 const w=new World({seed:529,waves:false,sandbox:true,terrain:false,difficulty:'hell',equipmentAccount:newEquipmentAccount(529)});
 for(const slot of ['defense1','defense2','defense3','defense4'] as const){const r=grantEquipment(w.starship.account,{template:'set.advanced.pack.4',race:'terran',slot},slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
 w.start();const shooter=w.allies()[0],weak=w.addUnit('baneling','zerg',0,2,1,'regular',18,stamp(1,.3)),native=stats(weak),bonuses=expeditionWeaponBonuses(w,weak);weak.hp=weak.maxHp*.29;const money={...w.wallet},kills=w.stats.kills;
 w.starship.account.rng=1;shooter.shotInterval=shooter.attackPeriod;w.fire(shooter,weak);assert.equal(weak.owner,'terran');assert.deepEqual(w.wallet,money);assert.equal(w.stats.kills,kills);const ratio=weak.hp/weak.maxHp;
 for(let i=0;i<10;i++)w.refreshStats(weak);near(weak.hp/weak.maxHp,ratio);near(weak.weaponDamage,native[1]);const now=expeditionWeaponBonuses(w,weak);bonuses.bonuses.forEach((b,i)=>near(now.bonuses[i].amount,b.amount));assert.equal(weak.enemySpawn?.density,.3);
});

for(const difficulty of difficulties)test(`R2 ${difficulty}: endless has four mixed waves, bounded cadence, continuous growth and preserved ordinary resource budget`,()=>{
 for(const round of [1,2,3,5,6,12,24,30,1000]){const waves=endlessWaveTemplate(41,round,difficulty);assert.deepEqual(waves.map(w=>w.at),[0,15,30,45]);const resources={minerals:0,gas:0};for(const wave of waves)for(const m of wave.members!){assert.equal(m.stamp.progress,1);near(m.stamp.endlessSeconds!,(round-1)*60+wave.at+m.offset);const [a,b]=ambientResources(m.type);resources.minerals+=a*m.resources.minerals;resources.gas+=b*m.resources.gas;}near(resources.minerals,baselineEndlessResources(difficulty).minerals);near(resources.gas,baselineEndlessResources(difficulty).gas);}
 assert.equal(Array.from({length:4},(_,i)=>endlessEconomicEvents(41,i+1)).flat().length,6);near(endlessInterval('elite',300),25);near(endlessInterval('boss',18000),75);
 const w=world(difficulty);for(const type of ['zergling','roach','baneling'] as const){const a=w.addUnit(type,'zerg',20,20,1,'regular',18,stamp(1,1,0)),b=w.addUnit(type,'zerg',20,20,1,'regular',18,stamp(1,1,300)),g=continuousEndlessGrowth(300);near(b.maxHp/a.maxHp,g.health);near(b.weaponDamage/a.weaponDamage,g.damage);near(a.attackPeriod/b.attackPeriod,g.attackSpeed);}
});

test('R2 every special template joins the campaign continuously and ignores birth counters and previous maxima',()=>{
 const types=['zergling','roach','hydralisk','ravager','queen','lurker','mutalisk','corruptor','ultralisk'] as const;
 for(const difficulty of difficulties){const w=world(difficulty);w.stage=18;for(const tier of ['elite','boss','lord'] as const)for(const type of types){const a=w.spawnSpecial(type,tier,{x:20,z:20},stamp(1))!;w.entities.clear();w.endless={round:1,startedAt:0,elites:100,bosses:100,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{elite:{health:1e50,damage:1e50,period:1/60},boss:{health:1e50,damage:1e50,period:1/60}}};const b=w.spawnSpecial(type,tier,{x:20,z:20},stamp(1,1,0))!;stats(a).forEach((v,i)=>near(v,stats(b)[i]));w.entities.clear();const c=w.spawnSpecial(type,tier,{x:20,z:20},stamp(1,1,300))!;near(c.maxHp/b.maxHp,1.22**5);near(c.weaponDamage/b.weaponDamage,1.1**5);const before=stats(c);w.refreshStats(c);stats(c).forEach((v,i)=>near(v,before[i]));w.entities.clear();w.endless=null;}}
});

test('R2 failed endless admission retains one original due-time template; pauses and shop do not advance it',()=>{
 const w=new World({waves:false,terrain:new FlatTerrain(),difficulty:'hard'});w.start();w.stage=18;w.endless={round:1,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};
 for(let n=0;n<300;n++)w.addUnit('zergling','zerg',20,20);w.time=31;(w as any).updateEndlessSpawns(31);const due=structuredClone(w.endless.pending!.elite);assert.ok(due);assert.ok(due!.endlessSeconds!<30);w.time=180;(w as any).updateEndlessSpawns(149);assert.deepEqual(w.endless.pending!.elite,due);assert.equal(w.endless.elites,0);
 const before=JSON.stringify(w.endless);w.paused=true;w.step();assert.equal(JSON.stringify(w.endless),before);w.paused=false;w.phase='reward';w.step();assert.equal(JSON.stringify(w.endless),before);w.phase='battle';w.entities.clear();w.time=181;(w as any).updateEndlessSpawns(1);const elite=[...w.entities.values()].find(e=>e.enemyTier==='elite')!;assert.deepEqual(elite.enemySpawn,due);assert.equal(w.endless.elites,1);assert.equal(w.endless.pending!.elite,undefined);
});
