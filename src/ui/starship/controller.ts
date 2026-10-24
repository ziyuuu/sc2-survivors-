import type {EquipmentSlot,Quality,EquipmentResult} from '../../simulation/starship/types';
import {failure,success} from '../../simulation/starship/types';
import {equipmentTemplate} from '../../simulation/starship/catalog';
import * as rules from '../../simulation/starship/inventory';
import type {StarshipHost} from './host';

export type ShipCommand=
 |{type:'equip';id:string;slot:EquipmentSlot}|{type:'unequip';slot:EquipmentSlot}|{type:'pickup';id:string}
 |{type:'lock'|'favorite';id:string;value:boolean}
 |{type:'discard'|'dismantle'|'drop';ids:string[]}
 |{type:'bulkDiscard';threshold:1|2|3}
 |{type:'cleanse';id:string}|{type:'expand';level:number}
 |{type:'craft';quality:Quality;setTemplate?:string;slot?:EquipmentSlot}
 |{type:'rerollAffix';id:string;index:number}|{type:'rerollElite';ids:string[]}
 |{type:'finishReroll';receipt:string;choice:number|null}
 |{type:'savePreset'|'applyPreset';index:number}
 |{type:'renamePreset';index:number;name:string}
 |{type:'begin'|'continue'|'extract'};
