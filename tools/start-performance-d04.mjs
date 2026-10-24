import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/performance-d04-20261021',boardPath='docs/project/performance-board.json',baseline='preview/performance-d03-20261021-candidate-r1';
const original=await fs.readFile(boardPath,'utf8'),board=JSON.parse(original),task=board.tasks.find(t=>t.id==='D04'),hash=b=>createHash('sha256').update(b).digest('hex');
assert.equal(board.revision,102);assert.equal(task.status,'待讨论');await fs.mkdir(root,{recursive:false});await fs.writeFile(root+'/board-before.json',original);
const files=[];for(const name of execFileSync('rg',['--files','src','test'],{encoding:'utf8'}).trim().split(/\r?\n/)){const file=name.replaceAll('\\','/'),bytes=await fs.readFile(file);files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(root+'/inputs-before.json',JSON.stringify({files},null,2)+'\n');
const build=JSON.parse(await fs.readFile(baseline+'/build-inputs.json','utf8'));
for(const f of build.inputs.filter(x=>x.file.startsWith('src/'))){const bytes=await fs.readFile(f.source);assert.equal(hash(bytes),f.sha256);const target=root+'/baseline-inputs/'+f.file;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);}
task.status='进行中';task.updated='2026-10-21';task.result='用户批准菜单按需、缩小开局必需范围、按实际装备准备，并利用前三关逐步准备后续内容；地图逻辑完整，远处视觉资源评估分批。保留已有下载本族/全部入口。重点对照开局等待及前三关卡顿，原刷怪/模拟时序不变；未决定磁盘驱逐预算，不新增自动删除。开始实现与核验。';
board.revision++;board.updated='2026-10-21';board.next='D04';board.updates.push({date:'2026-10-21',tasks:['D04'],change:task.result,evidence:['../../'+root+'/board-before.json']});await fs.writeFile(boardPath,JSON.stringify(board,null,2)+'\n');
console.log(JSON.stringify({revision:board.revision,files:files.length,frozenProduction:build.inputs.filter(x=>x.file.startsWith('src/')).length}));
