import fs from 'node:fs';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='.cache/t01-closeout';fs.mkdirSync(root,{recursive:true});
const git=(...args)=>execFileSync('git',['-c','core.quotePath=false',...args],{encoding:'utf8',maxBuffer:32*1024*1024}).trimEnd();
const walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):e.isFile()?[p+'/'+e.name]:[]);
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
if(!fs.existsSync(root+'/baseline.json')){
 const files=Object.fromEntries(['src','test','tools/t01'].flatMap(walk).map(p=>[p,sha(p)]));
 const status=git('status','--porcelain=v1','-uall'),tracked=status.split('\n').filter(p=>!p.startsWith('?? ')).map(p=>p.slice(3)).join('\n');
 fs.writeFileSync(root+'/baseline.json',JSON.stringify({date:new Date().toISOString(),head:git('rev-parse','HEAD'),branch:git('branch','--show-current'),files,status,tracked},null,2));
 fs.copyFileSync('src/data/combat-audio.json',root+'/previous-audio.json');
}
const base=JSON.parse(fs.readFileSync(root+'/baseline.json'));
const report=JSON.parse(fs.readFileSync('reports/qa/t01-all-motion-source-search-20261026.json','utf8').replace(/^\uFEFF/,''));
console.log(JSON.stringify({head:base.head,files:Object.keys(base.files).length,changes:base.tracked.split('\n').filter(p=>!p.startsWith('reports/local/')),untrackedGroups:base.status.split('\n').filter(x=>x.startsWith('?? ')).reduce((a,p)=>{const k=p.slice(3).split('/').slice(0,2).join('/');a[k]=(a[k]??0)+1;return a;},{}),herds:report.identities.filter(x=>x.herd).map(x=>({key:x.key,herd:x.herd})),dehaka:report.units.find(x=>x.sourceIdentity==='hero:dehaka')?.modelSources.map(x=>({id:x.id,clips:x.walkClips})),audioExample:report.originalAudio[0]},null,2));
