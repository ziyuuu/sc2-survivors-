import fs from 'node:fs/promises';
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8')),task=b.tasks.find(t=>t.id==='L03');
if(task.status!=='进行中')throw Error('Unexpected L03 status');
task.status='待验证';task.updated='2026-10-20';task.result='候选实现完成：8条/1MiB预览缓存、64条/128KiB滚动位置缓存，截图单任务异步编码，离线按需SHA校验。22项定向回归、类型检查及Web五图11次开局/展示压力通过；实际上下文恢复、离线与独立计时尚在验证，暂不关闭。';
b.revision++;b.updates.push({date:'2026-10-20',tasks:['L03','A01'],change:'L03候选进入待验证。Web首轮组件显示同步截图成本下降、总完成延迟增加；旧无上限缓存复现，候选容量上限成立。尚不计整体内存或FPS收益。',evidence:['../../reports/local/performance-l03-20261020/targeted-r1.log','../../reports/local/performance-l03-20261020/web-candidate-r1-1/report.json']});
await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
