import type {World} from '../world';
import type {Entity,Point} from '../types';
import {blocked} from '../movement/steering';

export interface TalentTransferPlan {origin:Point;direction:Point;target:Point;mapHash:string;stage:number;endlessRound:number;readyAt:number;participants:{id:number;generation:number}[];}
export interface TalentTransferPreview {ok:boolean;reason:string;target:Point;participantIds:number[];positions:{id:number;x:number;z:number}[];}
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const directionOf=(angle:number)=>({x:Math.sin(angle),z:Math.cos(angle)});
const currentRegion=(w:World)=>({mapHash:w.runConfig?.mapHash??'',stage:w.stage,endlessRound:w.endless?.round??0});
const defaultParticipants=(w:World,origin:Point)=>w.allies().filter(unit=>eligibleParticipant(w,unit,origin)).map(unit=>unit.id);

function eligibleParticipant(w:World,unit:Entity,origin:Point){return unit.team==='player'&&unit.hp>0&&!unit.flying&&!unit.temporary&&!unit.summonKind&&distance(unit,origin)<=12&&unit.mode!=='siege'&&unit.nativeMode!=='lurker_burrowed'&&unit.modeTimer<=0&&(unit.nativeModeUntil??0)<=w.time&&!(unit.lastStandUntil&&unit.lastStandUntil>w.time)&&(unit.stoppedUntil??0)<=w.time&&!w.heroCasts.some(cast=>cast.source===unit.id&&cast.at>w.time);}
function targetLegal(w:World,origin:Point,direction:Point,target:Point){const dx=target.x-origin.x,dz=target.z-origin.z,length=Math.hypot(dx,dz);
 return Number.isFinite(length)&&length>=2-1e-8&&length<=16+1e-8&&(dx*direction.x+dz*direction.z)>=length*.5-1e-8&&Math.abs(target.x)<w.mapHalf&&Math.abs(target.z)<w.mapHalf;
}
function grid(center:Point){const candidates:{x:number;z:number;d2:number;angle:number}[]=[];for(let ix=-12;ix<=12;ix++)for(let iz=-12;iz<=12;iz++){const dx=ix*.5,dz=iz*.5,d2=dx*dx+dz*dz;if(d2>36)continue;candidates.push({x:center.x+dx,z:center.z+dz,d2,angle:(Math.atan2(dx,dz)+Math.PI*2)%(Math.PI*2)});}
 return candidates.sort((a,b)=>a.d2-b.d2||a.angle-b.angle||a.x-b.x||a.z-b.z);
}
function landing(w:World,target:Point,participants:Entity[]){const selected=new Set(participants.map(unit=>unit.id)),placed:{id:number;x:number;z:number;radius:number}[]=[],obstacles=[...w.entities.values()].filter(unit=>unit.hp>0&&!unit.flying&&!selected.has(unit.id));
 const pendingPods=w.pods.filter(pod=>pod.hp>0&&['falling','active','opening'].includes(pod.status));
 const structures=[...w.fortifications.values(),...w.expansionHives.values(),...(w.hive&&w.hive.hp>0?[w.hive]:[]),...[...w.economicTargets.values()].filter(unit=>unit.status==='active')];
 const candidates=grid(target);
 for(const unit of [...participants].sort((a,b)=>b.unitRadius-a.unitRadius||a.id-b.id)){
  const radius=unit.unitRadius,spot=candidates.find(point=>Math.abs(point.x)+radius<w.mapHalf&&Math.abs(point.z)+radius<w.mapHalf&&!blocked(point,radius,w.obstacles)&&(!w.terrain||w.terrain.canOccupy(point,radius))&&
   !obstacles.some(other=>distance(point,other)<radius+other.unitRadius+.1)&&!placed.some(other=>distance(point,other)<radius+other.radius+.1)&&
   !pendingPods.some(pod=>distance(point,pod)<radius+pod.unitRadius+.1)&&!structures.some(structure=>distance(point,structure)<radius+structure.unitRadius+.1));
  if(!spot)return null;placed.push({id:unit.id,x:spot.x,z:spot.z,radius});
 }
 return placed.map(({id,x,z})=>({id,x,z}));
}
function previewFor(w:World,origin:Point,direction:Point,target:Point,ids:number[],checkAvailability:boolean):TalentTransferPreview{
 const fail=(reason:string):TalentTransferPreview=>({ok:false,reason,target,participantIds:ids,positions:[]});
 if(checkAvailability&&(w.phase!=='battle'||w.paused||w.requiresPlayerDecision||w.time+1e-8<w.airliftReady||w.talentTransferPlan||!w.talent('airlift')))return fail('能力尚未就绪');
 if(!targetLegal(w,origin,direction,target))return fail('目标须在前方2—16距离、左右60度内');
 if(!ids.length||new Set(ids).size!==ids.length)return fail('至少选择一名合法地面成员');
 const units=ids.map(id=>w.entities.get(id));if(units.some(unit=>!unit||!eligibleParticipant(w,unit,origin)))return fail('参与者已离队、处于不可转移状态或超出范围');
 const positions=landing(w,target,units as Entity[]);return positions?{ok:true,reason:'',target,participantIds:ids,positions}:fail('目标区域容不下全部成员');
}
export function defaultTalentTransferTarget(w:World):Point {const forward=directionOf(w.anchor.facing);return {x:w.anchor.x+forward.x*12,z:w.anchor.z+forward.z*12};}
export function previewTalentTransfer(w:World,target:Point,participantIds?:number[]):TalentTransferPreview {const origin={x:w.anchor.x,z:w.anchor.z},direction=directionOf(w.anchor.facing),ids=participantIds??defaultParticipants(w,origin);return previewFor(w,origin,direction,target,ids,true);}
export function prepareTalentTransfer(w:World,target:Point,participantIds?:number[]){const preview=previewTalentTransfer(w,target,participantIds);if(!preview.ok)return false;
 const region=currentRegion(w),rank=w.talent('quick_siege'),duration=w.expedition.race==='protoss'&&rank?Math.max(.25,2*(1-.33*rank)):2;
 w.talentTransferPlan={origin:{x:w.anchor.x,z:w.anchor.z},direction:directionOf(w.anchor.facing),target:{x:target.x,z:target.z},...region,readyAt:w.time+duration,participants:preview.participantIds.map(id=>({id,generation:w.entities.get(id)!.bornAt}))};
 w.announce((w.expedition.race==='terran'?'空运':w.expedition.race==='zerg'?'地下转移':'战场召回')+'准备中 · '+duration.toFixed(2)+' 秒');w.changed();return true;
}
export function cancelTalentTransfer(w:World){if(!w.talentTransferPlan)return false;w.talentTransferPlan=null;w.announce('转移已取消 · 未消耗冷却');w.changed();return true;}
export function talentTransferContains(w:World,id:number){return !!w.talentTransferPlan?.participants.some(participant=>participant.id===id);}
export function finishTalentTransfer(w:World){const plan=w.talentTransferPlan;if(!plan||w.time+1e-8<plan.readyAt)return false;
 const region=currentRegion(w);if(w.phase!=='battle'||region.mapHash!==plan.mapHash||region.stage!==plan.stage||region.endlessRound!==plan.endlessRound){cancelTalentTransfer(w);return false;}
 const alive=plan.participants.filter(item=>{const unit=w.entities.get(item.id);return !!unit&&unit.hp>0&&unit.bornAt===item.generation;}).map(item=>item.id);
 const preview=previewFor(w,plan.origin,plan.direction,plan.target,alive,false);if(!preview.ok){cancelTalentTransfer(w);return false;}
 for(const item of preview.positions){const unit=w.entities.get(item.id)!;unit.x=item.x;unit.z=item.z;unit.prev={x:item.x,z:item.z};unit.velocity={x:0,z:0};}
 w.talentTransferPlan=null;w.airliftReady=w.time+(w.talent('airlift')===1?240:120)*Math.max(.5,1-.08*w.talent('skill_recovery'));w.announce('小队转移完成');w.changed();return true;
}
