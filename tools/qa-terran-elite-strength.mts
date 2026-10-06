import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {HEROES,type HeroId} from '../src/data/heroes';import {TERRAN_HERO_IDS} from '../src/data/terran-heroes';import {ELITES} from '../src/data/elites';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {familyRace} from '../src/data/races';
import {TERRAN_ELITE_IDS,type TerranEliteId} from '../src/data/terran-elites';
import {eliteCombat,eliteMainFactor,terranMedical} from '../src/simulation/combat/terran-elite-runtime';
import {unitData,expeditionWeaponBonuses,selectWeapon} from '../src/simulation/combat/expedition-combat';
import {terranHeroGrowth} from '../src/data/terran-heroes';
import {tickTerranHero} from '../src/simulation/combat/terran-hero-passives';
import type {BattleView} from '../src/simulation/combat/battle-view';
const bounds:BattleView={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};
function setup(id:HeroId,rank:number){const w=new World({race:'terran',seed:10505,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();for(const plan of Object.values(w.expedition.production))plan.enabled={};w.acquireHero(id);const u=w.heroEntity(id)!;u.rank=rank;w.heroes.get(id)!.rank=rank;u.x=u.z=0;u.prev={x:0,z:0};return {w,u,record:w.heroes.get(id)!};}
const rows=[];
for(const id of TERRAN_HERO_IDS)for(let rank=1;rank<=5;rank++){
 const {w,u,record}=setup(id,rank);w.heroes.clear();w.refreshStats(u,true);const target=w.addUnit('roach','zerg',3,0);target.enemyTier='boss';target.hp=target.maxHp=1e9;target.armor=0;target.stoppedUntil=1e9;target.moveSpeed=0;w.hash.rebuild(w.entities.values());
 // Registry isolation disables both old and new auras while retaining the actual body/passive and World.step.
 for(let i=0;i<3600;i++){if(id!=='swann'&&w.time>=record.skillReady){w.heroes.set(id,record);w.castHero(id,id==='tosh'?bounds:undefined);w.heroes.clear();}w.step();}
 rows.push({id,rank,baseDamage:u.weaponDamage,basePeriod:u.attackPeriod,health:u.maxHp,shield:u.maxShield,armor:u.armor,damage:w.stats.damage,dps:w.stats.damage/60,shots:w.stats.shots,aurasExcluded:true});
}
const bosses=[];
for(const mode of ['stage12','endless3'] as const){const rank=mode==='stage12'?1:5,{w,u,record}=setup('yamato_battlecruiser',rank);w.difficulty='easy';w.stage=mode==='stage12'?12:18;let target;
 if(mode==='endless3'){w.endless={round:3,startedAt:w.time,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:1e9,boss:1e9},last:{}};const first=w.spawnSpecial('queen','boss',{x:12,z:0})!;w.entities.delete(first.id);target=w.spawnSpecial('lurker','boss',{x:5,z:0})!;w.castDetection();}else target=w.spawnSpecial('ravager','boss',{x:5,z:0})!;
 const hp=target.hp;w.hash.rebuild(w.entities.values());assert.equal(Math.round(hp),mode==='stage12'?9000:23520);assert.ok(w.castHero('yamato_battlecruiser'));const cast=w.heroCasts[0];w.heroes.clear();w.time=cast.at;resolveExpeditionHeroCasts(w);assert.equal(target.hp,0);bosses.push({mode,rank,body:target.unitType,hp,armor:target.armor,packet:cast.damage,at:cast.at,shots:w.stats.shots,remaining:target.hp,aurasExcluded:true});
}
const bossAoe=[];
for(const id of ['raynor','tychus','nova','tosh'] as const)for(const rank of [1,5]){
 const {w,u}=setup(id,rank);w.difficulty='easy';w.stage=rank===1?12:18;let target;
 if(rank===5){w.endless={round:3,startedAt:w.time,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:1e9,boss:1e9},last:{}};const first=w.spawnSpecial('queen','boss',{x:12,z:0})!;w.entities.delete(first.id);target=w.spawnSpecial('lurker','boss',{x:5,z:0})!;w.castDetection();}else target=w.spawnSpecial('ravager','boss',{x:5,z:0})!;
 const hp=target.hp;w.hash.rebuild(w.entities.values());assert.ok(w.castHero(id,id==='tosh'?bounds:undefined));w.heroes.clear();
 // Isolate the actual skill resolver at fixed 60 Hz without any basic shots or aura benefit.
 for(let tick=0;tick<240;tick++){w.time+=1/60;resolveExpeditionHeroCasts(w);}
 const damage=hp-target.hp;assert.ok(damage>=hp*.5,JSON.stringify({id,rank,hp,damage}));assert.equal(w.stats.shots,0);bossAoe.push({id,rank,hp,armor:target.armor,damage,fraction:damage/hp,shots:0,aurasExcluded:true});
}

