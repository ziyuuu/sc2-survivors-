import type {Entity,VisualEvent} from '../../simulation/types';
import type {World} from '../../simulation/world';
import {UNIT_SPECTACLE} from '../../data/unit-spectacle';
import {unitData} from '../../simulation/combat/expedition-combat';
import {PLAYER_COMBAT_FACTOR,PLAYER_REAPER_DAMAGE_BONUS} from '../../data/player-unit-adaptations';

/** Presentation qualification includes only actual ordinary actors and their actual children. */
export function ordinaryActor(u:Entity|undefined,w:World):boolean {
 if(!u||u.heroId||u.eliteId||u.enemyTier||!(u.unitType in UNIT_SPECTACLE))return false;
 if(u.summonKind){const mother=w.entities.get(u.summonOwnerId!);return !!mother&&!mother.heroId&&!mother.eliteId&&!mother.enemyTier;}
 return true;
}
export function ordinaryEvent(e:VisualEvent,w:World){return !e.heroId&&!e.eliteId&&ordinaryActor(w.entities.get(e.entityId),w)&&['attack','projectile-impact','weapon-area','skill-heal','skill-impact','storm-start','bile-impact','baneling-recover','barrier-start'].includes(e.kind);}
/** Local emission decoration only; never ranges, paths, contacts, clocks, pulses or child counts. */
export function ordinaryEmissionScale(u:Entity,damage=u.weaponDamage){
 const base=(unitData(u).attackDamage+(u.team==='player'&&u.unitType==='reaper'?PLAYER_REAPER_DAMAGE_BONUS:0))*(u.team==='player'?PLAYER_COMBAT_FACTOR:1);
 return base>0?Math.max(1,Math.min(1.65,1+.18*Math.log2(Math.max(1,damage/base)))):1;
}
export const ORDINARY_DETAIL={full:1,balanced:.55,low:.2} as const;
