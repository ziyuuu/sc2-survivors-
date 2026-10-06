import fs from 'node:fs/promises';
async function patch(file,pairs){let text=await fs.readFile(file,'utf8');for(const [old,next]of pairs){if(!text.includes(old))throw Error('Missing integration anchor '+file+': '+old.slice(0,60));text=text.replace(old,next);}await fs.writeFile(file,text);}
let medical=await fs.readFile('src/render/effects/p4-sample-effects.ts','utf8');
medical=medical.replace('P4SampleEffects','OrdinaryMedicalEffects').replace('Read-only presentation of the opt-in P4 samples. No rule timers or combat RNG.','Ordinary medical instances of the approved beam / recipient nano-mist materials; isolated from elites.');
medical=medical.replace("this.group.visible=w.p4Samples.enabled||[...w.entities.values()].some(u=>u.owner==='terran'&&!!u.eliteId)||!!w.p4Samples.mines.length||!!w.p4Samples.fires.length;","this.group.visible=[...w.entities.values()].some(u=>!u.heroId&&!u.eliteId&&['medivac','science_vessel'].includes(u.unitType));");
medical=medical.replace("u.owner==='terran'&&!!u.eliteId&&",'!u.eliteId&&').replace('u.healTargets??[]','u.healTargets??(u.healTarget?[u.healTarget]:[])').replace("const height=target.flying?AIR_HEIGHT:.15","const height=target.flying?AIR_HEIGHT:(w.terrain?.height(target)??0)+.15").replace("this.quality==='low'?2:6","this.quality==='low'?1:this.quality==='balanced'?3:6");
const barrier=medical.indexOf('  for(const b of [...w.p4Samples.barriers');if(barrier<0)throw Error('Medical barrier anchor missing');medical=medical.slice(0,barrier)+' }\n}\n';
await fs.writeFile('src/render/effects/ordinary-medical-effects.ts',medical,{flag:'wx'});
await patch('src/render/settings/quality.ts',[["export type HeroEffectQuality='full'|'balanced'|'low';",`export type HeroEffectQuality='full'|'balanced'|'low';
export type OrdinaryEffectQuality='full'|'balanced'|'low';
export const ORDINARY_EFFECT_LABELS={full:'普通兵与支援 · 完整',balanced:'普通兵与支援 · 均衡',low:'普通兵与支援 · 精简'};
export const resolveOrdinaryEffects=(value:string|null,mobile=false):OrdinaryEffectQuality=>value==='full'||value==='balanced'||value==='low'?value:mobile?'balanced':'full';
export function loadOrdinaryEffects(){try{return resolveOrdinaryEffects(localStorage.getItem('sc2.ordinaryEffects'),matchMedia('(pointer:coarse)').matches);}catch{return 'full' as const;}}
export function saveOrdinaryEffects(value:OrdinaryEffectQuality){try{localStorage.setItem('sc2.ordinaryEffects',value);}catch{}}`]]);
await patch('src/render/effects/battle-effects.ts',[
 [" protossHeroes=false;zergHeroes=false;confirmedHeroes=false;"," protossHeroes=false;zergHeroes=false;confirmedHeroes=false;\n ordinaryEventIds=new Set<number>();supportPresentation=false;"],
 ["  if(!e.heroId&&isProtossEliteId(e.eliteId)","  if(this.ordinaryEventIds.has(e.serial)){if(e.kind==='attack')this.stats.attack++;return;}\n  if(!e.heroId&&isProtossEliteId(e.eliteId)"],
 ["  const support=w.expedition.support,tint=","  if(!this.supportPresentation){\n  const support=w.expedition.support,tint="],
 ["  let kept=0;for(const p of this.particles)","  }\n  let kept=0;for(const p of this.particles)"]
]);
await patch('src/render/effects/combat-sculptures.ts',[
 [" heroDetail:'full'|'balanced'|'low'='full';"," heroDetail:'full'|'balanced'|'low'='full';\n ordinarySource:(u:Entity)=>boolean=()=>false;"],
 [" private flight(w:World,p:WeaponFlight,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>Vec|null){"," private flight(w:World,p:WeaponFlight,visible:(p:Point)=>boolean,muzzle:(e:VisualEvent,side?:'Left'|'Right')=>Vec|null){\n  if(this.ordinarySource(p.source))return;"],
 ["for(const u of w.entities.values())if(u.hp>0&&visible(u)&&!u.heroId&&!(u.owner==='terran'","for(const u of w.entities.values())if(u.hp>0&&visible(u)&&!u.heroId&&!this.ordinarySource(u)&&!(u.owner==='terran'"]
]);
await patch('src/render/scene/battle-renderer.ts',[
 ["import * as THREE from 'three';","import * as THREE from 'three';\nimport {NonHeroEffects} from '../effects/nonhero-effects';"],
 [" readonly protossEliteEffects:"," readonly nonHeroEffects:NonHeroEffects;\n readonly protossEliteEffects:"],
 ["this.fx=new BattleEffects(this.scene);","this.fx=new BattleEffects(this.scene);this.nonHeroEffects=new NonHeroEffects(this.scene,this.fx,this.camera);"],
 [" resetRun(){this.protossEliteEffects.reset();"," resetRun(){this.nonHeroEffects.reset();this.protossEliteEffects.reset();"],
 ["await this.fx.load();await this.protossEliteEffects.load();","await this.fx.load();await this.nonHeroEffects.load();await this.protossEliteEffects.load();"],
 ["  this.protossEliteEffects.quality=this.fx.heroQuality;","  this.nonHeroEffects.render(world,p=>this.visible(p),weaponMount);\n  this.protossEliteEffects.quality=this.fx.heroQuality;"],
 [" report(){return {protossElites:"," report(){return {nonHeroes:this.nonHeroEffects.report(),protossElites:"]
]);
await patch('src/ui/hud.ts',[
 ["import {HERO_EFFECT_LABELS,resolveHeroEffects,","import {ORDINARY_EFFECT_LABELS,resolveOrdinaryEffects,HERO_EFFECT_LABELS,resolveHeroEffects,"],
 ["else if(el.dataset.setting==='hero-effects')", "else if(el.dataset.setting==='ordinary-effects')view.nonHeroEffects.setQuality(resolveOrdinaryEffects(el.value));else if(el.dataset.setting==='hero-effects')"],
 ['  <label class="graphics-settings">英雄特效',`  <label class="graphics-settings">普通兵与支援<select data-setting="ordinary-effects" aria-label="普通兵与支援特效">\${Object.entries(ORDINARY_EFFECT_LABELS).map(([id,label])=>\`<option value="\${id}" \${this.view.nonHeroEffects.quality===id?'selected':''}>\${label}</option>\`).join('')}</select></label>
  <label class="graphics-settings">英雄特效`]
]);
console.log('Integrated isolated ordinary/support renderer, controls, and medical materials.');
