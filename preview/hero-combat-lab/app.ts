import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {restoreSc2Materials} from '../../src/render/loaders/sc2-materials';
import {AnimatedBatch} from '../../src/render/units/animated-batch';
import {TUNING} from '../../src/data/game';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {castExpeditionHero,resolveExpeditionHeroCasts} from '../../src/simulation/combat/expedition-heroes';
import {captureBattleView} from '../../src/render/input/battle-view';
import {SkillEffects,SKILL_VISUAL_TUNING} from './skill-effects';
import {AttackSimulation} from './attack-simulation';
import {AttackEffects} from './attack-effects';
import {prepareFixture,type DemoMode} from './fixture';
import {ATTACK_DEMO_TUNING as T} from './tuning';

const ids:HeroId[]=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const accents:Record<string,string>={raynor:'#edc07a',tychus:'#e8a371',nova:'#bc9df4',swann:'#98e0b6',tosh:'#d7a4eb',yamato_battlecruiser:'#edb583'};
const skillDescriptions:Record<string,string>={raynor:'金橙重弹沿直线贯穿目标；射线可见一秒。',tychus:'两倍尺寸手雷抛射后范围爆破；存活目标随后持续灼烧三秒。',nova:'蓄力后释放冰蓝狙击光束，贯穿直线内地面与空中目标。',swann:'第一版保护罩、维修光流和圆环。周围七名机械友军获得五秒保护，分四次修复；满血友军也获得保护。',tosh:'短暂聚集灵能，对当前战场可见目标同时释放精神冲击。',yamato_battlecruiser:'舰首蓄能阶段的引导射线加粗五倍，随后释放大和炮并范围爆破。'};
const attackDescriptions:Record<string,string>={
 raynor:`I–II：原已确认的金色粗弹道。<br>III–IV：主弹变红；一条黄色副弹道攻击其他目标，输出为主弹的 ${T.raynor.sideFraction*100}%。<br>V：两条黄色副弹道分别攻击其他目标，共三条弹道，副弹各 ${T.raynor.sideFraction*100}%。`,
 nova:`I–II：原已确认的蓝白长弹芯。<br>III–IV：长弹芯环绕紫色闪电，沿射击方向贯穿；射程内宽 ${T.nova.lineWidth} 的沿线目标分别附加 ${T.nova.iiiTicks} 秒 DOT，每秒该发伤害的 ${T.nova.iiiFraction*100}%。<br>V：双层紫色闪电；沿线 DOT 延长至 ${T.nova.vTicks} 秒，每秒 ${T.nova.vFraction*100}%。每发、每个目标独立生效。`,
 tychus:`III–IV：每 ${T.missiles.everySalvos} 轮普攻随机向其他目标发射 ${T.missiles.iiiCount} 枚小导弹。<br>V：每次发射 ${T.missiles.vCount} 枚，优先锁定不同目标。每枚造成一轮主弹伤害的 ${T.missiles.damageFraction*100}%。`,
 swann:`III–IV：命中后弹射到另一目标，每条链最多 ${T.swann.maxHops} 跳。<br>V：每次命中分出 ${T.swann.vBranches} 条弹射支路，仍最多 ${T.swann.maxHops} 跳。<br>每跳伤害递减 40%，依次为 100% → 60% → 36%；同一轮不重复命中同一目标。弹射距离 ${T.swann.range}。`,
 tosh:`III–IV：命中绽放 ${T.tosh.iiiSparks} 道烟花，半径 ${T.tosh.iiiRadius} 内其他同层敌军受到 ${T.tosh.iiiFraction*100}% 溅射伤害。<br>V：${T.tosh.vSparks} 道烟花，半径 ${T.tosh.vRadius}，溅射提升至 ${T.tosh.vFraction*100}%。`,
 yamato_battlecruiser:`保留舰体双炮普攻。<br>III–IV：每 ${T.missiles.everySalvos} 轮随机向其他目标发射 ${T.missiles.iiiCount} 枚小导弹。<br>V：每次 ${T.missiles.vCount} 枚，优先锁定不同目标；每枚造成一轮双炮伤害的 ${T.missiles.damageFraction*100}%。`,
};
const attackNames:Record<string,string>={raynor:'红弹与副弹道',tychus:'机枪与小导弹',nova:'闪电狙击弹',swann:'分支弹射',tosh:'烟花溅射',yamato_battlecruiser:'双炮与小导弹'};
const $=(id:string)=>document.getElementById(id)!;
const extra:{id:string;key:string;sprite:{columns:number;rows:number}}[]=JSON.parse($('demo-textures').textContent!);
for(const a of extra)ASSETS.set(a.id,{id:a.id,kind:'effect-texture',status:'available',url:'',sprite:a.sprite} as any);
ASSETS.set('model.hero-upgrade.vikingfightermissile',{id:'model.hero-upgrade.vikingfightermissile',kind:'model',status:'available',url:''} as any);
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10526});
const canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world);
view.fx.heroQuality='full';view.cameraShake=false;view.animationMode='complete';
const skills=new SkillEffects(view,world),attacks=new AttackSimulation(world),attackFx=new AttackEffects(view,world,attacks);
let mode:DemoMode='attack',hero:HeroId='raynor',rank=3,ready=false,auto=true,speed=1,zoom='close',previous=performance.now(),cycle=0,roundAt=0,castAt=Infinity,launchedAt=Infinity,launched=false,casts=0,castFailure='',baseline:{id:number;hp:number;maxHp:number;owner:string}[]=[];
const nativeEvent=view.fx.event.bind(view.fx);view.fx.event=(e,m,l)=>{
 if(e.kind.startsWith('skill-')){if(mode==='skill')skills.event(e,m??null);return;}
 if(mode==='attack'&&['attack','projectile-impact','weapon-area'].includes(e.kind)){if(e.kind==='weapon-area')attackFx.nativeArea(e);return;}
 nativeEvent(e,m,l);
};
const nativeSculptures=view.fx.sculptures.render.bind(view.fx.sculptures);
view.fx.sculptures.render=(w,v,m)=>nativeSculptures(Object.assign(Object.create(w),{heroCasts:[]}),v,m);
const composer=new EffectComposer(view.renderer);composer.addPass(new RenderPass(view.scene,view.camera));composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,.8));composer.addPass(new OutputPass());
function resize(){view.resize();const portrait=canvas.clientWidth<canvas.clientHeight;view.camera.zoom=portrait?(zoom==='close'?(mode==='skill'&&hero==='swann'?1.45:1.12):.8):(zoom==='close'?1.65:1.18);view.camera.updateProjectionMatrix();composer.setSize(canvas.clientWidth,canvas.clientHeight);}
new ResizeObserver(resize).observe(canvas);
function clearScene(){view.resetRun();skills.reset();attackFx.reset();baseline=prepareFixture(world,hero,rank,mode);roundAt=world.time;castAt=mode==='skill'?roundAt+.8:Infinity;launchedAt=Infinity;launched=false;castFailure='';attacks.reset(mode==='attack'?world.time+.65:Infinity);cycle++;resize();view.render(0,1);}
function identity(){
 for(const b of document.querySelectorAll<HTMLButtonElement>('button[data-hero]'))b.setAttribute('aria-pressed',String(b.dataset.hero===hero));
 for(const b of document.querySelectorAll<HTMLButtonElement>('button[data-mode]'))b.setAttribute('aria-pressed',String(b.dataset.mode===mode));
 document.body.style.setProperty('--accent',accents[hero]);$('name').textContent=HEROES[hero].name;$('skill').textContent=mode==='skill'?HEROES[hero].skill:attackNames[hero];$('description').innerHTML=mode==='skill'?skillDescriptions[hero]+` 游戏冷却 ${HEROES[hero].cooldown} 秒。`:attackDescriptions[hero];$('detail-title').textContent=mode==='skill'?'技能说明':'普攻与军衔说明';$('portrait').innerHTML=`<img src="${assetUrl('hero.'+hero)}" alt="${HEROES[hero].name}">`;$('pause').textContent='暂停';$('cast').textContent=mode==='skill'?'释放技能':'重播普攻';$('hint').textContent=mode==='skill'?'主动技能单独演示；空格重播，可暂停或慢放观察。':'切换 I / III / V 查看普攻变化；空格重播。展开说明可查看数值。';
}
function choose(id:HeroId){hero=id;clearScene();identity();}
function release(){const ok=castExpeditionHero(world,hero,captureBattleView(canvas,view.camera));if(!ok){castFailure='目标未就绪';return;}launched=true;launchedAt=world.time;casts++;skills.begin(hero,world.heroCasts,world.heroEntity(hero)!);}
const stepper=new FixedStepper(1/60,()=>{
 if(!ready||world.paused)return false;world.time+=1/60;world.tick++;
 if(mode==='attack')attacks.step(1/60);else{
  if(!launched&&world.time>=castAt){release();castAt=Infinity;}resolveExpeditionHeroCasts(world);
  const source=world.heroEntity(hero);if(source&&launched&&world.time-(source.lastSkillAt??0)>Math.max(hero==='raynor'?SKILL_VISUAL_TUNING.raynorRaySeconds:.65,HEROES[hero].delay+.35))source.action='idle';
 }
 const duration=mode==='attack'?8:hero==='swann'?7:hero==='tychus'?6.5:5.5;if(auto&&world.time-roundAt>duration)clearScene();world.changed();return true;
},()=>performance.now(),8);
function status(){
 let phase='准备目标',result='';
 if(mode==='attack'){
  const s=attacks.stats;phase=s.salvos?'普通攻击 · '+['I','II','III','IV','V'][rank-1]+' 级':'准备普攻';result=s.salvos?`主弹 ${s.mainHits}`:'';
  if(s.sideHits)result+=` · 副弹 ${s.sideHits}`;if(s.missileHits)result+=` · 导弹 ${s.missileHits}`;if(s.bounceHits)result+=` · 弹射 ${s.bounceHits}`;if(s.dotTicks)result+=` · DOT ${s.dotTicks}`;if(s.splashHits)result+=` · 溅射 ${s.splashHits}`;
 }else if(launched){
  const age=world.time-launchedAt,damaged=baseline.filter(b=>b.owner==='zerg'&&(world.entities.get(b.id)?.hp??0)<b.hp).length,healed=baseline.filter(b=>b.owner==='terran'&&(world.entities.get(b.id)?.hp??0)>b.hp).length;
  phase=hero==='swann'?age<5?`保护中 · 修复 ${Math.min(4,Math.floor(Math.max(0,age)))}/4`:'保护结束':age<HEROES[hero].delay?(hero==='yamato_battlecruiser'?'舰首蓄能':hero==='nova'?'蓄力瞄准':hero==='tychus'?'手雷飞行':'技能释放'):hero==='tychus'&&age<3.65?'持续灼烧':'命中 · 余波';result=hero==='swann'?`${healed} 名友军已修复`:`命中 ${damaged} · 击杀 ${world.stats.kills}`;
 }
 if(castFailure)phase=castFailure;if(world.paused)phase+=' · 已暂停';$('phase').textContent=phase;$('result').textContent=result;
}
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;const alpha=ready&&!world.paused?stepper.advance(dt*speed):1;if(mode==='attack')attackFx.render();else skills.render();view.render(dt,alpha);composer.render();if(ready)status();}
for(const id of ids){const b=document.createElement('button');b.dataset.hero=id;b.textContent=id==='yamato_battlecruiser'?'大和战列巡洋舰':HEROES[id].name;b.disabled=true;b.onclick=()=>{choose(id);stepper.reset();};$('heroes').append(b);}
for(const b of document.querySelectorAll<HTMLButtonElement>('button[data-mode]'))b.onclick=()=>{mode=b.dataset.mode as DemoMode;clearScene();identity();stepper.reset();};
$('cast').onclick=()=>{clearScene();if(mode==='skill')castAt=world.time+.18;else attacks.reset(world.time+.18);$('pause').textContent='暂停';stepper.reset();};
$('pause').onclick=()=>{world.paused=!world.paused;$('pause').textContent=world.paused?'继续':'暂停';stepper.reset();};$('auto').onclick=()=>{auto=!auto;$('auto').setAttribute('aria-pressed',String(auto));};
$('rank').onchange=()=>{rank=Number(($('rank') as HTMLSelectElement).value);choose(hero);stepper.reset();};$('speed').onchange=()=>{speed=Number(($('speed') as HTMLSelectElement).value);stepper.reset();};$('zoom').onclick=()=>{zoom=zoom==='close'?'battle':'close';$('zoom').textContent=zoom==='close'?'战场视角':'近景视角';resize();};
window.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();($('cast') as HTMLButtonElement).click();}});
async function load(){
 await loadEmbeddedAssets();$('interface').hidden=false;await prepareEmbeddedAssetIds(selected,(d,t)=>{$('interface').textContent=`准备演示素材 ${d}/${t}`;});await view.fx.load();
 for(const a of extra){const b=view.fx.batches.get(a.id);if(b&&!a.key.includes('kenney-smoke')){const m=b.mesh.material as THREE.ShaderMaterial;m.blending=THREE.AdditiveBlending;m.needsUpdate=true;}}
 for(const type of ['roach','zergling','mutalisk','hellion'] as const)if(!await view.ensureUnitVariant(type,type))throw Error(view.modelErrors.join(';'));
 const tank=await restoreSc2Materials(await new GLTFLoader().loadAsync(assetUrl('model.tank')!));view.gpu.set('tank',new AnimatedBatch(tank,view.scene,1.25,undefined,TUNING.unitScale,'tank'));view.loadedModels++;
 for(const id of ids){$('interface').textContent='准备 '+HEROES[id].name;if(!await view.ensureUnitVariant(HEROES[id].model,HEROES[id].baseFamily))throw Error(view.modelErrors.join(';'));}
 for(const id of ['raynor','nova'] as const){const b=view.gpu.get(HEROES[id].model)!;b.actions.skill=b.actions.attack;}
 const texture=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(30,30);const mat=new THREE.MeshStandardMaterial({map:texture,color:0x829199,roughness:1}),floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);view.initialAssetsLoaded=false;
 skills.prepareGrenade();await attackFx.prepare();choose(hero);await view.warmPresentationBatches();ready=true;$('interface').hidden=true;for(const b of document.querySelectorAll<HTMLButtonElement>('button'))b.disabled=false;resize();previous=performance.now();
}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='演示载入失败：'+e.message;console.error(e);});
(window as any).__HERO_COMBAT_DEMO_REPORT__=()=>({ready,mode,hero,rank,auto,speed,paused:world.paused,time:world.time,cycle,age:world.time-roundAt,launched,casts,castFailure,shots:world.stats.shots,damage:world.stats.damage,kills:world.stats.kills,healed:world.stats.healed,modelErrors:view.modelErrors,fxErrors:view.fx.errors,skillEffects:{...skills.stats},skillVisuals:skills.visualState(),skillTuning:SKILL_VISUAL_TUNING,attack:attacks.report(),attackVisuals:attackFx.visualState(),attackTuning:T,particles:view.fx.particles.length,dropped:view.fx.stats.dropped,castTargets:skills.targetIds(),targets:baseline.map(b=>({...b,hpNow:world.entities.get(b.id)?.hp??0,protectedUntil:world.entities.get(b.id)?.heroCombat?.protectedUntil??0})),sourceStats:{damage:world.heroEntity(hero)?.weaponDamage,period:world.heroEntity(hero)?.attackPeriod},render:{calls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles},frame:view.frameMs});
