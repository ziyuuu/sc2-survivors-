import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const proof=JSON.parse(await fs.readFile('reports/qa/performance-x04-20261020.json','utf8'));assert.equal(proof.status,'verified-local');
const file='docs/project/performance-board.json',b=JSON.parse(await fs.readFile(file,'utf8')),task=b.tasks.find(t=>t.id==='X04');assert.equal(task.status,'待验证');assert.equal(b.tasks.length,49);assert.equal(b.auditRows.length,169);
const evidence=['PERFORMANCE_X04_20261020.md','../../reports/qa/performance-x04-20261020.json'];
task.status='已完成';task.updated='2026-10-20';task.evidence=[...new Set([...task.evidence,...evidence])];task.result='完成源预热/首次创建/池峰值补测，最终保留载体参考边界和凸包复用、既有加载期CPU准备及主巢死亡边界复用。三族同页各12对构造约11.025→1.208、4.142→0.892、11.108→1.550ms；原尺度/轮廓/骨骼和画面有对照。1676回归、固定状态、私有纹理释放和带载体/主巢死亡的实际WebGL恢复通过。过期请求过滤无稳定CPU收益已撤回；酸液/源额外预热及quad收缩未选用。保留加载超时、旧降落夹具像素差异及GPU绘制慢样本；不宣称整场FPS或全部GPU首帧峰值改善。';
const reviews={
 'FX-007':'2026-10-20 X04完成测量并保留原峰值策略：源quad容量17344→35840，CPU类型化数组增量1956352字节，非总显存；实例峰值60、结束41。当前证据未支持自动收缩后重新扩容，未实施收缩。',
 'FX-012':'2026-10-20 X04确认固定检查点累计9007次已过期请求由原播放器丢弃。提前过滤候选无稳定CPU收益已撤回；最终保留原分发和整个profile寿命，并未宣称精确echo寿命已优化。',
 'FX-014':'2026-10-20 X04补齐新播放器102定义的初始load/prepare计时，保留缓存与探针口径。源clone单次成本与实例回收已测，既有必需预热/两秒回收保留，不增加全量预克隆；不承诺所有GPU首帧峰值消失。',
 'FX-015':'2026-10-20 X04单酸区首建约1.4ms，后续约0.1–0.3ms；据当前数据不新增预热或池。F02私有几何/实例缓冲释放保持，密集全内容性能不由单区样本关闭。',
 'R07':'2026-10-20 X04本地完成：按模板/原动作缓存载体精确参考边界及凸包，在既有加载阶段准备CPU引用数据；主巢死亡首次测边界，后续本体/扩张巢复用。三族构造CPU下降约78–89%，骨骼/变换/画面与私有资源释放通过；全部GPU首帧与全内容FPS仍开放。'
};for(const row of b.auditRows)if(reviews[row.id])row.currentReview=reviews[row.id];
b.revision++;b.updated='2026-10-20';b.next='S01';b.baseline.measurements='B01–B03代表基线及F05/U02/S03/L01/F03/F01/F04/F02/X01/X02/X03/X04已本地验证，尚未提交。X04最终仅载体/主巢参考数据复用，三族构造CPU约下降78–89%；过期请求过滤候选已撤回，池峰值与单酸区策略按测量保持。跨轮加载/FPS波动和首GPU绘制慢样本保留，不宣称全内容60FPS。';
b.updates.push({date:'2026-10-20',tasks:['X04'],change:'X04待验证→已完成：最终两处生产文件，1676回归、三族局部CPU/状态/画面、私有纹理释放与实际恢复通过。无稳定收益的请求过滤已撤回，未新增池收缩或额外预热；保留240秒加载超时、旧降落夹具差异和绘制慢样本。49项已完成23、剩余26；下一项S01未开始。',evidence});await fs.writeFile(file,JSON.stringify(b,null,2)+'\n');
const header=`## X04 首次创建与池峰值处理完成 · 2026-10-20

- 用户授权“开始吧”实施X04。最终仅src/render/units/pod-view.ts与src/render/scene/battle-renderer.ts：按不可变模板/原动作复用载体边界与凸包、既有加载期CPU准备、主巢死亡首次边界后续复用。说明 docs/project/PERFORMANCE_X04_20261020.md，证据 reports/qa/performance-x04-20261020.json；看板修订${b.revision}，49项已完成23、剩余26，下一项S01未开始。
- 三族各12对同页构造均更快：人族11.025→1.208ms、神族4.142→0.892ms、虫族11.108→1.550ms（约78–89%）；主巢两宽度24对骨骼/变换精确。R2与最终R3的这两处文件哈希相同，最终另复查人族/虫族；首次GPU绘制受顺序/预热影响，慢样本保留，不把局部CPU当整场FPS收益。
- 最终1676回归、类型/数据检查、6333活动请求组合与固定原生状态通过；实际WebGL恢复场景含载体和主巢死亡，状态只归一notice/noticeUntil。三族画面及私有纹理释放通过；早期人族降落4065像素差异与最终一次采样后切图复查分开记录，不改写旧失败。
- 源102定义初始准备、酸区首建和池峰值已测。quad容量17344→35840，源CPU类型化数组增量1956352字节（非总显存），实例峰值60→结束41；保留既有回收，不新增收缩/额外源预热/酸液池。过期请求过滤候选虽挡住9007次请求但同页CPU均值未改善，已撤回；最终source-combat-effects.ts与基线字节相同，echo寿命没有宣称优化。
- 最终JS${proof.build.outputs.find(o=>o.file.endsWith('/main.js')).sha256}，442输入，入口preview/performance-x04-20261020-candidate-r3/（4436）。240秒加载超时和所有候选保留；复测只延长验证脚本等待并记录GPU准备进度。未替换Current、提交/推送或发布；五图、画质、300/4∶4∶1、模拟/经济、存档延期及整体MVP边界保持。

`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const p of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/project/README.md']){let s=await fs.readFile(p,'utf8');const link=(p.includes('/project/')?'':'project/')+'PERFORMANCE_X04_20261020.md',i=s.indexOf('\n');s=s.slice(0,i+1)+`\n2026-10-20 X04 已完成：[首次创建与资源池](${link})。三族载体构造CPU约下降78–89%，1676回归和实际恢复通过；过期请求过滤无稳定收益已撤回，不宣称整场FPS改善。49项已完成23、剩余26，下一项S01。\n\n`+s.slice(i+1).replace(/^\r?\n/,'');await fs.writeFile(p,s);}
console.log(JSON.stringify({revision:b.revision,next:b.next,counts:Object.fromEntries(b.statusOrder.map(s=>[s,b.tasks.filter(t=>t.status===s).length]))}));
