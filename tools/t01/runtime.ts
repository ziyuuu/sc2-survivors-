import type {boot} from '../../src/app/bootstrap';
import type {Case} from './catalogue';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {ELITES} from '../../src/data/elites';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {prepareLabCase} from '../../src/diagnostics/fun-lab-cases';
import {initializeCarrierSubsystem,ownedInterceptors} from '../../src/simulation/combat/carriers';
import {prepareActorMode} from './actor-mode-fixture';
import type {Race,FamilyId} from '../../src/data/races';
import type {Entity} from '../../src/simulation/types';
import {prepareCardWorld,prepareCardQuote,inspection} from './card-fixture';
import {draftContext,purchaseOffer} from '../../src/simulation/expedition-economy';
import type {ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {ASSETS} from '../../src/assets/manifest';
import {prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {RESCUE_PRESENTATION} from '../../src/data/economy';
import {campaignTerrain,type CampaignTheme} from '../../src/data/campaign-map';
import {unitData} from '../../src/simulation/combat/expedition-combat';
import {prepareDevelopment,type DevelopmentFixture} from './development-fixture';
import {prepareEquipmentPreview,beforeEquipmentPreview,equipmentPreviewSnapshot,type EquipmentPreview} from './equipment-preview-runtime';
import {prepareCardEffect,triggerCardEffect,stepCardEffectFixture,cardEffectSnapshot} from './card-effect-fixture';
import {setDiagnosticHealthLock,diagnosticHealthLock} from '../../src/diagnostics/combat-lock';
import {prepareEnemyFixture,triggerEnemyFixture,beforeEnemyStep,afterEnemyStep,enemyFixtureSnapshot,type EnemyPrepared} from './enemy-fixture';
import {displayActiveModelKey} from '../../src/render/materials/elite-visual';
import {Box3,Vector3} from 'three';
import {AIR_HEIGHT} from '../../src/data/terrain';
import {modelPresentationScale} from '../../src/data/combat-presentation';
import {fleetChildPoint} from '../../src/render/effects/protoss-hero-presentation';
import {fitGalleryCamera,includeModel} from './gallery-framing';
import {preparePresentation,beforePresentationStep,type PresentationFixture} from './presentation-repair-fixture';

export function installRuntime(app:Awaited<ReturnType<typeof boot>>){
 const {world:w,view,hud,readiness,driver}=app;
 const realStep=w.step.bind(w);let playing=false,speed=1,credit=0,selected:Case|null=null,startedAt=0,actorId:number|null=null,targetId:number|null=null;
 const events:unknown[]=[];let serial=0,card:ExpeditionReward|null=null,receipt:unknown=null,patientId:number|null=null,initial:unknown=null,abilityCancelled=false,immediateEffect=false;
 let enemy:EnemyPrepared|null=null;let equipment:EquipmentPreview|null=null;
 let presentation:PresentationFixture|null=null;
 let gallery=false,birthSeconds=0,arrivalPod:number|null=null,framing=1;
 const galleryBounds=new Box3();
 function updateGalleryBounds(){
  if(presentation?.kind==='mission'){
   const key=presentation.model;
   const port=view as unknown as {missionTemplates:Map<string,{root:import('three').Object3D}>;missionDeaths:Map<number,{root:import('three').Object3D}>};
   const template=port.missionTemplates.get(key);if(template)galleryBounds.union(new Box3().setFromObject(template.root));
   const worker=view.gpu.get(key);if(worker)includeModel(galleryBounds,worker,{x:0,y:0,z:0},1);
   for(const death of port.missionDeaths.values()){
    death.root.updateWorldMatrix(true,true);
    death.root.traverse(node=>{const mesh=node as import('three').SkinnedMesh;if(mesh.isSkinnedMesh)mesh.computeBoundingBox();});
    galleryBounds.union(new Box3().setFromObject(death.root));
   }
   return;
  }
  const actor=current()??(equipment?w.starship.life.roster.get(equipment.actorId):undefined);if(!actor)return;
  const children=ownedInterceptors(w,actor.id);
  const additional=equipment?w.allies():presentation?.kind==='fleet'?[...w.missions.fleet.ships.keys()].flatMap(id=>w.entities.get(id)??[]):[];
  const bodies=[actor,...additional,...children,...[targetId,patientId].flatMap(id=>id===null?[]:w.entities.has(id)?[w.entities.get(id)!]:[])];
  for(const u of bodies){const model=view.gpu.get(displayActiveModelKey(u));if(model)includeModel(galleryBounds,model,{x:u.x,y:u.flying?AIR_HEIGHT:0,z:u.z},modelPresentationScale(u));}
  if(equipment){for(const fort of w.fortifications.values()){galleryBounds.expandByPoint(new Vector3(fort.x-3,0,fort.z-3));galleryBounds.expandByPoint(new Vector3(fort.x+3,5,fort.z+3));}for(const mine of w.expedition.support.mines)galleryBounds.expandByPoint(new Vector3(mine.point.x,1,mine.point.z));}
  if(presentation){const r=presentation.kind==='fleet'?4:presentation.kind==='equipment'?3:2;galleryBounds.expandByPoint(new Vector3(-r,0,-r));galleryBounds.expandByPoint(new Vector3(r,actor.flying?AIR_HEIGHT+2:3,r));}
  if(presentation?.kind==='fleet'&&targetId!==null){const target=w.entities.get(targetId);if(target){galleryBounds.expandByPoint(new Vector3(target.x-7,0,target.z-7));galleryBounds.expandByPoint(new Vector3(target.x+7,5,target.z+7));}}
  if(selected?.action==='death'&&actor.unitType==='baneling'){galleryBounds.expandByPoint(new Vector3(actor.x-6,0,actor.z-6));galleryBounds.expandByPoint(new Vector3(actor.x+6,7,actor.z+6));}
  if(children.length){const model=view.gpu.get('interceptor');if(model)for(const dx of [-1.4,1.4])for(const dz of [-1.4,1.4])includeModel(galleryBounds,model,{x:actor.x+dx,y:AIR_HEIGHT,z:actor.z+dz},1);}
  if(selected?.action==='skill'&&actor.heroId==='purifier_flagship'){
   const model=view.gpu.get('hero.purifier_flagship'),cast=w.heroCasts.find(c=>c.hero==='purifier_flagship');
   if(model&&cast)for(const [index,child]of children.entries())for(const time of [cast.beganAt??cast.at-1.4,cast.at,cast.at+.7]){
    includeModel(galleryBounds,model,fleetChildPoint(cast,child,index,time).point,modelPresentationScale(actor)*.205);
   }
  }
 }
 const cameraPort=view as unknown as {cameraController:{pose:(target:Vector3)=>void;refreshFrustum:()=>void}};
 const originalPose=cameraPort.cameraController.pose.bind(cameraPort.cameraController);
 cameraPort.cameraController.pose=(target:Vector3)=>{
  const focus=target.clone();
  if(gallery&&selected&&['actor','enemy','presentation','equipment'].includes(selected.runner)){
   const actor=current();
   if((actor||presentation||equipment)&&selected.action!=='arrival'){updateGalleryBounds();if(!galleryBounds.isEmpty())galleryBounds.getCenter(focus);}
  }
  if(gallery&&selected?.id==='native-card:terran:support.terran.strategic:effect'){const victim=targetId===null?undefined:w.entities.get(targetId);focus.set(victim?.x??0,4,victim?.z??4);}
  originalPose(focus);
  if(gallery&&selected&&['actor','enemy','presentation','equipment'].includes(selected.runner)&&selected.action!=='arrival'&&!galleryBounds.isEmpty())fitGalleryCamera(view.camera,galleryBounds,focus);
  else if(gallery&&framing!==1){view.camera.position.sub(focus).multiplyScalar(1/framing).add(focus);view.camera.updateMatrixWorld();}
  if(gallery)cameraPort.cameraController.refreshFrustum();
 };
 const galleryAfterStep=()=>{
  if(!gallery)return;
  if(arrivalPod!==null){const pod=w.pods.find(p=>p.id===arrivalPod);if(pod?.recruitId!==null&&pod?.recruitId!==undefined)actorId=pod.recruitId;}
  const actor=current();if(actor&&selected?.action==='spawn'&&w.time-startedAt<birthSeconds){actor.action='spawn';actor.x=actor.z=0;actor.prev={x:0,z:0};actor.velocity={x:0,z:0};}
 };
 const capture=()=>{for(const e of w.visualEvents)if(e.serial>serial){events.push({...e});serial=Math.max(serial,e.serial);}};
 const step=()=>{if(equipment)beforeEquipmentPreview(w,equipment);if(presentation)beforePresentationStep(w,presentation);if(enemy)beforeEnemyStep(w,enemy);if(selected?.runner==='card-effect')stepCardEffectFixture(w);if(selected?.action==='ability'&&selected.family==='banshee'&&!abilityCancelled&&w.time-startedAt>=8){if(!w.castFamilyAbility('banshee'))throw Error('Native cloak cancellation failed');abilityCancelled=true;receipt={controlledAction:'8秒后通过原生能力开关取消隐形',at:w.time-startedAt};}realStep();if(enemy)afterEnemyStep(w,enemy);galleryAfterStep();hud.audio?.update(w);capture();const actor=current();if(!enemy&&selected?.action==='auto-ability'&&actor&&(actor.abilityReady??0)>w.time&&actor.abilityReady!==Infinity){receipt={controlledAction:'首轮原生自动施法后关闭再次施法，保留已生效技能的完整持续与结束',at:w.time-startedAt,nativeNextReady:actor.abilityReady};actor.abilityReady=Infinity;}if(selected?.seconds&&w.time-startedAt>=selected.seconds&&!(gallery&&selected.action==='idle'))playing=false;};
 w.step=()=>{if(!playing)return;credit+=speed;while(credit>=1){step();credit--;}};
 function clear(){
  setDiagnosticHealthLock(w,false);enemy=null;presentation=null;
  equipment=null;playing=false;credit=0;hud.starship?.close();hud.settingsOpen=false;hud.talentOpen=false;hud.inputReset();readiness.cancel();hud.audio?.reset();
  if(Object.hasOwn(w,'duration'))delete (w as unknown as {duration?:number}).duration;
  w.resetRun('normal');w.starship.account=newEquipmentAccount(529);w.selectRace((selected?.race??'terran') as Race);
  w.terrain=new FlatTerrain();w.obstacles=[];if(!w.start())throw Error('检测战局未能开始');
  w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.effects=[];w.visualEvents=[];w.weaponFlights=[];
  Object.assign(w,{waves:[],specialPlan:[],eventPlan:[],nextWave:Infinity,nextExpansionAt:Infinity});w.swarm.pending=[];
  w.missions.enabled=false;w.encounters.enabled=false;w.fieldEvents.nextPickup=Infinity;w.fieldEvents.nextHorde=Infinity;w.specialStages.portalChecked=w.stage;
  Object.assign(w.fieldEvents.pacing,{stage:w.stage,rolled:true,pending:false});Object.assign(w.anchor,{x:0,z:0});w.trail=[{x:0,z:0}];w.expedition.facilities=[];
  w.wallet={minerals:20000,gas:10000};w.paused=true;actorId=targetId=patientId=null;initial=null;events.length=0;serial=0;driver.reset();view.resetRun();view.resetCameraZoom();
 }
 const assetWaits:{time:number;milliseconds:number}[]=[];
 const current=()=>actorId===null?undefined:w.entities.get(actorId);
 async function prepare(c:Case,target=c.target??'ground',galleryMode=false){
  if(!['actor','enemy','fun','card','card-effect','development','map','equipment','presentation'].includes(c.runner))throw Error('此条执行器尚未接入，目录保留为未测：'+c.id);
  selected=c;clear();gallery=galleryMode;galleryBounds.makeEmpty();birthSeconds=0;arrivalPod=null;framing=c.id==='native-card:terran:support.terran.strategic:effect'?.65:1;assetWaits.length=0;
  if(gallery)Object.defineProperty(w,'duration',{configurable:true,value:3600});
  card=null;receipt=null;abilityCancelled=false;immediateEffect=false;
  if(c.applicability){receipt={applicability:c.applicability,source:c.source};startedAt=w.time;return snapshot();}
  if(c.runner==='card'){card=prepareCardQuote(w,c);actorId=w.allies()[0]?.id??null;}
  else if(c.runner==='development')card=prepareDevelopment(w,c.data as DevelopmentFixture);
  else if(c.runner==='equipment'){equipment=prepareEquipmentPreview(w,c);actorId=equipment.actorId;targetId=equipment.targetId;patientId=equipment.patientId;}
  else if(c.runner==='card-effect'){const e=prepareCardEffect(w,c);actorId=e.actorId;targetId=e.targetId;patientId=e.patientId;receipt=e.receipt;immediateEffect=e.immediate;}
  else if(c.runner==='presentation'){presentation=preparePresentation(w,c);actorId=presentation.actorId;targetId=presentation.kind==='fleet'?presentation.targetId:null;framing=presentation.kind==='fleet'?1.2:presentation.kind==='mission'?1.8:2.3;receipt={presentationOnly:'固定场景提交原生死亡/到期/舰队流程；舰装项提交已生效反馈，经济与触发概率另按机制测试核验。'};}
  else if(c.runner==='fun'){prepareLabCase(w,c.actor!);w.paused=true;}
  else if(c.runner==='map'){w.terrain=campaignTerrain({version:3,seed:529,theme:c.actor as CampaignTheme});const u=w.addUnit('marine','terran',0,0);actorId=u.id;}
  else if(c.runner==='enemy'){enemy=prepareEnemyFixture(w,c,target,realStep);actorId=enemy.actor.id;targetId=enemy.targetId;patientId=enemy.patientId;receipt=enemy.receipt;}
  else{
   let u:Entity|undefined;
   if(c.actor!.startsWith('hero.')){const id=c.actor!.slice(5) as HeroId;for(let i=0;i<c.rank!;i++)if(!w.acquireHero(id))throw Error('英雄合法招募/培养失败 '+id);u=w.heroEntity(id);}
   else {w.expedition.familySlots=[c.family as FamilyId];w.expedition.ledger=[];w.expedition.zerglingPairs=[];
    if(c.actor!.startsWith('elite.')){const id=c.actor!.slice(6) as keyof typeof ELITES;for(let i=0;i<c.rank!;i++)if(!w.acquireElite(id))throw Error('精英招募/培养失败 '+id);u=w.eliteOwned(id);}
    else u=w.addFamilyMember(c.family as FamilyId,{x:0,z:0},c.rank);
   }
   if(!u)throw Error('对象未生成');Object.assign(u,{x:0,z:0,prev:{x:0,z:0}});actorId=u.id;
   if(c.fixture?.mode){receipt={modePreparation:prepareActorMode(w,u,c.fixture.mode,realStep)};Object.assign(u,{x:0,z:0,prev:{x:0,z:0},velocity:{x:0,z:0}});}
   if(['attack','skill','auto-ability','stim','refraction'].includes(c.action!)){
    const owner=u.owner==='terran'?'zerg':'terran',range=Math.max(1.5,Math.min(5,u.attackRange*.7));
    const t=w.addUnit(target==='air'?'mutalisk':target==='shield'?'stalker':'roach',owner,0,range);t.hp=t.maxHp=1e8;t.weaponCooldown=1e6;t.nextShotAt=1e6;t.moveSpeed=0;targetId=t.id;
    if(c.fixture?.targetEdgeDistance!==undefined){t.z=u.z+u.unitRadius+t.unitRadius+c.fixture.targetEdgeDistance;t.prev={x:t.x,z:t.z};}
    // III/V attacks need nearby secondary targets to expose their real native
    // side rounds, bounces and missiles. This is gallery staging only.
    if(gallery&&u.heroId&&c.action==='attack'&&(c.rank??1)>=3){for(const dx of [-1.8,1.8,3.4]){const extra=w.addUnit(t.unitType,t.owner,dx,t.z+.5);extra.hp=extra.maxHp=1e8;extra.stoppedUntil=Infinity;extra.abilityReady=extra.specialReady=extra.nextShotAt=Infinity;}}
    if(c.actor==='hero.swann'||c.actor==='hero.artanis'||c.actor==='hero.niadra'||c.family==='queen'){
     const a=w.addUnit(c.actor==='hero.swann'?'tank':c.actor==='hero.artanis'?'stalker':'roach',u.owner,-3,0);a.hp=a.maxHp*.15;a.shield=0;a.weaponCooldown=1e6;a.nextShotAt=1e6;a.moveSpeed=0;patientId=a.id;
    }
   }
   if(c.action==='heal'){const a=w.addUnit(c.family==='science_vessel'?'tank':'roach',u.owner,2,0);a.hp=a.maxHp*.1;a.weaponCooldown=1e6;a.moveSpeed=0;patientId=a.id;u.energy=u.maxEnergy;}
   if(c.action==='auto-ability'){u.energy=u.maxEnergy;u.abilityReady=0;w.expedition.tech.storm=1;}
   if(c.action==='ability'){w.expedition.tech.cloak=1;w.expedition.tech.blink=1;u.energy=u.maxEnergy;u.abilityReady=0;}
   if(c.action==='stim')w.upgrades.set('stim',1);
   if(c.action==='mode'){w.expedition.tech['unlock.hellion']=1;const mode=(c.data as {mode:string}).mode;
    if(mode===c.family){if(c.family==='tank')u.mode=u.desiredMode='siege';else{u.nativeMode=u.desiredNativeMode=({hellion:'hellbat',viking:'viking_assault',thor:'thor_high_impact',lurker:'lurker_burrowed'} as Record<string,string>)[c.family!] as Entity['nativeMode'];}w.refreshStats(u);}
    // Inspect transformation from the actual resting form, not mid-Birth pose.
    u.action='idle';
   }
   if(c.action==='idle'||c.action==='move')u.weaponCooldown=1e6;
   // Keep the controlled scene alive through the full death presentation.
   // The distant witness is ordinary, mortal and never part of the inspected object.
   if(c.action==='death'||['medivac','science_vessel'].includes(c.family!)){const witness=w.addUnit('marine','terran',50,50);witness.weaponCooldown=1e6;witness.nextShotAt=1e6;witness.moveSpeed=0;witness.hp=witness.maxHp=1e8;}
   initializeCarrierSubsystem(w);w.hash.rebuild(w.entities.values());
  }
  if(c.runner==='card'||c.runner==='development'||immediateEffect){w.changed();hud.update();startedAt=w.time;initial={wallet:{...w.wallet},tech:{...w.expedition.tech},facilities:structuredClone(w.expedition.facilities),cards:{...w.expedition.cardTotals}};return snapshot();}
  // An isolated flat scene must skip the legacy fallback ground on first load.
  // Otherwise load() plus syncMap() would both create a ground surface.
  if(!view.initialAssetsLoaded){
   const rescue=RESCUE_PRESENTATION[w.expedition.race];
   const fixed=['model.'+rescue.workerModel,'model.'+rescue.carrierModel,'model.'+rescue.carrierDeathModel,...(rescue.carrierBirthModel?['model.'+rescue.carrierBirthModel]:[]),'model.drone','model.egg','model.hive','model.loot.mineral','model.loot.gas','model.loot.large','model.projectile.marauder','model.projectile.hydralisk'];
   await prepareEmbeddedAssetIds([...ASSETS.values()].filter(a=>a.status==='available'&&['texture','effect-texture','audio'].includes(a.kind)).map(a=>a.id).concat(fixed));
   await view.load(()=>{},w.expedition.race,true);
  }
  w.changed();if(!await readiness.prepare('reinforcement',{race:w.expedition.race}))throw Error(readiness.state.error??'资源准备失败');
  // Exact-step capture does not yield to the normal battle background queue.
  // Finish the existing production fortification jobs before a later card can
  // create a bunker/repair building inside a synchronous advanceTo call.
  if(['card-effect','fun','equipment'].includes(c.runner)){
   const jobs=view.battleBackgroundJobs(async cancelled=>{if(cancelled())throw Error('检测建筑准备已取消');await new Promise<void>(resolve=>setTimeout(resolve,0));});
   for(const job of jobs.filter(job=>/template:.*:model\.fort\.(bunker|repair)(\.death)?$/.test(job.key)))if(!job.isReady?.())await job.run();
  }
  readiness.cancel();driver.reset();w.paused=false;hud.update();startedAt=w.time;events.length=0;serial=Math.max(0,...w.visualEvents.map(e=>e.serial));view.setCameraMode('fixed');view.render(0,1);
  // syncMap starts asynchronously on the first render. Keep simulation frozen
  // until its real map and pending roster assets exist before the ready frame.
  view.prepareRosterAssets();const mapDeadline=performance.now()+120000;
  while(view.report().assetsPending||!view.report().map){if(performance.now()>mapDeadline)throw Error('检测地图准备超时');await new Promise(resolve=>setTimeout(resolve,16));view.render(0,1);}
  if(view.report().errors.length)throw Error('检测素材准备失败：'+view.report().errors.join('; '));
  if(gallery&&['actor','enemy'].includes(c.runner)){
   const actor=current()!,model=view.gpu.get(displayActiveModelKey(actor));
   if(c.action==='idle'){actor.action='idle';actor.stoppedUntil=Infinity;actor.specialReady=Infinity;actor.abilityReady=Infinity;actor.corrosiveBileReady=Infinity;actor.velocity={x:0,z:0};}
   if(c.action==='spawn'){
    const clip=model?.actions.spawn;if(!clip)throw Error('该模型没有独立出生动画');birthSeconds=clip.duration;actor.action='spawn';actor.stoppedUntil=w.time+birthSeconds;actor.velocity={x:0,z:0};
    receipt={presentationOnly:'保持检查对象静止，完整播放其原始Birth剪辑；游戏规则未改。',clip:clip.name,seconds:birthSeconds};
   }
   const extent=Math.max(4,(model?.bodyHeight??1)*3,(targetId===null?0:Math.hypot(w.entities.get(targetId)!.x-actor.x,w.entities.get(targetId)!.z-actor.z))+3,patientId===null?0:7,c.action==='move'?8:0,c.action==='arrival'?11:0,c.action==='skill'&&actor.heroId?Math.max(HEROES[actor.heroId].radius*2+4,HEROES[actor.heroId].length+3):0);
   framing=Math.max(.85,Math.min(3,14/extent));
   updateGalleryBounds();
   // Keep existing skill reach and the ground contact in frame, including
   // ground-targeted effects cast by an airborne hero.
   if(c.action==='skill'&&actor.heroId){const r=Math.max(HEROES[actor.heroId].radius,HEROES[actor.heroId].length*.5,2);galleryBounds.expandByPoint(new Vector3(actor.x-r,0,actor.z-r));galleryBounds.expandByPoint(new Vector3(actor.x+r,AIR_HEIGHT+2,actor.z+r));}
   if(c.action==='move'){galleryBounds.expandByPoint(new Vector3(-2,0,-2));galleryBounds.expandByPoint(new Vector3(7,2,2));}
  }
  view.render(0,1);initial={actor:current()?{...current(),prev:{...current()!.prev}}:null,patient:patientId===null?null:structuredClone(w.entities.get(patientId)),target:targetId===null?null:structuredClone(w.entities.get(targetId))};return snapshot();
 }
 function trigger(condition='normal'){
  if(!selected)throw Error('尚未选择用例');const u=current(),c=selected;
  if(c.applicability)return snapshot();
  if(immediateEffect){triggerCardEffect(w,c,actorId,targetId);w.changed();hud.update();capture();return snapshot();}
  if(c.runner==='card'||c.runner==='development'){
   if(!card){if(c.runner==='development'){receipt={automatic:true,expected:(c.data as DevelopmentFixture).expected,tech:{...w.expedition.tech},facilities:structuredClone(w.expedition.facilities)};return snapshot();}throw Error('没有实际报价');}const before={wallet:{...w.wallet},cards:{...w.expedition.cardTotals},support:structuredClone(w.expedition.support),fun:{...w.funShop.levels},tech:{...w.expedition.tech},facilities:structuredClone(w.expedition.facilities)};
   if(!purchaseOffer(w,card.offerId,(c.data as any).variant??undefined))throw Error('生产购买校验拒绝 '+card.id);
   receipt={id:card.id,before,after:{wallet:{...w.wallet},cards:{...w.expedition.cardTotals},support:structuredClone(w.expedition.support),fun:{...w.funShop.levels},tech:{...w.expedition.tech},facilities:structuredClone(w.expedition.facilities)},effect:card.expeditionEffect};
   // Immediate receipt stays on its actual production card screen. Combat and
   // delayed delivery paths are separate follow-up cases, never inferred here.
   w.changed();hud.update();capture();return snapshot();
  }
  if(u){
   if(gallery&&c.action==='arrival'){
    const family=c.family as FamilyId;for(const body of w.familyBodies(family))w.entities.delete(body.id);w.expedition.ledger=[];w.expedition.zerglingPairs=[];
    const witness=w.addUnit('marine','terran',50,50);witness.stoppedUntil=Infinity;witness.weaponCooldown=Infinity;
    const pod=w.spawnPod(family,{x:0,z:0},0,1,true);pod.guardTypes=[];pod.guardianIds.clear();arrivalPod=pod.id;actorId=null;
    receipt={nativeDelivery:pod.id,scope:'原生载体落地、打开和释放增援；受控场景移除守军。'};
   }
   if(enemy){triggerEnemyFixture(w,enemy);startedAt=w.time;capture();playing=true;return snapshot();}
   if(c.runner==='card-effect')triggerCardEffect(w,c,actorId,targetId);
   if(c.runner==='equipment'){
    if(condition==='damage')w.hit(u,Math.max(1,u.maxHp*.35),[],1,'zerg',0,0,targetId??undefined,false,false,0,true);
    if(condition==='fatal')w.hit(u,1e12,[],1,'zerg',0,1,targetId??undefined,true);
    if(condition==='move')w.issueMove({x:6,z:0});
    if(condition==='kill'&&targetId!==null){const t=w.entities.get(targetId)!;t.hp=1;u.shotInterval=u.attackPeriod;w.fire(u,t);}
    if(condition==='skill'&&u.heroId){w.heroes.get(u.heroId)!.skillReady=0;if(!w.castHero(u.heroId,w.starship.battleView?.()))throw Error('装备绑定英雄施法条件未满足');}
    if(condition==='periodic'){const due=[...w.starship.cycles.values()].filter(t=>t>w.time).sort((a,b)=>a-b)[0];if(due===undefined)throw Error('此装备没有待触发的周期');const before=w.time;w.time=Math.max(before,due-.25);w.tick=Math.round(w.time*60);receipt={controlledClockJump:{from:before,to:w.time},condition};}
   }
   if(c.action==='refraction')w.hit(u,Math.max(1,(u.shield??0)*.6),[],1,'zerg',0,0,targetId??undefined,false,false,0,true);
   if(c.action==='hit')w.hit(u,Math.max(2,u.maxHp*.08),[],1,u.owner==='terran'?'zerg':'terran',.5,0,targetId??undefined,false,false,0,true);
   if(c.action==='death')w.hit(u,1e12,[],1,u.owner==='terran'?'zerg':'terran',0,1,targetId??undefined,true);
   if(c.action==='move')w.issueMove({x:5,z:0});
   if(c.action==='mode'&&!w.setFamilyMode(c.family as FamilyId,(c.data as {mode:string}).mode))throw Error('变形条件未满足');
   if(c.action==='ability'&&!w.castFamilyAbility(c.family as FamilyId,{x:4,z:0}))throw Error('手动能力条件未满足');
   if(c.action==='stim'&&!w.stim())throw Error('兴奋剂条件未满足');
   if(c.action==='skill'&&u.heroId){w.heroes.get(u.heroId)!.skillReady=0;const p=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}];if(!w.castHero(u.heroId,{ground:p,air:p,occludedGround:[],occludedAir:[]}))throw Error('生产施法条件未满足 '+u.heroId);}
   if(c.action==='skill'&&!u.heroId)u.specialReady=w.time;
  }
  startedAt=w.time;capture();playing=true;return snapshot();
 }
 function snapshot(){const u=current();return {caseId:selected?.id,applicability:selected?.applicability,playing,speed,time:w.time,elapsed:w.time-startedAt,phase:w.phase,initial,enemy:enemy?enemyFixtureSnapshot(w,enemy):undefined,assetWaits:assetWaits.slice(),diagnostic:diagnosticHealthLock(w),cardEffect:selected?.runner==='card-effect'?cardEffectSnapshot(w):undefined,equipment:equipment?equipmentPreviewSnapshot(w,equipment):undefined,actor:u?{id:actorId,hp:u.hp,shield:u.shield,energy:u.energy,action:u.action,shots:u.shotSequence,model:u.modelKey,x:u.x,z:u.z,mode:u.mode,nativeMode:u.nativeMode,weapon:u.activeWeapon,healTarget:u.healTarget,cloaked:u.cloaked,stimUntil:u.stimUntil,targetType:unitData(u).targetType,children:ownedInterceptors(w,u.id).map(child=>({id:child.id,hp:child.hp,x:child.x,z:child.z,shots:child.shotSequence,weapon:child.activeWeapon,targetType:unitData(child).targetType})),eliteState:u.protossEliteCombat}:null,target:targetId===null?null:{id:targetId,hp:w.entities.get(targetId)?.hp,x:w.entities.get(targetId)?.x,z:w.entities.get(targetId)?.z,stoppedUntil:w.entities.get(targetId)?.stoppedUntil},patient:patientId===null?null:{id:patientId,hp:w.entities.get(patientId)?.hp,maxHp:w.entities.get(patientId)?.maxHp,shield:w.entities.get(patientId)?.shield,x:w.entities.get(patientId)?.x,z:w.entities.get(patientId)?.z},events:events.slice(),spells:w.expedition.spells,eliteFields:w.protossElites.fields,casts:w.heroCasts,receipt,render:view.report(),audio:hud.audio?.report(),memoryOnly:app.session.memoryOnly};}
 return {prepare,trigger,snapshot,healthLock(enabled:boolean){return setDiagnosticHealthLock(w,enabled);},pause(){playing=false;w.paused=true;hud.audio?.update(w);},play(){playing=true;w.paused=false;},speed(value:number){if(![.1,.25,.5,1,2].includes(value))throw Error('Invalid speed');speed=value;},step(){playing=false;if(selected?.applicability)return snapshot();w.paused=false;step();view.render(1/60,1);w.paused=true;hud.audio?.update(w);hud.update();return snapshot();},async advanceTo(seconds:number){
   const pausedBefore=w.paused;w.paused=false;try{
   playing=false;if(selected?.applicability)throw Error(selected.applicability.reason);if(seconds<0||seconds>700)throw Error('Invalid capture time');
   const ready=async()=>{view.prepareRosterAssets();if(!view.assetsPending)return;const time=w.time,start=performance.now();
    while(view.assetsPending){if(performance.now()-start>120000)throw Error('检测新增对象资源准备超时');await new Promise(resolve=>setTimeout(resolve,16));}
    if(w.time!==time)throw Error('资源等待期间检测时钟意外前进');assetWaits.push({time:time-startedAt,milliseconds:performance.now()-start});
   };
   await ready();view.render(0,1);
   while(w.time-startedAt<seconds-1e-7){const before=w.time;step();await ready();view.render(1/60,1);if(w.time===before)throw Error('Simulation did not advance: '+w.phase);}
   hud.update();return snapshot();}finally{w.paused=pausedBefore;hud.audio?.update(w);}
  },reset(){if(!selected)throw Error('No case');return prepare(selected);}};
}
