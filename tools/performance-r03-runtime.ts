import type {boot} from '../src/app/bootstrap';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {installPerformanceR02} from './performance-r02-runtime';
/** Diagnostics only; the ordinary game does not import this module. */
export function installPerformanceR03(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceR02(app);
 const v:any=app.view,w=app.world,a=(window as any).__B02__,setup=(window as any).__R02__.setup;
 let render:typeof v.render|null=null;
 const stop=()=>{if(render)return;render=v.render;v.render=()=>{};};
 const resume=()=>{if(render){v.render=render;render=null;}};
 const draw=(variant='candidate',dt=0,alpha=1)=>(variant==='baseline'?(window as any).R03Baseline.BattleRenderer:BattleRenderer).prototype.render.call(v,dt,alpha);
 (window as any).__R03__={...app,setup,stop,resume,draw,settle:()=>{v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);},
  invalidate:()=>{v.stillPresentation=null;},
  snapshot:()=>({world:a.snapshot(),camera:{matrix:v.camera.matrixWorld.toArray(),projection:v.camera.projectionMatrix.toArray()},viewport:[v.viewportWidth,v.viewportHeight],
   labels:[...v.labelLayer.children].map((el:any)=>({class:el.className,hidden:el.hidden,text:el.textContent,style:el.getAttribute('style')})),
   source:v.sourceCombatEffects.report(),equipment:v.equipmentDrops.report(),epoch:v.contextEpoch}),
 };
}
