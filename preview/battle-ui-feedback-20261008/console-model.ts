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
 const slots:CommandSlot[]=[];
 const heroes=[...w.heroes.keys()];
 for(let i=0;i<3;i++){
  const hero=heroes[i],u=hero&&w.heroEntity(hero),state=hero?battleActionState(w,`hero-slot-${i}` as BattleActionId):undefined;
  slots.push({key:'hero:'+i,hero,name:hero?HEROES[hero].name:'英雄空位',image:hero?'hero.'+hero:'',action:hero?`hero-slot-${i}` as BattleActionId:undefined,count:u&&u.hp>0?1:0,hp:u?.hp??0,maxHp:u?.maxHp??0,rank:hero?String(w.heroes.get(hero)!.rank):'',remaining:state?.remaining??0,reason:state?.reason??'',enabled:state?.enabled??false});
 }
 // Shared verbs invoke the existing World action once, retaining every family for inspection.
 const groups:{families:FamilyId[];action?:BattleActionId}[]=[];
 for(const family of w.expedition.familySlots){
  const action=familyAction(w,family),group=action&&groups.find(g=>g.action===action);
  if(group)group.families.push(family);else groups.push({families:[family],action});
 }
 groups.sort((a,b)=>Number(!!b.action)-Number(!!a.action));
 for(const {families,action}of groups){
  const family=families[0],bodies=families.flatMap(f=>w.familyBodies(f)),members=families.flatMap(f=>w.familyUnits(f)),state=action?battleActionState(w,action):undefined,ranks=[...new Set(members.map(u=>u.rank))].sort((a,b)=>a-b);
  slots.push({key:action==='stim'?'skill:stim':'family:'+family,family,families,name:families.map(f=>SC2_UNITS[f].zh).join(' / '),image:families.length>1&&action==='stim'?'tech.stim':'unit.'+family,action,count:members.length,hp:bodies.reduce((n,u)=>n+u.hp,0),maxHp:bodies.reduce((n,u)=>n+u.maxHp,0),rank:ranks.length?ranks[0]+(ranks.length>1?'–'+ranks.at(-1):''):'',remaining:state?.remaining??0,reason:state?.reason??'',enabled:state?.enabled??false});
 }
 return slots;
}
