import type {RunSession} from '../../src/app/run-session';
import {SaveControls} from '../../src/ui/hud/save-controls';

export type SaveDisplayState='empty'|'resumable'|'busy'|'battle'|'quota'|'corrupt'|'conflict';
/** Static data projection into the unchanged production renderer. The real
 * session remains memoryOnly; no archive is read and no storage is enabled. */
export function saveDisplayControls(session:RunSession,state:SaveDisplayState,record:(action:string)=>void,update:()=>void){
 const reason={quota:'quota exceeded',corrupt:'存档损坏，原文件已保留',conflict:'存档已在其他页面更新'}[state as 'quota'|'corrupt'|'conflict']??'';
 const projection=new Proxy(session,{get(target,key,receiver){
  if(key==='memoryOnly')return false;
  if(key==='canResume')return !['empty','corrupt'].includes(state);
  if(key==='busy')return state==='busy';
  if(key==='saveFailed')return !!reason;
  if(key==='message')return reason;
  if(key==='startupNotice')return '';
  return Reflect.get(target,key,receiver);
 }});
 class DisplayControls extends SaveControls{
  override handle(action:string){
   if(!['save-now','save-export','menu-load-local','menu-load-file'].includes(action))return false;
   record('静态展示操作（不执行存档事务）：'+action);update();return true;
  }
 }
 return new DisplayControls(projection,()=>record('静态展示继续'),update);
}
