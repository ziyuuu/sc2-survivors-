import {bindBattleView} from '../ui/controls/battle-actions';
import {captureBattleView} from '../render/input/battle-view';
import {campaignTerrain,chooseCampaignMap,MAP_THEMES} from '../data/campaign-map';
import {bindGameViewport} from '../ui/mobile/viewport';
import {ControlSettings} from '../ui/controls/settings';
import {HudSettings} from '../ui/hud/preferences';
import {embeddedAssetStatus,loadEmbeddedAssets} from '../assets/offline-pack';
import {MapTerrain} from '../simulation/movement/map-terrain';
import {FlatTerrain} from '../simulation/movement/flat-terrain';
import {World} from '../simulation/world';
import {openSaveProfile,RunSession} from './run-session';
import {SaveControls} from '../ui/hud/save-controls';
import {FixedStepper} from '../simulation/fixed-stepper';
import {TUNING} from '../data/game';
import {BattleRenderer} from '../render/scene/battle-renderer';
import {HUD} from '../ui/hud';
import {GamepadInput} from '../ui/gamepad/controller';
import {Input} from '../ui/mobile/input';
import {installDebug} from '../diagnostics/debug';
import {AudioEffects} from '../render/effects/audio';
import {AssetReadinessCoordinator} from './asset-readiness';
import {HERO_IDS_BY_RACE} from '../data/heroes';
import {talentRank} from '../data/mvp-talents';
import type {NewRunPreview} from './run-session';
import {TelemetryClient,TELEMETRY_KEYS} from '../services/telemetry-client';
import {GameObserver} from '../services/game-observer';
import {LoadObserver} from '../services/load-observer';
import {PlayerServices} from '../ui/hud/player-services';
import {httpAssetStatus} from '../assets/http-store';

const canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
canvas.addEventListener('contextmenu',event=>event.preventDefault());
export async function boot(){await loadEmbeddedAssets();let storage:Storage|undefined,factory:IDBFactory|undefined;try{storage=localStorage;}catch{}try{factory=globalThis.indexedDB;}catch{}const saved=await openSaveProfile(factory),world=new World({terrain:campaignTerrain(chooseCampaignMap(crypto.getRandomValues(new Uint32Array(1))[0])),endlessTerrain:new FlatTerrain(),permanentProfile:saved.profile,race:saved.profile.activeRace});const session=new RunSession(world,saved.repository,saved);const controls=new ControlSettings(storage);const view=new BattleRenderer(canvas,world),hud=new HUD(world,view,controls,new HudSettings(storage)),audio=new AudioEffects(),readiness=new AssetReadinessCoordinator(world,view,audio);bindBattleView(world,()=>captureBattleView(canvas,view.camera));hud.session=session;hud.readiness=readiness;hud.audio=audio;readiness.onChange=()=>hud.update();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause(),controls,{canvas,inspect:(x,y)=>{const id=view.pickCarrier(x,y);if(id===null)return false;hud.carrierInspector.show(id);return true;},pick:(x,y,touch)=>view.pick(x,y,touch),pickMove:(x,y)=>view.pickMove(x,y),previewTarget:point=>{view.targetPreview=point;}});hud.inputReset=()=>input.reset();hud.onStart=()=>void audio.start();
 const gamepad=new GamepadInput(world,()=>hud.pause(),()=>input.reset());
 const telemetry=new TelemetryClient({storage}),loadingObservation=new LoadObserver(view.renderer);
 const environment=()=>({build:document.querySelector<HTMLMetaElement>('meta[name="sc2-app-build"]')?.content??'development',release:httpAssetStatus()?.release??'development',device:(matchMedia('(pointer:coarse)').matches?'mobile':'desktop') as 'mobile'|'desktop',orientation:(innerWidth<innerHeight?'portrait':'landscape') as 'portrait'|'landscape',animation:view.animationMode,diagnostic:import.meta.env.DEV});
 const observer=new GameObserver(world,telemetry,environment),playerServices=new PlayerServices(world,telemetry,observer,()=>{input.reset();gamepad.reset();},()=>hud.update(),()=>({build:environment().build,release:environment().release,race:world.phase==='menu'?hud.menuRace:world.expedition.race,difficulty:world.phase==='menu'?hud.menuDifficulty:world.difficulty,stage:world.phase==='menu'?0:world.endless?.round??world.stage,mode:world.endless?'endless':'campaign'}),storage);hud.playerServices=playerServices;
 telemetry.onChange=()=>{observer.syncConsent();loadingObservation.setActive(telemetry.active);playerServices.refresh();};void telemetry.initialize();
 window.addEventListener('storage',e=>{if(e.key===TELEMETRY_KEYS.identity)telemetry.synchronize();});window.addEventListener('online',()=>{void telemetry.retryPrivacy();void telemetry.flush();});setInterval(()=>observer.pulse(),15000);
 let observedLoading:{kind:string;at:number;assets:ReturnType<typeof httpAssetStatus>;stats:ReturnType<LoadObserver['snapshot']>;consentId:string|undefined}|null=null;
 readiness.onChange=()=>{if(telemetry.active&&readiness.state.kind&&!observedLoading)observedLoading={kind:readiness.state.kind,at:performance.now(),assets:httpAssetStatus(),stats:loadingObservation.snapshot(),consentId:telemetry.identity?.consentId};if(observedLoading&&['ready','error'].includes(readiness.state.phase)){const a=httpAssetStatus(),before=observedLoading.assets,stats=loadingObservation.snapshot();if(telemetry.active&&observedLoading.consentId===telemetry.identity?.consentId)telemetry.record({...environment(),runId:world.runId,kind:'load',data:{cold:(a?.downloadBytes??0)>(before?.downloadBytes??0),milliseconds:performance.now()-observedLoading.at,networkBytes:Math.max(0,(a?.downloadBytes??0)-(before?.downloadBytes??0)),cacheHits:Math.max(0,(a?.cacheHits??0)-(before?.cacheHits??0)),cacheMisses:Math.max(0,(a?.cacheMisses??0)-(before?.cacheMisses??0)),failures:stats.failures-observedLoading.stats.failures+(readiness.state.phase==='error'?1:0),parseMs:stats.parseMs-observedLoading.stats.parseMs,gpuMs:stats.gpuMs-observedLoading.stats.gpuMs}});observedLoading=null;}if(!readiness.state.kind)observedLoading=null;hud.update();};
 controls.listeners.add(()=>gamepad.reset());
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 // Reserve up to 12 ms for fixed-step catch-up; debt is retained and frame work remains bounded.
 const driver=new FixedStepper(TUNING.step,()=>{world.step();return world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision&&!view.assetsPending&&!readiness.state.kind;},()=>performance.now(),12);
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,expedition:world.expedition?{rules:world.expedition.rules,race:world.expedition.race,families:[...world.expedition.familySlots],talentPreset:world.expedition.talentPreset,frozenTalents:world.runConfig?.frozenTalents??null}:null,wallet:{...world.wallet},endless:world.endless?{round:world.endless.round,elapsed:world.endlessElapsed,elites:world.endless.elites,bosses:world.endless.bosses}:null,time:world.time,stats:{...world.stats},assetsReady:view.initialAssetsLoaded,embeddedAssets:embeddedAssetStatus(),readiness:readiness.state,simulationBacklogSeconds:driver.accumulator,discardedSimulationBacklogSeconds:driver.discardedBacklogSeconds,audio:audio.report(),gamepad:gamepad.report(),controls:controls.report(),save:session.report()});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now(),wasSimulating=false;
 bindGameViewport(()=>{view.resize();hud.update();},()=>{input.reset();hud.minimap.resetInput();gamepad.reset();previous=performance.now();wasSimulating=false;});
 const resetPresentation=()=>{input.reset();gamepad.reset();audio.reset();view.resetRun();driver.reset();wasSimulating=false;previous=performance.now();if(debug)debug.speed=1;};
 hud.saveUI=new SaveControls(session,()=>{if(session.resume()){resetPresentation();void audio.start();}hud.update();},()=>hud.update());session.onChange=()=>hud.update();
 let preparedNew:NewRunPreview|null=null;
 hud.onCancelFlow=()=>{preparedNew=null;hud.pendingStageAdvance=false;session.cancelPreparedNewRun();session.cancelPreparedLoad();};
 hud.onPrepareNew=()=>{try{const preset=world.permanentProfile.getPreset(hud.menuRace,hud.menuPreset);if(!preset)throw Error('天赋预设不存在');const hero=talentRank(preset.levels,hud.menuRace,'hero_support')?(hud.starterHeroChoice??HERO_IDS_BY_RACE[hud.menuRace][0]):null;preparedNew=session.prepareNewRun(hud.menuRace,hud.menuDifficulty,hud.menuPreset,hero);hud.loadingMapName=preparedNew.campaignMap?MAP_THEMES[preparedNew.campaignMap.theme].name:"战役前线";void readiness.prepare('new',{race:preparedNew.race,hero:preparedNew.hero,campaignMap:preparedNew.campaignMap});}catch(error){hud.flowError=String((error as Error).message);hud.update();}};
 hud.onPrepareLoad=()=>{if(!hud.loadPreview){hud.flowError='请选择可读取的存档';hud.update();return;}void readiness.prepare('load',{snapshot:hud.loadPreview.snapshot??undefined});};
 hud.onPrepareEndless=()=>{void readiness.prepare('endless');};
 let preparedAdvance:{runId:string|null;window:number;revision:number}|null=null;
 hud.onPrepareReinforcement=()=>{if(readiness.blocking)return;preparedAdvance=hud.pendingStageAdvance?{runId:world.runId,window:world.draftWindowId,revision:world.expedition.shopRevision}:null;void readiness.prepare('reinforcement');};
 readiness.onReady=(kind,token)=>{if(kind==='reinforcement'&&token===readiness.readyToken)hud.onCommitFlow();};
 hud.onCommitFlow=()=>{const kind=readiness.state.kind,token=readiness.readyToken;if(!kind||!token)return;
  if(kind==='new'){if(!preparedNew||!session.commitNewRun(preparedNew.id,token,readiness.readyToken??'')){hud.flowError=session.message||'新局提交失败';readiness.cancel();hud.update();return;}preparedNew=null;resetPresentation();readiness.cancel();void audio.start();}
  else if(kind==='load'){if(!hud.loadPreview||!session.commitLoad(hud.loadPreview.id,token,readiness.readyToken??'')){hud.flowError=session.message||'存档提交失败';readiness.cancel();hud.update();return;}hud.loadPreview=null;resetPresentation();readiness.cancel();}
  else if(kind==='endless'){const plan=world.previewEndlessTransition();if(!plan){readiness.fail('无尽落点或窗口修订已变化，请重试');return;}const readyToken=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;if(!world.registerEndlessReadyToken(readyToken)||!world.commitEndlessTransition(plan.requestId,plan.expectedRevision,readyToken)){readiness.fail('无尽转场未提交，当前整备保持不变');return;}resetPresentation();readiness.cancel();session.requestSave();void audio.start();}
  else if(kind==='reinforcement'){
   const advance=hud.pendingStageAdvance;if(advance&&(!preparedAdvance||preparedAdvance.runId!==world.runId||preparedAdvance.window!==world.draftWindowId||preparedAdvance.revision!==world.expedition.shopRevision)){readiness.fail('关间状态已变化，请返回重新选择下一关');return;}hud.pendingStageAdvance=false;preparedAdvance=null;
   if(advance&&!world.skipReward()){readiness.fail('关间选择状态已变化，请重新准备');hud.update();return;}
   readiness.cancel();
  }else readiness.cancel();hud.update();};
 canvas.addEventListener('webglcontextlost',()=>readiness.fail('WebGL 上下文丢失，请等待恢复后重试或导出存档'));
 canvas.addEventListener('webglcontextrestored',()=>{if(readiness.state.kind)void readiness.retry();else if(world.phase==='battle')void readiness.prepare('reinforcement');});
 hud.onRestart=()=>{
  hud.pendingStageAdvance=false;
  session.keepRun();
  resetPresentation();
  world.resetRun();hud.root.querySelector<HTMLButtonElement>('[data-action=save-continue]:not(:disabled),[data-action=start]')?.focus();
 };

 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){if(!readiness.state.kind)view.prepareRosterAssets();if(view.assetsPending||readiness.state.kind||playerServices.blocking){input.reset();gamepad.reset();}else{input.poll();gamepad.poll(now);}let alpha=1;const simulating=world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision&&!view.assetsPending&&!readiness.state.kind&&!playerServices.blocking;if(simulating&&wasSimulating)alpha=driver.advance(elapsed*(debug?.speed??1));else driver.reset();wasSimulating=simulating;
   view.render(elapsed,alpha);
   hud.afterRender();
   try{observer.frame(elapsed*1000,driver.accumulator,simulating);}catch{}
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();driver.reset();if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();session.requestSave();}});
 window.addEventListener('pagehide',()=>{observer.leaving();if(world.runId)void session.saveNow().catch(()=>{});});
 hud.update();hud.root.querySelector<HTMLButtonElement>('[data-action="menu-new"]')?.focus();
}
