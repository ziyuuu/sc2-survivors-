import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/ui/intermission-skin/skin.css';
import '../../src/ui/intermission-skin/card-material.css';
import '../../src/ui/intermission-skin/refinements.css';
import '../../src/ui/intermission-skin/adaptive-layout.css';
import './design.css';
import {configurePlatformAssetUrl,assetUrl} from '../../src/assets/manifest';
import {DEVELOPMENT,PRODUCTION_LINES,HEAVY_FAMILIES,type ProductionLineId} from '../../src/data/expedition-buildings';
import type {Race,FamilyId} from '../../src/data/races';
import {referenceCard,referenceCardDetail,type CardView} from '../../src/ui/presentation/reference-card';
import {button,money,glyph,image,modal,esc} from '../../src/ui/presentation/reference-primitives';
import {paintedArt} from '../../src/ui/presentation/painted-art';
import {names,familyName,type Scene,type FacilityView} from './fixtures';
import {NativeBuildingSandbox,presentation,offerCards,getOffers,purchase,refresh as refreshBuilding,refreshCost,setDirection,placementDraft,applyPlacement,nextPhase,nextWindow,evolutionTargets,hasGround,TREE_STEPS,canUnlock,eligible,project,ownsLine,type Offer} from './connection';
import {renderBuildingPanel,renderBuildingPrerequisite} from '../../src/ui/presentation/building-panel';

const assets=JSON.parse(document.querySelector('#asset-data')!.textContent!),assetBlobs=new Map<string,string>();
configurePlatformAssetUrl(id=>{if(assetBlobs.has(id))return assetBlobs.get(id)!;const data=assets[id];if(!data)return null;const [prefix,encoded]=data.split(',');const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:prefix.slice(5,prefix.indexOf(';'))}));assetBlobs.set(id,url);return url;});
const bar=document.querySelector<HTMLElement>('.review-bar')!;new ResizeObserver(()=>document.documentElement.style.setProperty('--review-height',bar.getBoundingClientRect().height+'px')).observe(bar);
const overlay=document.querySelector<HTMLElement>('#overlay')!,params=new URLSearchParams(location.search);
let race=(params.get('race')??'terran') as Race,scene=(params.get('scene')??'opening') as Scene;
if(!(race in names))race='terran';if(!['opening','developed','prerequisite','poor'].includes(scene))scene='opening';
let runtime=new NativeBuildingSandbox(race,scene),sample=presentation(runtime.state),direction=sample.direction,step:'building'|'shop'|'front'='building',selected='',dialog='',activeCard:CardView|undefined,activeQuote:Offer|undefined,draft:FacilityView[]=[],draftRevision=0,opener:HTMLElement|null=null;
let selectedCard:CardView|undefined;const shopChosen=new Set<string>();
const status=document.querySelector<HTMLElement>('#review-status')!;
const raceControl=document.querySelector<HTMLSelectElement>('#review-race')!,sceneControl=document.querySelector<HTMLSelectElement>('#review-scene')!;
raceControl.value=race;sceneControl.value=scene;
const setStatus=(s:string)=>status.textContent=s;
const btn=(text:string,action:string,extra='')=>button(text,action,'small',extra);
function cardArt(c:CardView){if(c.identity)return paintedArt(c.identity,c.name,1,'mvp1-'+c.id);const i=c.art==='facility'?2:0;return `<div class="imx-object" role="img" aria-label="${esc(c.name)}" style="background-image:url('${assetUrl('ui.intermission.objects-'+race)}');background-position:${i/3*100}% 0%"></div>`;}
function cards(){if(step==='shop')return [projectSupply(),{...projectSupply(),id:'supply-armor',name:'护甲培养',art:'defense',stat:'现有补给流程保持',icon:'tech.armor'},{...projectSupply(),id:'supply-resource',name:'矿物补给',art:'production',identity:undefined,stat:'当前补给卡组样例'}].map(c=>({...c,locked:true,label:'预览',reason:'补给流程展示',sold:false}));if(selectedCard)return [{...selectedCard,sold:true}];return offerCards(runtime.state);}
function projectSupply():CardView{return {id:'supply-unit',race,rarity:'green',name:'部队增援',kicker:'战备补给',flavour:'',stat:'沿用原增援与补给入口',detail:'仅展示原补给结构，原型不执行真实支付、增援和轮换。',identity:PRODUCTION_LINES[sample.basic[0]].families[0],art:'unit',icon:'tech.attack',minerals:100,gas:0,label:'购买',action:'choose',detailAction:'detail'};}
function emptyState(){return renderBuildingPrerequisite(runtime.state,direction,'direction');}

