import {observeRecovery} from '../observation';
import type {World} from '../world';
import type {Body,Entity} from '../types';
import {HERO_TEAM_AURAS,ELITE_TEAM_AURAS} from '../../data/team-auras';
import {HEROES,type HeroId} from '../../data/heroes';
import {SOURCE_UNIT_DETAILS} from '../../data/expansion-units';

export interface TeamStats {damage:number;speed:number;maxHp:number;maxShield:number;armorPct:number;shieldArmorPct:number;armorFlat:number;shieldArmorFlat:number;move:number;regenHpPerSecond:number;damageReduction:number;directWeaponReduction:number}
type Rule={radius:number|null;kind:string;stats:Partial<TeamStats>&{weaponSuppression?:number;attackSlow?:number;moveSlow?:number;armorReduction?:number;defenseReduction?:number;vulnerability?:number;healingSuppression?:number};bossControlScale?:number};
const heroes=HERO_TEAM_AURAS as Record<string,Rule>,elites=ELITE_TEAM_AURAS as Record<string,Rule>;
export const emptyTeamStats=():TeamStats=>({damage:0,speed:0,maxHp:0,maxShield:0,armorPct:0,shieldArmorPct:0,armorFlat:0,shieldArmorFlat:0,move:0,regenHpPerSecond:0,damageReduction:0,directWeaponReduction:0});
// The approved rule table and output fields are static. Reuse their iteration
// order, while still evaluating live source/recipient eligibility on every call.
const heroRules=Object.entries(heroes),teamStatKeys=Object.keys(emptyTeamStats()) as (keyof TeamStats)[];
export const permanentTeamBody=(u:Entity)=>u.hp>0&&u.owner==='terran'&&!u.temporary&&!u.summonKind&&!u.attributes.includes('Structure')&&!['scv','drone','probe'].includes(u.unitType);
export const nativeShieldBody=(u:Entity)=>u.heroId?HEROES[u.heroId].shield>0:((SOURCE_UNIT_DETAILS as unknown as Record<string,{shields:number}|null>)[u.unitType]?.shields??0)>0;
const biological=(u:Entity)=>u.attributes.includes('Biological');
const mechanical=(u:Entity)=>u.attributes.includes('Mechanical');
const boss=(b:Body)=>'enemyTier' in b&&['boss','lord'].includes(String(b.enemyTier));
export function teamRange(w:World,a:Entity,b:Body,r:number|null){return a.hp>0&&b.hp>0&&(r===null||Math.hypot(a.x-b.x,a.z-b.z)<=r+b.unitRadius&&w.hasAttackLine(a,b));}
export function compositeHeroInRange(w:World,id:HeroId,b:Body){const r=heroes[id],a=w.heroEntity(id);return !!r&&!!a&&teamRange(w,a,b,r.radius)&&(r.kind==='buff'||b.owner!==a.owner&&!b.attributes.includes('Structure')&&w.visibleTo(b,a.owner));}
function heroRecipient(id:string,u:Entity){return ['kerrigan','niadra','hots_leviathan'].includes(id)?biological(u):id==='fenix'?mechanical(u):['artanis','purifier_flagship'].includes(id)?nativeShieldBody(u):true;}
export function compositeHeroBuff(w:World,u:Entity){const result=emptyTeamStats();if(!permanentTeamBody(u))return result;for(const [id,r]of heroRules){if(r.kind!=='buff'||!heroRecipient(id,u)||!compositeHeroInRange(w,id as HeroId,u))continue;for(const key of teamStatKeys)result[key]+=r.stats[key]??0;}return result;}
export function compositeHeroDebuff(w:World,b:Body,key:'weaponSuppression'|'attackSlow'|'moveSlow'|'armorReduction'|'defenseReduction'|'vulnerability'|'healingSuppression'){
 if(b.owner!=='zerg'||b.hp<=0||b.attributes.includes('Structure'))return 0;let n=0;for(const[id,r]of heroRules)if(r.kind==='debuff'&&compositeHeroInRange(w,id as HeroId,b)){const value=r.stats[key]??0;n=key==='vulnerability'?n+value:Math.max(n,value);}return n;
}
const eliteSource=(u:Entity)=>!!u.eliteId&&!!elites[u.eliteId]&&permanentTeamBody(u)&&!u.heroId;
// eliteSource includes every allies() qualification. Scan the live map in the
// same order without first allocating and filling an intermediate ally array.
export function compositeEliteBuff(w:World,u:Entity){const result={...emptyTeamStats(),family:1};if(!permanentTeamBody(u))return result;const seen=new Set<string>();for(const a of w.entities.values()){
 if(!eliteSource(a)||seen.has(a.eliteId!))continue;const id=a.eliteId!,r=elites[id];if(r.kind==='debuff'||r.kind==='conditional-debuff'||id==='queen.2')continue;
 const eligible=id==='zergling.3'?u.unitType==='zergling'&&!u.heroId:id==='zealot.3'?u.unitType==='zealot'&&!u.heroId:['queen.1','mutalisk.3'].includes(id)?biological(u):id==='sentry.1'||id==='phoenix.3'?nativeShieldBody(u):id==='corruptor.2'||id==='carrier.3'?u.flying:id==='immortal.3'?!u.flying:false;
 if(!eligible||!teamRange(w,a,u,r.radius))continue;
 if(id==='mutalisk.3'||id==='phoenix.3'){if(w.time-Math.max(a.bornAt,a.lastShotAt,a.lastDamagedAt??-100)<2)continue;result.move=Math.max(result.move,r.stats.move??0);seen.add(id);continue;}
 seen.add(id);if(id==='zergling.3'||id==='zealot.3'){result.family=1.2;continue;}
 for(const key of teamStatKeys){const value=r.stats[key]??0;if(['maxHp','maxShield','damageReduction','directWeaponReduction'].includes(key))result[key]=Math.max(result[key],value);else result[key]+=value;}
 }return result;
}
export function compositeEliteDebuff(w:World,b:Body,key:'damage'|'speed'|'move'|'armor'|'defense'){
 if(b.owner!=='zerg'||b.hp<=0||b.attributes.includes('Structure'))return 0;const property={damage:'weaponSuppression',speed:'attackSlow',move:'moveSlow',armor:'armorReduction',defense:'defenseReduction'}[key]as keyof Rule['stats'];let n=0;
 for(const a of w.entities.values()){if(!eliteSource(a))continue;const r=elites[a.eliteId!];if(r.kind!=='debuff'||!teamRange(w,a,b,r.radius)||!w.visibleTo(b,a.owner))continue;const k=boss(b)&&['damage','speed','move'].includes(key)?r.bossControlScale??1:1;n=Math.max(n,(r.stats[property]??0)*k);}return n;
}
export function compositeVulnerability(w:World,b:Body){let hydra=0;for(const p of w.zergElites.poisons)if(p.kind==='hydra'&&p.target===b.id&&p.until>w.time)hydra=Math.max(hydra,p.layers*.05);const feedback=w.protossElites?.debuffs.reduce((n,d)=>d.target===b.id&&d.until>w.time?Math.max(n,d.vulnerability):n,0)??0;return hydra+feedback;}
export function teamProtection(w:World,u:Entity,directWeapon:boolean){const body=u.summonOwnerId===undefined?u:w.entities.get(u.summonOwnerId);if(!body||!permanentTeamBody(body))return 0;const h=compositeHeroBuff(w,body),e=compositeEliteBuff(w,body);let reduction=Math.max(h.damageReduction,e.damageReduction,directWeapon?e.directWeaponReduction:0);
 for(const f of w.protossElites?.fields??[]){const source=w.entities.get(f.source.id);if(f.kind==='guardian'&&f.until>w.time&&source?.hp&&nativeShieldBody(body)&&teamRange(w,source,body,f.radius))reduction=Math.max(reduction,.25);}return reduction;
}

