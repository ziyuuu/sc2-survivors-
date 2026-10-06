import {createHash} from 'node:crypto';
import {CAMPAIGN18_STAGES,campaign18StageConfig,campaign18Schedule,campaign18GuardCounts,campaign18ChapterGrowth,campaign18EnemyPressure} from '../src/data/campaign18';
import {ELITES} from '../src/data/elites';
import {HEROES} from '../src/data/heroes';
import {ALL_FAMILIES,familyRace} from '../src/data/races';
import {World} from '../src/simulation/world';
import {acquireExpeditionHero} from '../src/simulation/combat/expedition-heroes';

const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const body=(u:any)=>hash(Object.fromEntries(['maxHp','maxShield','armor','shieldArmor','weaponDamage','attackPeriod','attackRange','moveSpeed','healRate','maxEnergy','energyRegen','unitRadius','flying','modelKey','shieldDelay','shieldRegen','nativeMode','activeWeapon'].map(key=>[key,u[key]])));
/** Fingerprints captured from the approved 07b3f68 rules before removing obsolete code. */
export function captureCurrentRules(){
 const campaign:Record<string,string>={};
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(let stage=1;stage<=18;stage++){
  const config=campaign18StageConfig(stage,difficulty);
  campaign[`${difficulty}:${stage}`]=hash({config,growth:campaign18ChapterGrowth(difficulty,stage),pressure:campaign18EnemyPressure(difficulty,stage),guards:Array.from({length:16},(_,serial)=>campaign18GuardCounts(stage,difficulty,serial)),schedules:[1,10511,0xffffffff].flatMap(seed=>[true,false].map(specials=>campaign18Schedule(config,seed,specials)))});
 }
 const bodies:Record<string,string>={};
 for(const rank of [1,2,3,4,5])for(const [id,definition] of Object.entries(ELITES)){
  const w=new World({race:familyRace(definition.family),sandbox:true,waves:false,terrain:false,obstacles:[],seed:10511});w.start();w.entities.clear();
  const u=w.addUnit(definition.family,'terran',0,0,5);u.eliteId=id as keyof typeof ELITES;u.rank=rank;w.refreshStats(u,true);
  bodies[id+':'+rank]=body(u);
 }
 const heroes:Record<string,string>={},ordinary:Record<string,string>={};
 for(const rank of [1,2,3,4,5]){
  for(const [id,definition] of Object.entries(HEROES)){
   const w=new World({race:definition.race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10511});w.start();w.entities.clear();
   for(let i=0;i<rank;i++)if(!acquireExpeditionHero(w,id as keyof typeof HEROES,()=>true))throw Error('Hero capture failed: '+id);
   heroes[id+':'+rank]=body(w.heroEntity(id as keyof typeof HEROES));
  }
  for(const family of ALL_FAMILIES){const w=new World({race:familyRace(family),sandbox:true,waves:false,terrain:false,obstacles:[],seed:10511});w.start();w.entities.clear();ordinary[family+':'+rank]=body(w.addUnit(family,'terran',0,0,rank));}
 }
 const currentElites=Object.values(ELITES).map(e=>({id:e.id,family:e.family,name:e.name,description:e.description,model:e.model,sourceModel:e.sourceModel,icon:e.icon}));
 return {campaign,bodies,heroes,ordinary,definitions:{stages:hash(CAMPAIGN18_STAGES),elites:hash(currentElites),heroes:hash(HEROES),families:hash(ALL_FAMILIES)}};
}
