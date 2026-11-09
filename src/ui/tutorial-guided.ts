import type {HUD} from './hud';
import {guided,guidedOffer,guidedClickRef,guidedTail,guidedStep,guidedTarget,guidedItem,guidedProducer,guidedDurable,beginGuidedClick,finishGuidedClick,presentGuidedResult,finishGuidedResult,rejectGuidedClick,withGuidedCommand,permitGuidedProduction,activateGuidedTarget} from '../simulation/tutorial/guided';
import {GUIDED_FAMILY,SHORT_TUTORIAL_RESULTS} from '../data/tutorial-script';
import {GUIDED_RESULT_SECONDS} from '../simulation/tutorial/guided';

/** The overlay grants one native action; simulation verifies its real result. */
export function mountGuidedInput(hud:HUD){
 const w=hud.world,abort=new AbortController();let prepared='',dispatching=false,resuming='',feedbackKey='',feedbackStarted=0;
 function instruction(){
  const g=guided(w),s=guidedStep(w),tail=guidedTail(w);if(!g&&!tail)return null;
  let selector='',text='',key='',target=guidedTarget(w),navigation=false,resultSelector='';
  const nav=(select:string,copy:string,suffix:string)=>{selector=select;text=copy;key+=':'+suffix;navigation=true;target=null;};
  if(g&&s){
   text=s.text;key=s.group??s.id;
   const producer=guidedProducer(w),item=guidedItem(w),offer=guidedOffer(w);
   if(g.feedback){
    text=s.kind==='resources'?`矿物 +${g.feedback.minerals??100}，瓦斯 +${g.feedback.gas??50}`:SHORT_TUTORIAL_RESULTS[s.kind]??s.text;
    key='result:'+g.step;target=g.feedback.point??null;
    resultSelector=s.kind==='resources'?'.battle-resources':['build','supply'].includes(s.kind)?'.im-wallet':s.kind==='equip'?`[data-act="slot"][data-id="${w.starship.account.items[item??'']?.slot}"]`:'';
    return {key,text,target,selector:'',ready:false,navigation:false,result:true,resultSelector};
   }
   if(['production-on','production-off'].includes(s.kind))selector=`[data-action="building-enable"][data-facility="${producer?.id}"]`;
   else if(s.kind==='output')selector=`[data-action="building-output"][data-facility="${producer?.id}"][data-family="${GUIDED_FAMILY[w.expedition.race]}"]`;
   else if(s.kind==='repair'){const q=w.previewRepair(w.allies().filter(u=>!u.temporary&&!u.summonOwnerId).map(u=>u.id));if(q&&q.health>0)selector='[data-action="repair-all"][data-family=""]';else{selector='[data-action="ui-back"]';text='部队生命已满，无需修复。受伤时可在休整里恢复生命。';}}
   else if(s.kind==='apply')selector='[data-action="building-panel-apply"]';
   else if(s.kind==='detail')selector=`[data-act="detail"][data-id="${item}"]`;
   else if(s.kind==='equip')selector=`[data-act="equip"][data-id="${item}"]`;
   else if(s.kind==='build'||s.kind==='system')selector=`[data-action="development-purchase"][data-id="${offer?.offerId}"]`;
   else if(s.kind==='supply')selector=`[data-action="reward"][data-id="${offer?.offerId}"]`;
   else if(s.kind==='front'||s.kind==='supply-round')selector='[data-action="skip"]';
   else if(s.kind==='extract')selector='[data-action="extract"]';
   if(g.version===3&&g.phase==='waiting'){
    if(hud.root.querySelector('[data-action="ui-info-close"]')?.getClientRects().length)nav('[data-action="ui-info-close"]','关闭详情，继续关间整备。','info-close');
    else if(s.kind==='apply'&&!hud.tutorialBuildingDraft())nav('[data-action="battle-base"], [data-action="ui-page"][data-page="production"]','点击设施调整。','open');
    else if(s.kind==='repair'&&hud.intermission.current.page!=='rest')nav('[data-action="ui-page"][data-page="rest"]','点击休整，恢复生命。','open');
    else if(['detail','equip'].includes(s.kind)&&!hud.starship?.isOpen){
     if(hud.intermission.depth)nav('[data-action="ui-back"]','返回关间，再打开背包查看装备。','back');
     else nav('[data-action="starship-backpack"]','点击背包，查看装备。','open');
    }else if(s.kind==='extract'&&hud.starship?.isOpen)nav('[data-action="ui-back"], [data-act="close"]','散件已穿上。返回关间，带着模块撤离。','back');
   }
  }else if(tail){
   key=tail.step;target=null;
   if(tail.step==='flagship'){text='点击返回入口，前往旗舰安装模块。';selector=w.phase==='menu'?'[data-action="starship"]':'[data-action="restart"]';}
   else if(tail.step==='module'){text='点击刚带回的模块，查看安装位置。';selector=`[data-act="detail"][data-id="${tail.module}"]`;}
   else{text='点击装备，把模块安装到旗舰。';selector=`[data-act="equip"][data-id="${tail.module}"]`;}
   if(tail.version===3&&tail.step!=='flagship'){
    if(tail.feedback)return {key:'result:install',text:'模块已安装，教学完成。',target:null,selector:'',ready:false,navigation:false,result:true,resultSelector:`[data-act="slot"][data-id="logistics"]`};
    if(!hud.starship?.isOpen)nav('[data-action="starship"]','点击旗舰，找到刚带回的模块。','open');
    else if(hud.starship.ui.page!=='warehouse')nav('[data-act="page"][data-page="warehouse"]','点击仓库，查看成功带回的装备。','warehouse');
   }
  }
  return {key,text,target,selector,ready:guidedDurable(w)&&(!g||g.phase==='waiting'),navigation,result:false,resultSelector};
 }
 function sync(){
  const g=guided(w),s=guidedStep(w),tail=guidedTail(w),i=instruction();if(!i){prepared='';return null;}
  if(document.hidden||hud.settingsOpen||hud.readiness?.state.kind||hud.saveUI?.failed){prepared='';feedbackKey='';return i;}
  const feedback=g?.feedback??tail?.feedback;
  if(feedback&&(w.phase!=='battle')){
   const id=`${w.runId}:${tail?.run??''}:${feedback.step}:${feedback.at}`;
   if(feedbackKey!==id){feedbackKey=id;feedbackStarted=performance.now();}
   if(guidedDurable(w)&&performance.now()-feedbackStarted>=GUIDED_RESULT_SECONDS*1000){feedbackKey='';if(g)finishGuidedResult(w);else if(tail){delete tail.feedback;w.starship.account.tutorial!.status='completed';w.changed();}hud.session?.requestSave();return instruction();}
  }else feedbackKey='';
  if(g&&s?.kind==='front'&&g.phase==='running'&&w.phase==='reward'&&!hud.session?.busy){const command=g.commands.at(-1);if(command&&!command.done&&resuming!==command.id){resuming=command.id;hud.pendingStageAdvance=true;hud.onPrepareReinforcement();return i;}}
  const surface=`${w.runId}:${g?.step??i.key}:${g?.phase??'tail'}:${w.phase}`;
  if((g?.version===2||tail?.version===2)&&(surface!==prepared||s&&['detail','equip'].includes(s.kind)&&!hud.starship?.isOpen||tail&&tail.step!=='flagship'&&!hud.starship?.isOpen)){prepared=surface;
   if(g&&s){const production=['production-on','production-off','output','apply'].includes(s.kind)&&g.phase==='waiting';hud.prepareTutorialSurface(production?'production':s.kind==='repair'?'rest':s.kind==='detail'||s.kind==='equip'?'backpack':'main',g.draft,s.kind==='equip'?guidedItem(w):undefined);}
   else if(tail&&tail.step!=='flagship')hud.prepareTutorialSurface('warehouse',undefined,tail.step==='install'?tail.module:undefined);
  }
  return instruction();
 }
 function capture(event:MouseEvent){
  if(dispatching||hud.settingsOpen||!guided(w)&&!guidedTail(w))return;
  const el=event.target instanceof Element?event.target:undefined;if(el?.closest('[data-tutorial],.tutorial-mark'))return;
  const button=el?.closest<HTMLElement>('button,[role="button"],a,input,select');if(!button)return;
  const action=button.dataset.action;
  const stepNow=guidedStep(w);if(stepNow?.kind==='build'&&['ui-info','ui-info-close','ui-offer','ui-back'].includes(action??''))return;
  if(action&&['pause','settings','settings-back','settings-tab','fullscreen','toggle-ui-motion','camera-zoom-reset'].includes(action)||button.closest('.settings-panel'))return;
  event.preventDefault();event.stopImmediatePropagation();
  const i=instruction();if(!i?.ready||!i.selector||!button.matches(i.selector)||button.matches(':disabled')||button.closest('[inert]'))return;
  if(i.navigation){dispatching=true;try{button.click();}finally{dispatching=false;}hud.update();return;}
  const g=guided(w),s=guidedStep(w),tail=guidedTail(w),offer=guidedOffer(w),step=s?.id??tail?.step;
  if(!beginGuidedClick(w,guidedClickRef(w)))return;
  if(s?.after==='dispatch')permitGuidedProduction(w);
  dispatching=true;try{withGuidedCommand(w,()=>button.click());}finally{dispatching=false;}
  if(g&&s&&guided(w)?.step===step){
   if(['production-on','production-off','output'].includes(s.kind)){const draft=hud.tutorialBuildingDraft();if(!draft){rejectGuidedClick(w);return;}g.draft=draft;finishGuidedClick(w);}
   else if(s.kind==='apply'){if(hud.tutorialBuildingDraft()){rejectGuidedClick(w);return;}delete g.draft;if(g.producer&&!g.editedProduction.includes(g.producer))g.editedProduction.push(g.producer);if(!s.after)presentGuidedResult(w);}
   else if(s.kind==='repair'){if(w.allies().every(u=>u.hp>=u.maxHp-1e-6))presentGuidedResult(w);else rejectGuidedClick(w);}
   else if(s.kind==='detail'){if(hud.starship?.ui.detailId===guidedItem(w))finishGuidedClick(w);else rejectGuidedClick(w);}
   else if(['build','system','supply'].includes(s.kind)){if(offer?.sold)presentGuidedResult(w);else rejectGuidedClick(w);}
   else if(s.kind==='supply-round'){if(w.rewardRound==='random')finishGuidedClick(w);else rejectGuidedClick(w);}
  }else if(tail&&tail.step===step){
   const command=tail.commands.at(-1)!;
   if(step==='flagship'&&(w.phase==='menu'||hud.starship?.isOpen)){command.done=true;tail.step='module';w.changed();}
   else if(step==='module'&&hud.starship?.ui.detailId===tail.module){command.done=true;tail.step='install';w.changed();}
   else if(step==='install'){const item=w.starship.account.items[tail.module];if(item&&w.starship.account.equipped[item.race][item.slot]===tail.module){command.done=true;if(tail.version===3)tail.feedback={step:'install',at:w.time};else w.starship.account.tutorial!.status='completed';w.changed();}}
  }
  w.changed();hud.session?.requestSave();hud.update();
 }
 const key=(e:KeyboardEvent)=>{if(hud.settingsOpen||!guided(w)&&!guidedTail(w))return;if(e.code==='Tab')return;const target=e.target as HTMLElement;if(['Escape','F11','F12','AudioVolumeMute','AudioVolumeUp','AudioVolumeDown'].includes(e.code)||target.closest('[data-tutorial],.tutorial-highlight')&&['Enter','Space','Tab'].includes(e.code))return;const g=guided(w);if(g?.phase==='running'&&['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))return;e.preventDefault();e.stopImmediatePropagation();};
 window.addEventListener('click',capture,{capture:true,signal:abort.signal});window.addEventListener('keydown',key,{capture:true,signal:abort.signal});
 return {sync,instruction,activateTarget:()=>activateGuidedTarget(w),dispose(){abort.abort();}};
}
