import fs from 'node:fs/promises';
import {build} from 'esbuild';
const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
const missing=records.filter(r=>r.required&&r.status!=='available');if(missing.length)throw Error('Cannot package friend demo with required missing assets: '+missing.map(r=>r.id).join(', '));
const units=['marine','hellion','tank','medivac','zergling','roach','baneling','ravager'];
const animationMissing=units.flatMap(t=>['model.'+t,'model.'+t+'.death']).concat(['model.tank.siege','model.tank.morph']).filter(id=>!records.some(r=>r.id===id&&r.status==='available'&&r.animations?.length));
if(animationMissing.length)throw Error('Original animation pack required for friend Demo: '+animationMissing.join(', ')+'. Run npm run assets:animate.');
if(records.filter(r=>r.kind==='effect-texture'&&r.status==='available').length<24)throw Error('Original combat effect textures are incomplete. Run npm run assets:animate.');
const materialMissing=units.filter(t=>!records.some(r=>r.id==='model.'+t&&r.materialPipelineVersion===3&&r.materials?.some(m=>m.layers.some(l=>l.role==='normal'))));
if(materialMissing.length)throw Error('Original material maps required for friend Demo: '+materialMissing.join(', ')+'. Run npm run assets:animate.');
for(const id of ['map.kairos','map.terrain.diffuse','map.terrain.normal','map.terrain.mask0','map.terrain.mask1','model.loot.mineral','model.loot.gas','model.loot.large'])if(!records.some(r=>r.id===id&&r.status==='available'))throw Error('Original resource pickup required: '+id);
const embedded={};for(const r of records.filter(r=>r.status==='available')){const bytes=await fs.readFile(r.packedFile);const mime=r.kind==='map-data'?'application/json':r.kind==='map-model'?'model/gltf+json':r.kind==='model'?'model/gltf-binary':r.kind==='audio'?(r.packedFile.endsWith('.ogg')?'audio/ogg':'audio/wav'):r.packedFile.endsWith('.jpg')?'image/jpeg':'image/png';embedded[r.id]=`data:${mime};base64,${bytes.toString('base64')}`;}
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outfile:'demo.js',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><title>SC2 SURVIVORS · 星际幸存小队</title><style>${css}</style></head><body><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main><script>window.__SC2_EMBEDDED__=${JSON.stringify(embedded)};</script><script>${js}</script></body></html>`;
await fs.writeFile('dist/SC2-Survivors-Demo.html',html);const stat=await fs.stat('dist/SC2-Survivors-Demo.html');console.log(`Standalone offline Demo: ${stat.size} bytes (${(stat.size/1048576).toFixed(2)} MiB), ${Object.keys(embedded).length} embedded assets; no debug control API.`);
