/** Exact names in the locally inspected source GLBs. Missing source clips remain
 * missing; visual/actor-marker acceptance is separate from successful mapping. */
export interface AnimationProfile {
 idle:string[];move:string[];attack:string[];skill:string[];ready?:string[];
 attackChannel?:string[];attackEnd?:string[];
 note?:string;
}
const basic=(note?:string):AnimationProfile=>({idle:['Stand'],move:['Walk','Run'],attack:['Attack'],skill:['Spell'],note});
export const ANIMATION_PROFILES:Record<string,AnimationProfile>={
 reaper:basic(),zealot:basic(),adept:basic('Long source Attack is sampled at natural speed, never compressed to fit the weapon period; exact actor segment remains a visual acceptance item.'),
 stalker:{...basic(),ready:['Stand Ready']},sentry:basic(),immortal:basic(),phoenix:basic('Source Attack has only one animated channel; weapon effects carry most of the firing readout.'),
 high_templar:{...basic('Spell A projectile / Spell storm presentation adaptation; original actor mapping requires visual verification.'),attack:['Attack','Spell A'],skill:['Spell']},
 colossus:{...basic('B97563 ThermalLancesForward actor brackets Stand Channel Start/Channel/End.'),attack:['Stand Channel Start'],attackChannel:['Stand Channel'],attackEnd:['Stand Channel End'],ready:['Attack Ready Channel']},
 void_ray:{...basic(),attackChannel:['Stand Channel'],attackEnd:['Attack End']},
 carrier:{...basic('No original mother-ship Attack; only owned interceptors fire.'),move:['Walk','Walk 01','Walk 02'],attack:[]},
};
export function animationProfile(key?:string){return key?ANIMATION_PROFILES[key.startsWith('elite.')?key.split('.')[1]:key]:undefined;}
