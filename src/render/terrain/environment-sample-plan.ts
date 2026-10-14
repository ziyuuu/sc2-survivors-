import {ENVIRONMENT_COMPOSITIONS,type SceneryItem} from './environment-compositions';
import type {MapPlacement} from '../../data/map-definition';
import type {RadialTerrain} from '../../data/campaign-map';
import {createCampaignLandscape,type CampaignTheme} from '../../data/campaign-landscape';

export interface EnvironmentSampleSite {id:string;label:string;x:number;z:number;radius:number;kind:'cluster'|'surface'|'boundary';angle?:number}
export interface SampleBoundary {x:number;z:number;angle:number;rx:number;rz:number;boundRadius:number;minimumClearance:number;lowered:boolean;floor:number;seed:number}
export interface EnvironmentSamplePlan {placements:MapPlacement[];assetIds:string[];sites:EnvironmentSampleSite[];boundary:SampleBoundary;solidFor:(p:MapPlacement)=>{x:number;z:number;r:number}|undefined;groundHeight:(x:number,z:number)=>number}
const prefix='model.map.';
const labels:Record<CampaignTheme,string[]>={industrial:['装卸堆场','管道维修点','货车作业角','破损铺装','厂区残墙'],'mar-sara':['灌木碎石','沙脚岩群','枯树仙人掌','干河床过渡','自然岩壁'],char:['冷却岩堆','高岩灰脚','气孔灰烬','灰地过渡','熔岩岸'],ice:['半埋补给点','雪中管线','积雪岩群','压雪旧路','冰岸与冻水'],frontier:['矿石簇','吊机作业角','废弃机械','运输路','矿坑岩壁']};
const indices:Record<CampaignTheme,number[]>={industrial:[0,3,4],'mar-sara':[1,2,8],char:[0,2,8],ice:[0,2,4],frontier:[3,4,2]};
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
/** Authored irregular boundary, with a circumscribed bound checked against the final walk grid. */
export function boundaryCoordinates(b:SampleBoundary,x:number,z:number){const dx=x-b.x,dz=z-b.z,c=Math.cos(b.angle),s=Math.sin(b.angle),u=(dx*c+dz*s)/b.rx,v=(-dx*s+dz*c)/b.rz;const angle=Math.atan2(v,u),edge=1+.055*Math.sin(angle*3+.6)+.035*Math.sin(angle*7+1.2);return {u,v,angle,r:Math.hypot(u,v)/edge};}
export function boundaryPoint(b:SampleBoundary,angle:number,r=1){const edge=1+.055*Math.sin(angle*3+.6)+.035*Math.sin(angle*7+1.2),u=Math.cos(angle)*b.rx*edge*r,v=Math.sin(angle)*b.rz*edge*r,c=Math.cos(b.angle),s=Math.sin(b.angle);return {x:b.x+u*c-v*s,z:b.z+u*s+v*c};}
export function makeEnvironmentSamplePlan(terrain:RadialTerrain):EnvironmentSamplePlan{
 const {theme,seed}=terrain.recipe,landscape=createCampaignLandscape(theme,seed),selected=indices[theme].map(i=>landscape.blockers[i]),sites:EnvironmentSampleSite[]=selected.map((b,i)=>({id:'P'+(i+1),label:labels[theme][i],x:b.x,z:b.z,radius:b.r,kind:'cluster'}));
 const surface=theme==='ice'?{x:-16,z:15}:theme==='frontier'?{x:-22,z:20}:theme==='mar-sara'?{x:7,z:1}:theme==='char'?{x:6,z:5}:{x:6,z:0};sites.push({id:'P4',label:labels[theme][3],...surface,radius:5,kind:'surface'});
 const d=terrain.definition;let finalRadius=0;for(let i=0;i<d.walk.length;i++)if(d.walk[i]&&d.opening[i]){const x=(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z=d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize;finalRadius=Math.max(finalRadius,Math.hypot(x,z)+Math.SQRT2*d.cellSize/2)}
 const direction=theme==='char'?-Math.PI/4:theme==='ice'||theme==='frontier'?Math.PI/4:Math.PI*3/4,boundRadius=10.6,distance=finalRadius+boundRadius+1.25;
 const boundary:SampleBoundary={x:Math.cos(direction)*distance,z:Math.sin(direction)*distance,angle:direction+Math.PI/2,rx:8,rz:5.5,boundRadius,minimumClearance:distance-boundRadius-finalRadius,lowered:['ice','char','frontier'].includes(theme),floor:theme==='frontier'?-3.3:-2.3,seed};
 if(Math.abs(boundary.x)+boundRadius>79||Math.abs(boundary.z)+boundRadius>79)throw Error('Sample boundary leaves existing terrain');sites.push({id:'P5',label:labels[theme][4],x:boundary.x,z:boundary.z,radius:boundRadius,kind:'boundary'});
 const solids=new WeakMap<MapPlacement,{x:number;z:number;r:number}>(),placements:MapPlacement[]=[];
 for(const original of d.placements){const x=original.position[0]-80,z=80-original.position[1];if(selected.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+.5))continue;
  // Remove old distant props by their full conservative width, not merely by center, before lowering a shore.
  if(Math.hypot(x-boundary.x,z-boundary.z)<boundRadius+original.scale[0])continue;
  const p={...original,position:[...original.position],scale:[...original.scale],modelScale:original.modelScale?[...original.modelScale]:undefined};placements.push(p);
  const b=landscape.blockers.find(b=>Math.hypot(x-b.x,z-b.z)<b.r-.12);if(b&&p.type!=='ground-detail')solids.set(p,b);
 }
 const place=(name:string,b:{x:number;z:number;r:number}|undefined,x:number,z:number,width:number,angle:number,type='sample-detail',vertical=1)=>{const p:MapPlacement={type,assetId:prefix+name,position:[x+80,80-z,0],rotation:angle,scale:[width,width,width],modelScale:[1,vertical,1],unit:true};placements.push(p);if(b)solids.set(p,b);return p};
 const cluster=(i:number,items:readonly SceneryItem[])=>{const b=selected[i];items.forEach(([name,dx,dz,width,angle],j)=>{const p=place(name,b,b.x+dx,b.z+dz,width,angle??b.angle,j===0?'landmark':'sample-detail');if(!j)p.blockerSize=b.r})};
 ENVIRONMENT_COMPOSITIONS[theme].forEach((items,i)=>cluster(i,items));
 for(let i=0;i<10;i++){const a=i*2.39996,r=1.1+(i%4)*.8;place(theme==='industrial'?'halfstructureplates_01':'rock_00',undefined,surface.x+Math.cos(a)*r,surface.z+Math.sin(a)*r,.32+(i%3)*.19,a,'ground-detail',theme==='industrial'?.08:.16)}
 // A small real boundary segment: pieces are arranged in one tangent run, with geological rubble at the feet.
 if(theme==='industrial'||theme==='mar-sara')for(let i=0;i<4;i++){
  // BBBC is a corner tile. Four inward-facing corners form one closed outcrop.
  const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a),x=boundary.x+1.95*(c+s),z=boundary.z+1.95*(c-s);
  const cliff=place(theme==='industrial'?'cliffmade13_bbbc_00':'cliffnatural0ex1_bbbc_00',undefined,x,z,3.9,a,'sample-boundary',theme==='industrial'?.85:.68);cliff.position[2]=-.07;
 }
 for(let i=0;i<8;i++){const a=i/8*Math.PI*2,p=boundaryPoint(boundary,a,1.06);if(theme==='industrial'){if(i%2===0)place('halfstructureplates_01',undefined,p.x,p.z,1.3,a,'sample-boundary',.6)}else place(theme==='ice'?'rocklarge_01':theme==='frontier'&&i%3===0?'crystalslow_00':theme==='mar-sara'?'purificationdesert_large_rock_00':'rocklarge_00',undefined,p.x,p.z,.9+(i%3)*.45,a,'sample-boundary',.75)}
 const groundHeight=(x:number,z:number)=>{const original=terrain.height({x,z}),{r}=boundaryCoordinates(boundary,x,z);if(r>=1.2)return original;if(!boundary.lowered)return original+(terrain.height(boundary)-original)*(1-smooth(1.05,1.2,r));return original+(boundary.floor-original)*(1-smooth(.82,1.2,r))};
 return {placements,assetIds:[...new Set(placements.map(p=>p.assetId).filter((id):id is string=>!!id))],sites,boundary,solidFor:p=>solids.get(p),groundHeight};
}
