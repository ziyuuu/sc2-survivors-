import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
const ids:HeroId[]=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const $=(id:string)=>document.getElementById(id)!;
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:8721});
const canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world);
view.fx.heroQuality='full';view.cameraShake=false;
let hero:HeroId='raynor',rank=1,ready=false,spawnAt=0,wave=0,previous=performance.now(),zoom='close';
const keys=new Set<string>();
function resize(){view.resize();view.camera.zoom=canvas.clientWidth<canvas.clientHeight?1.05:zoom==='close'?2:1.25;view.camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(canvas);
function spawn(){wave++;const count=hero==='tychus'?4:3;for(let i=0;i<count;i++){const a=world.time*.21+i*.65;world.addUnit(i%3===2?'zergling':'roach','zerg',world.anchor.x+6.5+Math.cos(a)*2,world.anchor.z+Math.sin(a)*4,1,'regular',13);}if(hero==='yamato_battlecruiser'&&wave%2===1)world.addUnit('mutalisk','zerg',world.anchor.x+7,world.anchor.z-3,1,'regular',13);}
function choose(id:HeroId){
 hero=id;view.resetRun();world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];world.stage=13;world.stageElapsed=0;
 for(const plan of Object.values(world.expedition.production))plan.enabled={};
 world.acquireHero(id);const u=world.heroEntity(id)!;u.rank=rank;world.heroes.get(id)!.rank=rank;world.refreshStats(u,true);u.x=-1.5;u.z=0;u.prev={x:u.x,z:u.z};world.anchor.x=world.anchor.z=0;world.hash.rebuild(world.entities.values());spawnAt=0;wave=0;world.paused=false;keys.clear();world.resetDirectionalInput();
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]'))b.setAttribute('aria-pressed',String(b.dataset.hero===id));$('name').textContent=HEROES[id].name;$('pause').textContent='暂停';$('portrait').innerHTML=assetUrl('hero.'+id)?`<img src="${assetUrl('hero.'+id)}" alt="${HEROES[id].name}">`:'';resize();world.changed();
}
const stepper=new FixedStepper(1/60,()=>{if(!ready||world.paused)return false;if(world.phase!=='battle'){choose(hero);return true;}world.stageElapsed=0;world.rewardDrops=[];if(world.time>=spawnAt&&world.enemyCount()<18){spawn();spawnAt=world.time+1.5;}world.input.x=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);world.input.z=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);world.step();return true;},()=>performance.now(),8);
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;const alpha=ready&&!world.paused?stepper.advance(dt):0;view.render(dt,alpha);if(ready){const u=world.heroEntity(hero),hp=Math.max(0,u?.hp??0),max=u?.maxHp??1;$('vital-fill').style.width=hp/max*100+'%';$('health').textContent=Math.ceil(hp)+' / '+Math.ceil(max);$('kills').textContent=String(world.stats.kills);$('time').textContent=Math.floor(world.time/60).toString().padStart(2,'0')+':'+Math.floor(world.time%60).toString().padStart(2,'0');$('enemies').textContent=String(world.enemyCount());}}
for(const id of ids){const button=document.createElement('button');button.dataset.hero=id;button.textContent=HEROES[id].name;button.disabled=true;button.onclick=()=>{choose(id);stepper.reset();};$('heroes').append(button);}
$('pause').onclick=()=>{world.paused=!world.paused;$('pause').textContent=world.paused?'继续':'暂停';stepper.reset();};$('restart').onclick=()=>{choose(hero);stepper.reset();};$('rank').onchange=()=>{rank=Number(($('rank') as HTMLSelectElement).value);choose(hero);stepper.reset();};$('zoom').onclick=()=>{zoom=zoom==='close'?'battle':'close';$('zoom').textContent=zoom==='close'?'战场视角':'近景视角';resize();};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLSelectElement)return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);}});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();world.resetDirectionalInput();});
canvas.addEventListener('pointerdown',e=>{if(!ready||world.paused)return;const p=view.pickMove(e.clientX,e.clientY);if(p)world.issueMove(p.point);});canvas.addEventListener('contextmenu',e=>e.preventDefault());
async function load(){await loadEmbeddedAssets();$('interface').hidden=false;const progress=$('interface').querySelector('p');await prepareEmbeddedAssetIds(selected,(done,total)=>{if(progress)progress.textContent=`准备战场 ${done} / ${total}`;});
 await view.fx.load();for(const type of ['roach','zergling','mutalisk'] as const){if(!await view.ensureUnitVariant(type,type))throw Error(view.modelErrors.join(';'));}
 for(const id of ids){if(progress)progress.textContent='准备 '+HEROES[id].name;if(!await view.ensureUnitVariant(HEROES[id].model,HEROES[id].baseFamily))throw Error(view.modelErrors.join(';'));}
 const texture=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(32,32);const material=new THREE.MeshStandardMaterial({map:texture,roughness:1});material.onBeforeCompile=s=>{s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>',THREE.ShaderChunk.map_fragment.replace('texture2D( map, vMapUv )','texture2D( map, vec2(fract(vMapUv.x)*.499,.501+fract(vMapUv.y)*.249) )')); };material.customProgramCacheKey=()=> 'demo-original-metal-tile';const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),material);floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);view.initialAssetsLoaded=false;
 choose(hero);await view.warmPresentationBatches();ready=true;$('interface').hidden=true;for(const b of document.querySelectorAll<HTMLButtonElement>('[data-hero]'))b.disabled=false;previous=performance.now();
}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='战场载入失败：'+e.message;console.error(e);});
(window as any).__GAME_DEMO_REPORT__=()=>({ready,hero,rank,paused:world.paused,time:world.time,shots:world.stats.shots,kills:world.stats.kills,enemies:world.enemyCount(),models:view.gpu.size,modelErrors:view.modelErrors,fxErrors:view.fx.errors,fx:view.fx.heroBasic.stats});



