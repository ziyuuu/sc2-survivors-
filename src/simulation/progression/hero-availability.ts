import type {World} from '../world';
import type {HeroId} from '../../data/heroes';
import type {Difficulty} from '../../data/stages';
import type {Entity} from '../types';
import {BOSSES} from '../../data/enemies';

export const ordinaryHeroUnlockStage=(difficulty:Difficulty)=>difficulty==='easy'?12:difficulty==='normal'?9:3;
/** Applies only to ordinary reward sources; direct equipment/Queen contracts remain separate. */
export function ordinaryHeroAllowed(w:World,id:HeroId){return w.heroes.has(id)||!!w.expedition.heroRewardsUnlocked||!!w.endless;}
/** Called only after a real Boss death has passed drop validation, before drawing that reward. */
export function unlockOrdinaryHeroRewards(w:World,enemy:Entity){
 const stage=enemy.enemySpawn?.stage;
 if(w.specialStages.active||w.endless||enemy.enemyTier!=='boss'||stage===undefined||stage<ordinaryHeroUnlockStage(w.difficulty)||BOSSES[stage]?.type!==enemy.unitType)return;
 w.expedition.heroRewardsUnlocked=true;
}
