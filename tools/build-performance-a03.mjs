import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadBuildAssets} from './load-build-assets.mjs';
const revision=process.argv[2]??'r2',root='reports/local/performance-a03-20261021',web='preview/performance-a03-20261021-'+revision,frozen='reports/local/performance-a02-20261020/candidate-r2-web-inputs';
const hash=b=>createHash('sha256').update(b).digest('hex'),loaded=new Map();
await fs.mkdir(web,{recursive:true});
const records=await loadBuildAssets(),assets={},files={},mime=ext=>({glb:'model/gltf-binary',json:'application/json',svg:'image/svg+xml',webp:'image/webp',png:'image/png',jpg:'image/jpeg',ogg:'audio/ogg',mp3:'audio/mpeg',wav:'audio/wav'}[ext]??'application/octet-stream');
const donor='dist/SC2-Survivors-Loot-Elites-R2-20261019.html',handle=await fs.open(donor,'r'),head=Buffer.alloc(4*1048576);await handle.read(head,0,head.length,0);await handle.close();
const htmlHead=head.toString('utf8'),match=htmlHead.match(/<script id="sc2-resource-pack"[^>]*>([\s\S]*?)<\/script>/);assert.ok(match,'Frozen pack metadata must fit header');const pack=JSON.parse(match[1]);
assert.equal(Object.keys(pack.assets).length,1874);
for(const r of records.filter(r=>pack.assets[r.id])){
 const b=await fs.readFile(r.packedFile),sha=hash(b),ext=path.extname(r.url).slice(1).toLowerCase(),url=`assets/${sha}.${ext}`;
 assert.equal(sha,pack.assets[r.id].sha256,r.id);assert.equal(b.length,pack.assets[r.id].bytes,r.id);
 assets[r.id]={url,sha256:sha,bytes:b.length,mime:pack.assets[r.id].mime};files[sha]={source:r.packedFile,bytes:b.length,sha256:sha,mime:pack.assets[r.id].mime};
}
assert.equal(Object.keys(assets).length,1874);
const current={version:1,release:hash(JSON.stringify(assets)),assets};
const historical=[['v7a','dist/MVP7A-Final-R1-Application-20261013/public/asset-manifest.cc35c4025c6da0949c70f68fefe9b421734faae6e0b49a015831a5c297086d6a.json'],['v5','dist/web/asset-manifest.b96998dcc235d2201c2794fd094f99160016e8bc072fbf415e686a60d4e3c615.json']];
const manifests={current},sources=[];
for(const [name,file]of historical){const b=await fs.readFile(file),m=JSON.parse(b);manifests[name]=m;sources.push({name,file,sha256:hash(b)});for(const a of Object.values(m.assets))if(!files[a.sha256]){const source=path.posix.join(path.posix.dirname(file),a.url),bytes=await fs.readFile(source);assert.equal(hash(bytes),a.sha256);assert.equal(bytes.length,a.bytes);files[a.sha256]={source,bytes:bytes.length,sha256:a.sha256,mime:a.mime};}}
await fs.writeFile(root+'/asset-files-'+revision+'.json',JSON.stringify(files,null,2));
for(const [name,m]of Object.entries(manifests))await fs.writeFile(web+'/'+name+'.json',JSON.stringify(m));
await fs.writeFile(web+'/runtime-config.json',JSON.stringify({assetBaseUrl:'./'}));
const plugin={name:'a02-frozen',setup(b){b.onLoad({filter:/\.(ts|mts|css|json|m?js)$/},async a=>{const file=path.relative(process.cwd(),a.path).replaceAll('\\','/');let bytes=await fs.readFile(a.path);if(file.startsWith('src/'))bytes=await fs.readFile(frozen+'/'+file);loaded.set(file,bytes);const ext=path.extname(file);return {contents:bytes,loader:ext==='.mjs'?'js':ext==='.mts'?'ts':ext.slice(1),resolveDir:path.dirname(a.path)};});}};
await fs.writeFile(web+'/cache.ts',`import {HttpAssetStore,ResourceCache} from './surface';globalThis.A03Cache={HttpAssetStore,ResourceCache};`);
await fs.writeFile(web+'/surface.ts',`export {HttpAssetStore,httpStore,httpAssetStatus} from '../../src/assets/http-store';export {ResourceCache} from '../../src/assets/persistent-cache';`);
await fs.writeFile(web+'/cache.html','<!doctype html><meta charset="utf-8"><link rel="icon" href="data:,"><title>A03 resource cache evidence</title><p>Isolated cache evidence fixture</p><script src="./cache.js"></script>');
await build({entryPoints:[web+'/cache.ts'],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:web+'/cache.js',plugins:[plugin]});
await fs.writeFile(web+'/main.ts',[
 ...['building-panel','game-shell','text-scale-reference.generated'].map(n=>`import '../../src/ui/presentation/${n}.css';`),
 "import '../../src/render/scene/battle-distress.css';import '../../src/ui/presentation/world-labels.css';",
 "import {startGame} from '../../src/app/start-game';import {finishOpening} from '../../src/ui/presentation/opening';",
 "import {httpStore,httpAssetStatus} from './surface';import {selectRunData} from '../../src/simulation/persistence/run-fields';",
 "globalThis.A03={httpStore,httpAssetStatus,selectRunData};startGame(529).then(app=>{A03.app=app;const native=app.session.prepareNewRun.bind(app.session);app.session.prepareNewRun=(...args)=>{const p=native(...args);p.campaignMap={version:3,seed:529,theme:'char'};return p;};}).catch(e=>{finishOpening();console.error(e);});",
 ].join('\n'));
