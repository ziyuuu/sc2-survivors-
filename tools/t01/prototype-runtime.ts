import data from './prototype.generated.json';
import {assetUrl} from '../../src/assets/manifest';
import {prepareEmbeddedAssetIds} from '../../src/assets/offline-pack';
import type {Case} from './catalogue';
import {races} from './gallery';
import {mountLegacySlots} from '../../src/ui/starship/legacy-layout';

export type PrototypeTemplate=Case&{html:string;bodyClass:string;bodyData:Record<string,string>;assets:string[]};
const targets:Record<string,string>={empty:'空状态',populated:'常规',full:'已满',insufficient:'资源不足',selected:'已选中',detail:'详情',filters:'筛选',protected:'锁定与收藏',polluted:'污染',controls:'操作',graphics:'画面',skins:'皮肤',downloads:'预下载',saves:'存档',easy:'简单',normal:'普通',hard:'困难',hell:'地狱',technology:'科技',production:'路线图',summary:'总体',sources:'已购',stats:'属性',abilities:'技能',army:'编队','ability-detail':'技能详情',hero:'英雄','hero-dead':'英雄阵亡',elite:'精英','carrier-falling':'载体降落','carrier-active':'载体待救援','carrier-opening':'载体打开','dismantle-confirm':'分解确认','discard-confirm':'丢弃确认','expand-confirm':'扩容确认','preset-rename':'预设命名','preset-error':'命名错误','preset-save':'保存预设','preset-apply':'应用预设','preset-missing':'预设缺件','reroll-affix-confirm':'词条重铸确认','reroll-affix-choice':'词条选择','reroll-elite-confirm':'精英重铸确认','reroll-elite-choice':'精英选择',cleansed:'已清洗','forge-crafted':'合成完成','search-empty':'无搜索结果','slot-filter':'槽位筛选','attributes-detail':'属性详情','effects-detail':'效果详情','effects-active':'套装已激活','hero-detail':'英雄专属装备详情','loot-purple':'紫色战利品','loot-purple-detail':'紫色战利品详情','loot-orange':'橙色战利品','loot-orange-detail':'橙色战利品详情',rescue:'救援','rescue-detail':'救援详情','elite-free':'精英增援','elite-shop':'精英购买',supply:'补给',receipt:'增援接收','receipt-detail':'接收详情','receipt-blocked':'接收受阻',injured:'受伤','repair-detail':'修理详情','hero-alive':'英雄存活','hero-paid':'已支付复活','hero-insufficient':'复活资源不足',bought:'已购买','detail-insufficient':'详情 · 资源不足',success:'成功入仓',failure:'失利遗失',resumable:'可读取',busy:'保存中',battle:'战斗中',quota:'空间不足',corrupt:'损坏保护',conflict:'其他页面更新'};
const names:Record<string,string>={title:'标题',race:'种族选择',difficulty:'难度选择',confirm:'出发确认',loadout:'旗舰配装',warehouse:'舰装仓库',forge:'装备工坊','ship-operation':'舰装操作',decision:'战局选择',inspector:'战场详情',settings:'设置',reward:'发展选择',base:'基地',direction:'编队方向',rest:'休整',contracts:'精英合同',cards:'商店','card-detail':'商店','cards-insufficient':'商店','cards-bought':'商店',progress:'强化一览',backpack:'战地背包',pause:'暂停',won:'战役胜利',lost:'战斗失利',finished:'撤离完成','endless-ready':'无尽准备',settlement:'结算'};
export const PROTOTYPES=data.templates as PrototypeTemplate[];
export function prototypePage(c:Case){return c.action==='starship'?c.actor!:c.action?.startsWith('card')?'cards':c.action==='inspector'&&c.target==='empty'?'battle':c.action!;}
export const prototypePageName=(key:string)=>key==='battle'?'战斗界面':names[key]??key;
export function prototypeStateName(c:Case){const state=(c.data as {state?:string}|undefined)?.state;return [c.race?races[c.race]:'',c.action==='card-detail'?'卡牌详情':c.action==='cards-insufficient'?'资源不足':c.action==='cards-bought'?'已购买':c.target?.startsWith('quality-')?['','白','绿','蓝','紫','橙'][Number(c.target.slice(8))]+'色装备详情':c.target?targets[c.target]??c.target:'常规',state?targets[state]??state:''].filter(Boolean).join(' · ');}

