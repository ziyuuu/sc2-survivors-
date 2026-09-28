import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

test('Coze fixed-commit fetch resumes partial files, skips verified assets and rejects LFS pointers',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'sc2-fetch-')),commit='a'.repeat(40),content=Buffer.from('Verified original runtime model content'.repeat(10)),sha=createHash('sha256').update(content).digest('hex'),url=`assets/${sha}.glb`;
 const index={release:'test-release',groups:['common','zerg'],files:[{url,gitPath:'deploy/runtime/'+url,bytes:content.length,sha256:sha,groups:['common','zerg']}]};
 try{
  const out=path.join(dir,'public'),log=path.join(dir,'requests.jsonl');await fs.mkdir(path.join(out,'assets'),{recursive:true});await fs.writeFile(path.join(out,url)+'.partial',content.subarray(0,17));
  const mock=path.join(dir,'mock.mjs');await fs.writeFile(mock,`import fs from 'node:fs/promises';
const index=${JSON.stringify(index)},content=Buffer.from(${JSON.stringify(content.toString('base64'))},'base64');
globalThis.fetch=async(url,options={})=>{await fs.appendFile(${JSON.stringify(log)},JSON.stringify({url,headers:options.headers})+'\\n');
if(url.includes('raw.githubusercontent.com'))return Response.json(index);
if(process.env.SC2_FAKE_POINTER)return new Response('version https://git-lfs.github.com/spec/v1\\n');
const start=Number(options.headers?.Range?.match(/bytes=(\\d+)-/)?.[1]??0);return new Response(content.subarray(start),{status:start?206:200,headers:start?{'content-range':'bytes '+start+'-'+(content.length-1)+'/'+content.length}:{}});};`);
  const run=(extra={},group='common')=>spawnSync(process.execPath,['--import',pathToFileURL(mock).href,'tools/fetch-coze-resources.mjs','--commit',commit,'--group',group,'--out',out],{encoding:'utf8',env:{...process.env,...extra},timeout:30000});
  let r=run();assert.equal(r.status,0,r.stderr);assert.deepEqual(await fs.readFile(path.join(out,url)),content);
  const requests=(await fs.readFile(log,'utf8')).trim().split('\n').map(JSON.parse);assert.ok(requests.every(r=>r.url.includes('/'+commit+'/')));assert.equal(requests[1].headers.Range,'bytes=17-');
  r=run({},'zerg');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/"verified":1/);assert.equal((await fs.readFile(log,'utf8')).trim().split('\n').length,3);
  await fs.rm(path.join(out,url));r=run({SC2_FAKE_POINTER:'1'});assert.notEqual(r.status,0);assert.match(r.stderr,/Hash\/size mismatch/);assert.equal(await fs.stat(path.join(out,url)).catch(()=>null),null);
  await fs.writeFile(path.join(out,'web-release.json'),JSON.stringify({release:'different'}));r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/do not match this app release/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
