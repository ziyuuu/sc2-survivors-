import fs from 'node:fs/promises';
import assert from 'node:assert/strict';

const file='docs/project/performance-board.json', doc='docs/project/PERFORMANCE_D01_DECISION_20261021.md';
const original=await fs.readFile(file,'utf8'), b=JSON.parse(original), before=structuredClone(b);
assert.equal(b.revision,93);assert.equal(b.next,'D01');
const task=b.tasks.find(t=>t.id==='D01');assert.equal(task.status,'待讨论');
await fs.access(doc);
await fs.mkdir('reports/local/performance-d01-20261021',{recursive:true});
await fs.writeFile('reports/local/performance-d01-20261021/board-before.json',original);

task.status='已完成';task.updated='2026-10-21';
task.problem='人工满员清场压力实验会集中补兵，但未证明正常无锁血对局发生相同卡顿；分帧会改变入场与战斗节奏。';
task.steps=['核对集中补兵证据的人工构造与自然运行边界','依据用户决定保留当前投放时序，记录约束与重新评估条件'];
task.result='用户明确决定“保持现状吧”：保留原投放时序、队列/跨轮积压/优先级/重试、300上限及4∶4∶1；不分帧、不删除积压，swarm现有每步8只保持。原300清场与S06的176出生均为人工压力构造；B03一条无锁血简单路线逐步峰值124，未证明正常对局复现该极端卡顿。仅正常无锁血对局出现可复现且可归因的集中补兵卡顿时再评估。本次决策完成，无生产修改或新性能实验。';
task.evidence=[...new Set([...task.evidence,'PERFORMANCE_D01_DECISION_20261021.md'])];

const reviews={
 'SIM-009':['保留现状','S06的出生查询优化保留。原满员清场后176补兵来自脚本清零HP，S06后续也使用手工176队列，未证明正常对局复现。用户于2026-10-21决定保持现状，不分帧、不丢队列；仅正常无锁血对局出现实际集中补兵卡顿证据时重新评估。'],
 'SIM-017':['保留现状','频率F在300秒后封顶1.2，通常精英30→25秒、Boss90→75秒，简单精英50秒；普攻攻速上限1.25，生命/伤害仍按原连续指数增长。单类别仅一个到期模板，失败1秒重试。用户于2026-10-21决定保持现状，D01决策完成；长期自然压力仍交V02。'],
 'SIM-018':['否定','当前普通无尽波每轮60秒、4波，出生时刻0/15/30/45秒；数量预算前5分钟增至1.2后封顶，不随wave编号无限加快。旧240秒模板不作为当前波次描述，经济事件仍用四轮周期。2026-10-21 D01决定保持当前调度，决策完成。'],
 'SIM-019':['否定','updateEndlessSpawns每次对elite、boss各尝试一次，progress钳到1，pending保留原到期模板，失败1秒后重试，不会while补任意多个逾期Boss。ambient与战役specialPlan属于其他路径；2026-10-21 D01决定保持现状，不因旧推断改节奏。'],
 'SIM-020':['保留现状','用户于2026-10-21决定保持跨轮ambient/swarm积压、原优先级和投放时序；不删除、截断或摊平队列，swarm现有每步8只保持。D01决策完成，仅正常无锁血对局出现可复现且可归因的集中补兵卡顿证据时重新评估。']
};
for(const [id,[status,text]] of Object.entries(reviews)){
 const row=b.auditRows.find(r=>r.id===id);row.previousReview=row.currentReview;row.reviewStatus=status;
 row.currentReview=`【${status}】${text}`;row.reviewedAt='2026-10-21';
 row.reviewEvidence=[...new Set([...row.reviewEvidence,doc])];row.followUpTasks=row.followUpTasks.filter(id=>id!=='D01');
}
b.revision=94;b.updated='2026-10-21';b.next='D02';
b.baseline.measurements+=' D01于2026-10-21按用户决定保持当前投放时序，人工清场压力证据不作为正常卡顿证明；无生产修改，决策完成。';
b.updates.push({date:'2026-10-21',tasks:['D01'],change:task.result+' 看板43/52，剩余9项；下一项D02尚未开始。',evidence:['PERFORMANCE_D01_DECISION_20261021.md']});
assert.equal(b.tasks.length,52);assert.equal(b.tasks.filter(t=>t.status==='已完成').length,43);
assert.equal(b.tasks.find(t=>t.id==='D02').status,'待讨论');assert.equal(b.auditRows.length,169);
for(const t of b.tasks)if(t.id!=='D01')assert.deepEqual(t,before.tasks.find(x=>x.id===t.id));
for(const r of b.auditRows){const old=before.auditRows.find(x=>x.id===r.id);for(const key of ['id','title','sourceCategory','sourceExecution','sourceIntegration','tasks'])assert.deepEqual(r[key],old[key]);if(!reviews[r.id])assert.deepEqual(r,old);}
await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');

const note=`## D01 投放时序决策完成 · 2026-10-21\n\n- 用户明确决定“保持现状吧”。记录docs/project/PERFORMANCE_D01_DECISION_20261021.md；D01决策完成，52项完成43、剩余9，下一项D02尚未开始。\n- 保留300／4∶4∶1、原队列/跨轮积压/优先级/出生时序/重试和swarm每步8只，不分帧、不删除积压。S06查询优化保留。\n- 原300清场与S06的176出生为人工构造，不是正常对局复现；B03一条无锁血简单路线逐步峰值124，不能外推全部难度。仅正常无锁血对局出现可复现且可归因的集中补兵卡顿证据时再评估，不追加人工极端专项。\n- SIM-009/SIM-020改为保留现状，旧否定项保持，SIM-017长期自然压力仍V02；原审计元数据保持。本次仅文档/看板，无生产修改或新性能实验，V01–V04/MVP仍未关闭，未替换Current、提交/推送/发布。\n\n`;
await fs.writeFile('AGENTS.md',note+await fs.readFile('AGENTS.md','utf8'));
for(const f of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(f,'utf8'), at=old.indexOf('\n'), prefix=f==='docs/project/README.md'?'':'project/';
 const entry=`\n2026-10-21 [D01投放时序决策完成](${prefix}PERFORMANCE_D01_DECISION_20261021.md)：按用户决定保持现状，不分帧；人工清场压力不能当作正常卡顿证据。看板43/52，剩余9项，下一项D02尚未开始；无生产修改。\n`;
 await fs.writeFile(f,old.slice(0,at+1)+entry+old.slice(at+1));
}
console.log(JSON.stringify({revision:b.revision,completed:43,remaining:9,next:b.next,decision:'保持现状',productionChanges:0,performanceExperiments:0}));
