import {mountOverlayLayout} from './presentation/overlay-layout';
import {mountIntermissionSkin} from './intermission-skin/skin';
import {assetUrl as intermissionAssetUrl} from '../assets/manifest';
import {bindTouchClick} from './presentation/touch-click';

import {PointerCommitGuard} from './presentation/navigation';
import {renderIntermission,IntermissionNavigation,restCards,type IntermissionRoute} from './presentation/intermission';
import {battleInputCapture,trapTab} from './presentation/input-capture';
import {CarrierInspector} from './hud/carrier-inspector';
import {bindHudSafeLayout} from './hud/layout';
import {HudSettings} from './hud/preferences';
import {hudGlyph} from './hud/glyphs';
import {finalObjectives} from './hud/objectives';
import {shopProgress} from './presentation/shop-progress';
import {renderEnhancements,researchOverview,type BaseTab} from './presentation/base-panels';
import {actionForButton,activateBattleAction} from './controls/battle-actions';
import {setTextScale} from './text-scale';
import {openResourceDownloads} from './hud/resource-downloads';

import {toggleNativeFullscreen} from './mobile/viewport';
import {SquadConsole} from './hud/packed-console';
import {DetectionHint} from './hud/detection-hint';
import {RESCUE_PRESENTATION} from '../data/economy';
import {ArrivalCards} from './presentation/arrival-cards';
import type {SaveControls} from './hud/save-controls';
import type {RunSession,LoadPreview} from '../app/run-session';
import type {AssetReadinessCoordinator} from '../app/asset-readiness';
import {renderMenu,renderReadiness,type MenuPage} from './hud/m3-menu';
import type {Difficulty} from '../data/stages';
import type {PresetSlot} from '../simulation/progression/permanent-profile';
import type {ControlSettings} from './controls/settings';

import {type HeroId} from '../data/heroes';
import {type TalentLine} from '../data/mvp-talents';
import {ELITES,type EliteId} from '../data/elites';

import {Minimap} from './hud/minimap';
import {World} from '../simulation/world';

