import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const root='.cache/t01-closeout',git=(...args)=>execFileSync('git',['-c','core.quotePath=false',...args],{encoding:'utf8',maxBuffer:32*1024*1024});
const list=(...args)=>git(...args,'-z').split('\0').filter(Boolean),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const staged=list('diff','--cached','--name-only'),indexed=new Set(list('ls-files')),plan=JSON.parse(fs.readFileSync(root+'/index-plan.json'));
assert.deepEqual(staged.slice().sort(),plan.included.slice().sort());
assert.ok(staged.every(p=>!p.startsWith('assets/private/')&&!p.startsWith('reports/local/')&&!p.startsWith('preview/')&&!p.startsWith('dev/')));
const batch=execFileSync('git',['cat-file','--batch'],{input:staged.map(p=>':'+p+'\n').join(''),maxBuffer:256*1024*1024});let offset=0;
const binaries=[],files=[],secretPatterns=[/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{60,}/,/sk-proj-[A-Za-z0-9_-]{40,}/,/AKIA[A-Z0-9]{16}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const file of staged){
 const end=batch.indexOf(10,offset),header=batch.subarray(offset,end).toString(),match=/^([a-f0-9]{40}) blob (\d+)$/.exec(header);assert.ok(match,header);
 const size=Number(match[2]),bytes=batch.subarray(end+1,end+1+size);offset=end+size+2;const actual=fs.readFileSync(file);
 if(file.startsWith('deploy/runtime/')&&!file.endsWith('.json')){
  const hash=sha(actual);assert.equal(bytes.toString().trim(),`version https://git-lfs.github.com/spec/v1\noid sha256:${hash}\nsize ${actual.length}`,file);binaries.push({file,sha256:hash,bytes:actual.length});
 }else{
  assert.equal(bytes.toString(),actual.toString().replace(/\r\n/g,'\n'),file+' index differs from tested working file');assert.ok(!secretPatterns.some(p=>p.test(bytes.toString())),file+' credential pattern');files.push({file,sha256:sha(bytes),bytes:size});
 }
}
const build=JSON.parse(fs.readFileSync('reports/local/t01-20261024/build.json'));
for(const r of build.inputs){
 assert.equal(sha(fs.readFileSync(r.file)),r.sha256,r.file+' changed after build');
 if(r.file.startsWith('node_modules/')){
  const dependency=r.file.split('/').slice(0,2).join('/');assert.ok(['node_modules/three','node_modules/meshoptimizer'].includes(dependency));
  assert.ok(indexed.has('package-lock.json'));const lock=JSON.parse(fs.readFileSync('package-lock.json')),installed=JSON.parse(fs.readFileSync(dependency+'/package.json'));
  assert.equal(installed.version,lock.packages[dependency].version);assert.ok(lock.packages[dependency].integrity);
 }else assert.ok(indexed.has(r.file)||r.file==='src/assets/runtime.generated.ts',r.file+' not in index');
}
const runtime=new Set();const visit=x=>{if(Array.isArray(x))x.forEach(visit);else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(k==='gitPath'&&typeof v==='string')runtime.add(v);else if(v&&typeof v==='object')visit(v);}};
for(const file of fs.readdirSync('deploy/runtime').filter(f=>f.endsWith('.json')))visit(JSON.parse(fs.readFileSync('deploy/runtime/'+file)));
assert.ok(binaries.every(r=>runtime.has(r.file)));assert.deepEqual([...runtime].filter(p=>!indexed.has(p)),[]);
const report={pass:true,branch:git('branch','--show-current').trim(),base:git('rev-parse','HEAD').trim(),stagedFiles:staged.length,verifiedBuildInputs:build.inputs.length,stagedResourceFiles:binaries.length,stagedResourceBytes:binaries.reduce((n,r)=>n+r.bytes,0),runtimeReferences:runtime.size,privateOriginalsStaged:0,sourceAndTestsEqualIndex:true,files,binaries};
fs.writeFileSync(root+'/index-verification.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,files:undefined,binaries:undefined}));
