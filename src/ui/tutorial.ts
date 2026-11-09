import {mountGuidedInput} from './tutorial-guided';
import {tutorialVoiceAsset} from '../data/tutorial-voice';
import {Vector3} from 'three';
import type {HUD} from './hud';
import type {AudioEffects} from '../render/effects/audio';
import {assetUrl} from '../assets/manifest';
import {prepareEmbeddedAssetIds} from '../assets/offline-pack';
import {TUTORIAL_ADVISORS,QUEEN_TUTORIAL_SOUND} from '../data/tutorial';
import {chooseTutorial,tutorialBeat,tutorialTarget} from '../simulation/tutorial/runtime';
import type {TutorialBeat} from '../simulation/tutorial/runtime';
import './tutorial.css';

/** One owner for communications, audio, highlight and temporary camera presentation. */
export function mountTutorial(hud:HUD,audio:AudioEffects){
 const w=hud.world,view=hud.view,root=document.createElement('aside'),mark=document.createElement('button'),point=new Vector3();
 root.className='tutorial-comms';root.hidden=true;root.setAttribute('aria-label','顾问通讯');root.innerHTML='<img alt="" draggable="false"><div class="tutorial-message"><strong></strong><p aria-live="polite"></p><div class="tutorial-actions"><button class="game-button primary" data-tutorial="accept">接受教学</button><button class="game-button" data-tutorial="skip">跳过教程</button></div></div>';
 mark.className='tutorial-mark';mark.hidden=true;mark.type='button';mark.setAttribute('aria-label','前往高亮目标');document.body.append(root,mark);
 let key='',epoch=0,stopSound:(()=>void)|undefined,highlight:HTMLElement|undefined,resultHighlight:HTMLElement|undefined,beat:TutorialBeat|null=null,focusStarted=0,focusGoal:{x:number;z:number}|null=null,focusShown='',order=w.order,shownItem='',identifyUntil=0,surface='',paidCue='',paidUntil=0;
 let pendingCue:{token:number;asset:string;zerg:boolean}|undefined;
 const handoff=()=>{focusGoal=null;view.clearTutorialFocus();};
 const cancel=()=>{epoch++;pendingCue=undefined;stopSound?.();stopSound=undefined;highlight?.classList.remove('tutorial-highlight');highlight=undefined;resultHighlight?.classList.remove('tutorial-result-focus');resultHighlight=undefined;root.style.removeProperty('clip-path');mark.hidden=true;handoff();};
 function revealControl(control:HTMLElement|undefined){
  if(!control){root.style.removeProperty('clip-path');return;}
  const r=root.getBoundingClientRect(),c=control.getBoundingClientRect(),l=Math.max(0,c.left-r.left-3),t=Math.max(0,c.top-r.top-3),right=Math.min(r.width,c.right-r.left+3),bottom=Math.min(r.height,c.bottom-r.top+3);
  if(right<=l||bottom<=t){root.style.removeProperty('clip-path');return;}
  // A transparent local window reveals the actual native control, without moving either UI.
  root.style.clipPath=`path(evenodd, "M0 9 L9 0 H${r.width} V${r.height-9} L${r.width-9} ${r.height} H0 Z M${l} ${t} H${right} V${bottom} H${l} Z")`;
 }
 const clear=()=>{cancel();hud.root.querySelectorAll('.tutorial-resource-focus').forEach(e=>e.classList.remove('tutorial-resource-focus'));root.hidden=true;key='';focusShown='';beat=null;};
 root.addEventListener('click',e=>{const action=(e.target as HTMLElement).closest<HTMLElement>('[data-tutorial]')?.dataset.tutorial;if(!action)return;cancel();if(w.phase==='menu'&&w.starship.account.tutorial?.departure){hud.onTutorialChoice(action==='accept');return;}const shortExit=action==='skip'&&w.expedition.tutorial?.guided?.version===3;if(action==='skip'){hud.pendingStageAdvance=false;hud.readiness?.cancel();hud.onCancelFlow();}if(chooseTutorial(w,action==='accept')){root.hidden=true;key='';hud.session?.requestSave();hud.update();if(shortExit)hud.onTutorialExit();sync();}});
 function sync(){
  const guidedInstruction=guide.sync();
  const nextSurface=[w.phase,hud.settingsOpen,hud.intermission.current.page,hud.starship?.isOpen,hud.menuPage].join('|');if(surface!==nextSurface){surface=nextSurface;cancel();}
  if(document.hidden||hud.readiness?.state.kind&&!guidedInstruction||view.assetsPending&&w.phase==='battle'&&!guidedInstruction||hud.settingsOpen||hud.saveUI?.failed||!hud.session?.savedAt||w.starship.account.tutorial?.status==='invited'&&hud.session.busy){clear();return;}
  beat=guidedInstruction?'operations':tutorialBeat(w);const race=w.starship.account.tutorial?.race??w.expedition.race,t=w.expedition.tutorial;
  root.dataset.step=guidedInstruction?.key??beat??'';root.dataset.state=guidedInstruction?.result?'result':guidedInstruction?.navigation?'navigation':'instruction';
  if(beat==='identify'){
   if(shownItem!==t?.firstItem){shownItem=t?.firstItem??'';identifyUntil=performance.now()+4500;}
   if(performance.now()>identifyUntil)beat=!t?.moved?'move':!t.resources?t.drone?.stage===w.stage?'resources':'drone':!t.rescued?'rescue':null;
  }
  if(!beat){clear();return;}
  // A rescue instruction only appears when a real carrier has landed.
  if(beat==='rescue'&&!tutorialTarget(w,beat)){clear();return;}
  if(beat==='boss'&&t?.boss&&!view.tutorialDeathFinished(t.boss.enemy)){clear();return;}
  if(root.parentElement!==document.body)document.body.append(root);
  let text=guidedInstruction?.text??TUTORIAL_ADVISORS[race].lines[beat];
  if(beat==='invite'&&w.starship.account.tutorial?.departure)text='首次出征，是否先学习移动、发展、增援和装备？';
  if(beat==='identify'&&t?.firstItem===t?.module)text='这是旗舰模块，撤离后可以安装。';
  const next=[race,beat,guidedInstruction?.key??'',text].join('|');if(next!==key){
   cancel();key=next;const token=epoch,advisor=TUTORIAL_ADVISORS[race];root.dataset.race=race;root.dataset.beat=beat;
   root.querySelector('strong')!.textContent=advisor.name;root.querySelector('p')!.textContent=text;
   root.querySelector<HTMLButtonElement>('[data-tutorial=accept]')!.hidden=beat!=='invite';root.hidden=false;
   if(beat==='invite')queueMicrotask(()=>root.querySelector<HTMLButtonElement>('[data-tutorial=accept]')?.focus({preventScroll:true}));
   const voice=!guidedInstruction?.result&&audio.masterVolume>0&&audio.interfaceVolume>0?tutorialVoiceAsset(race,text):undefined;
   const portrait='tutorial.portrait.'+advisor.portrait,sound=race==='zerg'?QUEEN_TUTORIAL_SOUND:voice;
   void prepareEmbeddedAssetIds([portrait]).then(()=>{if(token===epoch)root.querySelector('img')!.src=assetUrl(portrait)??'';}).catch(()=>{});
   if(sound)pendingCue={token,asset:sound,zerg:race==='zerg'};
  }
  if(pendingCue&&!hud.readiness?.state.kind&&!(w.phase==='battle'&&view.assetsPending)){
   const cue=pendingCue;pendingCue=undefined;
   void prepareEmbeddedAssetIds([cue.asset]).then(()=>{if(cue.token===epoch)stopSound=audio.tutorialCue(cue.asset.replace('audio.',''),cue.zerg?.75:Infinity,cue.zerg?.6:1.2);}).catch(()=>{});
  }
  if(focusShown!==next&&w.phase==='battle'&&!view.assetsPending&&!hud.readiness?.state.kind){
   focusShown=next;const target=guidedInstruction?.target??tutorialTarget(w,beat),g=t?.guided,waiting=g?.version===3&&g.phase==='waiting',danger=!waiting&&[...w.entities.values()].some(u=>u.team==='enemy'&&u.hp>0&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<12),safe=target&&Math.hypot(target.x-w.anchor.x,target.z-w.anchor.z)<(waiting?14:8)&&!w.order&&Math.hypot(w.input.x,w.input.z)<.01&&!danger;
   if(safe&&!matchMedia('(prefers-reduced-motion: reduce)').matches){focusGoal={...target};focusStarted=performance.now();order=w.order;}
  }
  const id=beat==='equip'?t?.attribute:w.starship.account.tutorial?.module;
  const selectors=beat==='operations'?'[data-action="ui-production-tab"][data-tab="production"],[data-action="battle-base"],[data-action="development-direction"],[data-action="skip"]':beat==='equip'||beat==='flagship'?`[data-act="equip"][data-id="${id}"],[data-act="detail"][data-id="${id}"],[data-act="slot"][data-slot="${id?w.starship.account.items[id]?.slot:''}"],[data-act="page"][data-page="warehouse"],[data-action="starship-backpack"],[data-action="starship"]`:beat==='extract'?'[data-action="extract"]':beat==='identify'?'[data-action="starship"]':'';
  const chosenSelector=guidedInstruction?.ready?guidedInstruction.selector:guidedInstruction?'':selectors;
  const nextHighlight=chosenSelector?chosenSelector.split(',').flatMap(selector=>[...document.querySelectorAll<HTMLElement>(selector)]).find(e=>e.getClientRects().length&&!e.closest('[inert]')):undefined;
  if(nextHighlight!==highlight){highlight?.classList.remove('tutorial-highlight');highlight=nextHighlight;highlight?.classList.add('tutorial-highlight');}
  revealControl(highlight);
  const nextResult=guidedInstruction?.resultSelector?[...document.querySelectorAll<HTMLElement>(guidedInstruction.resultSelector)].find(e=>e.getClientRects().length):undefined;
  if(resultHighlight!==nextResult){resultHighlight?.classList.remove('tutorial-result-focus');resultHighlight=nextResult;resultHighlight?.classList.add('tutorial-result-focus');}
  const g=w.starship.account.tutorial?.status==='active'?w.expedition.tutorial?.guided:undefined,cue=g?.version===3&&g.paidAt!==undefined?`${w.runId}:${g.paidAt}`:'';
  if(cue&&cue!==paidCue){paidCue=cue;paidUntil=performance.now()+2200;}
  hud.root.querySelectorAll('.battle-resources,.im-wallet').forEach(e=>e.classList.toggle('tutorial-resource-focus',!!cue&&performance.now()<paidUntil||!!g?.feedback&&g.feedback.step==='collect-resources'));
 }
 function tick(now:number){
  sync();if(root.hidden)return;
  const guidedInstruction=guide.instruction(),target=guidedInstruction?.target??tutorialTarget(w,beat);mark.disabled=!!guidedInstruction&&!guidedInstruction.ready;mark.classList.toggle('is-actionable',!!guidedInstruction?.ready);mark.hidden=!target||w.phase!=='battle'||w.interfacePaused||w.paused;
  if(target){point.set(target.x,w.terrain?.height(target)??0,target.z).project(view.camera);const x=(point.x+1)*innerWidth/2,y=(1-point.y)*innerHeight/2,edge=point.z>1||x<24||x>innerWidth-24||y<150||y>innerHeight*.7;mark.classList.toggle('is-direction',edge);mark.textContent=edge?'➤':'';mark.style.left=Math.max(24,Math.min(innerWidth-24,x))+'px';mark.style.top=Math.max(150,Math.min(innerHeight*.7,y))+'px';mark.style.rotate=edge?Math.atan2(y-innerHeight/2,x-innerWidth/2)+'rad':'0rad';}
  if(focusGoal){const seconds=Math.max(0,(now-focusStarted)/1000),waiting=w.expedition.tutorial?.guided?.phase==='waiting';if(w.order!==order||Math.hypot(w.input.x,w.input.z)>.01||w.paused||w.interfacePaused||w.phase!=='battle'||!waiting&&[...w.entities.values()].some(u=>u.team==='enemy'&&u.hp>0&&Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z)<12)||seconds>=3){handoff();}else{const blend=seconds<.65?seconds/.65:seconds<2.2?1:(3-seconds)/.8;view.tutorialFocus={x:w.anchor.x+(focusGoal.x-w.anchor.x)*blend,z:w.anchor.z+(focusGoal.z-w.anchor.z)*blend};}}
 }
 const visibility=()=>{if(document.hidden)clear();};document.addEventListener('visibilitychange',visibility);w.listeners.add(sync);
 const manualKey=(e:KeyboardEvent)=>{if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))handoff();};
 window.addEventListener('pointerdown',handoff,{capture:true});window.addEventListener('keydown',manualKey,{capture:true});window.addEventListener('wheel',handoff,{capture:true,passive:true});
 const guide=mountGuidedInput(hud);mark.addEventListener('click',()=>{if(guide.activateTarget()){hud.session?.requestSave();hud.update();}});
 // Keep the pressed target through camera handoff; otherwise a touch-up can miss a moving marker.
 mark.addEventListener('pointerdown',e=>{if(!mark.disabled)mark.setPointerCapture(e.pointerId);});
 return {tick,clear,root,dispose(){guide.dispose();clear();w.listeners.delete(sync);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerdown',handoff,true);window.removeEventListener('keydown',manualKey,true);window.removeEventListener('wheel',handoff,true);root.remove();mark.remove();}};
}
