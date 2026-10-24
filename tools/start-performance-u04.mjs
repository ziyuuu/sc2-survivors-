import fs from 'node:fs/promises';
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8'));
const task=b.tasks.find(t=>t.id==='U04');
if(task.status!=='待办')throw Error('U04 already started');
task.status='进行中';task.updated='2026-10-20';
task.result+=' 用户授权统计/遥测实施与对应A01复核，正在冻结U01/U03最终输入并验证默认关闭、开启及撤回路径。';
b.revision++;b.updated='2026-10-20';
b.updates.push({date:'2026-10-20',tasks:['U04','A01'],change:'用户授权开始U04统计/遥测；音频沿用S08证据。复核UI-OBS-001和TEL-001，先比较当前统计及队列行为；不发送真实遥测、不变更同意策略。',evidence:['../../src/services/game-observer.ts','../../src/services/telemetry-client.ts','PERFORMANCE_U01_U03_20261020.md']});
await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
