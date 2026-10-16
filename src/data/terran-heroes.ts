import {heroGrowth} from './hero-growth';
import type {HeroId} from './heroes';
/** Approved P3-A runtime values. Never import the P0 documentation proposal. */
export const TERRAN_HERO_IDS=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'] as const;
/** Confirmed integration: I-rank seven-body repair exceeds the approved V-rank elite support budget. */
export const TERRAN_HERO_REPAIR_PER_SECOND=450;
export const isRevisedHero=(id:HeroId|undefined)=>!!id&&(TERRAN_HERO_IDS as readonly string[]).includes(id);
export const terranHeroGrowth=heroGrowth;
