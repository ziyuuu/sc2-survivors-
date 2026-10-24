import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const root='reports/local/performance-x03-20261020',proofFile='reports/qa/performance-x03-20261020.json',proof=JSON.parse(await fs.readFile(proofFile,'utf8')),raw=JSON.parse(await fs.readFile(root+'/x04-baseline-1/report.json','utf8'));
assert.equal(proof.status,'verified-local');
proof.x04Baseline.firstRenderedModels=raw.x04.data.firstRendered.length;proof.x04Baseline.maxFirstRendered=raw.x04.data.firstRendered.reduce((a,b)=>!a||b.ms>a.ms?b:a,null);
proof.x04Baseline.coverage='Source player post-preload first observed calls and source pools only. All102 source resources were ready at attachment. Initial source loading/required preload, echo lifetime, acid first geometry, pod/hive death clone/bounds/hull are not measured by these probes.';
proof.validation.x04Visual=JSON.parse(await fs.readFile(root+'/contact-baseline-1-x04-baseline-1.json','utf8'));
proof.validation.visualReview={reviewed:['contact-baseline-1-candidate-r3-1.jpg','contact-baseline-1-x04-baseline-1.jpg','baseline-1/ranged-300-fixed.png','candidate-r3-1/before-recovery.png','candidate-r3-1/after-recovery.png'],scope:'Finite visual review of three fixed scenes and actual restore. Original small UI pixel differences retained.'};
await fs.writeFile(proofFile,JSON.stringify(proof,null,2)+'\n');
const doc='docs/project/PERFORMANCE_X03_20261020.md';let text=await fs.readFile(doc,'utf8');text=text.replace('该基线用于X04后续选择重点，不代表预热、池回收或首次使用任务已完成。','探针挂载前102个源资源已就绪，初始源加载与必需预热不在本次计时内。此轮只覆盖源播放器在预热后的首次观察调用和池峰值；echo寿命调度、首次酸区几何、Pod／主巢死亡克隆与Bounds／Hull仍需X04定向测量。该基线用于后续选择重点，不代表X04完成。');await fs.writeFile(doc,text);
const boardFile='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(boardFile,'utf8'));assert.equal(b.revision,31);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);
const evidence=['PERFORMANCE_X03_20261020.md','../../reports/qa/performance-x03-20261020.json'],t=b.tasks.find(t=>t.id==='X03');assert.equal(t.status,'待验证');t.status='已完成';t.updated='2026-10-20';t.result='精确出生相位参数解释、调用内临时对象、局部父变换/缩放复用完成。1675回归、102定义3264组及480扩展组数值精确；两场实际请求同页12对CPU均更快（20.154→14.219ms、15.295→13.002ms，约29.45%/14.99%）。三组原生状态/提交一致；战场像素相同，装备底部UI410处/max3差异保留。实际恢复、回收及100轮内存压力通过；约90KB/437KB局部堆代价单列。整场FPS有升有降，不外推全内容收益。';t.evidence=[...new Set([...t.evidence,...evidence])];
const next=b.tasks.find(t=>t.id==='X04');assert.equal(next.status,'待办');next.updated='2026-10-20';next.result='X03期间已采最终R3代表基线，尚未实施X04。探针挂载时102源资源已就绪；26模型首次观察，最大调用4.4ms，39次额外网格创建最大0.8ms；实例峰值60、结束回41，quad池容量17344→35840。CPU类型化数组13,696,080→15,652,432字节，非GPU总显存。冷源加载/必需预热、echo、酸区首建、Pod/主巢死亡Bounds/Hull仍待定向测量；不能用该局部基线关闭X04。';next.evidence=[...new Set([...next.evidence,...evidence])];
const reviews={
 'FX-008':'2026-10-20 X03本地完成：出生采样对象的不可变参数解释、调用内临时对象及局部父变换复用。真实请求两场12/12对均更快，完整数值/战场像素/恢复/内存有证据；整场FPS非全部改善，尚未Git提交。',
 'FX-016':'2026-10-20核对保持原反证：expandedEmitters按定义WeakMap复用复制发射器身份，schedule缓存未因每帧复制失效；X03未以此作为待修问题或收益来源，既有机制不改。',
 'FX-007':'2026-10-20 X04只采基线：源quad池总容量17344→35840并保留峰值，CPU类型化数组增长有记录。尚未实施收缩策略或验收X04。',
 'FX-014':'2026-10-20 X04只采预热后代表基线：额外39次网格创建最大0.8ms，实例峰值60并退回41。挂载时102源资源已就绪，初始源加载/必需预热不在计时内；尚未实施X04。'
};for(const row of b.auditRows)if(reviews[row.id])row.currentReview=reviews[row.id];
b.revision=32;b.next='X04';b.updated='2026-10-20';b.baseline.measurements='B01–B03代表基线及F05/U02/S03/L01/F03/F01/F04/F02/X01/X02/X03已本地验证，尚未提交。X03真实请求几何CPU下降约29.45%/14.99%，整场FPS短样本有升有降，不宣称全内容收益。X04已采预热后源播放器/池峰值代表基线，其他首用路径未测且实现未开始。普通60FPS与整体MVP保持开放。';
b.updates.push({date:'2026-10-20',tasks:['X03','X04'],change:'X03待验证→已完成：1675回归、两场各12对同页CPU、源数值/原生状态/战场像素/恢复与内存通过。保留整场FPS回退样本及UI差异。X04只采部分代表基线、继续待办。49项已完成22，剩余27（21待办/4待讨论/2暂缓）；下一项X04。',evidence});await fs.writeFile(boardFile,JSON.stringify(b,null,2)+'\n');
const header=`## X03 粒子动态计算优化完成 · 2026-10-20

- 用户批准X03单独实施并同期采X04基线。仅src/render/effects/source/particles.ts在上一批最终快照上修改：出生参数解释复用、调用内临时对象和局部父变换/缩放复用，保留原始时间、数量和公式。说明 docs/project/PERFORMANCE_X03_20261020.md，证据 reports/qa/performance-x03-20261020.json；看板修订32，49项已完成22、剩余27，下一项X04未实施。
- 1675回归及类型/数据检查通过；102定义3264组和480扩展组合精确。实际请求同页12对几何CPU：远程20.154→14.219ms、装备15.295→13.002ms，约下降29.45%/14.99%，各12/12更快；不含材质/上传/GPU。整场FPS短样本有升有降，医疗/装备实时FPS下降保留，不宣称全部场景或60FPS完成。
- 三组固定World/账户/RNG/时间/提交仅归一3个新局UUID。远程/医疗整图相同，装备410处/max3底部UI差异保留，战场行30–619相同。实际WebGL恢复状态只差notice/noticeUntil，战场相同，全图1084处/max3 UI差异保留。100轮身份/种子变化后局部JS堆无持续增长，约90KB/437KB新增代价，结束出生/请求缓存归零。
- X04只采预热后源播放器代表基线：挂载时102资源已就绪，26模型首次观察最大4.4ms、39次额外克隆最大0.8ms，实例峰值60→结束41，quad池容量17344→35840。初始源加载/必需预热、echo、首次酸区与Pod/主巢死亡Bounds/Hull仍待定向测量；没有实施预热/收缩策略。
- 最终JS42d26b6200deac619193cd8dce701ca1728ad40159a5bfcd10c3568d783d1059，441输入；入口preview/performance-x03-20261020-candidate-r3/（4436）。全部候选/短样本回退和UI差异保留，未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、玩法、存档延期与整体MVP边界保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let s=await fs.readFile(file,'utf8'),link=(file.includes('/project/')?'':'project/')+'PERFORMANCE_X03_20261020.md';const i=s.indexOf('\n');s=s.slice(0,i+1)+'\n'+`2026-10-20 X03 已完成：[粒子动态计算与临时对象](${link})。1675回归与真实恢复通过，两场实际请求几何CPU下降约29.45%/14.99%，整场FPS有升有降；X04已采部分代表基线、尚未实施。49项已完成22，剩余27。\n\n`+s.slice(i+1).replace(/^\r?\n/,'');await fs.writeFile(file,s);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
