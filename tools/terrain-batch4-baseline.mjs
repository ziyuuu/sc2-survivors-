import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

const out='reports/local/terrain-batch4-20261011';
const head=process.argv[2];
if(head!=='41391803ced755ec26d5ac248263a7ca5aa118ef')throw Error('Unexpected formal baseline');
try{await fs.access(out+'/baseline.json');throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
await fs.mkdir(out,{recursive:true});
const files=[];
async function keep(file,freeze=false){
 const hash=createHash('sha256');let bytes=0;for await(const chunk of createReadStream(file)){hash.update(chunk);bytes+=chunk.length;}
 files.push({file:file.replaceAll('\\','/'),bytes,sha256:hash.digest('hex')});
 if(freeze){const target=path.join(out,'baseline-source',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(file,target);}
}
async function walk(dir,freeze=false){for(const item of await fs.readdir(dir,{withFileTypes:true})){if(item.isSymbolicLink())throw Error('Linked protection root '+dir+'/'+item.name);const file=path.join(dir,item.name);if(item.isDirectory())await walk(file,freeze);else await keep(file,freeze);}}
for(const dir of ['src','tools','test','public','deploy/runtime','deploy/coze/public','assets/private/dds','assets/private/m3'])await walk(dir,dir==='src');
for(const file of ['package.json','package-lock.json','AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','docs/ROADMAP.md','docs/project/RANDOM_EVENTS_ITEMS_CONCEPT_20261009.md'])await keep(file);
for(const dir of ['dev','preview/battle-playfield-20261009','preview/intermission-ui-kit-20261008','preview/sc2-native-hud-20261009'])await walk(dir);
for(const item of await fs.readdir('dist',{withFileTypes:true}))if(item.isFile()&&/\.(html|zip)$/.test(item.name))await keep('dist/'+item.name);
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.copyFile('dist/web/'+release.manifest,out+'/baseline-asset-manifest.json');
await fs.copyFile('reports/local/material-batch2-20261010/source-stamp.json',out+'/original-source-stamp.json');
await fs.writeFile(out+'/baseline.json',JSON.stringify({head,createdAt:new Date().toISOString(),release,files,worktreeStatus:await fs.readFile(out+'/baseline-worktree.txt','utf8'),method:'Frozen 4139180 production source; all existing local DDS/M3, original runtime art, unrelated work and named deliveries protected'},null,2));
console.log(JSON.stringify({out,head,protected:files.length,logicalBytes:files.reduce((n,r)=>n+r.bytes,0),sourceFrozen:true}));
