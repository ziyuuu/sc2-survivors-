import type {World} from '../world';
import type {Entity,Body} from '../types';
import {HERO_GROUND_AURAS as A} from '../../data/hero-upgrades';
import {HERO_TEAM_AURAS} from '../../data/team-auras';
import {heroAura} from './terran-hero-passives';
import {permanentTeamBody,compositeHeroInRange,compositeHeroBuff,compositeHeroDebuff,compositeEliteBuff,compositeVulnerability} from './team-auras';
type AuraId=keyof typeof A;
/** Workers, transports, independent temporary bodies and structures never receive these buffs. */
export const permanentBattleBody=permanentTeamBody;
export function inHeroAura(w:World,id:AuraId,b:Body){if(Object.hasOwn(HERO_TEAM_AURAS,id))return compositeHeroInRange(w,id,b);const source=w.heroEntity(id);return !!source&&source.hp>0&&b.hp>0&&Math.hypot(b.x-source.x,b.z-source.z)<=(A[id].radius??Infinity)+b.unitRadius&&w.hasAttackLine(source,b);}
export function groundHeroBuff(w:World,u:Entity){const h=compositeHeroBuff(w,u),result={damage:h.damage,speed:h.speed,armor:h.armorFlat,health:h.maxHp,shield:h.maxShield,move:h.move,armorPct:h.armorPct,shieldArmorPct:h.shieldArmorPct,shieldArmor:h.shieldArmorFlat};if(!permanentBattleBody(u))return result;
 if(inHeroAura(w,'raynor',u))result.damage+=A.raynor.damage;
 if(u.attributes.includes('Mechanical')&&inHeroAura(w,'swann',u))result.armor+=A.swann.armor;
 if(inHeroAura(w,'yamato_battlecruiser',u))result.speed+=A.yamato_battlecruiser.speed;return result;
}
const enemyBody=(b:Body)=>b.owner==='zerg'&&b.hp>0&&!b.attributes.includes('Structure');
export const heroGroundSlow=(w:World,u:Entity)=>enemyBody(u)?Math.max(inHeroAura(w,'tychus',u)?A.tychus.slow:0,compositeHeroDebuff(w,u,'attackSlow')):0;
export const heroGroundSuppression=(w:World,u:Entity)=>enemyBody(u)?Math.max(inHeroAura(w,'tosh',u)?A.tosh.suppression:0,compositeHeroDebuff(w,u,'weaponSuppression')):0;
export const heroWeaponVulnerability=(w:World,b:Body)=>enemyBody(b)?1+(inHeroAura(w,'nova',b)?A.nova.vulnerability:0)+compositeHeroDebuff(w,b,'vulnerability')+compositeVulnerability(w,b):1;
const key=(w:World,u:Entity)=>{const h=groundHeroBuff(w,u),e=compositeEliteBuff(w,u),old=heroAura(w,u);return Object.values(h).some(Boolean)||Object.values(old).some(Boolean)||Object.entries(e).some(([k,n])=>n!==(k==='family'?1:0))?JSON.stringify([h,e,old]):'';};
export function rememberGroundHeroBuff(w:World,u:Entity){const k=permanentBattleBody(u)?key(w,u):'';if(k)w.heroAuraMembership.set(u.id,k);else w.heroAuraMembership.delete(u.id);}
export function rebuildGroundHeroBuffs(w:World){w.heroAuraMembership.clear();for(const u of w.allies())if(permanentBattleBody(u)&&key(w,u))w.heroAuraMembership.set(u.id,'restored');}
/** Membership is derived; immutable base stats and saved aura factors preserve injuries. */
export function refreshGroundHeroBuffs(w:World){const active=new Set<number>();for(const u of w.entities.values()){if(!permanentBattleBody(u))continue;active.add(u.id);const next=key(w,u);if((w.heroAuraMembership.get(u.id)??'')!==next){w.refreshStats(u);}}for(const id of w.heroAuraMembership.keys())if(!active.has(id))w.heroAuraMembership.delete(id);}
