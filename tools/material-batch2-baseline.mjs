import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const out='reports/local/material-batch2-20261010';
const hash=b=>createHash('sha256').update(b).digest('hex');
try{await fs.access(out+'/baseline.json');throw Error('The batch baseline already exists');}catch(e){if(e.code!=='ENOENT')throw e;}
const files=[];
async function walk(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){if(item.isSymbolicLink())continue;const file=path.join(dir,item.name);if(item.isDirectory())await walk(file);else{const b=await fs.readFile(file);files.push({file:file.replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});if(dir==='src'||dir.startsWith('src'+path.sep)){const target=path.join(out,'baseline-source',file);await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,b);}}}}
for(const dir of ['src','tools','public','deploy/runtime','deploy/coze/public'])await walk(dir);
const release=JSON.parse(await fs.readFile('dist/web/web-release.json','utf8'));
await fs.mkdir(out,{recursive:true});
await fs.copyFile('dist/web/'+release.manifest,out+'/baseline-asset-manifest.json');
await fs.writeFile(out+'/baseline.json',JSON.stringify({head:'b56201c57092386ff795db04ba46a507b427d621',createdAt:new Date().toISOString(),release,files},null,2));
console.log(JSON.stringify({out,protected:files.length,sourceFrozen:true}));
