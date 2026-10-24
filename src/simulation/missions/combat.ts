import type {World} from '../world';
import type {Entity} from '../types';
export function inheritMissionSource(w:World,child:Entity,parent:Entity){
 if(!parent.mission)return;child.mission={...parent.mission,center:parent.mission.center?{...parent.mission.center}:undefined};
 const m=w.missions.active;if(child.owner==='zerg'&&m?.id===child.mission.taskId&&!m.enemyIds.includes(child.id))m.enemyIds.push(child.id);
}
export function missionDamage(w:World,source:Entity,...args:Parameters<World['hit']>){
 const previous=w.missions.packetSource;w.missions.packetSource=source;
 try{return w.hit(...args);}finally{w.missions.packetSource=previous;}
}
export const missionSupportAllowed=(source:Entity,target:Entity)=>!source.heldBy&&!target.heldBy&&(!source.mission?.holdout||!!target.mission?.holdout&&source.mission.taskId===target.mission.taskId);
