import type {Point,Body} from '../simulation/types';
export interface MapPlacement {type:string;assetId?:string;position:number[];rotation:number;scale:number[];modelScale?:number[];tint?:string;unit:boolean;blockerSize?:number;pose?:string}
export interface MapDefinition {version:1;source:{name:string;sha256:string;worldUnitsPerSc2Unit:number};width:number;height:number;bounds:number[];origin:number[];start:Point;hive:Point;heights:number[];syncHeights:number[];levels:number[];walkWidth:number;walkHeight:number;cellSize:number;walk:number[];opening:number[];reveal:number[];uvTiling?:number[];clearance:number[];placements:MapPlacement[];ramps:Record<string,string>[];stageAreas:number[];cliffs?:MapPlacement[]}
export interface TerrainQuery {
 height(p:Point):number;flatHeight(a:Point,b:Point,r?:number):number;region(p:Point):number;canOccupy(p:Point,r:number):boolean;canStep(a:Point,b:Point,r:number):boolean;walkLine(a:Point,b:Point,r:number):boolean;sameContactLayer(a:Point,b:Point):boolean;lineOfFire(a:Point,b:Point,airA?:boolean,airB?:boolean,melee?:boolean):boolean;bodyHeight(b:Pick<Body,'x'|'z'|'flying'>):number;routeGoal(a:Point,b:Point,r:number,half:number):Point;
 connectedLocations?(origin:Point,r:number,space:number):Point[];readonly definition?:MapDefinition;setStage?(stage:number):void;isOpen?(p:Point):boolean;
}
