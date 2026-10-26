import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createReadStream} from 'node:fs';
const root='.cache/t01-motion-feedback';await fs.mkdir(root,{recursive:true});
async function hash(p){const h=createHash('sha256');for await(const b of createReadStream(p))h.update(b);return h.digest('hex');}
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){
 const files={};async function scan(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())await scan(p);else files[p]=await hash(p);}}
 await scan('src');await scan('test');await scan('tools/t01');
 const previous=JSON.parse((await fs.readFile('reports/qa/t01-feedback-repairs-20261026.json','utf8')).replace(/^\uFEFF/,''));
 await fs.writeFile(root+'/baseline.json',JSON.stringify({files,delivery:previous.delivery,current:previous.preservation.current,boardRevision:213,authorization:'2026-10-26 用户反馈变形/移动无声，明确脚步履带引擎；随后要求加入单位对话轮播，澄清移动射击是装备、应适用于所有远程单位。补接音频并修正实际展示；保留原生攻击范围/目标/部署限制，若需改变机制先明确差异。'},null,2));
}
console.log(root);
