import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root='reports/local/performance-d03-20261021',file='docs/project/performance-board.json';
const original=await fs.readFile(file,'utf8'),board=JSON.parse(original),task=board.tasks.find(t=>t.id==='D03');
assert.equal(board.revision,100);assert.equal(task.status,'待讨论');
await fs.mkdir(root,{recursive:false});await fs.writeFile(root+'/board-before.json',original);
const files=[];for(const name of execFileSync('rg',['--files','src','test'],{encoding:'utf8'}).trim().split(/\r?\n/)){
 const file=name.replaceAll('\\','/'),bytes=await fs.readFile(file);files.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});
}
await fs.writeFile(root+'/inputs-before.json',JSON.stringify({files},null,2)+'\n');
const baseline=JSON.parse(await fs.readFile('preview/performance-d02-low-20261021-candidate-r3/build-inputs.json','utf8'));
for(const f of baseline.inputs.filter(f=>f.file.startsWith('src/'))){
 const bytes=await fs.readFile(f.source);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.file);
 const target=root+'/baseline-inputs/'+f.file;await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
}
task.status='进行中';task.updated='2026-10-21';task.result='用户批准：地面矿气进入下一关清除；地面装备白/绿/蓝/紫/橙分别保留2/3/4/5/6关，包含掉落当关，无尽每轮计一关；暂停和关间不计时，已拾取装备不受影响，到期不折算收益。开始实现及边界核验。账本/领取回执保持；不启动存档整合。';
board.revision++;board.updated='2026-10-21';board.next='D03';board.updates.push({date:'2026-10-21',tasks:['D03'],change:task.result,evidence:['../../'+root+'/board-before.json']});
await fs.writeFile(file,JSON.stringify(board,null,2)+'\n');console.log(JSON.stringify({revision:board.revision,files:files.length,productionInputs:baseline.inputs.filter(f=>f.file.startsWith('src/')).length}));
