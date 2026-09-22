import {CONTROL_COMBAT as C} from '../../data/control-tuning';
import type {Entity,Body,Point} from '../types';
/** A local combat preference. This function never creates a movement command. */
export function autoTargetScore(u:Entity,b:Body,direction:Point,inRange:boolean,economic:boolean){
 const dx=b.x-u.x,dz=b.z-u.z,d=Math.hypot(dx,dz),mag=Math.hypot(direction.x,direction.z);
 const alignment=mag>.01&&d>.01?(dx*direction.x+dz*direction.z)/(mag*d):1;
 return d+(inRange?0:30)+(economic?100:0)+(1-alignment)*C.forwardPreference
  +b.hp/Math.max(1,b.maxHp)*.75-(u.attackTarget===b.id?C.retention:0);
}
