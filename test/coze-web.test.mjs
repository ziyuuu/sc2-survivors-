import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createGameServer} from '../tools/coze-web-server.mjs';

test('split app serves its own scripts, immutable resource root, current manifest and gzip',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'sc2-coze-')),app=path.join(root,'app'),resources=path.join(root,'resources');
 assert.ok(path.resolve(root).startsWith(path.resolve(tmpdir())+path.sep+'sc2-coze-'));
 let server;
 try{
  await mkdir(path.join(app,'assets'),{recursive:true});await mkdir(path.join(resources,'assets'),{recursive:true});
  const bytes=Buffer.from('verified model fixture'),sha=createHash('sha256').update(bytes).digest('hex'),url=`assets/${sha}.gltf`;
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><path d="M0 0L8 8"/></svg>'),svgHash=createHash('sha256').update(svg).digest('hex'),svgUrl=`assets/${svgHash}.svg`;
  await writeFile(path.join(resources,svgUrl),svg);
  const manifest={version:1,release:'fixture',assets:{wireframe:{url:svgUrl,bytes:svg.length,sha256:svgHash,mime:'image/svg+xml'},model:{url,bytes:bytes.length,sha256:sha,mime:'model/gltf+json'}}};
  await writeFile(path.join(resources,url),bytes);await writeFile(path.join(app,'manifest.json'),JSON.stringify(manifest));await writeFile(path.join(app,'web-release.json'),JSON.stringify({release:'fixture',manifest:'manifest.json',appBuildId:'app-fixture-v2',runSchema:12}));
  await writeFile(path.join(app,'index.html'),'<p>game</p>');await writeFile(path.join(app,'assets/index-abcdefgh.js'),'globalThis.game=1');
  server=createGameServer({webRoot:app,assetRoot:resources});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/`;
  const health=await (await fetch(base+'health')).json();assert.equal(health.appBuildId,'app-fixture-v2');assert.equal(health.assetReleaseId,'fixture');assert.equal(health.runSchema,12);
  const script=await fetch(base+'assets/index-abcdefgh.js');assert.equal(script.status,200);assert.match(script.headers.get('cache-control'),/immutable/);
  const resource=await fetch(base+url,{headers:{'Accept-Encoding':'gzip'}});assert.equal(resource.headers.get('content-type'),'model/gltf+json');assert.equal(resource.headers.get('content-encoding'),'gzip');assert.equal(resource.headers.get('access-control-allow-origin'),'*');assert.deepEqual(Buffer.from(await resource.arrayBuffer()),bytes);
  const lineImage=await fetch(base+svgUrl);assert.equal(lineImage.headers.get('content-type'),'image/svg+xml');assert.deepEqual(Buffer.from(await lineImage.arrayBuffer()),svg);
  assert.equal((await fetch(base+'manifest.json')).headers.get('cache-control'),'no-cache');assert.equal((await fetch(base+'missing')).status,404);
  assert.equal((await fetch(base+url,{headers:{'If-None-Match':resource.headers.get('etag')}})).status,304);
  await writeFile(path.join(resources,url),'corrupt');assert.throws(()=>createGameServer({webRoot:app,assetRoot:resources}),/corrupt resource/);
 }finally{if(server)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
