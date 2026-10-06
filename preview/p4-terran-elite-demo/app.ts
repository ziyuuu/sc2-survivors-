import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {ELITES} from '../../src/data/elites';
import {TERRAN_ELITE_IDS,TERRAN_ELITE_RULES,type TerranEliteId} from '../../src/data/terran-elites';
import {eliteCombat,absorbCurrentReapers} from '../../src/simulation/combat/terran-elite-runtime';
import {familyModeState,FAMILY_MODES,type ModeFamily} from '../../src/simulation/combat/family-actions';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {RUN_SCHEMA,type RunSnapshot} from '../../src/simulation/persistence/run-snapshot';
import type {FamilyId} from '../../src/data/races';
const $=(id:string)=>document.getElementById(id)!;
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10530}),canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,w);view.cameraShake=false;
let id:TerranEliteId='marine.1',rank=1,scenario='group',ready=false,last=performance.now(),saved:RunSnapshot|null=null,source=0,zoom=1.55;
const family=()=>ELITES[id].family,medical=()=>['medivac','science_vessel'].includes(family());
const families=[...new Set(TERRAN_ELITE_IDS.map(id=>ELITES[id].family))];
let initial=new Map<number,number>();const wall=new THREE.Group();view.scene.add(wall);
function resize(){view.resize();view.camera.zoom=canvas.clientWidth<canvas.clientHeight?1:zoom;view.camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(canvas);
function foe(x:number,z:number,air=false){const e=w.addUnit(air?'mutalisk':'roach','zerg',x,z,1,'regular',13);e.hp=e.maxHp=100000;e.armor=0;e.stoppedUntil=e.nextShotAt=e.specialReady=1e9;e.moveSpeed=0;
 e.attributes=scenario==='light'?['Light','Biological']:['Armored','Biological'];if(scenario==='elite')e.enemyTier='elite';if(scenario==='boss')e.enemyTier='boss';if(id==='science_vessel.3'){e.shield=e.maxShield=6000;e.shieldArmor=1;e.shieldRegen=0;e.energy=100;}initial.set(e.id,e.hp);return e;}
function setup(){
 view.resetRun();w.resetRun();w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.pickups=[];w.rewardDrops=[];w.stage=13;w.obstacles=[];initial=new Map();w.wallet.minerals=0;for(const c of Object.values(w.expedition.production))c.enabled={};
 for(const m of [...wall.children]){m.removeFromParent();(m as THREE.Mesh).geometry.dispose();((m as THREE.Mesh).material as THREE.Material).dispose();}
 const f=family();w.expedition.familySlots=medical()?['marauder','tank',f]:[f];w.expedition.tech['unlock.'+f]=1;w.expedition.tech.cloak=1;
 const u=w.addUnit(f,'terran',-4,0,rank);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);u.energy=u.maxEnergy;source=u.id;
 if(medical()){
  for(let i=0;i<7;i++){const type=scenario==='mixed'?(i%2?'marauder':'tank'):f==='science_vessel'?'tank':'marauder',p=w.addUnit(type,'terran',.5+(i%3)*2.6,-3+Math.floor(i/3)*3,5);p.hp=p.maxHp*(scenario==='full'?1:.2);p.stoppedUntil=p.nextShotAt=1e9;p.lastDamagedAt=w.time;p.lastShotAt=w.time;initial.set(p.id,p.hp);}
  if(scenario==='empty')u.energy=0;if(id!=='science_vessel.1'&&f==='science_vessel'){foe(2,7);foe(4,7);foe(3,8.5,true);}
 }else{
  const air=scenario==='air'||f==='viking'&&scenario!=='landing';for(let i=0;i<(scenario==='single'?1:5);i++)foe((id==='hellion.3'?0:4.5)+(i%3)*2.8,(id==='hellion.3'?-1.2:-3)+Math.floor(i/3)*(id==='hellion.3'?2.4:3),air);if(scenario!=='single')foe(9,4,!air);
  if(id==='marine.3'){for(let i=0;i<2;i++){const p=w.addUnit('marine','terran',-4,-3-i*2,5);p.nextShotAt=1e9;}}
  if(id==='reaper.3'){w.addUnit('reaper','terran',-6,-2,5);const e=w.addUnit('reaper','terran',-6,2,3);e.eliteId='reaper.1';w.refreshStats(e,true);absorbCurrentReapers(w,u);}
  if(id==='banshee.3')u.nextShotAt=8;
 }
 if(scenario==='wall'){w.obstacles=[{x:0,z:0,w:.7,h:7}];const mesh=new THREE.Mesh(new THREE.BoxGeometry(.7,.75,7),new THREE.MeshStandardMaterial({color:0x717572,metalness:.6,roughness:.6}));mesh.position.set(0,.375,0);wall.add(mesh);}
 w.hash.rebuild(w.entities.values());w.paused=false;if(f==='tank'&&id!=='tank.1')w.setFamilyMode('tank','siege');if(f==='viking'&&scenario==='landing')w.setFamilyMode('viking','viking_assault');
 stepper.reset();$('pause').textContent='暂停';$('name').textContent=TERRAN_ELITE_RULES[id].name;$('result').textContent='';$('description').textContent=TERRAN_ELITE_RULES[id].description.replaceAll('提案','设计');$('skip').hidden=id!=='hellion.3';$('strike').hidden=!medical();$('mode').hidden=!(f in FAMILY_MODES)||id==='tank.1';$('absorb').hidden=id!=='reaper.3';
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-elite]'))b.setAttribute('aria-pressed',String(b.dataset.elite===id));resize();w.changed();
}
function chooseFamily(f:FamilyId){$('variants').innerHTML=TERRAN_ELITE_IDS.filter(id=>ELITES[id].family===f).map(id=>`<button data-elite="${id}">${TERRAN_ELITE_RULES[id].name}</button>`).join('');for(const b of document.querySelectorAll<HTMLButtonElement>('[data-elite]'))b.onclick=()=>chooseElite(b.dataset.elite as TerranEliteId);chooseElite(TERRAN_ELITE_IDS.find(id=>ELITES[id].family===f)!);}
function chooseElite(next:TerranEliteId){id=next;const f=family(),scenes=medical()?[['group','受伤前线'],['mixed','生物／机械混合'],['full','满血'],['empty','空能量']]:[['group','地面群敌'],['single','单体'],['light','轻甲群敌'],['elite','精英群敌'],['boss','Boss身份'],['air','空军'],['wall','墙体通道'],...(f==='viking'?[['landing','真实降落']]:[])];$('scenario').innerHTML=scenes.map(([v,t])=>`<option value="${v}">${t}</option>`).join('');scenario=f==='viking'?'air':'group';($('scenario') as HTMLSelectElement).value=scenario;setup();}
function step(){if(!ready||w.paused)return false;w.stageElapsed=0;w.step();return true;}
const stepper=new FixedStepper(1/60,step,()=>performance.now(),8);
function advance(seconds:number){for(let i=0;i<Math.ceil(Math.min(45,seconds)*60);i++)if(!step())break;}
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-last)/1000);last=now;const alpha=ready&&!w.paused?stepper.advance(dt):0;view.render(dt,alpha);if(!ready)return;const u=w.entities.get(source),s=u?.eliteCombat;
 $('time').textContent=w.time.toFixed(1)+'s';$('energy').textContent=Math.ceil(u?.energy??0)+' / '+Math.ceil(u?.maxEnergy??0);$('healed').textContent=Math.round(w.stats.healed).toString();$('damage').textContent=Math.round(w.stats.damage).toString();
 $('state').textContent=medical()?`受益 ${u?.healTargets?.length??0} · 有效屏障 ${Math.round(w.p4Samples.barriers.reduce((n,b)=>n+b.amount,0))}`:id==='hellion.3'?`大型雷 ${w.p4Samples.mines.length}/8 · 残火 ${w.p4Samples.fires.length}`:id==='reaper.3'?`吸收 ${w.terranElites.absorptions.length} · 成长量 ${s?.absorbed.toFixed(1)??0}`:id==='marine.1'?s?.coolUntil!>w.time?'排热停火':`预热 ${Math.min(5,Math.max(0,w.time-(s?.started??w.time))).toFixed(1)}/5s`:`攻击周期 ${s?.cycles??0} · 在途弹体 ${w.weaponFlights.length}`;
 const f=family();if(f in FAMILY_MODES){const m=familyModeState(w,f as ModeFamily);$('mode').textContent=m.blocked?'落点受阻 · 可取消':m.transitioning?'转换中 · 可取消':FAMILY_MODES[f as ModeFamily].find(([id])=>id===m.next)?.[1]??'转换形态';}
}
const labels=['陆战队员','劫掠者','死神','恶火／恶蝠','攻城坦克','雷神','维京','女妖','医疗艇','科技球'];$('family').innerHTML=families.map(f=>`<option value="${f}">${labels[['marine','marauder','reaper','hellion','tank','thor','viking','banshee','medivac','science_vessel'].indexOf(f)]}</option>`).join('');
($('family') as HTMLSelectElement).onchange=()=>chooseFamily(($('family') as HTMLSelectElement).value as FamilyId);($('rank') as HTMLSelectElement).onchange=()=>{rank=+($('rank') as HTMLSelectElement).value;setup();};($('scenario') as HTMLSelectElement).onchange=()=>{scenario=($('scenario') as HTMLSelectElement).value;setup();};($('quality') as HTMLSelectElement).onchange=()=>{const q=($('quality') as HTMLSelectElement).value as any;view.p4Effects.quality=q;view.terranEliteEffects.quality=q;};
$('restart').onclick=setup;$('pause').onclick=()=>{w.paused=!w.paused;stepper.reset();$('pause').textContent=w.paused?'继续':'暂停';};$('skip').onclick=()=>advance(Math.max(0,12-w.time));$('zoom').onclick=()=>{zoom=zoom===1.55?1.1:1.55;resize();};
$('mode').onclick=()=>{if(w.paused)return;const f=family() as ModeFamily,m=familyModeState(w,f);w.setFamilyMode(f,m.next);};
$('absorb').onclick=()=>{const h=w.entities.get(source);if(!h||h.hp<=0)return;const p=w.freePosition('reaper',h,1.5,5);if(p){w.addUnit('reaper','terran',p.x,p.z,5);absorbCurrentReapers(w,h);}};
$('strike').onclick=()=>{const u=w.entities.get(source);for(const p of w.allies())if(p.id!==source){w.hit(p,Math.min(250,p.maxHp*.3),[],1,'zerg',0);p.lastDamagedAt=w.time;}if(u)u.energy=Math.min(u.maxEnergy,u.energy+100);};
$('save').onclick=()=>{saved=structuredClone(w.captureRun());$('result').textContent='已保存';};$('restore').onclick=()=>{if(!saved)return;view.resetRun();w.restoreRun(saved);stepper.reset();$('pause').textContent='继续';$('result').textContent='已恢复 · 暂停';};
addEventListener('blur',()=>{if(ready){w.paused=true;stepper.reset();$('pause').textContent='继续';}});
(window as any).__TERRAN_ELITE_REPORT__=()=>({ready,id,rank,scenario,time:w.time,paused:w.paused,schema:RUN_SCHEMA,sampleFlag:w.p4Samples.enabled,source:w.entities.get(source),effects:structuredClone(w.effects),state:structuredClone(w.terranElites),mines:structuredClone(w.p4Samples),flights:structuredClone(w.weaponFlights),healed:w.stats.healed,damage:w.stats.damage,shots:w.stats.shots,render:view.report(),targets:[...initial].map(([id,before])=>{const t=w.entities.get(id);return {id,before,hp:t?.hp,maxHp:t?.maxHp,shield:t?.shield,energy:t?.energy,air:t?.flying,team:t?.team};})});
(window as any).__TERRAN_ELITE_ADVANCE__=(seconds:number)=>{advance(seconds);view.render(0,0);};
async function load(){await loadEmbeddedAssets();await prepareEmbeddedAssetIds(selected,(d,t)=>$('interface').textContent=`准备战场 ${d}/${t}`);await view.fx.load();await view.nonHeroEffects.load();await view.p4Effects.loadMedicalTextures();await view.terranEliteEffects.load();await view.prepareP4Assets();
 for(const f of [...families,'roach','mutalisk'] as const)if(!await view.ensureUnitVariant(f,f as FamilyId))throw Error(view.modelErrors.join(';'));
 for(const id of TERRAN_ELITE_IDS)if(!await view.ensureUnitVariant(ELITES[id].model,ELITES[id].family))throw Error(view.modelErrors.join(';'));
 for(const f of ['tank','viking','hellion','thor'] as const)for(const key of [f==='tank'?'siege':f==='viking'?'assault':f==='hellion'?'hellbat':'high_impact',...(f==='tank'?['morph']:[])]){if(assetUrl('model.'+f+'.'+key))await view.ensureUnitVariant(f+'.'+key,f);for(const id of TERRAN_ELITE_IDS.filter(id=>ELITES[id].family===f))if(assetUrl('model.'+ELITES[id].model+'.'+key))await view.ensureUnitVariant(ELITES[id].model+'.'+key,f);}
 const tex=await new THREE.TextureLoader().loadAsync(assetUrl('map.terrain.diffuse')!);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(.18,.18);const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({map:tex,color:0x92988c,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);chooseFamily('marine');await view.warmPresentationBatches();ready=true;$('interface').hidden=true;($('family') as HTMLSelectElement).disabled=false;last=performance.now();}
requestAnimationFrame(frame);load().catch(e=>{$('interface').textContent='载入失败：'+e.message;console.error(e);});
