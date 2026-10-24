import '../ui/presentation/building-panel.css';
import '../ui/presentation/game-shell.css';
import '../render/scene/battle-distress.css';
import '../ui/presentation/world-labels.css';
import '../ui/presentation/text-scale-reference.generated.css';
import '../ui/hud/special-stages.css';
import './fun-lab.css';
import {boot} from '../app/bootstrap';
import {newEquipmentAccount} from '../simulation/starship/inventory';
import {starshipImage} from '../ui/starship/runtime-art';
import {applyDisplayPreferences} from '../ui/display-preferences';
import {finishOpening} from '../ui/presentation/opening';
import {setDiagnosticHealthLock,diagnosticHealthLock} from './combat-lock';
import {LAB_CASES,LAB_ROSTERS,prepareLabCase,labEnemies,labShopShelf,runLabShop,labHitEvents} from './fun-lab-cases';
import type {FunShopId} from '../simulation/fun-shop/state';
import type {SpecialActive} from '../simulation/special-stages/state';

async function startLab(){
 if(import.meta.env.VITE_FUN_LAB!=='1')throw Error('此入口只供独立试玩包使用');
 document.title='星际幸存者 · 趣味关卡试玩';document.body.classList.add('fun-lab','lab-menu');applyDisplayPreferences();
 const app=await boot({seed:529,equipmentAccount:newEquipmentAccount(529),starship:{resolveImage:starshipImage}}),{world:w,view,hud,readiness,driver}=app;
 const bar=document.createElement('aside');bar.className='fun-lab-bar';bar.setAttribute('aria-label','试玩控制');bar.innerHTML='<button data-lab="menu">切换内容</button><button data-lab="retry">重试</button><button data-lab="pause">暂停</button><label><input type="checkbox" data-lab="god" checked>无敌</label><output data-lab="status" aria-live="off"></output><button data-lab="shelf" hidden>重新陈列</button><button data-lab="effect" hidden>开始效果演示</button><button data-lab="enemies" hidden>补充敌群</button>';
 const dialog=document.createElement('dialog');dialog.className='fun-lab-picker';dialog.setAttribute('aria-label','选择试玩内容');
 const groups=[...new Set(LAB_CASES.map(c=>c.group))];
 dialog.innerHTML=`<form method="dialog"><p class="lab-kicker">星际幸存者 · 独立试玩</p><h1>选择一场挑战</h1><label>内容<select data-lab="case">${groups.map(group=>`<optgroup label="${group}">${LAB_CASES.filter(c=>c.group===group).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</optgroup>`).join('')}</select></label><label data-lab="roster-label">毒爆小队<select data-lab="roster">${Object.entries(LAB_ROSTERS).map(([key,r])=>`<option value="${key}">${r.name}</option>`).join('')}</select></label><p data-lab="description"></p><p class="lab-instructions">电脑默认使用原有鼠标操作移动，手机使用原有摇杆。无敌保留命中反馈与计数，可随时关闭。</p><p class="lab-instructions">全内容试玩采用困难规则，与正式简单／普通的内容池不同。除毒爆外，配备5级强化编队与全队卡牌；感染自爆项不带医疗。各场独立重置，概率商品按真实概率运行。</p><output data-lab="loading" role="status"></output><div class="lab-actions"><button value="cancel" data-lab="cancel">返回试玩</button><button type="button" data-lab="start">开始试玩</button></div></form>`;
 document.body.append(bar,dialog);const select=dialog.querySelector<HTMLSelectElement>('[data-lab=case]')!,roster=dialog.querySelector<HTMLSelectElement>('[data-lab=roster]')!,god=bar.querySelector<HTMLInputElement>('[data-lab=god]')!,loading=dialog.querySelector<HTMLOutputElement>('[data-lab=loading]')!,status=bar.querySelector<HTMLOutputElement>('[data-lab=status]')!;
 let choice='special:dodge',busy=false,started=false,pausedBefore=false,active:SpecialActive|null=null,completed=false,hits=0,lastSerial=0,nextFeed=0;
 select.value=choice;
 const describe=()=>{dialog.querySelector('[data-lab=description]')!.textContent=LAB_CASES.find(c=>c.id===select.value)!.description;dialog.querySelector<HTMLElement>('[data-lab=roster-label]')!.hidden=select.value!=='special:dodge';};
 const open=()=>{if(busy)return;pausedBefore=completed?false:w.paused;w.paused=true;hud.inputReset();hud.root.inert=true;document.body.classList.add('lab-menu');loading.textContent=completed?(active?.kind==='dodge'?`本轮${active.result==='success'?'完成':'失败'} · 命中 ${active.hits} 次 · ${(active.clock/60).toFixed(1)} 秒`:'本轮已结束，可重新选择。'):'';dialog.querySelector<HTMLButtonElement>('[data-lab=cancel]')!.hidden=!started;describe();if(!dialog.open)dialog.showModal();};
 const close=()=>{dialog.close();hud.root.inert=false;document.body.classList.remove('lab-menu');w.paused=pausedBefore;w.changed();};
 async function launch(){
  if(busy)return;busy=true;for(const b of dialog.querySelectorAll<HTMLButtonElement>('button'))b.disabled=true;
  try{
   choice=select.value;await hud.audio?.start();hud.starship?.close();hud.settingsOpen=false;hud.talentOpen=false;Object.assign(hud,{archivesOpen:false});hud.inputReset();readiness.cancel();
   prepareLabCase(w,choice,roster.value);active=w.specialStages.active;completed=false;hits=0;lastSerial=Math.max(0,...w.visualEvents.map(e=>e.serial));nextFeed=0;w.paused=true;setDiagnosticHealthLock(w,god.checked);
   if(!await readiness.prepare(view.initialAssetsLoaded?'reinforcement':'new',{race:'terran',campaignMap:w.runConfig?.campaignMap}))throw Error(readiness.state.error??'资源尚未就绪');
   readiness.cancel();driver.reset();view.resetRun();started=true;dialog.close();hud.root.inert=false;document.body.classList.remove('lab-menu');w.paused=false;hud.update();w.changed();
   if(window.__SC2_DEBUG__)window.__SC2_DEBUG__.speed=1;
  }catch(error){loading.textContent=String((error as Error).message);w.paused=true;hud.root.inert=true;document.body.classList.add('lab-menu');if(!dialog.open)dialog.showModal();}
  finally{busy=false;for(const b of dialog.querySelectorAll<HTMLButtonElement>('button'))b.disabled=false;}
 }
 // The queen's practice scenario supplies normal prey for the actual
 // swallowing/kill counter; no completion or reward is granted here.
 const realStep=w.step.bind(w);
 w.step=()=>{
  if(started&&!busy&&!w.paused&&!w.specialStages.active&&w.phase==='battle'){
   if(choice==='fun:cruelQueen'&&w.time>=nextFeed&&(w.encounters.expanded.queen?.kills??300)<300){nextFeed=w.time+1;if(w.enemyCount()<60)labEnemies(w,16);}
  }
  realStep();
 };
 const update=()=>{
  if(busy){const r=readiness.state;loading.textContent=r.label+(r.total?' · '+Math.round(100*r.done/r.total)+'%':'');}
  const impacts=labHitEvents(w,lastSerial);lastSerial=impacts.serial;hits+=impacts.hits;
  if(started&&active&&!w.specialStages.active&&!completed){completed=true;w.paused=true;hud.inputReset();w.changed();open();}
  const a=w.specialStages.active??active,name=LAB_CASES.find(c=>c.id===choice)?.name??'';
  status.textContent=started?`${name} · ${(a?Math.min(a.clock/60,a.kind==='dodge'?60:Infinity):w.time).toFixed(1)}s · 命中 ${a?.kind==='dodge'?a.hits:hits}`:'选择内容后开始';
  bar.querySelector('[data-lab=pause]')!.textContent=w.paused?'继续':'暂停';
  for(const key of ['shelf','effect'])bar.querySelector<HTMLButtonElement>('[data-lab='+key+']')!.hidden=!choice.startsWith('shop:')||w.phase!=='reward';
  bar.querySelector<HTMLButtonElement>('[data-lab=effect]')!.textContent=choice==='shop:dice'?'查看普通商品':'开始效果演示';
  bar.querySelector<HTMLButtonElement>('[data-lab=enemies]')!.hidden=!choice.startsWith('shop:')||w.phase!=='battle';
  setTimeout(update,200);
 };
 bar.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest<HTMLElement>('[data-lab]');if(!button||busy)return;switch(button.dataset.lab){case 'menu':open();break;case 'retry':open();void launch();break;case 'pause':if(started){w.paused=!w.paused;hud.inputReset();w.changed();}break;case 'shelf':labShopShelf(w,choice.split(':')[1] as FunShopId);break;case 'effect':if(!runLabShop(w,choice.split(':')[1] as FunShopId))w.announce('请先购买商品');break;case 'enemies':labEnemies(w);break;}});
 god.addEventListener('change',()=>{setDiagnosticHealthLock(w,god.checked);w.changed();});select.addEventListener('change',describe);
 dialog.querySelector('[data-lab=start]')!.addEventListener('click',()=>void launch());dialog.querySelector('[data-lab=cancel]')!.addEventListener('click',e=>{e.preventDefault();if(started&&!busy)close();});dialog.addEventListener('cancel',e=>{e.preventDefault();if(started&&!busy)close();});dialog.addEventListener('keydown',e=>e.stopPropagation());
 const report=()=>({choice,busy,started,completed,invincible:diagnosticHealthLock(w),hits:active?.kind==='dodge'?active.hits:hits,clock:active?.clock,phase:w.phase,special:w.specialStages.active?.kind,specialPhase:w.specialStages.active?.phase,result:active?.result,camera:view.report().camera,readiness:readiness.state});
 Object.assign(window,{__FUN_LAB__:{...app,report,cases:LAB_CASES}});open();update();
}
void startLab().catch(error=>{finishOpening();document.body.classList.add('fun-lab');const p=document.createElement('pre');p.className='fun-lab-error';p.textContent='试玩载入失败：'+String(error);document.body.append(p);console.error(error);});
