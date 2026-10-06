import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';import {HEROES,type HeroId} from '../src/data/heroes';import {TERRAN_HERO_IDS} from '../src/data/terran-heroes';import {ELITES} from '../src/data/elites';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {familyRace} from '../src/data/races';
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
const comparators={raynor:1393.7872,tychus:4999.05,nova:2094.1475,tosh:875.0784,yamato_battlecruiser:4999.05};
const bossAoe=[];
for(const id of ['raynor','tychus','nova','tosh'] as const)for(const rank of [1,5]){
 const {w,u}=setup(id,rank);w.difficulty='easy';w.stage=rank===1?12:18;let target;
 if(rank===5){w.endless={round:3,startedAt:w.time,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:1e9,boss:1e9},last:{}};const first=w.spawnSpecial('queen','boss',{x:12,z:0})!;w.entities.delete(first.id);target=w.spawnSpecial('lurker','boss',{x:5,z:0})!;w.castDetection();}else target=w.spawnSpecial('ravager','boss',{x:5,z:0})!;
 const hp=target.hp;w.hash.rebuild(w.entities.values());assert.ok(w.castHero(id,id==='tosh'?bounds:undefined));w.heroes.clear();
 // Isolate the actual skill resolver at fixed 60 Hz without any basic shots or aura benefit.
 for(let tick=0;tick<240;tick++){w.time+=1/60;resolveExpeditionHeroCasts(w);}
 const damage=hp-target.hp;assert.ok(damage>=hp*.5,JSON.stringify({id,rank,hp,damage}));assert.equal(w.stats.shots,0);bossAoe.push({id,rank,hp,armor:target.armor,damage,fraction:damage/hp,shots:0,aurasExcluded:true});
}
// Approved future elite design is read only here for QA; runtime never imports this document.
const spec=JSON.parse(await fs.readFile('docs/project/NEXT_ITERATION_P0_VALUES_20261003.json','utf8')).eliteHeroRedesign;
const durability=[];for(const h of spec.heroes.filter((h:any)=>TERRAN_HERO_IDS.includes(h.id))){const elites=h.peerIds.map((id:any)=>{const e=spec.elites.find((e:any)=>e.id===id),family=ELITES[id as keyof typeof ELITES].family,w=new World({race:familyRace(family),sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.heroes.clear();const unit=w.addUnit(family,'terran',0,0,5);if(family==='lurker')unit.nativeMode='lurker_burrowed';if(e.parameters.weaponMode==='siege')unit.mode='siege';else if(e.parameters.weaponMode)unit.nativeMode=e.parameters.weaponMode;w.refreshStats(unit,true);const body=spec.bodyPresets[e.body];return {id,hp:(unit.maxHp*body.hp+(unit.maxShield??0)*body.shield)*spec.eliteGrowth.hp[4]*(1+(e.parameters.familyAttributeIncrease??e.parameters.allyHpIncrease??0))*(id==='reaper.3'?e.parameters.hpAsymptoteFactor:1)};}).sort((a:any,b:any)=>b.hp-a.hp);const hero=rows.find(r=>r.id===h.id&&r.rank===1)!;durability.push({id:h.id,heroI:hero.health+(hero.shield??0),eliteV:elites[0],ratioI:(hero.health+(hero.shield??0))/elites[0].hp});}
const repairs=[];for(const rank of [1,3,5]){const {w,u}=setup('swann',rank);w.heroes.clear();w.refreshStats(u,true);for(let i=0;i<7;i++){const a=w.addUnit('tank','terran',2+i*.3,0);a.hp=a.maxHp=1e7;a.hp-=1e6;}w.time=1;tickTerranHero(w,u,1);const v=w.stats.healed;assert.ok(v/2268>=1.25);repairs.push({rank,effectiveHpPerSecond:v,targets:u.healTargets?.length,approvedVEliteBudget:2268,ratioV:v/2268,aurasExcluded:true});}
const report={method:'60 seconds production World.step; 60 Hz; one stationary high-HP Boss-class diagnostic target. No talents/cards or old/new aura registry. Actual cast gateway/resolver and physical basic arrival. This is isolated budget evidence, not natural campaign/device acceptance.',rows,bosses,bossAoe,durability,repairs,comparisons:Object.entries(comparators).map(([id,v])=>({id,approvedVEliteUpperBudget:v,heroI:rows.find(r=>r.id===id&&r.rank===1)!.dps,heroV:rows.find(r=>r.id===id&&r.rank===5)!.dps,ratioI:rows.find(r=>r.id===id&&r.rank===1)!.dps/v,ratioV:rows.find(r=>r.id===id&&r.rank===5)!.dps/v}))};
assert.ok(report.comparisons.every(r=>r.ratioI>=1.25));assert.ok(durability.every(r=>r.ratioI>=1.25),JSON.stringify(durability));
await fs.mkdir('reports/local/hero-confirmed-20261005',{recursive:true});await fs.writeFile('reports/local/hero-confirmed-20261005/strength.json',JSON.stringify(report,null,2));console.log(JSON.stringify({comparisons:report.comparisons,bosses},null,2));
