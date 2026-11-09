/** Packed deployment capability and local-only preferences. No simulation state. */
export type GraphicsTier='high'|'medium'|'low';
export type GraphicsPreset=GraphicsTier|'auto'|'custom';
export const GRAPHICS_KEY='sc2.graphics.v1';
export const TIER_LABELS:Record<GraphicsTier,string>={high:'高',medium:'中',low:'低'};
export interface DeviceHints {memory?:number;cores?:number;coarse?:boolean;dpr?:number}
export interface RuntimeBudget {network:number;decode:number;audio:number;packBytes:number;pcmBytes:number;recentOnly:boolean}
export function deviceTier(h:DeviceHints):GraphicsTier {
 // Missing information is unknown, never evidence of a fast GPU.
 if(h.memory!==undefined&&h.memory<=2||h.cores!==undefined&&h.cores<=2)return 'low';
 if(h.memory!==undefined&&h.memory<=4&&h.cores!==undefined&&h.cores<=4)return 'low';
 return 'medium';
}
export function deviceBudget(h:DeviceHints):RuntimeBudget {
 // Touch Safari omits deviceMemory. Missing capacity must not grant the larger
 // decode working set; this changes scheduling/cache budgets, not visual quality.
 const low=deviceTier(h)==='low'||h.coarse===true&&h.memory===undefined,ample=(h.memory??0)>=8&&(h.cores??0)>=8;
 return {network:low?2:ample?6:4,decode:low?1:2,audio:low?1:2,packBytes:(low?12:ample?48:24)*1024**2,pcmBytes:(low?32:ample?96:48)*1024**2,recentOnly:!ample};
}
export interface GraphicsPreferences {version:1;preset:GraphicsPreset;tier:GraphicsTier;texture:GraphicsTier;probeVersion?:number}
const tiers=['high','medium','low'];
const legacyKeys=['sc2.combatDetail','sc2.renderQuality','sc2.animationMode','sc2.ordinaryEffects','sc2.heroEffects'];
export function readGraphics(storage:Pick<Storage,'getItem'>|undefined,hints:DeviceHints):GraphicsPreferences {
 try{const raw=storage?.getItem(GRAPHICS_KEY);if(raw){const p=JSON.parse(raw);if(p.version===1&&[...tiers,'auto','custom'].includes(p.preset)&&tiers.includes(p.tier)&&tiers.includes(p.texture))return p;}}catch{}
 let legacy=false;try{legacy=legacyKeys.some(k=>storage?.getItem(k)!=null);}catch{}
 const tier=deviceTier(hints);return {version:1,preset:legacy?'custom':'auto',tier,texture:legacy?'high':tier};
}
function storage(){try{return globalThis.localStorage;}catch{return undefined;}}
export function deviceHints():DeviceHints {if(typeof navigator==='undefined')return {};return {memory:(navigator as Navigator&{deviceMemory?:number}).deviceMemory,cores:navigator.hardwareConcurrency,coarse:typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches,dpr:globalThis.devicePixelRatio||1};}
export function optimizedGraphics(){return (globalThis as typeof globalThis&{__SC2_PACKED_GRAPHICS__?:boolean}).__SC2_PACKED_GRAPHICS__===true;}
let preferences:GraphicsPreferences|undefined;
export function graphicsPreferences(){return preferences??=readGraphics(storage(),deviceHints());}
export function saveGraphics(patch:Partial<GraphicsPreferences>){preferences={...graphicsPreferences(),...patch,version:1};try{storage()?.setItem(GRAPHICS_KEY,JSON.stringify(preferences));}catch{}return preferences;}
export function runtimeBudget(){return optimizedGraphics()?deviceBudget(deviceHints()):{network:4,decode:4,audio:4,packBytes:64*1024**2,pcmBytes:Infinity,recentOnly:typeof matchMedia!=='undefined'&&matchMedia('(pointer:coarse)').matches};}
export function graphicsPixelRatio(quality:string,dpr:number){const d=Number.isFinite(dpr)&&dpr>0?dpr:1;return quality==='high'?Math.min(d,2):quality==='balanced'?Math.min(d,1.5)*.85:quality==='performance'?Math.min(d,1)*.7:d;}
export function handshakeBudget(){if(!optimizedGraphics()||typeof navigator==='undefined')return;const send=()=>navigator.serviceWorker?.controller?.postMessage({type:'sc2-runtime-budget',...runtimeBudget()});send();navigator.serviceWorker?.addEventListener('controllerchange',send);}