function heading(){return `<header class="im-heading"><div class="im-title">${button(glyph('gear'),'services','im-back','aria-label="整备菜单"')}<div><span class="im-eyebrow">${step==='front'&&sample.stage<18?'第 '+(sample.stage+1)+' 关出征':'第 '+sample.stage+' 关完成'} · ${names[race]}</span><h1>${step==='building'?'基地建设':step==='shop'?'战备补给':'出征预览'}</h1></div></div><div class="im-wallet" aria-label="独立模块资源">${money(sample.wallet.minerals,sample.wallet.gas)}</div></header><nav class="im-steps" aria-label="关间整备">${['基地建设','战备补给','返回前线'].map((s,i)=>`<span ${i===(['building','shop','front'] as const).indexOf(step)?'aria-current="step"':''}><b>0${i+1}</b>${s}</span>`).join('<i></i>')}</nav>`;}
function frontView(){return `<div class="wb-front"><h2>${sample.stage<18?'第 '+(sample.stage+1)+' 关准备就绪':'十八关整备评审完成'}</h2><div class="wb-front-production">${sample.facilities.map(f=>`<p><strong>${f.name}</strong>　${f.enabled?f.outputs.map(familyName).join(' → ')||'未选择输出':'训练暂停'}</p>`).join('')}</div><p>跳过战斗，保留当前解锁和布置，继续体验关间流程。</p><div class="wb-front-actions">${button('返回补给','back-shop','secondary')}${sample.stage<18?button('下一关 · 进入整备','next-stage','primary'):button('重新评审','restart-review','primary')}</div></div>`;}
const facilityTabs=['placement','research','tree'] as const;
function isFacilityTab(value:string){return facilityTabs.includes(value as typeof facilityTabs[number]);}
function layer(){if(!dialog)return '';if(isFacilityTab(dialog)){
 return renderBuildingPanel(runtime.state,dialog as 'placement'|'research'|'tree',{revision:draftRevision,groups:draft.map(f=>({id:f.id,outputs:f.outputs,enabled:f.enabled}))});
}
if(dialog==='detail'&&activeCard){const target=race==='zerg'&&activeCard.id.startsWith('evolve')?`<label class="wb-target-label">目标孵化场<select id="target-hatchery">${evolutionTargets(runtime.state,activeCard.id).map(g=>sample.facilities.find(f=>f.id===g.id)!).map(f=>`<option value="${f.id}">${f.name} · ${f.directions.join(' / ')}</option>`).join('')}</select></label>`:'';return modal(activeCard.name,activeCard.kicker,referenceCardDetail(activeCard)+target,'im-detail-dialog',button('返回','close','secondary')+button(activeCard.locked?'未开放':activeCard.short?'资源不足':activeCard.label?.startsWith('预览')?activeCard.label:'确认选择','confirm','primary',activeCard.locked||activeCard.short?'disabled':''),'close');}
return modal(dialog==='services'?'基地整备':dialog==='rest'?'战地休整':'强化一览','原入口保持',dialog==='services'?btn('设施调整','placement')+btn('休整','rest'):'<p>本轮保留该入口，原休整与强化功能不在此次设计改动范围。</p>','pause-modal',button('返回','close','primary'),'close');}
function draw(focusKey?:{action?:string;facility?:string;family?:string;line?:string;tab?:boolean}){
overlay.dataset.layout=innerWidth<=700?'portrait':'landscape';
overlay.style.setProperty('--imx-background',`url('${assetUrl('ui.intermission.background-'+race)}')`);
sample=presentation(runtime.state);direction=runtime.state.direction;step=runtime.state.phase;
const refreshPrice=refreshCost(runtime.state);
overlay.innerHTML=`<div class="reward-screen formal-intermission"><section class="intermission-screen">${heading()}<nav class="feedback-progress-strip" aria-label="整备服务">${btn('设施调整','placement')}${btn('强化一览','progress')}${btn('休整','rest')}</nav>${step==='building'?`<div class="im-direction" role="group" aria-label="发展方向">${sample.basic.map(id=>`<button data-action="direction" data-line="${id}" aria-pressed="${id===direction}" ${selected?'disabled':''}>${image('unit.'+PRODUCTION_LINES[id].families[0])}<span>${PRODUCTION_LINES[id].name}</span></button>`).join('')}<span class="im-status">选择一项</span></div>`:step==='shop'?'<div class="im-caption"><span>补给已送达</span><span>原购物流程保持</span></div>':''}${step==='front'?frontView():`<div class="im-choice-grid" id="reward-cards">${cards().map((c,i)=>referenceCard(c,i)).join('')||emptyState()}</div><footer class="im-footer reward-actions stage-navigation"><div class="im-refresh">${button(glyph('refresh')+' 刷新','refresh','secondary',step==='shop'||selected||cards().length===0||refreshPrice===null||sample.wallet.minerals<refreshPrice?'disabled':'')}<span class="wb-refresh-cost" role="img" aria-label="刷新消耗${refreshPrice??0}水晶">${money(refreshPrice??0)}</span></div>${button((step==='building'?'前往补给':'返回前线')+' '+glyph('next'),'next','primary')}</footer>`}</section>${layer()}</div>`;
for(const price of overlay.querySelectorAll('.im-variable-price'))price.textContent='费用待定';
for(const el of overlay.querySelectorAll<HTMLElement>('.im-card')){const c=cards().find(c=>c.id===el.dataset.cardId)!;const face=el.querySelector('.im-card-face')!;const body=document.createElement('div');body.className='imx-card-body';body.innerHTML=`<button class="wb-art-button" data-action="detail" data-id="${c.id}" aria-label="查看${esc(c.name)}详情"><div class="imx-art">${cardArt(c)}</div></button><h2 class="imx-name">${esc(c.name)}</h2><p class="imx-kind">${c.kicker}</p><button class="imx-copy" data-action="detail" data-id="${c.id}"><span>${esc(c.stat)}</span><i aria-hidden="true">${glyph('info')}</i></button>`;face.replaceWith(body);}
const prevTarget=focusKey&&[...overlay.querySelectorAll<HTMLButtonElement>(focusKey.tab?'.wb-base-tabs button':'button')].find(b=>b.dataset.action===focusKey.action&&b.dataset.facility===focusKey.facility&&b.dataset.family===focusKey.family&&b.dataset.line===focusKey.line);
if(prevTarget&&!prevTarget.disabled)prevTarget.focus();else if(dialog){const dlg=overlay.querySelector<HTMLElement>('[role="dialog"]')!;dlg.focus();}else if(opener){const restored=[...overlay.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.dataset.action===opener!.dataset.action);restored?.focus();opener=null;}
}
function open(which:string,trigger:HTMLElement){opener=trigger;dialog=which;if(isFacilityTab(which)){draft=structuredClone(sample.facilities);draftRevision=placementDraft(runtime.state).revision;}draw();}
function close(){dialog='';draft=[];activeCard=undefined;activeQuote=undefined;draw();}
function choose(c:CardView){if(step==='building'){
 const quote=activeQuote??getOffers(runtime.state).find(q=>q.projectId===c.id),target=document.querySelector<HTMLSelectElement>('#target-hatchery')?.value;
 if(!quote)return;const result=purchase(runtime.state,quote,target);if(!result.ok){setStatus(result.reason);close();return;}
 runtime.sync();selected=c.id;selectedCard={...c};setStatus('独立模块已完成：'+c.name+'。支付与设施状态已更新。');
 }else {shopChosen.add(c.id);setStatus('补给为流程占位展示；本轮对接范围是建筑、科技和生产。');}
 dialog='';activeCard=undefined;activeQuote=undefined;draw();}
