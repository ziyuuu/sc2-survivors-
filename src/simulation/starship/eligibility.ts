import {HEROES,type HeroId} from '../../data/heroes';
import {ELITES} from '../../data/elites';
import {familyRace,ALL_FAMILIES,type FamilyId,type Race} from '../../data/races';
import {PRODUCTION_LINES,familyLine,type ProductionLineId} from '../../data/expedition-buildings';
import type {EquipmentBinding} from './types';
import type {EquipmentTemplate} from './catalog';
import type {World} from '../world';
import type {Entity} from '../types';
import {activeEquipmentEffects} from './modules';

export const HERO_DIRECTIONS:Record<HeroId,ProductionLineId>={raynor:'barracks',tychus:'barracks',nova:'barracks',tosh:'barracks',swann:'factory',yamato_battlecruiser:'starport',kerrigan:'zerg.basic',zagara:'zerg.basic',niadra:'zerg.basic',dehaka:'zerg.evolution',stukov:'zerg.evolution',hots_leviathan:'zerg.air',artanis:'gateway',zeratul:'gateway',alarak:'gateway',vorazun:'gateway',fenix:'robotics',purifier_flagship:'stargate'};
export function bindingDirection(b:EquipmentBinding):ProductionLineId|undefined{return b.direction??(b.hero?HERO_DIRECTIONS[b.hero]:b.elite?familyLine(ELITES[b.elite].family):b.family?familyLine(b.family):undefined);}
export function validBinding(t:EquipmentTemplate,race:Race,b:EquipmentBinding){
 if(Object.keys(b).some(key=>!['hero','elite','direction','family'].includes(key)))return false;
 if(b.hero&&(!HEROES[b.hero]||HEROES[b.hero].race!==race)||b.elite&&(!ELITES[b.elite]||familyRace(ELITES[b.elite].family)!==race)||b.direction&&PRODUCTION_LINES[b.direction]?.race!==race||b.family&&(!ALL_FAMILIES.includes(b.family)||familyRace(b.family)!==race))return false;
 if(!t.binding)return Object.keys(b).length===0;
 return Object.keys(b).length===1&&!!b[t.binding];
}
export function randomBinding(t:EquipmentTemplate,race:Race,random:()=>number):EquipmentBinding{
 if(t.binding==='hero'){const pool=Object.keys(HEROES).filter(id=>HEROES[id as HeroId].race===race) as HeroId[];return {hero:pool[Math.floor(random()*pool.length)]};}
 if(t.binding==='elite'){const pool=Object.values(ELITES).filter(e=>familyRace(e.family)===race);return {elite:pool[Math.floor(random()*pool.length)].id};}
 if(t.binding==='direction'){const pool=Object.keys(PRODUCTION_LINES).filter(id=>PRODUCTION_LINES[id as ProductionLineId].race===race) as ProductionLineId[];return {direction:pool[Math.floor(random()*pool.length)]};}return {};
}
export function directionMatches(b:EquipmentBinding|undefined,family:string){const direction=b&&bindingDirection(b);return !!direction&&PRODUCTION_LINES[direction].families.includes(family as FamilyId);}
export function permanentEquipmentBody(w:World,u:Entity){return u.owner==='terran'&&u.team==='player'&&!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure')&&!['scv','probe','drone'].includes(u.unitType);}
export function equipmentCanGrow(w:World,u:Entity){return permanentEquipmentBody(w,u)&&!w.starship.members.get(u.id)?.cannotGrow;}
export function equipmentCapacity(w:World,kind:'members'|'rank'|'squads',native:number,family?:string){let value=native;
 for(const effect of activeEquipmentEffects(w)){if(effect.key==='capacity_'+kind&&(kind==='squads'||family&&directionMatches(effect.binding,family))||effect.key==='capacity_'+kind+'_all')value+=effect.values[0];
  if(effect.key==='capacity_baseline'){const index=kind==='squads'?0:kind==='members'?1:2;value+=Math.max(0,effect.values[index]-native);}
 }return value;
}
export function equipmentRecruitRank(w:World,family:string){let bonus=0;for(const effect of activeEquipmentEffects(w))if(effect.key==='recruit_rank'&&directionMatches(effect.binding,family)||effect.key==='recruit_rank_all')bonus+=effect.values[0];return Math.min(w.soldierCap(family as FamilyId),1+bonus);}
