import type {MapPlacement} from './map-definition';

/** Authored environment palettes. These are existing, byte-preserved SC2 assets. */
export const CAMPAIGN_ENVIRONMENTS = {
 industrial: {
  name:'工业遗址', layers:[7,2,5], tint:0xe2e4dd,
  props:['model.map.crate_00','model.map.compoundsewers_exhaustpipes_00','model.map.barrels_00','model.map.supplytanks','model.map.floodlight_01','model.map.cargotruck_00','model.map.halfstructureplates_00','model.map.rock_00'],
 },
 'mar-sara': {
  name:'玛萨拉荒漠', layers:[4,5,7], tint:0xe8c09a,
  props:['model.map.purificationdesert_large_rock_00','model.map.redstonerockspiresnobase_01','model.map.marsaracactus_00','model.map.marsaratreedead_01','model.map.brambles_00','model.map.rock_00','model.map.marsaragroundprop_00'],
 },
 char: {
  name:'查尔焦土', layers:[7,5,4], tint:0xf0e4df,
  props:['model.map.redstonerockspiresnobase_00','model.map.redstonerockspiresnobase_02','model.map.rocklarge_00','model.map.vespenegeyser_ex2_low','model.map.rock_00'],
 },
 ice: {
  name:'冰封哨站', layers:[0,7,3], tint:0xdce8ee,
  props:['model.map.rocklarge_07','model.map.rocklarge_00','model.map.dom_crate_00','model.map.floodlight_01','model.map.compoundsewers_exhaustpipes_00','model.map.barrels_00','model.map.rock_00'],
 },
 frontier: {
  name:'边境矿场', layers:[7,5,2], tint:0xd4c6a8,
  props:['model.map.rocklarge_06','model.map.jarbanminor_cranepart_04','model.map.mineralcart_00','model.map.jarbanminor_miningbot_broken_00','model.map.crystalslow_00','model.map.dom_crate_00','model.map.barrels_00','model.map.rock_00'],
 },
} as const;
export type CampaignTheme=keyof typeof CAMPAIGN_ENVIRONMENTS;
export interface LandscapeBlocker {x:number;z:number;r:number;asset:string;angle:number}

const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
const ellipse=(x:number,z:number,cx:number,cz:number,rx:number,rz:number)=>Math.hypot((x-cx)/rx,(z-cz)/rz);
const mound=(x:number,z:number,cx:number,cz:number,rx:number,rz:number,h:number)=>h*(1-smooth(.42,1,ellipse(x,z,cx,cz,rx,rz)));

/** The same sampled relief positions feet, scenery and the rendered ground.
 * Broad ramps are traversable; the center and four trunk routes remain level.
 */
export function campaignElevation(theme:CampaignTheme,x:number,z:number){
 let h=0;
 if(theme==='industrial')h=mound(x,z,-29,24,19,16,1.35)+mound(x,z,35,-27,19,14,1.1);
 else if(theme==='mar-sara')h=mound(x,z,-29,-23,22,18,1.9)+mound(x,z,32,29,23,17,1.45)+mound(x,z,-45,42,17,21,1.7);
 else if(theme==='char')h=mound(x,z,-26,29,17,24,1.8)+mound(x,z,30,-25,21,15,2.0)+mound(x,z,47,37,18,20,1.6);
 else if(theme==='ice')h=mound(x,z,25,25,22,22,1.65)+mound(x,z,-31,-25,21,16,1.55)+mound(x,z,-42,40,19,23,1.25);
 else h=mound(x,z,-29,24,20,18,1.5)+mound(x,z,31,-29,24,18,1.7)+mound(x,z,42,34,17,20,1.0);
 return h*smooth(7,13,Math.hypot(x,z))*smooth(4.8,10,Math.min(Math.abs(x),Math.abs(z)));
}