export interface CommandEnvelope {id:string;revision:number;managementRevision:number;command:ShipCommand}
export interface BatchPreview {ids:string[];skipped:{id:string;reason:string}[];dust:number}
/** Shared by the standalone and real World hosts. DOM handlers have no mutation authority. */
export class StarshipController {
 private receipts=new Map<string,{signature:string;result:EquipmentResult<unknown>}>();
 constructor(readonly host:StarshipHost){}
 protectedReason(id:string,operation:'discard'|'dismantle'|'rerollElite'|'drop'){
  const a=this.host.account(),m=this.host.management,i=a.items[id],loc=a.locations[id];
  if(!i||!loc)return '物品已不存在';
  if(loc.kind==='equipped')return '已穿戴';
  if(a.run&&!a.run.ended&&a.run.locked.has(id))return '系统奖励来源锁定';
  if(m.locked.has(id))return '手动锁定';if(m.favorites.has(id))return '已收藏';
  if(operation==='dismantle'||operation==='rerollElite'){
   if(operation==='dismantle'&&this.host.phase()==='intermission'){if(loc.kind!=='backpack'||loc.run!==a.run?.id)return '不在当前背包';}
   else {if(!['outside','settled'].includes(this.host.phase()))return '只能在局外处理';if(loc.kind!=='warehouse')return '装备不在仓库';}
   if(i.pollution==='uncleansed')return '须先清洗';
   if(operation==='rerollElite'&&(equipmentTemplate(i.template)?.binding!=='elite'||!i.binding.elite))return '不支持精英绑定洗练';
  }else if(operation==='drop'&&(!a.run||a.run.ended||loc.kind!=='backpack'||loc.run!==a.run.id))return '不在当前背包';
  else if(a.run&&!a.run.ended&&(!['backpack','ground'].includes(loc.kind)||!('run' in loc)||loc.run!==a.run.id))return '不在当前战场';
  return '';
 }
 preview(ids:readonly string[],operation:'discard'|'dismantle'|'rerollElite'|'drop'):BatchPreview {
  const result:BatchPreview={ids:[],skipped:[],dust:0};for(const id of new Set(ids)){const reason=this.protectedReason(id,operation);if(reason)result.skipped.push({id,reason});else{result.ids.push(id);const q=this.host.account().items[id].quality;result.dust+=operation==='dismantle'?rules.DISMANTLE_VALUES[q]:operation==='rerollElite'?rules.CRAFT_PRICES[q]/5:0;}}return result;
 }
 previewDiscard(threshold:1|2|3){return this.preview(rules.itemsAt(this.host.account(),'backpack').filter(i=>i.quality<=threshold).map(i=>i.id),'discard');}
 execute(envelope:CommandEnvelope):EquipmentResult<unknown>{
  const signature=JSON.stringify(envelope),cached=this.receipts.get(envelope.id);if(cached)return cached.signature===signature?cached.result:failure('重复请求内容不一致');
  const a=this.host.account(),m=this.host.management,c=envelope.command,phase=this.host.phase();
  if(!envelope.id||envelope.revision!==a.revision||envelope.managementRevision!==m.revision)return failure('状态已变化，请重新查看后操作');
  let result:EquipmentResult<unknown>;
  if(a.modification&&c.type!=='finishReroll')return failure('请先选择洗练结果或保留原项');
  const outside=['outside','settled'].includes(phase);
  if(['cleanse','expand','craft','rerollAffix','rerollElite','savePreset','applyPreset','renamePreset'].includes(c.type)&&!outside)return failure('该操作只能在局外进行');
  if(c.type==='dismantle'&&!outside&&phase!=='intermission')return failure('战斗中不能分解');
  if(['equip','unequip','applyPreset'].includes(c.type)&&phase==='battle')return failure('战斗中不能换装；暂停不会开放换装');
  switch(c.type){
   case 'equip':result=this.host.equip(c.id,c.slot,a.revision);break;
   case 'unequip':result=this.host.unequip(c.slot,a.revision);break;
   case 'pickup':result=phase==='battle'||phase==='intermission'?this.host.pickup(c.id):failure('当前没有可拾取的战利品');break;
   case 'lock':case 'favorite':{
    if(!a.items[c.id])return failure('装备已不存在');if(c.type==='lock'&&a.run&&!a.run.ended&&a.run.locked.has(c.id))return failure('系统奖励来源锁定不能手动解除');
    const set=c.type==='lock'?m.locked:m.favorites;c.value?set.add(c.id):set.delete(c.id);m.revision++;result=success(undefined);break;
   }
   case 'discard':case 'dismantle':case 'drop':case 'bulkDiscard':{
    if(c.type==='bulkDiscard'&&![1,2,3].includes(c.threshold))return failure('请选择白色、绿色及以下或蓝色及以下');
    const op=c.type==='dismantle'?'dismantle':c.type==='drop'?'drop':'discard',p=c.type==='bulkDiscard'?this.previewDiscard(c.threshold):this.preview(c.ids,op);
    if(!p.ids.length)return failure('没有可处理的物品；已跳过锁定、收藏及禁止处理项');
    if(op==='dismantle')result=this.host.dismantle(p.ids,a.revision);
    else if(op==='drop'){for(const id of p.ids){const r=this.host.drop(id,a.revision);if(!r.ok)return r;}result=success(p);}
    else{for(const id of p.ids){const r=rules.discardEquipment(a,id,a.revision);if(!r.ok)return r;}result=success(p);}
    break;
   }
   case 'cleanse':result=rules.cleanseEquipment(a,c.id,a.revision);break;
   case 'expand':result=rules.expandWarehouse(a,c.level,a.revision);break;
   case 'craft':result=rules.craftEquipment(a,{quality:c.quality,race:this.host.race(),setTemplate:c.setTemplate,slot:c.slot,receipt:envelope.id},a.revision);break;
   case 'rerollAffix':result=rules.beginAffixReroll(a,c.id,c.index,a.revision);break;
   case 'rerollElite':{const p=this.preview(c.ids,'rerollElite');result=p.ids.length?rules.beginEliteReroll(a,p.ids,a.revision):failure('没有可洗练物品；已跳过锁定、收藏及不合法项');break;}
   case 'finishReroll':result=rules.finishEquipmentReroll(a,c.receipt,c.choice);break;
   case 'savePreset':case 'applyPreset':case 'renamePreset':{
    if(!Number.isInteger(c.index)||c.index<0||c.index>2)return failure('每族有三个预设位');
    if(c.type==='renamePreset'){
     const name=c.name.trim();if(!name||Array.from(name).length>24||/[\u0000-\u001f\u007f]/.test(name))return failure('请输入 1–24 个字的单行名称');
     m.presetNames[this.host.race()][c.index]=name;m.revision++;result=success(undefined);
    }
    else if(c.type==='savePreset'){m.presets[this.host.race()][c.index]={...a.equipped[this.host.race()]};m.revision++;result=success(undefined);}
    else{const preset=m.presets[this.host.race()][c.index];result=preset?this.host.loadout(preset,a.revision):failure('这个预设尚未保存');}break;
   }
   case 'begin':result=outside&&this.host.begin?this.host.begin():failure('当前不能出征');break;
   case 'continue':result=phase==='intermission'&&this.host.continue?this.host.continue():failure('当前不能继续关卡');break;
   case 'extract':result=(this.host.canExtract?.()??phase==='intermission')&&this.host.extract?this.host.extract():failure('当前尚未到撤退节点');break;
  }
  this.receipts.set(envelope.id,{signature,result});if(result.ok)this.host.notify();return result;
 }
}
