import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/presentation/world-labels.css';
import './sample.css';
import './hud-layout.css';
import * as THREE from 'three';
import {World} from '../../src/simulation/world';
import {BattleRenderer} from '../../src/render/scene/battle-renderer';
import {FixedStepper} from '../../src/simulation/fixed-stepper';
import {HEROES,type HeroId} from '../../src/data/heroes';
import {SC2_UNITS} from '../../src/data/sc2-units';
import {RARITIES} from '../../src/data/rewards';
import type {FamilyId} from '../../src/data/races';
import {PRODUCTION_LINES,lineResearch,type ProductionLineId} from '../../src/data/expedition-buildings';
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
import {Minimap} from '../../src/ui/hud/minimap';
import {renderProductionWindow,renderRepairs} from '../../src/ui/hud/expedition-panel';
import {renderIntermission,IntermissionNavigation,offerView,restCards} from '../../src/ui/presentation/intermission';
import {referenceCard,referenceCardDetail} from '../../src/ui/presentation/reference-card';
import {image,button,glyph,money,modal,esc} from '../../src/ui/presentation/reference-primitives';
import {supplyEligibility} from '../../src/simulation/progression/supply-cards';
import {EXPEDITION_CARD_DEFINITIONS,type ExpeditionReward} from '../../src/simulation/progression/expedition-drafts';
import {commandSlots,familyAction,type CommandSlot} from './console-model';
import {lineTechnology} from './technology-model';
import {liveSeats} from './roster-model';
import {EnhancementJournal} from './enhancement-model';
import {minimapSource} from './minimap-model';

type Scene='battle'|'building'|'supply'|'full'|'no-heroes'|'roster-full';
type BaseTab='facilities'|'production'|'technology';
const $=(id:string)=>document.getElementById(id)!;
const families:FamilyId[]=['medivac','marine','hellion','tank','marauder'];
const heroes:HeroId[]=['raynor','tychus','nova'];
const globals:BattleActionId[]=['dash','detection','airlift','tactical','strategic'];
const selected=new Set<string>(JSON.parse($('demo-assets').textContent!));
for(const id of ASSETS.keys())if(!selected.has(id))ASSETS.delete(id);
async function boot(){
 await loadEmbeddedAssets();
 await prepareEmbeddedAssetIds(selected,(done,total)=>{$('sample-loading').textContent='准备战场 '+done+' / '+total;});
const world=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10812});
const canvas=$('battle') as HTMLCanvasElement,view=new BattleRenderer(canvas,world),root=$('interface');
view.fx.heroQuality='full';view.cameraShake=false;bindBattleView(world,()=>captureBattleView(canvas,view.camera));
let ready=false,scene:Scene='battle',baseTab:BaseTab='facilities',baseOpen=false,baseWasPaused=false,armyFolded=false;
let inspectorKey='',inspectorTab:InspectorTab='stats',inspectorHTML='',offerId='',progressOpen=false,progressWasPaused=false,service:'repair'|'revive'|null=null,previous=performance.now(),lastUi=0,structure='';
let progressTab:'summary'|'sources'='summary',researchOpen=false,researchWasPaused=false,rosterPage=0,unitStructure='',mapCollapsed=false;
const journal=new EnhancementJournal();
const nav=new IntermissionNavigation(),expanded=new Set<string>(),events:{action:string;ok:boolean;at:number}[]=[];
root.innerHTML=`<header id="topbar" class="battle-top"><span class="battle-location">据点防线</span><div id="sample-wallet" class="battle-resources"></div><div class="battle-stage"><b id="sample-stage"></b><strong id="sample-clock"></strong></div><button class="sample-base-button" data-sample="progress" aria-label="强化一览">${image('tech.attack')}<span>强化</span></button><button class="sample-base-button" data-sample="base" aria-label="基地 · 设施调整">${image('building.barracks')}<span>基地</span></button><button class="icon-button" data-sample="pause" aria-label="暂停">${glyph('pause')}</button></header>
<div id="notice" role="status"></div><section id="battle-console"><div class="console-body">
<div class="sample-commands"><div id="sample-command-list" class="sample-command-list"></div></div>
<div class="sample-army"><button class="sample-fold" id="army-toggle" data-sample="fold-army" aria-label="收起为一排" aria-controls="army-info" aria-expanded="true"></button><div id="army-info"><div id="sample-unit-roster" role="group" aria-label="全队单位信息"></div></div><nav id="sample-roster-pages" aria-label="部队分页"></nav></div>
</div></section><div id="joystick" aria-label="移动摇杆"><i></i></div><section id="overlay" data-captures-battle-input hidden></section><div id="unit-inspector" data-captures-battle-input hidden></div>`;
const controls=new ControlSettings();controls.set('desktop','keyboard');
const minimap=new Minimap(minimapSource(world),view,root,controls);
minimap.element.querySelector('#map-toggle')!.addEventListener('click',()=>{mapCollapsed=!mapCollapsed;render();});
const input=new Input(world,$('joystick'),()=>closeTopOrPause(),controls,{canvas,pick:(x,y)=>view.pick(x,y),pickMove:(x,y)=>view.pickMove(x,y),previewTarget:p=>{view.targetPreview=p;}});
new ResizeObserver(()=>{view.resize();const portrait=canvas.clientWidth<canvas.clientHeight;view.camera.zoom=portrait?Math.min(1.18,(view.camera.right-view.camera.left)/20):1.3;view.camera.updateProjectionMatrix();}).observe(canvas);
const mobileQuery=matchMedia('(pointer:coarse)'),smallQuery=matchMedia('(max-width:700px)');
function updateLayout(){document.body.classList.toggle('mobile-layout',mobileQuery.matches||smallQuery.matches);if(ready)render();}
mobileQuery.addEventListener('change',updateLayout);smallQuery.addEventListener('change',updateLayout);updateLayout();

