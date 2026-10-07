import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/presentation/world-labels.css';
import './sample.css';
import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {SC2_UNITS} from '../../src/data/sc2-units';
import type {FamilyId} from '../../src/data/races';
import {DEVELOPMENT,PRODUCTION_LINES,LINE_SKILLS,lineResearch,type ProductionLineId} from '../../src/data/expedition-buildings';
import {ASSETS,assetUrl} from '../../src/assets/manifest';
import {loadEmbeddedAssets,prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import {captureBattleView} from '../../src/render/input/battle-view';
import {activateBattleAction,battleActionState,bindBattleView,COMMAND_ACTIONS,type BattleActionId} from '../../src/ui/controls/battle-actions';
import {ControlSettings} from '../../src/ui/controls/settings';
import {Input} from '../../src/ui/mobile/input';
import {battleInputCapture,trapTab} from '../../src/ui/presentation/input-capture';
import {renderUnitInspector,type UnitSeat,type InspectorTab} from '../../src/ui/presentation/unit-inspector';
import {updateLiveInspector} from '../../src/ui/presentation/live-inspector';
import {rankLabel} from '../../src/ui/unit-identity';
import {renderProductionWindow,renderRepairs} from '../../src/ui/hud/expedition-panel';
import {renderIntermission,IntermissionNavigation,offerView,restCards} from '../../src/ui/presentation/intermission';
import {referenceCard,referenceCardDetail} from '../../src/ui/presentation/reference-card';
import {image,button,glyph,money,modal,esc} from '../../src/ui/presentation/reference-primitives';
import {supplyEligibility} from '../../src/simulation/progression/supply-cards';
import {teamCardEffects} from '../../src/simulation/progression/team-cards';
import {EXPEDITION_CARD_DEFINITIONS,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {commandSlots,type CommandSlot} from './console-model';

type Scene='battle'|'building'|'supply'|'full'|'no-heroes';
type BaseTab='facilities'|'production'|'orders'|'plans';
const $=(id:string)=>document.getElementById(id)!;
const families:FamilyId[]=['medivac','marine','hellion','tank','marauder'];
const heroes:HeroId[]=['raynor','tychus','nova'];
const globals:BattleActionId[]=['dash','detection','airlift','tactical','strategic'];
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));
for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
async function boot(){
 await loadEmbeddedAssets();
 await prepareEmbeddedAssetIds(selected,(done,total)=>{$('sample-loading').textContent='准备战场 '+done+' / '+total;});
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10808});
const canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world),root=$('interface');
view.fx.heroQuality='full';view.cameraShake=false;bindBattleView(world,()=>captureBattleView(canvas,view.camera));
let ready=false,scene:Scene='battle',baseTab:BaseTab='facilities',baseOpen=false,baseWasPaused=false,armyFolded=false,commandsFolded=false;
let inspectorKey='',inspectorTab:InspectorTab='stats',inspectorHTML='',offerId='',progressOpen=false,service:'repair'|'revive'|null=null,previous=performance.now(),lastUi=0,structure='';
const nav=new IntermissionNavigation(),expanded=new Set<string>(),events:{action:string;ok:boolean;at:number}[]=[];
root.innerHTML=`<header id="topbar" class="battle-top"><span class="battle-location">据点防线</span><div id="sample-wallet" class="battle-resources"></div><div class="battle-stage"><b id="sample-stage"></b><strong id="sample-clock"></strong></div><button class="sample-base-button" data-sample="base" aria-label="基地 · 设施调整">${image('building.barracks')}<span>基地</span></button><button class="icon-button" data-sample="pause" aria-label="暂停">${glyph('pause')}</button></header><div id="notice" role="status"></div><section id="battle-console"><div class="console-body"><div class="sample-army"><button class="sample-fold" id="army-toggle" data-sample="fold-army" aria-label="收起队伍" aria-controls="roster" aria-expanded="true"></button><div id="roster" role="group" aria-label="五个兵种与三名英雄"></div></div><div class="sample-commands"><button class="sample-fold" id="commands-toggle" data-sample="fold-commands" aria-label="收起指令" aria-controls="sample-command-list" aria-expanded="true"></button><div id="sample-command-list" class="sample-command-list"></div></div></div></section><div id="joystick" aria-label="移动摇杆"><i></i></div><section id="overlay" data-captures-battle-input hidden></section><div id="unit-inspector" data-captures-battle-input hidden></div>`;
const controls=new ControlSettings();controls.set('desktop','keyboard');
const input=new Input(world,$('joystick'),()=>closeTopOrPause(),controls,{canvas,pick:(x,y)=>view.pick(x,y),pickMove:(x,y)=>view.pickMove(x,y),previewTarget:p=>{view.targetPreview=p;}});
new ResizeObserver(()=>{view.resize();view.camera.zoom=canvas.clientWidth<canvas.clientHeight?1.18:1.3;view.camera.updateProjectionMatrix();}).observe(canvas);
new ResizeObserver(()=>{$('game-root').style.setProperty('--sample-console-height',Math.ceil($('battle-console').getBoundingClientRect().height)+'px');}).observe($('battle-console'));

