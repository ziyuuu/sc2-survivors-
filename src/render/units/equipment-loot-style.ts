import type {EquipmentItem,Quality} from '../../simulation/starship/types';
import {equipmentTemplate} from '../../simulation/starship/catalog';

export type EquipmentDropShape='offense'|'defense'|'module';
export const equipmentDropShape=(item:Pick<EquipmentItem,'slot'>):EquipmentDropShape=>item.slot.startsWith('offense')?'offense':item.slot.startsWith('defense')?'defense':'module';
export const EQUIPMENT_LOOT_STYLE:Record<Quality,{color:number;css:string;beam:number;glow:number;labelDistance:number}>={
 1:{color:0xffffff,css:'#ffffff',beam:2.6,glow:.6,labelDistance:7},
 2:{color:0x6de690,css:'#91edac',beam:3.0,glow:.7,labelDistance:10},
 3:{color:0x549eff,css:'#8cbcff',beam:3.5,glow:.82,labelDistance:15},
 4:{color:0xbf6dff,css:'#d3a0ff',beam:4.4,glow:1.05,labelDistance:Infinity},
 5:{color:0xffa93b,css:'#ffc36c',beam:5.4,glow:1.3,labelDistance:Infinity}
};
export function equipmentDropName(item:EquipmentItem){
 const t=equipmentTemplate(item.template),shape=equipmentDropShape(item),part=shape==='offense'?'武器组件':shape==='defense'?'防护组件':'功能模块';
 return (item.pollution==='uncleansed'?'污染 · ':item.pollution==='cleansed'?'净化 · ':'')+(t.kind==='attribute'?part:t.name);
}
/** Native-clock animation; a collected item does not wait for this animation to pay out. */
export function equipmentDropLift(age:number){
 if(age<0||!Number.isFinite(age)||age>=.7)return 0;
 if(age<.38){const t=age/.38;return .9*(1-t*t);}
 return Math.sin((age-.38)/.32*Math.PI)*.18;
}
export const EQUIPMENT_ABSORB_SECONDS=.48;
export function equipmentAbsorb(from:{x:number;y:number;z:number},to:{x:number;y:number;z:number},age:number){
 const t=Math.max(0,Math.min(1,age/EQUIPMENT_ABSORB_SECONDS)),p=t*t*(3-2*t);
 return {x:from.x+(to.x-from.x)*p,y:from.y+(to.y-from.y)*p+Math.sin(t*Math.PI)*.75,z:from.z+(to.z-from.z)*p,scale:Math.max(.001,1-t*.9)};
}
export interface LootLabelCandidate {id:string;x:number;y:number;width:number;quality:Quality;distance:number;name:string}
export interface LootLabelRect {left:number;top:number;right:number;bottom:number}
const intersects=(a:LootLabelRect,b:LootLabelRect)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
/** Keep every object in the world; only nearby name tags are combined. */
export function layoutEquipmentLabels(candidates:LootLabelCandidate[],width:number,height:number,occluded:LootLabelRect[]=[]){
 const placed:(LootLabelCandidate&LootLabelRect&{extra:number})[]=[],unplaced:LootLabelCandidate[]=[];
 const limit=width<600?6:12;
 for(const c of [...candidates].sort((a,b)=>b.quality-a.quality||a.distance-b.distance||a.id.localeCompare(b.id))){
  const cluster=placed.find(p=>Math.hypot(p.x-c.x,p.y-c.y)<56);
  if(cluster){cluster.extra++;continue;}
  let added=false;
  if(placed.length<limit)for(const offset of [0,-25,25,-50,50]){
   const left=Math.max(6,Math.min(width-c.width-6,c.x-c.width/2)),top=c.y-30+offset,rect={left,top,right:left+c.width,bottom:top+22};
   if(top<8||rect.bottom>height-8||occluded.some(r=>intersects(rect,r))||placed.some(r=>intersects(rect,{left:r.left-3,right:r.right+3,top:r.top-3,bottom:r.bottom+3})))continue;
   placed.push({...c,...rect,extra:0});added=true;break;
  }
  if(!added)unplaced.push(c);
 }
 // Attach a suppressed local name to the closest visible label without inventing a new item.
 for(const c of unplaced){const near=[...placed].sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y))[0];if(near&&Math.hypot(near.x-c.x,near.y-c.y)<140)near.extra++;}
 return placed;
}
