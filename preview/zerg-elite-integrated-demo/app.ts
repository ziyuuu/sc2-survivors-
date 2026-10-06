import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {ELITES} from '../../src/data/elites';
import {ZERG_ELITE_IDS,ZERG_ELITE_RULES,type ZergEliteId} from '../../src/data/zerg-elites';
import {createPair,pairFor,pairBodies} from '../../src/simulation/zerg-brood';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {RUN_SCHEMA,type RunSnapshot} from '../../src/simulation/persistence/run-snapshot';
import type {FamilyId} from '../../src/data/races';
const $=(id:string)=>document.getElementById(id)!;
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10531}),canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,w);view.cameraShake=false;
let id:ZergEliteId='zergling.1',rank=1,scenario='group',ready=false,last=performance.now(),saved:RunSnapshot|null=null,source=0,zoom=1.4;
const families=[...new Set(ZERG_ELITE_IDS.map(id=>ELITES[id].family))],family=()=>ELITES[id].family;
let initial=new Map<number,number>();const walls=new THREE.Group();view.scene.add(walls);
function resize(){view.resize();view.camera.zoom=canvas.clientWidth<canvas.clientHeight?.92:zoom;view.camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);
function foe(x:number,z:number,air=false){const e=w.addUnit(air?'mutalisk':'marine','zerg',x,z,1,'regular',13);e.hp=e.maxHp=1000000;e.armor=0;e.stoppedUntil=e.nextShotAt=e.specialReady=1e9;e.moveSpeed=0;e.attributes=scenario==='light'?['Light','Biological']:['Armored','Biological'];if(scenario==='elite')e.enemyTier='elite';if(scenario==='boss')e.enemyTier='boss';initial.set(e.id,e.hp);return e;}
function setup(){
 view.resetRun();w.resetRun();w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.expedition.zerglingPairs=[];w.pickups=[];w.rewardDrops=[];w.stage=13;w.obstacles=[];initial=new Map();w.wallet.minerals=0;for(const c of Object.values(w.expedition.production))c.enabled={};
 for(const m of [...walls.children]){m.removeFromParent();(m as THREE.Mesh).geometry.dispose();((m as THREE.Mesh).material as THREE.Material).dispose();}
 const f=family();w.expedition.familySlots=['roach','mutalisk','ultralisk',f].filter((x,i,a)=>a.indexOf(x)===i) as FamilyId[];w.expedition.tech['unlock.'+f]=1;w.expedition.tech.bile=1;
 const u=f==='zergling'?createPair(w,{x:-4,z:0},rank):w.addUnit(f,'terran',-4,0,rank);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);if(u.pairId)for(const b of pairBodies(w,pairFor(w,u)!))w.refreshStats(b,true);u.energy=u.maxEnergy;u.bileCooldown=0;source=u.id;
 if(id==='queen.1'||id==='queen.2'||scenario==='wounds'||scenario==='empty'){
  for(let i=0;i<6;i++){const p=w.addUnit('ultralisk','terran',.5+(i%3)*2.4,-3+Math.floor(i/3)*4,5);p.hp=p.maxHp*.15;p.stoppedUntil=p.nextShotAt=1e9;initial.set(p.id,p.hp);}if(scenario==='empty')u.energy=u.energyRegen=0;
  if(id==='queen.1')foe(4,6);
 }else{
  const air=scenario==='air';const line=scenario==='line'||f==='mutalisk';const melee=['zergling','baneling','ultralisk'].includes(f);const n=scenario==='single'?1:6;
  for(let i=0;i<n;i++)foe(line?3+i*2.4:melee?-.5+(i%3)*1.8:3+(i%3)*2.2,line?0:-2+Math.floor(i/3)*3,air);
  if(id==='corruptor.2'){const ally=w.addUnit('mutalisk','terran',-1,2,5);ally.nextShotAt=ally.stoppedUntil=1e9;initial.set(ally.id,ally.hp);}
 }
 if(scenario==='lowhp'||id==='roach.1')u.hp=u.maxHp*.3;
 if(id==='mutalisk.3')u.nextShotAt=8;
 if(scenario==='wall'){w.obstacles=[{x:0,z:0,w:.7,h:7}];const mesh=new THREE.Mesh(new THREE.BoxGeometry(.7,.75,7),new THREE.MeshStandardMaterial({color:0x717572,metalness:.6,roughness:.6}));mesh.position.set(0,.375,0);walls.add(mesh);}
 w.hash.rebuild(w.entities.values());w.paused=false;if(f==='lurker')w.setFamilyMode('lurker','lurker_burrowed');stepper.reset();$('pause').textContent='暂停';$('name').textContent=ZERG_ELITE_RULES[id].name;$('result').textContent='';$('description').textContent=ELITES[id].description;$('strike').hidden=!['queen','corruptor'].includes(f);$('mode').hidden=f!=='lurker';
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-elite]'))b.setAttribute('aria-pressed',String(b.dataset.elite===id));resize();w.changed();
}
function chooseFamily(f:FamilyId){$('variants').innerHTML=ZERG_ELITE_IDS.filter(id=>ELITES[id].family===f).map(id=>`<button data-elite="${id}">${ZERG_ELITE_RULES[id].name}</button>`).join('');for(const b of document.querySelectorAll<HTMLButtonElement>('[data-elite]'))b.onclick=()=>chooseElite(b.dataset.elite as ZergEliteId);chooseElite(ZERG_ELITE_IDS.find(id=>ELITES[id].family===f)!);}
function chooseElite(next:ZergEliteId){id=next;const scenes=[['group','地面群敌'],['single','单体'],['line','直线穿透'],['light','轻甲群敌'],['elite','精英群敌'],['boss','Boss身份'],['air','空中连环'],['wounds','生物伤员'],['empty','无能量'],['lowhp','低血量'],['wall','墙体通道']];$('scenario').innerHTML=scenes.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');scenario=family()==='corruptor'?'air':id==='queen.1'||id==='queen.2'?'wounds':family()==='hydralisk'||family()==='lurker'?'line':'group';($('scenario') as HTMLSelectElement).value=scenario;setup();}
function step(){if(!ready||w.paused)return false;w.stageElapsed=0;w.step();return true;}
const stepper=new FixedStepper(1/60,step,()=>performance.now(),8);
function advance(seconds:number){for(let i=0;i<Math.ceil(Math.min(45,seconds)*60);i++)if(!step())break;}
function hurt(friendly=false){const caster=w.entities.get(source);if(!caster)return;const targets=friendly?w.allies().filter(p=>p.id!==source):[caster];const enemy=[...w.entities.values()].find(p=>p.owner==='zerg');for(const p of targets)w.hit(p,Math.min(p.hp*.45,p.maxHp*.2),[],1,'zerg',0,1,enemy?.id);}
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;const alpha=ready&&!w.paused?stepper.advance(dt):0;view.render(dt,alpha);if(!ready)return;const u=w.entities.get(source),s=u?.zergEliteCombat;
 $('time').textContent=w.time.toFixed(1)+'s';$('energy').textContent=Math.ceil(u?.energy??0)+' / '+Math.ceil(u?.maxEnergy??0);$('healed').textContent=Math.round(w.stats.healed).toString();$('damage').textContent=Math.round(w.stats.damage).toString();
 $('state').textContent=id.startsWith('zergling.')?`真实身体 ${u?.pairId?pairBodies(w,pairFor(w,u)!).length:0} · 攻击周期 ${s?.cycles??0}`:id==='queen.2'?`输血 ${w.zergElites.heals.reduce((n,h)=>n+h.targets.length,0)} · 冷却 ${Math.ceil(Math.max(0,(s?.ready??0)-w.time))}s`:`攻击周期 ${s?.cycles??0} · 在途 ${w.weaponFlights.length+w.zergElites.biles.length+w.zergElites.lines.length}`;
 $('mode').textContent=u?.nativeModeUntil?'转换中':u?.nativeMode==='lurker_burrowed'?'出土':'埋地';
}
const labels=['跳虫','毒爆虫','蟑螂','破坏者','刺蛇','虫后','潜伏者','飞龙','腐化者','雷兽'];$('family').innerHTML=families.map((f,i)=>`<option value="${f}">${labels[i]}</option>`).join('');
($('family') as HTMLSelectElement).onchange=()=>chooseFamily(($('family') as HTMLSelectElement).value as FamilyId);($('rank') as HTMLSelectElement).onchange=()=>{rank=+($('rank') as HTMLSelectElement).value;setup();};($('scenario') as HTMLSelectElement).onchange=()=>{scenario=($('scenario') as HTMLSelectElement).value;setup();};($('quality') as HTMLSelectElement).onchange=()=>{view.fx.heroQuality=($('quality') as HTMLSelectElement).value as any;};
$('restart').onclick=setup;$('pause').onclick=()=>{w.paused=!w.paused;stepper.reset();$('pause').textContent=w.paused?'继续':'暂停';};$('skip').onclick=()=>advance(8);$('zoom').onclick=()=>{zoom=zoom===1.4?1:1.4;resize();};$('mode').onclick=()=>{const u=w.entities.get(source);if(u&&!w.paused)w.setFamilyMode('lurker',u.nativeMode==='lurker_burrowed'?'lurker':'lurker_burrowed');};$('hurt').onclick=()=>hurt();$('strike').onclick=()=>hurt(true);
$('save').onclick=()=>{saved=structuredClone(w.captureRun());$('result').textContent='已保存';};$('restore').onclick=()=>{if(!saved)return;view.resetRun();w.restoreRun(saved);stepper.reset();$('pause').textContent='继续';$('result').textContent='已恢复 · 暂停';};
addEventListener('blur',()=>{if(ready){w.paused=true;stepper.reset();$('pause').textContent='继续';}});
(window as any).__ZERG_ELITE_REPORT__=()=>({ready,id,rank,scenario,time:w.time,paused:w.paused,schema:RUN_SCHEMA,source:w.entities.get(source),allies:w.allies(),effects:structuredClone(w.effects),state:structuredClone(w.zergElites),flights:structuredClone(w.weaponFlights),pairs:structuredClone(w.expedition.zerglingPairs),healed:w.stats.healed,damage:w.stats.damage,shots:w.stats.shots,render:view.report(),targets:[...initial].map(([id,before])=>{const t=w.entities.get(id);return {id,before,hp:t?.hp,maxHp:t?.maxHp,shield:t?.shield,energy:t?.energy,air:t?.flying,team:t?.team};})});
(window as any).__ZERG_ELITE_ADVANCE__=(seconds:number)=>{advance(seconds);view.render(0,0);};
async function load(){await loadEmbeddedAssets();await prepareEmbeddedAssetIds(selected,(d,t)=>$('interface').textContent=`准备战场 ${d}/${t}`);await view.fx.load();await view.zergEliteEffects.load();await view.p4Effects.loadMedicalTextures();await view.terranEliteEffects.load();
 for(const f of [...families,'marine','tank'] as FamilyId[])if(!await view.ensureUnitVariant(f,f))throw Error(view.modelErrors.join(';'));
 for(const id of ZERG_ELITE_IDS)if(!await view.ensureUnitVariant(ELITES[id].model,ELITES[id].family))throw Error(view.modelErrors.join(';'));
 const tex=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(.18,.18);const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({map:tex,color:0x92988c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);chooseFamily('zergling');await view.warmPresentationBatches();ready=true;$('interface').hidden=true;($('family') as HTMLSelectElement).disabled=false;last=performance.now();}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='载入失败：'+e.message;console.error(e);});