/** Diagnostic setup only. All subsequent skills, purchases and production use World. */
function chooseScene(next:Scene){
 input.reset();view.resetRun();world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];
 scene=next;world.stage=3;world.stageElapsed=0;world.wallet={minerals:10000,gas:1000};world.expedition.familySlots=[...families];
 world.expedition.facilities=[{id:1,kind:'barracks',line:'barracks',techLab:false},{id:2,kind:'factory',line:'factory',techLab:false},{id:3,kind:'starport',line:'starport',techLab:false}];world.expedition.nextFacility=4;
 for(const family of families)world.expedition.tech['unlock.'+family]=1;
 Object.assign(world.expedition.tech,{barracks:1,factory:1,starport:1,stim:1,'system.barracks':1,'system.factory':1,'system.starport':1,'research.barracks.weapon':2,'research.barracks.defense':1,'research.factory.weapon':1,'research.factory.defense':1});
 world.upgrades.set('stim',1);world.expedition.cardTotals={'weapon.marine':.08,'armor.marine':.3,'team.firepower.green':1,'team.defense.white':2};
 for(const [id,plan]of Object.entries(world.expedition.production)){if(!plan)continue;plan.enabled={};plan.outputs=id==='barracks'?['marine','marauder']:id==='factory'?['hellion','tank']:['medivac'];}
 families.forEach((family,i)=>{for(let j=0;j<(family==='marine'?2:1);j++)world.addFamilyMember(family,{x:-2+(i%3)*1.5,z:-2.5+Math.floor(i/3)*3+j},j+1);});
 if(next!=='no-heroes')for(const [i,id]of heroes.entries()){if(!world.acquireHero(id))throw Error('Cannot prepare '+id);const u=world.heroEntity(id)!;u.x=-2+i*2;u.z=1.5;u.prev={x:u.x,z:u.z};}
 for(let i=0;i<8;i++){const e=world.addUnit(i%3===0?'zergling':'roach','zerg',4+(i%4)*1.2,-2+Math.floor(i/4)*3,1,'regular',3);e.hp=e.maxHp=200000;e.moveSpeed=0;e.stoppedUntil=e.specialReady=1e9;}
 world.hash.rebuild(world.entities.values());baseOpen=false;progressOpen=false;service=null;inspectorKey='';offerId='';inspectorHTML='';baseTab='facilities';nav.reset();structure='';events.length=0;armyFolded=commandsFolded=false;stepper.reset();
 if(next==='building'){world.endStage();world.setDevelopmentDirection('barracks');}
 else if(next==='supply'||next==='full'){
  world.endStage();world.skipReward();
  let found=false;for(let i=0;i<300;i++){if(world.rewards.some(r=>(r as ExpeditionReward).expeditionEffect.kind==='supply'&&(r as ExpeditionReward).expeditionEffect.kind==='supply'&&((r as ExpeditionReward).expeditionEffect as {family?:string}).family==='marine')){found=true;break;}if(!world.reroll())break;}
  if(!found)throw Error('Cannot prepare a genuine supply quote');
  if(next==='full')while(world.familySeatCount('marine')<world.rosterCap){const u=world.addFamilyMember('marine',{x:-3,z:world.familySeatCount('marine')},1);u.stoppedUntil=1e9;}
 }
 world.paused=false;document.body.dataset.battleActionsReady=String(ready);($('sample-scene')as HTMLSelectElement).value=next;render();world.changed();
}
function allSeats():UnitSeat[]{
 const seats:UnitSeat[]=[];
 for(const family of world.expedition.familySlots)world.familyUnits(family).forEach((u,i)=>seats.push({key:family+':'+i,family,unit:u,bodies:[u],name:SC2_UNITS[family].zh,image:'unit.'+family}));
 [...world.heroes.keys()].forEach((hero,i)=>{const u=world.heroEntity(hero);seats.push({key:'hero:'+i,hero,unit:u&&u.hp>0?u:undefined,bodies:u&&u.hp>0?[u]:[],name:HEROES[hero].name,image:'hero.'+hero});});return seats;
}
function inspect(slot:CommandSlot){
 if(!slot.family&&!slot.hero)return;
 inspectorKey=slot.hero?slot.key:allSeats().find(s=>s.family===slot.family)?.key??'';inspectorTab='stats';expanded.clear();input.reset();render();$('unit-inspector').querySelector<HTMLElement>('[data-inspect-close]')?.focus({preventScroll:true});
}
function cast(slot:CommandSlot){
 if(!ready||battleInputCapture())return;if(!slot.action){inspect(slot);return;}
 const ok=activateBattleAction(world,slot.action);events.push({action:slot.action,ok,at:world.time});render();
}
function arrow(collapsed:boolean){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${collapsed?'M5 15l7-7 7 7':'M5 9l7 7 7-7'}"/></svg>`;}
function fold(id:string,folded:boolean,label:string,region:string){const b=$(id);b.innerHTML=arrow(folded);b.setAttribute('aria-expanded',String(!folded));b.setAttribute('aria-label',(folded?'展开':'收起')+label);b.title=b.getAttribute('aria-label')!;$(region).hidden=folded;b.parentElement!.classList.toggle('collapsed',folded);}
function skillLabel(slot:CommandSlot){if(slot.hero)return HEROES[slot.hero].skill;if(!slot.action)return '';const state=battleActionState(world,slot.action);return slot.action==='stim'?'兴奋剂':state.name.split(' · ').at(-1)!;}
function renderConsole(){
 const slots=commandSlots(world),key=slots.map(s=>[s.key,s.image,s.action].join('/')).join('|');
 if(structure!==key){structure=key;$('roster').innerHTML=slots.map(s=>`<button class="sample-slot ${s.hero?'hero':''} ${s.family||s.hero?'':'empty-slot'}" data-slot="${s.key}" ${s.family||s.hero?'':'disabled'}>${s.image?image(s.image,s.name):'<span class="slot-silhouette">◇</span>'}<span class="slot-copy"><span class="slot-name">${s.name}</span><span class="slot-ability"></span></span><span class="slot-count"></span><span class="slot-key"></span><span class="slot-health"><i></i></span><span class="slot-cooldown"></span></button>`).join('');}
 for(const s of slots){const b=root.querySelector<HTMLElement>(`[data-slot="${s.key}"]`)!;b.dataset.battleAction=s.action??'';b.classList.toggle('skill-ready',!!s.action&&s.enabled);b.classList.toggle('cooling',s.remaining>0);b.setAttribute('aria-label',s.name+(s.action?' · '+skillLabel(s)+(s.reason?' · '+s.reason:'')+' · 点击施放':' · 查看详情'));b.title=b.getAttribute('aria-label')!+' · 右键或长按详情';b.querySelector('.slot-ability')!.textContent=skillLabel(s);b.querySelector('.slot-count')!.textContent=s.family?'×'+s.count:'';b.querySelector('.slot-cooldown')!.textContent=s.remaining>0?String(Math.ceil(s.remaining)):'';(b.querySelector('.slot-health i')as HTMLElement).style.width=(s.maxHp?Math.max(0,s.hp)/s.maxHp*100:0)+'%';b.querySelector('.slot-key')!.textContent=s.hero?String(Number(s.key.slice(-1))+1):COMMAND_ACTIONS.find(a=>a.id===s.action)?.key??'';}
 fold('army-toggle',armyFolded,'队伍','roster');fold('commands-toggle',commandsFolded,'指令','sample-command-list');
 const commands=globals.map(id=>({id,state:battleActionState(world,id)})).filter(s=>s.state.visible);
 const globalKey=commands.map(c=>c.id).join('|'),list=$('sample-command-list');
 if(list.dataset.structure!==globalKey){list.dataset.structure=globalKey;list.innerHTML=commands.map(({id})=>{const meta=COMMAND_ACTIONS.find(a=>a.id===id)!;return `<button class="sample-command" data-command="${id}">${'icon'in meta?image(meta.icon):glyph(meta.glyph==='scan'?'target':meta.glyph)}<b></b><kbd>${meta.key}</kbd></button>`;}).join('');}
 for(const {id,state}of commands){const b=list.querySelector<HTMLButtonElement>(`[data-command="${id}"]`)!;b.disabled=!state.enabled;b.querySelector('b')!.textContent=state.name+(state.remaining>0?' '+Math.ceil(state.remaining)+'s':'');b.title=state.reason;}
 $('battle-console').hidden=world.phase!=='battle';
}
function progressStrip(){return `<div class="sample-progress-strip" aria-label="武器与防护研究">${(['barracks','factory','starport']as const).map(line=>`<span>${PRODUCTION_LINES[line].name} <b>武器 ${world.expedition.tech[lineResearch(line,'weapon')]??0} · 防护 ${world.expedition.tech[lineResearch(line,'defense')]??0}</b></span>`).join('')}${button('强化一览','sample-progress','small')}</div>`;}
function research(line:ProductionLineId,kind:'weapon'|'defense'){const n=world.expedition.tech[lineResearch(line,kind)]??0;return `<div>${image(kind==='weapon'?'tech.attack':'tech.armor')}<span>${kind==='weapon'?'武器':'防护'}</span><span class="research-pips" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=n?'lit':''}"></i>`).join('')}</span><b>${n} / 3</b></div>`;}
function totals(){
 const team=teamCardEffects(world.expedition),pct=(v:number)=>Number((v*100).toFixed(1))+'%';
 return `<section class="sample-cumulative"><h3>累计强化</h3><div class="sample-totals"><span>全军伤害 <b>+${pct(team.damage)}</b> · 攻速 <b>+${pct(team.speed)}</b></span><span>全军生命／护盾 <b>+${pct(team.health)}</b> · 护甲 <b>+${Number(team.armor.toFixed(2))}</b></span>${world.expedition.familySlots.flatMap(f=>Object.keys(EXPEDITION_CARD_DEFINITIONS).flatMap(kind=>{const value=world.expedition.cardTotals[kind+'.'+f];return value?[`<span>${SC2_UNITS[f].zh} · ${(EXPEDITION_CARD_DEFINITIONS as any)[kind].name} <b>+${kind==='armor'||kind==='cultivation'?Number(value.toFixed(2)):pct(value)}</b></span>`]:[];})).join('')}</div></section>`;
}
function facilities(){
 return `<div class="sample-facility-list">${(['barracks','factory','starport']as const).map(line=>{const facilities=world.expedition.facilities.filter(f=>f.line===line),p=world.expedition.production[line],techs=(LINE_SKILLS[line]??[]).filter(([id])=>world.expedition.tech[id]);return `<section class="sample-facility-card"><header>${image('building.'+line)}<h2>${PRODUCTION_LINES[line].name}</h2><small>${facilities.length} 座</small></header><div class="sample-research">${research(line,'weapon')}${research(line,'defense')}</div><p class="sample-output">训练：${p?.outputs.map(f=>SC2_UNITS[f].zh).join(' / ')||'未选择'}</p>${techs.length?`<p class="sample-techs">${techs.map(([,name])=>name).join(' · ')}</p>`:''}</section>`;}).join('')}</div><div class="sample-next-target"><label><span>下次发展目标</span><select data-sample-setting="development-target" ${world.phase==='battle'?'disabled title="关间整备时调整"':''}><option value="">跟随当前编制</option>${DEVELOPMENT.filter(d=>d.race==='terran').map(d=>`<option value="${d.id}" ${world.expedition.developmentTarget===d.id?'selected':''}>${d.name}</option>`).join('')}</select></label></div>${totals()}`;
}
function renderBase(){
 const tabs=`<nav class="settings-tabs" role="group" aria-label="基地类别">${(['facilities','production','orders','plans']as const).map(t=>button(({facilities:'设施',production:'训练',orders:'订单',plans:'部署'})[t],'sample-base-tab','',`data-tab="${t}" aria-pressed="${baseTab===t}"`)).join('')}</nav>`;
 if(baseTab==='facilities')return modal('基地','',tabs+facilities(),'production-modal',button('返回','sample-base-close','primary'),'sample-base-close');
 return renderProductionWindow(world,baseTab,'sample-base-close').replace(/<nav class="settings-tabs"[\s\S]*?<\/nav>/,tabs).replace('持续生产','基地').replace('<select data-setting="development-target"',`<select data-setting="development-target" ${world.phase==='battle'?'disabled title="关间整备时调整"':''}`);
}
function supplyCard(r:ExpeditionReward){
 const v=offerView(world,r),e=r.expeditionEffect;
 if(e.kind==='supply'){
  const q=supplyEligibility(world,e.family,e.count,e.mode),capacity=q.reasons.includes('capacity');
  if(!r.sold&&!q.legal){v.reason=capacity?'编制已满':q.reasons.includes('research')?'研究不足':q.reasons.includes('facility')?'缺少设施':'暂无可用落点';v.label=capacity?'编制已满':'暂不可购买';}
  v.stat+=(e.mode==='direct'?' · 即刻加入':' · 空投后救援')+' · '+SC2_UNITS[e.family].zh+' '+q.alive+' / '+world.rosterCap;
  v.detail+=' 当前编制 '+q.alive+' / '+world.rosterCap+'，待部署 '+q.pending+'。';
 }
 return v;
}
function rewardCard(r:ExpeditionReward,i:number){const v=supplyCard(r),html=referenceCard(v,i);return v.reason==='编制已满'?html.replace(/<span class="im-card-status">[\s\S]*?<\/span>/,'<span class="im-card-status full-status">编制已满</span>'):html;}
function renderReward(){
 let html=renderIntermission(world,'',nav);
 if(world.rewardRound==='random')html=html.replace(/<div class="im-choice-grid" id="reward-cards"[\s\S]*?(?=<footer class="im-footer reward-actions">)/,`<div class="im-choice-grid" id="reward-cards" aria-label="商店选项">${world.rewards.map((r,i)=>rewardCard(r as ExpeditionReward,i)).join('')}</div>`);
 const at=html.indexOf('</nav>');if(at>=0)html=html.slice(0,at+6)+progressStrip()+html.slice(at+6);
 html=html.replace('<div class="im-refresh">',`${button('设施调整','sample-base','sample-base-button')}<div class="im-refresh">`);
 if(offerId){const r=world.rewards.find(r=>r.offerId===offerId)as ExpeditionReward|undefined;if(r)html+=modal(r.name,offerView(world,r).kicker,referenceCardDetail(supplyCard(r)),'im-detail-dialog',button('返回','sample-offer-close','secondary')+button(world.canChooseReward(r)?'确认购买':supplyCard(r).reason??'不可购买','reward','primary',`data-id="${esc(r.offerId)}" ${world.canChooseReward(r)?'':'disabled'}`),'sample-offer-close');}
 return html;
}
function put(id:string,html:string){const el=$(id);if(el.dataset.last!==html){el.dataset.last=html;const scroll=[...el.querySelectorAll<HTMLElement>('.modal-content,[data-ui-scroll]')].map(n=>n.scrollTop);el.innerHTML=html;[...el.querySelectorAll<HTMLElement>('.modal-content,[data-ui-scroll]')].forEach((n,i)=>{n.scrollTop=scroll[i]??0;});}}
function render(){
 if(!ready)return;
 put('sample-wallet',money(world.wallet.minerals,world.wallet.gas));$('sample-stage').textContent=world.phase==='reward'?'第 '+world.stage+' 关完成':'第 '+world.stage+' 关';$('sample-clock').textContent=world.phase==='battle'?Math.floor(world.time/60).toString().padStart(2,'0')+':'+Math.floor(world.time%60).toString().padStart(2,'0'):'';
 root.querySelector('[data-sample=pause]')!.setAttribute('aria-label',world.paused?'继续':'暂停');
 $('notice').textContent=world.time<world.noticeUntil?world.notice:'';renderConsole();
 let overlay=baseOpen?renderBase():world.phase==='reward'?renderReward():'';
 if(progressOpen)overlay+=modal('强化一览','',facilities(),'production-modal',button('返回','sample-progress-close','primary'),'sample-progress-close');
 if(service)overlay+=modal(service==='repair'?'修复部队':'英雄复活','',service==='repair'?renderRepairs(world):'<div class="im-choice-grid">'+restCards(world).slice(1).map((c,i)=>referenceCard({...c,detailAction:'ui-rest-revivals',detailAttrs:''},i)).join('')+'</div>','production-modal',button('返回','sample-service-close','primary'),'sample-service-close');
 $('overlay').hidden=!overlay;put('overlay',overlay);
 const seats=allSeats(),seat=seats.find(s=>s.key===inspectorKey);$('unit-inspector').hidden=!seat;
 if(seat){const html=renderUnitInspector(world,seat,seats,inspectorTab,expanded);if(inspectorHTML!==html){inspectorHTML=html;updateLiveInspector($('unit-inspector'),html);}}else if(inspectorHTML){inspectorHTML='';$('unit-inspector').innerHTML='';}
 const captures=!!overlay||!!seat;$('topbar').inert=captures;$('battle-console').inert=captures;$('joystick').hidden=captures;
}
function openBase(){if(baseOpen)return;baseOpen=true;baseTab='facilities';baseWasPaused=world.paused;if(world.phase==='battle')world.paused=true;input.reset();stepper.reset();render();root.querySelector<HTMLElement>('.production-modal [data-autofocus],.production-modal .modal-header button')?.focus();}
function closeBase(){baseOpen=false;if(world.phase==='battle')world.paused=baseWasPaused;input.reset();stepper.reset();render();root.querySelector<HTMLElement>(world.phase==='reward'?'[data-action=sample-base]':'[data-sample=base]')?.focus();}
function closeTopOrPause(){if(inspectorKey){inspectorKey='';render();return;}if(service){service=null;render();return;}if(progressOpen){progressOpen=false;render();return;}if(offerId){offerId='';render();return;}if(baseOpen){closeBase();return;}if(world.phase==='battle'){world.paused=!world.paused;input.reset();stepper.reset();render();}}
let press:{id:number;key:string;x:number;y:number;timer:number}|null=null,suppressUntil=0;
const clearPress=()=>{if(press)clearTimeout(press.timer);press=null;};
root.addEventListener('pointerdown',e=>{
 const b=(e.target as HTMLElement).closest<HTMLElement>('[data-slot]');if(!b||e.button!==0||e.pointerType==='mouse')return;
 clearPress();press={id:e.pointerId,key:b.dataset.slot!,x:e.clientX,y:e.clientY,timer:window.setTimeout(()=>{const slot=commandSlots(world).find(s=>s.key===press?.key);if(slot){suppressUntil=performance.now()+900;inspect(slot);}clearPress();},480)};
});
root.addEventListener('pointermove',e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)clearPress();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,clearPress);
root.addEventListener('contextmenu',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-slot]');if(!b)return;e.preventDefault();suppressUntil=performance.now()+300;const slot=commandSlots(world).find(s=>s.key===b.dataset.slot);if(slot)inspect(slot);});
root.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;
 if(b.dataset.slot){if(performance.now()<suppressUntil){e.preventDefault();return;}const slot=commandSlots(world).find(s=>s.key===b.dataset.slot);if(slot)cast(slot);return;}
 if(b.dataset.command){if(!battleInputCapture()){const ok=activateBattleAction(world,b.dataset.command as BattleActionId);events.push({action:b.dataset.command,ok,at:world.time});render();}return;}
 if(b.dataset.sample==='base'||b.dataset.action==='sample-base'){openBase();return;}
 if(b.dataset.sample==='pause'){closeTopOrPause();return;}
 if(b.dataset.sample==='fold-army'){armyFolded=!armyFolded;render();return;}
 if(b.dataset.sample==='fold-commands'){commandsFolded=!commandsFolded;render();return;}
 if(b.dataset.inspectClose!==undefined){inspectorKey='';render();return;}
 if(b.dataset.inspectSeat){inspectorKey=b.dataset.inspectSeat;inspectorTab='stats';expanded.clear();render();return;}
 if(b.dataset.inspectTab){inspectorTab=b.dataset.inspectTab as InspectorTab;expanded.clear();if(inspectorTab==='abilities')expanded.add(inspectorKey.startsWith('hero:')?'active':'native');render();return;}
 if(b.dataset.inspectNeighbor){const seats=allSeats(),index=seats.findIndex(s=>s.key===inspectorKey);inspectorKey=seats[Math.max(0,Math.min(seats.length-1,index+Number(b.dataset.inspectNeighbor)))].key;render();return;}
 const action=b.dataset.action;
 if(action==='ui-rest-repair'||action==='ui-rest-revivals'){service=action==='ui-rest-repair'?'repair':'revive';render();return;}
 if(action==='sample-service-close'){service=null;render();return;}
 if(action==='repair-all'){const units=b.dataset.family?world.familyBodies(b.dataset.family as FamilyId):world.allies(),quote=world.previewRepair(units.filter(u=>!u.temporary&&!u.summonOwnerId).map(u=>u.id));if(quote&&quote.id===b.dataset.quote)world.purchaseRepair(quote.id);render();return;}
 if(action==='revive'){world.reviveHero(b.dataset.id as HeroId);render();return;}
 if(action==='sample-base-close'){closeBase();return;}
 if(action==='sample-base-tab'||action==='ui-production-tab'){baseTab=b.dataset.tab as BaseTab;render();return;}
 if(action==='sample-progress'){progressOpen=true;input.reset();render();return;}
 if(action==='sample-progress-close'){progressOpen=false;render();return;}
 if(action==='ui-menu'){openBase();return;}
 if(action==='sample-offer-close'||action==='ui-back'){offerId='';nav.reset();render();return;}
 if(action==='ui-offer'){offerId=b.dataset.id!;input.reset();render();return;}
 if(action==='reward'){const ok=world.choose(b.dataset.id!);events.push({action:'reward',ok,at:world.time});if(ok)offerId='';render();return;}
 if(action==='development-direction'){world.setDevelopmentDirection(b.dataset.line as ProductionLineId);render();return;}
 if(action==='reroll'){world.reroll();render();return;}
 if(action==='skip'){world.skipReward();input.reset();stepper.reset();render();return;}
 if(action==='production-output'){const line=b.dataset.line as ProductionLineId,f=b.dataset.family as FamilyId,p=world.expedition.production[line]!;world.setProductionOutputs(line,p.outputs.includes(f)?p.outputs.filter(k=>k!==f):[...p.outputs,f]);render();return;}
 if(action==='production-enable'){const f=b.dataset.family as FamilyId,p=Object.values(world.expedition.production).find(p=>p?.outputs.includes(f))!;world.setProductionEnabled(f,!p.enabled[f]);render();return;}
 if(action==='production-line-enable'){const p=world.expedition.production[b.dataset.line as ProductionLineId]!,next=!p.outputs.some(f=>p.enabled[f]);for(const f of p.outputs)world.setProductionEnabled(f,next);render();return;}
});
root.addEventListener('change',e=>{const el=e.target as HTMLSelectElement;if(el.dataset.sampleSetting==='development-target'||el.dataset.setting==='development-target'){world.setDevelopmentTarget(el.value||null);render();}});
$('unit-inspector').addEventListener('toggle',e=>{const d=e.target as HTMLDetailsElement;if(d.dataset.ability){if(d.open)expanded.add(d.dataset.ability);else expanded.delete(d.dataset.ability);}},true);
root.addEventListener('keydown',e=>{if((e.shiftKey&&e.key==='F10'||e.key==='ContextMenu')&&(e.target as HTMLElement).dataset.slot){e.preventDefault();const slot=commandSlots(world).find(s=>s.key===(e.target as HTMLElement).dataset.slot);if(slot)inspect(slot);}const capture=battleInputCapture();if(capture)trapTab(e,capture);});
$('sample-scene').addEventListener('change',e=>chooseScene((e.target as HTMLSelectElement).value as Scene));$('sample-reset').addEventListener('click',()=>chooseScene(scene));
const stepper=new FixedStepper(1/60,()=>{if(!ready||world.phase!=='battle'||world.paused)return false;world.stageElapsed=0;world.rewardDrops=[];input.poll();world.step();return true;},()=>performance.now(),8);
function frame(now:number){requestAnimationFrame(frame);const dt=Math.min(.05,(now-previous)/1000);previous=now;const alpha=ready&&!world.paused?stepper.advance(dt):0;view.render(dt,alpha);if(now-lastUi>100){lastUi=now;render();}}
async function load(){
 await view.fx.load();await view.nonHeroEffects.load();await view.confirmedHeroes.prepare();
 for(const f of [...families,'roach','zergling']as const)if(!await view.ensureUnitVariant(f,f))throw Error(view.modelErrors.join(';'));
 if(!await view.ensureUnitVariant('hellion.hellbat','hellion'))throw Error(view.modelErrors.join(';'));
 for(const id of heroes)if(!await view.ensureUnitVariant(HEROES[id].model,HEROES[id].baseFamily))throw Error(view.modelErrors.join(';'));
 await view.prepareRescueAssets('terran');
 const texture=await new THREE.TextureLoader().loadAsync(assetUrl('terrain.rock')!),normal=await new THREE.TextureLoader().loadAsync(assetUrl('terrain.rock.normal')!);texture.colorSpace=THREE.SRGBColorSpace;for(const t of [texture,normal]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(28,28);t.anisotropy=4;}
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(160,160),new THREE.MeshStandardMaterial({map:texture,normalMap:normal,normalScale:new THREE.Vector2(.45,.45),color:0x829199,roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.025;view.scene.add(floor);
 if(view.fx.errors.length||view.modelErrors.length)throw Error([...view.fx.errors,...view.modelErrors].join(';'));
 ready=true;chooseScene('battle');await view.warmPresentationBatches();$('sample-loading').hidden=true;document.body.dataset.battleActionsReady='true';previous=performance.now();
}
requestAnimationFrame(frame);
(window as any).__BATTLE_UI_SAMPLE_REPORT__=()=>({ready,scene,phase:world.phase,rewardRound:world.rewardRound,paused:world.paused,time:world.time,anchor:{...world.anchor},slots:commandSlots(world).map(s=>({key:s.key,name:s.name,action:s.action,count:s.count,remaining:s.remaining})),events:[...events],heroCasts:world.heroCasts.map(c=>({hero:c.hero,phase:c.phase})),heroes:[...world.heroes].map(([id,h])=>({id,skillReady:h.skillReady})),families:world.familyUnits('hellion').map(u=>({mode:u.nativeMode,desired:u.desiredNativeMode})),stim:world.familyBodies('marine').map(u=>u.stimUntil),wallet:{...world.wallet},research:{...world.expedition.tech},cardTotals:{...world.expedition.cardTotals},production:world.expedition.production,facilities:world.expedition.facilities,ledger:world.expedition.ledger.map(j=>({id:j.id,family:j.family,state:j.state,passengers:j.passengers.map(p=>({status:p.status,paid:p.paid}))})),rewards:world.rewards.map(r=>({id:r.offerId,name:r.name,effect:(r as ExpeditionReward).expeditionEffect,sold:r.sold,minerals:r.minerals,gas:r.gas,legal:world.canChooseReward(r)})),developmentTarget:world.expedition.developmentTarget,ui:{baseOpen,baseTab,armyFolded,commandsFolded,inspectorKey,inspectorTab,service},errors:[...view.modelErrors,...view.fx.errors],renderer:view.report()});
(window as any).__BATTLE_UI_SAMPLE_ARCHIVE__=()=>({run:world.captureRun(),profile:world.permanentProfile.exportJSON()});
await load();
}
boot().catch(e=>{$('sample-loading').textContent='载入失败：'+e.message;console.error(e);});
