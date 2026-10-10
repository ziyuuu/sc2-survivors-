import {RUNTIME_ASSETS} from './runtime.generated';
import {INTERMISSION_ART_ASSETS} from './intermission-art';
import {NATIVE_HUD_ASSETS} from './native-hud-art';
import {MATERIAL_TEXTURE_ASSETS} from './material-textures';
import {UI_ART_ASSETS} from './ui-art.generated';
import {isRetiredAsset} from './retired';
export const ASSETS=new Map([...RUNTIME_ASSETS,...UI_ART_ASSETS,...INTERMISSION_ART_ASSETS,...NATIVE_HUD_ASSETS,...MATERIAL_TEXTURE_ASSETS].filter(a=>!isRetiredAsset(a.id)).map(a=>[a.id,a]));
declare global {interface Window {__SC2_EMBEDDED__?:Record<string,string>;__SC2_PACK_ACTIVE__?:boolean;__SC2_REPORT__?:unknown}}
let platformAssetUrl:((id:string)=>string|null)|null=null;
/** The mini-game host only exposes verified, locally prepared asset paths. */
export function configurePlatformAssetUrl(resolver:((id:string)=>string|null)|null){platformAssetUrl=resolver;}
export function assetUrl(id:string):string|null {if(platformAssetUrl)return platformAssetUrl(id);const host=globalThis as typeof globalThis&{__SC2_EMBEDDED__?:Record<string,string>;__SC2_PACK_ACTIVE__?:boolean};const embedded=host.__SC2_EMBEDDED__?.[id];if(embedded)return embedded;if(host.__SC2_PACK_ACTIVE__)return null;const a=ASSETS.get(id);return a?.status==='available'?a.url:null;}
export const missingAssets=()=>RUNTIME_ASSETS.filter(a=>a.required&&a.status!=='available');
export function icon(id:string,label=''){const src=assetUrl(id);return src?`<img src="${src}" alt="${label}" draggable="false">`:`<span class="missing-icon" title="missing asset: ${id}">${label||'?'}</span>`;}
