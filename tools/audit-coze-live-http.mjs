/** Public GET-only deployment audit. Does not execute remote code or access player storage. */
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const origin='https://sc-survivors.coze.site',root='sites/size-optimized-site/public';
const sha=b=>createHash('sha256').update(b).digest('hex');
const checked=[];
async function get(relative){
 const url=new URL(relative,origin+'/');assert.equal(url.origin,origin);
 const response=await fetch(url,{signal:AbortSignal.timeout(30000)}),bytes=Buffer.from(await response.arrayBuffer());
 const row={path:url.pathname+url.search,status:response.status,type:response.headers.get('content-type'),cache:response.headers.get('cache-control'),bytes:bytes.length,sha256:sha(bytes)};
 checked.push(row);assert.equal(response.status,200,url.href);return {bytes,row};
}
async function compare(relative){const live=await get(relative);let local;try{local=await fs.readFile(path.join(root,relative));}catch{}return {...live,localSha:local?sha(local):null,localMatches:local?sha(local)===live.row.sha256:null};}
const home=await get('/'),html=home.bytes.toString();
const appBuild=html.match(/name="sc2-app-build" content="([^"]+)"/)[1];
const manifestPath=html.match(/name="sc2-asset-manifest" content="([^"]+)"/)[1];
const launcherPath=html.match(/<script[^>]+src=["']([^"']+)/)[1];
const release=JSON.parse((await get('/web-release.json')).bytes);
const launcher=await compare(launcherPath),sw=await compare('sites-sw.js'),manifestFile=await compare(manifestPath);
const manifest=JSON.parse(manifestFile.bytes),indexName=sw.bytes.toString().match(/importScripts\(["']\.\/([^"']+)/)[1];
const indexFile=await compare(indexName),index=JSON.parse(indexFile.bytes.toString().trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
assert(launcher.bytes.toString().includes(indexName));assert.equal(appBuild,release.appBuildId);
const packedName=launcher.bytes.toString().match(/sc2-entry\.[a-f0-9]+\.js\.gz/)[0];
const entry=await compare('assets/'+packedName);assert.equal(entry.row.sha256,release.compressedEntrySha256);
const source=gunzipSync(entry.bytes).toString();
const files=Object.values(manifest.gpuTextures);assert.equal(files.length,43);
for(const file of files)for(const query of [false,true]){
 const url=new URL(file.url,origin);if(query)url.searchParams.set('sc2-index',indexName);
 const {bytes,row}=await get(url);assert.equal(bytes.length,file.bytes);assert.equal(sha(bytes),file.sha256);row.kind='standalone-ktx2';row.hashMatches=true;
}
console.log(JSON.stringify({standalonePassed:86}));
const packs=new Map();for(const f of files){const row=index[f.url];assert(row);const members=packs.get(row[0])??[];members.push({f,row});packs.set(row[0],members);}
for(const [name,members] of packs){const {bytes,row}=await get('assets/'+name);assert(name.includes(sha(bytes).slice(0,20)));for(const {f,row:r}of members){const slice=bytes.subarray(r[1],r[1]+r[2]);assert.equal(slice.length,f.bytes);assert.equal(sha(slice),f.sha256);}row.kind='gpu-pack';row.membersPassed=members.length;}
const matches=Object.fromEntries(Object.entries({launcher,sw,manifest:manifestFile,index:indexFile,entry}).map(([k,v])=>[k,{matchesLocal:v.localMatches,sha256:v.row.sha256}]));
const report={date:new Date().toISOString(),origin,scope:'Public HTTP responses, byte hashes and code identity only; not an iPhone runtime test',appBuild,resourceRelease:manifest.release,indexName,standaloneFiles:43,standaloneRequests:86,bundles:packs.size,passed:true,matches,launcherReloadOnlyRetryButton:launcher.bytes.toString().includes('button.onclick=()=>location.reload()'),gameDirectLocationReload:source.includes('location.reload('),htmlAdditionalExternalScript:/apm\.volccdn\.com/.test(html),checked};
report.requestCount=checked.length;
report.checked=checked.filter(row=>!row.kind); // Keep core identity evidence; resource checks are summarized above.
await fs.writeFile('reports/qa/coze-live-http-20261028.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,checked:undefined}));
