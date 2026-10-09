import * as THREE from 'three';
import type {BattleView} from '../../simulation/combat/battle-view';
import {AIR_HEIGHT} from '../../data/terrain';
/** Read only screen geometry; project canvas and fixed HUD rectangles onto each combat plane. */
export function captureBattleView(canvas:HTMLCanvasElement,camera:THREE.Camera):BattleView|undefined{
 const rect=canvas.getBoundingClientRect(),left=Math.max(0,rect.left),top=Math.max(0,rect.top),right=Math.min(innerWidth,rect.right),bottom=Math.min(innerHeight,rect.bottom);if(right-left<2||bottom-top<2)return;
 camera.updateMatrixWorld();const ray=new THREE.Raycaster(),plane=new THREE.Plane(),hit=new THREE.Vector3();
 const project=(r:{left:number;right:number;top:number;bottom:number},height:number)=>{
  plane.set(new THREE.Vector3(0,1,0),-height);const points=[];for(const [x,y] of [[r.left,r.top],[r.right,r.top],[r.right,r.bottom],[r.left,r.bottom]]){ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);if(!ray.ray.intersectPlane(plane,hit))return [];points.push({x:hit.x,z:hit.z});}return points;
 };
 const selector=document.body.classList.contains('native-hud')?'#topbar,#minimap,.native-map-utilities button,.native-army-frame,.native-command-frame,#army-toggle,#native-selection,#joystick,#unit-inspector,.fixed-hud':'#topbar,#minimap,#battle-console,#hero-skills,#skills,#joystick,#console-commands,#army-hud,#unit-inspector,.fixed-hud';
 const occluded=[...document.querySelectorAll<HTMLElement>(selector)].filter(el=>getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden').map(el=>el.getBoundingClientRect()).map(r=>({left:Math.max(left,r.left),right:Math.min(right,r.right),top:Math.max(top,r.top),bottom:Math.min(bottom,r.bottom)})).filter(r=>r.right-r.left>1&&r.bottom-r.top>1);
 const bounds={left,right,top,bottom};return {ground:project(bounds,0),air:project(bounds,AIR_HEIGHT),occludedGround:occluded.map(r=>project(r,0)),occludedAir:occluded.map(r=>project(r,AIR_HEIGHT))};
}
