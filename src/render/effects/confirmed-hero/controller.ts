import type {BattleRenderer} from '../../scene/battle-renderer';
import type {World} from '../../../simulation/world';
import type {VisualEvent} from '../../../simulation/types';
import type {HeroId} from '../../../data/heroes';
import {TERRAN_HERO_IDS,isRevisedHero} from '../../../data/terran-heroes';
import {AttackEffects,type AttackFrame} from './attack-effects';
import {SkillEffects,SKILL_VISUAL_TUNING} from './skill-effects';
import {HeroAuraEffects} from './hero-aura-effects';
import {prepareEmbeddedAssetIds} from '../../../assets/offline-pack';
/** One material/gun set per identity prevents Raynor's thermal material leaking into another hero. */
export class ConfirmedHeroEffects {
 private attacks=new Map<HeroId,AttackEffects>();private skills=new Map<HeroId,SkillEffects>();private casts=new Map<HeroId,number>();private lastEvent=0;private generation='';private lastTime=0;
 private aura:HeroAuraEffects;ready=false;
 constructor(private view:BattleRenderer,private w:World){this.aura=new HeroAuraEffects(view,w);}
 async prepare(){if(this.ready)return;await prepareEmbeddedAssetIds(['model.hero-upgrade.vikingfightermissile']);
  for(const hero of TERRAN_HERO_IDS){const frame:AttackFrame={get packets(){return world.heroAttacks.packets.filter(p=>p.hero===hero&&!p.lost);},get dots(){return world.heroAttacks.dots.filter(d=>d.source.heroId===hero);},get lines(){return world.heroAttacks.lines.filter(l=>l.packet.hero===hero);},takeEvents:()=>world.heroAttackEvents.filter(e=>e.packet.hero===hero)},world=this.w;
   const attack=new AttackEffects(this.view,this.w,frame);await attack.prepare();this.attacks.set(hero,attack);const skill=new SkillEffects(this.view,this.w);skill.prepareGrenade();this.skills.set(hero,skill);
  }this.aura.prepare();this.ready=true;this.view.fx.confirmedHeroes=true;
 }
 reset(){for(const a of this.attacks.values())a.reset();for(const s of this.skills.values())s.reset();this.casts.clear();this.lastEvent=0;this.lastTime=this.w.time;this.aura.reset();this.generation=this.w.runId??'';}
 render(muzzle:(e:VisualEvent,side?:'Left'|'Right')=>{x:number;y:number;z:number}|null,visible:(p:{x:number;z:number})=>boolean){if(!this.ready)return;const last=this.w.visualEvents.at(-1);if(this.generation!==(this.w.runId??'')||this.w.time<this.lastTime||last&&last.serial<this.lastEvent)this.reset();this.lastTime=this.w.time;
  for(const cast of this.w.heroCasts){if(!isRevisedHero(cast.hero)||cast.phase==='dot'||this.casts.get(cast.hero)===cast.id)continue;const source=this.w.entities.get(cast.source);if(!source)continue;this.skills.get(cast.hero)?.begin(cast.hero,[cast],source);this.casts.set(cast.hero,cast.id);}
  for(const e of this.w.visualEvents){if(e.serial<=this.lastEvent)continue;if(isRevisedHero(e.heroId)){if(e.kind==='weapon-area')this.attacks.get(e.heroId!)?.nativeArea(e);if(e.kind.startsWith('skill-'))this.skills.get(e.heroId!)?.event(e,muzzle(e));}this.lastEvent=e.serial;}
  for(const a of this.attacks.values())a.render();for(const s of this.skills.values()){s.render();s.alignShieldBodies();}this.w.heroAttackEvents=this.w.heroAttackEvents.filter(e=>!isRevisedHero(e.packet.hero));this.aura.render(visible);
 }
 report(){return {ready:this.ready,auras:this.aura.report(),gunPoses:Object.fromEntries(['raynor','nova'].map(hero=>{const actions=this.view.gpu.get('hero.'+hero)?.actions;return [hero,{attack:actions?.attack?.name,skill:actions?.skill?.name}];})),attacks:Object.fromEntries([...this.attacks].map(([hero,a])=>[hero,a.visualState()])),skills:Object.fromEntries([...this.skills].map(([hero,s])=>[hero,{...s.stats,...s.visualState()}])),skillTuning:SKILL_VISUAL_TUNING};}
}