import {SC2_UNITS} from '../data/sc2-units';
import {missingAssets} from '../assets/manifest';
import type {BattleRenderer} from '../render/scene/battle-renderer';
import {resolveOrdinaryEffects,resolveHeroEffects,resolveQuality,resolveAnimationMode} from '../render/settings/quality';
import {RACES,type Race,type FamilyId} from '../data/races';
import {PRODUCTION_LINES,type ProductionLineId} from '../data/expedition-buildings';
import {renderFamilyReceipt} from './hud/expedition-panel';
import {renderMvpTalentPanel,type TalentPage} from './hud/mvp-talent-panel';
import {glyph,image,button,modal,esc} from './presentation/reference-primitives';
import {renderSettings,renderArchives,type SettingsTab} from './presentation/settings-screen';
import {renderPause,renderVictory,renderEndless} from './presentation/end-screens';
import {renderProductionWindow} from './hud/expedition-panel';
import type {AudioEffects} from '../render/effects/audio';
import {decisionSaveActions,renderTalentLoot,renderEliteRescue,renderEliteMembers,renderSupplyReplacement} from './presentation/decision-screens';
import {transitionCover} from './presentation/cover-transition';
import {CoverPreference} from './presentation/cover-preference';
import {MapPreview,savedRunInfo} from './presentation/map-preview';
import {renderRepairs} from './hud/expedition-panel';
import {referenceCard} from './presentation/reference-card';
const fmt=(n:number)=>String(Math.max(0,Math.ceil(n))).padStart(2,'0');
const clock=(n:number)=>{const seconds=Math.max(0,Math.ceil(n));return fmt(Math.floor(seconds/60))+':'+fmt(seconds%60);};
const cost=(m:number,g:number)=>`${m} 矿${g?' / '+g+' 气':''}`;
export class HUD {
 playerServices?:import('./hud/player-services').PlayerServices;
 private battlePanel:'base'|'progress'|'research'|null=null;private panelWasPaused=false;private progressTab:'summary'|'sources'='summary';
 private arrivalCards:ArrivalCards;
 private intermissionSkin:ReturnType<typeof mountIntermissionSkin>;
 private archivesOpen=false;
 private detectionHint=new DetectionHint();readonly intermission=new IntermissionNavigation();
 private overlayKey='';private overlayScroll=new Map<string,number[]>();
 private pendingFocus:(()=>HTMLElement|null|undefined)|null=null;private focusQueued=false;
 saveUI:SaveControls|null=null;
 session:RunSession|null=null;readiness:AssetReadinessCoordinator|null=null;
 coverIndexes:Record<Race,number>={terran:0,zerg:0,protoss:0};readonly coverPreference:CoverPreference;private coverAt=0;
 private get coverRace(){return this.coverPreference.preferredRace(this.world.permanentProfile.activeRace);}
 loadingMapName='战役前线';menuPage:MenuPage='title';menuRace:Race='terran';menuDifficulty:Difficulty='normal';menuPreset:PresetSlot=0;loadPreview:LoadPreview|null=null;flowError='';pendingStageAdvance=false;
 onPrepareNew:()=>void=()=>{};onPrepareLoad:()=>void=()=>{};onPrepareEndless:()=>void=()=>{};onCommitFlow:()=>void=()=>{};onCancelFlow:()=>void=()=>{};onPrepareReinforcement:()=>void=()=>{};
 talentPage:TalentPage='races';talentRace:Race='terran';talentLine:TalentLine='resources';
 private commitGuard=new PointerCommitGuard();
 audio:AudioEffects|null=null;private uiMotion=true;private auxiliaryProduction=false;private productionTab:BaseTab='facilities';private importInput=document.createElement('input');
 private decisionDetail:string|null=null;private decisionTarget:number|null=null;private talentRulesOpen=false;private information:{title:string;copy:string;service?:'repair'|'revive'}|null=null;
 private mapPreview=new MapPreview();
 afterRender(){this.arrivalCards.update(!this.readiness?.state.kind&&!this.settingsOpen&&!this.talentOpen);this.mapPreview.capture(this.world,this.view.canvas);if(this.world.phase==='menu'&&this.menuPage==='title'&&!this.talentOpen&&!this.settingsOpen&&!this.coverPreference.lockedRace&&this.uiMotion&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&performance.now()-this.coverAt>18000&&!this.root.querySelector('.cover-factions:hover,.cover-factions:focus-within')){this.coverAt=performance.now();const race=this.coverRace;this.coverIndexes[race]=(this.coverIndexes[race]+1)%3;this.update();}}
 settingsOpen=false;private settingsTab:SettingsTab='controls';talentOpen=false;selectedTalentId:string|null=null;ready=true;loading='载入战场';lastPhase='';starterHeroChoice:HeroId|null=null;inputReset:()=>void=()=>{};onStart:()=>void=()=>{};onRestart:()=>void=()=>{};
 readonly carrierInspector:CarrierInspector;root:HTMLElement;readonly minimap:Minimap;readonly squadConsole:SquadConsole;private cache=new Map<string,string>();private iconLoaded=new Set<string>();private preparingElite:EliteId|null=null;
 constructor(readonly world:World,readonly view:BattleRenderer,readonly controls:ControlSettings,readonly preferences=new HudSettings()){this.root=document.querySelector('#interface')!;this.root.classList.add('game-frame');this.root.dataset.device=matchMedia('(pointer:coarse)').matches?'mobile':'desktop';
  let coverStorage:Storage|undefined;try{coverStorage=localStorage;}catch{}this.coverPreference=new CoverPreference(coverStorage);this.coverAt=performance.now();
  this.menuRace=world.permanentProfile.activeRace;this.menuPreset=world.permanentProfile.activePreset;try{const value=localStorage.getItem('sc2.newGameDifficulty');if(value==='easy'||value==='normal'||value==='hard'||value==='hell')this.menuDifficulty=value;}catch{}
  this.root.innerHTML=`<header id="topbar" class="battle-top"><span class="battle-location" id="battle-location"></span><div class="battle-resources"><span class="money minerals">${image('ui.minerals')}<b id="minerals">50</b></span><span class="money gas">${image('ui.gas')}<b id="gas">0</b></span><span class="population">${glyph('hex')}<b id="battle-points">0</b></span></div><div class="battle-stage"><b id="stage"></b><strong id="clock">02:00</strong></div><button data-action="battle-progress" class="battle-entry">${image('tech.attack')}<span>强化</span></button><button data-action="battle-base" class="battle-entry">${image('building.barracks')}<span>基地</span></button><button data-action="pause" class="icon-button" aria-label="暂停">${glyph('pause')}</button></header>
   <div id="mission"></div><div id="notice" role="status" aria-live="polite"></div><div id="production-status"></div>

   <div id="battle-ui-field" class="battle-playfield"><div class="battle-map-rim" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div id="joystick" class="joystick" aria-label="移动小队摇杆"><span class="stick-axis"></span><div class="stick-knob"></div></div></div><div id="stretch"></div><div id="portrait-hint" hidden></div>
<section id="overlay"></section><aside id="debug" class="console" hidden></aside>`;
  this.arrivalCards=new ArrivalCards(world,this.root);
  this.intermissionSkin=mountIntermissionSkin(this.root.querySelector<HTMLElement>('#overlay')!,()=>this.world,{assets:{resolve:key=>intermissionAssetUrl('ui.intermission.'+key)}});
  this.squadConsole=new SquadConsole(world,this.root,preferences,()=>this.audio?.interfaceCue());this.carrierInspector=new CarrierInspector(world,this.root);this.minimap=new Minimap(world,view,this.root.querySelector('#battle-ui-field')!,controls);
  bindTouchClick(this.root,b=>this.squadConsole.blocksTap(b));
  this.minimap.element.querySelector('#map-toggle')!.addEventListener('click',()=>preferences.toggle('mapCollapsed'));
  preferences.listeners.add(()=>{this.update();document.dispatchEvent(new Event('sc2-hud-layout'));});
  try{this.uiMotion=localStorage.getItem('sc2.ui-motion')!=='false';}catch{}this.root.classList.toggle('ui-reduced-motion',!this.uiMotion);
  this.importInput.type='file';this.importInput.accept='.json,application/json';this.importInput.hidden=true;this.importInput.setAttribute('aria-label','导入战局文件');this.root.append(this.importInput);
  mountOverlayLayout(document.getElementById('overlay')!,this.root);
  this.importInput.addEventListener('change',async()=>{const file=this.importInput.files?.[0];if(!file)return;try{if(file.size>32*1024*1024)throw Error('存档文件过大');const raw=await (this.readiness?.readImportFile(file)??file.text());if(raw===null)return;this.readiness?.cancel();this.loadPreview=this.session?.prepareLoad(raw)??null;this.settingsOpen=false;this.menuPage='load-preview';this.flowError='';}catch(error){this.readiness?.cancel();this.flowError=String((error as Error).message);}this.importInput.value='';this.update();});
  bindHudSafeLayout(this.root);
  this.root.addEventListener('keydown',e=>{const dialog=[...this.root.querySelectorAll<HTMLElement>('#overlay .modal-window')].at(-1);if(dialog)trapTab(e,dialog);});
  this.root.addEventListener('input',e=>{const el=e.target;if(!(el instanceof HTMLInputElement)||!el.dataset.audio||!this.audio)return;const a=this.audio,v=Math.max(0,Math.min(1,Number(el.value)/100));a.setMix(el.dataset.audio==='master'?v:a.masterVolume,el.dataset.audio==='battle'?v:a.battleVolume,el.dataset.audio==='interface'?v:a.interfaceVolume);const output=el.parentElement?.querySelector('output');if(output)output.textContent=Math.round(v*100)+'%';});
  this.root.addEventListener('input',e=>{const el=e.target;if(el instanceof HTMLInputElement&&el.dataset.catalogFilter==='query'){this.intermission.query=el.value;this.intermission.page=0;this.update();const input=this.root.querySelector<HTMLInputElement>('[data-catalog-filter="query"]');input?.focus({preventScroll:true});input?.setSelectionRange(el.selectionStart,el.selectionEnd);}});

  this.root.addEventListener('change',e=>{const el=e.target;if(!(el instanceof HTMLSelectElement))return;if(el.dataset.catalogFilter){const key=el.dataset.catalogFilter;if(key==='group')this.intermission.filter=el.value as IntermissionNavigation['filter'];else if(key==='quality')this.intermission.quality=el.value as IntermissionNavigation['quality'];this.intermission.page=0;this.update();return;}if(el.dataset.setting==='text-scale')setTextScale(Number(el.value));else if(el.dataset.setting==='camera-shake')view.setCameraShake(el.value==='true');else if(el.dataset.setting==='ordinary-effects')view.nonHeroEffects.setQuality(resolveOrdinaryEffects(el.value));else if(el.dataset.setting==='hero-effects')view.fx.setHeroQuality(resolveHeroEffects(el.value));else if(el.dataset.setting==='quality')view.setQuality(resolveQuality(el.value));else if(el.dataset.setting==='animation-mode')view.setAnimationMode(resolveAnimationMode(el.value));else if(el.dataset.setting==='menu-preset'){this.menuPreset=Number(el.value) as PresetSlot;this.starterHeroChoice=null;}else if(el.dataset.setting==='menu-hero')this.starterHeroChoice=el.value as HeroId;else if(el.dataset.setting==='development-target')world.setDevelopmentTarget(el.value||null);else if(el.dataset.setting==='hatchery-sequence')world.assignHatcherySequence(Number(el.dataset.id),el.value as ProductionLineId);else if(el.dataset.setting==='desktop'||el.dataset.setting==='touch')controls.set(el.dataset.setting,el.value);this.update();});
  this.root.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button[data-action]');if(!button||button.disabled||this.commitGuard.blocks(e,performance.now()))return;const action=button.dataset.action!;this.audio?.interfaceCue();const battleAction=actionForButton(world,action);if(battleAction){if(battleInputCapture())return;activateBattleAction(world,battleAction);this.update();return;}if(action==='resource-downloads'){if(world.phase!=='battle'||world.paused)openResourceDownloads(world.phase==='menu'?this.menuRace:world.expedition.race);return;}if(action==='fullscreen'){void toggleNativeFullscreen().then(ok=>{if(!ok){world.announce('此浏览器暂不支持全屏');this.flowError='此浏览器暂不支持全屏';}this.update();});return;}
   if(action==='battle-base'||action==='battle-progress'||action==='battle-research'){this.openBattlePanel(action==='battle-base'?'base':action==='battle-progress'?'progress':'research');return;}
   if(action==='battle-panel-close'){this.closeBattlePanel();return;}
   if(action==='battle-progress-tab'){this.progressTab=button.dataset.tab==='sources'?'sources':'summary';this.update();return;}
   if(this.saveUI?.handle(action))return;
   if(action==='ui-info'){this.information={title:button.dataset.title??'详情',copy:button.dataset.copy??''};this.update();this.focusAfterUpdate(()=>this.root.querySelector<HTMLElement>('.detail-modal .modal-heading button'));return;}
   else if(action==='ui-rest-repair'||action==='ui-rest-revivals'){this.information={title:action==='ui-rest-repair'?'修复部队':'英雄复活',copy:'',service:action==='ui-rest-repair'?'repair':'revive'};this.update();return;}
   else if(action==='ui-info-close'){this.information=null;this.update();return;}
   else if(action==='decision-back'){this.decisionDetail=null;this.update();return;}
   else if(action==='ui-decision-info'){this.decisionDetail=button.dataset.id??null;}
   else if(action==='ui-decision-target')this.decisionTarget=Number(button.dataset.id);
   else if(action==='ui-back'){const entry=this.intermission.back();this.update();if(entry?.focus)this.focusAfterUpdate(()=>this.root.querySelector<HTMLElement>(entry.focus));return;}

   else if(action==='ui-page'&&world.phase==='reward'&&['direction','production','rest','contracts'].includes(button.dataset.page??'')){if(this.intermission.current.page==='menu')this.intermission.back();this.intermission.push({page:button.dataset.page} as IntermissionRoute,`[data-action="ui-page"][data-page="${button.dataset.page}"]`);}
   else if(action==='ui-offer'&&world.phase==='reward'&&world.rewards.some(r=>r.offerId===button.dataset.id)){this.intermission.push({page:'offer',id:button.dataset.id!},`[data-action="ui-offer"][data-id="${CSS.escape(button.dataset.id!)}"]`);}
   else if(action==='ui-contract'&&world.phase==='reward'){this.intermission.push({page:'contract',id:button.dataset.id!},`[data-action="ui-contract"][data-id="${CSS.escape(button.dataset.id!)}"]`);}
   else if(action==='ui-elite'&&world.phase==='reward'&&button.dataset.variant&&button.dataset.variant in ELITES){this.intermission.push({page:'elite',id:button.dataset.id!,variant:button.dataset.variant as EliteId,contract:button.dataset.contract==='true'},`[data-action="ui-elite"][data-variant="${button.dataset.variant}"]`);}
   else if(action==='ui-catalog-filter'&&['ordinary','elite','hero','development','support','training'].includes(button.dataset.filter??'')){this.intermission.filter=button.dataset.filter as IntermissionNavigation['filter'];}
   else if(action==='ui-variant-select'&&button.dataset.variant&&button.dataset.variant in ELITES)this.intermission.variant=button.dataset.variant as EliteId;
   else if(action==='ui-catalog-race'&&(button.dataset.race==='all'||RACES.includes(button.dataset.race as Race))){this.intermission.race=button.dataset.race as IntermissionNavigation['race'];this.intermission.page=0;}
   else if(action==='ui-catalog-prev'||action==='ui-catalog-next')this.intermission.page=Math.max(0,this.intermission.page+(action==='ui-catalog-next'?1:-1));
   else if(action==='cover-race'&&RACES.includes(button.dataset.race as Race)){this.coverPreference.toggleLock(button.dataset.race as Race);this.coverAt=performance.now();}
   else if(action==='menu-new'){this.flowError='';this.menuPage='race';this.menuRace=world.permanentProfile.activeRace;this.menuPreset=world.permanentProfile.activePreset;}
   else if(action==='menu-stage'&&['race','difficulty','confirm'].includes(button.dataset.page??''))this.menuPage=button.dataset.page as MenuPage;
   else if(action==='menu-preset-select'){const at=Number(button.dataset.slot);if(at===0||at===1||at===2){this.menuPreset=at;this.starterHeroChoice=null;}}
   else if(action==='menu-race'&&RACES.includes(button.dataset.race as Race)){this.menuRace=button.dataset.race as Race;this.menuPreset=world.permanentProfile.activePresetFor(this.menuRace);this.starterHeroChoice=null;}
   else if(action==='menu-race-next')this.menuPage='difficulty';
   else if(action==='menu-difficulty'){const d=button.dataset.difficulty;if(d==='easy'||d==='normal'||d==='hard'||d==='hell'){this.menuDifficulty=d;try{localStorage.setItem('sc2.newGameDifficulty',d);}catch{}}}
   else if(action==='menu-difficulty-next')this.menuPage='confirm';
   else if(action==='menu-edit-talents'){this.talentRace=this.menuRace;this.talentPage='lines';this.talentOpen=true;this.selectedTalentId=null;this.flowError='';}
   else if(action==='menu-start'){this.flowError='';this.onPrepareNew();}
   else if((action==='menu-load'||action==='menu-load-summary')){this.flowError='';this.menuPage='load';}
   else if(action==='menu-load-local'){try{this.loadPreview=this.session?.prepareLoad()??null;this.menuPage='load-preview';this.flowError='';}catch(error){this.flowError=String((error as Error).message);}}
   else if(action==='menu-load-file'&&world.phase==='menu')this.importInput.click();
   else if(action==='menu-load-ready'){this.flowError='';this.onPrepareLoad();}
   else if(action==='menu-back')this.menuBack();
   else if(action==='flow-cancel')this.cancelFlow();
   else if(action==='flow-retry')void this.readiness?.retry();
   else if(action==='flow-continue')this.onCommitFlow();
   else if(action==='endless'){this.inputReset();world.chooseCampaignExit('endless');}
   else if(action==='evacuate'){this.inputReset();world.chooseCampaignExit('evacuate');}
   else if(action==='endless-back'){this.inputReset();world.backFromEndlessPreparation();}
   else if(action==='endless-prepare'){this.inputReset();this.onPrepareEndless();}
   else if(action==='restart'){this.squadConsole.close();this.carrierInspector.close();this.archivesOpen=false;this.settingsOpen=false;this.talentOpen=false;this.menuPage='title';this.readiness?.cancel();this.onRestart();}else if(action==='pause')this.pause();else if(action==='settings'){this.inputReset();this.talentOpen=false;this.settingsOpen=true;if(world.phase==='battle')world.paused=true;}else if(action==='settings-tab'&&['controls','graphics'].includes(button.dataset.tab??''))this.settingsTab=button.dataset.tab as typeof this.settingsTab;else if(action==='settings-back')this.settingsOpen=false;
   else if(action==='talents'){this.settingsOpen=false;this.talentOpen=true;this.talentPage='races';}else if(action==='talents-back')this.talentBack();
   else if(action==='talent-level'&&['races','lines'].includes(button.dataset.page??'')){this.talentPage=button.dataset.page as TalentPage;this.selectedTalentId=null;}
   else if(action==='talent-rules-close')this.talentRulesOpen=false;
   else if(action==='talent-exit')this.talentOpen=false;
   else if(action==='talent-presets')this.talentPage='presets';
   else if(action==='talent-rules'){this.talentRulesOpen=true;}
   else if(action==='mvp-talent-race'&&RACES.includes(button.dataset.race as Race)){this.talentRace=button.dataset.race as Race;this.talentPage='lines';this.selectedTalentId=null;}
   else if(action==='talent-line'&&['resources','soldiers','army','micro'].includes(button.dataset.line??'')){this.talentLine=button.dataset.line as TalentLine;this.talentPage='tree';this.selectedTalentId=null;}
   else if(action==='mvp-talent-preset'){world.permanentProfile.activatePreset(this.talentRace,Number(button.dataset.slot) as PresetSlot);}
   else if(action==='mvp-talent-select'){this.selectedTalentId=button.dataset.id??null;this.talentPage='node';}
   else if(action==='mvp-talent-buy'){if(world.selectRace(this.talentRace))world.permanentProfile.buy(button.dataset.id!);}
   else if(action==='mvp-talent-respec'){if(world.selectRace(this.talentRace))world.permanentProfile.respec(button.dataset.line as TalentLine|'all');}
   else if(action==='mvp-talent-copy'){world.permanentProfile.savePresetBlueprint(this.talentRace,Number(button.dataset.slot) as PresetSlot,world.permanentProfile.levelsFor(this.talentRace));}
   else if(action==='pause-saves'){this.archivesOpen=true;}else if(action==='archives-back')this.archivesOpen=false;
   else if(action==='pause-production'){this.auxiliaryProduction=true;}
   else if(action==='pause-production-close')this.auxiliaryProduction=false;
   else if(action==='ui-production-tab'&&['facilities','production','technology'].includes(button.dataset.tab??'')){this.productionTab=button.dataset.tab as typeof this.productionTab;this.intermission.productionTab=this.productionTab;}
   else if(action==='toggle-ui-motion'){this.uiMotion=!this.uiMotion;this.root.classList.toggle('ui-reduced-motion',!this.uiMotion);try{localStorage.setItem('sc2.ui-motion',String(this.uiMotion));}catch{}}
   else if(action==='production-line-enable'){const p=world.expedition.production[button.dataset.line as ProductionLineId],next=!p?.outputs.some(f=>p.enabled[f]);if(p)for(const f of p.outputs)world.setProductionEnabled(f,next);}
   else if(action==='production-output'){const line=button.dataset.line as ProductionLineId,family=button.dataset.family as FamilyId,plan=world.expedition.production[line];if(plan)world.setProductionOutputs(line,plan.outputs.includes(family)?plan.outputs.filter(id=>id!==family):[...plan.outputs,family]);}
   else if(action==='production-enable'){const family=button.dataset.family as FamilyId,plan=Object.values(world.expedition.production).find(plan=>plan?.outputs.includes(family));if(plan)world.setProductionEnabled(family,!plan.enabled[family]);}
   else if(action==='tactical-bind'){const family=button.dataset.family as FamilyId,field=button.closest<HTMLElement>('[data-tactical-family]'),target=Number(field?.querySelector<HTMLSelectElement>('[data-tactical-target]')?.value),direction=field?.querySelector<HTMLSelectElement>('[data-tactical-direction]')?.value as 'assault'|'guard'|'mobility';world.setTacticalEvolutionPlan(family,target,direction);}
   else if(action==='tactical-toggle'){const family=button.dataset.family as FamilyId,plan=world.expedition.tacticalPlans[family];if(plan)world.setTacticalEvolutionEnabled(family,!plan.enabled);}
   else if(action==='tactical-cancel')world.cancelTacticalEvolutionPlan(button.dataset.family as FamilyId,Number(button.dataset.revision));
   else if(action==='family-replace'){this.inputReset();world.commitFamilyReplacement(button.dataset.request!,button.dataset.old as FamilyId,Number(button.dataset.revision));}
   else if(action==='family-reject'){this.inputReset();world.rejectIncomingBatch(button.dataset.request!,Number(button.dataset.revision));}
   else if(action==='elite-contract'){this.inputReset();if(world.buyEliteContract(button.dataset.id!,button.dataset.variant as EliteId|undefined)&&!world.expedition.pendingShopElite)this.finishPurchase(e);}
   else if(action==='talent-loot'){this.inputReset();world.claimTalentLoot(button.dataset.receipt!,button.dataset.id!,button.dataset.variant as EliteId|undefined);}
   else if(action==='elite-rescue-claim'){this.inputReset();world.claimEliteRescueRight(button.dataset.receipt!,button.dataset.variant as EliteId|undefined);}
   else if(action==='elite-rescue-decline'){this.inputReset();world.declineEliteRescueRight(button.dataset.receipt!);}
   else if(action==='elite-cancel'){this.inputReset();world.cancelPendingEliteChoice(button.dataset.elite as EliteId);}
   else if(action==='repair-all'){const units=button.dataset.family?world.familyBodies(button.dataset.family as FamilyId):world.allies(),quote=world.previewRepair(units.filter(unit=>!unit.temporary&&!unit.summonOwnerId).map(unit=>unit.id));if(quote&&quote.id===button.dataset.quote)world.purchaseRepair(quote.id);}
   else if(action==='revive')world.reviveHero(button.dataset.id as HeroId);
   else if(action==='elite-replace'){const elite=ELITES[button.dataset.elite as EliteId];if(elite&&this.view.gpu.has(elite.model)&&this.view.assetsPending===0){this.inputReset();world.replaceWithElite(elite.id,Number(button.dataset.id));}}
   else if(action==='elite-assets-retry')this.onPrepareReinforcement();
   else if(action==='shop-supply-cancel')world.cancelShopSupply();else if(action==='shop-supply-confirm'){if(world.confirmShopSupply(button.dataset.family as FamilyId))this.finishPurchase(e);}else if(action==='shop-elite-cancel')world.cancelShopElite();else if(action==='shop-elite-confirm'){if(world.confirmShopElite(Number(button.dataset.id)))this.finishPurchase(e);}else if(action==='development-direction'){const panel=button.closest('details');if(panel)panel.open=false;if(world.setDevelopmentDirection(button.dataset.line as ProductionLineId))this.intermission.reset();}else if(action==='reroll')world.reroll();else if(action==='reward'){this.inputReset();if(world.choose(button.dataset.id!,button.dataset.variant as EliteId|undefined)&&!world.expedition.pendingShopElite&&!world.expedition.pendingShopSupply)this.finishPurchase(e);}else if(action==='skip'){
    this.inputReset();
    if(world.phase==='reward'&&world.rewardRound==='random'&&!world.endlessEntry){this.pendingStageAdvance=true;this.onPrepareReinforcement();}
    else world.skipReward();
   }
   this.update();
  });controls.listeners.add(()=>this.update());world.listeners.add(()=>this.update());world.permanentProfile.listeners.add(()=>this.update());this.update();
 }
 graphicsControls(){return '<button class="small" data-action="settings">设置 · 操作与画质</button>';}
 private openBattlePanel(panel:'base'|'progress'|'research'){if(!['battle','reward'].includes(this.world.phase)||this.world.phase==='battle'&&this.world.requiresPlayerDecision)return;if(!this.battlePanel)this.panelWasPaused=this.world.paused;this.battlePanel=panel;this.productionTab='facilities';this.progressTab='summary';if(this.world.phase==='battle')this.world.paused=true;this.inputReset();this.world.changed();}
 private closeBattlePanel(){if(!this.battlePanel)return;const old=this.battlePanel;this.battlePanel=null;if(this.world.phase==='battle')this.world.paused=this.panelWasPaused;this.inputReset();this.world.changed();this.root.querySelector<HTMLButtonElement>('[data-action="battle-'+old+'"]')?.focus({preventScroll:true});}
 private finishPurchase(event:MouseEvent){this.intermission.reset();this.commitGuard.commit(event,performance.now());}
 talentBack(){if(this.talentPage==='node')this.talentPage='tree';else if(this.talentPage==='presets')this.talentPage='lines';else if(this.talentPage==='tree')this.talentPage='lines';else if(this.talentPage==='lines')this.talentPage='races';else this.talentOpen=false;}
 talentPanel(){return renderMvpTalentPanel(this.world.permanentProfile,this.selectedTalentId,{page:this.talentPage,race:this.talentRace,line:this.talentLine})+(this.talentRulesOpen?modal('战术天赋','','<p class="detail-copy">三族独立积攒资源。后勤、武装、军团和微操合计最多 80 点；每学一级占 1 点。洗点返还本族已投入资源。</p>','detail-modal',button('返回','talent-rules-close','primary'),'talent-rules-close'):'');}

 private menuHTML(){const w=this.world,race=this.menuPage==='title'?this.coverRace:this.menuRace;return renderMenu({coverIndex:this.coverIndexes[race],coverLockedRace:this.coverPreference.lockedRace,page:this.menuPage,race,difficulty:this.menuDifficulty,preset:this.menuPreset,hero:this.starterHeroChoice,loadPreview:this.loadPreview,previewImage:['load','load-preview'].includes(this.menuPage)?this.mapPreview.forRun(this.loadPreview?.snapshot??this.session?.savedSnapshot):null,error:this.flowError},w.permanentProfile,this.session);}
 settingsPanel(){return renderSettings(this.settingsTab,this.view,this.controls,this.audio,this.uiMotion);}
 private presentationKey(){const w=this.world;return JSON.stringify([w.runId,w.phase,this.readiness?.state.kind,this.readiness?.state.phase,this.talentOpen?[this.talentPage,this.talentRace,this.talentLine]:null,this.settingsOpen?this.settingsTab:null,this.archivesOpen,this.menuPage,this.battlePanel,this.productionTab,this.progressTab,this.intermission.current,this.intermission.filter,w.expedition.pendingShopSupply?.offerId,w.expedition.pendingShopElite?.offerId,w.expedition.bossLootOpen,w.expedition.pendingReceipt?.id]);}
 private navigationFocus(){const dialogs=[...this.root.querySelectorAll<HTMLElement>('#overlay .modal-window')],dialog=dialogs.at(-1);if(dialog)return dialog.querySelector<HTMLElement>('[data-autofocus]')??dialog.querySelector<HTMLElement>('button:not(:disabled)');const autofocus=this.root.querySelector<HTMLElement>('#overlay [data-autofocus]');if(autofocus)return autofocus;if(this.talentOpen&&this.talentPage==='tree'&&this.selectedTalentId)return this.root.querySelector<HTMLElement>('[data-action="mvp-talent-select"][data-id="'+this.selectedTalentId+'"]');return this.root.querySelector<HTMLElement>('#overlay button:not(:disabled)');}
 private focusAfterUpdate(pick:()=>HTMLElement|null|undefined){this.pendingFocus=pick;if(this.focusQueued)return;this.focusQueued=true;queueMicrotask(()=>{this.focusQueued=false;const target=this.pendingFocus?.();this.pendingFocus=null;if(target?.isConnected&&document.activeElement!==target)target.focus({preventScroll:true});});}
 put(id:string,html:string){if(id==='overlay'&&this.information)html+=modal(this.information.title,'',this.information.service==='repair'?renderRepairs(this.world):this.information.service==='revive'?'<div class="im-choice-grid">'+restCards(this.world).slice(1).map((c,i)=>referenceCard(c,i)).join('')+'</div>':'<p class="detail-copy">'+esc(this.information.copy)+'</p>','detail-modal',button('返回','ui-info-close','primary'),'ui-info-close');if(this.cache.get(id)===html)return;const root=document.getElementById(id)!,oldCover=id==='overlay'?root.querySelector<HTMLImageElement>('.cover-layer.is-active')?.cloneNode(true) as HTMLImageElement|null:null,focused=document.activeElement as HTMLElement|null,wasInside=!!focused&&root.contains(focused),panel=focused?.tagName==='SUMMARY'?focused.parentElement?.dataset.panel:null;const focusKeys=['action','id','setting','race','slot','tab','line','page','filter','family','variant','heroSlot','mode','receipt','audio','catalogFilter','index','imxFlip'] as const,focusIdentity=Object.fromEntries(focusKeys.filter(key=>focused?.dataset[key]!==undefined).map(key=>[key,focused!.dataset[key]]));const oldIndex=wasInside?[...root.querySelectorAll('button,select,summary,input')].indexOf(focused!):-1;const panels=[...root.querySelectorAll<HTMLDetailsElement>('details[data-panel][open]')].map(e=>e.dataset.panel);const scrollSelector='[data-ui-scroll],.modal-content,.ui12-body,.mvp-talents,.title-screen,.end-screen,.reward-screen,.intermission-screen>.im-choice-grid',nextKey=id==='overlay'?this.presentationKey():'';if(id==='overlay'){this.overlayScroll.set(this.overlayKey,[root.scrollTop,...[...root.querySelectorAll<HTMLElement>(scrollSelector)].map(e=>e.scrollTop)]);this.overlayKey=nextKey;}root.innerHTML=html;if(id==='overlay')transitionCover(root,oldCover,this.uiMotion);if(id==='overlay'){const saved=this.overlayScroll.get(nextKey);if(saved){root.scrollTop=saved[0];[...root.querySelectorAll<HTMLElement>(scrollSelector)].forEach((e,i)=>e.scrollTop=saved[i+1]??0);}}for(const panel of root.querySelectorAll<HTMLDetailsElement>('details[data-panel]'))if(panels.includes(panel.dataset.panel))panel.open=true;this.cache.set(id,html);if(wasInside)this.focusAfterUpdate(()=>{const all=[...root.querySelectorAll<HTMLElement>('button,select,summary,input')].filter(e=>e.getClientRects().length&&!e.closest('[inert]'));const same=all.find(e=>!e.matches(':disabled')&&(panel?e.tagName==='SUMMARY'&&e.parentElement?.dataset.panel===panel:Object.keys(focusIdentity).length>0&&Object.entries(focusIdentity).every(([key,value])=>e.dataset[key]===value)));return same??all.slice(Math.max(0,oldIndex)).find(e=>!e.matches(':disabled'))??all.find(e=>!e.matches(':disabled'));});}
 private cancelFlow(){const loading=this.readiness?.state.kind==='load';this.readiness?.cancel();this.onCancelFlow();if(loading){this.loadPreview=null;this.menuPage='load';}this.flowError='';this.update();}
  menuBack(){if(this.readiness?.state.kind){this.cancelFlow();return;}if(this.talentOpen){this.talentBack();this.update();return;}if(this.menuPage==='load-preview'){this.session?.cancelPreparedLoad();this.loadPreview=null;this.menuPage='load';}else if(this.menuPage==='load'||this.menuPage==='race')this.menuPage='title';else if(this.menuPage==='difficulty')this.menuPage='race';else if(this.menuPage==='confirm')this.menuPage='difficulty';this.flowError='';this.update();}
  pause(){if(this.archivesOpen){this.archivesOpen=false;this.update();return;}if(this.battlePanel&&!this.information){this.closeBattlePanel();return;}if(this.information){this.information=null;this.update();return;}if(this.talentRulesOpen){this.talentRulesOpen=false;this.update();return;}if(this.decisionDetail){this.decisionDetail=null;this.update();return;}if(this.playerServices?.close())return;if(this.squadConsole.close()){this.inputReset();return;}if(!this.carrierInspector.root.hidden){this.carrierInspector.close();return;}if(this.readiness?.state.kind){this.menuBack();return;}if(this.auxiliaryProduction){this.auxiliaryProduction=false;this.inputReset();this.update();return;}if(this.settingsOpen){this.settingsOpen=false;this.inputReset();this.update();return;}if(this.talentOpen){this.talentBack();this.inputReset();this.update();return;}if(this.world.phase==='menu'){this.menuBack();return;}if(this.world.expedition.pendingShopSupply){this.world.cancelShopSupply();this.inputReset();this.update();return;}if(this.world.expedition.pendingShopElite){this.world.cancelShopElite();this.inputReset();this.update();return;}if(this.world.phase==='reward'&&this.intermission.depth){const entry=this.intermission.back();this.update();if(entry?.focus)this.focusAfterUpdate(()=>this.root.querySelector<HTMLElement>(entry.focus));return;}if(this.world.phase==='reward'&&this.world.endlessEntry){this.world.backFromEndlessPreparation();return;}if(this.world.expedition.pendingReceipt||this.world.expedition.pendingTalentLoot||this.world.eliteRescueChoice||this.world.eliteChoice){this.root.querySelector<HTMLButtonElement>('#overlay [data-action=restart]')?.click();return;}if(this.world.phase==='battle'){this.world.paused=!this.world.paused;this.inputReset();this.world.changed();}}
 setLoading(text:string){this.loading=text;this.update();}
 finishLoading(){const missing=missingAssets();this.ready=this.view.initialAssetsLoaded&&missing.length===0&&this.view.modelErrors.length===0;this.loading=this.ready?'战场就绪':'缺少战场素材';this.update();this.root.querySelector<HTMLButtonElement>('[data-action=save-continue]:not(:disabled),[data-action=start]')?.focus();}
 update(){shopProgress(this.world).observe();const w=this.world,decisionArchive=this.saveUI?decisionSaveActions(this.session?.busy??false):'';this.intermission.sync(w);document.body.dataset.rules='mvp';document.body.dataset.race=w.expedition.race;this.root.dataset.race=w.phase==='menu'?(this.menuPage==='title'?this.coverRace:this.menuRace):w.expedition.race;document.body.dataset.touchControls=this.controls.touch;document.body.dataset.desktopControls=this.controls.desktop;const battleUI=w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision&&!this.readiness?.state.kind&&!this.settingsOpen&&!this.talentOpen;const battleShell=w.phase==='battle'&&!this.readiness?.state.kind;this.root.classList.toggle('battle-page',battleShell);this.root.dataset.page=battleShell?'battle':w.phase;document.body.dataset.uiPhase=this.readiness?.state.kind?'loading':this.talentOpen?'talents':this.settingsOpen?'settings':w.phase==='battle'&&!battleUI?'pause':w.phase;this.minimap.update(battleShell,this.preferences.mapCollapsed);
  this.put('minerals',String(Math.floor(w.wallet.minerals)));this.put('gas',String(Math.floor(w.wallet.gas)));this.put('stage',w.endless?`∞ ${w.endless.round}`:`${String(w.stage).padStart(2,'0')}<span> / 18</span>`);this.put('clock',clock(w.duration-w.stageElapsed));
  this.put('battle-location',esc(w.terrain?.definition?.source.name??'战役前线'));this.put('battle-points',String(w.runConfig?.frozenTalents.allocated??w.permanentProfile.levelFor(w.expedition.race)));this.put('mission',finalObjectives(w));
  const routine=/守住小队|增援即将落地|已加入队伍|雇佣兵抵达|小队转移完成/.test(w.notice);this.put('notice',w.time<w.noticeUntil&&!routine?w.notice.split(' · ')[0]:'');document.querySelector<HTMLElement>('#notice')!.title=w.notice;this.put('stretch','');
  this.squadConsole.update(battleShell,!!this.view.assetsPending||!!this.readiness?.state.kind);this.carrierInspector.update();
  const actionsReady=!this.view.assetsPending&&!this.readiness?.state.kind;document.body.dataset.battleActionsReady=String(actionsReady);
  const detection=this.root.querySelector<HTMLButtonElement>('#detection')!,nearbyCloak=this.detectionHint.update(w);detection?.classList.toggle('cloak-threat',nearbyCloak);if(nearbyCloak)detection?.setAttribute('aria-label','附近有隐形威胁，使用侦测 · G');

  this.put('production-detail',`<span>${RESCUE_PRESENTATION[w.expedition.race].workerName} ${w.workers}</span>${Object.entries(w.expedition.production).map(([line,plan])=>{const job=w.expedition!.ledger.find(j=>j.line===line&&j.state!=='settled');return `<span>${PRODUCTION_LINES[line as ProductionLineId].name} · ${job?SC2_UNITS[job.family].zh+' ×'+job.passengers.filter(p=>p.status==='waiting').length+' · '+(job.state==='training'?fmt(job.remaining)+'s':'救援中'):plan!.outputs.filter(f=>plan!.enabled[f]).map(f=>SC2_UNITS[f].zh).join(' / ')||'已关闭'}</span>`;}).join('')}`);
  this.put('production-status',`<span>${RESCUE_PRESENTATION[w.expedition.race].workerName} ${w.workers}</span>`);
  const overlay=document.querySelector<HTMLElement>('#overlay')!;overlay.hidden=!this.battlePanel&&!this.readiness?.state.kind&&!this.settingsOpen&&!this.talentOpen&&w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision;
  if(this.readiness?.showLoading)this.put('overlay',renderReadiness(this.readiness.state,{race:this.readiness.state.kind==='load'?this.loadPreview?.snapshot?.config.race??w.expedition.race:this.readiness.state.kind==='new'?this.menuRace:w.expedition.race,difficulty:this.readiness.state.kind==='load'?this.loadPreview?.snapshot?.config.difficulty??w.difficulty:this.readiness.state.kind==='new'?this.menuDifficulty:w.difficulty,map:this.readiness.state.kind==='load'?savedRunInfo(this.loadPreview?.snapshot)?.mapName:this.readiness.state.kind==='endless'?'无尽战场':this.readiness.state.kind==='new'?this.loadingMapName:w.terrain?.definition?.source.name}));
  else if(this.talentOpen)this.put('overlay',this.talentPanel());
  else if(this.archivesOpen)this.put('overlay',renderArchives(this.saveUI?.render('settings')??'',this.world.phase==='menu'));
  else if(this.settingsOpen)this.put('overlay',(w.phase==='menu'?this.menuHTML():w.phase==='reward'?renderIntermission(w,this.saveUI?.render('reward')??'',this.intermission):'')+this.settingsPanel());
  else if(this.battlePanel)this.put('overlay',(w.phase==='reward'?renderIntermission(w,this.saveUI?.render('reward')??'',this.intermission):'')+(this.battlePanel==='base'?renderProductionWindow(w,this.productionTab,'battle-panel-close'):this.battlePanel==='progress'?renderEnhancements(w,this.progressTab):modal('武器与防护研究','',researchOverview(w),'production-modal',button('返回','battle-panel-close','primary'),'battle-panel-close')));
  else if(this.auxiliaryProduction)this.put('overlay',renderProductionWindow(w,this.productionTab,'pause-production-close'));
  else if(w.expedition.pendingTalentLoot)this.put('overlay',renderTalentLoot(w,this.decisionDetail,decisionArchive));
  else if(w.expedition.pendingShopSupply)this.put('overlay',renderSupplyReplacement(w));
  else if(w.expedition.pendingShopElite){const choice=w.expedition.pendingShopElite,elite=ELITES[choice.variantId],loaded=this.view.gpu.has(elite.model)&&this.view.assetsPending===0,failed=this.view.modelErrors.some(error=>error.startsWith(elite.model+':'));if(loaded)this.preparingElite=null;else if(!failed&&this.preparingElite!==choice.variantId){this.preparingElite=choice.variantId;queueMicrotask(()=>{if(w.expedition.pendingShopElite?.variantId===choice.variantId)this.onPrepareReinforcement();});}this.put('overlay',renderEliteMembers(w,choice.variantId,loaded,failed,this.decisionTarget,true,decisionArchive));}
  else if(w.expedition.pendingReceipt)this.put('overlay',renderFamilyReceipt(w));
  else if(w.eliteRescueChoice){this.put('overlay',renderEliteRescue(w,this.decisionDetail,decisionArchive));}
  else if(w.eliteChoice){const id=w.eliteChoice,e=ELITES[id];const loaded=this.view.gpu.has(e.model)&&this.view.assetsPending===0,failed=this.view.modelErrors.some(error=>error.startsWith(e.model+':'));if(loaded)this.preparingElite=null;else if(!failed&&this.preparingElite!==id){this.preparingElite=id;queueMicrotask(()=>{if(w.eliteChoice===id)this.onPrepareReinforcement();});}this.put('overlay',renderEliteMembers(w,id,loaded,failed,this.decisionTarget,false,decisionArchive));}
  else if(w.phase==='menu')this.put('overlay',this.menuHTML());
  else if(w.phase==='reward')this.put('overlay',renderIntermission(w,this.saveUI?.render('reward')??'',this.intermission));
  else if(w.phase==='endless-ready')this.put('overlay',renderEndless(w,this.mapPreview.live(w)??''));
  else if(w.phase==='won'||w.phase==='lost'||w.phase==='finished')this.put('overlay',renderVictory(w,this.saveUI?.render('ended')??'',this.session?.busy??false));
  else if(w.paused)this.put('overlay',renderPause(w,this.saveUI?.render('pause')??''));
  const captures=!overlay.hidden||this.squadConsole.isOpen;for(const selector of ['#topbar','#battle-ui-field','#battle-console .console-body']){const node=this.root.querySelector<HTMLElement>(selector);if(node)node.inert=captures;}
  this.root.classList.toggle('in-battle',w.phase==='battle');this.playerServices?.mount(this.root);
  const focusPhase=this.readiness?.state.kind?'loading:'+this.readiness.state.kind+':'+this.readiness.state.phase:this.talentOpen?'talents:'+this.talentPage+':'+this.talentRace+':'+this.talentLine:this.settingsOpen?'settings':w.phase==='menu'?'menu:'+this.menuPage:w.expedition.pendingTalentLoot?'loot:'+w.expedition.pendingTalentLoot.receipt:w.eliteRescueChoice?'scout:'+w.eliteRescueChoice.receipt:w.expedition.pendingShopSupply?'shop-supply:'+w.expedition.pendingShopSupply.offerId:w.expedition.pendingShopElite?'shop-elite:'+w.expedition.pendingShopElite.offerId+':'+w.expedition.pendingShopElite.variantId:w.expedition.pendingReceipt?'receipt:'+w.expedition.pendingReceipt.id:w.eliteChoice?'elite:'+w.eliteChoice:w.phase==='reward'?'intermission:'+JSON.stringify(this.intermission.current)+':'+w.rewardRound:w.phase+':'+w.paused;if(this.lastPhase!==focusPhase){this.lastPhase=focusPhase;this.inputReset();if(w.phase==='menu'||this.readiness?.state.kind||w.phase==='reward'||w.expedition.pendingReceipt||w.expedition.pendingTalentLoot||w.expedition.pendingShopElite||w.eliteRescueChoice)this.focusAfterUpdate(()=>this.navigationFocus());}
 }
 async iconReport(){const ids=[...new Set([...document.querySelectorAll<HTMLImageElement>('img')].map(i=>i.src))];await Promise.all(ids.map(src=>new Promise<void>(resolve=>{const im=new Image();im.onload=()=>{if(im.naturalWidth)this.iconLoaded.add(src);resolve();};im.onerror=()=>resolve();im.src=src;})));return this.iconLoaded.size;}
}
