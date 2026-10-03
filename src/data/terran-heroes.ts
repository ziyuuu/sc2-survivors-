import type {HeroId} from './heroes';
/** Approved P3-A runtime values. Never import the P0 documentation proposal. */
export const TERRAN_HERO_IDS=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'] as const;
export const isRevisedHero=(id:HeroId|undefined)=>!!id&&(TERRAN_HERO_IDS as readonly string[]).includes(id);
export function terranHeroGrowth(rank:number){const n=Math.max(0,Math.min(4,rank-1)),period=1-.05*n;return {health:1+.35*n,damage:(1+.35*n)*period,period,armor:.5*n,passive:1+.35*n,skill:[9200,12880,16560,20240,23920][n]};}