export interface TeamBlood {source:number;target:number;until:number;spent:number;spentAt:number}
export interface TeamBarrier {id:number;source:number;target:number;kind:'blood'|'phase';amount:number;maximum:number;basis:number;charge:number;until:number}
export interface TeamPlague {source:number;target:number;maximum:number;next:number;inside:boolean;lastSeen:number}
export interface TeamAuraRun {blood:TeamBlood[];barriers:TeamBarrier[];entryReady:Record<string,number>;plague:Record<string,TeamPlague>}
export const newTeamAuraRun=():TeamAuraRun=>({blood:[],barriers:[],entryReady:{},plague:{}});
export function teamHealingFactor(w:World,u:Entity,active=true){const boost=active&&w.teamAuras.blood.some(b=>b.target===u.id&&b.until>w.time)?.3:0;return (1+boost)*(1-compositeHeroDebuff(w,u,'healingSuppression'));}
export function recordTeamTransfusion(w:World,source:Entity,target:Entity,effective:number){if(effective<=0||!permanentTeamBody(target)||!biological(target))return;let b=w.teamAuras.blood.find(b=>b.target===target.id);if(!b){b={source:source.id,target:target.id,until:0,spent:0,spentAt:w.time};w.teamAuras.blood.push(b);}b.source=source.id;b.until=w.time+6;}
export function teamWeaponLeech(w:World,source:Entity,life:number){if(life<=0||!permanentTeamBody(source))return;const b=w.teamAuras.blood.find(b=>b.target===source.id&&b.until>w.time);if(!b)return;const own=source.eliteId==='zergling.3'?.25:source.eliteId==='mutalisk.3'?.35:0,fraction=Math.max(0,.15-own);if(w.time>=b.spentAt+1){b.spentAt=w.time;b.spent=0;}const gain=Math.min(source.maxHp-source.hp,life*fraction*teamHealingFactor(w,source,false),Math.max(0,source.maxHp*.1-b.spent));if(gain>0){source.hp+=gain;b.spent+=gain;w.stats.healed+=gain;observeRecovery(w,b.source,source,gain);w.visual('support-impact',source);}}
export function teamEntryBarrier(w:World,source:Entity,charge:number){if(charge<=0||!['mutalisk.3','phoenix.3'].includes(source.eliteId??''))return;const key=String(source.id);if((w.teamAuras.entryReady[key]??0)>w.time)return;w.teamAuras.entryReady[key]=w.time+12;const phase=source.eliteId==='phoenix.3';
 const pool=w.allies().filter(b=>b.id!==source.id&&permanentTeamBody(b)&&(phase?nativeShieldBody(b):biological(b))&&teamRange(w,source,b,8)).sort((a,b)=>(phase?(a.shield??0)/(a.maxShield||1)-(b.shield??0)/(b.maxShield||1):a.hp/a.maxHp-b.hp/b.maxHp)||Math.hypot(a.x-source.x,a.z-source.z)-Math.hypot(b.x-source.x,b.z-source.z)||a.id-b.id).slice(0,5);
 for(const b of pool){const basis=phase?(b.maxShield??0):b.maxHp,amount=basis*(phase?.20:.15)*charge;let receipt=w.teamAuras.barriers.find(r=>r.source===source.id&&r.target===b.id&&r.until>w.time);if(receipt){receipt.amount=Math.max(receipt.amount,amount);if(amount>=receipt.maximum){receipt.maximum=amount;receipt.basis=basis;receipt.charge=charge;}receipt.until=w.time+(phase?6:4);}else {receipt={id:w.nextId++,source:source.id,target:b.id,kind:phase?'phase':'blood',amount,maximum:amount,basis,charge,until:w.time+(phase?6:4)};w.teamAuras.barriers.push(receipt);}w.visual('barrier-start',b);}
}
export function absorbTeamBarrier(w:World,u:Entity,amount:number){for(const b of w.teamAuras.barriers)if(b.target===u.id&&b.until>w.time){const absorbed=Math.min(b.amount,amount);b.amount-=absorbed;amount-=absorbed;if(amount<=0)break;}return amount;}
export function tickTeamAuras(w:World,dt:number){const s=w.teamAuras;s.blood=s.blood.filter(b=>b.until>w.time&&(w.entities.get(b.target)?.hp??0)>0);s.barriers=s.barriers.filter(b=>b.until>w.time&&b.amount>0&&(w.entities.get(b.target)?.hp??0)>0);
 for(const u of w.allies()){if(!permanentTeamBody(u))continue;const regen=compositeHeroBuff(w,u).regenHpPerSecond+compositeEliteBuff(w,u).regenHpPerSecond;if(regen){const gain=Math.min(u.maxHp-u.hp,u.maxHp*regen*dt*teamHealingFactor(w,u,false));u.hp+=gain;w.stats.healed+=gain;observeRecovery(w,undefined,u,gain);}}
 const source=w.heroEntity('stukov'),inside=new Set<string>();if(source?.hp)for(const b of w.entities.values()){if(!compositeHeroInRange(w,'stukov',b))continue;const key=String(b.id);inside.add(key);let p=s.plague[key];if(!p||!p.inside){p=s.plague[key]={source:source.id,target:b.id,maximum:b.maxHp,next:Math.max(w.time+1,p?.next??0),inside:true,lastSeen:w.time};}p.lastSeen=w.time;
  if(w.time+1e-8>=p.next){p.next=w.time+1;const factor=boss(b)?.012:b.enemyTier==='elite'?.03:.06;w.hit(b,p.maximum*factor,[],1,'terran',0,0,source.id);w.visual('skill-dot',source,b);}}
 for(const[key,p]of Object.entries(s.plague)){if(!inside.has(key))p.inside=false;if((w.entities.get(p.target)?.hp??0)<=0||w.time-p.lastSeen>2)delete s.plague[key];}
 for(const[key,next]of Object.entries(s.entryReady))if(!w.entities.get(Number(key))?.hp&&next<=w.time)delete s.entryReady[key];
}
/** Aura-only max-pool changes preserve wounds; rank/body changes retain the original absolute-loss rule. */
export function preserveTeamWounds(u:Entity,old:{hp:number;maxHp:number;shield:number;maxShield:number;factor?:{hp:number;shield:number}},factor:{hp:number;shield:number},fill:boolean){if(!fill){u.hp=Math.max(0,Math.min(u.maxHp,u.maxHp-(old.maxHp-old.hp)*factor.hp/(old.factor?.hp??1)));u.shield=Math.max(0,Math.min(u.maxShield??0,(u.maxShield??0)-(old.maxShield-old.shield)*factor.shield/(old.factor?.shield??1)));}u.teamAuraFactors=factor;}
export function validateTeamAuraRun(s:TeamAuraRun,time:number,entities:Map<number,Entity>){const id=(n:number)=>Number.isSafeInteger(n)&&n>0;if(!s||Object.keys(s).length!==4||!Array.isArray(s.blood)||!Array.isArray(s.barriers)||!s.entryReady||!s.plague||s.blood.length>512||s.barriers.length>256)throw Error('团队光环收据无效');
 const targets=new Set<number>();for(const b of s.blood){const u=entities.get(b.target);if(Object.keys(b).length!==5||!id(b.source)||!id(b.target)||targets.has(b.target)||![b.until,b.spent,b.spentAt].every(Number.isFinite)||b.until>time+6.001||b.spent<0||b.spentAt>time+.001||u&&(!biological(u)||u.temporary||u.summonKind||b.spent>1e12))throw Error('授血收据无效');targets.add(b.target);const a=entities.get(b.source);if(a&&a.eliteId!=='queen.2')throw Error('授血来源无效');}
 const seen=new Set<number>(),pairs=new Set<string>();for(const b of s.barriers){const u=entities.get(b.target),a=entities.get(b.source),key=b.source+':'+b.target;if(Object.keys(b).length!==9||!id(b.id)||seen.has(b.id)||pairs.has(key)||!id(b.source)||!id(b.target)||b.source===b.target||!['phase','blood'].includes(b.kind)||![b.amount,b.maximum,b.basis,b.charge,b.until].every(Number.isFinite)||b.amount<0||b.amount>b.maximum||b.maximum<=0||b.basis<=0||b.basis>1e12||b.charge<=0||b.charge>1||Math.abs(b.maximum-b.basis*(b.kind==='phase'?.2:.15)*b.charge)>1e-6||b.until>time+(b.kind==='phase'?6:4)+.001||u&&(u.temporary||u.summonKind)||a&&a.eliteId!==(b.kind==='phase'?'phoenix.3':'mutalisk.3'))throw Error('入战护障收据无效');seen.add(b.id);pairs.add(key);}
 for(const[key,next]of Object.entries(s.entryReady))if(!id(Number(key))||!Number.isFinite(next)||next>time+12.001||entities.get(Number(key))&&!['mutalisk.3','phoenix.3'].includes(entities.get(Number(key))!.eliteId??''))throw Error('入战光环冷却无效');
 for(const[key,p]of Object.entries(s.plague)){const b=entities.get(p.target),a=entities.get(p.source);if(Object.keys(p).length!==6||key!==String(p.target)||!id(p.target)||!id(p.source)||![p.maximum,p.next,p.lastSeen].every(Number.isFinite)||p.maximum<=0||p.maximum>1e12||p.next>time+1.001||p.lastSeen>time+.001||typeof p.inside!=='boolean'||b&&(b.owner!=='zerg'||b.attributes.includes('Structure'))||a&&a.heroId!=='stukov')throw Error('感染光环时钟无效');}
}