// Actual configured elite-V profiles. Conditional peaks include native bonus packets;
// only each body's own family/medical aura is divided out of the isolated comparison.
const eliteProfiles:any[]=[];
for(const id of TERRAN_ELITE_IDS){
 const scenarios=id.startsWith('thor.')||id.startsWith('viking.')?['light','armored','air-light','air-armored']:['light','armored','boss'];
 const probes:any[]=[];let bareHp=0,heal=0;
 for(const scenario of scenarios){const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();for(const p of Object.values(w.expedition.production))p.enabled={};
 const u=w.addUnit(ELITES[id].family,'terran',0,0,5);u.eliteId=id;u.modelKey=ELITES[id].model;if(id.startsWith('tank.'))u.mode='siege';if(id==='viking.2'&&!scenario.startsWith('air'))u.nativeMode='viking_assault';
 const t=w.addUnit(scenario.startsWith('air')?'mutalisk':'roach','zerg',5,0);t.armor=0;t.attributes=scenario.includes('light')?['Light','Biological']:['Armored','Biological'];if(scenario==='boss')t.enemyTier='boss';selectWeapon(w,u,t);w.refreshStats(u,true);
 bareHp=(u.maxHp+(u.maxShield??0))/(id==='medivac.1'?1.35:id==='marine.3'?1.2:1);heal=u.healRate;
 const state=eliteCombat(u);w.time=6;state.started=1;state.lastFire=w.time;state.target=t.id;state.lockAt=1;state.boosted=id==='viking.3'?10:0;state.absorbed=id==='reaper.3'?1e15:0;w.refreshStats(u);
 const aura=id==='marine.3'?1.2:1,base=(u.weaponDamage+expeditionWeaponBonuses(w,u).bonuses.filter(b=>t.attributes.includes(b.attribute)).reduce((v,b)=>v+b.amount,0))*unitData(u).attacks/u.attackPeriod/aura**2;
 let peak=base*eliteMainFactor(u,t),add=0;
 if(id==='reaper.1')peak*=3;if(id==='reaper.2')peak*=3;if(id==='marauder.3')peak*=1.95;if(id==='thor.1'&&!t.flying)peak*=3;if(id==='viking.1'&&t.flying)peak*=2.75;
 if(id==='tank.3')peak*=1.5;if(id==='hellion.3')add=(2*1200+4*180)*2.4/12;
 if(id==='viking.2'&&!t.flying)add=1600*2.4/12;
 if(id==='banshee.2')add=23520*.05*.2; // genuine endless round-three Boss maxHP
 if(id==='banshee.3')add=2600*2.4/8;
 probes.push({scenario,base,peak:peak+add,conditionalFixedContribution:add,damage:u.weaponDamage,period:u.attackPeriod,hits:unitData(u).attacks});
 }
 eliteProfiles.push({id,bareHp:bareHp*(id==='reaper.3'?5:1),healingPerTarget:heal,healingTargets:id==='medivac.2'?5:id==='science_vessel.2'?2:id.startsWith('science_vessel.')?3:id.startsWith('medivac.')?1:0,peak:Math.max(...probes.map(r=>r.peak)),probes});
}
const spec=JSON.parse(await fs.readFile('docs/project/NEXT_ITERATION_P0_VALUES_20261003.json','utf8')).eliteHeroRedesign;
const peerHeroes=spec.heroes.filter((h:any)=>TERRAN_HERO_IDS.includes(h.id));
const durability=peerHeroes.map((h:any)=>{const peers=h.peerIds.map((id:string)=>eliteProfiles.find(r=>r.id===id)).sort((a:any,b:any)=>b.bareHp-a.bareHp),hero=rows.find(r=>r.id===h.id&&r.rank===1)!;return {id:h.id,heroI:hero.health+(hero.shield??0),eliteV:{id:peers[0].id,hp:peers[0].bareHp},ratioI:(hero.health+(hero.shield??0))/peers[0].bareHp};});
const comparators=Object.fromEntries(peerHeroes.filter((h:any)=>h.id!=='swann').map((h:any)=>[h.id,Math.max(...h.peerIds.map((id:string)=>eliteProfiles.find(r=>r.id===id).peak))]));
const medicalUpper=Math.max(...eliteProfiles.map(r=>r.healingPerTarget*r.healingTargets));
const supportWindows:any[]=[];
for(const id of [...TERRAN_ELITE_IDS.filter(id=>['medivac','science_vessel'].includes(ELITES[id].family)),'swann'] as (TerranEliteId|'swann')[]){
 const isHero=id==='swann',f=isHero?setup('swann',1):null,w=f?.w??new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[]});let u=f?.u;
 if(!f){w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.wallet.minerals=0;for(const p of Object.values(w.expedition.production))p.enabled={};u=w.addUnit(ELITES[id as TerranEliteId].family,'terran',0,0,5);u.eliteId=id as TerranEliteId;w.refreshStats(u,true);}
 w.heroes.clear();w.refreshStats(u!,true);u!.energy=u!.maxEnergy;
 for(let i=0;i<7;i++){const type=id.startsWith('medivac')?'ultralisk':'thor',q=w.freePosition(type,u!,1,7);assert.ok(q);const p=w.addUnit(type,'terran',q.x,q.z,5);p.hp=p.maxHp*.5;p.nextShotAt=p.stoppedUntil=1e9;p.lastDamagedAt=0;}
 const foe=w.addUnit('roach','zerg',25,0);foe.hp=foe.maxHp=1e9;foe.nextShotAt=foe.stoppedUntil=foe.specialReady=1e9;foe.moveSpeed=0;w.hash.rebuild(w.entities.values());
 for(let tick=0;tick<480;tick++){if(tick%60===0)for(const p of w.allies().filter(p=>p.id!==u!.id))w.hit(p,300,[],1,'zerg',0,0,foe.id);w.step();}const hp=w.stats.healed,barrier=w.p4Samples.barriers.reduce((v,b)=>v+b.amount,0);supportWindows.push({id,hp,barrier,effective:hp+barrier,energy:u!.energy,seconds:w.time,pressure:'300 native damage per permanent patient per second through World.hit'});
}
const swannWindow=supportWindows.find(r=>r.id==='swann')!,supportWindowUpper=Math.max(...supportWindows.filter(r=>r.id!=='swann').map(r=>r.effective));assert.ok(swannWindow.effective>=supportWindowUpper*1.25,JSON.stringify(supportWindows));
const repairs=[];for(const rank of [1,3,5]){const {w,u}=setup('swann',rank);w.heroes.clear();w.refreshStats(u,true);for(let i=0;i<7;i++){const a=w.addUnit('tank','terran',2+i*.3,0);a.hp=a.maxHp=1e7;a.hp-=1e6;}w.time=1;tickTerranHero(w,u,1);const v=w.stats.healed;assert.ok(v/medicalUpper>=1.25);repairs.push({rank,effectiveHpPerSecond:v,targets:u.healTargets?.length,actualVEliteSupportUpper:medicalUpper,ratioV:v/medicalUpper,aurasExcluded:true});}
const report={eliteProfiles,medicalUpper,supportWindows,supportWindowRatio:swannWindow.effective/supportWindowUpper,method:'60 seconds production World.step; 60 Hz; one stationary high-HP Boss-class diagnostic target. No talents/cards or old/new aura registry. Actual cast gateway/resolver and physical basic arrival. Elite-V conditional peak profiles use actual World stats/native bonus packets, including fixed-mine, plague Boss and out-of-combat charge upper envelopes. Elite fire or area output is a one-body role comparison, not multiplication by arbitrary enemy count. New/old hero auras and own elite auras are excluded. This is isolated budget evidence, not natural campaign/device acceptance.',rows,bosses,bossAoe,durability,repairs,comparisons:Object.entries(comparators).map(([id,v])=>({id,actualVElitePeakUpperBudget:v,heroI:rows.find(r=>r.id===id&&r.rank===1)!.dps,heroV:rows.find(r=>r.id===id&&r.rank===5)!.dps,ratioI:rows.find(r=>r.id===id&&r.rank===1)!.dps/v,ratioV:rows.find(r=>r.id===id&&r.rank===5)!.dps/v}))};

await fs.mkdir('reports/local/terran-elites-20261005',{recursive:true});await fs.writeFile('reports/local/terran-elites-20261005/strength.json',JSON.stringify(report,null,2));console.log(JSON.stringify({comparisons:report.comparisons,bosses},null,2));

assert.ok(report.comparisons.every(r=>r.ratioI>=1.25),JSON.stringify(report.comparisons));assert.ok(durability.every(r=>r.ratioI>=1.25),JSON.stringify(durability));