const built=await build({entryPoints:[web+'/main.ts'],bundle:true,platform:'browser',format:'iife',target:'es2022',outfile:web+'/main.js',metafile:true,define:{'import.meta.env.DEV':'true','import.meta.env.PROD':'false'},plugins:[plugin]});
let html=await fs.readFile('preview/performance-a02-20261020-candidate-r2/index.html','utf8');html=html.replace('<head>','<head><meta name="sc2-asset-manifest" content="./current.json"><meta name="sc2-app-build" content="a03-frozen-a02">').replace('href="/main.css"','href="./main.css"').replace('src="/main.js"','src="./main.js"');
await fs.writeFile(web+'/index.html',html);
const inputs=[];for(const [file,b]of loaded){inputs.push({file,bytes:b.length,sha256:hash(b)});if(file.startsWith('src/')){const out=root+'/frozen-inputs/'+file;await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,b);}}
const outputs=[];for(const name of ['cache.js','main.js','main.css','index.html','current.json','v7a.json','v5.json','runtime-config.json']){const b=await fs.readFile(web+'/'+name);outputs.push({file:web+'/'+name,bytes:b.length,sha256:hash(b)});}
const stats={};let union=new Set();for(const name of ['v7a','v5','current']){const m=manifests[name],unique=new Map(Object.values(m.assets).map(a=>[a.sha256,a])),added=[...unique.values()].filter(a=>!union.has(a.sha256));stats[name]={release:m.release,ids:Object.keys(m.assets).length,files:unique.size,bytes:[...unique.values()].reduce((n,a)=>n+a.bytes,0),addedFiles:added.length,addedBytes:added.reduce((n,a)=>n+a.bytes,0)};union=new Set([...union,...unique.keys()]);}
await fs.writeFile(web+'/build-inputs.json',JSON.stringify({scope:'A02 frozen production inputs unchanged. Actual HttpAssetStore and ResourceCache, full current asset registry plus immutable historical manifests. Diagnostic exports and fixed new-run map only; no timing instrumentation or deployment.',frozen,inputs,outputs,sources,stats,unionFiles:union.size,unionBytes:[...union].reduce((n,h)=>n+files[h].bytes,0),metafile:built.metafile},null,2));
console.log(JSON.stringify({stats,unionFiles:union.size,inputs:inputs.length,production:inputs.filter(f=>f.file.startsWith('src/')).length,outputs}));
