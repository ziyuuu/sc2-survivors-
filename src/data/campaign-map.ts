import type {MapDefinition,MapPlacement} from './map-definition';
import {MapTerrain} from '../simulation/movement/map-terrain';
export const CAMPAIGN_MAP_ID='campaign-radial-v1' as const;
export type CampaignTheme='industrial'|'mar-sara'|'char';
export interface CampaignMapRecipe {version:1;seed:number;theme:CampaignTheme;layout:0|1|2;}
export const MAP_STAGE_AREAS=[741.75,995.25,1248.5,1540.25,1831.75,2558.5,3015.75,3473,4375.25,4951.5,5527.5,6718.5,7363.75,8008.75,9510.25,9872.5,10234.5,11869.5] as const;
export const MAP_THEMES={
 industrial:{name:'工业遗址',props:['model.map.crate_00','model.map.compoundsewers_exhaustpipes_00','model.map.barrels_00'],layers:[2,3,6]},
 'mar-sara':{name:'玛萨拉荒漠',props:['model.map.marsaracactus_00','model.map.rock_00','model.map.brambles_00'],layers:[4,5,7]},
 char:{name:'查尔焦土',props:['model.map.redstonerockspiresnobase_00','model.map.rocklarge_00','model.map.rock_00'],layers:[0,0,0]},
} as const;
export function chooseCampaignMap(seed:number,previous?:CampaignTheme):CampaignMapRecipe{
 const themes=(Object.keys(MAP_THEMES) as CampaignTheme[]).filter(t=>t!==previous),n=seed>>>0;
 return {version:1,seed:n,theme:themes[n%themes.length],layout:((n>>>8)%3) as 0|1|2};
}
export function validateMapRecipe(r:CampaignMapRecipe){if(!r||r.version!==1||!Number.isSafeInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!Object.hasOwn(MAP_THEMES,r.theme)||![0,1,2].includes(r.layout))throw Error('地图配方无效');}
const cache=new Map<string,MapDefinition>();
export class RadialTerrain extends MapTerrain {
 constructor(readonly recipe:CampaignMapRecipe,definition=makeCampaignDefinition(recipe)){super(definition);}
 /** Ground blockers stop ground weapons as well as feet; airborne weapons remain airborne. */
 override lineOfFire(a:{x:number;z:number},b:{x:number;z:number},airA=false,airB=false,melee=false){return airA||airB?super.lineOfFire(a,b,airA,airB,melee):this.walkLine(a,b,0);}
}
export function campaignTerrain(recipe:CampaignMapRecipe){validateMapRecipe(recipe);const key=JSON.stringify(recipe);let definition=cache.get(key);if(!definition){definition=makeCampaignDefinition(recipe);if(cache.size>=3)cache.delete(cache.keys().next().value!);cache.set(key,definition);}return new RadialTerrain(recipe,definition);}
export function campaignMapAssets(r:CampaignMapRecipe){return [...MAP_THEMES[r.theme].props,...(r.theme==='char'?['terrain.char','terrain.rock']:['map.terrain.diffuse','map.terrain.normal'])];}
/** Shared campaign bytes are prepared once; only the selected layout is instantiated. */
export function campaignPreloadAssets(){return [...new Set([...Object.values(MAP_THEMES).flatMap(theme=>[...theme.props]),'terrain.char','terrain.rock','map.terrain.diffuse','map.terrain.normal'])];}
/** Independent seeded stream. Never consumes combat, shop, loot or talent RNG. */
export function makeCampaignDefinition(recipe:CampaignMapRecipe):MapDefinition{
 validateMapRecipe(recipe);let state=(recipe.seed^0xa341316c)>>>0;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const W=320,N=W*W,origin=[80,80],blockers:{x:number;z:number;r:number;asset:string;angle:number}[]=[],theme=MAP_THEMES[recipe.theme];
 // Nine templates: a shared clearance contract, three different angular constellations per theme.
 for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){
  const angle=(i+.5)*Math.PI/4+recipe.layout*.09+(random()-.5)*.12,radius=20+ring*17+(random()-.5)*4,x=Math.sin(angle)*radius,z=Math.cos(angle)*radius,r=1.3+random()*.7;
  if(Math.abs(x)<5+r||Math.abs(z)<5+r||Math.abs(Math.abs(x)-Math.abs(z))<5+r)continue;
  blockers.push({x,z,r,asset:theme.props[(i+ring)%theme.props.length],angle:random()*Math.PI*2});
 }
 const walk=new Array<number>(N),clearance=new Array<number>(N),cost=new Float64Array(N),order:number[]=[];
 for(let i=0;i<N;i++){const x=(i%W+.5)*.5-80,z=80-(Math.floor(i/W)+.5)*.5,r=Math.hypot(x,z),angle=Math.atan2(z,x);
  // Monotone radial metric: no islands as the center opens outward.
  cost[i]=r/(1+.045*Math.sin(angle*(recipe.layout+3)+recipe.seed%17));let c=Math.min(80-Math.abs(x),80-Math.abs(z));for(const b of blockers)c=Math.min(c,Math.hypot(x-b.x,z-b.z)-b.r);
  clearance[i]=Math.max(0,c);walk[i]=c>.26?1:0;if(walk[i])order.push(i);
 }
 // A connected frontier, rather than a global radial sort, prevents a single
 // newly open cell appearing behind a blocker before its approach is unlocked.
 order.length=0;const heap:number[]=[],queued=new Uint8Array(N),less=(a:number,b:number)=>cost[a]<cost[b]||cost[a]===cost[b]&&a<b;
 const offer=(i:number)=>{if(i<0||i>=N||queued[i]||!walk[i])return;queued[i]=1;let at=heap.length;heap.push(i);while(at>0){const parent=(at-1)>>1;if(!less(i,heap[parent]))break;heap[at]=heap[parent];at=parent;}heap[at]=i;};
 offer(W*160+160);while(heap.length){const at=heap[0],tail=heap.pop()!;if(heap.length){let i=0;heap[0]=tail;for(;;){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],tail))break;heap[i]=heap[child];i=child;}heap[i]=tail;}order.push(at);if(at%W)offer(at-1);if(at%W<W-1)offer(at+1);offer(at-W);offer(at+W);}
 const opening=new Array<number>(N).fill(0),reveal=new Array<number>(N).fill(0),limits:number[]=[];let cursor=0;
 for(let s=0;s<18;s++){const target=Math.round(MAP_STAGE_AREAS[s]*4);while(cursor<target){const i=order[cursor++];opening[i]=s+1;reveal[i]=s+1;}limits.push(cost[order[cursor-1]]);}
 for(let i=0;i<N;i++)if(!walk[i]){const stage=limits.findIndex(limit=>cost[i]<=limit);if(stage>=0)reveal[i]=opening[i]=stage+1;}
 const placements:MapPlacement[]=blockers.map(b=>({type:'sparse-blocker',assetId:b.asset,position:[b.x+80,80-b.z,0],rotation:b.angle,scale:[b.r*2,b.r*2,b.r*2],unit:true,blockerSize:b.r}));
 let hash=2166136261;for(const n of [...opening,...walk])hash=Math.imul(hash^n,16777619)>>>0;
 const heights=new Array(160*160).fill(0);
 return {version:1,source:{name:theme.name,sha256:`${CAMPAIGN_MAP_ID}:${recipe.theme}:${recipe.layout}:${recipe.seed}:${hash.toString(16)}`,worldUnitsPerSc2Unit:1},width:160,height:160,bounds:[0,0,160,160],origin,start:{x:0,z:0},hive:{x:0,z:-59},heights,syncHeights:heights.slice(),levels:new Array(160*160).fill(0),walkWidth:W,walkHeight:W,cellSize:.5,walk,opening,reveal,clearance,placements,ramps:[],stageAreas:[...MAP_STAGE_AREAS],cliffs:[]};
}
