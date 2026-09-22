import {ELITES,type EliteId} from '../data/elites';
import {HEROES,type HeroId} from '../data/heroes';
import type {World} from '../simulation/world';
import type {Entity,Reward} from '../simulation/types';
export const rankLabel=(rank:number)=>'ⅠⅡⅢⅣⅤ'[Math.max(0,Math.min(4,rank-1))];
export function specialUnitName(u:Entity){return u.heroId?HEROES[u.heroId].name:u.eliteId?ELITES[u.eliteId].name:'';}
export function healthReadout(hp:number,maxHp:number){const current=Math.max(0,hp),max=Math.max(1,maxHp);return {current:Math.ceil(current),max:Math.ceil(max),ratio:Math.max(0,Math.min(1,current/max)),critical:current/max<.3};}
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