overlay.addEventListener('click',e=>{const trigger=(e.target as Element).closest<HTMLButtonElement>('button[data-action]');if(!trigger||trigger.disabled)return;const {action,id,line,facility,family}=trigger.dataset;
if(action==='direction'){setDirection(runtime.state,line as ProductionLineId);draw({action,line});}
else if(trigger.closest('.wb-base-tabs')&&isFacilityTab(action!)){dialog=action!;draw({action,tab:true});}
else if(['placement','research','services','rest','progress'].includes(action!)){open(action!,trigger);}
else if(action==='close')close();else if(action==='detail'){activeCard=cards().find(c=>c.id===id);activeQuote=getOffers(runtime.state).find(q=>q.projectId===id);open('detail',trigger);}
else if(action==='choose'){const c=cards().find(c=>c.id===id);if(c&&!c.locked&&!c.short){if(c.id.startsWith('evolve')){activeCard=c;activeQuote=getOffers(runtime.state).find(q=>q.projectId===id);open('detail',trigger);}else choose(c);}}
else if(action==='confirm'&&activeCard)choose(activeCard);
else if(action==='refresh'){const result=refreshBuilding(runtime.state,runtime.state.revision);setStatus(result.ok?'已刷新，独立钱包与次数已更新。':result.reason);draw();}
else if(action==='next'){nextPhase(runtime.state);selected='';draw();}
else if(action==='back-shop'){runtime.state.phase='shop';runtime.state.revision++;draw();}
else if(action==='next-stage'&&sample.stage<18){nextWindow(runtime.state);selected='';selectedCard=undefined;shopChosen.clear();setStatus('进入第 '+runtime.state.stage+' 关整备，保留设施与订单，重置建设刷新。');draw();overlay.scrollTop=0;}
else if(action==='restart-review'){sceneControl.value='opening';reset();}
else if(action==='output'){const f=draft.find(f=>f.id===facility)!;const at=f.outputs.indexOf(family as never);if(at>=0)f.outputs.splice(at,1);else if(f.outputs.length<2)f.outputs.push(family as never);draw({action,facility,family});}
else if(action==='enable'){const f=draft.find(f=>f.id===facility)!;f.enabled=!f.enabled;draw({action,facility});}
else if(action==='apply'){const result=applyPlacement(runtime.state,{revision:draftRevision,groups:draft.map(f=>({id:f.id,outputs:f.outputs,enabled:f.enabled}))});setStatus(result.ok?'已应用独立模块布置。':result.reason);close();}
});
document.addEventListener('keydown',e=>{if(!dialog)return;if(e.key==='Escape'){e.preventDefault();close();return;}if((document.activeElement as HTMLElement)?.closest('.wb-base-tabs')&&['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const index=facilityTabs.indexOf(dialog as typeof facilityTabs[number]),next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;dialog=facilityTabs[next];draw({action:dialog,tab:true});return;}if(e.key==='Tab'){const dlg=overlay.querySelector('[role="dialog"]')!;const controls=[...dlg.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]),select:not(:disabled),[tabindex="0"]')];if(!controls.length)return;const first=controls[0],last=controls.at(-1)!;if(e.shiftKey&&(document.activeElement===first||document.activeElement===dlg)){e.preventDefault();last.focus();}else if(!e.shiftKey&&(document.activeElement===last||document.activeElement===dlg)){e.preventDefault();first.focus();}}});
function reset(){race=raceControl.value as Race;scene=sceneControl.value as Scene;runtime=new NativeBuildingSandbox(race,scene);sample=presentation(runtime.state);direction=sample.direction;step='building';selected='';selectedCard=undefined;shopChosen.clear();dialog='';draft=[];activeQuote=undefined;setStatus('建筑对接模块 · 隔离内存 · 未挂载主游戏');draw();}
raceControl.addEventListener('change',reset);sceneControl.addEventListener('change',reset);document.querySelector('#review-reset')!.addEventListener('click',reset);
document.querySelector('#review-funds')!.addEventListener('click',()=>{runtime.state.wallet.minerals+=1000;runtime.state.wallet.gas+=1000;setStatus('已向隔离钱包增加1000矿／1000气。');draw();});
document.querySelector('#review-production')!.addEventListener('click',()=>{runtime.tick(0);runtime.tick(120,false);const released=runtime.deliverReady();setStatus(`原生产接口验证：${runtime.orders().length}批订单，本次交付${released}个单位${runtime.world.requiresPlayerDecision?'，等待原游戏家族替换决策':''}。`);draw();});
(window as unknown as {__MVP1_CONNECTION__:unknown}).__MVP1_CONNECTION__={snapshot:()=>structuredClone({state:runtime.state,orders:runtime.orders(),orderGroups:[...runtime.orderGroups],players:runtime.world.allies().map(u=>({id:u.id,family:u.unitType})),scope:'isolated-module-not-mounted'})};
window.addEventListener('resize',()=>{if(overlay.dataset.layout!==(innerWidth<=700?'portrait':'landscape'))draw();});draw();
