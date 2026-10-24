import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8'));
assert.equal(b.revision,27);assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);
const evidence=['PERFORMANCE_X01_X02_20261020.md','../../reports/qa/performance-x01-x02-20261020.json'];
const results={
 X01:'空层/未激活层延迟求骨骼，精确时间与clip身份的512项LRU替代整体清空。102定义3264组数值完全一致；真实请求同页12对重放，远程300几何CPU均值21.146→19.932ms（12/12更快），装备15.170→14.849ms（11/12更快，保留较慢对）。查询次数及有界容量证据齐备，实际WebGL恢复通过。仅局部计算收益；反向整场FPS样本重叠，不确认稳定整场提升。',
 X02:'帧内模型池游标、懒事件索引、人族火焰最新攻击表及三族备用首次attackId表完成。200请求池读取20100→200，1200事件组件查询8.48–8.64→0.45–0.53ms含建表；事件/挂点与回收保持。14组固定状态一致，10对常规截图相同；跨页火焰871768差异像素原因未定并保留，同页真实GPU新/旧/新三图完全相同。完整1673回归及恢复通过。'
};
for(const id of ['X01','X02']){const t=b.tasks.find(t=>t.id===id);assert.equal(t.status,'待验证');t.status='已完成';t.result=results[id];t.evidence=[...new Set([...t.evidence,...evidence])];t.updated='2026-10-20';}
const reviews={
 'FX-003':'2026-10-20 X02本地实现验证：帧内游标保留原顺序、缩容与reset；200请求读取20100→200，组件时间下降；尚未Git提交。',
 'FX-004':'2026-10-20 X02本地实现验证：按来源的攻击索引、最小serial去重及导弹回执集合，保留倒序/时间资格；稀疏密集数值及14组固定原生状态一致。',
 'FX-005':'2026-10-20 X02本地实现验证：活跃hellion.2火焰按当帧最新攻击表查询；原有不可达备用分支仍保留资格。51/1632绘制指令与同页真实GPU相同；跨页截图亮度差异原因未定，原始失败保留。',
 'FX-006':'2026-10-20 X02本地实现验证：三族备用弹道首次attackId表保留原数组首次匹配含undefined；不改原资格过滤，不声称这些备用路径有原生FPS收益。',
 'FX-013':'2026-10-20 X01本地实现验证：空层/未激活层延迟姿态；102定义3264组精确输出，原生请求重放查询量下降，密集几何CPU12/12更快；不等于整场FPS。',
 'FX-017':'2026-10-20 X01本地实现验证：精确时间/clip对象身份的单定义512项LRU，容量与热点/重算回归通过；独立缓存微基准无稳定时间收益，实际恢复无过期姿态。'
};
for(const a of b.auditRows)if(reviews[a.id])a.currentReview=reviews[a.id];
b.revision=28;b.updated='2026-10-20';b.next='X03';
b.baseline.measurements='B01–B03代表基线已完成；F05/U02/S03/L01/F03/F01/F04/F02及X01/X02已本地实现验证，尚未提交。最新批次减少空层姿态、池与事件重复查找；真实请求CPU重放有收益，但整场FPS反向样本重叠，不确认稳定整场提升。下一项X03；普通60FPS与整体MVP保持开放。';
b.updates.push({date:'2026-10-20',tasks:['X01','X02'],change:'待验证→已完成。1673回归、102定义3264组数值、52窗口14状态对、10常规像素对及真实恢复通过。补充同页CPU12对和火焰新/旧/新实际GPU对照；整场FPS无稳定收益、跨页火焰差异与全部失败如实保留。49项已完成21、剩余28；下一项X03未开始。',evidence});
await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
const header=`## X01／X02 源特效求值与索引完成 · 2026-10-20

- 用户在合批提案后授权“可以，开始吧”，并询问剩余任务。空层/未激活层延迟姿态、精确时间与clip身份的512项LRU、帧内实例池游标、懒事件索引及精英火焰/备用弹道查询已本地完成。说明 docs/project/PERFORMANCE_X01_X02_20261020.md，证据 reports/qa/performance-x01-x02-20261020.json；看板修订28，49项已完成21、剩余28（22待办/4待讨论/2暂缓），下一项X03未开始。
- 102定义3264组输出精确，1673完整回归及类型/数据检查通过。真实请求同页12对重放：远程300几何CPU21.146→19.932ms（12/12较快），装备15.170→14.849ms（11/12较快）；不含上传/材质/GPU。200请求池读取20100→200，1200事件查询组件8.48–8.64→0.45–0.53ms。反向整场FPS样本重叠，未确认稳定整场FPS提升，未达全内容60FPS验收。
- 六轮52窗口、14组固定状态仅归一3个新局UUID路径；10对常规截图完全相同。跨页火焰871768差异像素/max17原因未定并保留；同页实际GPU只切换旧/新fields方法，新→旧→新三图SHA完全相同。实际WebGL恢复epoch0→1保持time2/tick120/RNG529，全状态只差恢复notice/noticeUntil；战场像素相同、全图674处轻微UI差异保留。
- 最终JS a1eda267d3ce20e617b3cada85cc121043cba7714fe70aa438e38636673f724f，441编译输入/9改动文件绑定；入口 preview/performance-x01-x02-20261020-candidate-r2/（4436）。早期候选、沙箱失败、Proxy先导计时、空回执汇总失败及截图差异原样保留。未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、玩法与存档延期保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let s=await fs.readFile(p,'utf8'),local=p.includes('/project/'),link=(local?'':'project/')+'PERFORMANCE_X01_X02_20261020.md';const line=`2026-10-20 X01／X02 已完成：[源特效求值、实例池与事件索引](${link})。1673回归及真实恢复通过，局部CPU收益有证据，整场FPS无稳定提升结论；49项已完成21，剩余28，下一项X03。\n\n`;const i=s.indexOf('\n');s=s.slice(0,i+1)+'\n'+line+s.slice(i+1).replace(/^\r?\n/,'');await fs.writeFile(p,s);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
