import {SC2_UNITS} from '../data/sc2-units';
import type {Building} from '../simulation/types';
import {ELITES,type EliteId} from '../data/elites';
import {HEROES,type HeroId} from '../data/heroes';
import type {World} from '../simulation/world';
import type {Entity,Reward} from '../simulation/types';
export const rankLabel=(rank:number)=>['Ⅰ','Ⅱ','Ⅲ','Ⅳ','Ⅴ','Ⅵ','Ⅶ'][Math.max(0,Math.min(6,rank-1))];
export function specialUnitName(u:Entity){return u.heroId?HEROES[u.heroId].name:u.eliteId?ELITES[u.eliteId].name:'';}
export function healthReadout(hp:number,maxHp:number){const current=Math.max(0,hp),max=Math.max(1,maxHp);return {current:Math.ceil(current),max:Math.ceil(max),ratio:Math.max(0,Math.min(1,current/max)),critical:current/max<.3};}
/** Show effective, active statuses while weaker concurrent sources remain in simulation. */
export function statusReadout(w:World,u:Entity){const names={bleed:'裂伤',corruption:'腐化',acidArmor:'酸蚀',neural:'神经抑制',bloodlust:'嗜血'} as const;
 const active=w.statuses.list(u.id,w.time),shown=[] as string[];
 for(const kind of ['corruption','bleed','acidArmor','neural','bloodlust'] as const){const group=active.filter(s=>s.kind===kind);if(!group.length)continue;const strongest=group.reduce((a,b)=>b.value>a.value?b:a),seconds=Math.max(0,Math.ceil(strongest.until-w.time));shown.push(`${names[kind]} ${seconds}s`);}
 if(w.zoneSlowed.has(u.id))shown.push('腐蚀区减速');
 return {short:shown.slice(0,3).join(' · ')+(shown.length>3?` +${shown.length-3}`:''),detail:shown.join(' · ')};
}
/** Read current ownership, not the state when an offer was generated. */
export function rewardOwnership(w:World,r:Reward):string{
 if(r.kind==='elite'){
  const id=r.value as EliteId,u=w.eliteOwned(id);if(u)return `已拥有 · Rank ${u.rank}${u.rank<5?' → '+(u.rank+1):' · 已满级'}`;
  if(w.pendingElites.includes(id))return '已获得 · 待编入';return '未拥有 · 替换同类普通队员';
 }
 if(r.kind==='hero'){
  const id=r.value as HeroId,h=w.heroes.get(id);if(!h)return '未拥有 · 招募英雄';
  const state=w.heroEntity(id)?.hp?'':h.revivePaid?' · 下关复活':h.awaitingSpawn?' · 待部署':' · 阵亡';
  return `已拥有 · Rank ${h.rank}${h.rank<5?' → '+(h.rank+1):' · 已满级'}${state}`;
 }
 return '';
}

/** Stable seats and per-type building ordinals, never global entity/transaction IDs. */
export function unitCallsign(u:Entity){return specialUnitName(u)||`${SC2_UNITS[u.unitType].zh} · 队伍${u.slot+1}`;}
export function buildingCallsign(w:World,b:Building){return `${({barracks:'兵营',factory:'重工厂',starport:'星港'})[b.type]}${w.buildingsOf(b.type).findIndex(v=>v.id===b.id)+1}`;}
