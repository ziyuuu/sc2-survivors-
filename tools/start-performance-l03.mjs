import fs from 'node:fs/promises';
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8'));
const task=b.tasks.find(t=>t.id==='L03');
if(task.status!=='待办')throw Error('L03 already started');
task.status='进行中';task.updated='2026-10-20';task.result='用户授权开始L03。冻结L02最终输入，测量跨局资源/地图/展示缓存与预览编码，再实施、验证和补齐关联A01复核。';
b.revision++;b.updated='2026-10-20';
b.updates.push({date:'2026-10-20',tasks:['L03','A01'],change:'开始L03缓存与预览开销；保留资产校验/活跃资源恢复、五图及存档延期，先测重复开局/换图和展示缓存容量。',evidence:['PERFORMANCE_L02_20261020.md','../../src/ui/presentation/map-preview.ts']});
await fs.mkdir('reports/local/performance-l03-20261020',{recursive:true});
await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
