import type {MapDefinition} from './map-definition';
import {MapTerrain} from '../simulation/movement/map-terrain';
import {CAMPAIGN_ENVIRONMENTS,campaignElevation,createCampaignLandscape,type CampaignTheme} from './campaign-landscape';
export type {CampaignTheme} from './campaign-landscape';

export const CAMPAIGN_MAP_ID='campaign-five-v3' as const;
export const CAMPAIGN_MAP_SIZE=160;
export interface CampaignMapRecipe {version:3;seed:number;theme:CampaignTheme;}
export const MAP_STAGE_AREAS=[741.75,995.25,1248.5,1540.25,1831.75,2558.5,3015.75,3473,4375.25,4951.5,5527.5,6718.5,7363.75,8008.75,9510.25,9872.5,10234.5,11869.5] as const;
export const MAP_THEMES=CAMPAIGN_ENVIRONMENTS;

/** New runs draw from all five maps; subsequent runs avoid an immediate repeat. */
export function chooseCampaignMap(seed:number,previous?:CampaignTheme):CampaignMapRecipe{
 const themes=(Object.keys(MAP_THEMES) as CampaignTheme[]).filter(t=>t!==previous),n=seed>>>0;
 return {version:3,seed:n,theme:themes[n%themes.length]};
}
export function validateMapRecipe(r:CampaignMapRecipe){
 if(!r||r.version!==3||!Number.isSafeInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!Object.hasOwn(MAP_THEMES,r.theme)||Object.keys(r).some(k=>!['version','seed','theme'].includes(k)))throw Error('地图配方无效');
}
const cache=new Map<string,MapDefinition>();
export class RadialTerrain extends MapTerrain {
 constructor(readonly recipe:CampaignMapRecipe,definition=makeCampaignDefinition(recipe)){super(definition);}
 /** Ground blockers stop ground weapons as well as feet; airborne weapons remain airborne. */
 override lineOfFire(a:{x:number;z:number},b:{x:number;z:number},airA=false,airB=false,melee=false){return airA||airB?super.lineOfFire(a,b,airA,airB,melee):this.walkLine(a,b,0)&&(melee||super.lineOfFire(a,b,false,false,false));}
}
export function campaignTerrain(recipe:CampaignMapRecipe){
 validateMapRecipe(recipe);const key=JSON.stringify(recipe);let definition=cache.get(key);
 if(!definition){definition=makeCampaignDefinition(recipe);if(cache.size>=5)cache.delete(cache.keys().next().value!);cache.set(key,definition);}
 return new RadialTerrain(recipe,definition);
}
export const CHAR_CAMPAIGN_TEXTURES=['terrain.char','terrain.rock','terrain.cracked','terrain.char.normal','terrain.rock.normal'] as const;
export function campaignMapAssets(r:CampaignMapRecipe){return [...MAP_THEMES[r.theme].props,'map.terrain.diffuse','map.terrain.normal',...(r.theme==='char'?CHAR_CAMPAIGN_TEXTURES:[])];}
/** Shared campaign bytes are prepared once; only the selected layout is instantiated. */
export function campaignPreloadAssets(){return [...new Set([...Object.values(MAP_THEMES).flatMap(theme=>[...theme.props]),...CHAR_CAMPAIGN_TEXTURES,'map.terrain.diffuse','map.terrain.normal'])];}

/** Independent seeded stream. Never consumes combat, shop, loot or talent RNG. */
export function makeCampaignDefinition(recipe:CampaignMapRecipe):MapDefinition{
 validateMapRecipe(recipe);
 const size=CAMPAIGN_MAP_SIZE,half=size/2,W=size*2,N=W*W,origin=[half,half],theme=MAP_THEMES[recipe.theme];
 const {blockers,placements}=createCampaignLandscape(recipe.theme,recipe.seed);
 const walk=new Array<number>(N),clearance=new Array<number>(N),cost=new Float64Array(N),order:number[]=[];
 for(let i=0;i<N;i++){
  const x=(i%W+.5)*.5-half,z=half-(Math.floor(i/W)+.5)*.5;
  // The expanding boundary is shared by all five maps.
  cost[i]=Math.hypot(x,z);let c=Math.min(half-Math.abs(x),half-Math.abs(z));
  for(const b of blockers)c=Math.min(c,Math.hypot(x-b.x,z-b.z)-b.r);
  clearance[i]=Math.max(0,c);walk[i]=c>.26?1:0;
 }
 // A connected frontier prevents a newly open cell appearing behind a blocker
 // before its approach is unlocked. Every stage opens exactly the same net area.
 const heap:number[]=[],queued=new Uint8Array(N),less=(a:number,b:number)=>cost[a]<cost[b]||cost[a]===cost[b]&&a<b;
 const offer=(i:number)=>{
  if(i<0||i>=N||queued[i]||!walk[i])return;queued[i]=1;let at=heap.length;heap.push(i);
  while(at>0){const parent=(at-1)>>1;if(!less(i,heap[parent]))break;heap[at]=heap[parent];at=parent;}heap[at]=i;
 };
 offer(W*(W/2)+W/2);
 while(heap.length){
  const at=heap[0],tail=heap.pop()!;
  if(heap.length){let i=0;heap[0]=tail;for(;;){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&less(heap[child+1],heap[child]))child++;if(!less(heap[child],tail))break;heap[i]=heap[child];i=child;}heap[i]=tail;}
  order.push(at);if(at%W)offer(at-1);if(at%W<W-1)offer(at+1);offer(at-W);offer(at+W);
 }
 if(order.length<Math.round(MAP_STAGE_AREAS[17]*4))throw Error('地图连通面积不足');
 const opening=new Array<number>(N).fill(0),reveal=new Array<number>(N).fill(0),limits:number[]=[];let cursor=0;
 for(let s=0;s<18;s++){
  const target=Math.round(MAP_STAGE_AREAS[s]*4);
  while(cursor<target){const i=order[cursor++];opening[i]=s+1;reveal[i]=s+1;}limits.push(cost[order[cursor-1]]);
 }
 for(let i=0;i<N;i++)if(!walk[i]){const stage=limits.findIndex(limit=>cost[i]<=limit);if(stage>=0)reveal[i]=opening[i]=stage+1;}
 const heights=Array.from({length:size*size},(_,i)=>campaignElevation(recipe.theme,i%size-half,half-Math.floor(i/size)));
 let hash=2166136261;for(const n of [...opening,...walk,...heights.map(h=>Math.round(h*100000))])hash=Math.imul(hash^n,16777619)>>>0;
 return {version:1,source:{name:theme.name,sha256:`${CAMPAIGN_MAP_ID}:${recipe.theme}:${recipe.seed}:${hash.toString(16)}`,worldUnitsPerSc2Unit:1},width:size,height:size,bounds:[0,0,size,size],origin,start:{x:0,z:0},hive:{x:0,z:-59},heights,syncHeights:heights.slice(),levels:new Array(size*size).fill(0),walkWidth:W,walkHeight:W,cellSize:.5,walk,opening,reveal,clearance,placements,ramps:[],stageAreas:[...MAP_STAGE_AREAS],cliffs:[]};
}
