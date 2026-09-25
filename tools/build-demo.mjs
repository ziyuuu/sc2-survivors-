import {createAssetPack} from './offline-pack.mjs';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {createHash} from 'node:crypto';
const records=JSON.parse(await fs.readFile('reports/local/runtime-assets.json','utf8'));
const reachability=JSON.parse(await fs.readFile('reports/local/asset-reachability.json','utf8'));
if(reachability.rulesId!=='mvp-1.0'||reachability.mapId!=='kairos')throw Error('M6 release reachability is stale or for another ruleset');
const selectedIds=new Set(reachability.selectedIds);
if(selectedIds.size!==reachability.selectedIds.length)throw Error('Duplicate asset in M6 release reachability');
for(const id of selectedIds)if(!records.some(r=>r.id===id&&r.status==='available'))throw Error('Missing selected release asset: '+id);
const missing=records.filter(r=>r.required&&r.status!=='available');if(missing.length)throw Error('Cannot package friend demo with required missing assets: '+missing.map(r=>r.id).join(', '));
const expansion=JSON.parse(await fs.readFile('tools/expansion-models.json','utf8'));
const units=['marine','marauder','hellion','tank','medivac','zergling','roach','baneling','ravager','hydralisk'];
const combatModels=units.map(type=>records.find(r=>r.id==='model.'+type));
const nonGlb=combatModels.map((r,i)=>({r,type:units[i]})).filter(({r,type})=>!r||r.status!=='available'||!r.packedFile.endsWith('model.'+type+'.glb')||!([`assets/animated/model.${type}.glb`,`assets/optimized/model.${type}.glb`].includes(r.url))||(r.url.startsWith('assets/optimized/')&&r.optimization!=='exact-pixel-webp-v1'));
if(nonGlb.length)throw Error('Combat models must use self-contained GLB files from assets/animated: '+nonGlb.map(({r,type})=>r?.id??type).join(', '));
const missingExpansion=expansion.filter(a=>!records.some(r=>r.id===a.id&&r.status==='available'&&r.animations?.length));if(missingExpansion.length)throw Error('Missing original expansion models: '+missingExpansion.map(a=>a.id).join(', '));
const animationMissing=units.flatMap(t=>['model.'+t,'model.'+t+'.death']).concat(['model.tank.siege','model.tank.morph']).filter(id=>!records.some(r=>r.id===id&&r.status==='available'&&r.animations?.length));
if(animationMissing.length)throw Error('Original animation pack required for friend Demo: '+animationMissing.join(', ')+'. Run npm run assets:animate.');
if(records.filter(r=>r.kind==='effect-texture'&&r.status==='available').length<24)throw Error('Original combat effect textures are incomplete. Run npm run assets:animate.');
const materialMissing=units.filter(t=>!records.some(r=>r.id==='model.'+t&&r.materialPipelineVersion===3&&r.materials?.some(m=>m.layers.some(l=>l.role==='normal'))));
if(materialMissing.length)throw Error('Original material maps required for friend Demo: '+materialMissing.join(', ')+'. Run npm run assets:animate.');
for(const id of ['map.kairos','map.terrain.diffuse','map.terrain.normal','map.terrain.mask0','map.terrain.mask1','terrain.char','model.fort.bunker','model.fort.bunker.death','model.fort.repair','model.fort.repair.death','model.loot.mineral','model.loot.gas','model.loot.large'])if(!records.some(r=>r.id===id&&r.status==='available'))throw Error('M3 original asset required: '+id);
const closureById=new Map(reachability.rows.map(row=>[row.id,row]));
const resources=[];for(const r of records.filter(r=>selectedIds.has(r.id))){
 const bytes=await fs.readFile(r.packedFile),closure=closureById.get(r.id);
 if(!closure||closure.packedFile!==r.packedFile||closure.bytes!==bytes.length||closure.sha256!==createHash('sha256').update(bytes).digest('hex'))throw Error('M6 release resource changed after reachability audit: '+r.id);
 const mime=r.kind==='map-data'?'application/json':r.kind==='map-model'?'model/gltf+json':r.kind==='model'?'model/gltf-binary':r.kind==='audio'?(r.packedFile.endsWith('.ogg')?'audio/ogg':'audio/wav'):r.packedFile.endsWith('.webp')?'image/webp':r.packedFile.endsWith('.jpg')?'image/jpeg':'image/png';resources.push({id:r.id,mime,bytes});
}
if(resources.length!==selectedIds.size)throw Error('M6 release asset selection mismatch');
const {pack,stats}=createAssetPack(resources);
const result=await build({entryPoints:['src/main.ts'],bundle:true,format:'iife',target:'es2022',minify:true,write:false,outfile:'demo.js',define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text.replace(/<\/script/gi,'<\\/script');const css=result.outputFiles.find(f=>f.path.endsWith('.css'))?.text??'';
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#101b24"><title>SC2 SURVIVORS · 星际幸存小队</title><style>${css}</style></head><body><canvas id="battle" aria-label="星际幸存小队战场"></canvas><main id="interface"></main><script id="sc2-resource-pack" type="application/json">${JSON.stringify(pack)}</script><script>${js}</script></body></html>`;
const htmlBytes=Buffer.byteLength(html);if(htmlBytes>380*1048576)throw Error(`M6 offline HTML exceeds 380 MiB release ceiling: ${htmlBytes} bytes`);
const output='dist/SC2-Survivors-Demo.html',temporary=output+'.tmp';
try{await fs.writeFile(temporary,html);await fs.rename(temporary,output);}
catch(error){await fs.rm(temporary,{force:true});throw error;}
const stat=await fs.stat(output);console.log(`Standalone offline Demo: ${stat.size} bytes (${(stat.size/1048576).toFixed(2)} MiB), ${resources.length} losslessly embedded assets; no debug control API.`);

const htmlSha256=createHash('sha256').update(html).digest('hex');
await fs.writeFile('reports/local/offline-pack.json',JSON.stringify({...stats,htmlBytes:stat.size,htmlSha256,codec:'gzip per unique byte chunk + HTML-safe base85; local decoder; exact source-byte reconstruction'},null,2));
const encodedById=new Map(stats.byAsset.map(item=>[item.id,item]));
const rows=reachability.rows.map(row=>({...row,...encodedById.get(row.id)}));
const categories=Object.values(Object.groupBy(rows,row=>row.kind)).map(group=>({kind:group[0].kind,count:group.length,rawBytes:group.reduce((n,row)=>n+row.bytes,0),newStoredBytes:group.reduce((n,row)=>n+row.newStoredBytes,0),newEncodedBytes:group.reduce((n,row)=>n+row.newEncodedBytes,0)})).sort((a,b)=>b.newEncodedBytes-a.newEncodedBytes);
await fs.writeFile('reports/local/release-manifest.json',JSON.stringify({rulesId:'mvp-1.0',html:{path:output,bytes:stat.size,sha256:htmlSha256,ceilingBytes:380*1048576,stretchBytes:320*1048576},codec:'gzip + base85; per-asset encoded bytes attributed to first owner of each shared chunk',categories,excluded:reachability.excluded,unprovenCandidates:reachability.unprovenCandidates,assets:rows},null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(stats).filter(([key])=>key!=='byAsset'))));
