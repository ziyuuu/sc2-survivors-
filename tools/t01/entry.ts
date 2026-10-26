import './isolate';
import '../../src/ui/presentation/building-panel.css';
import '../../src/ui/presentation/game-shell.css';
import '../../src/render/scene/battle-distress.css';
import '../../src/ui/presentation/world-labels.css';
import '../../src/ui/presentation/text-scale-reference.generated.css';
import '../../src/ui/hud/special-stages.css';
import './tool.css';
import {boot} from '../../src/app/bootstrap';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {starshipImage} from '../../src/ui/starship/runtime-art';
import {DYNAMIC_CASES,STATIC_CASES,CATALOGUE_SCOPE,type Case} from './catalogue';
import {installRuntime} from './runtime';
import {installStaticRuntime} from './static-runtime';
declare const T01_MODE:'dynamic'|'static'|'combined';

async function main(){
 const app=await boot({seed:529,equipmentAccount:newEquipmentAccount(529),starship:{resolveImage:starshipImage}});
 const runtime=installRuntime(app),staticRuntime=installStaticRuntime(app),allCases=T01_MODE==='combined'?[...DYNAMIC_CASES,...STATIC_CASES]:T01_MODE==='dynamic'?DYNAMIC_CASES:STATIC_CASES;
 let mode:'dynamic'|'static'=T01_MODE==='static'?'static':'dynamic',cases:Case[]=mode==='dynamic'?DYNAMIC_CASES:STATIC_CASES;
 const results:Record<string,unknown>=Object.fromEntries(allCases.filter(c=>c.applicability).map(c=>[c.id,{status:'not-applicable',...c.applicability,source:c.source}]));
 const tool=document.createElement('aside');tool.id='t01-tool';tool.innerHTML=`<details open><summary>T01 · ${T01_MODE==='combined'?'综合检测':mode==='dynamic'?'动态检测':'静态/UI'} · 受控场景</summary><div class="t01-controls"><input id="t01-search" type="search" placeholder="查找对象 / 动作"><select id="t01-group"><option value="">全部分类</option>${[...new Set(cases.map(c=>c.group))].map(g=>`<option>${g}</option>`).join('')}</select><select id="t01-case" size="8" aria-label="检测条目"></select><div><button id="t01-load">载入</button><button id="t01-reset">重置</button></div>${T01_MODE!=='static'?'<div id="t01-playback"><button id="t01-play">单次播放</button><button id="t01-pause">定格</button><button id="t01-step">逐帧</button><label><input id="t01-loop" type="checkbox">循环</label><select id="t01-speed"><option value="1">1×</option><option value=".5">0.5×</option><option value=".25">0.25×</option><option value=".1">0.1×</option></select><select id="t01-target"><option value="ground">地面目标</option><option value="air">空中目标</option><option value="shield">护盾目标</option></select></div>':''}<output id="t01-state"></output><textarea id="t01-note" rows="2" placeholder="检查记录"></textarea><div><button data-result="viewed">已看</button><button data-result="issue">有问题</button><button id="t01-export">导出记录</button></div><output id="t01-count"></output></div></details>`;document.body.append(tool);
 const get=<T extends HTMLElement>(id:string)=>document.getElementById('t01-'+id) as T;
 // Native game dialogs make all outside elements inert. Keep the inspection
 // controls inside the current modal's focus scope and in their own top-layer
 // popover, so they remain usable without changing the production dialog.
 tool.popover='manual';
 const syncTool=()=>{
  const modal=[...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1),parent=modal??document.body;
  if(tool.parentElement!==parent){if(tool.matches(':popover-open'))tool.hidePopover();parent.append(tool);}
  if(tool.hidden){if(tool.matches(':popover-open'))tool.hidePopover();}
  else if(!tool.matches(':popover-open'))tool.showPopover();
 };
 const toolObserver=new MutationObserver(syncTool);toolObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['open']});syncTool();
 // Once hosted in a native dialog, tool fields must not reach the game's
 // delegated input/change handlers. A note blur otherwise redraws the dialog
 // between pointer-down and pointer-up and cancels the native button click.
 for(const kind of ['click','keydown','keyup','pointerdown','input','change'] as const)tool.addEventListener(kind,event=>event.stopPropagation());
 const targetSelect=get<HTMLSelectElement>('target');if(targetSelect){targetSelect.prepend(new Option('适用目标','auto'));targetSelect.value='auto';}
 const condition=document.createElement('select');condition.id='t01-condition';for(const [key,label]of Object.entries({normal:'正常触发',damage:'装备：受击',fatal:'装备：致命伤害',move:'装备：移动命令',kill:'装备：击杀',skill:'装备：英雄施法',periodic:'装备：到期前0.25秒'}))condition.add(new Option(label,key));if(T01_MODE!=='static')targetSelect.after(condition);
 const healthLabel=document.createElement('label'),health=document.createElement('input');health.type='checkbox';health.id='t01-health-lock';healthLabel.append(health,'诊断锁血');health.addEventListener('change',()=>runtime.healthLock(health.checked));if(T01_MODE!=='static')condition.after(healthLabel);
 const select=get<HTMLSelectElement>('case'),search=get<HTMLInputElement>('search'),group=get<HTMLSelectElement>('group'),state=get<HTMLOutputElement>('state');let busy=false,loaded='';
 function count(){const applicable=cases.filter(c=>!c.applicability),recorded=applicable.filter(c=>results[c.id]);get('count').textContent=`目录 ${cases.length} · 已记录 ${recorded.length} · 未检查 ${applicable.length-recorded.length} · 不适用 ${cases.length-applicable.length}`;}
 function filter(){const previous=select.value,q=search.value.toLowerCase();select.replaceChildren(...cases.filter(c=>(!group.value||c.group===group.value)&&(!q||(c.name+' '+c.id).toLowerCase().includes(q))).map(c=>new Option(c.name+(c.applicability?" · 不适用":""),c.id)));if([...select.options].some(o=>o.value===previous))select.value=previous;}
 const chosen=()=>{const c=cases.find(c=>c.id===select.value);if(!c)throw Error('未选条目');return c;};
 async function load(id?:string){if(busy)throw Error('载入进行中');if(id){const c=allCases.find(c=>c.id===id);if(!c)throw Error('未知条目 '+id);if(T01_MODE==='combined')switchMode(STATIC_CASES.includes(c)?'static':'dynamic');search.value='';group.value='';filter();select.value=id;}const c=chosen();busy=true;runtime.pause();state.textContent='载入中';try{if(mode==='dynamic')staticRuntime.release();const report=mode==='dynamic'?await runtime.prepare(c,targetSelect.value==='auto'?undefined:targetSelect.value):await staticRuntime.prepare(c);loaded=c.id;get<HTMLTextAreaElement>('note').value=(results[c.id] as {note?:string}|undefined)?.note??'';health.checked=runtime.snapshot().diagnostic.enabled;state.textContent=c.applicability?'不适用 · '+c.applicability.reason:health.checked?'已载入 · 诊断锁血开启':'已载入 · 尚未检查';return report;}catch(e){state.textContent=String(e);throw e;}finally{busy=false;}}
 const modeSelect=document.createElement('select');modeSelect.id='t01-mode';modeSelect.setAttribute('aria-label','检测类型');modeSelect.add(new Option('动态：对象 / 动作 / 技能','dynamic'));modeSelect.add(new Option('静态 / UI','static'));modeSelect.value=mode;
 if(T01_MODE==='combined')search.before(modeSelect);
 function switchMode(next:'dynamic'|'static'){
  if(next===mode)return;if(busy)throw Error('请等待当前条目载入完成');runtime.pause();mode=next;modeSelect.value=next;cases=next==='dynamic'?DYNAMIC_CASES:STATIC_CASES;loaded='';search.value='';get<HTMLTextAreaElement>('note').value='';
  group.replaceChildren(new Option('全部分类',''),...[...new Set(cases.map(c=>c.group))].map(g=>new Option(g,g)));
  const playback=get('playback');if(playback)playback.hidden=next==='static';condition.hidden=healthLabel.hidden=next==='static';get<HTMLInputElement>('loop').checked=false;state.textContent='选择条目后载入';filter();count();
 }
 modeSelect.addEventListener('change',()=>{try{switchMode(modeSelect.value as 'dynamic'|'static');}catch(e){modeSelect.value=mode;state.textContent=String(e);}});
 function listen(id:string,fn:()=>unknown){document.getElementById('t01-'+id)?.addEventListener('click',()=>{Promise.resolve().then(fn).catch(e=>{state.textContent=String(e);});});}
 listen('load',()=>load());listen('reset',()=>load(loaded||select.value));listen('play',()=>{if(loaded!==select.value)throw Error('请先载入选中条目');if(chosen().applicability){state.textContent='不适用 · '+chosen().applicability!.reason;return;}const s=runtime.trigger(condition.value);state.textContent=s.receipt&&!s.playing?'已触发 · 回执已记录':'播放中';});listen('pause',()=>{runtime.pause();state.textContent='已定格';});listen('step',()=>runtime.step());
 get<HTMLSelectElement>('speed')?.addEventListener('change',e=>runtime.speed(Number((e.target as HTMLSelectElement).value)));search.addEventListener('input',filter);group.addEventListener('change',filter);
 for(const b of tool.querySelectorAll<HTMLButtonElement>('[data-result]'))b.addEventListener('click',()=>{if(!loaded||loaded!==select.value||chosen().applicability)return;results[loaded]={status:b.dataset.result,note:get<HTMLTextAreaElement>('note').value,at:new Date().toISOString(),snapshot:mode==='dynamic'?runtime.snapshot():staticRuntime.snapshot()};count();});
 listen('export',()=>{const blob=new Blob([JSON.stringify({mode:T01_MODE,scope:CATALOGUE_SCOPE,results},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='T01-'+T01_MODE+'-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
 setInterval(()=>{if(mode==='dynamic'&&!busy&&loaded&&loaded===select.value){const s=runtime.snapshot();if(s.playing)state.textContent=`播放 ${s.elapsed.toFixed(2)} 秒`;else if(get<HTMLInputElement>('loop').checked&&s.elapsed>=chosen().seconds!){void load(loaded).then(()=>runtime.trigger()).catch(e=>state.textContent=String(e));}}},200);
 filter();count();Object.assign(window,{T01:{app,runtime,staticRuntime,get cases(){return cases;},catalogue:{dynamic:DYNAMIC_CASES,static:STATIC_CASES},scope:CATALOGUE_SCOPE,results,load,get mode(){return mode;},documentMode:T01_MODE,capture:(hidden:boolean)=>{tool.hidden=hidden;syncTool();}}});
}
void main().catch(e=>{const p=document.createElement('pre');p.id='t01-fatal';p.textContent=String(e);document.body.append(p);console.error(e);});
