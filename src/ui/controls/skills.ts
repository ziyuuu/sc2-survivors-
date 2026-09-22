import type {World} from '../../simulation/world';
import type {HeroId} from '../../data/heroes';
export const SKILLS=[
 {id:'dash',name:'推进',arrow:'↑'}, {id:'stim',name:'兴奋剂',arrow:'↗'},
 {id:'siege',name:'架炮 / 收炮',arrow:'↘'}, {id:'hero-raynor',name:'穿透射击',arrow:'↓'},
 {id:'hero-tychus',name:'手雷',arrow:'↙'}, {id:'hero-nova',name:'狙击',arrow:'↖'},
] as const;
export type SkillId=typeof SKILLS[number]['id'];
export function skillUnlocked(w:World,id:SkillId){return id==='dash'||id==='stim'?id==='dash'||w.upgrades.has('stim'):id==='siege'?w.allies().some(u=>u.unitType==='tank'):w.heroes.has(id.slice(5) as HeroId);}
export function activateSkill(w:World,id:SkillId){if(id==='dash')return w.dash();if(id==='stim')return w.stim();if(id==='siege')return w.toggleTanks();return w.castHero(id.slice(5) as HeroId);}
/** Six fixed sectors. Hysteresis keeps an almost-boundary stick from flickering. */
export function stickSkill(x:number,z:number,current:SkillId|null):SkillId|null {
 if(Math.hypot(x,z)<.5)return current;
 const tau=Math.PI*2,angle=(Math.atan2(x,-z)+tau)%tau,step=tau/6;
 const index=SKILLS.findIndex(s=>s.id===current),delta=index<0?Infinity:Math.abs(Math.atan2(Math.sin(angle-index*step),Math.cos(angle-index*step)));
 if(delta<step*.5+.12)return current;
 return SKILLS[Math.round(angle/step)%6].id;
}
