export type RenderQuality='native'|'balanced'|'performance';
export const QUALITY_LABELS:Record<RenderQuality,string>={native:'清晰 · 屏幕分辨率',balanced:'均衡',performance:'省电'};
export function resolveQuality(saved:string|null,mobile=false):RenderQuality{return saved==='native'||saved==='balanced'||saved==='performance'?saved:mobile?'balanced':'native';}
export function renderPixelRatio(quality:RenderQuality,dpr:number,width:number,height:number,maxDimension=Infinity){
 const screen=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const requested=quality==='native'?screen:Math.min(screen,quality==='balanced'?1.5:1);
 return Math.min(requested,maxDimension/Math.max(1,width,height));
}
export function loadQuality():RenderQuality{let saved:null|string=null;try{saved=localStorage.getItem('sc2.renderQuality');}catch{}return resolveQuality(saved,matchMedia('(pointer:coarse)').matches);}
export function saveQuality(quality:RenderQuality){try{localStorage.setItem('sc2.renderQuality',quality);}catch{}}
