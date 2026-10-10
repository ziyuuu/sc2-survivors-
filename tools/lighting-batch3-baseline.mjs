import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const out='reports/local/lighting-batch3-20261010';
const sha=b=>createHash('sha256').update(b).digest('hex');
const head=process.argv[2];
if(head!=='ab1ce01b73bc891a72e43d25b135d93425a70989')throw Error('Unexpected formal baseline');
try{await fs.access(out+'/baseline.json');throw Error('Baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const files=[];
async function keep(file,freeze=false){const b=await fs.readFile(file);files.push({file:file.replaceAll('\\','/'),bytes:b.length,sha256:sha(b)});if(freeze){const target=path.join(out,'baseline-source',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,b);}}
async function walk(dir,freeze=false){for(const item of await fs.readdir(dir,{withFileTypes:true})){if(item.isSymbolicLink())throw Error('Refuse linked protection root '+dir+'/'+item.name);const file=path.join(dir,item.name);if(item.isDirectory())await walk(file,freeze);else await keep(file,freeze);}}
for(const dir of ['src','tools','test','public','deploy/runtime','deploy/coze/public'])await walk(dir,dir==='src');
for(const file of ['package.json','package-lock.json','AGENTS.md','docs/project/VISUAL_OPTIMIZATION_PLAN_20261009.md','docs/ROADMAP.md','docs/project/RANDOM_EVENTS_ITEMS_CONCEPT_20261009.md'])await keep(file);
for(const dir of ['dev','preview/battle-playfield-20261009','preview/intermission-ui-kit-20261008','preview/sc2-native-hud-20261009'])await walk(dir);
for(const item of await fs.readdir('dist',{withFileTypes:true}))if(item.isFile()&&/\.(html|zip)$/.test(item.name))await keep('dist/'+item.name);
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.mkdir(out,{recursive:true});
await fs.copyFile('dist/web/'+release.manifest,out+'/baseline-asset-manifest.json');
await fs.copyFile('reports/local/material-batch2-20261010/source-stamp.json',out+'/original-source-stamp.json');
await fs.writeFile(out+'/baseline.json',JSON.stringify({head,createdAt:new Date().toISOString(),release,files,worktreeStatus:await fs.readFile(out+'/baseline-worktree.txt','utf8'),method:'Frozen ab1ce01 production source and original resources; unrelated work and named deliveries protected'},null,2));
console.log(JSON.stringify({out,head,protected:files.length,sourceFrozen:true}));
