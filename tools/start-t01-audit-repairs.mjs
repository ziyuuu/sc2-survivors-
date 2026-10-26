import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='.cache/t01-audit-repairs';await fs.mkdir(root,{recursive:true});
const files={};async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else files[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');}}
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){await scan('src');await scan('test');await fs.writeFile(root+'/baseline.json',JSON.stringify(files));}
console.log(root);
