import {Raycaster,Vector2,Vector3,Box3,type Object3D} from 'three';
import type {BattleRenderer} from '../../render/scene/battle-renderer';
import type {World} from '../../simulation/world';
/** Inspection only: no selection is written to World and no movement is issued. */
export function pickFriendly(x:number,y:number,view:BattleRenderer,w:World):number|null {
 const rect=view.canvas.getBoundingClientRect();if(x<rect.left||x>rect.right||y<rect.top||y>rect.bottom)return null;
 const ray=new Raycaster();ray.setFromCamera(new Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),view.camera);
 const terrain:Object3D[]=[];view.scene.traverseVisible(o=>{if(['char-traversable-ground','endless-traversable-ground','char-solid-cliff-faces'].includes(o.name))terrain.push(o);});
 const wall=ray.intersectObjects(terrain,true)[0]?.distance??Infinity,box=new Box3(),point=new Vector3();let closest=wall+.08,id:number|null=null;
 const margin=(view.camera.top-view.camera.bottom)/Math.max(1,rect.height)*5;
 for(const u of w.allies()){if(u.hp<=0)continue;const height=u.flying?5.6:w.terrain?.height(u)??0,r=u.unitRadius+margin;box.min.set(u.x-r,height,u.z-r);box.max.set(u.x+r,height+Math.max(1.3,u.unitRadius*2),u.z+r);if(ray.ray.intersectBox(box,point)){const d=point.distanceTo(ray.ray.origin);if(d<closest){closest=d;id=u.id;}}}
 return id;
}
