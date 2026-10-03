import type {World} from '../../simulation/world';
import {HEROES,type HeroId} from '../../data/heroes';
import {COMMAND_ACTIONS,battleActionState,activateBattleAction,type BattleActionId} from './battle-actions';
export const EXPEDITION_SKILLS=[
 {id:'dash',name:'推进',arrow:'↑'}, {id:'unit-operations',name:'单位操作',arrow:'↗'},
 {id:'detection',name:'主动侦测',arrow:'↘'}, {id:'hero-slot-0',name:'英雄 1',arrow:'↓'},
 {id:'hero-slot-1',name:'英雄 2',arrow:'↙'}, {id:'hero-slot-2',name:'英雄 3',arrow:'↖'},
] as const;
export const SKILLS=EXPEDITION_SKILLS;
export type SkillId=BattleActionId;
export interface SkillItem {id:SkillId;name:string;arrow:string}
export function heroForSlot(w:Pick<World,'heroes'>,slot:number):HeroId|undefined{return slot>=0&&slot<3?[...w.heroes.keys()][slot]:undefined;}
export function activateHeroSlot(w:World,slot:number){const id=heroForSlot(w,slot);return id?activateBattleAction(w,`hero-slot-${slot}` as BattleActionId):false;}
export function skillsFor(w:World):readonly SkillItem[]{return EXPEDITION_SKILLS.map(item=>{if(!item.id.startsWith('hero-slot-'))return item;const hero=heroForSlot(w,Number(item.id.slice(-1)));return {...item,name:hero?`${HEROES[hero].name} · ${HEROES[hero].skill}`:item.name};});}
export function skillPages(w:World):readonly (readonly SkillItem[])[]{
 const extras=COMMAND_ACTIONS.filter(a=>!EXPEDITION_SKILLS.some(s=>s.id===a.id)&&battleActionState(w,a.id).visible).map(a=>({id:a.id,name:battleActionState(w,a.id).name,arrow:''}));
 const pages:SkillItem[][]=[Array.from(skillsFor(w))];for(let i=0;i<extras.length;i+=6)pages.push(extras.slice(i,i+6).map((s,j)=>({...s,arrow:EXPEDITION_SKILLS[j].arrow})));return pages;
}
export function skillUnlocked(w:World,id:SkillId){return battleActionState(w,id).enabled;}
export function activateSkill(w:World,id:SkillId){return activateBattleAction(w,id);}
/** Six fixed sectors. Hysteresis keeps an almost-boundary stick from flickering. */
export function stickSkill(x:number,z:number,current:SkillId|null,skills:readonly SkillItem[]=SKILLS):SkillId|null {
 if(Math.hypot(x,z)<.5)return current;
 const tau=Math.PI*2,angle=(Math.atan2(x,-z)+tau)%tau,step=tau/6;
 const index=skills.findIndex(s=>s.id===current),delta=index<0?Infinity:Math.abs(Math.atan2(Math.sin(angle-index*step),Math.cos(angle-index*step)));
 if(delta<step*.5+.12)return current;
 return skills[Math.round(angle/step)%6]?.id??null;
}
