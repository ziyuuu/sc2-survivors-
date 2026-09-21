import fs from 'node:fs/promises';
await import('./prepare-assets.mjs');
const rows=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
if(rows.some(r=>r.required&&r.status==='missing')){
 console.log('First run: fetching required public catalog assets into ignored local files.');
 try{await import('./download-runtime.mjs');await import('./prepare-assets.mjs?refresh=1');}
 catch(error){console.error('Asset fetch incomplete. See docs/ASSET_DOWNLOAD_REQUIRED.md; the development loader will show missing IDs.',error.message);}
 process.exitCode=0;
}
const animationIds=['marine','hellion','tank','medivac','zergling','roach','baneling','ravager'].flatMap(t=>['model.'+t,'model.'+t+'.death']).concat(['model.tank.siege','model.tank.morph','model.scv','model.drone','model.egg','model.droppod']);
if(animationIds.some(id=>!rows.some(r=>r.id===id&&r.status==='available'&&r.animations?.length&&r.materialPipelineVersion===3))||rows.filter(r=>r.kind==='effect-texture'&&r.status==='available').length<24){
 console.log('Preparing original SC2 animations and combat effects locally (first run).');
 try{await import('./import-m3-pack.mjs');await import('./prepare-assets.mjs?animated=1');}
 catch(error){console.error('Original animation pack incomplete. Run npm run assets:animate; see docs/ANIMATION_EFFECTS.md.',error.message);}
 process.exitCode=0;
}

if(!rows.some(r=>r.id==='terrain.char.normal'&&r.status==='available')){try{await import('./import-terrain.mjs');await import('./prepare-assets.mjs?terrain=1');}catch(e){console.error('Original terrain unavailable:',e.message);}}
