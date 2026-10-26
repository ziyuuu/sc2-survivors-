import type {Case} from './catalogue';

import {equipmentRecipe} from './equipment-preview-spec';
import {effectText} from '../../src/ui/starship/effect-text';
export type GalleryDisposition={kind:'dynamic'|'reference'|'duplicate';reason:string};
export function galleryDisposition(c:Case):GalleryDisposition{
 const result=(kind:GalleryDisposition['kind'],reason:string)=>({kind,reason});
 if(c.runner==='card')return result('reference','卡面与购买说明见 UI 原型的关间卡牌；有独立表现的生效过程单列。');
 if(c.runner==='development')return result('reference','建设、研究与解锁说明见 UI 原型的发展页面。');
 if(c.runner==='map')return result('reference','静态地图场景，不作为动态效果；场景仍用于对应关卡。');
 if(c.runner==='equipment'){
  const effects=(c.data as {effects:{key:string}[]}).effects;
  if(effects.every(e=>!equipmentRecipe(e.key)))return result('reference','规则参数：'+(c.data as {effects:import("../../src/simulation/starship/selection").ActiveEquipmentEffect[]}).effects.map(effectText).join('；'));
  return result('dynamic','含独立攻击、治疗、召唤、护盾、持续区域或状态过程；保留触发条件检查。');
 }
 if(c.runner==='fun'&&c.actor?.startsWith('shop:'))return result('duplicate','商店商品的实际过程统一放在卡牌效果；购买说明见 UI 原型。');
 if(c.runner==='card-effect'){
  const e=(c.data as {effect:{kind:string;item?:string;effect?:string}}).effect;
  if(e.kind==='funShop'&&e.item==='tavern')return result('reference','酒馆没有独立战斗特效；1/2/3级将后续任务抽选权重提高至1.3/1.7/2.2倍。实际任务的入场和过程见任务条目。');
  if(['hero','elite','supply'].includes(e.kind))return result('duplicate','对应单位的动作、技能与增援入场已有独立条目。');
  if(['teamCard','training','resource'].includes(e.kind)||e.kind==='card')return result('reference','数值、资源或生产周转；单位动作与运输过程在单位目录中检查。');
  if(e.kind==='funShop'&&['dice','pandora'].includes(e.item??''))return result('reference','货架品质概率或全局数值变化，说明见 UI 原型的商店卡牌。');
 }
 return result('dynamic','保留实际动态过程；不据此宣告特效已通过。');
}

export function galleryReferences(cases:Case[]){
 const rows=new Map<string,{name:string;reason:string;cases:number}>();
 for(const c of cases){const disposition=galleryDisposition(c);if(disposition.kind==='dynamic')continue;
  const name=['card','card-effect'].includes(c.runner)?c.name.replace(/ · 生效场景$/,''):c.name.split(' · ')[0],key=name+':'+disposition.reason;
  const row=rows.get(key)??{name,reason:disposition.reason,cases:0};row.cases++;rows.set(key,row);
 }
 // Mixed sets also retain their nonvisual bonuses and overridden tiers. A set
 // having one dynamic action must not hide its other active parameters.
 for(const c of cases.filter(c=>c.runner==='equipment')){
  const d=c.data as {template:string;pieces:number;binding:unknown;effects:import('../../src/simulation/starship/selection').ActiveEquipmentEffect[]};
  for(const e of d.effects){const rule=!equipmentRecipe(e.key),superseded=e.key==='opening_hero_proxy'&&d.effects.some(x=>x.key==='replace_hero_proxy'&&x.source===e.source);if(!rule&&!superseded)continue;
   const reason=`${d.pieces}件 · ${c.race} · ${Object.values(d.binding??{}).join(' / ')||'无绑定'}：${effectText(e)}`+(e.key==='egg_conversion'?'；当前普通救援虫卵只产生工人，原生子单位列表为空，因此此附加转换没有独立画面。':superseded?'；此组合已被英雄替换，当前显示正式英雄。':''),name=c.name.split(' · ')[0],key=d.template+':'+reason;
   if(!rows.has(key))rows.set(key,{name,reason,cases:1});
  }
 }
 return [...rows.values()];
}
