import type {Entity,VisualEvent} from '../simulation/types';
import type {HeroId} from './heroes';
import type {Race} from './races';

/** M4 presentation only. These scales never enter collision, range or damage. */
const LARGE=new Set(['thor','ultralisk','colossus','carrier']);
export function modelPresentationScale(unit:Entity){
 const base=unit.visualScale??1;
 if(unit.modelKey==='hero.yamato_battlecruiser'||unit.modelKey==='hero.hots_leviathan'||unit.heroId==='purifier_flagship')return base*1.15;
 if(unit.modelKey==='elite.carrier.1'&&!unit.eliteId&&!unit.heroId)return base*1.15;
 if(unit.heroId)return base*1.25;
 if(!unit.eliteId)return base;
 const variant=Number(unit.eliteId.at(-1)),index=variant>=1&&variant<=3?variant-1:0;
 return base*(unit.flying?[1.07,1.10,1.13][index]:LARGE.has(unit.unitType)?[1.05,1.08,1.10][index]:[1.10,1.15,1.20][index]);
}

/** Encodes only a small original-mesh accent. Enemy tiers keep their own shader path. */
export function modelPresentationAccent(unit:Entity){
 if(!unit.eliteId||unit.team!=='player')return 0;
 const variant=Number(unit.eliteId.at(-1));
 if(variant<1||variant>3)return 0;
 const race=unit.race==='zerg'?1:unit.race==='protoss'?2:0;
 return 5+race*3+variant-1;
}

