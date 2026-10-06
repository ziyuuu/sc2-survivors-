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

const ids:HeroId[]=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const accents:Record<string,string>={raynor:'#edc07a',tychus:'#e8a371',nova:'#94d9f1',swann:'#98e0b6',tosh:'#d7a4eb',yamato_battlecruiser:'#edb583'};
const descriptions:Record<string,string>={raynor:'金橙重弹沿直线贯穿目标，展示弹道与连续穿透命中。',tychus:'手雷抛射后范围爆破；存活命中目标在随后三秒持续灼烧。',nova:'短暂蓄力后释放冰蓝狙击光束，贯穿直线内的地面与空中目标。',swann:'为周围机械友军提供五秒保护，并分四次修复。满血友军同样获得保护。',tosh:'短暂聚集灵能，对当前战场可见目标同时释放精神冲击。',yamato_battlecruiser:'舰首一秒蓄能，释放聚变炮；主目标爆破并波及附近敌军。'};
const $=(id:string)=>document.getElementById(id)!;
const extra: {id:string;key:string;sprite:{columns:number;rows:number}}[]=JSON.parse($('demo-textures').textContent!);
for(const a of extra)ASSETS.set(a.id,{id:a.id,kind:'effect-texture',status:'available',url:'',sprite:a.sprite} as any);
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10526});
const canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world);
view.fx.heroQuality='full';view.cameraShake=false;view.animationMode='complete';
const fx=new SkillEffects(view,world);
const nativeEvent=view.fx.event.bind(view.fx);view.fx.event=(e,m,l)=>{if(e.kind.startsWith('skill-')){fx.event(e,m??null);return;}nativeEvent(e,m,l);};
const nativeSculptures=view.fx.sculptures.render.bind(view.fx.sculptures);
view.fx.sculptures.render=(w,v,m)=>nativeSculptures(Object.assign(Object.create(w),{heroCasts:[]}),v,m);
const composer=new EffectComposer(view.renderer);composer.addPass(new RenderPass(view.scene,view.camera));const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.32,.5,.8);composer.addPass(bloom);composer.addPass(new OutputPass());
let hero:HeroId='raynor',rank=1,ready=false,auto=true,speed=1,zoom='close',previous=performance.now(),cycle=0,roundAt=0,castAt=Infinity,launchedAt=Infinity,launched=false,casts=0,castFailure='',baseline: {id:number;hp:number;maxHp:number;owner:string}[]=[];
function resize(){view.resize();const portrait=canvas.clientWidth<canvas.clientHeight;view.camera.zoom=portrait?(zoom==='close'?(hero==='swann'?1.45:1.12):.8):(zoom==='close'?1.65:1.18);view.camera.updateProjectionMatrix();composer.setSize(canvas.clientWidth,canvas.clientHeight);}
new ResizeObserver(resize).observe(canvas);
function clearScene(){
 view.resetRun();fx.reset();world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];
 world.stage=13;world.stageElapsed=0;for(const plan of Object.values(world.expedition.production))plan.enabled={};
 world.acquireHero(hero);const source=world.heroEntity(hero)!;source.rank=rank;world.heroes.get(hero)!.rank=rank;world.refreshStats(source,true);source.x=-4.5;source.z=0;source.prev={x:source.x,z:source.z};source.facing=source.attackFacing=Math.PI/2;source.action='idle';source.lastShotAt=-1000;
 world.anchor.x=1;world.anchor.z=0;world.marchDirection.x=1;world.marchDirection.z=0;roundAt=world.time;castAt=roundAt+.8;launched=false;castFailure='';
 const enemy=(type:'roach'|'zergling'|'mutalisk',x:number,z:number,hp:number)=>{const e=world.addUnit(type,'zerg',x,z,1,'regular',13);e.hp=e.maxHp=hp;e.armor=0;e.facing=-Math.PI/2;e.action='idle';e.attackPeriod=10000;e.prev={x,z};return e;};
 const factor=1+.4*(rank-1);
 if(hero==='swann'){
  for(let i=0;i<7;i++){const a=i*2*Math.PI/7;const e=world.addUnit(i%2?'hellion':'tank','terran',-1.5+Math.cos(a)*2.3,Math.sin(a)*3.1,3);e.hp=e.maxHp*(i===6?1:.35+i*.045);e.action='idle';e.facing=Math.PI/2;e.prev={x:e.x,z:e.z};}
 }else if(hero==='raynor'||hero==='nova'){
  for(let i=0;i<5;i++)enemy(i===2&&hero==='nova'?'mutalisk':i%2?'zergling':'roach',-1.2+i*1.85,0,(i%3===1?3000:12000)*factor);
  enemy('roach',2.5,3,12000*factor);enemy('zergling',5.5,-3,10000*factor);
 }else if(hero==='tosh'){
  for(let i=0;i<12;i++)enemy(i%5===4?'mutalisk':i%3?'roach':'zergling',-1.2+(i%4)*2.1,-4.3+Math.floor(i/4)*3.5,(i%4===1?3000:11000)*factor);
 }else{
  enemy('roach',-.7,0,hero==='tychus'?18000*factor:5000*factor);
  for(let i=0;i<6;i++){const a=i*Math.PI/3;enemy(i%3===1?'zergling':'roach',.4+Math.cos(a)*1.7,Math.sin(a)*1.9,(i%3===0?2800:10000)*factor);}
  enemy('roach',5.5,4,12000*factor);
 }
 world.paused=false;world.hash.rebuild(world.entities.values());world.changed();baseline=[...world.entities.values()].filter(e=>e.heroId!==hero).map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,owner:e.owner}));cycle++;resize();view.render(0,1);
}
function choose(id:HeroId){hero=id;clearScene();for(const b of document.querySelectorAll<HTMLButtonElement>('button[data-hero]'))b.setAttribute('aria-pressed',String(b.dataset.hero===id));document.body.style.setProperty('--accent',accents[id]);$('name').textContent=HEROES[id].name;$('skill').textContent=HEROES[id].skill;$('description').textContent=descriptions[id]+` 游戏冷却 ${HEROES[id].cooldown} 秒。`;$('portrait').innerHTML=`<img src="${assetUrl('hero.'+id)}" alt="${HEROES[id].name}">`;$('pause').textContent='暂停';}
function release(){const battleView=captureBattleView(canvas,view.camera);const ok=castExpeditionHero(world,hero,battleView);if(!ok){castFailure='目标未就绪';return;}launched=true;launchedAt=world.time;casts++;fx.begin(hero,world.heroCasts,world.heroEntity(hero)!);}
const stepper=new FixedStepper(1/60,()=>{
 if(!ready||world.paused)return false;
 world.time+=1/60;world.tick++;
 if(!launched&&world.time>=castAt){release();castAt=Infinity;}
 resolveExpeditionHeroCasts(world);
 const source=world.heroEntity(hero);if(source&&launched&&world.time-(source.lastSkillAt??0)>Math.max(hero==='raynor'?SKILL_VISUAL_TUNING.raynorRaySeconds:.65,HEROES[hero].delay+.35))source.action='idle';
 const age=world.time-roundAt;if(auto&&age>(hero==='swann'?7:hero==='tychus'?6.5:5.5)){clearScene();}
 world.changed();return true;
},()=>performance.now(),8);
function status(){const age=world.time-launchedAt;const damaged=baseline.filter(b=>b.owner==='zerg'&&(world.entities.get(b.id)?.hp??0)<b.hp).length;const healed=baseline.filter(b=>b.owner==='terran'&&(world.entities.get(b.id)?.hp??0)>b.hp).length;let phase='准备目标';if(launched){phase=hero==='swann'?age<5?`保护中 · 修复 ${Math.min(4,Math.floor(Math.max(0,age)))}/4`:'保护结束':age<HEROES[hero].delay?(hero==='yamato_battlecruiser'?'舰首蓄能':hero==='nova'?'蓄力瞄准':hero==='tychus'?'手雷飞行':'技能释放'):hero==='tychus'&&age<3.65?'持续灼烧':'命中 · 余波';}if(castFailure)phase=castFailure;if(world.paused)phase+=' · 已暂停';$('phase').textContent=phase;$('result').textContent=launched?hero==='swann'?`　${healed} 名友军已修复`:`　命中 ${damaged} · 击杀 ${world.stats.kills}`:'';}
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;const alpha=ready&&!world.paused?stepper.advance(dt*speed):1;fx.render();view.render(dt,alpha);composer.render();if(ready)status();}
for(const id of ids){const b=document.createElement('button');b.dataset.hero=id;b.textContent=HEROES[id].name;b.disabled=true;b.onclick=()=>{choose(id);stepper.reset();};$('heroes').append(b);}
$('cast').onclick=()=>{clearScene();castAt=world.time+.18;stepper.reset();};$('pause').onclick=()=>{world.paused=!world.paused;$('pause').textContent=world.paused?'继续':'暂停';stepper.reset();};$('auto').onclick=()=>{auto=!auto;$('auto').setAttribute('aria-pressed',String(auto));};$('rank').onchange=()=>{rank=Number(($('rank') as HTMLSelectElement).value);choose(hero);stepper.reset();};$('speed').onchange=()=>{speed=Number(($('speed') as HTMLSelectElement).value);stepper.reset();};$('zoom').onclick=()=>{zoom=zoom==='close'?'battle':'close';$('zoom').textContent=zoom==='close'?'战场视角':'近景视角';resize();};window.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();($('cast') as HTMLButtonElement).click();}});
async function load(){await loadEmbeddedAssets();$('interface').hidden=false;const p=$('interface').querySelector('p');await prepareEmbeddedAssetIds(selected,(d,t)=>{if(p)p.textContent=`准备技能素材 ${d}/${t}`;});await view.fx.load();
 for(const a of extra){const b=view.fx.batches.get(a.id);if(b&&!a.key.includes('kenney-smoke')){const m=b.mesh.material as THREE.ShaderMaterial;m.blending=THREE.AdditiveBlending;m.needsUpdate=true;}}
 for(const type of ['roach','zergling','mutalisk','hellion'] as const)if(!await view.ensureUnitVariant(type,type))throw Error(view.modelErrors.join(';'));
 const tank=await restoreSc2Materials(await new GLTFLoader().loadAsync(assetUrl('model.tank')!));view.gpu.set('tank',new AnimatedBatch(tank,view.scene,1.25,undefined,TUNING.unitScale,'tank'));view.loadedModels++;
 for(const id of ids){if(p)p.textContent='准备 '+HEROES[id].name;if(!await view.ensureUnitVariant(HEROES[id].model,HEROES[id].baseFamily))throw Error(view.modelErrors.join(';'));}
 // Gun skills use the original aimed firing clip, with the real skill clock.
 for(const id of ['raynor','nova'] as const){const b=view.gpu.get(HEROES[id].model)!;b.actions.skill=b.actions.attack;}
 const texture=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(30,30);const mat=new THREE.MeshStandardMaterial({map:texture,color:0x829199,roughness:1});const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),mat);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);view.initialAssetsLoaded=false;
 fx.prepareGrenade();choose(hero);await view.warmPresentationBatches();ready=true;$('interface').hidden=true;for(const b of document.querySelectorAll<HTMLButtonElement>('button'))b.disabled=false;resize();previous=performance.now();
}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='技能载入失败：'+e.message;console.error(e);});
(window as any).__SKILL_DEMO_REPORT__=()=>({ready,hero,rank,auto,speed,paused:world.paused,time:world.time,cycle,age:world.time-roundAt,launched,casts,castFailure,shots:world.stats.shots,damage:world.stats.damage,kills:world.stats.kills,healed:world.stats.healed,modelErrors:view.modelErrors,fxErrors:view.fx.errors,effects:fx.stats,visuals:fx.visualState(),visualTuning:SKILL_VISUAL_TUNING,particles:view.fx.particles.length,dropped:view.fx.stats.dropped,castTargets:fx.targetIds(),targets:baseline.map(b=>({...b,hpNow:world.entities.get(b.id)?.hp??0,protectedUntil:world.entities.get(b.id)?.heroCombat?.protectedUntil??0})),render:{calls:view.renderer.info.render.calls,triangles:view.renderer.info.render.triangles},frame:view.frameMs});




