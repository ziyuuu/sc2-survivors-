import type {MapDefinition,MapPlacement} from './map-definition';
import {MapTerrain} from '../simulation/movement/map-terrain';

export const CAMPAIGN_MAP_ID='campaign-five-v2' as const;
export const CAMPAIGN_MAP_SIZE=160;
export type CampaignTheme='industrial'|'mar-sara'|'char'|'ice'|'frontier';
export interface CampaignMapRecipe {version:2;seed:number;theme:CampaignTheme;}
export const MAP_STAGE_AREAS=[741.75,995.25,1248.5,1540.25,1831.75,2558.5,3015.75,3473,4375.25,4951.5,5527.5,6718.5,7363.75,8008.75,9510.25,9872.5,10234.5,11869.5] as const;
export const MAP_THEMES={
 industrial:{name:'工业遗址',props:['model.map.crate_00','model.map.compoundsewers_exhaustpipes_00','model.map.barrels_00'],layers:[2,3,6]},
 'mar-sara':{name:'玛萨拉荒漠',props:['model.map.marsaracactus_00','model.map.rock_00','model.map.brambles_00'],layers:[4,5,7]},
 char:{name:'查尔焦土',props:['model.map.redstonerockspiresnobase_00','model.map.rocklarge_00','model.map.rock_00'],layers:[0,0,0]},
 ice:{name:'冰封哨站',props:['model.map.rocklarge_00','model.map.crate_00','model.map.compoundsewers_exhaustpipes_00'],layers:[0,7,3]},
 frontier:{name:'边境矿场',props:['model.map.rocklarge_00','model.map.barrels_00','model.map.crate_00'],layers:[7,5,1]},
} as const;

/** New runs draw from all five maps; subsequent runs avoid an immediate repeat. */
export function chooseCampaignMap(seed:number,previous?:CampaignTheme):CampaignMapRecipe{
 const themes=(Object.keys(MAP_THEMES) as CampaignTheme[]).filter(t=>t!==previous),n=seed>>>0;
 return {version:2,seed:n,theme:themes[n%themes.length]};
}
export function validateMapRecipe(r:CampaignMapRecipe){
 if(!r||r.version!==2||!Number.isSafeInteger(r.seed)||r.seed<0||r.seed>0xffffffff||!Object.hasOwn(MAP_THEMES,r.theme)||Object.keys(r).some(k=>!['version','seed','theme'].includes(k)))throw Error('地图配方无效');
}
const cache=new Map<string,MapDefinition>();
export class RadialTerrain extends MapTerrain {
 constructor(readonly recipe:CampaignMapRecipe,definition=makeCampaignDefinition(recipe)){super(definition);}
 /** Ground blockers stop ground weapons as well as feet; airborne weapons remain airborne. */
 override lineOfFire(a:{x:number;z:number},b:{x:number;z:number},airA=false,airB=false,melee=false){return airA||airB?super.lineOfFire(a,b,airA,airB,melee):this.walkLine(a,b,0);}
}
export function campaignTerrain(recipe:CampaignMapRecipe){
 validateMapRecipe(recipe);const key=JSON.stringify(recipe);let definition=cache.get(key);
 if(!definition){definition=makeCampaignDefinition(recipe);if(cache.size>=5)cache.delete(cache.keys().next().value!);cache.set(key,definition);}
 return new RadialTerrain(recipe,definition);
}
export function campaignMapAssets(r:CampaignMapRecipe){return [...MAP_THEMES[r.theme].props,...(r.theme==='char'?['terrain.char','terrain.rock']:['map.terrain.diffuse','map.terrain.normal'])];}
/** Shared campaign bytes are prepared once; only the selected layout is instantiated. */
export function campaignPreloadAssets(){return [...new Set([...Object.values(MAP_THEMES).flatMap(theme=>[...theme.props]),'terrain.char','terrain.rock','map.terrain.diffuse','map.terrain.normal'])];}

/** Independent seeded stream. Never consumes combat, shop, loot or talent RNG. */
export function makeCampaignDefinition(recipe:CampaignMapRecipe):MapDefinition{
 validateMapRecipe(recipe);
 let state=(recipe.seed^0xa341316c)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const size=CAMPAIGN_MAP_SIZE,half=size/2,W=size*2,N=W*W,origin=[half,half],theme=MAP_THEMES[recipe.theme];
 const blockers:{x:number;z:number;r:number;asset:string;angle:number}[]=[];
 // Five authored patterns with bounded seeded variation, a central clearing and
 // eight wide escape routes that also accommodate large ground bodies.
 for(let ring=0;ring<3;ring++)for(let i=0;i<8;i++){
  const jitter=(random()-.5)*1.4,r=1.3+random()*.65;
  let radius=25+ring*17,angle=(i+.5)*Math.PI/4;
  if(recipe.theme==='mar-sara'){angle+=(ring-1)*.075;radius+=i%2?2:-2;}
  else if(recipe.theme==='char'){angle+=(i%2?1:-1)*.045;radius+=ring===1?(i%2?3:-3):0;}
  else if(recipe.theme==='ice'){angle+=(ring%2?1:-1)*.055;radius+=i%2?1:-1;}
  else if(recipe.theme==='frontier'){angle+=(i%2?1:-1)*.07;radius+=ring%2?2:-1;}
  let x=Math.sin(angle)*(radius+jitter),z=Math.cos(angle)*(radius+jitter);
  if(recipe.theme==='industrial'){x=Math.round(x/3)*3;z=Math.round(z/3)*3;}
  // Distance to the cardinal and diagonal axes; minimum corridor width 10.5.
  if(Math.hypot(x,z)<14+r||Math.abs(x)<5.25+r||Math.abs(z)<5.25+r||Math.abs(Math.abs(x)-Math.abs(z))/Math.SQRT2<5.25+r)continue;
  if(blockers.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+r+9))continue;
  blockers.push({x,z,r,asset:theme.props[(i+ring)%theme.props.length],angle:recipe.theme==='industrial'?i%4*Math.PI/2:random()*Math.PI*2});
 }
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
 const placements:MapPlacement[]=blockers.map(b=>({type:'sparse-blocker',assetId:b.asset,position:[b.x+half,half-b.z,0],rotation:b.angle,scale:[b.r*2,b.r*2,b.r*2],unit:true,blockerSize:b.r}));
 let hash=2166136261;for(const n of [...opening,...walk])hash=Math.imul(hash^n,16777619)>>>0;
 const heights=new Array(size*size).fill(0);
 return {version:1,source:{name:theme.name,sha256:`${CAMPAIGN_MAP_ID}:${recipe.theme}:${recipe.seed}:${hash.toString(16)}`,worldUnitsPerSc2Unit:1},width:size,height:size,bounds:[0,0,size,size],origin,start:{x:0,z:0},hive:{x:0,z:-59},heights,syncHeights:heights.slice(),levels:new Array(size*size).fill(0),walkWidth:W,walkHeight:W,cellSize:.5,walk,opening,reveal,clearance,placements,ramps:[],stageAreas:[...MAP_STAGE_AREAS],cliffs:[]};
}
