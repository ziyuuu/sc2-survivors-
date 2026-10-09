import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=path.resolve('preview/sc2-quality-20261009'),files=(await fs.readdir(root)).filter(n=>/\.(ts|mts|css|html|json|mjs)$/.test(n)&&n!=='source-stamp.json').map(n=>'preview/sc2-quality-20261009/'+n).concat(['src/render/units/animated-batch.ts','src/render/scene/battle-renderer.ts']);
const hashes=[];for(const file of files){const bytes=await fs.readFile(file);hashes.push({path:file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const digest=createHash('sha256').update(JSON.stringify(hashes)).digest('hex');
await fs.writeFile(path.join(root,'source-stamp.json'),JSON.stringify({digest,files:hashes},null,2));
if(process.argv[2]){const out=path.resolve(process.argv[2],digest);await fs.mkdir(out,{recursive:true});for(const f of hashes){const target=path.join(out,f.path);await fs.mkdir(path.dirname(target),{recursive:true});await fs.copyFile(f.path,target);}await fs.copyFile(path.join(root,'source-stamp.json'),path.join(out,'source-stamp.json'));}
console.log(digest);
