import type {TerrainQuery} from '../../data/map-definition';
import type {Body,Point} from '../types';
import {AIR_HEIGHT} from '../../data/terrain';

/** The endless field has no campaign elevation, ramp, or chapter-opening data. */
export class FlatTerrain implements TerrainQuery {
 static readonly id='endless-flat-v1';
 static readonly half=80;
 static readonly openHalf=76;
 height(_point:Point){return 0;}
 flatHeight(a:Point,b:Point,r=0){return this.canOccupy(a,r)&&this.canOccupy(b,r)?0:-1;}
 region(p:Point){return Math.floor((p.x+80)/4)+40*Math.floor((p.z+80)/4);}
 canOccupy(p:Point,r:number){return Number.isFinite(p.x)&&Number.isFinite(p.z)&&Number.isFinite(r)&&r>=0&&Math.abs(p.x)+r<=FlatTerrain.openHalf&&Math.abs(p.z)+r<=FlatTerrain.openHalf;}
 canStep(a:Point,b:Point,r:number){return this.canOccupy(a,r)&&this.canOccupy(b,r);}
 walkLine(a:Point,b:Point,r:number){return this.canStep(a,b,r);}
 sameContactLayer(_a:Point,_b:Point){return true;}
 lineOfFire(_a:Point,_b:Point,_airA=false,_airB=false,_melee=false){return true;}
 bodyHeight(b:Pick<Body,'x'|'z'|'flying'>){return b.flying?AIR_HEIGHT:0;}
 routeGoal(a:Point,b:Point,r:number,_half:number){return this.canOccupy(b,r)?b:a;}
 isOpen(p:Point){return this.canOccupy(p,0);}
 connectedLocations(_origin:Point,r:number,space:number){const points:Point[]=[];for(let z=-72;z<=72;z+=4)for(let x=-72;x<=72;x+=4){const p={x,z};if(this.canOccupy(p,Math.max(r,space)))points.push(p);}return points;}
}
