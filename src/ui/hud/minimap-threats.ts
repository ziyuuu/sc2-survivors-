import type {World} from '../../simulation/world';
import type {Point} from '../../simulation/types';
export interface MinimapThreat {point:Point;radius:number;kind:'arrival'|'attack'|'scan';end?:Point}
/** Presentation of existing telegraphs; does not create or advance an attack. */
export function minimapThreats(w:World):MinimapThreat[]{
 const result:MinimapThreat[]=[];
 if(w.hiveWarningPoint)result.push({point:w.hiveWarningPoint,radius:2.8,kind:'arrival'});
 for(const c of w.campaign18Runtime?.mainCombat?.casts??[]){
  if(c.kind==='bile')result.push({point:c.point,radius:c.radius,kind:'attack'});
  else result.push({point:c.origin,radius:c.radius,kind:'attack',end:{x:c.origin.x+Math.sin(c.angle)*c.range,z:c.origin.z+Math.cos(c.angle)*c.range}});
 }
 for(const c of w.enemySpecials.casts){
  if(c.kind==='bile'||c.kind==='acid')for(const p of c.points)result.push({point:p,radius:c.radius,kind:'attack'});
  else result.push({point:c.origin,radius:c.radius,kind:'attack',end:{x:c.origin.x+Math.sin(c.angle)*c.range,z:c.origin.z+Math.cos(c.angle)*c.range}});
 }
 for(const f of w.effects)if(f.until>w.time&&f.owner==='zerg'&&(f.kind==='scan-warning'||f.kind==='bile'))result.push({point:f.end,radius:f.radius,kind:f.kind==='scan-warning'?'scan':'attack'});
 for(const f of w.expedition.detectionFields)if(f.team==='enemy'&&f.until>w.time)result.push({point:f,radius:f.radius,kind:'scan'});
 return result;
}
