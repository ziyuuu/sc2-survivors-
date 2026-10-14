import type {MapPlacement} from '../../data/map-definition';
import type {RadialTerrain} from '../../data/campaign-map';
import {createCampaignLandscape,type CampaignTheme,type LandscapeBlocker} from '../../data/campaign-landscape';
import {ENVIRONMENT_COMPOSITIONS,COMPOSITION_REFERENCE_RADII} from './environment-compositions';
import {boundaryCoordinates,boundaryPoint,type EnvironmentSampleSite,type SampleBoundary} from './environment-sample-plan';

export interface EnvironmentFullPlan {
 placements:MapPlacement[];assetIds:string[];sites:EnvironmentSampleSite[];boundaries:SampleBoundary[];
 solidFor:(p:MapPlacement)=>LandscapeBlocker|undefined;groundHeight:(x:number,z:number)=>number;
 protection:{nativeBlockers:number;finalRadius:number;regionGroups:Record<string,number>;routeHalfWidth:number;spawnRadius:number;collisionChanges:false};
}
const smooth=(a:number,b:number,x:number)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t)};
const surfacePositions:Record<CampaignTheme,readonly (readonly [number,number])[]>={
 industrial:[[7,7],[-21,9],[30,-12],[-35,28],[22,40],[-27,-43]],
 'mar-sara':[[7,1],[-22,-4],[29,14],[-35,29],[21,-42],[-37,-37]],
 char:[[6,5],[-19,17],[24,-12],[-29,-29],[38,29],[-16,45]],
 ice:[[-16,15],[7,-5],[22,-22],[-35,28],[25,43],[-24,-42]],
 frontier:[[-22,20],[7,6],[24,-13],[-33,-27],[32,33],[-17,44]],
};
/** Presentation-only layout: the native recipe, collision, stages and World RNG are untouched. */
export function makeEnvironmentFullPlan(terrain:RadialTerrain):EnvironmentFullPlan {
 const {theme,seed}=terrain.recipe,d=terrain.definition,{blockers,placements:old}=createCampaignLandscape(theme,seed);
 let state=(seed^0x69c0e83d)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296};
 const solids=new WeakMap<MapPlacement,LandscapeBlocker>(),placements:MapPlacement[]=[],sites:EnvironmentSampleSite[]=[],regionGroups={early:0,middle:0,late:0};
 const put=(asset:string,x:number,z:number,width:number,angle:number,type:string,vertical=1,solid?:LandscapeBlocker)=>{
  const p:MapPlacement={type,assetId:asset.startsWith('model.')?asset:'model.map.'+asset,position:[x+80,80-z,0],rotation:angle,scale:[width,width,width],modelScale:[1,vertical,1],unit:true};
  if(solid){solids.set(p,solid);if(type==='landmark')p.blockerSize=solid.r;}placements.push(p);return p;
 };
 for(const [i,b] of blockers.entries()){
  // Small opening groups remain simple; later groups vary within the accepted palette.
  const variant=i<2?0:(i+Math.floor(random()*3))%3,scale=b.r/COMPOSITION_REFERENCE_RADII[theme][variant],turn=theme==='industrial'?Math.PI/2*(i%4):b.angle,c=Math.cos(turn),s=Math.sin(turn);
  ENVIRONMENT_COMPOSITIONS[theme][variant].forEach(([asset,x,z,width,angle=0],j)=>put(asset,b.x+scale*(x*c+z*s),b.z+scale*(-x*s+z*c),width*scale,angle+turn,j===0?'landmark':'cluster-detail',1,b));
  const cell=Math.floor((d.origin[1]-b.z)/d.cellSize)*d.walkWidth+Math.floor((b.x+d.origin[0])/d.cellSize),stage=d.opening[cell]||18;
  regionGroups[stage<=6?'early':stage<=12?'middle':'late']++;
 }
 // Keep ankle-low ground litter only, with a clear center and the four native trunk routes.
 for(const p of old)if(p.type==='ground-detail'){
  const x=p.position[0]-80,z=80-p.position[1];if(Math.hypot(x,z)<7||Math.min(Math.abs(x),Math.abs(z))<5.8)continue;
  placements.push({...p,position:[...p.position],scale:[...p.scale],modelScale:p.modelScale?[...p.modelScale]:undefined});
 }
 let finalRadius=0;for(let i=0;i<d.walk.length;i++)if(d.walk[i]&&d.opening[i]){
  const x=(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z=d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize;finalRadius=Math.max(finalRadius,Math.hypot(x,z)+Math.SQRT2*d.cellSize/2);
 }
 const boundaries:SampleBoundary[]=[];
 for(let i=0;i<4;i++){
  const preferred=Math.PI/4+i*Math.PI/2,rx=7.0+random()*1.6,rz=4.3+random()*.9,boundRadius=rx*1.31;
  // v is the radial axis. Even the outer 1.2 rim stays beyond every final walk cell.
  const radialExtent=rz*1.31,distance=finalRadius+radialExtent+.8;
  const directions=[0,.14,-.14,.24,-.24,.34,-.34].map(offset=>preferred+offset);
  const direction=directions.find(angle=>{const x=Math.cos(angle)*distance,z=Math.sin(angle)*distance;return Math.abs(x)+boundRadius<79&&Math.abs(z)+boundRadius<79&&blockers.every(s=>Math.hypot(x-s.x,z-s.z)>boundRadius+s.r+.6)});
  if(direction===undefined)throw Error('No clear outer boundary site');
  const b:SampleBoundary={x:Math.cos(direction)*distance,z:Math.sin(direction)*distance,angle:direction+Math.PI/2,rx,rz,boundRadius,minimumClearance:.8,lowered:['ice','char','frontier'].includes(theme),floor:theme==='frontier'?-3.3:-2.3,seed:seed+i};boundaries.push(b);
  if(Math.abs(b.x)+boundRadius>79||Math.abs(b.z)+boundRadius>79)throw Error('Full-map boundary leaves terrain');
  if(theme==='industrial'||theme==='mar-sara')for(let j=0;j<4;j++){
   const a=j*Math.PI/2,co=Math.cos(a),si=Math.sin(a),p=put(theme==='industrial'?'cliffmade13_bbbc_00':'cliffnatural0ex1_bbbc_00',b.x+1.95*(co+si),b.z+1.95*(co-si),3.9,a,'environment-boundary',theme==='industrial'?.85:.68);p.position[2]=-.07;
  }
  for(let j=0;j<8;j++){
   const a=j/8*Math.PI*2,q=boundaryPoint(b,a,1.07),width=.9+(j%3)*.45;
   if(Math.hypot(q.x,q.z)-width<finalRadius+.15)continue;
   if(theme==='industrial'){if(j%2===0)put('halfstructureplates_01',q.x,q.z,1.3,a,'environment-boundary',.6)}
   else put(theme==='ice'?'rocklarge_01':theme==='frontier'&&j%3===0?'crystalslow_00':theme==='mar-sara'?'purificationdesert_large_rock_00':'rocklarge_00',q.x,q.z,width,a,'environment-boundary',.75);
  }
 }
 // Connect corner features with the existing backdrop silhouettes, leaving their full bodies outside play.
 for(let i=0;i<28;i++){
  const angle=i*Math.PI*2/28+.03*random(),width=4.2+random()*2.1,radius=finalRadius+width*.82+2;
  const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
  if(boundaries.some(b=>boundaryCoordinates(b,x,z).r<1.45))continue;
  const asset=theme==='industrial'?(i%3?'compoundsewers_exhaustpipes_00':'supplytanks'):theme==='mar-sara'?'redstonerockspiresnobase_01':theme==='char'?'rocklarge_00':theme==='ice'?'rocklarge_07':'rocklarge_06';
  put(asset,x,z,width,angle,'backdrop',theme==='industrial'?1:.7);
 }
 surfacePositions[theme].forEach(([x,z],i)=>sites.push({id:'surface-'+i,label:'地表过渡 '+(i+1),x,z,radius:5,kind:'surface',angle:(random()-.5)*.8}));
 const groundHeight=(x:number,z:number)=>{
  const original=terrain.height({x,z});for(const b of boundaries){const {r}=boundaryCoordinates(b,x,z);if(r>=1.2)continue;return original+((b.lowered?b.floor:terrain.height(b))-original)*(1-smooth(b.lowered?.82:1.05,1.2,r));}return original;
 };
 return {placements,assetIds:[...new Set(placements.map(p=>p.assetId!))],sites,boundaries,solidFor:p=>solids.get(p),groundHeight,protection:{nativeBlockers:blockers.length,finalRadius,regionGroups,routeHalfWidth:5.8,spawnRadius:7,collisionChanges:false}};
}
