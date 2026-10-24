import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {loadBuildAssets} from './load-build-assets.mjs';
const root=process.cwd(),base='reports/local/v01-closeout-20261024';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',maxBuffer:32*1024*1024}).trim();
const list=(...args)=>git(...args,'-z').split('\0').filter(Boolean);
const staged=list('diff','--cached','--name-only');
const indexed=new Set(list('ls-files'));
assert.equal(git('branch','--show-current'),'main');
assert.equal(git('diff','--name-only','--','src','test'),'','Unstaged source/test edits');
assert.ok(staged.every(f=>!f.startsWith('assets/private/')&&!f.startsWith('reports/local/')&&!f.startsWith('dev/')&&(!f.startsWith('preview/')||f==='preview/README.md')));
const records=await loadBuildAssets(),runtimePaths=new Set();
for(const name of (await fs.readdir('deploy/runtime')).filter(f=>f.endsWith('.json'))){
 const catalog=JSON.parse(await fs.readFile('deploy/runtime/'+name,'utf8'));
 const visit=v=>{if(Array.isArray(v)){for(const x of v)visit(x);}else if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(k==='gitPath'&&typeof x==='string'&&x.startsWith('deploy/runtime/'))runtimePaths.add(x);else if(x&&typeof x==='object')visit(x);}}};visit(catalog);
}
const missing=[...runtimePaths].filter(f=>!indexed.has(f));assert.deepEqual(missing,[]);
const binaryRows=[];
for(const file of staged.filter(f=>f.startsWith('deploy/runtime/')&&!f.endsWith('.json'))){
 const bytes=await fs.readFile(file),sha=createHash('sha256').update(bytes).digest('hex');
 if(!runtimePaths.has(file)){binaryRows.push({file,bytes:bytes.length,sha256:sha,referenced:false});continue;}
 const pointer=git('show',':'+file);
 assert.equal(pointer,`version https://git-lfs.github.com/spec/v1\noid sha256:${sha}\nsize ${bytes.length}`,file);
 binaryRows.push({file,bytes:bytes.length,sha256:sha,referenced:runtimePaths.has(file)});
}
const findings=[];
const secretPatterns=[/gh[pousr]_[A-Za-z0-9]{30,}/,/github_pat_[A-Za-z0-9_]{60,}/,/sk-proj-[A-Za-z0-9_-]{40,}/,/AKIA[A-Z0-9]{16}/,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/];
for(const file of staged.filter(f=>!binaryRows.some(b=>b.file===f))){const text=await fs.readFile(file,'utf8');if(secretPatterns.some(re=>re.test(text)))findings.push(file);}
assert.deepEqual(findings,[],'Credential-pattern review required');
const compiledInputs=new Set();
await build({configFile:'vite.config.ts',logLevel:'warn',plugins:[{name:'verify-index-closure',generateBundle(){for(const id of this.getModuleIds()){if(id.startsWith('\0'))continue;const file=id.split('?')[0];if(path.isAbsolute(file)){const rel=path.relative(root,file).replaceAll('\\','/');if(!rel.startsWith('../')&&!rel.startsWith('node_modules/')&&!path.isAbsolute(rel))compiledInputs.add(rel);}}}}],build:{write:false,copyPublicDir:false,emptyOutDir:false,outDir:base+'/compile-only',minify:false}});
assert.ok(compiledInputs.size>400,'Compilation input collection was empty or incomplete');
const generated=new Set(['src/assets/runtime.generated.ts']);
const missingInputs=[...compiledInputs].filter(f=>!indexed.has(f)&&!generated.has(f));assert.deepEqual(missingInputs,[],'Compilation depends on uncommitted source');
const report={date:new Date().toISOString(),pass:true,branch:'main',baseCommit:git('rev-parse','HEAD'),stagedFiles:staged.length,sourceTestWorktreeEqualsIndex:true,build:{compiledInputs:compiledInputs.size,missingInputs,generated:[...generated],written:false},resources:{records:records.length,indexedRuntimePaths:runtimePaths.size,newLfsObjects:binaryRows.length,newLfsBytes:binaryRows.reduce((n,r)=>n+r.bytes,0),unreferencedNewLfs:binaryRows.filter(r=>!r.referenced).map(r=>r.file)},credentialPatternFindings:findings,files:staged,binaryRows};
await fs.writeFile(base+'/index-verification.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,files:undefined,binaryRows:undefined}));