/** Diagnostic setup only. All subsequent skills, purchases and production use World. */
function chooseScene(next:Scene){
 input.reset();minimap.resetInput();view.resetRun();world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];
 scene=next;world.stage=3;world.stageElapsed=0;world.wallet={minerals:10000,gas:1000};world.expedition.familySlots=[...families];
 world.expedition.facilities=[{id:1,kind:'barracks',line:'barracks',techLab:false},{id:2,kind:'factory',line:'factory',techLab:false},{id:3,kind:'starport',line:'starport',techLab:false}];world.expedition.nextFacility=4;
 for(const family of families)world.expedition.tech['unlock.'+family]=1;
 Object.assign(world.expedition.tech,{barracks:1,factory:1,starport:1,stim:1,'system.barracks':1,'system.factory':1,'system.starport':1,'research.barracks.weapon':2,'research.barracks.defense':1,'research.factory.weapon':1,'research.factory.defense':1});
 world.upgrades.set('stim',1);journal.reset();
 for(const [id,plan]of Object.entries(world.expedition.production)){if(!plan)continue;plan.enabled={};plan.outputs=id==='barracks'?['marine','marauder']:id==='factory'?['hellion','tank']:['medivac'];}
 families.forEach((family,i)=>{for(let j=0;j<(family==='marine'?2:1);j++)world.addFamilyMember(family,{x:-2+(i%3)*1.5,z:-2.5+Math.floor(i/3)*3+j},j+1);});
 if(next!=='no-heroes')for(const [i,id]of heroes.entries()){if(!world.acquireHero(id))throw Error('Cannot prepare '+id);const u=world.heroEntity(id)!;u.x=-2+i*2;u.z=1.5;u.prev={x:u.x,z:u.z};}
 // Populate the example with actual paid native purchases, rather than invented source cards.
 world.stage=1;world.endStage();world.skipReward();
 for(let round=0;round<30&&journal.snapshot().length<4;round++){
  for(const r of [...world.rewards]as ExpeditionReward[]){if(journal.snapshot().length>=4)break;const e=r.expeditionEffect;if((e.kind==='card'&&e.effect!=='cultivation'||e.kind==='teamCard')&&world.canChooseReward(r))purchase(r.offerId);}
  if(journal.snapshot().length<4&&!world.reroll())break;
 }
 if(journal.snapshot().length!==4||!world.skipReward())throw Error('Cannot prepare genuine purchased-card examples');
 world.stage=3;world.stageElapsed=0;
 if(next==='roster-full')for(const f of families)while(world.familySeatCount(f)<world.rosterCap)world.addFamilyMember(f,{x:-3,z:world.familySeatCount(f)},1);
 for(let i=0;i<8;i++){const e=world.addUnit(i%3===0?'zergling':'roach','zerg',4+(i%4)*1.2,-2+Math.floor(i/4)*3,1,'regular',3);e.hp=e.maxHp=200000;e.moveSpeed=0;e.stoppedUntil=e.specialReady=1e9;}
 world.hash.rebuild(world.entities.values());baseOpen=false;progressOpen=false;researchOpen=false;progressTab='summary';rosterPage=0;unitStructure='';service=null;inspectorKey='';offerId='';inspectorHTML='';baseTab='facilities';nav.reset();structure='';events.length=0;armyFolded=false;stepper.reset();
 if(next==='building'){world.endStage();world.setDevelopmentDirection('barracks');}
 else if(next==='supply'||next==='full'){
  world.endStage();world.skipReward();
  let found=false;for(let i=0;i<300;i++){if(world.rewards.some(r=>{const e=(r as ExpeditionReward).expeditionEffect;return e.kind==='supply'&&e.family==='marine'&&e.mode==='pod';})){found=true;break;}if(!world.reroll())break;}
  if(!found)throw Error('Cannot prepare a genuine supply quote');
  if(next==='full')while(world.familySeatCount('marine')<world.rosterCap){const u=world.addFamilyMember('marine',{x:-3,z:world.familySeatCount('marine')},1);u.stoppedUntil=1e9;}
 }
 world.paused=false;document.body.dataset.battleActionsReady=String(ready);($('sample-scene')as HTMLSelectElement).value=next;render();world.changed();
}
function allSeats():UnitSeat[]{return liveSeats(world);}
function purchase(id:string){const r=world.rewards.find(r=>r.offerId===id)as ExpeditionReward|undefined,ok=world.choose(id);if(ok&&r)journal.record(r);return ok;}
function inspectSeat(key:string){if(!allSeats().some(s=>s.key===key))return;inspectorKey=key;inspectorTab='stats';expanded.clear();input.reset();render();$('unit-inspector').querySelector<HTMLElement>('[data-inspect-close]')?.focus({preventScroll:true});}
function inspect(slot:CommandSlot){
 if(!slot.family&&!slot.hero)return;
 inspectSeat(slot.hero?slot.key:allSeats().find(s=>s.family===slot.family)?.key??'');
}
function cast(slot:CommandSlot){
 if(!ready||battleInputCapture())return;if(!slot.action){inspect(slot);return;}
 const ok=activateBattleAction(world,slot.action);events.push({action:slot.action,ok,at:world.time});render();
}
function arrow(collapsed:boolean){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${collapsed?'M5 15l7-7 7 7':'M5 9l7 7 7-7'}"/></svg>`;}
function updateArmyFold(){const b=$('army-toggle'),html=arrow(armyFolded)+'<span>部队</span>';if(b.innerHTML!==html)b.innerHTML=html;b.setAttribute('aria-expanded',String(!armyFolded));b.setAttribute('aria-label',armyFolded?(document.body.classList.contains('mobile-layout')?'展开部队':'展开为两排'):'收起为一排');b.title=b.getAttribute('aria-label')!;b.parentElement!.classList.toggle('single-row',armyFolded);}
function skillLabel(slot:CommandSlot){if(slot.hero)return HEROES[slot.hero].skill;if(!slot.action)return '';const state=battleActionState(world,slot.action);return slot.action==='stim'?'兴奋剂':state.name.split(' · ').at(-1)!;}
function slotHTML(s:CommandSlot){return `<button class="sample-slot ${s.hero?'hero':'family-info'}" data-slot="${s.key}">${image(s.image,s.name)}<span class="slot-copy"><span class="slot-name">${s.name}</span><span class="slot-ability"></span></span><span class="slot-rank"></span><span class="slot-hp"></span><span class="slot-count"></span><span class="slot-key"></span><span class="slot-health"><i></i></span><span class="slot-cooldown"></span></button>`;}
function compactHp(value:number){return value>=1000?Number((value/1000).toFixed(1))+'k':String(Math.ceil(value));}
function renderUnitRoster(){
 const mobile=document.body.classList.contains('mobile-layout'),seats=allSeats(),columns=mobile?6:Math.max(1,Math.min(14,Math.floor(($('game-root').clientWidth-192)/70))),hasSecondRow=seats.length>columns;
 $('army-toggle').hidden=!hasSecondRow;$('battle-console').classList.toggle('has-roster-overflow',hasSecondRow);if(!hasSecondRow&&armyFolded){armyFolded=false;rosterPage=0;}
 const size=columns*(armyFolded?1:2),pages=Math.max(1,Math.ceil(seats.length/size));rosterPage=Math.max(0,Math.min(pages-1,rosterPage));
 $('sample-unit-roster').style.setProperty('--roster-columns',String(columns));
 const shown=seats.slice(rosterPage*size,rosterPage*size+size),key=shown.map(s=>s.key+'/'+s.image+'/'+!!s.unit).join('|');
 $('sample-unit-roster').style.setProperty('--roster-rows',String(Math.max(1,Math.ceil(shown.length/columns))));
 if(unitStructure!==key){unitStructure=key;$('sample-unit-roster').innerHTML=shown.map(s=>`<button class="sample-seat ${s.hero?'hero':''}" data-seat="${s.key}">${image(s.image,s.name)}<span class="seat-name">${s.name}</span><span class="seat-rank"></span><span class="seat-vitals"></span><span class="seat-health"><i></i></span><span class="seat-shield"><i></i></span></button>`).join('');}
 for(const s of shown){const b=$('sample-unit-roster').querySelector<HTMLElement>(`[data-seat="${s.key}"]`)!,u=s.unit,action=s.family&&familyAction(world,s.family),state=action?battleActionState(world,action):undefined;b.dataset.battleAction=action??'';b.classList.toggle('skill-ready',!!state?.enabled);b.classList.toggle('cooling',!!state&&state.remaining>0);b.querySelector('.seat-rank')!.textContent=u?rankLabel(u.rank):'';b.querySelector('.seat-vitals')!.textContent=u?compactHp(u.hp)+'/'+compactHp(u.maxHp):'阵亡';b.setAttribute('aria-label',s.name+(u?' · 军衔 '+rankLabel(u.rank)+' · 生命 '+Math.ceil(u.hp)+' / '+Math.ceil(u.maxHp):' · 阵亡')+(action?' · '+state!.name+(state!.reason?' · '+state!.reason:'')+' · 点击施放':''));b.title=b.getAttribute('aria-label')!+' · 右键或长按详情';(b.querySelector('.seat-health i')as HTMLElement).style.width=(u?Math.max(0,u.hp)/u.maxHp*100:0)+'%';const shield=b.querySelector<HTMLElement>('.seat-shield')!;shield.hidden=!u?.maxShield;shield.firstElementChild!.setAttribute('style','width:'+(u?.maxShield?Math.max(0,u.shield??0)/u.maxShield*100:0)+'%');}
 $('sample-roster-pages').hidden=pages===1;$('sample-roster-pages').setAttribute('aria-label',`部队第 ${rosterPage+1} 页，共 ${pages} 页`);put('sample-roster-pages',mobile?`<span class="roster-dots" aria-hidden="true">${Array.from({length:pages},(_,i)=>`<i class="${i===rosterPage?'current':''}"></i>`).join('')}</span>`:`<button data-roster-page="-1" aria-label="上一页部队" ${rosterPage===0?'disabled':''}>${glyph('back')}</button><span>${rosterPage+1} / ${pages}</span><button data-roster-page="1" aria-label="下一页部队" ${rosterPage===pages-1?'disabled':''}>${glyph('next')}</button>`);
}
function renderConsole(){
 const heroes=commandSlots(world).filter(s=>s.hero);
 const commands=globals.map(id=>({id,state:battleActionState(world,id)})).filter(s=>s.state.visible);
 const globalKey=heroes.map(s=>s.key+'/'+s.image).join('|')+'::'+commands.map(c=>c.id).join('|'),list=$('sample-command-list');
 if(list.dataset.structure!==globalKey){list.dataset.structure=globalKey;list.innerHTML=heroes.map(slotHTML).join('')+commands.map(({id})=>{const meta=COMMAND_ACTIONS.find(a=>a.id===id)!;return `<button class="sample-command" data-command="${id}">${'icon'in meta?image(meta.icon):glyph(meta.glyph==='scan'?'target':meta.glyph)}<b></b><span class="command-cooldown"></span><kbd>${meta.key}</kbd></button>`;}).join('');}
 for(const s of heroes){const b=root.querySelector<HTMLElement>(`[data-slot="${s.key}"]`)!;b.dataset.battleAction=s.action??'';b.classList.toggle('skill-ready',!!s.action&&s.enabled);b.classList.toggle('cooling',s.remaining>0);b.setAttribute('aria-label',s.name+' · '+skillLabel(s)+(s.reason?' · '+s.reason:'')+' · 点击施放');b.title=b.getAttribute('aria-label')!+' · 右键或长按详情';b.querySelector('.slot-ability')!.textContent=skillLabel(s);b.querySelector('.slot-cooldown')!.textContent=s.remaining>0?String(Math.ceil(s.remaining)):'';b.querySelector('.slot-key')!.textContent=String(Number(s.key.slice(-1))+1);}
 renderUnitRoster();updateArmyFold();root.style.setProperty('--sample-army-height',root.querySelector<HTMLElement>('.sample-army')!.offsetHeight+'px');
 list.setAttribute('aria-label','英雄技能与全局指令');
 for(const {id,state}of commands){const b=list.querySelector<HTMLButtonElement>(`[data-command="${id}"]`)!;b.disabled=!state.enabled;b.classList.toggle('cooling',state.remaining>0);b.querySelector('b')!.textContent=document.body.classList.contains('mobile-layout')&&id==='dash'?'加速':document.body.classList.contains('mobile-layout')&&id==='detection'?'探测':state.name;b.querySelector('.command-cooldown')!.textContent=state.remaining>0?String(Math.ceil(state.remaining)):'';b.title=state.reason;b.setAttribute('aria-label',state.name+(state.reason?' · '+state.reason:''));}
 $('battle-console').hidden=world.phase!=='battle';
}
function progressStrip(){return `<div class="sample-progress-strip" aria-label="研究与商店强化">${button('武器与防护研究','sample-research','small')}${button('强化一览','sample-progress','small')}</div>`;}
function research(line:ProductionLineId,kind:'weapon'|'defense'){const n=world.expedition.tech[lineResearch(line,kind)]??0;return `<div>${image(kind==='weapon'?'tech.attack':'tech.armor')}<span>${kind==='weapon'?'武器':'防护'}</span><span class="research-pips" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=n?'lit':''}"></i>`).join('')}</span><b>${n} / 3</b></div>`;}
function totals(){
 const team=journal.team(),cardTotals=journal.totals(),pct=(v:number)=>Number((v*100).toFixed(1))+'%';
 const extra=journal.snapshot().filter(r=>['support','training'].includes(r.expeditionEffect.kind)),extraRows=[...new Map(extra.map(r=>[r.id,r])).values()].map(r=>{const e=r.expeditionEffect,key=e.kind==='support'?'support.'+e.support:e.kind==='training'?'training.'+e.rank:'';return `<span>${esc(r.name)} <b>已购 ${cardTotals[key]??0} 张</b></span>`;}).join('');
 return `<section class="sample-cumulative"><h3>总体加成</h3><div class="sample-totals"><span>全军伤害 <b>+${pct(team.damage)}</b> · 攻速 <b>+${pct(team.speed)}</b></span><span>全军生命／护盾 <b>+${pct(team.health)}</b> · 护甲 <b>+${Number(team.armor.toFixed(2))}</b></span>${world.expedition.familySlots.flatMap(f=>Object.keys(EXPEDITION_CARD_DEFINITIONS).flatMap(kind=>{const value=cardTotals[kind+'.'+f];return value?[`<span>${SC2_UNITS[f].zh} · ${(EXPEDITION_CARD_DEFINITIONS as any)[kind].name} <b>+${kind==='armor'||kind==='cultivation'?Number(value.toFixed(2)):pct(value)}</b></span>`]:[];})).join('')}${extraRows}</div></section>`;
}
function unlockList(rows:{id:string;name:string;image:string;unlocked:boolean}[]){return `<div class="sample-unlocks">${rows.map(r=>`<div class="sample-unlock ${r.unlocked?'unlocked':'locked'}" data-tech="${r.id}" data-unlocked="${r.unlocked}">${image(r.image,r.name)}<span>${r.name}</span><b>${r.unlocked?'已解锁':'未解锁'}</b></div>`).join('')}</div>`;}
function facilities(){
 return `<div class="sample-facility-list">${(['barracks','factory','starport']as const).map(line=>{const count=world.expedition.facilities.filter(f=>f.line===line).length,p=world.expedition.production[line];return `<section class="sample-facility-card" data-line="${line}"><header>${image('building.'+line)}<h2>${PRODUCTION_LINES[line].name}</h2><strong class="sample-facility-count"><b>${count}</b> 座</strong></header>${unlockList(lineTechnology(world,line).families)}<p class="sample-output">当前训练：${p?.outputs.map(f=>SC2_UNITS[f].zh).join(' / ')||'未选择'}</p></section>`;}).join('')}</div>`;
}
function technology(){return `<div class="sample-facility-list">${(['barracks','factory','starport']as const).map(line=>{const t=lineTechnology(world,line);return `<section class="sample-tech-card" data-line="${line}"><header>${image('building.'+line)}<h2>${PRODUCTION_LINES[line].name}</h2><span class="sample-system ${t.system.unlocked?'unlocked':'locked'}" data-tech="${t.system.id}" data-unlocked="${t.system.unlocked}">攻防系统 · ${t.system.unlocked?'已解锁':'未解锁'}</span></header><div class="sample-research">${research(line,'weapon')}${research(line,'defense')}</div><h3>兵种</h3>${unlockList(t.families)}<h3>技能科技</h3>${unlockList(t.skills)}</section>`;}).join('')}</div>`;}
function researchOverview(){return `<section class="sample-research-summary">${(['barracks','factory','starport']as const).map(line=>`<div class="sample-research-line"><h4>${PRODUCTION_LINES[line].name}</h4><div class="sample-research">${research(line,'weapon')}${research(line,'defense')}</div></div>`).join('')}</section>`;}
function purchasedCards(){const cards=journal.snapshot();return `<section class="sample-purchased-cards"><h3>已购买强化卡牌 <span>${cards.length} 张</span></h3><div class="sample-source-list">${cards.map(r=>`<article class="sample-source-card" data-purchase-id="${esc(r.offerId)}" style="--source-color:${RARITIES[r.rarity].color}">${image(r.icon,r.name)}<div><header><h4>${esc(r.name)}</h4><span>${RARITIES[r.rarity].name}</span></header><p>${esc(r.description)}</p><div class="source-paid">${money(r.purchaseReceipt!.minerals,r.purchaseReceipt!.gas)}</div></div></article>`).join('')||'<p>暂无购买记录</p>'}</div></section>`;}
function reinforcements(){return `<nav class="settings-tabs" aria-label="商店强化内容">${(['summary','sources']as const).map(t=>button(t==='summary'?'总体加成':'已购卡牌','sample-progress-tab','',`data-tab="${t}" aria-pressed="${progressTab===t}"`)).join('')}</nav>`+(progressTab==='summary'?totals():purchasedCards());}
function renderBase(){
 const tabs=`<nav class="settings-tabs" role="group" aria-label="基地类别">${(['facilities','production','technology']as const).map(t=>button(({facilities:'设施',production:'训练',technology:'当前科技'})[t],'sample-base-tab','',`data-tab="${t}" aria-pressed="${baseTab===t}"`)).join('')}</nav>`;
 if(baseTab!=='production')return modal('设施调整','',tabs+(baseTab==='facilities'?facilities():technology()),'production-modal sample-base-modal',button('返回','sample-base-close','primary'),'sample-base-close');
 return renderProductionWindow(world,'production','sample-base-close').replace(/<nav class="settings-tabs"[\s\S]*?<\/nav>/,tabs).replace('持续生产','设施调整').replace('production-modal','production-modal sample-base-modal');
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
 let overlay=researchOpen?modal('武器与防护研究','',researchOverview(),'production-modal sample-research-modal',button('返回','sample-research-close','primary'),'sample-research-close'):progressOpen?modal('强化一览','',reinforcements(),'production-modal sample-progress-modal',button('返回','sample-progress-close','primary'),'sample-progress-close'):baseOpen?renderBase():world.phase==='reward'?renderReward():'';
 if(service)overlay+=modal(service==='repair'?'修复部队':'英雄复活','',service==='repair'?renderRepairs(world):'<div class="im-choice-grid">'+restCards(world).slice(1).map((c,i)=>referenceCard({...c,detailAction:'ui-rest-revivals',detailAttrs:''},i)).join('')+'</div>','production-modal',button('返回','sample-service-close','primary'),'sample-service-close');
 $('overlay').hidden=!overlay;put('overlay',overlay);
 const seats=allSeats(),seat=seats.find(s=>s.key===inspectorKey);$('unit-inspector').hidden=!seat;
 if(seat){const html=renderUnitInspector(world,seat,seats,inspectorTab,expanded);if(inspectorHTML!==html){inspectorHTML=html;updateLiveInspector($('unit-inspector'),html);}}else if(inspectorHTML){inspectorHTML='';$('unit-inspector').innerHTML='';}
 const captures=!!overlay||!!seat;$('topbar').inert=captures;$('battle-console').inert=captures;$('joystick').hidden=captures;
 minimap.element.inert=captures;minimap.update(world.phase==='battle',mapCollapsed);
}
function openBase(){if(baseOpen)return;if(progressOpen)closeProgress();if(researchOpen)closeResearch();baseOpen=true;baseTab='facilities';baseWasPaused=world.paused;if(world.phase==='battle')world.paused=true;input.reset();stepper.reset();render();root.querySelector<HTMLElement>('.production-modal [data-autofocus],.production-modal .modal-header button')?.focus();}
function closeBase(){baseOpen=false;if(world.phase==='battle')world.paused=baseWasPaused;input.reset();stepper.reset();render();root.querySelector<HTMLElement>(world.phase==='reward'?'[data-action=sample-base]':'[data-sample=base]')?.focus();}
function openProgress(){if(progressOpen)return;if(baseOpen)closeBase();if(researchOpen)closeResearch();progressOpen=true;progressTab='summary';progressWasPaused=world.paused;if(world.phase==='battle')world.paused=true;input.reset();stepper.reset();render();root.querySelector<HTMLElement>('.sample-progress-modal .modal-header button')?.focus();}
function closeProgress(){progressOpen=false;if(world.phase==='battle')world.paused=progressWasPaused;input.reset();stepper.reset();render();root.querySelector<HTMLElement>(world.phase==='reward'?'[data-action=sample-progress]':'[data-sample=progress]')?.focus();}
function openResearch(){if(researchOpen)return;if(baseOpen)closeBase();if(progressOpen)closeProgress();researchOpen=true;researchWasPaused=world.paused;if(world.phase==='battle')world.paused=true;input.reset();stepper.reset();render();root.querySelector<HTMLElement>('.sample-research-modal .modal-header button')?.focus();}
function closeResearch(){researchOpen=false;if(world.phase==='battle')world.paused=researchWasPaused;input.reset();stepper.reset();render();root.querySelector<HTMLElement>('[data-action=sample-research]')?.focus();}
function closeTopOrPause(){if(inspectorKey){inspectorKey='';render();return;}if(service){service=null;render();return;}if(researchOpen){closeResearch();return;}if(progressOpen){closeProgress();return;}if(offerId){offerId='';render();return;}if(baseOpen){closeBase();return;}if(world.phase==='battle'){world.paused=!world.paused;input.reset();stepper.reset();render();}}
let press:{id:number;key:string;kind:'slot'|'seat';x:number;y:number;timer:number}|null=null,rosterSwipe:{id:number;x:number;y:number}|null=null,suppressUntil=0;
let uiTap:{id:number;button:HTMLButtonElement;x:number;y:number;at:number;cancelled:boolean}|null=null,lastClick={key:'',at:0},compatClick={key:'',until:0};
const buttonKey=(b:HTMLButtonElement)=>b.id||JSON.stringify({...b.dataset});
const clearPress=()=>{if(press)clearTimeout(press.timer);press=null;};
root.addEventListener('pointerdown',e=>{
 if(e.pointerType==='touch'&&e.button===0){const button=(e.target as HTMLElement).closest<HTMLButtonElement>('button');compatClick={key:'',until:0};if(button&&!button.disabled)uiTap={id:e.pointerId,button,x:e.clientX,y:e.clientY,at:performance.now(),cancelled:false};}
 const b=(e.target as HTMLElement).closest<HTMLElement>('[data-slot],[data-seat]');if(!b||e.button!==0||e.pointerType==='mouse')return;
 if(b.dataset.seat&&document.body.classList.contains('mobile-layout'))rosterSwipe={id:e.pointerId,x:e.clientX,y:e.clientY};
 clearPress();press={id:e.pointerId,key:b.dataset.slot??b.dataset.seat!,kind:b.dataset.seat?'seat':'slot',x:e.clientX,y:e.clientY,timer:window.setTimeout(()=>{if(press?.kind==='seat'){suppressUntil=performance.now()+900;inspectSeat(press.key);}else{const slot=commandSlots(world).find(s=>s.key===press?.key);if(slot){suppressUntil=performance.now()+900;inspect(slot);}}clearPress();},480)};
});
root.addEventListener('pointermove',e=>{if(uiTap?.id===e.pointerId&&Math.hypot(e.clientX-uiTap.x,e.clientY-uiTap.y)>10)uiTap.cancelled=true;if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>10)clearPress();});
for(const name of ['pointerup','pointercancel','lostpointercapture'])root.addEventListener(name,e=>{const p=e as PointerEvent,tap=uiTap?.id===p.pointerId?uiTap:null;if(name==='pointerup'&&rosterSwipe?.id===p.pointerId){const dx=p.clientX-rosterSwipe.x,dy=p.clientY-rosterSwipe.y;if(Math.abs(dx)>36&&Math.abs(dx)>Math.abs(dy)*1.2){if(tap)tap.cancelled=true;suppressUntil=performance.now()+500;rosterPage+=dx<0?1:-1;unitStructure='';requestAnimationFrame(()=>render());}}
 if(name==='pointerup'&&tap&&!tap.cancelled&&performance.now()-tap.at<450){const b=tap.button,key=buttonKey(b),up=performance.now();requestAnimationFrame(()=>{if(!b.isConnected||b.disabled||b.closest('[inert]')||lastClick.key===key&&lastClick.at>=up||(b.dataset.slot||b.dataset.seat)&&performance.now()<suppressUntil)return;compatClick={key,until:performance.now()+500};b.click();});}
 uiTap=null;rosterSwipe=null;clearPress();});
root.addEventListener('contextmenu',e=>{const b=(e.target as HTMLElement).closest<HTMLElement>('[data-slot],[data-seat]');if(!b)return;e.preventDefault();suppressUntil=performance.now()+300;if(b.dataset.seat){inspectSeat(b.dataset.seat);return;}const slot=commandSlots(world).find(s=>s.key===b.dataset.slot);if(slot)inspect(slot);});
root.addEventListener('click',e=>{
 const b=(e.target as HTMLElement).closest<HTMLButtonElement>('button');if(!b||b.disabled)return;
 const key=buttonKey(b);if(e.isTrusted&&(e as PointerEvent).pointerType==='touch'&&compatClick.key===key&&performance.now()<compatClick.until){e.preventDefault();return;}lastClick={key,at:performance.now()};
 if(b.dataset.seat){if(performance.now()<suppressUntil){e.preventDefault();return;}const seat=allSeats().find(s=>s.key===b.dataset.seat),action=seat?.family&&familyAction(world,seat.family);if(action&&!battleInputCapture()){const ok=activateBattleAction(world,action);events.push({action,ok,at:world.time});render();}else inspectSeat(b.dataset.seat);return;}
 if(b.dataset.rosterPage){rosterPage+=Number(b.dataset.rosterPage);unitStructure='';render();return;}
 if(b.dataset.slot){if(performance.now()<suppressUntil){e.preventDefault();return;}const slot=commandSlots(world).find(s=>s.key===b.dataset.slot);if(slot)cast(slot);return;}
 if(b.dataset.command){if(!battleInputCapture()){const ok=activateBattleAction(world,b.dataset.command as BattleActionId);events.push({action:b.dataset.command,ok,at:world.time});render();}return;}
 if(b.dataset.sample==='base'||b.dataset.action==='sample-base'){openBase();return;}
 if(b.dataset.sample==='progress'){openProgress();return;}
 if(b.dataset.sample==='pause'){closeTopOrPause();return;}
 if(b.dataset.sample==='fold-army'){armyFolded=!armyFolded;rosterPage=0;unitStructure='';render();return;}
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
 if(action==='sample-progress'){openProgress();return;}
 if(action==='sample-progress-tab'){progressTab=b.dataset.tab as typeof progressTab;render();return;}
 if(action==='sample-progress-close'){closeProgress();return;}
 if(action==='sample-research'){openResearch();return;}
 if(action==='sample-research-close'){closeResearch();return;}
 if(action==='ui-menu'){openBase();return;}
 if(action==='sample-offer-close'||action==='ui-back'){offerId='';nav.reset();render();return;}
 if(action==='ui-offer'){offerId=b.dataset.id!;input.reset();render();return;}
 if(action==='reward'){const ok=purchase(b.dataset.id!);events.push({action:'reward',ok,at:world.time});if(ok)offerId='';render();return;}
 if(action==='development-direction'){world.setDevelopmentDirection(b.dataset.line as ProductionLineId);render();return;}
 if(action==='reroll'){world.reroll();render();return;}
 if(action==='skip'){world.skipReward();input.reset();stepper.reset();render();return;}
 if(action==='production-output'){const line=b.dataset.line as ProductionLineId,f=b.dataset.family as FamilyId,p=world.expedition.production[line]!;world.setProductionOutputs(line,p.outputs.includes(f)?p.outputs.filter(k=>k!==f):[...p.outputs,f]);render();return;}
 if(action==='production-enable'){const f=b.dataset.family as FamilyId,p=Object.values(world.expedition.production).find(p=>p?.outputs.includes(f))!;world.setProductionEnabled(f,!p.enabled[f]);render();return;}
 if(action==='production-line-enable'){const p=world.expedition.production[b.dataset.line as ProductionLineId]!,next=!p.outputs.some(f=>p.enabled[f]);for(const f of p.outputs)world.setProductionEnabled(f,next);render();return;}
});
$('unit-inspector').addEventListener('toggle',e=>{const d=e.target as HTMLDetailsElement;if(d.dataset.ability){if(d.open)expanded.add(d.dataset.ability);else expanded.delete(d.dataset.ability);}},true);
root.addEventListener('keydown',e=>{const d=(e.target as HTMLElement).dataset;if((e.shiftKey&&e.key==='F10'||e.key==='ContextMenu')&&(d.slot||d.seat)){e.preventDefault();if(d.seat)inspectSeat(d.seat);else{const slot=commandSlots(world).find(s=>s.key===d.slot);if(slot)inspect(slot);}}const capture=battleInputCapture();if(capture)trapTab(e,capture);});
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
(window as any).__BATTLE_UI_SAMPLE_REPORT__=()=>({ready,scene,phase:world.phase,rewardRound:world.rewardRound,paused:world.paused,time:world.time,anchor:{...world.anchor},slots:commandSlots(world).map(s=>({key:s.key,name:s.name,families:s.families,action:s.action,count:s.count,remaining:s.remaining})),seats:allSeats().map(s=>({key:s.key,name:s.name,family:s.family,hero:s.hero,rank:s.unit?.rank,hp:s.unit?.hp,maxHp:s.unit?.maxHp})),purchases:journal.snapshot(),shopTotals:journal.totals(),shopTeam:journal.team(),events:[...events],heroCasts:world.heroCasts.map(c=>({hero:c.hero,phase:c.phase})),heroes:[...world.heroes].map(([id,h])=>({id,skillReady:h.skillReady})),families:world.familyUnits('hellion').map(u=>({mode:u.nativeMode,desired:u.desiredNativeMode})),stim:world.familyBodies('marine').map(u=>u.stimUntil),stimMarauder:world.familyBodies('marauder').map(u=>u.stimUntil),wallet:{...world.wallet},research:{...world.expedition.tech},cardTotals:{...world.expedition.cardTotals},production:world.expedition.production,facilities:world.expedition.facilities,ledger:world.expedition.ledger.map(j=>({id:j.id,family:j.family,state:j.state,passengers:j.passengers.map(p=>({status:p.status,paid:p.paid}))})),rewards:world.rewards.map(r=>({id:r.offerId,name:r.name,effect:(r as ExpeditionReward).expeditionEffect,sold:r.sold,minerals:r.minerals,gas:r.gas,legal:world.canChooseReward(r)})),developmentTarget:world.expedition.developmentTarget,ui:{baseOpen,baseTab,progressOpen,progressTab,researchOpen,rosterPage,mobile:document.body.classList.contains('mobile-layout'),armyFolded,inspectorKey,inspectorTab,service},errors:[...view.modelErrors,...view.fx.errors],viewport:{width:canvas.clientWidth,height:canvas.clientHeight,worldWidth:(view.camera.right-view.camera.left)/view.camera.zoom},renderer:view.report()});
(window as any).__BATTLE_UI_SAMPLE_ARCHIVE__=()=>({run:world.captureRun(),profile:world.permanentProfile.exportJSON()});
await load();
}
boot().catch(e=>{$('sample-loading').textContent='载入失败：'+e.message;console.error(e);});
