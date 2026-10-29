/** Bounded historical SW fetch-handler check. No browser, live deployment, or user data. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.join(project,'sites/size-optimized-site/public');
const newName='sites-pack-index.0bb43ff1011a0ab1462d.js',oldName='sites-pack-index.aa62d6f89e565b0b0b01.js';
const parse=text=>JSON.parse(text.trim().replace(/^self\.SC2_PACK_INDEX=/,'').replace(/;$/,''));
const newText=fs.readFileSync(path.join(root,newName),'utf8'),newIndex=parse(newText),oldIndex=parse(fs.readFileSync(path.join(root,oldName),'utf8'));
const release=JSON.parse(fs.readFileSync(path.join(root,'web-release.json'),'utf8'));
const manifest=JSON.parse(fs.readFileSync(path.join(root,release.manifest),'utf8'));
assert.equal(manifest.release,'ae1ee84c46fba61f6d2ab38a19032991daaf5bd0f3e127d0ac43371577355bb2','Historical check needs the version 16 resource release');
const files=Object.values(manifest.gpuTextures);assert.equal(files.length,43);
const cases=[];
for(const spec of [{ref:'28c7987',query:true,expected:43},{ref:'28c7987',query:false,expected:0},{ref:'91b0775',query:true,expected:0},{ref:'ac053e2',query:true,expected:43}]){
 const source=execFileSync('git',['show',spec.ref+':sites/size-optimized-site/public/sites-sw.js'],{cwd:project,encoding:'utf8',maxBuffer:1024*1024});
 const listeners={},network=[];
 const request=async input=>{
  const url=new URL(typeof input==='string'||input instanceof URL?String(input):input.url);network.push(url.pathname);
  if(url.pathname==='/'+newName)return new Response(newText);
  if(/^\/assets\/gpu-textures-[a-f0-9]{20}\.bin$/.test(url.pathname))return new Response(fs.readFileSync(path.join(root,url.pathname.slice(1))));
  return new Response('Not found',{status:404});
 };
 const worker={registration:{scope:'https://game.example.test/'},location:new URL('https://game.example.test/sites-sw.js'),clients:{matchAll:async()=>[],get:async()=>null,claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(name,fn)=>listeners[name]=fn,SC2_PACK_INDEX:spec.ref==='ac053e2'?newIndex:oldIndex};
 vm.runInNewContext(source,{self:worker,importScripts:()=>{},fetch:request,URL,Response,Request,Headers,AbortController,Blob,DecompressionStream,performance,setTimeout,clearTimeout});
 let passed=0,missing=0;const unexpected=[];
 for(const file of files){
  const url=new URL(file.url,'https://game.example.test/');if(spec.query)url.searchParams.set('sc2-index',newName);
  let handled;listeners.fetch({request:new Request(url),clientId:'',respondWith:promise=>handled=promise,waitUntil:()=>{}});
  const response=await(handled??request(url));if(response.status===404){missing++;continue;}
  const data=Buffer.from(await response.arrayBuffer());
  if(response.status===200&&createHash('sha256').update(data).digest('hex')===file.sha256)passed++;
  else unexpected.push({status:response.status,bytes:data.length});
 }
 assert.equal(passed,spec.expected);assert.equal(missing,43-spec.expected);assert.deepEqual(unexpected,[]);
 cases.push({workerCommit:spec.ref,defaultIndex:spec.ref==='ac053e2'?newName:oldName,newIndexQuery:spec.query,multiIndexCode:source.includes('indexFor('),passedWithCorrectHash:passed,missing404:missing,unexpected,networkIndexReads:network.filter(p=>p.endsWith(newName)).length});
}
const report={date:'2026-10-28',finding:'V06-SW-001',status:'isolated-compatibility-check-complete-live-cause-unconfirmed',scope:'Committed SW fetch handlers in isolated Node VM; actual index/bundle bytes; mocked network with no standalone asset files. Does not exercise browser installation, activation, cache policy, or Coze deployment.',gpuFiles:files.length,oldIndexContains:files.filter(file=>oldIndex[file.url]).length,newIndexContains:files.filter(file=>newIndex[file.url]).length,cases,limits:['Coze v3/v4 is the reported deployment terminology; no mapping to tested Git commits established.','Original iPhone reload remains a separate unconfirmed issue.','Standalone files cover network fallthrough; they do not automatically replace SW-generated 502/error responses.'],next:'Obtain actual failed URL including query and deployed/controller SW identity; validate old-client upgrade before deployment.'};
if(process.argv[2])fs.writeFileSync(path.resolve(process.argv[2]),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
