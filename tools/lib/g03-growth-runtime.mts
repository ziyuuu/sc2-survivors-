import {pathToFileURL} from 'node:url';
const cache=new Map<string,any>();
export const ROOT='D:/星际',OUT=ROOT+'/reports/local/g03-growth-consumption-20261023';
export async function growthRuntime(version='after'){
 if(cache.has(version))return cache.get(version);
 const base=version==='before'?ROOT+'/reports/local/g03-tier-balance-20261023/behemoth-runtime':version==='live'?ROOT:OUT+'/after';
 const files=['simulation/world.ts','data/campaign-map.ts','simulation/movement/flat-terrain.ts','simulation/starship/inventory.ts','simulation/starship/attributes.ts','simulation/starship/runtime.ts','simulation/starship/catalog.ts','simulation/special-stages/runtime.ts','simulation/special-stages/rewards.ts','simulation/special-stages/dodge-patterns.ts','simulation/building/rules.ts','simulation/building/expedition.ts','simulation/starship/economy.ts'];
 const r=Object.assign({base},...await Promise.all(files.map(f=>import(pathToFileURL(base+'/src/'+f).href))));cache.set(version,r);return r;
}
