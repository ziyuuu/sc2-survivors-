import {RUNTIME_ASSETS} from './runtime.generated';
export const ASSETS=new Map(RUNTIME_ASSETS.map(a=>[a.id,a]));
declare global {interface Window {__SC2_EMBEDDED__?:Record<string,string>;__SC2_REPORT__?:unknown}}
export function assetUrl(id:string):string|null {const embedded=window.__SC2_EMBEDDED__?.[id];if(embedded)return embedded;const a=ASSETS.get(id);return a?.status==='available'?a.url:null;}
export const missingAssets=()=>RUNTIME_ASSETS.filter(a=>a.required&&a.status!=='available');
export function icon(id:string,label=''){const src=assetUrl(id);return src?`<img src="${src}" alt="${label}" draggable="false">`:`<span class="missing-icon" title="missing asset: ${id}">${label||'?'}</span>`;}
