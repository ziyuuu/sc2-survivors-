import fs from 'node:fs/promises';
import {campaignTerrain,MAP_THEMES} from '../src/data/campaign-map';
import {makeEnvironmentFullPlan} from '../src/render/terrain/environment-full-plan';
const rows=[];
for(const theme of Object.keys(MAP_THEMES))for(const seed of [529,1,42]){const t=campaignTerrain({version:3,seed,theme:theme as any}),p=makeEnvironmentFullPlan(t),assets=p.assetIds.map(id=>({id,nearest:Math.min(...p.placements.filter(a=>a.assetId===id).map(a=>Math.max(0,Math.hypot(a.position[0]-80,a.position[1]-80)-a.scale[0]/2))),placements:p.placements.filter(a=>a.assetId===id).length}));rows.push({theme,seed,assets,sharedInside40:assets.filter(a=>a.nearest<=40).length,models:assets.length,boundaries:p.boundaries,sites:p.sites.length});}
await fs.writeFile('reports/local/performance-d04-20261021/map-shared-assets.json',JSON.stringify({scope:'Read-only composition audit. Distance is horizontal placement extent only, not proof that any asset is safe to defer for all camera/shadow/viewport states. Shared ground textures and native walk/collision remain whole.',rows},null,2));console.log(rows.map(({theme,seed,sharedInside40,models})=>({theme,seed,sharedInside40,models})));
