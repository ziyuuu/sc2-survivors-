import {equipmentTemplate,type EquipmentEffect} from '../../simulation/starship/catalog';
import {selectEquipmentEffects} from '../../simulation/starship/selection';
import {inheritedEffect} from '../../simulation/starship/inheritance';
import {itemValues} from '../../simulation/starship/attributes';
import {isAttributeSlot,type EquipmentBinding,type EquipmentItem} from '../../simulation/starship/types';
import {presentation,bindingName,qualityNames,statNames,statValue} from './presentation';
import {effectText} from './effect-text';

const bindingKey=(b:EquipmentBinding)=>[b.hero??'',b.elite??'',b.direction??'',b.family??''].join(':');
const equalEffect=(a:EquipmentEffect,b:EquipmentEffect)=>a.key===b.key&&a.values.length===b.values.length&&a.values.every((v,n)=>v===b.values[n]);
/** Describes the real loadout and a clearly labelled replacement preview separately. */
export function equipmentDescription(item:EquipmentItem,equipped:readonly EquipmentItem[]){
 const t=equipmentTemplate(item.template),p=presentation(item),worn=equipped.some(i=>i.id===item.id);
 const sameSet=(i:EquipmentItem)=>equipmentTemplate(i.template).setFamily===t.setFamily&&bindingKey(i.binding)===bindingKey(item.binding)&&i.pollution!=='uncleansed';
 const peers=t.kind==='set'?equipped.filter(sameSet):[],count=peers.length;
 const relevant=(items:readonly EquipmentItem[])=>selectEquipmentEffects(items).filter(e=>e.items.includes(item.id)||t.kind==='set'&&e.items.some(id=>items.some(i=>i.id===id&&sameSet(i))));
 const current=relevant(equipped),proposed=worn?current:relevant([...equipped.filter(i=>i.slot!==item.slot),item]);
 const requirement=t.kind==='set'?`${p.setName}：同套${t.binding?'、同属'+bindingName(item.binding):''}至少2件${t.tierGate?`；高阶需${t.tierGate}件对应或更高品质`:''}`:t.binding?`专属对象：${bindingName(item.binding)}`:'装备后生效';
 let stacking=t.kind==='set'?(t.repeat?'每凑齐2件可独立叠加；完整高阶套装替代低阶':'同系列不重复叠加；完整高阶套装替代低阶'):t.unique?'同系列仅最高品质一件生效':'属性加成按来源累加；同名功能取有效最高档';
 if(item.quality>=4&&isAttributeSlot(item.slot))stacking+='；英雄／精英从Ⅱ级起，每级额外放大本件白字DPS、真实DPS与生命白字5%（Ⅴ级20%、Ⅸ级40%）';
 let status=item.pollution==='uncleansed'?'污染未净化：属性及效果均未启用':!worn?'未装备':t.kind==='set'&&count<2?`未激活：已装备${count}/2件`:current.length?'已激活':t.effects.length||t.tiers?'未激活：功能已被更高档或同名来源替代':'属性已生效';
 if(t.kind==='set'&&!(worn&&count<2))status+=` · 当前同套${count}件`;
 const rows:{effect:EquipmentEffect;label:string;active:boolean;requirement:string;quality?:number;pieces?:number}[]=[];
 const add=(effects:readonly EquipmentEffect[],gate:string,source='',quality?:number,pieces?:number)=>{for(const effect of effects){const active=worn&&item.pollution!=='uncleansed'&&(!pieces||count>=pieces)&&current.some(e=>equalEffect(e,effect)&&(quality===undefined||e.quality===quality)&&(!pieces||e.source.startsWith(t.setFamily+':')));rows.push({effect,label:source+effectText({...effect,binding:item.binding}),active,requirement:gate,quality,pieces});}};
 add(t.effects,t.kind==='set'?'2件套':'装备后','',t.kind==='set'?item.quality:undefined,t.kind==='set'?2:undefined);
 for(const [q,steps] of Object.entries(t.tiers??{}))for(const step of steps)add(step.effects,`${qualityNames[+q]} · ${step.pieces}件${t.tierGate&&+q>3?`，其中${t.tierGate}件达到本品质`:''}`,'',+q,step.pieces);
 const setQualities=[...new Set(rows.filter(r=>r.pieces).map(r=>r.quality!))];
 const activeQuality=current.find(e=>e.source.startsWith(t.setFamily+':'))?.quality;
 const setBonuses=t.kind==='set'?{name:p.setName,count,primaryQuality:activeQuality??item.quality,tiers:setQualities.map(quality=>({quality,current:quality===activeQuality,gate:t.tierGate&&quality>3?`${t.tierGate}件${qualityNames[quality]}及以上同套装备 · 当前${peers.filter(i=>i.quality>=quality).length}/${t.tierGate}件`:'',steps:[...new Set(rows.filter(r=>r.quality===quality).map(r=>r.pieces!))].sort((a,b)=>a-b).map(pieces=>({pieces,rows:rows.filter(r=>r.quality===quality&&r.pieces===pieces)}))}))}:undefined;
 for(const id of item.inherited)add(inheritedEffect(id)?.effects??[],'装备且净化后','继承：');
 const attributes=Object.entries(itemValues(item)).filter(([,v])=>v).map(([k,v])=>`${statNames[k as keyof typeof statNames]} +${statValue(k,v)}`);
 const main=t.effects[0]??Object.values(t.tiers??{})[0]?.[0]?.effects[0];
 const purpose=t.kind==='set'?`${p.setName}套装部件`:t.kind==='module'?'功能模块':t.kind==='special'?'特殊舰装':'全军属性装备';
 const benefit=main?effectText({...main,binding:item.binding}):attributes.slice(0,2).join('，')||'需净化后查看属性收益';
 let preview=!worn&&item.pollution!=='uncleansed'?(proposed.length?'替换当前槽位后：'+proposed.map(effectText).join('；'):t.kind==='set'?'替换当前槽位后：尚未凑齐有效套装，或效果被更高档替代':'替换当前槽位后：'+(t.effects.length?'功能被同名更高档替代':'属性生效')):'';
 if(preview){const after=selectEquipmentEffects([...equipped.filter(i=>i.slot!==item.slot),item]);const lost=selectEquipmentEffects(equipped).filter(e=>{const n=after.findIndex(other=>equalEffect(e,other)&&bindingKey(e.binding??{})===bindingKey(other.binding??{}));if(n<0)return true;after.splice(n,1);return false;});if(lost.length)preview+='。不再生效：'+lost.map(effectText).join('；');}
 return {purpose,benefit,requirement,stacking,status,rows,preview,setBonuses,brief:`${purpose} · ${benefit}。${requirement}。${status}。`,count,worn};
}
