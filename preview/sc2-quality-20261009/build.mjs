import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {createAssetPack} from '../../tools/offline-pack.mjs';

const root='preview/sc2-quality-20261009',output=path.resolve(process.argv[2]??'dist/SC2-Quality-Sample-20261009.html'),evidence=path.resolve(process.argv[3]??'reports/local/sc2-quality-20261009');
const sha=b=>createHash('sha256').update(b).digest('hex');
const records=JSON.parse(await fs.readFile('deploy/runtime/build-assets.json','utf8')).records,byId=new Map(records.map(r=>[r.id,r]));
const units=['marine','marauder','thor','roach','hydralisk','zergling','ultralisk','immortal','zealot','drone','egg','scv','barracks','hatchery','hive'];
const ids=new Set(['map.terrain.diffuse','map.terrain.normal','model.baneling','model.support.mine','model.loot.mineral','model.loot.gas','model.loot.large']);
for(const r of records)if(r.kind==='effect-texture'||r.id.startsWith('model.projectile.')||r.id.startsWith('model.hero-upgrade.')||units.some(u=>r.id==='model.'+u||r.id==='model.'+u+'.death'))ids.add(r.id);
const stage=await fs.readFile(root+'/stage.ts','utf8');for(const match of stage.matchAll(/'(model\.map\.[^']+)'/g))ids.add(match[1]);
// Native renderer loads these retained resource/rescue models even in a diagnostic fixture.
const provenance=[],resources=[];
for(const id of ids){const r=byId.get(id);if(!r||r.status!=='available')throw Error('Missing sample resource '+id);const bytes=await fs.readFile(r.packedFile);if(sha(bytes)!==r.packedSha256)throw Error('Source resource changed '+id);resources.push({id,bytes,mime:r.packedFile.endsWith('.gltf')?'model/gltf+json':r.packedFile.endsWith('.glb')?'model/gltf-binary':r.packedFile.endsWith('.webp')?'image/webp':'image/png'});provenance.push({id,file:r.packedFile,bytes:bytes.length,sha256:sha(bytes)});if(r.packedFile.endsWith('.gltf'))for(const match of bytes.toString().matchAll(/sc2asset:([^"\\\s]+)/g))ids.add(match[1]);}
const textures={};for(const name of await fs.readdir(root+'/source-textures'))textures['./source-textures/'+name]='data:image/png;base64,'+(await fs.readFile(root+'/source-textures/'+name)).toString('base64');
const source=await fs.readFile(root+'/materials-source.json','utf8'),stamp=await fs.readFile(root+'/source-stamp.json','utf8');
const result=await build({entryPoints:[root+'/main.ts'],bundle:true,write:false,format:'esm',target:'es2022',minify:true,plugins:[{name:'standalone-data',setup(b){b.onLoad({filter:/sc2-quality-20261009[\\/]sample-data\.ts$/},()=>({loader:'js',contents:`export const source=${source};export const stamp=${stamp};const textures=${JSON.stringify(textures)};export function sampleTextureUrl(path){if(!textures[path])throw Error('Missing sample texture '+path);return textures[path];}`}));}}],define:{'import.meta.env.DEV':'false','import.meta.env.PROD':'true'}});
const js=result.outputFiles[0].text,css=await fs.readFile(root+'/style.css','utf8'),{pack,stats}=createAssetPack(resources);
let html=await fs.readFile(root+'/index.html','utf8');html=html.replace('<link rel="stylesheet" href="./style.css">',`<meta http-equiv="Content-Security-Policy" content="connect-src blob: data:; img-src blob: data:;"><style>${css}</style>`);
html=html.replace('<script type="module" src="./main.ts"></script>',()=>`<div id="interface" hidden></div><script id="sample-assets" type="application/json">${JSON.stringify([...ids])}</script><script id="sc2-resource-pack" type="application/json">${JSON.stringify(pack).replaceAll('<','\\u003c')}</script><script type="module">${js.replace(/<\/script/gi,'<\\/script')}</script>`);
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,html);await fs.mkdir(evidence,{recursive:true});
const report={output,bytes:Buffer.byteLength(html),sha256:sha(html),buildId:sha(js+'\n'+css),sourceStamp:JSON.parse(stamp),resources:provenance,pack:stats,scope:'Standalone diagnostic industrial quality sample. CSP blocks external asset connections. Production sources, original model files and current game deployment are unmodified.'};
await fs.writeFile(evidence+'/standalone-build.json',JSON.stringify(report,null,2));console.log(JSON.stringify({output,bytes:report.bytes,sha256:report.sha256,buildId:report.buildId,resources:provenance.length}));
