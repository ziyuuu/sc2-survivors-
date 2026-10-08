import type {World} from '../../src/simulation/world';
import type {FamilyId} from '../../src/data/races';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {battleActionState,type BattleActionId} from '../../src/ui/controls/battle-actions';

/** Independent proposal: one existing manual verb per family, never a new skill. */
export function familyAction(w:World,family:FamilyId):BattleActionId|undefined{
 if(family==='marine'||family==='marauder')return w.upgrades.has('stim')?'stim':undefined;
 if(family==='hellion')return w.expedition.tech['unlock.hellion']?'hellion-mode':undefined;
 if(family==='tank')return 'siege';
 if(family==='viking'||family==='thor'||family==='lurker')return `${family}-mode` as BattleActionId;
 if(family==='banshee')return w.expedition.tech.cloak?'banshee-cloak':undefined;
 if(family==='stalker')return w.expedition.tech.blink?'stalker-blink':undefined;
 return undefined;
}
export interface CommandSlot {key:string;family?:FamilyId;families?:FamilyId[];hero?:HeroId;name:string;image:string;action?:BattleActionId;count:number;hp:number;maxHp:number;rank:string;remaining:number;reason:string;enabled:boolean;}
export function commandSlots(w:World):CommandSlot[]{
 const families=w.expedition.familySlots.map(family=>({family,action:familyAction(w,family)})).sort((a,b)=>Number(!!b.action)-Number(!!a.action));
 const slots:CommandSlot[]=families.map(({family,action})=>{
  const bodies=w.familyBodies(family),members=w.familyUnits(family),state=action?battleActionState(w,action):undefined,ranks=[...new Set(members.map(u=>u.rank))].sort((a,b)=>a-b);
  return {key:'family:'+family,family,families:[family],name:SC2_UNITS[family].zh,image:'unit.'+family,action,count:members.length,hp:bodies.reduce((n,u)=>n+u.hp,0),maxHp:bodies.reduce((n,u)=>n+u.maxHp,0),rank:ranks.length?ranks[0]+(ranks.length>1?'–'+ranks.at(-1):''):'',remaining:state?.remaining??0,reason:state?.reason??'',enabled:state?.enabled??false};
 });
 // Only owned heroes get a lower-row button; retain their native 1/2/3 skill bindings.
 for(const [i,hero]of [...w.heroes.keys()].slice(0,3).entries()){
  const u=w.heroEntity(hero),state=battleActionState(w,`hero-slot-${i}` as BattleActionId);
  slots.push({key:'hero:'+i,hero,name:HEROES[hero].name,image:'hero.'+hero,action:`hero-slot-${i}` as BattleActionId,count:u&&u.hp>0?1:0,hp:u?.hp??0,maxHp:u?.maxHp??0,rank:String(w.heroes.get(hero)!.rank),remaining:state.remaining,reason:state.reason,enabled:state.enabled});
 }
 return slots;
}
