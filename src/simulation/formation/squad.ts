import type {Entity,Point} from '../types';
import type {TerrainQuery} from '../../data/map-definition';
import {FORMATION,type Obstacle} from '../../data/game';
import {blocked,distance,angleDelta,clearLine} from '../movement/steering';
const order=['marine','marauder','hellion','tank','medivac'];
/** Slots are destinations, never positions. Only the small friendly squad is planned here.
 * Open ground uses ranks three abreast; a terrain-constrained search folds those ranks
 * into distinct reachable slots instead of sending every blocked slot to the anchor. */
export class SquadFormation {
 private goals=new Map<number,Point>();private until=-1;private anchor={x:Infinity,z:Infinity,facing:0};private roster='';
 plan(units:Entity[],anchor:Point&{facing:number},now:number,half:number,obstacles:Obstacle[],terrain?:TerrainQuery){
  const roster=units.map(u=>u.id).join(',');
  if(now<this.until&&roster===this.roster&&distance(anchor,this.anchor)<.65&&Math.abs(angleDelta(this.anchor.facing,anchor.facing))<.15)return;
  this.roster=roster;this.until=now+FORMATION.refreshSeconds;this.anchor={...anchor};this.goals.clear();
  const sin=Math.sin(anchor.facing),cos=Math.cos(anchor.facing),placed:{p:Point;r:number;air:boolean}[]=[];
  const point=(back:number,lane:number)=>({x:anchor.x-sin*back+cos*lane,z:anchor.z-cos*back-sin*lane});
  const legal=(p:Point,u:Entity)=>Math.abs(p.x)+u.unitRadius<half&&Math.abs(p.z)+u.unitRadius<half&&(u.flying||!blocked(p,u.unitRadius,obstacles)&&(!terrain||terrain.canOccupy(p,u.unitRadius)));
  const separate=(p:Point,u:Entity)=>placed.every(s=>s.air!==u.flying||distance(s.p,p)>s.r+u.unitRadius+.14);
  let back=FORMATION.frontOffset;
  for(const type of order){const group=units.filter(u=>u.unitType===type).sort((a,b)=>a.slot-b.slot);if(!group.length)continue;
   const radius=Math.max(...group.map(u=>u.unitRadius)),spacing=radius*2+FORMATION.bodyGap,columns=Math.min(FORMATION.columns,group.length),rows=Math.ceil(group.length/columns);
   if(type==='medivac')back=Math.max(3,back-1.5);
   for(let i=0;i<group.length;i++){const u=group[i],row=Math.floor(i/columns),count=Math.min(columns,group.length-row*columns),lane=(i%columns-(count-1)/2)*spacing;
    const desired=point(back+row*spacing,lane);let chosen:Point|undefined;
    if(legal(desired,u)&&separate(desired,u)&&(u.flying||clearLine(anchor,desired,u.unitRadius,obstacles,terrain)))chosen=desired;
    if(!chosen){const candidates:{p:Point;score:number}[]=[];
     // Search around this rank, including lateral room and the front shoulders. No shared fallback.
     for(let longitudinal=-2;longitudinal<=FORMATION.searchBack;longitudinal+=.7)for(let lateral=-FORMATION.searchHalfWidth;lateral<=FORMATION.searchHalfWidth;lateral+=.7){const p=point(longitudinal,lateral);if(!legal(p,u)||!separate(p,u))continue;
      const score=distance(p,desired)+Math.max(0,-longitudinal)*.4;
      candidates.push({p,score});}
     candidates.sort((a,b)=>a.score-b.score);
     chosen=candidates.find(({p})=>u.flying||clearLine(anchor,p,u.unitRadius,obstacles,terrain))?.p;
     // Existing legal positions remain a last resort in a packed cul-de-sac, never a relocation.
     chosen??=legal(u,u)&&separate(u,u)?{x:u.x,z:u.z}:candidates[0]?.p??{x:anchor.x,z:anchor.z};
    }
    this.goals.set(u.id,chosen);placed.push({p:chosen,r:u.unitRadius,air:u.flying});
   }
   back+=rows*spacing+FORMATION.rowGap;
  }
 }
 goal(u:Entity){return this.goals.get(u.id)??{x:u.x,z:u.z};}
}