// Deliberately asymmetric working areas, outcrops and side yards; not concentric rings.
const LAYOUTS:Record<CampaignTheme,readonly (readonly [number,number,number,number])[]>={
 industrial:[[-10.8,10.8,1.35,0],[11.8,-11,1.45,2],[-18,-12,2.6,3],[21,12,2.6,1],[-30,20,3.5,5],[-25,35,2.4,0],[32,-22,3.5,5],[39,-34,2.8,3],[18,35,2.4,1],[-39,-25,3.1,3],[-45,42,2.9,1],[45,24,2.8,0],[18,-47,3.2,1],[-20,-48,2.9,5],[44,-48,2.5,0],[-48,-48,3.1,1],[55,11,2.5,3],[-57,12,2.8,0],[13,57,2.9,1],[-16,59,3.0,5]],
 'mar-sara':[[-11.2,-10.7,1.4,2],[11,12.2,1.4,4],[-19,14,2.7,0],[20,-15,2.8,1],[-27,-24,3.6,0],[-41,-21,3.2,1],[28,28,3.8,0],[42,34,3.0,1],[-25,38,2.5,2],[-43,44,3.1,0],[43,-29,3.0,0],[22,48,2.4,2],[-18,-46,3.0,1],[37,-47,3.6,0],[-50,-42,2.8,1],[55,17,2.4,0],[-57,15,2.9,1],[12,-59,2.6,0],[-17,58,3.0,0],[52,49,2.8,2]],
 char:[[11.3,-11.3,1.4,2],[-11,11.2,1.35,4],[19,16,2.8,1],[-21,-15,2.7,0],[-27,27,3.7,1],[-40,34,3.0,0],[28,-27,3.8,2],[40,-20,3.0,0],[31,36,3.2,3],[-24,-35,2.8,2],[48,43,3.5,1],[-43,-38,3.4,0],[17,51,2.8,0],[-18,54,3.4,1],[24,-50,2.8,3],[-23,-54,3.4,2],[56,-12,3.3,1],[-58,14,2.9,0],[51,-49,3.2,2],[-48,52,3.3,1]],
 ice:[[-10.8,-11.1,1.35,2],[11.8,11.2,1.4,5],[-20,13,2.8,4],[20,-16,2.5,0],[-29,-26,3.5,1],[-42,-22,3.2,0],[26,25,3.5,0],[37,36,3.1,1],[-29,31,3.1,4],[-43,43,3.3,1],[41,-31,2.9,0],[20,48,3.0,1],[-17,-47,2.8,4],[35,-47,2.9,0],[-45,-48,3.2,1],[55,13,3.1,0],[-57,12,2.8,4],[13,-59,2.9,1],[-17,58,3.0,1],[51,48,3.0,0]],
 frontier:[[-10.8,11.2,1.35,5],[11.5,-11.3,1.4,2],[-18,-13,2.5,3],[20,15,2.6,4],[-28,25,3.5,1],[-39,20,3.0,4],[27,-28,3.6,0],[39,-34,3.0,1],[-29,-30,2.9,0],[32,35,3.0,4],[-45,39,3.1,1],[43,20,2.8,3],[18,48,3.0,0],[-18,53,2.8,2],[23,-48,2.8,4],[-23,-49,3.0,1],[57,13,2.8,0],[-57,-13,3.2,1],[47,-48,3.0,0],[-44,-47,3.2,4]],
};

export function createCampaignLandscape(theme:CampaignTheme,seed:number){
 let state=(seed^0xa341316c)>>>0;
 const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
 const environment=CAMPAIGN_ENVIRONMENTS[theme],props:readonly string[]=environment.props;
 const blockers:LandscapeBlocker[]=[],placements:MapPlacement[]=[];
 const place=(asset:string,x:number,z:number,width:number,angle:number,type:string,vertical=1)=>{
  placements.push({type,assetId:asset,position:[x+80,80-z,0],rotation:angle,scale:[width,width,width],modelScale:[1,vertical,1],unit:true});
 };
 for(const [i,row] of LAYOUTS[theme].entries()){
  const [baseX,baseZ,r,assetIndex]=row,jitter=i<2?.12:.8,x=(i<2?Math.sign(baseX)*9.5:baseX)+(random()-.5)*jitter,z=(i<2?Math.sign(baseZ)*9.5:baseZ)+(random()-.5)*jitter;
  const angle=theme==='industrial'?Math.PI/2*(i%4):(random()-.5)*Math.PI*2;
  const asset=props[assetIndex],blocker={x,z,r,asset,angle};blockers.push(blocker);
  const barrel=asset==='model.map.barrels_00';
  place(asset,x,z,barrel?.85:r*1.8,angle,'landmark');placements.at(-1)!.blockerSize=r;
  if(barrel)for(let j=0;j<2;j++){
   const a=angle+1.1+j*2.7;place(asset,x+Math.cos(a)*r*.55,z+Math.sin(a)*r*.55,.72,a,'cluster-detail');
  }
  // Secondary objects stay entirely inside the same real solid footprint.
  const count=i<2?2:3;
  for(let j=0;j<count;j++){
   const a=angle+j*2.2+.7,width=.35+random()*.5,distance=r-width*.65;
   const detail=theme==='industrial'?props[j%2?2:0]:theme==='ice'?props[j%2?5:6]:theme==='frontier'?props[j%2?6:7]:theme==='mar-sara'?props[j%2?4:5]:props[4];
   place(detail,x+Math.cos(a)*distance,z+Math.sin(a)*distance,width,a,'cluster-detail',theme==='industrial'?1:.65);
  }
  if((theme==='industrial'||theme==='ice')&&i%4===0){
   const light=theme==='industrial'?props[4]:props[3];place(light,x-r*.45,z+r*.35,.8,angle,'cluster-detail');
  }
 }
 // Ground litter is deliberately ankle-low and traversable. Large silhouettes
 // are always represented by a real blocker or lie beyond the playable border.
 for(let i=0;i<155;i++){
  const x=(random()-.5)*122,z=(random()-.5)*122,r=Math.hypot(x,z);
  if(r<4||r>65||blockers.some(b=>Math.hypot(x-b.x,z-b.z)<b.r+1))continue;
  const width=.16+random()*.46,asset='model.map.rock_00';
  place(asset,x,z,width,random()*Math.PI*2,'ground-detail',.18);
 }
 // Visible outer terrain establishes the setting before its distant floor opens.
 const backdrop=theme==='industrial'?props[1]:theme==='frontier'?props[0]:theme==='ice'?props[0]:props[1];
 for(let i=0;i<28;i++){
  const a=i*Math.PI*2/28+.09*random(),radius=70+random()*5,width=6+random()*5;
  place(backdrop,Math.cos(a)*radius,Math.sin(a)*radius,width,a,'backdrop',theme==='industrial'?1:.7);
 }
 return {blockers,placements};
}

