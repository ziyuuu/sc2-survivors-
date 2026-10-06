export type RenderQuality='native'|'balanced'|'performance';
export type HeroEffectQuality='full'|'balanced'|'low';
export type OrdinaryEffectQuality='full'|'balanced'|'low';
export const ORDINARY_EFFECT_LABELS={full:'普通兵与支援 · 完整',balanced:'普通兵与支援 · 均衡',low:'普通兵与支援 · 精简'};
export const resolveOrdinaryEffects=(value:string|null,mobile=false):OrdinaryEffectQuality=>value==='full'||value==='balanced'||value==='low'?value:mobile?'balanced':'full';
export function loadOrdinaryEffects(){try{return resolveOrdinaryEffects(localStorage.getItem('sc2.ordinaryEffects'),matchMedia('(pointer:coarse)').matches);}catch{return 'full' as const;}}
export function saveOrdinaryEffects(value:OrdinaryEffectQuality){try{localStorage.setItem('sc2.ordinaryEffects',value);}catch{}}
export const HERO_EFFECT_LABELS={full:'英雄特效 · 完整',balanced:'英雄特效 · 均衡',low:'英雄特效 · 精简'};
export const resolveHeroEffects=(value:string|null,mobile=false):HeroEffectQuality=>value==='full'||value==='balanced'||value==='low'?value:mobile?'balanced':'full';
export function loadHeroEffects(){try{return resolveHeroEffects(localStorage.getItem('sc2.heroEffects'),matchMedia('(pointer:coarse)').matches);}catch{return 'full' as const;}}
export function saveHeroEffects(value:HeroEffectQuality){try{localStorage.setItem('sc2.heroEffects',value);}catch{}}
export const QUALITY_LABELS:Record<RenderQuality,string>={native:'清晰 · 屏幕分辨率',balanced:'均衡',performance:'低分辨率'};
export function resolveQuality(saved:string|null,mobile=false):RenderQuality{return saved==='native'||saved==='balanced'||saved==='performance'?saved:mobile?'balanced':'native';}
export function renderPixelRatio(quality:RenderQuality,dpr:number,width:number,height:number,maxDimension=Infinity){
 const screen=Number.isFinite(dpr)&&dpr>0?dpr:1;
 const requested=quality==='native'?screen:Math.min(screen,quality==='balanced'?1.5:1);
 return Math.min(requested,maxDimension/Math.max(1,width,height));
}
export function loadQuality():RenderQuality{let saved:null|string=null;try{saved=localStorage.getItem('sc2.renderQuality');}catch{}return resolveQuality(saved,matchMedia('(pointer:coarse)').matches);}
export function saveQuality(quality:RenderQuality){try{localStorage.setItem('sc2.renderQuality',quality);}catch{}}

export type AnimationMode='complete'|'energy-saving';
export const ANIMATION_MODE_LABELS:Record<AnimationMode,string>={complete:'完整动作（默认）','energy-saving':'节能动作 · 15Hz'};
export function resolveAnimationMode(saved:string|null):AnimationMode{return saved==='energy-saving'?'energy-saving':'complete';}
export function loadAnimationMode():AnimationMode{try{return resolveAnimationMode(localStorage.getItem('sc2.animationMode'));}catch{return 'complete';}}
export function saveAnimationMode(mode:AnimationMode){try{localStorage.setItem('sc2.animationMode',mode);}catch{}}
export type PoseClockState={time?:number;event?:string;mode?:AnimationMode};
/** Only the pose clock is held. Transforms, projectiles and camera are not gated. */
export function samplePoseClock(state:PoseClockState,mode:AnimationMode,time:number,event:string){
 if(mode==='complete'||state.mode!==mode||state.event!==event||state.time===undefined||time<state.time||time-state.time>=1/15-1e-8){state.time=time;state.event=event;state.mode=mode;}
 return state.time!;
}