export interface AttackPresentation {asset:string;impact:string;tint:number;size:number;impactSize:number;life:number}
const HERO_ATTACKS:Record<HeroId,AttackPresentation>={
 raynor:{asset:'fx.muzzle.0',impact:'fx.impact.0',tint:0xfff1c8,size:.38,impactSize:.46,life:.12},
 tychus:{asset:'fx.muzzle.0',impact:'fx.flameimpact.0',tint:0xffb169,size:.43,impactSize:.57,life:.15},
 nova:{asset:'fx.muzzle.1',impact:'fx.impact.0',tint:0xaeefff,size:.38,impactSize:.5,life:.14},
 swann:{asset:'fx.blast.6',impact:'fx.impact.0',tint:0xffdd96,size:.48,impactSize:.57,life:.17},
 tosh:{asset:'fx.muzzle.0',impact:'fx.blast.3',tint:0xff8d69,size:.43,impactSize:.62,life:.18},
 yamato_battlecruiser:{asset:'fx.blast.6',impact:'fx.blast.3',tint:0xffe4a4,size:.75,impactSize:1.25,life:.2},
 kerrigan:{asset:'fx.muzzle.1',impact:'fx.impact.1',tint:0xd9b8ff,size:.52,impactSize:.68,life:.13},
 zagara:{asset:'fx.bile.0',impact:'fx.bile.4',tint:0xb8eb8b,size:.5,impactSize:.72,life:.22},
 dehaka:{asset:'fx.impact.1',impact:'fx.impact.1',tint:0xd7c59a,size:.52,impactSize:.72,life:.16},
 stukov:{asset:'fx.bile.0',impact:'fx.bile.4',tint:0xc0e08b,size:.48,impactSize:.67,life:.22},
 niadra:{asset:'fx.impact.1',impact:'fx.acid.0',tint:0xb5de87,size:.43,impactSize:.48,life:.15},
 hots_leviathan:{asset:'fx.bile.0',impact:'fx.bile.4',tint:0xc3f3a4,size:.72,impactSize:1.15,life:.24},
 artanis:{asset:'fx.muzzle.1',impact:'fx.impact.0',tint:0xd2efff,size:.54,impactSize:.68,life:.16},
 zeratul:{asset:'fx.muzzle.1',impact:'fx.blast.6',tint:0xa7edff,size:.49,impactSize:.69,life:.18},
 alarak:{asset:'fx.blast.6',impact:'fx.blast.3',tint:0xf082a8,size:.55,impactSize:.71,life:.18},
 fenix:{asset:'fx.muzzle.1',impact:'fx.blast.6',tint:0x8defff,size:.54,impactSize:.82,life:.22},
 vorazun:{asset:'fx.muzzle.1',impact:'fx.impact.0',tint:0x9cb7ea,size:.46,impactSize:.56,life:.15},
 purifier_flagship:{asset:'fx.blast.6',impact:'fx.blast.3',tint:0xfff3bd,size:.78,impactSize:1.3,life:.22},
};
const AIR_SAMPLES:Record<string,AttackPresentation>={
 'hero.yamato_battlecruiser':{asset:'fx.blast.6',impact:'fx.blast.3',tint:0xffe4a4,size:.75,impactSize:1.25,life:.2},
 'hero.hots_leviathan':{asset:'fx.bile.0',impact:'fx.bile.4',tint:0xc3f3a4,size:.72,impactSize:1.15,life:.24},
 'elite.carrier.1':{asset:'fx.muzzle.1',impact:'fx.blast.6',tint:0xfff3bd,size:.78,impactSize:1.3,life:.22},
};
const FAMILY_ATTACKS:Partial<Record<string,AttackPresentation>>={
 hellion:{asset:'fx.flame.1',impact:'fx.flameimpact.0',tint:0xffa34b,size:.42,impactSize:.72,life:.22},
 viking:{asset:'fx.muzzle.1',impact:'fx.impact.0',tint:0xffd48c,size:.43,impactSize:.56,life:.16},
 lurker:{asset:'fx.impact.1',impact:'fx.impact.1',tint:0xdde8ae,size:.42,impactSize:.58,life:.18},
 ravager:{asset:'fx.bile.0',impact:'fx.bile.4',tint:0xcaff8f,size:.46,impactSize:.7,life:.24},
 immortal:{asset:'fx.muzzle.1',impact:'fx.blast.6',tint:0x91dfff,size:.46,impactSize:.65,life:.2},
 high_templar:{asset:'fx.muzzle.1',impact:'fx.impact.0',tint:0xc7d7ff,size:.42,impactSize:.6,life:.22},
};
export const heroPresentation=(id:HeroId):AttackPresentation=>HERO_ATTACKS[id];
const RACE_ATTACKS:Record<Race,AttackPresentation>={
 terran:{asset:'fx.muzzle.0',impact:'fx.impact.0',tint:0xffdba5,size:.35,impactSize:.48,life:.13},
 zerg:{asset:'fx.impact.1',impact:'fx.acid.0',tint:0xc6e68f,size:.38,impactSize:.52,life:.16},
 protoss:{asset:'fx.muzzle.1',impact:'fx.blast.6',tint:0xb4d9ff,size:.39,impactSize:.55,life:.17},
};
function eliteTint(race:Race,variant:number){return race==='terran'?[0xffecc0,0xffa24c,0x9dccf8][variant-1]:race==='zerg'?[0xe6e5a4,0xffca72,0x78ceb8][variant-1]:[0xe1edff,0x9ecfff,0x9d9bdc][variant-1];}
export function attackPresentation(event:VisualEvent):AttackPresentation|null {
 if(event.heroId)return HERO_ATTACKS[event.heroId];
 if(event.modelKey&&AIR_SAMPLES[event.modelKey]&&(!event.eliteId||event.modelKey!=='elite.carrier.1'))return AIR_SAMPLES[event.modelKey];
 if(!event.eliteId)return null;
 const source=FAMILY_ATTACKS[event.unitType??'']??RACE_ATTACKS[event.race??'terran'];
 const variant=Number(event.eliteId.at(-1));return {...source,tint:eliteTint(event.race??'terran',variant),size:source.size*[1.2,1.4,1.25][variant-1],impactSize:source.impactSize*[1,1.25,1.15][variant-1]};
}
