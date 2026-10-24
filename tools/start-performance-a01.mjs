import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';

const root='reports/local/performance-a01-20261020';
const boardFile='docs/project/performance-board.json';
const boardText=await fs.readFile(boardFile,'utf8');
const b=JSON.parse(boardText),t=b.tasks.find(t=>t.id==='A01');
if(t.status!=='待办')throw Error('A01 already started');
await fs.mkdir(root,{recursive:true});
await fs.writeFile(`${root}/board-before.json`,boardText);
const files=execFileSync('rg',['--files','src','test','deploy','tools'],{encoding:'utf8'}).trim().split(/\r?\n/);
const hashes=[];
for(const f of files){
  const data=await fs.readFile(f);
  hashes.push({path:f.replaceAll('\\','/'),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});
}
await fs.writeFile(`${root}/inputs-before.json`,JSON.stringify({
  main:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  gitStatus:execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}),
  files:hashes,
  scope:'Audit current local source and prior frozen evidence; no production edits or full acceptance implied.',
},null,2)+'\n');
t.status='进行中';t.updated='2026-10-20';
t.result+=' 用户授权开始A01剩余审计：逐项核查65条占位结论，交叉检查已有104条的证据与未结去向；只按实际证据标明已解决、待优化/待测、否定、待讨论和延期。';
b.next='A01';b.updated='2026-10-20';b.revision++;
b.updates.push({date:'2026-10-20',tasks:['A01'],change:'开始A01剩余审计；冻结169条原始索引及当前源码清单，复用已验证批次证据，核对65条占位与104条已有结论。',evidence:['../../reports/local/performance-a01-20261020/board-before.json']});
await fs.writeFile(boardFile,JSON.stringify(b,null,2)+'\n');
console.log(JSON.stringify({revision:b.revision,status:t.status,rows:b.auditRows.length,inputs:hashes.length}));
