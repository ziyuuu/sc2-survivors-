import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const out='reports/local/combat-effects-20261012';
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(!head.startsWith('e832844'))throw Error('Unexpected combat-effect baseline');
await fs.access(out+'/baseline.json').then(()=>{throw Error('Baseline already exists');},e=>{if(e.code!=='ENOENT')throw e;});
await fs.mkdir(out,{recursive:true});
const status=execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'});
await fs.writeFile(out+'/baseline-worktree.txt',status);
const files=[];
async function keep(file,freeze=false){
 const digest=createHash('sha256');let bytes=0;
 for await(const b of createReadStream(file)){digest.update(b);bytes+=b.length;}
 files.push({file:file.replaceAll('\\','/'),bytes,sha256:digest.digest('hex')});
 if(freeze){const target=path.join(out,'baseline-source',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(file,target);}
}
async function walk(dir,freeze=false){
 for(const item of await fs.readdir(dir,{withFileTypes:true})){
  if(item.isSymbolicLink())throw Error('Linked protection root '+dir+'/'+item.name);
  const file=path.join(dir,item.name);if(item.isDirectory())await walk(file,freeze);else await keep(file,freeze);
 }
}
for(const dir of ['src','tools','test','public','deploy/runtime','deploy/coze/public','assets/private/dds','assets/private/m3','assets/private/actor-source'])await walk(dir,dir==='src');
for(const file of ['package.json','package-lock.json','AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','docs/ROADMAP.md'])await keep(file);
for(const item of await fs.readdir('docs/project'))if(/^(STARSHIP_|RANDOM_EVENTS_|CINEMATIC_PRELOAD_|LOADING_OPTIMIZATION_)/.test(item))await keep('docs/project/'+item);
for(const dir of ['dev','preview/battle-playfield-20261009','preview/intermission-ui-kit-20261008','preview/sc2-native-hud-20261009'])await walk(dir);
for(const item of await fs.readdir('dist',{withFileTypes:true}))if(item.isFile()&&/\.(html|zip)$/.test(item.name))await keep('dist/'+item.name);
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.copyFile('dist/web/'+release.manifest,out+'/baseline-asset-manifest.json');
await fs.copyFile('reports/local/material-batch2-20261010/source-stamp.json',out+'/original-source-stamp.json');
await fs.writeFile(out+'/baseline.json',JSON.stringify({head,createdAt:new Date().toISOString(),release,files,worktreeStatus:status,method:'Frozen approved e832844 production source, original assets, named deliveries and unrelated work before combat-effect implementation.'},null,2));
console.log(JSON.stringify({out,head,protected:files.length,logicalBytes:files.reduce((n,r)=>n+r.bytes,0),sourceFrozen:true}));
