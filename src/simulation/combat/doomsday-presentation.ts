import type {World} from '../world';
import type {Entity} from '../types';
import {formalDoomsdayMember,mechanicalRanks,mechanicalMember} from './doomsday-roster';
import {DOOMSDAY_CARD_BY_ID} from '../../data/terran-doomsday';
import type {WeaponFlight} from './weapon-flight';
import {SC2_UNITS,type UnitType} from '../../data/sc2-units';

/** Freeze the incoming direction on an actual HP or shield receipt. */
export function phaseArmorOrigin(w:World,u:Entity|undefined,sourceId:number){
 if(!u||!mechanicalRanks(w,u)?.['M-B04']||!mechanicalMember(w,u))return;
 const source=w.missions.packetSource?.id===sourceId?w.missions.packetSource:w.body(sourceId);
 if(source&&source.owner!==u.owner)return {x:source.x,z:source.z};
}

/** P01 and N03 affect formal mechanical troops, including soldiers converted by P03. */
export function doomsdayGrowthTier(w:World,u:Entity,ranks=mechanicalRanks(w,u)):0|1|2|3{
 if(!ranks)return 0;
 const machine=mechanicalMember(w,u);
 return growthTier(w,u,machine&&!!ranks['M-P01'],machine&&!!w.expedition.doomsday?.ranks['M-N03']);
}
function growthTier(w:World,u:Entity,armored:boolean,polarized:boolean):0|1|2|3{
 if(!formalDoomsdayMember(u))return 0;
 if(!armored&&!polarized)return 0;
 if(polarized&&u.rank>=DOOMSDAY_CARD_BY_ID['M-N03'].params.threshold)return 3;
 const originalCap=u.eliteId?5:w.baseSoldierCap(u.unitType as UnitType);
 if(u.rank>originalCap)return 2;
 return armored?1:0;
}

export function doomsdayRefitStyle(w:World,u:Entity|undefined):readonly [number,number,number,number]|undefined{
 if(!u||!w.expedition.doomsday)return;
 const c=mechanicalRanks(w,u),s=u.doomsday;
 if(!c)return;
 const grade=doomsdayGrowthTier(w,u,c),mechanical=mechanicalMember(w,u);
 if(!mechanical&&!grade)return;
 // The integer keeps the grade and nano response. Twelve exact fractional steps animate the powered seams.
 const shotAge=w.time-u.lastShotAt;
 const pulse=grade===3&&u.hp>0&&(u.shotSequence??0)>0&&shotAge>=0&&shotAge<.26
  ?Math.ceil(12*(1-shotAge/.26))/16:0;
 const materialState=grade*2+Number((s?.nanoArmorUntilTick??0)>w.tick)+pulse;
 return [mechanical&&c['M-B01']?1:0,mechanical&&c['M-B04']?1:0,s?.special==='M-O02'?1:s?.special==='M-O03'?2:s?.mechanized?3:0,materialState];
}
/** Pure, frozen visual identity. No random values, receipts or combat state are created here. */
export const DOOMSDAY_STYLE={nano:1,phase:2,enhanced:4,heavy:8,penetrating:16,sword:32,giant:64,armor:128,breakthrough:256,polarized:512,preheated:1024,bore:2048,blast:4096,splitParent:8192,dual:16384,reload:32768} as const;
export function doomsdayShotStyle(w:World,u:Entity|undefined):number{
 const s=u?.doomsday,r=s?.round;if(!u||!s||!r)return 0;
 if(r.shotStyle!==undefined)return r.shotStyle;
 const c=r.cards,S=DOOMSDAY_STYLE,attrs=SC2_UNITS[u.unitType]?.attributes;
 const machine=!!s.heroArmor||formalDoomsdayMember(u)&&!!attrs&&(attrs.includes('Mechanical')||attrs.includes('Biological')&&!!c?.['M-P03']);
 const grade=growthTier(w,u,machine&&!!c?.['M-P01'],machine&&!!(s.polarized||c?.['M-N03']));
 let style=(r.melee?S.sword:0)|(s.special==='M-O02'?S.giant:0);
 if(s.nanoAmmo)style|=S.nano;
 if(c?.['M-N02']&&machine)style|=S.phase;
 if(r.gun&&c?.['M-W01'])style|=S.heavy;
 if(r.gun&&c?.['M-G01']||r.pierce)style|=S.penetrating;
 if(grade>=1)style|=S.armor;
 if(grade>=2)style|=S.breakthrough;
 if(grade===3)style|=S.polarized;
 if(r.preheated)style|=S.preheated;
 if(r.pierce)style|=S.bore;
 if(c?.['M-B02']&&machine)style|=S.blast;
 if(s.special==='M-P06')style|=S.splitParent;
 if(s.special==='M-B07')style|=S.dual;
 if(c?.['M-W03']&&machine)style|=S.reload;
 return style;
}
/** Native weapons retain their own launch, travel and contact actors under a card overlay. */
export const customDoomsdayShot=(style=0)=>!!(style&(DOOMSDAY_STYLE.sword|DOOMSDAY_STYLE.giant));
export const doomsdayProjectileBody=(style:number)=>!!(style&DOOMSDAY_STYLE.giant);
export function doomsdayOwnsFlight(w:World,flight:WeaponFlight){
 return !!flight.doomsdayDerived||doomsdayProjectileBody(doomsdayShotStyle(w,flight.source));
}
