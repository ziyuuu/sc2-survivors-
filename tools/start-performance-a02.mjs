import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/performance-a02-20261020',file='docs/project/performance-board.json';
const text=await fs.readFile(file,'utf8'),board=JSON.parse(text),task=board.tasks.find(t=>t.id==='A02');
if(task.status!=='待办')throw Error('A02 already started');
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/board-before.json`,text);
const files=execFileSync('rg',['--files','src','test'],{encoding:'utf8'}).trim().split(/\r?\n/);
const inputs=[];
for(const file of files){
 const data=await fs.readFile(file);
 inputs.push({path:file.replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await fs.writeFile(`${root}/inputs-before.json`,JSON.stringify({
 main:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
 status:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}),files:inputs,
},null,2)+'\n');
task.status='进行中';task.updated='2026-10-20';
task.result='用户授权开始A02：对奖励池、镜头、活跃屏外据点动画、英雄效果查询及容量补当前频度/成本/输出证据；保持原规则与画质，只保留经验证的候选。';
board.next='A02';board.updated='2026-10-20';board.revision++;
board.updates.push({date:'2026-10-20',tasks:['A02'],change:'开始A02四项剩余客户端补证；冻结当前输入，先核实际可达路径与成本，再决定保留候选或现状。A03未开始。',evidence:['../../reports/local/performance-a02-20261020/board-before.json']});
await fs.writeFile(file,JSON.stringify(board,null,2)+'\n');
console.log(JSON.stringify({revision:board.revision,status:task.status,files:inputs.length}));