export function installPrototypeRuntime(frame:HTMLIFrameElement,onNavigate:(c:PrototypeTemplate)=>void){
 let current:PrototypeTemplate|undefined,history:string[]=[],revision=0,backNavigation=false,unmount=()=>{};
 const find=(action:string,target?:string,actor?:string)=>PROTOTYPES.find(c=>c.action===action&&(!target||c.target===target)&&(!actor||c.actor===actor)&&(!c.race||c.race===(current?.race??'terran')));
 const go=(c:PrototypeTemplate|undefined)=>{if(c)onNavigate(c);};
 const back=()=>{const previous=history.pop();backNavigation=true;go(PROTOTYPES.find(c=>c.id===previous)??find('title'));};
 function route(el:HTMLElement){
  const a=el.dataset.action??el.dataset.act??'',tab=el.dataset.tab,actor=el.dataset.page;
  if(a==='menu-new'){go(find('race'));return;}
  if(a==='menu-race-next'){go(find('difficulty','normal'));return;}
  if(a==='menu-difficulty-next'){go(find('confirm'));return;}
  if(a==='menu-difficulty'){go(find('difficulty',el.dataset.difficulty));return;}
  if(a==='menu-stage'||a==='ui-page'){go(find(actor!));return;}
  if(a==='menu-start'||a==='save-continue'||a==='resume'){go(find('inspector','empty'));return;}
  if(a==='menu-edit-starship'){go(find('starship','populated','loadout'));return;}
  if(a==='battle-base'){go(find('base'));return;}
  if(a==='battle-progress'){go(find('progress','summary'));return;}
  if(a==='starship-backpack'){go(find('backpack','populated'));return;}
  if(a==='race'&&el.dataset.act){go(PROTOTYPES.find(c=>c.action==='starship'&&c.actor===current?.actor&&c.target==='populated'&&c.race===el.dataset.race));return;}
  if(a==='cover-race'){go(PROTOTYPES.find(c=>c.action==='title'&&c.race===el.dataset.race));return;}
  if(a==='race'||a==='select-race'||a==='menu-race'){go(PROTOTYPES.find(c=>c.action==='race'&&c.race===el.dataset.race));return;}
  if(a==='difficulty'||a==='select-difficulty'){go(find('confirm'));return;}
  if(a==='settings-tab'){go(find('settings',tab));return;}
  if(a==='ship-tab'||a==='page'){go(find('starship','populated',actor));return;}
  if(a==='detail'){const quality=el.className.match(/\brarity-([1-5])\b/)?.[1];go(current?.action==='backpack'?find('backpack','populated'):find('starship',current?.action==='starship'&&current.target!=='polluted'&&quality?'quality-'+quality:'detail',current?.actor??'warehouse'));return;}
  if(a==='dismantle'||a==='discard'||a==='expand'){go(find('ship-operation',a+'-confirm'));return;}
  if(a==='reroll-affix'||a==='reroll-elite'){go(find('ship-operation',a+'-confirm'));return;}
  if(a==='confirm'&&current?.target?.startsWith('reroll')){go(find('ship-operation',current.target.replace('confirm','choice')));return;}
  if(a==='rename-preset'){go(find('ship-operation','preset-rename'));return;}
  if(a==='save-preset'||a==='apply-preset'){go(find('ship-operation',a==='save-preset'?'preset-save':'preset-apply'));return;}
  if(a==='craft'||a==='cleanse'){go(find('ship-operation',a==='craft'?'forge-crafted':'cleansed'));return;}
  if(a==='toggle-filters'){go(find('starship','filters',current?.actor??'warehouse'));return;}
  if(a==='select-page'){go(find('starship','selected',current?.actor??'warehouse'));return;}
  if(a==='slot'){go(find('ship-operation','slot-filter'));return;}
  if(a==='lock'||a==='favorite'){go(find('starship','protected',current?.actor??'warehouse'));return;}
  if(a==='settings'||a==='ui-settings'){go(find('settings','controls'));return;}
  if(a==='starship'||a==='open-starship'){go(find('starship','populated','loadout'));return;}
  if(a==='ui-production-tab'){go(find('base',tab==='facilities'?undefined:tab));return;}
  if(a==='battle-progress-tab'){go(find('progress',tab));return;}
  if(el.dataset.inspectTab){go(find('inspector',el.dataset.inspectTab==='stats'?'stats':el.dataset.inspectTab==='army'?'army':'abilities'));return;}
  if(el.hasAttribute('data-imx-flip')){go(current?.action==='decision'?find('decision',current.target?.replace('-detail','')+(current.target?.endsWith('-detail')?'':'-detail')):find('card-detail'));return;}
  if(el.matches('[data-seat]')){go(find('inspector','stats'));return;}
  if(/close|back|cancel/.test(a)){back();return;}
  const text=(el.textContent??'').trim();
  if(/返回|取消|关闭/.test(text)){back();return;}
  if(/^(开始游戏|新游戏|开始)$/.test(text)||a==='new-run'){go(find('race'));return;}
  if(/出发|进入战场|开始战斗|继续游戏|继续战斗/.test(text)){go(find('inspector','empty'));return;}
  if(/^(人族|虫族|星灵)$/.test(text)&&el.dataset.race){go(PROTOTYPES.find(c=>c.action==='difficulty'&&c.race===el.dataset.race&&c.target==='normal'));return;}
  if(/简单|普通|困难|地狱/.test(text)&&current?.action==='difficulty'){go(find('confirm'));return;}
  for(const [label,page]of Object.entries({'旗舰配装':'loadout','舰装仓库':'warehouse','装备工坊':'forge'}))if(text.includes(label)){go(find('starship','populated',page));return;}
  for(const [label,page]of Object.entries({'设置':'settings','基地':'base','发展':'reward','休整':'rest','商店':'cards','精英特约':'contracts','编队方向':'direction','强化一览':'progress','暂停':'pause'}))if(text===label){go(find(page));return;}
  if(/购买|招募/.test(text)){go(current?.action==='contracts'?find('contracts','bought'):find('cards-bought'));return;}
  if(/读取|导入|导出|保存/.test(text)){go(find('settings','saves'));return;}
  if(/确认/.test(text)&&current?.action==='ship-operation'){go(find('starship','populated',current.target?.startsWith('reroll')?'forge':'warehouse'));return;}
  if(a==='pause'){go(find('pause'));return;}
 }
 async function prepare(c:Case,push=true){
  const template=PROTOTYPES.find(t=>t.id===c.id);if(!template)throw Error('未找到界面原型');
  if(push&&!backNavigation&&current&&current.id!==c.id)history.push(current.id);backNavigation=false;current=template;const token=++revision;
  await prepareEmbeddedAssetIds(template.assets);if(token!==revision)return;
  const html=template.html.replace(/t01-asset:([\w.:-]+)/g,(_,id)=>{const url=assetUrl(id);if(!url)throw Error('原型图片尚未准备：'+id);return url;});
  unmount();const doc=frame.contentDocument!;doc.open();doc.write('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+data.css.replaceAll('</style','<\\/style')+'</style><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#09111a}#game-root{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}#interface{width:100%!important;height:100%!important}#opening,#t01-tool{display:none!important}dialog::backdrop{background:#0008}a{cursor:pointer}</style></head><body>'+html+'</body></html>');doc.close();
  doc.body.className=template.bodyClass;for(const[k,v]of Object.entries(template.bodyData))doc.body.dataset[k]=v;
  const resize=()=>{doc.documentElement.style.setProperty('--game-width',frame.clientWidth+'px');doc.documentElement.style.setProperty('--game-height',frame.clientHeight+'px');doc.documentElement.style.setProperty('--game-left','0px');doc.documentElement.style.setProperty('--game-top','0px');};resize();
  for(const dialog of doc.querySelectorAll<HTMLDialogElement>('dialog[open]')){dialog.removeAttribute('open');dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();back();});}
  unmount=mountLegacySlots(doc.body);
  doc.addEventListener('submit',e=>e.preventDefault());
  doc.addEventListener('click',e=>{const target=e.target as HTMLElement,el=target.closest<HTMLElement>('button,a,[data-imx-flip],[data-seat],[data-inspect-tab]');if(!el||el.closest('summary')||el.matches(':disabled'))return;e.preventDefault();e.stopPropagation();route(el);});
  doc.addEventListener('contextmenu',e=>{if((e.target as HTMLElement).closest('[data-seat]')){e.preventDefault();go(find('inspector','stats'));}});
  return snapshot();
 }
 function snapshot(){return {caseId:current?.id,prototype:true,businessLogic:false,historyDepth:history.length};}
 return {prepare,snapshot,release(){revision++;unmount();frame.hidden=true;},back};
}
