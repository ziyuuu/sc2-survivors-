/** Static integrity/live HTTP check, or isolated local serving for browser verification. */
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'node:http';
import {gunzipSync} from 'node:zlib';
const root=path.resolve('dist/coze-repair-20261030'),patch=root+'/Coze-Repair-Update',bgm=path.resolve('dist/coze-feedback-bgm-20261029/Coze-Feedback-BGM-Update/public'),base=path.resolve('sites/size-optimized-site/public');
const sha=b=>createHash('sha256').update(b).digest('hex'),read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const m=await read(patch+'/PATCH-MANIFEST.json');
for(const f of m.files){const b=await fs.readFile(patch+'/'+f.path);assert.equal(b.length,f.bytes);assert.equal(sha(b),f.sha256);}
const load=async name=>{for(const folder of [patch+'/public',bgm,base])try{return await fs.readFile(folder+'/'+name);}catch(e){if(e.code!=='ENOENT')throw e;}return null;};
for(const f of m.retained){const b=await load(f.path);assert.ok(b,f.path);assert.equal(sha(b),f.sha256);}
const d=await read(patch+'/public/web-release.json'),assets=JSON.parse(await load(d.manifest));
assert.equal(sha(JSON.stringify({assets:assets.assets,gpuTextures:assets.gpuTextures})),d.release);
const compressed=m.files.find(f=>f.path.endsWith('.js.gz')),code=gunzipSync(await fs.readFile(patch+'/'+compressed.path));
assert.equal(sha(await fs.readFile(patch+'/'+compressed.path)),d.compressedEntrySha256);
for(const marker of ['__TANK_FX_APP__','__TANK_RECORDING__','__BGM_APP__'])assert.equal(code.includes(marker),false);
const report={date:'2026-10-30',sourceCommit:m.sourceCommit,appBuildId:d.appBuildId,resourceRelease:d.release,runSchema:d.runSchema,patchFiles:m.files.length,retainedFiles:m.retained.length,resourceIds:Object.keys(assets.assets).length,gpuRecords:Object.keys(assets.gpuTextures).length,checks:[],scope:'Byte identity, HTTP delivery and separately recorded browser UI; no physical iPhone or production database mutation.'};
report.checks.push('Five increment files and retained dependencies match SHA256; entry decompresses; resource manifest unchanged');
if(process.argv.includes('--live')||process.argv.includes('--baseline')){
 const before=process.argv.includes('--baseline'),origin='https://sc-survivors.coze.site',expected=before?JSON.parse(await fs.readFile(bgm+'/web-release.json')):d;
 const remote=await fetch(origin+'/web-release.json',{cache:'no-store'});assert.equal(remote.status,200);const live=await remote.json();
 assert.equal(live.appBuildId,expected.appBuildId);assert.equal(live.release,expected.release);assert.equal(live.runSchema,expected.runSchema);assert.match(remote.headers.get('cache-control')??'',/no-cache|no-store/);
 const config=await fetch(origin+'/runtime-config.json',{cache:'no-store'});assert.equal(config.status,200);assert.match(config.headers.get('cache-control')??'',/no-cache|no-store/);
 const html=await fetch(origin+'/');assert.equal(html.status,200);const body=await html.text();assert.ok(body.includes(expected.appBuildId));
 const rows=before?[]:m.files.filter(f=>f.path!=='public/index.html');
 for(const row of rows){const r=await fetch(origin+'/'+row.path.replace(/^public\//,''));assert.equal(r.status,200,row.path);const b=new Uint8Array(await r.arrayBuffer());assert.equal(sha(b),row.sha256,row.path);}
 const dependencies=[d.manifest,'sites-sw.js','sites-pack-index.js',...Object.values(assets.assets).filter(a=>a.mime==='audio/mpeg').map(a=>a.url),...Object.values(assets.gpuTextures).map(a=>a.url)];
 const identities=new Map([...Object.values(assets.assets),...Object.values(assets.gpuTextures)].map(a=>[a.url,a.sha256]));
 for(const name of [...new Set(dependencies)]){assert.equal(typeof name,'string');const r=await fetch(origin+'/'+name);assert.equal(r.status,200,name);const bytes=new Uint8Array(await r.arrayBuffer());let expectedHash=identities.get(name);if(!expectedHash){const local=await load(name);assert.ok(local,name);expectedHash=sha(local);}assert.equal(sha(bytes),expectedHash,name);}
 if(!before){const h=await fs.readFile(patch+'/public/index.html','utf8');for(const ref of h.matchAll(/(?:src|href)="(\.\/assets\/[^" ]+)"/g))assert.ok(body.includes(ref[1]),ref[1]);}
 report.checks.push('Live '+(before?'v6 baseline':'new application')+' matches appBuildId/schema/release; mutable JSON no-cache; immutable files match SHA256');report.http={baseline:before,origin,verifiedDependencies:[...new Set(dependencies)].length,htmlExact:sha(body)===sha(await load('index.html')),platformHtmlInjectionAllowed:true,releaseCache:remote.headers.get('cache-control'),configCache:config.headers.get('cache-control')};
 await fs.mkdir('reports/local/tank-coze-deploy-20261030',{recursive:true});await fs.writeFile('reports/local/tank-coze-deploy-20261030/'+(before?'baseline':'live')+'-http.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}else if(process.argv.includes('--serve')){
 const mime={'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm'};
 const server=createServer(async(req,res)=>{try{const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'')||'index.html';if(name.split('/').some(p=>p==='..'||p.startsWith('.')||p.includes('\\'))){res.writeHead(400).end();return;}if(name==='runtime-config.json'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-cache'}).end(JSON.stringify({backend:{enabled:false}}));return;}
 const b=await load(name);if(!b){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(name)]??'application/octet-stream','Cache-Control':['index.html','web-release.json','runtime-config.json','sites-sw.js'].includes(name)?'no-cache':'public, max-age=31536000, immutable'}).end(b);}catch(e){console.error(e.message);res.writeHead(500).end();}});
 server.listen(18906,'127.0.0.1',()=>console.log(JSON.stringify({...report,origin:'http://127.0.0.1:18906'})));
}else console.log(JSON.stringify(report));
