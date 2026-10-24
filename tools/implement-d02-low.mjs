import fs from 'node:fs';
const edit=(path,fn)=>{const old=fs.readFileSync(path,'utf8'),next=fn(old);if(next===old)throw Error('No change: '+path);fs.writeFileSync(path,next)};
const replace=(s,a,b)=>{if(!s.includes(a))throw Error('Missing: '+a);return s.replace(a,b)};
edit('src/render/settings/quality.ts',s=>s.replace("CombatPreset='full'|'medium'|'custom'","CombatPreset='low'|'medium'|'full'|'custom'").replace("{full:'全特效',medium:'中特效',custom:'自定义'}","{low:'低 · 仅危险提示',medium:'中 · 精简特效',full:'高 · 完整特效（默认）',custom:'自定义'}").replace("loadCombatDetail():'full'|'medium'{try{return localStorage.getItem('sc2.combatDetail')==='medium'?'medium':'full';}","loadCombatDetail():'full'|'medium'|'low'{try{const value=localStorage.getItem('sc2.combatDetail');return value==='low'||value==='medium'?value:'full';}").replace("saveCombatDetail(value:'full'|'medium')","saveCombatDetail(value:'full'|'medium'|'low')"));
edit('src/ui/hud.ts',s=>replace(s,"view.setCombatPreset(el.value==='medium'?","view.setCombatPreset(el.value==='low'?'low':el.value==='medium'?"));
edit('src/ui/presentation/settings-screen.ts',s=>replace(s,'两档均保留屏幕分辨率、完整动作与战斗提示。中特效优先流畅：精简烟尘火花，使用简化落地影，减弱泛光并关闭画面扭曲。','三档均保留屏幕分辨率与完整动作。高档保留完整特效；中档精简烟尘火花、简化落地影并减弱泛光；低档关闭战斗及环境特效，仅保留原贴图危险范围提示。'));
// All combat effect objects share one visibility boundary, including objects loaded later.
// Low also skips their render adapters; this is not just invisible particle simulation.
for(const path of ['confirmed-hero/attack-effects.ts','confirmed-hero/skill-effects.ts','confirmed-hero/hero-aura-effects.ts','protoss-hero-effects.ts','zerg-hero-effects.ts'])edit('src/render/effects/'+path,s=>s.replaceAll('view.scene','view.effectScene'));
edit('src/render/effects/protoss-hero-effects.ts',s=>s.replace('beginFrame(){','beginFrame(effects=true){').replace('for(const event of w.heroAttackEvents)if(isProtossHero','for(const event of w.heroAttackEvents)if(effects&&isProtossHero').replace("this.serial=e.serial;if(!isProtossHero(e.heroId))continue;","this.serial=e.serial;if(!isProtossHero(e.heroId)||!effects&&!(e.heroId==='purifier_flagship'&&e.kind==='skill-impact'))continue;"));
// Resuming at the current receipt cursor prevents skipped one-shots replaying.
for(const [path,body] of [
 ['source-combat-effects.ts',"this.serial=w.visualEvents.at(-1)?.serial??0;this.time=w.time;this.run=w.runId??'';"],
 ['nonhero-effects.ts','this.serial=w.visualEvents.at(-1)?.serial??0;this.time=w.time;'],
 ['protoss-elite-effects.ts','this.serial=w.visualEvents.at(-1)?.serial??0;this.time=w.time;'],
 ['zerg-elite-effects.ts','this.serial=w.visualEvents.at(-1)?.serial??0;this.time=w.time;'],
 ['terran-elite-effects.ts','this.serial=w.visualEvents.at(-1)?.serial??0;this.tick=w.tick;'],
 ['confirmed-hero/controller.ts',"this.lastEvent=w.visualEvents.at(-1)?.serial??0;this.lastTime=w.time;this.generation=w.runId??'';"],
 ['zerg-hero-effects.ts',"this.lastSerial=w.visualEvents.at(-1)?.serial??0;this.lastTime=w.time;this.generation=w.runId??'';"],
 ['protoss-hero-effects.ts',"this.serial=w.visualEvents.at(-1)?.serial??0;this.lastTime=w.time;this.generation=w.runId??'';"]
])edit('src/render/effects/'+path,s=>replace(s,' reset(){',` resumeAt(w:World){${body}}\n reset(){`));
edit('src/render/terrain/environment-atmosphere.ts',s=>s.replace('readonly time:number;','readonly effectsEnabled?:boolean;readonly time:number;').replace('if(!visible||!enabled||','if(frame.effectsEnabled===false||!visible||!enabled||'));
edit('src/render/units/equipment-drops.ts',s=>s.replace('visible:(p:Point)=>boolean){','visible:(p:Point)=>boolean,effects=true){').replace('for(const cell of lights.values())','for(const cell of effects?lights.values():[])'));
edit('src/render/scene/battle-renderer.ts',s=>{
 s="import {LowDangerEffects} from '../effects/low-danger-effects';\n"+s;
 s=replace(s,'renderer:THREE.WebGLRenderer;scene=new THREE.Scene();','renderer:THREE.WebGLRenderer;scene=new THREE.Scene();readonly effectScene=new THREE.Scene();private lowSince:number|null=null;readonly lowDanger:LowDangerEffects;');
 const start=s.indexOf('  this.fx=new BattleEffects(this.scene);'),end=s.indexOf('this.heroComposer=new EffectComposer',start);
 if(start<0||end<0)throw Error('constructor');s=s.slice(0,start)+'  this.effectScene.name=\'combat-effects\';this.scene.add(this.effectScene);'+s.slice(start,end).replaceAll('(this.scene', '(this.effectScene')+'this.lowDanger=new LowDangerEffects(this.scene,this.fx);'+s.slice(end);
 s=s.replace("const q=this.combatDetail==='medium'?'low':'full';","const q=this.combatDetail==='full'?'full':'low';");
 s=s.replace("if(value==='custom')return;this.combatDetail=value;","if(value==='custom')return;if(this.combatDetail==='low'&&value!=='low')this.resumeCombatEffects();if(value==='low'&&this.combatDetail!=='low')this.lowSince=this.world.time;this.combatDetail=value;");
 s=s.replaceAll("value==='medium'?'low':'full'","value==='full'?'full':'low'");
 s=s.replace("const medium=this.combatDetail==='medium';this.sourceCombatEffects","const low=this.combatDetail==='low',medium=this.combatDetail!=='full';this.effectScene.visible=!low;this.lowDanger.setEnabled(low);this.sourceCombatEffects");
 s=s.replace('bloom.strength=medium?',"bloom.enabled=!low;bloom.strength=medium?");
 const resume=` private resumeCombatEffects(){
  const w=this.world,advanced=this.lowSince===null||w.time!==this.lowSince;
  // Keep frozen presentation intact for a paused round trip. Once time advanced,
  // release old visual caches before rebuilding continuous native state.
  if(advanced){for(const effects of [this.sourceCombatEffects,this.nonHeroEffects,this.protossEliteEffects,this.zergEliteEffects,this.terranEliteEffects,this.eliteSupportEffects,this.confirmedHeroes,this.zergHeroes])effects.reset();this.fx.reset();}
  for(const effects of [this.sourceCombatEffects,this.nonHeroEffects,this.protossEliteEffects,this.zergEliteEffects,this.terranEliteEffects,this.confirmedHeroes,this.zergHeroes,this.protossHeroes])effects.resumeAt(w);
  this.fx.lastSerial=w.visualEvents.at(-1)?.serial??0;this.lowSince=null;
 }
`;
 s=replace(s,' setQuality(quality:RenderQuality)',resume+' setQuality(quality:RenderQuality)');
 s=replace(s,'resetRun(){this.stillPresentation=null;','resetRun(){this.lowSince=this.combatDetail===\'low\'?this.world.time:null;this.lowDanger.reset();this.stillPresentation=null;');
 s=replace(s,'  resetUploadStats();const motion=','  const low=this.combatDetail===\'low\';resetUploadStats();const motion=');
 s=s.replace('this.protossHeroes.beginFrame();','this.protossHeroes.beginFrame(!low);');
 s=s.replace("if(world.expedition.race==='zerg')for(const impact", "if(!low&&world.expedition.race==='zerg')for(const impact");
 s=replace(s,'sampled.once,Math.max(0,1-(world.time-', 'sampled.once,low?0:Math.max(0,1-(world.time-');
 s=replace(s,'barrier:this.barrierMaterials.get(u.id)','barrier:low?undefined:this.barrierMaterials.get(u.id)');
 s=replace(s,'this.equipmentDrops.render(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),p=>this.visible(p));','this.equipmentDrops.render(world,this.camera,this.viewportWidth,this.viewportHeight,p=>this.ground(p),p=>this.visible(p),!low);');
 s=replace(s,'  this.sourceCombatEffects.render(world,weaponMount,','  if(!low){this.sourceCombatEffects.render(world,weaponMount,');
 s=replace(s,'  this.mapView?.updateEnvironment?.({time:world.time,','  }else{world.heroAttackEvents=world.heroAttackEvents.filter(e=>!HEROES[e.packet.hero]);this.lowDanger.render(world,p=>this.visible(p));}\n  this.mapView?.updateEnvironment?.({effectsEnabled:!low,time:world.time,');
 s=s.replace('this.distress.update(world,motion,this.cameraShake)','this.distress.update(world,motion&&!low,this.cameraShake&&!low)').replace('this.distressLayer.hidden=world.phase', 'this.distressLayer.hidden=low||world.phase').replace('const shake=this.cameraShake&&','const shake=!low&&this.cameraShake&&');
 return s;
});
