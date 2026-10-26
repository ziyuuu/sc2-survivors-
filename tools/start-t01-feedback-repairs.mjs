import fs from 'node:fs/promises';
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';
const root='.cache/t01-feedback-repairs';await fs.mkdir(root,{recursive:true});
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){
 const files={};async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else files[p]=await hash(p);}}
 await scan('src');await scan('test');await scan('tools/t01');
 const delivery=JSON.parse(await fs.readFile('reports/qa/t01-feedback-repair-plan-20261026.json','utf8')).delivery;
 const current='dist/SC2-Survivors-Current-20261006.html';
 await fs.writeFile(root+'/baseline.json',JSON.stringify({files,delivery,current:{file:current,sha256:await hash(current)},authorization:'2026-10-26 用户“开始吧”，实施 T01_FEEDBACK_REPAIR_PLAN_20261026.md 八项修复；机制不变，正常构建与单个综合HTML交付，Current保持。'},null,2));
}
console.log(root);
