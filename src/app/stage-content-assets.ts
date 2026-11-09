import {HEROES,type HeroId} from '../data/heroes';
import {ELITES} from '../data/elites';
import {BOSSES} from '../data/enemies';
import type {CombatUnitType} from '../data/races';
import {arenaHeroPool,contentRoll,plannedNatural,plannedStage,type RunContentPlan} from '../simulation/progression/run-content';
import {ordinaryHeroUnlockStage} from '../simulation/progression/hero-availability';
import {ARENA_ELITES} from '../simulation/special-stages/arena';
import {displayLoadModelKey} from '../render/materials/elite-visual';

/** The lottery and its gates have the same coordinates in simulation and preload.
 * An actual saved body/offer always adds to, and can outlive, this prediction. */
export function stageContentAssets(plan:RunContentPlan|undefined,stage:number,round:number|undefined,levels:{tavern:number;bait:number},families:readonly CombatUnitType[],special:readonly string[]){
 const content=plannedStage(plan,stage,round);
 if(!plan||!content)return undefined;
 const natural=round===undefined?plannedNatural(content,stage,levels.tavern):null;
 const mission=natural==='mission'?content.mission:null;
 const encounter=natural==='encounter'||round===undefined&&stage>=4&&levels.bait>0?content.encounter:null;
 const models=new Map<string,CombatUnitType>();
 const family=(type:CombatUnitType)=>models.set(type,type);
 const heroes=new Set<HeroId>();
 const battleHeroReward=stage>=ordinaryHeroUnlockStage(plan.difficulty)&&(!!BOSSES[stage]||mission==='intel');
 if(battleHeroReward||round!==undefined||encounter==='cruelQueen')for(const id of content.heroes)heroes.add(id);
 // Arena legality depends on the participating squad's ability to hit air.
 if(special.includes('arena')){
  const chapter=Math.min(2,Math.floor((stage-1)/6)),count=chapter===0?1:2;
  for(const air of [false,true])for(const id of arenaHeroPool(content,air,count))heroes.add(id);
  for(let i=0;i<[6,8,10][chapter];i++){
   const elite=ELITES[ARENA_ELITES[Math.floor(contentRoll(content.salt,'arena/elite',i)*ARENA_ELITES.length)]];
   models.set(elite.model,elite.family);
  }
 }
 for(const id of heroes){const hero=HEROES[id];models.set(displayLoadModelKey(hero.model,hero.baseFamily),hero.baseFamily);}
 if(stage>=3||round!==undefined)for(const id of content.elites){const elite=ELITES[id];if(families.includes(elite.family))models.set(elite.model,elite.family);}
 if(encounter==='devourer')models.set('fun-nydus','roach');
 if(encounter==='cruelQueen'){models.set('fun-cocoon','queen');family('queen');}
 if(encounter==='infectedTerrans'){models.set('fun-infested-marine','marine');models.set('fun-infested-marine.timeout','marine');}
 if(encounter==='corruptedProtoss'){family('zealot');family('stalker');}
 if(encounter==='gentle')family('ultralisk');
 if(encounter==='giant'||encounter==='flyingRoaches')family('roach');
 if(encounter==='whitePack'||encounter==='parasites')family('zergling');
 if(encounter==='parasites')family('hydralisk');
 return {mission,encounter,models,heroes,special};
}
