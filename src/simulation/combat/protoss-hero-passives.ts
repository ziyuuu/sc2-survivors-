import {observeRecovery} from '../observation';
import {compositeHeroBuff,teamProtection} from './team-auras';
import type {World} from '../world';
import type {Entity,Body} from '../types';
import {PROTOSS_HERO_RULES as R,isProtossHero,protossHeroGrowth} from '../../data/protoss-heroes';
import {permanentBattleBody,inHeroAura} from './hero-ground-auras';
import {talentModifiers} from './expedition-combat';
export interface ProtossCombatState {cycles:number;power:number;eliteHits:number;opening:number;openingNext:number;openingStrike:boolean;lastFire:number;overdriveUntil:number;overdriveNext:number;veilUntil:number;veilNext:number;veilEpisode:boolean}
export interface ShieldWindow {id:number;source:number;rank:number;until:number;next:number;targets:{id:number;maxShield:number}[]}
export interface VoidEcho {id:number;source:Entity;target:number;damage:number;at:number}
export interface ProtossHeroRun {shields:ShieldWindow[];echoes:VoidEcho[]}
export const newProtossHeroRun=():ProtossHeroRun=>({shields:[],echoes:[]});
export const protossState=(u:Entity)=>u.protossCombat??={cycles:0,power:0,eliteHits:0,opening:0,openingNext:0,openingStrike:false,lastFire:-100,overdriveUntil:0,overdriveNext:0,veilUntil:0,veilNext:0,veilEpisode:false};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const nativeBody=(u:Entity)=>permanentBattleBody(u)&&(u.maxShield??0)>0;
const legal=(w:World,u:Entity,b:Body)=>b.hp>0&&b.owner!==u.owner&&w.visibleTo(b,u.owner)&&w.targetAllowed(u,b)&&w.hasAttackLine(u,b);
export function protossShieldArmor(w:World,u:Entity){return compositeHeroBuff(w,u).shieldArmorFlat;}
export function protossStats(w:World,u:Entity){const s=protossState(u);return {health:1,damage:u.heroId==='alarak'?1+s.power*R.alarak.powerDamage:1,armor:u.heroId==='alarak'?s.power*R.alarak.powerArmor:0,speed:u.heroId==='fenix'&&s.overdriveUntil>w.time?2:1};}
function gainShield(w:World,source:Entity,a:Entity,amount:number,castId?:number){const gain=Math.min(Math.max(0,(a.maxShield??0)-(a.shield??0)),amount);if(gain<=0)return;a.shield=(a.shield??0)+gain;w.stats.healed+=gain;observeRecovery(w,source,a,0,gain);w.visual('skill-heal',source,a,castId);}
function shieldPatients(w:World,u:Entity,range:number,includeFull=false){return w.allies().filter(a=>nativeBody(a)&&(includeFull||(a.shield??0)<a.maxShield!)&&w.edgeDistance(u,a)<=range&&w.hasAttackLine(u,a)).sort((a,b)=>(a.shield??0)/a.maxShield!-(b.shield??0)/b.maxShield!||a.id-b.id).slice(0,7);}
export function registerShieldReconstruction(w:World,u:Entity,id:number,rank:number,targets:Entity[]){const n=Math.max(0,Math.min(4,rank-1)),receipt:ShieldWindow={id,source:u.id,rank,until:w.time+8,next:w.time+1,targets:targets.map(a=>({id:a.id,maxShield:a.maxShield!}))};w.protossHeroes.shields=w.protossHeroes.shields.filter(r=>r.source!==u.id);w.protossHeroes.shields.push(receipt);for(const a of targets)gainShield(w,u,a,a.maxShield!*R.artanis.immediate[n],id);w.visual('barrier-start',u,u,id);}
export function protossIncomingFactor(w:World,u:Entity,directWeapon=false){return 1-teamProtection(w,u,directWeapon);}
export function protossBeforeAttack(w:World,u:Entity){const s=u.protossCombat;if(s?.veilUntil){s.veilUntil=0;u.cloaked=!!u.heroId&&['zeratul','vorazun'].includes(u.heroId);}if(!isProtossHero(u.heroId))return;const p=protossState(u),idle=w.time-p.lastFire;p.cycles++;p.lastFire=w.time;p.openingStrike=false;
 if(u.heroId==='zeratul'){if(!p.opening&&u.cloaked&&idle>=2&&w.time>=p.openingNext){p.opening=R.zeratul.openingCycles;p.openingNext=w.time+R.zeratul.openingCooldown;}if(p.opening>0){if(p.opening===3&&w.time>=p.openingNext)p.openingNext=w.time+12;p.opening--;p.openingStrike=true;}}
}
export function protossMainFactor(w:World,u:Entity,b:Body){if(u.heroId==='zeratul'&&u.protossCombat?.openingStrike)return R.zeratul.openingFactor;if(u.heroId==='vorazun'){const e=w.entities.get(b.id);if(e&&((e.stoppedUntil??0)>w.time||(e.moveSlowUntil??0)>w.time||(e.attackSlowUntil??0)>w.time))return R.vorazun.controlledFactor;}return 1;}
export function protossPrimary(w:World,snapshot:Entity,target:Body,dealt:number){const u=w.entities.get(snapshot.id);if(!u||u.hp<=0||!isProtossHero(snapshot.heroId)||dealt<=0)return;const s=protossState(u),cycles=snapshot.protossCombat?.cycles??s.cycles;
 if(u.heroId==='alarak'&&['elite','boss','lord'].includes((target as Entity).enemyTier??'')){s.eliteHits++;if(s.eliteHits>=3){s.eliteHits=0;s.power=Math.min(20,s.power+1);w.refreshStats(u);}}
 if(u.heroId==='zeratul'&&cycles%R.zeratul.echoEvery===0)w.protossHeroes.echoes.push({id:w.nextId++,source:structuredClone(snapshot),target:target.id,damage:dealt*R.zeratul.echoFraction,at:w.time+R.zeratul.echoDelay});
 if(u.heroId==='artanis'&&cycles%R.artanis.cleaveEvery===0){for(const b of w.entities.values()){if(b.id===target.id||b.flying||!legal(w,u,b)||w.edgeDistance(u,b)>u.attackRange+1.2)continue;const delta=Math.atan2(Math.sin(Math.atan2(b.x-u.x,b.z-u.z)-snapshot.attackFacing),Math.cos(Math.atan2(b.x-u.x,b.z-u.z)-snapshot.attackFacing));if(Math.abs(delta)<=R.artanis.cleaveDegrees*Math.PI/360){w.hit(b,snapshot.weaponDamage*2,[],1,u.owner,.5,0,u.id,false,false,0,true);w.visual('weapon-area',u,b);}}}
 if(u.heroId==='fenix'&&cycles%R.fenix.solarEvery===0){for(const b of w.entities.values())if(legal(w,u,b)&&dist(b,target)<=R.fenix.solarRadius+b.unitRadius&&(!w.terrain||w.terrain.lineOfFire(target,b,false,b.flying)))w.hit(b,snapshot.weaponDamage*R.fenix.solarFraction,[],1,u.owner,.5,0,u.id,false,false,0,true);w.visual('weapon-area',u,target);}
}
export function protossAfterDamage(w:World,u:Entity,oldShield:number){if(u.hp<=0||!isProtossHero(u.heroId)||oldShield<=(u.shield??0))return;const s=protossState(u);
 if(u.heroId==='fenix'&&oldShield>0&&(u.shield??0)<=0&&w.time>=s.overdriveNext){s.overdriveUntil=w.time+6;s.overdriveNext=w.time+20;u.shield=u.maxShield!*R.fenix.restore;observeRecovery(w,u,u,0,u.shield);w.refreshStats(u);w.visual('barrier-start',u);}
 if(u.heroId==='purifier_flagship'&&w.time>=s.overdriveNext){s.overdriveUntil=w.time+6;s.overdriveNext=w.time+18;w.visual('barrier-start',u);}
}
export function protossDeath(w:World,e:Entity){if(e.owner!=='zerg'||e.attributes.includes('Structure'))return;const a=w.heroEntity('alarak');if(a&&a.hp>0&&dist(a,e)<=R.alarak.killRange+e.unitRadius&&w.hasAttackLine(a,e)){const s=protossState(a);s.power=Math.min(20,s.power+1);w.refreshStats(a);}}
export function tickProtossHero(w:World,u:Entity,dt:number){if(u.hp<=0)return;const v=w.heroEntity('vorazun'),old=u.protossCombat;
 if(permanentBattleBody(u)&&(v||old?.veilUntil)){const s=protossState(u),idle=w.time-Math.max(u.lastShotAt,u.lastDamagedAt??-100)>=2,inside=!!v&&v.hp>0&&dist(v,u)<=8+u.unitRadius&&w.hasAttackLine(v,u);if(!idle)s.veilEpisode=false;
  if(idle&&inside&&!s.veilEpisode&&w.time>=s.veilNext&&!u.cloaked){s.veilEpisode=true;s.veilUntil=w.time+6;s.veilNext=w.time+14;u.cloaked=true;}
  if(s.veilUntil&&(!inside||!idle||s.veilUntil<=w.time)){s.veilUntil=0;u.cloaked=!!u.heroId&&['zeratul','vorazun'].includes(u.heroId);}
 }
 if(!isProtossHero(u.heroId))return;const s=protossState(u);if(u.heroId==='zeratul'&&w.time-Math.max(s.lastFire,u.lastDamagedAt??-100)>=2&&w.time>=s.openingNext&&u.cloaked&&!s.opening)s.opening=3;
 if(u.heroId==='artanis'||u.heroId==='purifier_flagship'){const rule=R[u.heroId],patients=shieldPatients(w,u,rule.range);u.healTargets=[];for(const a of patients){const before=a.shield??0;gainShield(w,u,a,rule.shieldRate*protossHeroGrowth(u.rank).passive*(1+(talentModifiers(w,u).healingPct??0))*dt);if((a.shield??0)>before)u.healTargets.push(a.id);}}
}
export function tickProtossHeroState(w:World){const remaining:ShieldWindow[]=[];for(const r of w.protossHeroes.shields){const u=w.entities.get(r.source);if(!u||u.hp<=0)continue;while(r.next<=w.time+1e-8&&r.next<=r.until+1e-8){for(const f of r.targets){const a=w.entities.get(f.id);if(a&&nativeBody(a)&&w.edgeDistance(u,a)<=6&&w.hasAttackLine(u,a))gainShield(w,u,a,f.maxShield*R.artanis.pulse[r.rank-1],r.id);}r.next+=1;}if(r.next<=r.until+1e-8)remaining.push(r);}w.protossHeroes.shields=remaining;
 const echoes:VoidEcho[]=[];for(const e of w.protossHeroes.echoes){if(e.at>w.time+1e-8){echoes.push(e);continue;}const live=w.entities.get(e.source.id),target=w.body(e.target);if(live&&live.hp>0&&target&&legal(w,live,target)&&w.edgeDistance(live,target)<=e.source.attackRange+.3){w.hit(target,e.damage,[],1,'terran',0,1,live.id,false,false,0,true);w.visual('weapon-area',live,target,e.id);}}w.protossHeroes.echoes=echoes;
}
export function validateProtossCombat(s:ProtossCombatState){const {veilEpisode,openingStrike,...numbers}=s;if(!Object.values(numbers).every(Number.isFinite)||typeof veilEpisode!=='boolean'||typeof openingStrike!=='boolean'||!Number.isSafeInteger(s.cycles)||s.cycles<0||!Number.isInteger(s.power)||s.power<0||s.power>20||!Number.isInteger(s.eliteHits)||s.eliteHits<0||s.eliteHits>2||!Number.isInteger(s.opening)||s.opening<0||s.opening>3)throw Error('神族英雄被动无效');}
export function validateProtossHeroRun(s:ProtossHeroRun){if(!s||!Array.isArray(s.shields)||!Array.isArray(s.echoes)||s.shields.length>3||s.echoes.length>256||new Set(s.shields.map(r=>r.id)).size!==s.shields.length||new Set(s.shields.map(r=>r.source)).size!==s.shields.length||new Set(s.echoes.map(e=>e.id)).size!==s.echoes.length)throw Error('神族英雄收据无效');const id=(n:number)=>Number.isSafeInteger(n)&&n>0;
 for(const r of s.shields)if(!id(r.id)||!id(r.source)||!Number.isInteger(r.rank)||r.rank<1||r.rank>5||![r.next,r.until].every(Number.isFinite)||!Array.isArray(r.targets)||r.targets.length>7||new Set(r.targets.map(f=>f.id)).size!==r.targets.length||r.targets.some(f=>!id(f.id)||!Number.isFinite(f.maxShield)||f.maxShield<=0))throw Error('回盾窗口无效');
 for(const e of s.echoes){if(!id(e.id)||!id(e.target)||!e.source||!id(e.source.id)||e.source.heroId!=='zeratul'||e.source.owner!=='terran'||!Number.isInteger(e.source.rank)||e.source.rank<1||e.source.rank>5||![e.at,e.damage,e.source.x,e.source.z,e.source.attackRange,e.source.bornAt].every(Number.isFinite)||e.damage<0)throw Error('虚空回响无效');if(e.source.protossCombat)validateProtossCombat(e.source.protossCombat);}
}
