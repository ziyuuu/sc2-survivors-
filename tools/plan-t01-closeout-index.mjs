import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='.cache/t01-closeout',git=(...args)=>execFileSync('git',['-c','core.quotePath=false',...args],{encoding:'utf8',maxBuffer:32*1024*1024});
const status=git('status','--porcelain=v1','-z','-uall').split('\0').filter(Boolean).map(s=>({status:s.slice(0,2),file:s.slice(3)}));
assert.ok(status.every(s=>!/[RC]/.test(s.status)),'Review renamed paths explicitly');
const runtime=new Set(),jsonFiles=fs.readdirSync('deploy/runtime').filter(f=>f.endsWith('.json'));
function visit(x){if(Array.isArray(x))x.forEach(visit);else if(x&&typeof x==='object')for(const[k,v]of Object.entries(x)){if(k==='gitPath'&&typeof v==='string'&&v.startsWith('deploy/runtime/'))runtime.add(v);else if(v&&typeof v==='object')visit(v);}}
for(const file of jsonFiles)visit(JSON.parse(fs.readFileSync('deploy/runtime/'+file,'utf8')));
const docs=new Set(['AGENTS.md','docs/ARCHITECTURE.md','docs/DESIGN.md','docs/project/PERFORMANCE_BOARD.html','docs/project/PERFORMANCE_TODO.md','docs/project/performance-board.json','docs/project/ARTIFACT_RETENTION.md']);
const select=p=>docs.has(p)||p.startsWith('src/')||p.startsWith('test/')||p.startsWith('docs/project/T01')||p.startsWith('reports/qa/t01-')||p.startsWith('tools/t01/')||p.startsWith('tools/')&&(p.includes('t01')||['tools/combat-audio-assets.mjs','tools/prepare-combat-audio.py','tools/combat-death-models.json','tools/load-build-assets.mjs','tools/material-batch2-source.mjs','tools/mission-models.json','tools/prepare-combat-refraction.mjs','tools/resolve-combat-deaths.py','tools/restore-git-runtime.mjs'].includes(p))||p.startsWith('deploy/runtime/')&&(runtime.has(p)||p.endsWith('.json'));
const included=status.filter(s=>!s.status.includes('D')&&select(s.file)).map(s=>s.file).sort(),excluded=status.filter(s=>!included.includes(s.file));
assert.ok(included.length>100);assert.ok(included.every(p=>!p.startsWith('assets/private/')&&!p.startsWith('preview/')&&!p.startsWith('dev/')&&!p.startsWith('reports/local/')));
const tracked=new Set(git('ls-files','-z').split('\0').filter(Boolean));assert.deepEqual([...runtime].filter(p=>!tracked.has(p)&&!included.includes(p)),[]);
const counts=list=>list.reduce((a,p)=>{const k=p.startsWith('tools/')?'tools':p.startsWith('test/')?'test':p.split('/').slice(0,2).join('/');a[k]=(a[k]??0)+1;return a;},{});
const manifest={base:git('rev-parse','HEAD').trim(),included,excluded:excluded.map(s=>({...s,reason:s.status.includes('D')?'Earlier approved artifact cleanup; preserved unstaged':s.file.startsWith('assets/private/')?'Private original metadata retained locally':s.file.startsWith('deploy/runtime/')?'Unreferenced obsolete generated resource':'Outside T01 cumulative repair scope'})),runtimeReferences:runtime.size};
fs.writeFileSync(root+'/index-plan.json',JSON.stringify(manifest,null,2));fs.writeFileSync(root+'/index-paths.txt',included.join('\n')+'\n');
console.log(JSON.stringify({base:manifest.base,included:included.length,groups:counts(included),excluded:excluded.length,unreferencedRuntime:excluded.filter(s=>s.file.startsWith('deploy/runtime/')).length,runtimeReferences:runtime.size},null,2));
