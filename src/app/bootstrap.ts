import {ControlSettings} from '../ui/controls/settings';
import {embeddedAssetStatus,loadEmbeddedAssets} from '../assets/offline-pack';
import {configureMapAssets,loadMapDefinition} from '../render/terrain/original-map';
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

const canvas=document.querySelector<HTMLCanvasElement>('#battle')!;
canvas.addEventListener('contextmenu',event=>event.preventDefault());
export async function boot(){await loadEmbeddedAssets();configureMapAssets();let storage:Storage|undefined,factory:IDBFactory|undefined;try{storage=localStorage;}catch{}try{factory=globalThis.indexedDB;}catch{}const definition=await loadMapDefinition(),saved=await openSaveProfile(storage,factory),world=new World({terrain:new MapTerrain(definition),endlessTerrain:new FlatTerrain(),permanentProfile:saved.profile,race:saved.profile.activeRace});const session=new RunSession(world,saved.repository,saved);const controls=new ControlSettings(storage);const view=new BattleRenderer(canvas,world),hud=new HUD(world,view,controls),audio=new AudioEffects(),readiness=new AssetReadinessCoordinator(world,view,audio);hud.session=session;hud.readiness=readiness;readiness.onChange=()=>hud.update();
 const input=new Input(world,document.querySelector('#joystick')!,()=>hud.pause(),controls,{canvas,pick:(x,y,touch)=>view.pick(x,y,touch),previewTarget:point=>{view.targetPreview=point;}});hud.inputReset=()=>input.reset();hud.onStart=()=>void audio.start();
 const gamepad=new GamepadInput(world,()=>hud.pause(),()=>input.reset());
 controls.listeners.add(()=>gamepad.reset());
 const debug=import.meta.env.DEV?installDebug(world,view):null;
 // Reserve up to 12 ms for fixed-step catch-up; debt is retained and frame work remains bounded.
 const driver=new FixedStepper(TUNING.step,()=>{world.step();return world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision&&!view.assetsPending&&!readiness.state.kind;},()=>performance.now(),12);
 window.__SC2_REPORT__=()=>({...view.report(),phase:world.phase,stage:world.stage,expedition:world.expedition?{rules:world.expedition.rules,race:world.expedition.race,families:[...world.expedition.familySlots],talentPreset:world.expedition.talentPreset,frozenTalents:world.runConfig?.frozenTalents??null}:null,wallet:{...world.wallet},endless:world.endless?{round:world.endless.round,elapsed:world.endlessElapsed,elites:world.endless.elites,bosses:world.endless.bosses}:null,time:world.time,stats:{...world.stats},assetsReady:view.initialAssetsLoaded,embeddedAssets:embeddedAssetStatus(),readiness:readiness.state,simulationBacklogSeconds:driver.accumulator,audio:audio.report(),gamepad:gamepad.report(),controls:controls.report(),save:session.report()});
 world.listeners.add(()=>audio.update(world));
 let previous=performance.now(),wasSimulating=false;
 const resetPresentation=()=>{input.reset();gamepad.reset();audio.reset();view.resetRun();driver.reset();wasSimulating=false;previous=performance.now();if(debug)debug.speed=1;};
 hud.saveUI=new SaveControls(session,()=>{if(session.resume()){resetPresentation();void audio.start();}hud.update();},()=>hud.update());session.onChange=()=>hud.update();
 let preparedNew:NewRunPreview|null=null;
 hud.onCancelFlow=()=>{preparedNew=null;hud.pendingStageAdvance=false;session.cancelPreparedNewRun();session.cancelPreparedLoad();};
 hud.onPrepareNew=()=>{try{const preset=world.permanentProfile.getPreset(hud.menuRace,hud.menuPreset);if(!preset)throw Error('天赋预设不存在');const hero=talentRank(preset.levels,hud.menuRace,'hero_support')?(hud.starterHeroChoice??HERO_IDS_BY_RACE[hud.menuRace][0]):null;preparedNew=session.prepareNewRun(hud.menuRace,hud.menuDifficulty,hud.menuPreset,hero);void readiness.prepare('new',{race:preparedNew.race,hero:preparedNew.hero});}catch(error){hud.flowError=String((error as Error).message);hud.update();}};
 hud.onPrepareLoad=()=>{if(!hud.loadPreview){hud.flowError='请选择可读取的存档';hud.update();return;}void readiness.prepare('load',{snapshot:hud.loadPreview.snapshot??undefined});};
 hud.onPrepareEndless=()=>{void readiness.prepare('endless');};
 hud.onPrepareReinforcement=()=>{void readiness.prepare('reinforcement');};
 hud.onCommitFlow=()=>{const kind=readiness.state.kind,token=readiness.readyToken;if(!kind||!token)return;
  if(kind==='new'){if(!preparedNew||!session.commitNewRun(preparedNew.id,token,readiness.readyToken??'')){hud.flowError=session.message||'新局提交失败';readiness.cancel();hud.update();return;}preparedNew=null;resetPresentation();readiness.cancel();void audio.start();}
  else if(kind==='load'){if(!hud.loadPreview||!session.commitLoad(hud.loadPreview.id,token,readiness.readyToken??'')){hud.flowError=session.message||'存档提交失败';readiness.cancel();hud.update();return;}hud.loadPreview=null;resetPresentation();readiness.cancel();}
  else if(kind==='endless'){const plan=world.previewEndlessTransition();if(!plan){readiness.fail('无尽落点或窗口修订已变化，请重试');return;}const readyToken=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;if(!world.registerEndlessReadyToken(readyToken)||!world.commitEndlessTransition(plan.requestId,plan.expectedRevision,readyToken)){readiness.fail('无尽转场未提交，当前整备保持不变');return;}resetPresentation();readiness.cancel();session.requestSave();void audio.start();}
  else if(kind==='reinforcement'){
   const advance=hud.pendingStageAdvance;hud.pendingStageAdvance=false;
   if(advance&&!world.skipReward()){readiness.fail('关间选择状态已变化，请重新准备');hud.update();return;}
   readiness.cancel();
  }else readiness.cancel();hud.update();};
 canvas.addEventListener('webglcontextlost',()=>readiness.fail('WebGL 上下文丢失，请等待恢复后重试或导出存档'));
 hud.onRestart=()=>{
  hud.pendingStageAdvance=false;
  session.keepRun();
  resetPresentation();
  world.resetRun();hud.root.querySelector<HTMLButtonElement>('[data-action=save-continue]:not(:disabled),[data-action=start]')?.focus();
 };

 const frame=(now:number)=>{const elapsed=(now-previous)/1000;previous=now;
  if(!document.hidden){if(!readiness.state.kind)view.prepareRosterAssets();input.poll();gamepad.poll(now);let alpha=1;const simulating=world.phase==='battle'&&!world.paused&&!world.requiresPlayerDecision&&!view.assetsPending&&!readiness.state.kind;if(simulating&&wasSimulating)alpha=driver.advance(elapsed*(debug?.speed??1));else driver.reset();wasSimulating=simulating;
   view.render(elapsed,alpha);
  }requestAnimationFrame(frame);
 };requestAnimationFrame(frame);
 document.addEventListener('visibilitychange',()=>{previous=performance.now();driver.reset();if(document.hidden&&world.phase==='battle'){world.paused=true;world.changed();session.requestSave();}});
 window.addEventListener('pagehide',()=>{if(world.runId)void session.saveNow().catch(()=>{});});
 hud.update();hud.root.querySelector<HTMLButtonElement>('[data-action="menu-new"]')?.focus();
}
