import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='.cache/t01-sound-recheck';await fs.mkdir(root,{recursive:true});
if(!await fs.stat(root+'/baseline.json').catch(()=>null)){
 const files={};async function scan(d){for(const e of await fs.readdir(d,{withFileTypes:true})){const p=d+'/'+e.name;if(e.isDirectory())await scan(p);else files[p]=createHash('sha256').update(await fs.readFile(p)).digest('hex');}}
 await scan('src');await scan('test');await scan('tools/t01');
 const previous=JSON.parse((await fs.readFile('reports/qa/t01-motion-audio-20261026.json','utf8')).replace(/^\uFEFF/,''));
 await fs.writeFile(root+'/baseline.json',JSON.stringify({files,delivery:previous.delivery,current:previous.preservation.current,boardRevision:214,authorization:'用户质疑找不到移动声音，并再次要求包括英雄语音；复核原版完整事件及音频来源，补齐遗漏。'},null,2));
 await fs.copyFile('src/data/combat-audio.json',root+'/previous-audio.json');
}
console.log(root);
