import routes from '../../data/combat-fx-routes.json';
import type {Entity,VisualEvent} from '../../simulation/types';

export interface CombatFxProfile {key:string;family:string;weapon:string|null;kind:string;actors:string[];models:Record<string,string[]>;mounts?:string[];mode?:string;sourceBodyLaunch?:boolean;adaptation?:string;summon?:string}
export const COMBAT_FX_PROFILES=new Map((routes as CombatFxProfile[]).map(p=>[p.key,p]));
type Identity=Partial<Pick<Entity,'heroId'|'eliteId'|'nativeMode'|'activeWeapon'|'summonKind'|'rewardSourceKind'|'team'|'flying'|'mode'>>&{unitType?:Entity['unitType']|null;siege?:boolean;sourceTeam?:Entity['team'];targetFlying?:boolean};
/** An explicit identity/weapon resolver, shared by all effect owners. Heroes keep
 * their approved adapters; carrier children resolve before their mother's family. */
export function combatFxProfile(u:Identity|undefined):CombatFxProfile|undefined{
 if(!u||u.heroId||u.summonKind&&u.rewardSourceKind==='hero')return undefined;
 if(u.summonKind==='interceptor')return COMBAT_FX_PROFILES.get('interceptor');
 let key:string=u.unitType??'';
 if(key==='science_vessel')key='science-vessel';
 else if(key==='tank'&&(u.siege||u.mode==='siege'||u.eliteId==='tank.1'&&(u.team==='player'||u.sourceTeam==='player')))key='tank-siege';
 else if(key==='hellion'&&u.nativeMode==='hellbat')key='hellbat';
 else if(key==='viking'&&u.nativeMode==='viking_assault')key='viking-assault';
 else if(key==='thor')key=u.activeWeapon==='LanceMissileLaunchers'?'thor-high-impact':u.activeWeapon==='JavelinMissileLaunchers'?'thor-air':'thor-ground';
 else if(key==='queen')key=u.activeWeapon==='Talons'?'queen-melee':u.activeWeapon==='AcidSpines'?'queen-air':'queen-ground';
 else if(key==='high_templar')key='high-templar';
 else if(key==='void_ray')key='void-ray';
 return COMBAT_FX_PROFILES.get(key);
}
export const sourceOwnsWeapon=(u:Identity|undefined)=>{const p=combatFxProfile(u);return !!p&&!['repair','healing'].includes(p.kind);};
export const sourceOwnsFlight=(u:Identity|undefined)=>!!combatFxProfile(u)?.models.flight?.length;
export function sourceOwnsEvent(e:VisualEvent){
 const p=combatFxProfile(e);if(!p)return false;
 if(['attack','projectile-impact'].includes(e.kind))return !['repair','healing'].includes(p.kind);
 if(e.kind==='weapon-area')return ['lurker','colossus'].includes(e.unitType??'')&&!e.eliteId;
 if(e.unitType==='high_templar'&&['storm-start','skill-impact'].includes(e.kind))return true;
 return e.kind==='bile-impact'&&e.unitType==='ravager'||['baneling-recover','death'].includes(e.kind)&&e.unitType==='baneling'||e.kind==='skill-heal'&&e.unitType==='queen';
}
