import type {Rarity} from '../../data/rewards';
import type {ExpeditionState} from '../expedition-state';
export const CARD_RARITIES:Rarity[]=['white','green','blue','purple','orange'];
export type TeamCardGroup='firepower'|'defense';
export const TEAM_CARD_VALUES={damage:[.03,.05,.08,.12,.16],speed:[.02,.03,.04,.06,.08],health:[.04,.07,.10,.15,.20],armor:[.1,.2,.3,.5,.7]} as const;
export const teamCardKey=(group:TeamCardGroup,rarity:Rarity)=>`team.${group}.${rarity}`;
export function teamCardLegal(s:ExpeditionState,group:TeamCardGroup,rarity:Rarity){return CARD_RARITIES.includes(rarity)&&(s.cardTotals[teamCardKey(group,rarity)]??0)<3;}
export function teamCardEffects(s:ExpeditionState){let damage=0,speed=0,health=0,armor=0;for(let i=0;i<5;i++){const f=s.cardTotals[teamCardKey('firepower',CARD_RARITIES[i])]??0,d=s.cardTotals[teamCardKey('defense',CARD_RARITIES[i])]??0;damage+=f*TEAM_CARD_VALUES.damage[i];speed+=f*TEAM_CARD_VALUES.speed[i];health+=d*TEAM_CARD_VALUES.health[i];armor+=d*TEAM_CARD_VALUES.armor[i];}return {damage,speed,health,armor};}
