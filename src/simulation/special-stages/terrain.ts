import {FlatTerrain} from '../movement/flat-terrain';
import {blocked} from '../movement/steering';
import type {Point} from '../types';
import type {Obstacle} from '../../data/game';
import type {SpecialStageKind} from './state';
import {CROSSING_WALLS,crossingWallBetween} from './crossing-layout';
/** Original flat Char surface, with separate bounded challenge geometry. */
export class SpecialTerrain extends FlatTerrain {
 readonly walls:Obstacle[];
 constructor(readonly kind:SpecialStageKind){super();this.walls=kind==='crossing'?CROSSING_WALLS.map(o=>({...o})):[];}
 get extent(){return this.kind==='crossing'?{x:20,z:54}:this.kind==='dodge'?{x:18,z:18}:{x:30,z:25};}
 override canOccupy(p:Point,r:number){const e=this.extent;return super.canOccupy(p,r)&&Math.abs(p.x)+r<=e.x&&Math.abs(p.z)+r<=e.z&&!blocked(p,r,this.walls);}
 override canStep(a:Point,b:Point,r:number){return this.canOccupy(b,r)&&(this.kind!=='crossing'||!crossingWallBetween(a,b,r));}
 override walkLine(a:Point,b:Point,r:number){return this.canOccupy(a,r)&&this.canStep(a,b,r);}
 override lineOfFire(a:Point,b:Point,airA=false,airB=false,_melee=false){return airA||airB||this.kind!=='crossing'||!crossingWallBetween(a,b);}
 override connectedLocations(_origin:Point,r:number,space:number){const e=this.extent,out:Point[]=[];for(let z=-e.z+2;z<e.z-1;z+=2)for(let x=-e.x+2;x<e.x-1;x+=2){const p={x,z};if(this.canOccupy(p,Math.max(r,space)))out.push(p);}return out;}
}
