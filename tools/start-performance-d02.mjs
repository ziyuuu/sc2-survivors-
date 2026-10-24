import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
const root='reports/local/performance-d02-20261021',file='docs/project/performance-board.json';
const text=await fs.readFile(file,'utf8'),board=JSON.parse(text),task=board.tasks.find(t=>t.id==='D02');
assert.equal(board.revision,94);assert.equal(task.status,'待讨论');
await fs.mkdir(root,{recursive:false});await fs.writeFile(root+'/board-before.json',text);
const hash=b=>createHash('sha256').update(b).digest('hex'),files=[];
for(const file of execFileSync('rg',['--files','src','test'],{encoding:'utf8'}).trim().split(/\r?\n/)){
 const b=await fs.readFile(file);files.push({file:file.replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});
}
await fs.writeFile(root+'/inputs-before.json',JSON.stringify({files},null,2));
task.status='进行中';task.updated='2026-10-21';task.result='开始D02：复核现有全/中特效、自适应与完整动画政策，补普通无锁血对局的同状态画面/GPU对照；既有300敌人压力不当作自然对局。不修改画质默认值、裁剪或游戏生产代码，待证据形成具体取舍建议。';
board.revision=95;board.updated='2026-10-21';board.next='D02';board.updates.push({date:'2026-10-21',tasks:['D02'],change:task.result,evidence:['../../'+root+'/board-before.json']});
await fs.writeFile(file,JSON.stringify(board,null,2)+'\n');console.log(JSON.stringify({revision:95,task:'D02',status:'进行中',files:files.length}));
