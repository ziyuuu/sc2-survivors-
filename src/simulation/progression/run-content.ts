import {ALL_HERO_IDS,HEROES,HERO_IDS_BY_RACE,type HeroId} from '../../data/heroes';
import {ELITES,type EliteId} from '../../data/elites';
import {FAMILIES_BY_RACE,type Race} from '../../data/races';
import type {Difficulty} from '../../data/stages';
import {FUN_KINDS,FUN_MIN_STAGE,type FunKind} from '../encounters/expanded-state';
import {ENCOUNTER_KINDS,type EncounterKind} from '../encounters/state';
import {HORDE_KINDS,HORDE_RULES,type HordeKind} from '../field-events/state';
import {SPECIAL_STAGE_KINDS,type SpecialStageKind} from '../special-stages/state';
import {MISSION_DIFFICULTY,missionAllowed,encounterAllowed,specialAllowed} from './fun-availability';
import type {MissionKind} from '../missions/state';
import type {World} from '../world';
import {TAVERN_MULTIPLIERS} from '../fun-shop/state';

/** Only presentation-relevant identities and independent lottery coordinates.
 * Positions, payment, combat, player choices and event safety remain live. */
export interface StageContent {
 salt:number; eventRoll:number; categoryRoll:number;
 mission:MissionKind; encounter:EncounterKind|FunKind; horde:HordeKind;
 ticket:SpecialStageKind[]; portal:SpecialStageKind[];
 heroes:HeroId[]; elites:EliteId[];
}
export interface RunContentPlan {
 version:1;seed:number;race:Race;difficulty:Difficulty;stages:StageContent[];
}
export function contentRoll(seed:number,key:string,index=0){
 let h=(2166136261^seed)>>>0;
 for(const c of key)h=Math.imul(h^c.charCodeAt(0),16777619);
 h^=Math.imul(index+1,0x9e3779b1);
 h=Math.imul(h^(h>>>16),0x85ebca6b);
 h=Math.imul(h^(h>>>13),0xc2b2ae35);
 return ((h^(h>>>16))>>>0)/4294967296;
}
export function contentStream(stage:StageContent,key:string){
 let index=0;
 return ()=>contentRoll(stage.salt,key,index++);
}
function ordered<T extends string>(pool:readonly T[],salt:number,key:string):T[]{
 return pool.map(id=>({id,order:contentRoll(salt,key+'/'+id)})).sort((a,b)=>a.order-b.order||a.id.localeCompare(b.id)).map(x=>x.id);
}
function buildStage(seed:number,race:Race,difficulty:Difficulty,stage:number,scope:string,previous?:Partial<Record<'mission'|'encounter'|'horde',string>>,encountersUsed?:Set<string>):StageContent{
 const salt=Math.floor(contentRoll(seed,scope+'/'+stage)*4294967296);
 const missions=(Object.keys(MISSION_DIFFICULTY) as MissionKind[]).filter(id=>missionAllowed(difficulty,id)&&(id!=='fleet'||stage>=10));
 const encounters=[...ENCOUNTER_KINDS,...FUN_KINDS].filter(id=>encounterAllowed(difficulty,id)&&(id!=='gentle'||stage>=7)&&stage>=(FUN_MIN_STAGE[id as FunKind]??0));
 const specials=SPECIAL_STAGE_KINDS.filter(id=>specialAllowed(difficulty,id));
 const entrance=(key:string,chance:number)=>contentRoll(salt,key+'/offer')<chance?ordered(specials,salt,key+'/kind'):[];
 const pick=<T extends string>(pool:readonly T[],category:'mission'|'encounter'|'horde')=>{
  const candidates=ordered(pool,salt,category);
  return candidates.find(id=>id!==previous?.[category]&&(category!=='encounter'||!encountersUsed?.has(id)))??candidates[0];
 };
 // Each opportunity has a concrete hero; eligibility and promotion still apply.
 const own=HERO_IDS_BY_RACE[race] as readonly HeroId[];
 const heroes=[...new Set(['reward','shelf','mission'].map(key=>ordered(own,salt,key)[0]))];
 const elites=FAMILIES_BY_RACE[race].flatMap(family=>{
  const variants=(Object.keys(ELITES) as EliteId[]).filter(id=>ELITES[id].family===family);
  return ordered(variants,salt,'elite').slice(0,1);
 });
 return {salt,eventRoll:contentRoll(salt,'natural'),categoryRoll:contentRoll(salt,'category'),
  mission:pick(missions,'mission'),encounter:pick(encounters,'encounter'),
  horde:pick(HORDE_KINDS.filter(id=>stage>=HORDE_RULES[id].stage),'horde')??'zerglings',
  ticket:entrance('ticket',.25),portal:entrance('portal',.2),heroes,elites};
}
export function createContentPlan(seed:number,race:Race,difficulty:Difficulty):RunContentPlan {
 const previous:Partial<Record<'mission'|'encounter'|'horde',string>>={},used=new Set<string>();
 const stages=Array.from({length:18},(_,i)=>{
  const stage=buildStage(seed,race,difficulty,i+1,'campaign',previous,used);
  const category=plannedNatural(stage,i+1,0);
  if(category){previous[category]=stage[category];if(category==='encounter')used.add(stage.encounter);}
  return stage;
 });
 return {version:1,seed,race,difficulty,stages};
}
export function validContentPlan(value:RunContentPlan|undefined,seed:number,race:Race,difficulty:Difficulty){
 if(value===undefined)return true; // Existing schema-26 runs use their original content rules.
 if(!value||value.version!==1||value.seed!==seed||value.race!==race||value.difficulty!==difficulty||!Array.isArray(value.stages)||value.stages.length!==18)return false;
 const expected=createContentPlan(seed,race,difficulty);
 return value.stages.every((s,i)=>s&&Object.keys(expected.stages[i]).every(k=>JSON.stringify(s[k as keyof StageContent])===JSON.stringify(expected.stages[i][k as keyof StageContent])));
}
const endlessCache=new WeakMap<RunContentPlan,{round:number;content:StageContent}>();
export function plannedStage(plan:RunContentPlan|undefined,stage:number,round?:number){
 if(!plan)return undefined;
 if(round===undefined)return plan.stages[stage-1];
 const cached=endlessCache.get(plan);
 if(cached?.round===round)return cached.content;
 const content=buildStage(plan.seed,plan.race,plan.difficulty,round,'endless');
 endlessCache.set(plan,{round,content});return content;
}
export const worldContent=(w:World,stage=w.stage)=>plannedStage(w.runConfig?.contentPlan,stage,w.endless?.round);
export const naturalEventChance=(stage:number)=>stage<4||stage>18?0:stage<=6?.3:stage<=12?.35:.4;
export const eventCategoryWeights=(tavern:number)=>({mission:45*TAVERN_MULTIPLIERS[tavern],encounter:35,horde:20});
export function plannedNatural(content:StageContent,stage:number,tavern:number){
 if(content.eventRoll>=naturalEventChance(stage))return null;
 const weights=eventCategoryWeights(tavern);
 const roll=content.categoryRoll*(weights.mission+weights.encounter+weights.horde);
 return roll<weights.mission?'mission':roll<weights.mission+weights.encounter?'encounter':'horde';
}
export function identityRoll(w:World,source:string,legacy:()=>number,index=0){
 const stage=worldContent(w);
 return stage?contentRoll(stage.salt,source,index):legacy();
}
/** Prefer this stage's family variants. Foreign and explicit equipment pools
 * can have no overlap with the player's roster; their own seed key still applies. */
export function plannedElites(stage:StageContent|undefined,pool:readonly (typeof ELITES)[EliteId][]){
 if(!stage)return pool;
 const selected=pool.filter(elite=>stage.elites.includes(elite.id));
 return selected.length?selected:pool;
}
export function arenaHeroPool(stage:StageContent,canHitAir:boolean,count:number){
 const pool=ALL_HERO_IDS.filter(id=>canHitAir||!HEROES[id].flying);
 return Array.from({length:count},(_,i)=>pool[Math.floor(contentRoll(stage.salt,'arena/hero',i)*pool.length)]);
}
