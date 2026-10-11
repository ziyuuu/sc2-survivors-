import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Vector3} from 'three';
import {scenario,prepareTargets} from '../visual-plan-validation-20261009/scenario';
import {groups,themes} from '../visual-plan-validation-20261009/catalog';
import {CameraController} from '../../src/render/scene/camera-controller';
const root='reports/local/camera-calibration-20261011';
const rows=[];
for(const theme of themes)for(const id of ['marine','hydralisk','immortal']){
 const s=scenario(groups.find(g=>g.id===id)!,theme,1),w=s.world;
 w.runId='camera-calibration-fixture:'+id+':'+theme;
 for(const u of w.entities.values())u.stoppedUntil=u.nextShotAt=u.specialReady=1e9;
 prepareTargets(s);for(const {entity:u}of s.subjects)u.stoppedUntil=u.nextShotAt=u.specialReady=0;
 const camera=new PerspectiveCamera(),controller=new CameraController(camera);controller.resize(1440,900,false,{left:0,right:0,top:0,bottom:0});
 const update=()=>controller.update({x:w.anchor.x,y:w.terrain!.height(w.anchor),z:w.anchor.z},1/60,false);
 w.paused=false;for(let n=0;n<60;n++){w.step();update();}
 for(const {entity:u}of s.subjects)u.stoppedUntil=u.nextShotAt=u.specialReady=0;
 assert.ok(w.issueMove({x:0,z:9}));for(let n=0;n<30;n++){w.step();update();}
 const startTick=w.tick;
 for(let n=0;n<1200;n++){
  const phase=Math.min(4,Math.floor(n/240));if(n%240===0){w.input=[{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1},{x:1,z:0}][phase];controller.setZoom([1,.7,1.6,1,.7][phase]);}
  w.step();update();
  if([360,600,960].includes(n+1)){
   const anchor=new Vector3(w.anchor.x,w.terrain!.height(w.anchor),w.anchor.z).project(camera);
   const subjects=s.subjects.map(({identity,entity:u})=>{const projected=new Vector3(u.x,w.terrain!.height(u),u.z).project(camera);return {identity:identity.id,x:u.x,z:u.z,hp:u.hp,action:u.action,distanceToAnchor:Math.hypot(u.x-w.anchor.x,u.z-w.anchor.z),projectedFoot:projected.toArray(),footInside:Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1};});
   rows.push({theme,group:id,seconds:(n+1)/60,tick:w.tick,startTick,anchor:{...w.anchor},anchorNdc:anchor.toArray(),camera:controller.report(),subjects});
  }
 }
}
const report={passed:true,at:new Date().toISOString(),method:'Bounded deterministic 60 Hz native-simulation replay of the recorded fixture and input sequence, with the unchanged production camera controller. Tick-exact direction boundaries here differ by up to a browser frame from wall-clock recording; these rows do not replace or relabel video evidence. Projections are unit feet, not posed-body visibility.',rows};
await fs.writeFile(root+'/follow-analysis.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(rows.filter(r=>r.seconds===10).map(r=>({theme:r.theme,group:r.group,anchor:r.anchor,visibleFeet:r.subjects.filter(u=>u.footInside).length,distances:r.subjects.map(u=>+u.distanceToAnchor.toFixed(2)),anchorNdc:r.anchorNdc})),null,2));
