import type {HeroId} from './heroes';
export type CoreShape='slug'|'crystal'|'orb'|'spore'|'blade'|'shard'|'plate'|'helix';
export interface HeroSpectacleProfile {core:CoreShape;skill:CoreShape;color:number;edge:number;size:number;death:'armor'|'psionic'|'bio'|'infected'|'void'|'reactor';rhythm:string;}
/** Every identity is deliberately authored; no fallback hero or race recolor. Visual only. */
export const HERO_SPECTACLE:Record<HeroId,HeroSpectacleProfile>={
 raynor:{core:'slug',skill:'helix',color:0xff951f,edge:0xffe0a0,size:.25,death:'armor',rhythm:'heavy-fire-pulse'},
 tychus:{core:'slug',skill:'plate',color:0xffc156,edge:0xffeacc,size:.18,death:'armor',rhythm:'rotary-staccato'},
 nova:{core:'crystal',skill:'shard',color:0x64caff,edge:0xe1f7ff,size:.16,death:'armor',rhythm:'precision-crystal'},
 swann:{core:'plate',skill:'plate',color:0xff9c35,edge:0xffefb0,size:.2,death:'armor',rhythm:'weld-and-recoil'},
 tosh:{core:'shard',skill:'crystal',color:0xa252e0,edge:0xe6beff,size:.28,death:'psionic',rhythm:'unstable-compression'},
 yamato_battlecruiser:{core:'slug',skill:'orb',color:0xff6818,edge:0xfff3b8,size:.4,death:'reactor',rhythm:'paired-battery-fusion'},
 kerrigan:{core:'blade',skill:'blade',color:0xb955f7,edge:0xf1c3ff,size:.38,death:'psionic',rhythm:'claw-and-serrated-wave'},
 zagara:{core:'spore',skill:'spore',color:0xaab832,edge:0xf4cc6b,size:.32,death:'bio',rhythm:'sac-and-three-shells'},
 dehaka:{core:'blade',skill:'blade',color:0xb9b578,edge:0xefe6b8,size:.5,death:'bio',rhythm:'heavy-jaw-contact'},
 stukov:{core:'slug',skill:'spore',color:0x84b749,edge:0xd2ea95,size:.25,death:'infected',rhythm:'infected-gun-four-corrosion'},
 niadra:{core:'shard',skill:'spore',color:0xcca382,edge:0xb8f191,size:.21,death:'bio',rhythm:'fine-spine-restoration-bloom'},
 hots_leviathan:{core:'spore',skill:'spore',color:0xa3d550,edge:0xe5ffab,size:.46,death:'bio',rhythm:'multi-mouth-three-surge'},
 artanis:{core:'blade',skill:'plate',color:0xffd15d,edge:0xf1fbff,size:.35,death:'armor',rhythm:'dual-blade-shield-rebuild'},
 zeratul:{core:'blade',skill:'shard',color:0x487d91,edge:0x80e3c3,size:.32,death:'void',rhythm:'thick-void-incision'},
 alarak:{core:'blade',skill:'blade',color:0xb91742,edge:0xff5766,size:.46,death:'psionic',rhythm:'heavy-red-wall'},
 fenix:{core:'orb',skill:'orb',color:0x3c9eff,edge:0xffe4a0,size:.38,death:'reactor',rhythm:'counter-rotating-solar-core'},
 vorazun:{core:'blade',skill:'crystal',color:0x604ba3,edge:0xc6b7ff,size:.25,death:'void',rhythm:'thin-shadow-stasis-facets'},
 purifier_flagship:{core:'crystal',skill:'crystal',color:0xffdc76,edge:0xffffff,size:.2,death:'reactor',rhythm:'interceptors-single-nuclear-core'},
};
export const heroVisualTier=(rank=1)=>rank>=5?2:rank>=3?1:0;
