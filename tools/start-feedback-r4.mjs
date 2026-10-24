import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/feedback-r4-20261022',boardFile='docs/project/performance-board.json';
await fs.mkdir(base,{recursive:true});
const board=JSON.parse(await fs.readFile(boardFile,'utf8'));assert.equal(board.revision,112);
const files=[];async function visit(dir){for(const d of await fs.readdir(dir,{withFileTypes:true})){const f=dir+'/'+d.name;if(d.isDirectory())await visit(f);else files.push(f);}}
await visit('src');await visit('test');
files.push('AGENTS.md','README.md','docs/DESIGN.md','docs/ARCHITECTURE.md',boardFile,'docs/project/FUN_UI_MERGE_GUARD_20261022.md','package.json','package-lock.json','index.html','fun-lab.html','vite.config.ts','tsconfig.json');
const hashes=[];for(const file of files){const data=await fs.readFile(file),to=base+'/before/'+file;await fs.mkdir(path.dirname(to),{recursive:true});await fs.writeFile(to,data);hashes.push({file,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}
const old=JSON.parse(await fs.readFile('reports/local/integration-i03-20261022/verification.json','utf8'));
await fs.writeFile(base+'/before.json',JSON.stringify({date:'2026-10-22',source:hashes,current:old.current,cameraInput:hashes.filter(x=>/camera|controls\/|input|camera-controller|battle-renderer/.test(x.file)),authorization:'用户批准第四轮设计与实施：先交互、装备说明和腐化星灵，再整体频次；镜头及鼠标/触屏保持。'},null,2));
const spec='FUN_FEEDBACK_R4_PLAN_20261022.md',i=board.tasks.find(t=>t.id==='I03'),u=board.tasks.find(t=>t.id==='U05'),g=board.tasks.find(t=>t.id==='G03');
i.status='进行中';i.updated='2026-10-22';i.result+=' 2026-10-22用户试玩反馈重新打开：绿色两件套单件说明错误显示激活、腐化星灵缺失守点／巡逻和正确激活；按第四轮新确认规则返修，不否定保留的其他已通过证据。';
i.steps.push('完成第四轮反馈返修：套装件数／激活说明与真实开局对账；腐化星灵可见据点、巡逻、虫族／玩家关系、有限追击、20同时／40累计与减员过半5秒补员；传送门接近自动进入资格与防重。');
u.status='进行中';u.updated='2026-10-22';u.priority='优先';u.result='按用户最新授权提前执行第四轮交互与装备说明批次：真实门票卡、品质底色、套装激活、简述／详情、桌面悬停及触屏点按、靠近传送；其余全流程引导验收仍开放。';
u.steps.unshift('优先完成第四轮反馈1–6：门票入真实卡牌页面、五品质辨识、单件／套装条件与已激活状态、简述／详情和悬停、接近自动进入；保持main相机和原鼠标／触屏操作。');
g.updated='2026-10-22';g.result='用户已批准第四轮虫群150/110/70/30及4/6/8/10关解锁、腐化星灵20同时40累计与整体事件频次首版；先完成I03/U05反馈批次再执行这些G03子项。英雄第12关Boss开放仍为候选评估；G01/G02之后的完整经济、四难度与最终平衡未开始。';
g.steps.unshift('按用户授权提前执行频次子项：每关60/70/80%一次主事件抽取、任务/遭遇/虫群45/35/20权重与合法窗口、喘息互斥、特殊关3次及间隔、酒馆权重与诱饵额外机会衔接；虫群分级累计上限与20秒替代完整验证。','核验英雄当前全部来源及前期过强反馈，评估第12关Boss起开放普通英雄奖励的候选，区分高阶装备既定赠送；未经数值结论不直接改全部英雄。');
for(const t of [i,u,g])if(!t.evidence.includes(spec))t.evidence.push(spec);
board.revision=113;board.updated='2026-10-22';board.next='U05';board.scope+=' 2026-10-22按用户第四轮反馈先做U05交互/说明与I03返修，再做G03已批准频次子项；完整G03经济/英雄平衡仍按G01/G02依赖。';
board.updates.push({date:'2026-10-22',tasks:['U05','I03','G03'],change:'第四轮11点反馈与最终设计全部入板。I03重新打开、U05提前进行；虫群分级、腐化星灵20同时40累计、据点巡逻／交战／追击与整体事件频次已授权。英雄第12关Boss为待评估候选。先修交互/说明/腐化星灵再调频次，镜头和鼠标/触屏保持；尚无本批实现完成宣称。',evidence:[spec]});
await fs.writeFile(boardFile,JSON.stringify(board,null,2)+'\n');
const guard='docs/project/FUN_UI_MERGE_GUARD_20261022.md',text=await fs.readFile(guard,'utf8');await fs.writeFile(guard,'> 2026-10-22第四轮最新覆盖：传送门改为接近自动进入、免费门票改为真实关间卡牌；旧UI-05传送门点击要求被替代。其余镜头、原鼠标／触屏、控制栏及无中途退出规则保持。见[第四轮确认方案](FUN_FEEDBACK_R4_PLAN_20261022.md)。\n\n'+text);
console.log(JSON.stringify({baselineFiles:hashes.length,revision:board.revision,counts:Object.fromEntries(board.statusOrder.map(s=>[s,board.tasks.filter(t=>t.status===s).length])),next:board.next}));
