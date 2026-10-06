import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ELITES} from '../src/data/elites';
import {HEROES,type HeroId} from '../src/data/heroes';
import {HERO_GROUND_AURAS} from '../src/data/hero-upgrades';
import {ZERG_ELITE_RULES} from '../src/data/zerg-elites';
import {TERRAN_ELITE_RULES} from '../src/data/terran-elites';
import type {Race} from '../src/data/races';
import {heroAura} from '../src/simulation/combat/terran-hero-passives';
import {groundHeroBuff,heroGroundSlow,heroGroundSuppression,heroWeaponVulnerability} from '../src/simulation/combat/hero-ground-auras';
import {zergEliteFriendlyAura} from '../src/simulation/combat/zerg-elite-runtime';
import {protossIncomingFactor} from '../src/simulation/combat/protoss-hero-passives';
import type {Entity} from '../src/simulation/types';

const p0=JSON.parse(await fs.readFile('docs/project/NEXT_ITERATION_P0_VALUES_20261003.json','utf8')).eliteHeroRedesign;
const p4=JSON.parse(await fs.readFile('docs/project/NEXT_ITERATION_P4_VALUES_20261005.json','utf8')).approved;
const copies=p4.elites.filter((r:any)=>r.race==='terran'||r.race==='zerg').map((r:any)=>{
 const old=p0.elites.find((p:any)=>p.id===r.id);
 const runtime=(r.race==='zerg'?ZERG_ELITE_RULES:TERRAN_ELITE_RULES)[r.id as keyof typeof ZERG_ELITE_RULES] as {body:string;parameters:unknown}|undefined;
 return {id:r.id,race:r.race,p0ToP4:!!old&&JSON.stringify(old.parameters)===JSON.stringify(r.parameters),p4ToRuntime:!!runtime&&JSON.stringify(runtime.parameters)===JSON.stringify(r.parameters)&&runtime.body===r.body};
});
assert.equal(copies.length,60);assert.ok(copies.every((r:any)=>r.p0ToP4&&r.p4ToRuntime));
const setup=(race:Race)=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10519});w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();for(const p of Object.values(w.expedition.production))p.enabled={};return w;};
const stats=(u:Entity)=>({damage:u.weaponDamage,period:u.attackPeriod,dps:u.weaponDamage/u.attackPeriod,hp:u.maxHp,shield:u.maxShield??0,armor:u.armor,shieldArmor:u.shieldArmor??0,move:u.moveSpeed});
const delta=(before:ReturnType<typeof stats>,after:ReturnType<typeof stats>)=>({damageFactor:after.damage/before.damage,attackSpeedFactor:before.period/after.period,dpsFactor:after.dps/before.dps,hpFactor:after.hp/before.hp,shieldFactor:before.shield?after.shield/before.shield:null,armorAdd:after.armor-before.armor,shieldArmorAdd:after.shieldArmor-before.shieldArmor,moveFactor:after.move/before.move});
const friendly=[];
for(const [id,type] of [['raynor','marine'],['swann','tank'],['yamato_battlecruiser','marine'],['kerrigan','hydralisk'],['zagara','hydralisk'],['niadra','hydralisk'],['hots_leviathan','hydralisk'],['artanis','stalker'],['fenix','immortal'],['purifier_flagship','immortal']] as const){
 const w=setup(HEROES[id].race),patient=w.addUnit(type,'terran',2,0,5),before=stats(patient);assert.ok(w.acquireHero(id));const source=w.heroEntity(id)!;source.x=source.z=0;w.refreshStats(patient,true);
 const after=stats(patient);friendly.push({id,patient:type,sourceRank:source.rank,patientRank:patient.rank,before,after,delta:delta(before,after),fullRetainedTeamStats:heroAura(w,patient),newFootAuraStats:groundHeroBuff(w,patient),incomingFactor:protossIncomingFactor(w,patient),newFootAuraConfig:HERO_GROUND_AURAS[id]});
}
const commanderWorld=setup('terran'),marine=commanderWorld.addUnit('marine','terran',2,0,5),marineBefore=stats(marine),commander=commanderWorld.addUnit('marine','terran',0,0,5);commander.eliteId='marine.3';commanderWorld.refreshStats(commander,true);commanderWorld.refreshStats(marine,true);
const commanderResult={id:'marine.3',patient:'marine',sourceRank:5,patientRank:5,before:marineBefore,after:stats(marine),delta:delta(marineBefore,stats(marine)),radius:null};
const queenWorld=setup('zerg'),hydra=queenWorld.addUnit('hydralisk','terran',2,0,5),hydraBefore=stats(hydra),queen=queenWorld.addUnit('queen','terran',0,0,5);queen.eliteId='queen.1';queenWorld.refreshStats(queen,true);queenWorld.refreshStats(hydra,true);
const queenResult={id:'queen.1',patient:'hydralisk',sourceRank:5,patientRank:5,before:hydraBefore,after:stats(hydra),delta:delta(hydraBefore,stats(hydra)),aura:zergEliteFriendlyAura(queenWorld,hydra)};
const enemy=[];for(const id of ['tychus','nova','tosh','zagara','dehaka','stukov','zeratul','alarak','vorazun'] as HeroId[]){const w=setup(HEROES[id].race);assert.ok(w.acquireHero(id));const source=w.heroEntity(id)!;source.x=source.z=0;const target=w.addUnit('roach','zerg',2,0);target.enemyTier='boss';enemy.push({id,boss:true,newFootAttackSpeedReduction:heroGroundSlow(w,target),newFootWeaponSuppression:heroGroundSuppression(w,target),newFootWeaponReceivedFactor:heroWeaponVulnerability(w,target),fullAttackSpeedFactor:w.enemyAttackSpeedFactor(target),radius:HERO_GROUND_AURAS[id].radius});}
const protoss=p4.elites.filter((r:any)=>r.race==='protoss').map((r:any)=>({id:r.id,approvedName:r.name,actualName:ELITES[r.id as keyof typeof ELITES].name,actualOldEffect:ELITES[r.id as keyof typeof ELITES].effect??null,newApprovedMechanismFormallyIntegrated:false}));
const report={scope:'Read-only local audit after user questions buff strength relative to earlier version. No runtime, save, resource, approved HTML or effect changes. Actual native World stats on one legal ordinary-V family body per hero; source hero-I; no talents/cards. Composite percentages are not an overall balance score. Source-version clarification remains separate.',approvedCopies:copies,friendly,commander:commanderResult,queen:queenResult,enemy,protoss,comparisonLimits:['Damage/attack-speed factors exclude target armor/conditional bonuses. HP, armor, move, shield restoration, coverage, planes, duration, energy and transferred damage must remain separate.','Foot-aura-only comparisons omit retained original hero passives; bare hero versus V-elite output/support tests omit all auras and do not validate team-buff parity.','Marauder1 combined ordinary direct-weapon DPS factor .65*.70=.455 versus Queen3 .70; Boss factors .825*.85=.70125 versus .85. These are authored parameter envelopes, not measured attack counts.','All thirty Protoss elite P4 mechanisms remain planning-only in this build; current Protoss elites retain pre-P4 native effects.']};
await fs.mkdir('reports/local/buff-strength-audit-20261005',{recursive:true});await fs.writeFile('reports/local/buff-strength-audit-20261005/audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({copies:copies.length,exactCopies:copies.filter((r:any)=>r.p0ToP4&&r.p4ToRuntime).length,friendly:friendly.map(r=>({id:r.id,...r.delta})),commander:commanderResult.delta,queen:queenResult.delta,enemy,protossNewMechanisms:0,sourceChange:false},null,2));
