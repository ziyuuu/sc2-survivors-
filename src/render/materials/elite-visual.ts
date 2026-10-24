import * as THREE from 'three';
import type {EliteId} from '../../data/elites';
import type {Entity} from '../../simulation/types';
import {ELITE_VISUAL_PROFILES} from '../../data/elite-visual-profiles';
import {eliteFixedGrowth} from '../../data/terran-elites';
const colors=new Map<number,readonly [number,number,number]>();
const linearColor=(hex:number)=>{let rgb=colors.get(hex);if(!rgb){const c=new THREE.Color(hex);rgb=[c.r,c.g,c.b];colors.set(hex,rgb);}return rgb;};
export function eliteVisualProfile(unit:{eliteId?:EliteId;heroId?:string}){return unit.eliteId&&!unit.heroId?ELITE_VISUAL_PROFILES[unit.eliteId]:undefined;}
/** The flagship shares original art with elite Carriers but keeps its own original normalization. */
export function displayAssetModelKey(key:string){return key.replace(/^hero\.purifier_flagship(?=\.|$)/,'elite.carrier.1');}
export function displayLoadModelKey(key:string,type:string){return type==='purifier_flagship'&&key==='elite.carrier.1'?'hero.purifier_flagship':key;}
/** Bodies, weapon attachments, corpses and diagnostic inspection share this resolver. */
export function displayModelKey(unit:{eliteId?:EliteId;heroId?:string;modelKey?:string;unitType:string}){
 if(unit.modelKey==='interceptor')return unit.modelKey;
 if(unit.heroId==='purifier_flagship')return 'hero.purifier_flagship';
 if(unit.heroId)return unit.modelKey??unit.unitType;
 const profile=eliteVisualProfile(unit);
 if(profile&&unit.modelKey?.startsWith(profile.model+'.'))return unit.modelKey;
 return profile?.model??unit.modelKey??unit.unitType;
}
type DisplayUnit=Pick<Entity,'eliteId'|'heroId'|'modelKey'|'unitType'|'nativeMode'|'mode'|'action'>;
export function displayActiveModelKey(unit:DisplayUnit){
 const base=displayModelKey(unit);if(unit.heroId||unit.modelKey==='interceptor')return base;
 if(unit.unitType==='tank')return base+(unit.action==='sieging'||unit.action==='unsieging'?'.morph':unit.mode==='siege'?'.siege':'');
 const form=unit.nativeMode&&eliteVisualProfile(unit)?.forms[unit.nativeMode];if(form)return form;
 if(!unit.eliteId&&unit.unitType==='hellion'&&unit.nativeMode==='hellbat')return 'hellion.hellbat';
 if(!unit.eliteId&&unit.unitType==='viking'&&unit.nativeMode==='viking_assault')return 'viking.assault';
 return base;
}
export function displayDeathModelKey(unit:DisplayUnit){return unit.unitType==='tank'&&!unit.heroId?displayModelKey(unit):displayActiveModelKey(unit);}
/** Observe existing state only. Never call the gameplay accessors which initialize combat records. */
export function unitMaterialIdentity(unit:Entity,time:number){
 if(unit.fun?.kind==='whitePack'&&unit.fun.role==='actor'&&unit.fun.mode==='passive')return {teamColor:linearColor(0xffffff),activity:.2,apparition:{tint:[2.6,2.6,2.6] as const,opacity:1}};
 if(unit.fun?.kind==='infectedTerrans'){
  const f=unit.fun,friend=f.mode==='friend',charging=f.mode==='swelling'||f.mode==='charging',healing=Math.min(1,f.healed/Math.max(1,unit.maxHp*.3));
  return {teamColor:linearColor(friend?0x63b8ec:charging?0xe55736:0xb09459),activity:charging?.5:.15,apparition:{tint:(friend?[.78,1.3,1.55]:charging?[1.7,.65,.45]:[1.08-healing*.3,.78+healing*.5,.72+healing*.65]) as [number,number,number],opacity:1}};
 }
 const encounter=unit.encounter;
 if(encounter&&encounter.role!=='attacker'){
  const kind=encounter.kind,color=kind==='golden'?0xffd260:kind==='giant'?0xb558f7:0xc5ffe9;
  const tint:readonly [number,number,number]=kind==='golden'?[3.3,2.4,.65]:kind==='giant'?[1.4,.55,2.3]:[2.2,5,12];
  return {teamColor:linearColor(color),activity:.4,apparition:{tint,opacity:1}};
 }
 const profile=eliteVisualProfile(unit),t=unit.eliteCombat,z=unit.zergEliteCombat,p=unit.protossEliteCombat;let activity=0;
 if(profile&&unit.team==='player'&&unit.hp>0)switch(profile.activity){
  case 'warmup':activity=t?.started!=null&&t.lastFire>=time-2&&t.coolUntil<=time?Math.min(1,(time-t.started)/5):0;break;
  case 'overload':{const phase=t?.started!=null?(time-t.started)%16:-1;activity=phase>=4&&phase<12?1:0;break;}
  case 'transform-boost':activity=(t?.boosted??0)>0?1:0;break;
  case 'terran-charge':activity=t&&t.lastFire<time-2?Math.min(1,t.charge/(2600*eliteFixedGrowth(unit.rank))):0;break;
  case 'acid-pressure':activity=Math.min(1,(z?.stored??0)/Math.max(1,unit.maxHp*2));break;
  case 'regeneration':activity=(z?.regenUntil??0)>time?1:0;break;
  case 'zerg-boost':activity=(z?.boostUntil??0)>time?1:0;break;
  case 'psionic-stacks':activity=(p?.stackUntil??0)>time?Math.min(1,(p?.stacks??0)/5):0;break;
  case 'psionic-boost':activity=(p?.boostUntil??0)>time?1:0;break;
  case 'blink-barrier':activity=p&&(p.barrierUntil>time)?Math.min(1,p.barrier/Math.max(1,(unit.maxShield??0)*.8)):0;break;
  case 'judgment':activity=p?.chargedStrike?1:0;break;
  case 'beam-lock':activity=p&&p.lastFire>=time-2&&p.target!==null?Math.min(1,Math.max(0,p.lastFire-p.lockAt)/5):0;break;
  case 'carrier-overdrive':activity=(p?.overdriveUntil??0)>time?1:0;break;
 }
 return {teamColor:linearColor(profile?.teamColor??(unit.race==='zerg'?0x8aa278:unit.race==='protoss'?0x74b5d1:0x5282b4)),activity};
}
