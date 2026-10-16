import {equipmentTemplate,type EquipmentEffect,type EquipmentTemplate} from './catalog';
import type {EquipmentBinding,EquipmentItem,Quality} from './types';
import {inheritedEffect} from './inheritance';

export interface ActiveEquipmentEffect extends EquipmentEffect {source:string;items:readonly string[];binding?:EquipmentBinding;quality?:Quality;pieces?:number;repeatable?:boolean}
const bindingKey=(b:EquipmentBinding)=>[b.hero??'',b.elite??'',b.direction??'',b.family??''].join(':');
interface Group {key:string;template:EquipmentTemplate;pieces:EquipmentItem[];quality:Quality;effects:readonly {pieces:number;effects:readonly EquipmentEffect[]}[]}
/** Only an explicitly shared family can mix qualities. A complete higher tier replaces its lower counterpart. */
export function selectEquipmentEffects(items:readonly EquipmentItem[]):ActiveEquipmentEffect[]{
 const result:ActiveEquipmentEffect[]=[],families=new Map<string,EquipmentItem[]>(),uniques=new Map<string,EquipmentItem>();
 for(const item of items){const t=equipmentTemplate(item.template);if(!t||item.pollution==='uncleansed')continue;
  for(const id of item.inherited)for(const effect of inheritedEffect(id)?.effects??[])result.push({...effect,source:item.id+':'+id,items:[item.id],binding:item.binding,quality:item.quality});
  if(t.kind!=='set'){if(t.unique){const key=t.replacementFamily??t.id,old=uniques.get(key);if(!old||old.quality<item.quality)uniques.set(key,item);}else for(const e of t.effects)result.push({...e,source:t.id,items:[item.id],binding:item.binding,quality:item.quality});continue;}
  const key=t.setFamily+':'+bindingKey(item.binding),group=families.get(key)??[];group.push(item);families.set(key,group);
 }
 for(const item of uniques.values())for(const e of equipmentTemplate(item.template)!.effects)result.push({...e,source:item.template,items:[item.id],binding:item.binding,quality:item.quality});
 const complete:Group[]=[];
 for(const [key,pieces] of families){const template=equipmentTemplate(pieces[0].template)!;if(pieces.length<2)continue;let quality=pieces[0].quality,effects:Group['effects'];
  if(template.tiers){const eligible=Object.keys(template.tiers).map(Number).filter(q=>!template.tierGate||q===3||pieces.filter(i=>i.quality>=q).length>=template.tierGate);if(!eligible.length)continue;quality=Math.max(...eligible) as Quality;effects=template.tiers[quality];}
  else effects=[{pieces:2,effects:template.effects}];
  complete.push({key,template,pieces,quality,effects});
 }
 for(const g of complete){if(complete.some(other=>other!==g&&other.template.replacementFamily===g.template.replacementFamily&&bindingKey(other.pieces[0].binding)===bindingKey(g.pieces[0].binding)&&other.quality>g.quality))continue;
  const repeats=g.template.repeat?Math.floor(g.pieces.length/2):1;
  for(let group=0;group<repeats;group++){const selected=g.template.repeat?g.pieces.slice(group*2,group*2+2):g.pieces;
   for(const step of g.effects)if(selected.length>=step.pieces)for(const e of step.effects)result.push({...e,source:g.key+':'+group,items:selected.slice(0,g.template.repeat?2:Math.max(...g.effects.filter(x=>x.pieces<=selected.length).map(x=>x.pieces))).map(i=>i.id),binding:selected[0].binding,quality:g.quality,pieces:selected.length,repeatable:g.template.repeat});
  }
 }return uniqueEquipmentEffects(result);
}
/** Functional duplicates replace once. Explicit repeat groups and independent capacity/stat sources retain their contracts. */
export function uniqueEquipmentEffects(effects:readonly ActiveEquipmentEffect[]){const groups=new Map<string,ActiveEquipmentEffect[]>(),kept:ActiveEquipmentEffect[]=[];
 for(const e of effects){if(e.repeatable||/^(stat\.|ordinary\.|direction\.|bound\.|elite\.|capacity_|recruit_rank)/.test(e.key)){kept.push(e);continue;}const key=e.key+':'+bindingKey(e.binding??{})+(e.key==='bombardment'&&(e.values[6]||e.values[7])?':resource':''),group=groups.get(key)??[];group.push(e);groups.set(key,group);}
 for(const group of groups.values()){const quality=Math.max(...group.map(e=>e.quality??0)),same=group.filter(e=>e.quality===quality);same.sort((a,b)=>{
  // Time/range thresholds are costs; other leading values are benefits. The remaining values break ties deterministically.
  const cost=/^(periodic_|reinforcement$|elite_training$|direction_reinforcement$|fleet_reinforcement$|manual_reset$|catch_up$)/.test(a.key);for(let n=0;n<Math.max(a.values.length,b.values.length);n++){const diff=(b.values[n]??0)-(a.values[n]??0);if(diff)return n===0&&cost?-diff:diff;}return a.source.localeCompare(b.source);
 });kept.push(same[0]);}return kept;
}
