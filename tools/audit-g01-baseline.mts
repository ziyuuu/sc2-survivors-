import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {HEROES,ALL_HERO_IDS,type HeroId} from '../src/data/heroes';
import {ATTRIBUTE_SLOTS,isOffensiveSlot} from '../src/simulation/starship/types';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {equipmentTotals} from '../src/simulation/starship/runtime';
import {teamCardKey} from '../src/simulation/progression/team-cards';
import {commitStrategic,tickShopSupport} from '../src/simulation/combat/shop-support';
import {castTactical,tickUnique,uniqueShieldBreak,uniquePrimary,uniqueDeath} from '../src/simulation/combat/unique-support';
import {draftContext} from '../src/simulation/expedition-economy';
import {newSupportMine} from '../src/simulation/combat/tracking-mines';
import {drawBossLoot,inspectReinforcementPool,drawEquipmentUnitLoot} from '../src/simulation/progression/expedition-drafts';
import type {Race} from '../src/data/races';
import type {BattleView} from '../src/simulation/combat/battle-view';
const out='reports/local/g01-20261022';
const bounds:BattleView={ground:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],air:[{x:-20,z:-20},{x:20,z:-20},{x:20,z:20},{x:-20,z:20}],occludedGround:[],occludedAir:[]};
export function setup(race:Race,quality:0|3,roster=1){
 const w=new World({race,seed:102201,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(102201)});
 if(quality)for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:'attribute.3',race,slot},'g01:'+slot,{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;r.value.affixes=(isOffensiveSlot(slot)?['attack','trueDps','range']:['defense','health','reduction']).map(key=>({key,score:200})) as typeof r.value.affixes;assert.ok(w.equipItem(r.value.id,slot).ok);}
 assert.ok(w.start());w.pods=[];w.entities.clear();w.heroes.clear();w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.missions.enabled=false;w.encounters.enabled=false;
 for(const p of Object.values(w.expedition.production))p.enabled={};
 const family=race==='terran'?'marine':race==='zerg'?'roach':'stalker';for(let i=0;i<roster;i++){const u=w.addUnit(family,'terran',(i%2)*.8,Math.floor(i/2)*.8);w.refreshStats(u,true);}
 return w;
}
function target(w:World,x=0,z=2){const e=w.addUnit('roach','zerg',x,z);e.hp=e.maxHp=1e8;e.armor=0;e.moveSpeed=0;e.weaponDamage=0;e.stoppedUntil=1e9;w.hash.rebuild(w.entities.values());return e;}
if(!process.env.G01_FIXTURES_ONLY){
const support:any[]=[];
for(const quality of [0,3] as const)for(const race of ['terran','zerg','protoss'] as const){
 for(const kind of ['strategic','bombardment','mines'] as const){const w=setup(race,quality),e=target(w);if(kind==='strategic'){w.expedition.support.ammo=1;assert.ok(commitStrategic(w,e));w.time=3;tickShopSupport(w);}else if(kind==='bombardment'){w.expedition.support.levels.bombardment=1;tickShopSupport(w);w.time=1;tickShopSupport(w);}else{w.expedition.support.stageReceipt=`${w.runId}:${w.stage}`;w.expedition.support.mines=[newSupportMine(w.nextId++,e)];for(let i=0;i<120;i++){w.time+=1/60;tickShopSupport(w);}}support.push({race,quality,kind,damage:e.maxHp-e.hp,totals:equipmentTotals(w)});}
}
const cards:any[]=[];
for(const quality of [0,3] as const)for(const race of ['terran','zerg','protoss'] as const){const w=setup(race,quality),u=w.allies()[0];const stats=()=>({hp:u.maxHp,shield:u.maxShield??0,armor:u.armor,damage:u.weaponDamage,period:u.attackPeriod});const before=stats();w.expedition.cardTotals[teamCardKey('firepower','orange')]=1;w.expedition.cardTotals[teamCardKey('defense','orange')]=1;w.refreshStats(u,true);cards.push({race,quality,before,after:stats(),totals:equipmentTotals(w)});}
const paths:any[]=[];
for(const race of ['terran','zerg','protoss'] as const)for(const stage of [1,3,6,11,12]){const w=setup(race,0);w.stage=stage;const c=draftContext(w);paths.push({race,stage,legalHeroes:c.heroes.filter(h=>h.eligible).map(h=>h.id),shopPoolHeroes:inspectReinforcementPool(c).filter(x=>x.effect.kind==='hero').map(x=>x.id),bossOrange:drawBossLoot({...c,random:()=>0},'g01-boss','orange').expeditionEffect,equipmentUnit:drawEquipmentUnitLoot({...c,random:()=>0},'g01-gear')?.expeditionEffect});}
await fs.writeFile(out+'/baseline-channels.json',JSON.stringify({support,cards,paths},null,2));
console.log(JSON.stringify({channels:support.length,cards:cards.length,paths:paths.length}));
const strength:any[]=[];
if(!process.env.G01_CHANNELS_ONLY)
for(const quality of [0,3] as const)for(const race of ['terran','zerg','protoss'] as const)for(const id of [null,...ALL_HERO_IDS.filter(id=>HEROES[id].race===race)]){
 const w=setup(race,quality,4);if(id)assert.ok(w.acquireHero(id));for(const [i,u]of w.allies().entries()){u.x=(i%2)*.8;u.z=Math.floor(i/2)*.8;u.prev={x:u.x,z:u.z};}
 const e=target(w,0,3);e.enemyTier='boss';const pools=w.allies().map(u=>({id:u.heroId??u.unitType,hp:u.maxHp,shield:u.maxShield??0,armor:u.armor}));let casts=0;
 for(let i=0;i<3600;i++){if(id&&i%6===0&&w.castHero(id,bounds))casts++;w.step();}
 const damage=e.maxHp-e.hp;strength.push({quality,race,id,seconds:w.time,damage,dps:damage/60,casts,shots:w.stats.shots,pools,alive:w.allies().length});
 console.log(JSON.stringify({quality,race,id,dps:Math.round(damage/60)}));
 await fs.writeFile(out+'/baseline-hero-strength.json',JSON.stringify({method:'Production World.step, 60 Hz for 60 s; same four rank-I common units with/without one rank-I hero; stationary zero-armor Boss-class high-HP target. Hero auras, passives, summons and legal manual casts retained. Blue attributes fixed to maximum legal scores; no set effects. Controlled comparison, not natural campaign/balance acceptance.',rows:strength},null,2));
}
}
