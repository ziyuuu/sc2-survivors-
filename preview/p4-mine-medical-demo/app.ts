import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {ELITES,type EliteId} from '../../src/data/elites';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {RUN_SCHEMA} from '../../src/simulation/persistence/run-snapshot';
import type {RunSnapshot} from '../../src/simulation/persistence/run-snapshot';

const $=(id:string)=>document.getElementById(id)!;
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10511}),canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world);view.cameraShake=false;
let sample:EliteId='hellion.3',rank=1,scenario='open',ready=false,last=performance.now(),saved:RunSnapshot|null=null,source=0,zoom=1.5;
let baseline=new Map<number,number>();const wall=new THREE.Group();view.scene.add(wall);
const names={'hellion.3':'大型蜘蛛雷','medivac.2':'精英救护','science_vessel.1':'铁幕研究员'};
function resize(){view.resize();view.camera.zoom=canvas.clientWidth<canvas.clientHeight?1:zoom;view.camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);
function enemy(x:number,z:number,air=false){const e=world.addUnit(air?'mutalisk':'roach','zerg',x,z,1,'regular',13);e.hp=e.maxHp=100000;e.armor=0;e.moveSpeed=0;e.stoppedUntil=1e9;e.nextShotAt=1e9;e.specialReady=1e9;baseline.set(e.id,e.hp);return e;}
function setup(){
 view.resetRun();world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];world.p4Samples.enabled=true;world.stage=13;world.stageElapsed=0;world.obstacles=[];baseline=new Map();
 for(const c of Object.values(world.expedition.production))c.enabled={};for(const m of [...wall.children]){m.removeFromParent();(m as THREE.Mesh).geometry.dispose();((m as THREE.Mesh).material as THREE.Material).dispose();}
 const family=sample.split('.')[0] as 'hellion'|'medivac'|'science_vessel';world.expedition.familySlots=family==='hellion'?['hellion']:['marauder','marine','tank','hellion',family];
 const u=world.addUnit(family,'terran',-3,0,rank);u.eliteId=sample;u.modelKey=ELITES[sample].model;world.refreshStats(u,true);u.nextShotAt=1e9;u.energy=u.maxEnergy;source=u.id;
 if(sample==='hellion.3'){
  enemy(1.5,0);enemy(2.5,1.6);enemy(2.8,-1.8);enemy(3.5,0,true);
  if(scenario==='wall'){world.obstacles=[{x:-.5,z:0,w:.7,h:5}];const mesh=new THREE.Mesh(new THREE.BoxGeometry(.7,.6,5),new THREE.MeshStandardMaterial({color:0x6b726f,metalness:.7,roughness:.65}));mesh.position.set(-.5,.3,0);wall.add(mesh);}
  if(scenario==='overlap'){for(const t of world.entities.values())if(t.owner==='zerg'){t.x=.2;t.z=0;}}
 }else{
  const mechanical=sample==='science_vessel.1';
  for(let i=0;i<7;i++){const mixed=scenario==='mixed',type=mixed?(i%2?'tank':'marauder'):mechanical?(i<4?'tank':'hellion'):(i<4?'marauder':'marine'),p=world.addUnit(type,'terran',.3+(i%3)*1.7,-2+Math.floor(i/3)*2,5);p.hp=p.maxHp*(scenario==='full'?1:.2);p.stoppedUntil=1e9;p.nextShotAt=1e9;baseline.set(p.id,p.hp);}
  if(scenario==='empty')u.energy=0;
 }
 world.hash.rebuild(world.entities.values());world.paused=false;stepper.reset();$('pause').textContent='暂停';$('name').textContent=names[sample as keyof typeof names];$('result').textContent='';$('description').textContent=sample==='hellion.3'?'12秒两枚，最多8枚；发现6，速度6，首爆半径4.2；残火两秒。同源火区对同一目标每秒至多一包。趣味卡雷保持原参数。':sample==='medivac.2'?'范围8、最多五体；生物全效、机械三分之一。只恢复实际缺口，每1HP消耗0.33能量。':'范围8、最多三体；机械全效、生物三分之一。有效维修的1.5倍转为有限屏障，上限目标HP60%，持续7秒。';
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-sample]'))b.setAttribute('aria-pressed',String(b.dataset.sample===sample));$('skip').hidden=sample!=='hellion.3';$('switch-target').hidden=sample!=='hellion.3';$('strike').hidden=sample==='hellion.3';resize();world.changed();
}
function setSample(id:EliteId){sample=id;const choices=id==='hellion.3'?[['open','开阔追踪'],['wall','墙体绕行'],['overlap','同源火区重叠']]:[['open',id==='medivac.2'?'五体生物治疗':'三体机械维修'],['mixed','生物／机械混合'],['full','满血不治疗'],['empty','空能量']];$('scenario').innerHTML=choices.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');scenario='open';setup();}
function step(){if(!ready||world.paused)return false;world.stageElapsed=0;world.step();return true;}
const stepper=new FixedStepper(1/60,step,()=>performance.now(),8);
function advance(seconds:number){for(let i=0;i<Math.ceil(Math.min(45,seconds)*60);i++)if(!step())break;}
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;const alpha=ready&&!world.paused?stepper.advance(dt):0;view.render(dt,alpha);if(!ready)return;const u=world.entities.get(source),s=world.p4Samples,d=s.deploy[source];$('time').textContent=world.time.toFixed(1)+'s';$('energy').textContent=Math.ceil(u?.energy??0)+' / '+Math.ceil(u?.maxEnergy??0);$('healed').textContent=Math.round(world.stats.healed).toString();$('damage').textContent=Math.round(world.stats.damage).toString();$('state').textContent=sample==='hellion.3'?`在场大型雷 ${s.mines.length}/8 · 欠雷 ${d?.pending??0} · 下组 ${Math.max(0,Math.ceil((d?.next??12)-world.time))}s · 残火 ${s.fires.length}`:`实际受益 ${u?.healTargets?.length??0} · 每体满额 ${u?.healRate?.toFixed(1)??0} HP/s · 有效屏障 ${Math.round(s.barriers.reduce((a,b)=>a+b.amount,0))}`;}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-sample]'))b.onclick=()=>setSample(b.dataset.sample as EliteId);
($('rank') as HTMLSelectElement).onchange=()=>{rank=+($('rank') as HTMLSelectElement).value;setup();};($('scenario') as HTMLSelectElement).onchange=()=>{scenario=($('scenario') as HTMLSelectElement).value;setup();};($('quality') as HTMLSelectElement).onchange=()=>view.p4Effects.quality=($('quality') as HTMLSelectElement).value as any;
$('restart').onclick=setup;$('pause').onclick=()=>{world.paused=!world.paused;stepper.reset();$('pause').textContent=world.paused?'继续':'暂停';};$('skip').onclick=()=>advance(Math.max(0,12-world.time));$('switch-target').onclick=()=>{const t=[...world.entities.values()].find(e=>e.owner==='zerg'&&!e.flying&&e.hp>0);if(t)t.cloaked=!t.cloaked;};$('zoom').onclick=()=>{zoom=zoom===1.5?1.05:1.5;resize();};
$('strike').onclick=()=>{const p=[...world.entities.values()].filter(e=>e.owner==='terran'&&e.id!==source&&e.hp>0),a=enemy(7,0);for(const target of p)world.hit(target,Math.min(250,target.maxHp*.3),[],1,'zerg',0,0,a.id);world.entities.delete(a.id);};
$('save').onclick=()=>{saved=structuredClone(world.captureRun());$('result').textContent='样本已保存';};$('restore').onclick=()=>{if(!saved)return;view.resetRun();world.restoreRun(saved);stepper.reset();$('pause').textContent='继续';$('result').textContent='已恢复 · 暂停';};
addEventListener('blur',()=>{if(ready){world.paused=true;stepper.reset();$('pause').textContent='继续';}});
(window as any).__P4_SAMPLE_REPORT__=()=>({ready,sample,rank,scenario,time:world.time,paused:world.paused,schema:RUN_SCHEMA,source:world.entities.get(source),state:structuredClone(world.p4Samples),healed:world.stats.healed,damage:world.stats.damage,render:view.p4Effects.report(),errors:[...view.modelErrors,...view.fx.errors],patients:[...baseline].map(([id,before])=>({id,before,hp:world.entities.get(id)?.hp,maxHp:world.entities.get(id)?.maxHp})),targetPlanes:[...world.entities.values()].filter(e=>e.owner==='zerg').map(e=>({id:e.id,air:e.flying,hp:e.hp}))});
(window as any).__P4_SAMPLE_ADVANCE__=(seconds:number)=>{advance(seconds);view.render(0,0);};
async function load(){await loadEmbeddedAssets();await prepareEmbeddedAssetIds(selected,(d,t)=>$('interface').textContent=`准备样本 ${d}/${t}`);await view.fx.load();await view.p4Effects.loadMedicalTextures();await view.prepareP4Assets();for(const type of ['hellion','medivac','science_vessel','marauder','marine','tank','roach','mutalisk'] as const)if(!await view.ensureUnitVariant(type,type))throw Error(view.modelErrors.join(';'));for(const id of ['hellion.3','medivac.2','science_vessel.1'] as const)if(!await view.ensureUnitVariant(ELITES[id].model,ELITES[id].family))throw Error(view.modelErrors.join(';'));
 const tex=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(.18,.18);tex.offset.set(.02,.02);const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({map:tex,color:0x92988c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);setSample(sample);await view.warmPresentationBatches();ready=true;$('interface').hidden=true;for(const b of document.querySelectorAll<HTMLButtonElement>('[data-sample]'))b.disabled=false;last=performance.now();}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='载入失败：'+e.message;console.error(e);});
