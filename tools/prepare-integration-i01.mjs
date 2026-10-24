import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync,execFileSync} from 'node:child_process';

const root='D:/星际', fun='C:/Users/zyuu/.codex/worktrees/mission/星际';
const out=root+'/reports/local/integration-i01-20261022';
const ancestor='be9e2982944314194c6dcc9dcc535bc321749eb4';
const hash=b=>b===null?null:createHash('sha256').update(b).digest('hex');
const normalized=b=>b===null?null:b.toString('utf8').replaceAll('\r\n','\n');
const read=(r,p)=>fs.existsSync(r+'/'+p)?fs.readFileSync(r+'/'+p):null;
const put=(p,b)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,b);};
function walk(r,d){if(!fs.existsSync(r+'/'+d))return [];return fs.readdirSync(r+'/'+d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(r,d+'/'+e.name):[d+'/'+e.name]);}
if(fs.existsSync(out+'/merge-manifest.json'))throw Error('Snapshot already exists');
const roots=['src','test','tools'];
const extras=['package.json','package-lock.json','tsconfig.json','vite.config.ts','index.html','fun-lab.html','assets/private/m3-pack.json','deploy/runtime/combat-effects.json','deploy/runtime/mission-assets.json','deploy/runtime/fun-props.json'];
const files=[...new Set([...roots.flatMap(d=>walk(root,d)),...roots.flatMap(d=>walk(fun,d)),...extras])].sort().filter(p=>p!=='tools/prepare-integration-i01.mjs');
const tree=execFileSync('git',['-C',root,'ls-tree','-rz',ancestor],{maxBuffer:40e6}).toString('utf8');
const objects=new Map(tree.split('\0').filter(Boolean).map(s=>{const [header,p]=s.split('\t');return[p,header.split(' ')[2]];}));
const wanted=files.filter(p=>objects.has(p));
const data=execFileSync('git',['-C',root,'cat-file','--batch'],{input:wanted.map(p=>objects.get(p)).join('\n')+'\n',maxBuffer:300e6});
let pos=0;const base=new Map();
for(const p of wanted){const end=data.indexOf(10,pos),size=Number(data.subarray(pos,end).toString().split(' ')[2]);base.set(p,data.subarray(end+1,end+1+size));pos=end+size+2;}
const manifest=[];
for(const p of files){const a=read(root,p),b=base.get(p)??null,c=read(fun,p);let action;
  if(c===null)action='keep-main';
  else if(normalized(a)===normalized(c))action='identical';
  else if(normalized(c)===normalized(b))action='keep-main';
  else if(normalized(a)===normalized(b))action='take-fun';
  else action='merge';
  // Keep accepted main-only files, and freeze every source/test input even when unchanged.
  for(const [side,bytes] of [['main',a],['fun',c],['base',b]])if(bytes!==null)put(out+'/before/'+side+'/'+p,bytes);
  let result=a;
  if(action==='take-fun')result=c;
  if(action==='merge'){
    const temp=out+'/merge-work/'+p;
    for(const [side,bytes] of [['main',a],['base',b],['fun',c]])put(temp+'.'+side,normalized(bytes)??'');
    const m=spawnSync('git',['merge-file','-p','--diff3','-L','MAIN_ACCEPTED','-L','COMMON_ANCESTOR','-L','FUN_LATEST',temp+'.main',temp+'.base',temp+'.fun'],{maxBuffer:120e6});
    if(m.status===null||m.status<0||m.status>127)throw Error(p+': '+m.stderr);
    result=m.stdout;action=m.status===0?'auto-merged':'conflict';
  }
  if(result!==null)put(out+'/draft/'+p,result);
  manifest.push({path:p,action,main:hash(a),base:hash(b),fun:hash(c),draft:hash(result)});
}
put(out+'/merge-manifest.json',JSON.stringify({at:new Date().toISOString(),root,fun,ancestor,files:manifest},null,2));
const counts={};for(const r of manifest)counts[r.action]=(counts[r.action]??0)+1;
console.log(JSON.stringify({out,counts,conflicts:manifest.filter(r=>r.action==='conflict').map(r=>r.path),auto:manifest.filter(r=>r.action==='auto-merged').map(r=>r.path),takeFun:manifest.filter(r=>r.action==='take-fun').map(r=>r.path)},null,2));
