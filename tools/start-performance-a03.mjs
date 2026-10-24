import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root='reports/local/performance-a03-20261021',file='docs/project/performance-board.json';
const text=await fs.readFile(file,'utf8'),board=JSON.parse(text),task=board.tasks.find(t=>t.id==='A03');
if(task.status!=='待办')throw Error('A03 already started');
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
task.status='进行中';task.updated='2026-10-21';
task.result='用户授权开始A03：复核实际HttpAssetStore缓存命中、刷新重试、多release共享和磁盘留存；区分页面Blob/编码片/纹理与磁盘缓存，保护活动资源与离线唯一恢复源。先取证，未经决定不实施驱逐。';
board.next='A03';board.updated='2026-10-21';board.revision++;
board.updates.push({date:'2026-10-21',tasks:['A03'],change:'开始A03部署缓存与跨版本留存复核；冻结当前输入，保留旧异常，先验证当前机制并形成预算/保留策略结论。',evidence:['../../reports/local/performance-a03-20261021/board-before.json']});
await fs.writeFile(file,JSON.stringify(board,null,2)+'\n');
console.log(JSON.stringify({revision:board.revision,status:task.status,files:inputs.length}));