function hash(x:number,z:number,seed:number){let n=Math.imul(x,374761393)^Math.imul(z,668265263)^seed;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function landscapeNoise(x:number,z:number,seed:number){
 const ix=Math.floor(x),iz=Math.floor(z),fx=smooth(0,1,x-ix),fz=smooth(0,1,z-iz);
 return (hash(ix,iz,seed)*(1-fx)+hash(ix+1,iz,seed)*fx)*(1-fz)+(hash(ix,iz+1,seed)*(1-fx)+hash(ix+1,iz+1,seed)*fx)*fz;
}

/** World-space paint fields; original color/normal layers are blended by these masks. */
export function campaignSurface(theme:CampaignTheme,x:number,z:number,seed:number){
 const n=landscapeNoise(x*.17,z*.17,seed),macro=landscapeNoise(x*.043,z*.043,seed+17),fine=landscapeNoise(x*1.2,z*1.2,seed+31);
 let b=0,c=0,paint=0,glow=0;
 if(theme==='industrial'){
  const road=1-smooth(4.8,5.6+n*.8,Math.min(Math.abs(x),Math.abs(z)));
  const pad=1-smooth(8.2,9.0,Math.max(Math.abs(x),Math.abs(z)));
  b=Math.max(road*.8,pad);c=(1-b)*smooth(.38,.72,macro)*.9;
  const edge=Math.min(Math.abs(Math.abs(x)-5.05),Math.abs(Math.abs(z)-5.05));
  const dash=smooth(.2,.4,Math.sin((Math.abs(x)<Math.abs(z)?z:x)*1.1));
  paint=(1-smooth(.10,.21,edge))*dash*(1-pad)*(fine>.2?1:.4);
  const padFrame=(1-smooth(.08,.18,Math.abs(Math.max(Math.abs(x),Math.abs(z))-8)));
  paint=Math.max(paint,padFrame*.6)*(1-smooth(.65,.91,n));
 }else if(theme==='mar-sara'){
  const wash=Math.abs(z-Math.sin(x*.075)*3.8);
  b=smooth(.22,.7,macro)*.76*(smooth(2.4,6.5,wash+n));c=smooth(.58,.88,macro)*.62;
  // Two broad wheel ruts follow the same dry wash without marking a fake wall.
  paint=(1-smooth(.18,.48,Math.abs(wash-1.5)))*.16;
 }else if(theme==='char'){
  const crack=Math.abs(z-6-Math.sin(x*.13)*2.2-Math.sin(x*.37)*.48);
  b=smooth(.32,.7,macro)*.7;c=(1-smooth(1.3,4.8,crack+n))*.7;
  // The rendered heat comes from the original Char rock texture's red fissures.
 }else if(theme==='ice'){
  const track=Math.abs(x-Math.sin(z*.055)*2.4);
  b=(1-smooth(2.0,5.5+n,track))*.46+smooth(.58,.87,macro)*.3;
  const pad=1-smooth(6.7,8.0,Math.max(Math.abs(x+16),Math.abs(z-15)));
  c=pad*.72;
  paint=(1-smooth(.12,.32,Math.abs(track-1.25)))*.13;
 }else{
  const haul=Math.abs(z-Math.sin(x*.045)*2);
  b=Math.max((1-smooth(3.5,6,haul+n))*.9,smooth(.48,.82,macro)*.72);
  c=(1-smooth(8,9,Math.max(Math.abs(x+22),Math.abs(z-20))))*.7;
  paint=(1-smooth(.05,.12,Math.abs(haul-.9)))*.34;
 }
 const total=Math.max(1,b+c);b/=total;c/=total;
 return {weights:[1-b-c,b,c] as const,paint,glow,variation:.88+macro*.2+fine*.035};
}
