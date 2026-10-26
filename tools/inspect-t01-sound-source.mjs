import fs from 'node:fs/promises';
import {DOMParser} from '@xmldom/xmldom';
const arg=(key,fallback)=>process.argv.find(a=>a.startsWith(key+'='))?.slice(key.length+1)??fallback;
const type=arg('--type','Sound'),pattern=new RegExp(arg('--match','^(Nova|Marine|Stimpack)'),'i'),full=process.argv.includes('--full'),filePattern=new RegExp(arg('--file','.'),'i'),ids=new Set();
const files=[];
async function scan(dir){for(const e of await fs.readdir(dir,{withFileTypes:true})){const p=dir+'/'+e.name;if(e.isDirectory())await scan(p);else if(e.name===type+'Data.xml')files.push(p);}}
await scan('assets/private/actor-source');
for(const file of files.filter(f=>filePattern.test(f))){const xml=await fs.readFile(file,'utf8'),dom=new DOMParser().parseFromString(xml,'text/xml');for(const node of Array.from(dom.documentElement.childNodes).filter(n=>n.nodeType===1&&pattern.test(n.getAttribute('id')??''))){
 if(process.argv.includes('--ids')){ids.add(node.getAttribute('id'));continue;}
 if(full)console.log(file+'\n'+node.toString());
 else{const links=Array.from(node.childNodes).filter(n=>n.nodeType===1&&/Sound|Asset|File|Weapon|Impact|Launch|Response|Parent|Alias|On/.test(n.tagName)).map(n=>n.toString());console.log(JSON.stringify({file:file.replace('assets/private/actor-source/',''),id:node.getAttribute('id'),parent:node.getAttribute('parent'),tag:node.tagName,links:links.slice(0,type==='Sound'?8:40)}));}
}}
if(process.argv.includes('--ids'))console.log([...ids].join('\n'));
