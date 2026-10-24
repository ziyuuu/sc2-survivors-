import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const report=JSON.parse(await fs.readFile('reports/qa/performance-s09-20261020.json'));assert.equal(report.status,'verified-local');
const path='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(path)),s=b.tasks.find(t=>t.id==='S09');assert.equal(s.status,'待验证');
const evidence=['PERFORMANCE_S09_20261020.md','../../reports/qa/performance-s09-20261020.json'];
s.status='已完成';s.problem='已定位：多排友军使原有限避让候选全被拒绝，返回原位置；原队形接触点也可能被前排包围。需让玩家地面爆虫像近战单位主动绕行接近。';
s.result='玩家地面爆虫按当前阻挡局部绕行，原接触点被封时选择原射程内可达位置；普通/三精英/临时体覆盖，原五秒恢复与一次自爆例外保持。63组900步、4兵种精确对照、7边界和1716回归通过。真实浏览器12/24混编与精英15秒0→3攻击，临时体0→1；4初始状态精确，24截图已查看。路径计算有新增成本，非FPS收益；R2密集失败、3个UI差异像素与原碰撞小重叠保留。';
s.updated='2026-10-20';s.evidence=[...new Set([...s.evidence,...evidence,'../../src/simulation/movement/melee-approach.ts'])];
b.revision++;b.updated='2026-10-20';b.next='S07';
b.baseline.measurements+=' S09后续已完成行为修复：玩家地面爆虫绕行成组友军并选择可达接触点，普通/精英混编15秒0→3、临时体0→1；63场景/7边界/1716回归与四场景实际浏览器验证。新增路径成本不列作性能收益；密集碰撞小重叠仍由S07关注。';
b.updates.push({date:'2026-10-20',tasks:['S09'],change:'S09待验证→已完成。爆虫混编主动近战接近修复：63行为场景、4其他兵种精确对照、7动态/扎加拉边界、1716回归与四场景浏览器通过，24截图/四联系表已查看。原射程、伤害、五秒恢复、敌方/临时一次自爆保持；R2失败、UI三像素差异与碰撞小重叠保留。路径计算是新增成本，非FPS收益。50项完成30、剩余20，下一项S07尚未开始。',evidence});
assert.equal(b.tasks.length,50);assert.equal(b.tasks.filter(t=>t.status==='已完成').length,30);assert.equal(b.tasks.find(t=>t.id==='S07').status,'待办');
await fs.writeFile(path,JSON.stringify(b,null,2)+'\n');
const note=`## S09 爆虫混编主动接近修复完成 · 2026-10-20

- 用户要求爆虫像近战单位主动接近攻击，已本地验证完成。说明docs/project/PERFORMANCE_S09_20261020.md，证据reports/qa/performance-s09-20261020.json；看板50项完成30、剩余20，下一项S07未开始。下方S06/S09旧诊断的未修复描述保持历史含义。
- 原避让只尝试最近阻挡的有限绕行，多排友军会拒绝全部候选，原接触点也可能被包围。新增玩家地面爆虫局部路径和原射程内可达接触点；保留实际移动、碰撞、原0.25射程/伤害/速度、五秒恢复、移动命令和硬牵引。敌方与临时体仍一次自爆，其他兵种不改。
- 63组900固定步、4其他兵种全状态精确对照、7动态/真实扎加拉孵化边界、1716完整回归与类型/数据通过。最终12/24混编从0变3次；真实英雄两只临时体都主动接近一次自爆，原10秒寿命保持，无目标仍到期消失。
- 查尔seed529完整效果、1440×900 DPR1，两版四场景初始完整状态精确，24截图/四联系表已查看。浏览器普通12/24混编与精英15秒0→3、临时0→1；页面/控制台错误0/0，请求取消4/11。三个初始图RGB精确，精英初始底部UI边线3像素差1色阶，战场区精确；未归因，原图保留。截图不涵盖爆炸瞬间，不重做完整特效验收。
- 0.5格局部搜索最多2048节点、路线最多复用0.4秒且逐次校验下一段；不保证任意迷宫可达。301敌人过滤压力下12/24友军冷调用中位0.2609/0.1831ms、观测最大1.2033/0.8541ms；这是新增CPU成本，非FPS优化。密集碰撞原求解仍小重叠，最小余量约-0.03597，角度3.1较旧版-0.03252略差，保留给S07关注；无瞬移或绕过碰撞求解。
- R2的24友军接触点被围失败保留；R3补替代接触点/零长度占位修正，R4补地面及距离约束。最终仅world.ts与新melee-approach.ts改变，446浏览器/171Node输入，冻结S06并排除无关economic-egg修改。JS208ddf15b2674485bbaf466c870aab84ad1807c24ceb4a0b11de508d582856ef，入口preview/performance-s09-20261020-candidate-r4/（4436）。
- 未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、经济和存档延期保持。受控步进不代表自然完整战役、物理输入、人类体验或全内容60FPS/整体MVP。

`;
await fs.writeFile('AGENTS.md',note+await fs.readFile('AGENTS.md','utf8'));
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md']){
 const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n');
 await fs.writeFile(file,old.slice(0,at+1)+'\n2026-10-20 S09已完成：[爆虫混编主动接近修复](project/PERFORMANCE_S09_20261020.md)。普通/精英12与24友军混编15秒0→3攻击，临时爆虫一次自爆；1716回归、四场景实际浏览器与24截图核验。新增路径成本不算性能收益。50项完成30、剩余20，下一项S07未开始。\n'+old.slice(at+1));
}
console.log(JSON.stringify({revision:b.revision,complete:30,total:50,next:b.next}));
