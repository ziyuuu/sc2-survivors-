import type {World} from '../../simulation/world';
import {HEROES,type HeroId} from '../../data/heroes';
export const EXPEDITION_SKILLS=[
 {id:'dash',name:'推进',arrow:'↑'}, {id:'unit-operations',name:'单位操作',arrow:'↗'},
 {id:'detection',name:'主动侦测',arrow:'↘'}, {id:'hero-slot-0',name:'英雄 1',arrow:'↓'},
 {id:'hero-slot-1',name:'英雄 2',arrow:'↙'}, {id:'hero-slot-2',name:'英雄 3',arrow:'↖'},
] as const;
export const SKILLS=EXPEDITION_SKILLS;
export type SkillId=typeof EXPEDITION_SKILLS[number]['id'];
export interface SkillItem {id:SkillId;name:string;arrow:string}
export function heroForSlot(w:Pick<World,'heroes'>,slot:number):HeroId|undefined{return slot>=0&&slot<3?[...w.heroes.keys()][slot]:undefined;}
export function activateHeroSlot(w:World,slot:number){const id=heroForSlot(w,slot);return id?w.castHero(id):false;}
export function skillsFor(w:World):readonly SkillItem[]{return EXPEDITION_SKILLS.map(item=>{if(!item.id.startsWith('hero-slot-'))return item;const hero=heroForSlot(w,Number(item.id.slice(-1)));return {...item,name:hero?`${HEROES[hero].name} · ${HEROES[hero].skill}`:item.name};});}
export function skillUnlocked(w:World,id:SkillId){
 if(id==='detection'||id==='unit-operations')return true;
 if(id.startsWith('hero-slot-'))return !!heroForSlot(w,Number(id.slice(-1)));
 return id==='dash';
}
export function activateSkill(w:World,id:SkillId){
 if(id==='dash')return w.dash();
 if(id==='detection')return w.castDetection();
 if(id==='unit-operations'){if(typeof document==='undefined')return false;const button=document.querySelector<HTMLButtonElement>('[data-action="unit-operations"]');if(!button)return false;button.click();return true;}
 if(id.startsWith('hero-slot-'))return activateHeroSlot(w,Number(id.slice(-1)));
 return false;
}
/** Six fixed sectors. Hysteresis keeps an almost-boundary stick from flickering. */
export function stickSkill(x:number,z:number,current:SkillId|null,skills:readonly SkillItem[]=SKILLS):SkillId|null {
 if(Math.hypot(x,z)<.5)return current;
 const tau=Math.PI*2,angle=(Math.atan2(x,-z)+tau)%tau,step=tau/skills.length;
 const index=skills.findIndex(s=>s.id===current),delta=index<0?Infinity:Math.abs(Math.atan2(Math.sin(angle-index*step),Math.cos(angle-index*step)));
 if(delta<step*.5+.12)return current;
 return skills[Math.round(angle/step)%skills.length].id;
}
