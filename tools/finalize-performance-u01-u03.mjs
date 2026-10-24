import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-u01-u03-20261020',doc='docs/project/PERFORMANCE_U01_U03_20261020.md',reportFile='reports/qa/performance-u01-u03-20261020.json';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8')),hash=b=>createHash('sha256').update(b).digest('hex');
const median=a=>{a=a.toSorted((x,y)=>x-y);return(a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2;};
const ui=await read(root+'/ui-6/report.json'),counts=await read(root+'/ui-5-counts/report.json'),game=await read(root+'/game-3/report.json'),skin=await read(root+'/ui-7-skin/report.json');
for(const r of [ui,counts,game,skin])assert.equal(r.pass,true);
for(const name of ['regression','typecheck','docs-check'])assert.equal(Number(await fs.readFile(root+'/'+name+'-final.exit','utf8')),0);
assert.match(await fs.readFile(root+'/regression-final.txt','utf8'),/pass 1725/);
assert.deepEqual(ui.variants.baseline.states,ui.variants.candidate.states);assert.deepEqual(ui.variants.baseline.skinStates,ui.variants.candidate.skinStates);
const build=game.build,previous=await read('preview/performance-r03-20261020-candidate-r3/build-inputs.json');
const production=build.inputs.filter(i=>i.file.startsWith('src/')),changes=production.filter(i=>previous.inputs.find(j=>j.file===i.file)?.sha256!==i.sha256).map(i=>i.file).sort();
assert.deepEqual(changes,build.changes.toSorted());assert.equal(production.length,412);
for(const file of changes)assert.equal(hash(await fs.readFile(file)),production.find(i=>i.file===file).sha256,file);
for(const i of build.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r1-web-inputs/'+i.file)),i.sha256,i.file);
for(const i of ui.build.inputs)assert.equal(hash(await fs.readFile(root+'/candidate-r1-ui-inputs/'+i.file)),i.sha256,i.file);
for(const i of ui.build.inputs.filter(i=>i.file.startsWith('src/')))assert.equal(i.sha256,production.find(j=>j.file===i.file)?.sha256,i.file);
const js=build.outputs.find(i=>i.file.endsWith('/main.js'));assert.ok(game.served.some(i=>i.sha256===js.sha256));
const rows=[...new Set(ui.samples.map(r=>r.kind+'/'+r.n))].map(key=>{
 const groups=['baseline','candidate'].map(v=>ui.samples.filter(r=>r.kind+'/'+r.n===key&&r.variant===v).toSorted((a,b)=>a.round-b.round).map(r=>r.ms));
 assert.ok(groups.every(g=>g.length===8));const ms=groups.map(median);return {key,ms,percent:ms[0]?100*(1-ms[1]/ms[0]):null,faster:groups[0].filter((v,i)=>groups[1][i]<v).length,samples:groups};
});
const skinMs=['baseline','candidate'].map(v=>median(skin.samples.filter(r=>r.variant===v).map(r=>r.ms)));
const hudMs=['baseline','candidate'].map(v=>median(game.samples.filter(r=>r.variant===v).map(r=>r.ms)));
const c=counts.variants;
assert.equal(c.baseline.counts.consoleFamilyQueries.actions,14);assert.equal(c.candidate.counts.consoleFamilyQueries.actions,6);
assert.equal(c.baseline.counts.padDrawFamilyQueries.actions,43);assert.equal(c.candidate.counts.padDrawFamilyQueries.actions,17);
const audit={
 'UI-001':'每6tick的World通知频率保持；普通主循环只在一次driver.advance内部合并HUD展示，并在绘制前同步刷新。12个实际固定步/2次通知仅刷新1次，外部交互仍即时。',
 'UI-002':'受阻Boss拾取仍会通知；失败路径可能冻结/替换奖励候选，不能一概当作无变化。本批真实受阻30次通知全部保留，HUD刷新30→1；回执原样保留，解除阻塞后领取一次、重复拒绝。',
 'UI-003':'不合并World业务通知和交易。8个Boss领取与12步的状态、每次通知和到达卡顺序精确一致；同轮展示合并。实际同状态30次通知的最终DOM精确，刷新30→1。',
 'UI-004':'旧squad-console/seats未被当前HUD挂载，保留历史结论；当前packedSeats每兵种读取一次且保留跳虫成对和英雄席，未将旧路径计数当作当前收益。',
 'UI-005':'旧控制台clientWidth/scrollWidth路径未挂载；当前PackedConsole尺寸依赖另归UI-LAYOUT-001。本批不修改未挂载旧模块。',
 'UI-006':'展开小地图需要反映当前实体、掉落和摄像机；收起/隐藏已有提前返回，地形已有缓存。同一补帧中的重复HUD刷新减少，未降低地图更新频率或缓存动态目标。',
 'UI-007':'旧hero-skills整段重建已非当前路径；当前原生命令区已有结构key、reconcile及差异文本更新，保留。技能资格复用另见UI-ACT-001。',
 'UI-008':'“所有面板战斗10Hz重建”不成立：当前HUD按实际页面分支，详情已有开关。本批只跳过确实隐藏的production-detail构造，实际首次显示取当前数据；未省略购买观察。',
 'UI-009':'原observe仅对符合条件的已售报价扫描已记录历史，并非每帧扫描所有历史。改为offerId集合去重；新局清空、合法restore重建、原顺序及深拷贝保留。50/10000历史局部计时下降，0历史无收益。',
 'UI-ACT-001':'资格读取仅限一次同步控制台更新，5坦克场景14→6次；点击执行仍走真实World资格校验。14个UI/手柄状态及实际三尺寸焦点通过，未跨帧缓存。',
 'UI-LAYOUT-001':'确有写后读尺寸依赖。隔离真实组件100次稳定更新两侧LayoutCount均0、样式重算均200，没有消除重排的收益证据；保留现有尺寸/ResizeObserver路径，只避免同值高度变量写入。折叠、旋转及字号依赖不改。',
 'UI-SKIN-001':'无新卡片/详情时不构造完整查找表；首次卡片或详情仍构造一次并维持覆盖顺序。9个皮肤状态精确；无卡片/已装饰卡片刷新下降，首次构建无稳定收益，慢样本和单独复核均保留。',
 'UI-HIDDEN-001':'production-detail在当前控制台默认隐藏；跳过隐藏HTML与分组构造，重新显示时立即使用当前数据，设施页仍通过原入口。S05既有账本查询优化保留。',
 'UI-PAD-001':'每次有效战斗轮询复用技能页和资格；面板刷新页构建3→1、资格43→17，纯轮询12→11。实际释放后立即丢弃旧读取器重新计算，保持冷却、翻页、目标和断开语义。',
 'UI-PICK-001':'仅复用同一鼠标左键事件中已完成的inspect未命中；空地inspect2→1，移动结果一致。命中、右键、触屏、暂停保持；没有跨事件射线缓存，也未省略独立移动/技能落点查询。',
};
const simulationReview='SIM-008本批核查区分了UI展示与真实奖励草案：S05已覆盖活动预留/近期历史，U01减少显示资格与皮肤投影；draftContext的动态单位资格、精英目录去重及Boss候选池仍走原路径。未取得当前自然频度和隔离成本，保留待补证，不将UI收益外推为死亡/奖励池优化；A01整体仍待办。';
const failures=[
 'ui-1本机浏览器网络被沙箱拒绝，之后在允许本机访问的环境运行，原报告保留。',
 'ui-2验证脚本误用不存在的upgrades.add；改用真实默认资格，控制设置也改成现有mouse/tap枚举，未改生产规则。',
 'ui-3的手柄计时夹具在reset后未重新激活，技能行为状态通过但该项计时无效；ui-4起显式验证激活，最终ui-6重新测量。旧计时不纳入收益。',
 'game-1验证脚本尝试对明确延期存档的内存装备局captureRun，被现有规则拒绝。改为真实12步/通知检查，以及独立World状态和到达顺序对照；未解禁存档。',
 'game-2误选不可见的首个settings按钮而超时；game-3限定暂停遮罩内可见按钮，完整重跑通过。旧7项检查/6图仅作历史，不改标通过。',
 'regression-r1有本机后端连接权限失败；允许本机服务访问后的最终完整1725项通过，原失败日志保留。',
 'ui-6首次构造6卡中位2.400→2.830ms，7/8轮较慢；ui-7在不预先灌入10000历史的独立页面更长采样为1.6365→1.6530ms。两种环境均保留，差异未完全归因，首次构造无稳定收益。',
];
const labels={'console/0':'5坦克控制台更新','pad/0':'已激活手柄技能面板','shop/0':'0购买历史观察','shop/50':'50购买历史观察','shop/10000':'10000购买历史观察','skin-empty/0':'无卡片设置皮肤刷新','skin-cards/0':'6张已装饰卡片刷新','skin-new/0':'首次构造6张卡片'};
const table=rows.map(r=>`| ${labels[r.key]} | ${r.ms[0].toFixed(6)} | ${r.ms[1].toFixed(6)} | ${r.percent?.toFixed(1)??'—'}% | ${r.faster}/8 |`).join('\n');
const text=`# U01 / U03 界面与输入优化 · 2026-10-20

用户批准“U01＋U03剩余部分，并随批补A01对应审计复核”。本批已本地实现和验证；U01/U03完成，A01补15条UI结论并保留SIM-008待补证范围。50项完成36、剩余14，下一项U04统计/遥测，尚未开始。

## 实现及边界

1. 一次普通主循环补帧内合并HUD展示请求，最终刷新在渲染前同步完成；嵌套和抛错均正确退出。不合并World监听器、交易、入队或奖励重试；每次通知仍观察购买记录。外部用户操作保持同步更新。
2. 控制台和手柄仅在当前同步调用中复用资格，手柄复用本次技能页；施放后重新求值。每次输入仍读取当前World，不跨tick或状态修订缓存。
3. 鼠标左键点空地复用同一事件的inspect未命中；移动/技能落点查询继续执行，触屏和右键保持。
4. 购买历史保留原记录、顺序和深拷贝，用offerId集合做已记录检查，新局/恢复维护集合。隐藏生产详情不构造HTML，显示时读取当前数据。关间皮肤仅在新卡片或详情需要时构造视图表。
5. 当前控制台保留尺寸读取与ResizeObserver，仅跳过同值高度写入。未采用跨更新的阵容、布局或动态奖励资格缓存；旧未挂载控制台不改作本轮收益。

生产代码9个既有文件及1个新增展示合并器；模拟/交易/掉落/存档文件字节未改。300上限、4∶4∶1、完整效果、五图和经济规则保持。

## 测量

真实Chrome的隔离生产组件，新旧各自独立页面，8对交替调用。表为每窗口平均方法耗时的中位，单位ms/次；非端到端交互延迟或整场FPS。控制台100次/窗、手柄200次/窗、购买10000次/窗、重复皮肤200次/窗、新卡片30次/窗，20次预热。计时构建无计数探针。

| 局部方法 | 原版 | 候选 | 下降 | 候选较快 |
|---|---:|---:|---:|---:|
${table}

0历史没有收益。候选购买观察接近浏览器时钟分辨率，不能把一次调用理解为精确的纳秒耗时。10000历史是已有恢复上限内的压力夹具，不代表普通关间自然积累频率；集合另占O(已记录购买数)内存。

新卡片首次构建没有稳定收益：完整夹具中2.400→2.830ms，独立页面、更长100次/窗复查为${skinMs[0].toFixed(4)}→${skinMs[1].toFixed(4)}ms。两轮环境和慢样本保留，不用复查覆盖原回退。

实际游戏同一个HUD对象切换旧/新update方法，8对×40次，${hudMs[0].toFixed(4)}→${hudMs[1].toFixed(4)}ms；其子组件均为当前实例，**仅用于隔离HUD主方法的隐藏详情/历史差异，不是完整旧版游戏A/B或全项叠加收益**。

独立计数构建：5坦克控制台资格14→6；手柄面板页构建3→1、资格43→17，非面板纯轮询12→11。两侧packedSeats的同兵种查询仍为1次。100次稳定组件更新两侧LayoutCount均0、RecalcStyleCount均200，未宣称消除了强制布局。

## 正确性、真实界面与画面

- 1725项完整回归、类型检查和数据文档检查通过；新增4项覆盖同步合并/异常退出、购买恢复/去重/新局、资格读取边界，以及8个Boss交易＋12固定步的全状态/通知/到达顺序一致。
- 浏览器14个新旧UI/手柄状态和9个皮肤状态精确；包含技能施放后的真实冷却、翻页、暂停/恢复、单位变化、种族变化、检查面板捕获与断开。另有5种实际鼠标/浏览器触摸事件路径，空地inspect2→1，移动结果不变。
- 实际游戏30次业务通知全部保留，HUD30→1且最终DOM精确；12个固定步完整推进、2次业务通知、1次HUD。真实Boss受阻30次保留同一回执，解除阻塞后成功，重复领取拒绝。
- 隐藏详情保留哨兵内容不计算，显示立即替换为当前生产状态。实际390×844、844×390、1440×900更新后焦点保持；Escape暂停/设置返回、真实关间和休整卡片通过。原有图鉴导航继续禁用；独立组件图鉴卡片测试不代表重新开放入口。
- 最终8张截图通过联系表及窄屏/休整原尺寸查看；战场、命令、暂停、设置、基地建设和休整卡没有发现本批新增明显显示异常。窄屏保持原HUD裁边与布局，不重新验收整体UI。
- 页面/控制台错误0，8条请求失败/取消的原始URL与原因留在运行报告。合成手柄/浏览器触摸不替代物理设备或用户体验验收。

## A01当前复核

${Object.entries(audit).map(([id,t])=>`- ${id}：${t}`).join('\n')}

${simulationReview}

## 保留的失败与无收益

${failures.map(t=>'- '+t).join('\n')}

## 构建与交付

冻结R03最终输入，${build.inputs.length}个编译输入、${production.length}个生产输入；原版比较器只存在诊断入口。无关economic-egg修改继续排除。UI独立构建${ui.build.inputs.length}输入，其生产文件与本次真实游戏构建哈希一致。

- 预览：\`preview/performance-u01-u03-20261020-candidate-r1/\`（本机4436）。
- JS SHA-256：\`${js.sha256}\`。浏览器实际响应的JS/CSS字节哈希已绑定。
- [范围报告](../../${reportFile})绑定源码、构建、运行器、测试、截图及失败记录。
- main仍为be9e2982944314194c6dcc9dcc535bc321749eb4；未替换Current、提交/推送或发布。U04统计/遥测、L02/L03和A01剩余项未启动。存档仍延期；自然战役、物理输入、人类试玩、全内容60FPS和整体MVP未由本批关闭。
`;
await fs.writeFile(doc,text);
const review={reviewed:true,run:'game-3',screens:game.screens,contact:root+'/game-3/contact.png',originalViews:['battle-390x844','rest'],finding:'No new obvious visual errors in this batch; existing narrow HUD cropping/layout retained; no all-pixel/physical/human/full-content acceptance.'};
await fs.writeFile(root+'/visual-review.json',JSON.stringify(review,null,2));
const paths=[doc,root+'/visual-review.json',...['regression','typecheck','docs-check'].flatMap(n=>[root+'/'+n+'-final.txt',root+'/'+n+'-final.exit']),root+'/regression-r1.txt',
 ...['ui-1','ui-2','ui-3','ui-4','ui-5-counts','ui-6','ui-7-skin','game-1','game-2','game-3'].flatMap(n=>[root+'/'+n+'/report.json',root+'/'+n+'/runner.mjs']),
 ...build.outputs.map(o=>o.file),...ui.build.outputs.map(o=>o.file),...game.screens.map(s=>s.file),review.contact,...changes,
 'test/hud-refresh-batch.test.ts','tools/build-performance-u01-u03.mjs','tools/qa-performance-u01-u03-ui.mjs','tools/qa-performance-u01-u03-game.mjs'];
const files=[];for(const file of paths){const bytes=await fs.readFile(file);files.push({file,bytes:bytes.length,sha256:hash(bytes)});}
await fs.writeFile(reportFile,JSON.stringify({
 schemaVersion:1,id:'performance-u01-u03-20261020',status:'verified-local',
 source:{baseline:build.previous,changes,productionInputs:production.length,build,uiBuild:ui.build,counterBuild:counts.build,served:game.served},
 cpu:{method:'Eight alternating window pairs; median of per-call window means. Separate uninstrumented component pages. Not frame time or natural FPS.',rows,skinRecheck:{method:'Fresh page without preceding 10000-entry restored-history fixture; 100 calls/window',ms:skinMs,samples:skin.samples},hud:{method:'Same current HUD object, old/new update prototype only; children remain candidate instances',ms:hudMs,samples:game.samples}},
 verification:{tests:1725,typecheck:true,docsCheck:true,uiStates:14,skinStates:9,counts:Object.fromEntries(Object.entries(counts.variants).map(([k,v])=>[k,v.counts])),pointer:Object.fromEntries(Object.entries(ui.variants).map(([k,v])=>[k,v.pointer])),layout:Object.fromEntries(Object.entries(ui.variants).map(([k,v])=>[k,v.layout])),gameChecks:game.checks,errors:game.errors,requests:game.requests},
 audit,simulationReview,review,retainedFailures:failures,
 limits:['First card creation has no stable benefit; original slow sample retained.','No change to business notification frequency, simulation, rewards, quality or save deferral.','A01 simulation reward-pool frequency/cost and other remaining audits stay open.','No natural campaign, physical device, human, whole-game FPS or MVP acceptance.','No Current replacement, commit, push or publication.'],
 artifacts:{documentation:doc,preview:'preview/performance-u01-u03-20261020-candidate-r1/',files},
},null,2)+'\n');
const boardFile='docs/project/performance-board.json',board=await read(boardFile),evidence=['PERFORMANCE_U01_U03_20261020.md','../../'+reportFile];
for(const id of ['U01','U03']){const t=board.tasks.find(t=>t.id===id);assert.ok(['进行中','待验证'].includes(t.status));t.status='已完成';t.updated='2026-10-20';t.evidence=[...new Set([...t.evidence,...evidence])];}
board.tasks.find(t=>t.id==='U01').result='同一补帧内仅合并HUD展示，30次业务通知保留而刷新30→1；每次仍观察购买。控制台资格14→6，历史集合去重、隐藏详情与皮肤按需投影完成。1725回归、14+9状态、真实Boss受阻/重试、三尺寸焦点/暂停/设置/关间及8图通过。首次卡片无稳定收益、布局两侧0次实际重排；慢样本保留，非整场FPS。';
board.tasks.find(t=>t.id==='U03').result='既有R03空菜单/重复reset保留。本批完成战斗技能页与鼠标查询：面板页3→1、资格43→17；施放后重新求值，空地inspect2→1而移动结果不变。14个UI/合成手柄状态和5种浏览器指针路径通过，实际三尺寸焦点/暂停保持。完整1725回归；物理手柄/触屏及自然FPS仍非本批验收。';
for(const [id,t]of Object.entries(audit))board.auditRows.find(r=>r.id===id).currentReview='2026-10-20 U01/U03：'+t;
board.auditRows.find(r=>r.id==='SIM-008').currentReview='2026-10-20 '+simulationReview;
const a01=board.tasks.find(t=>t.id==='A01');a01.result+=' U01/U03补15条UI当前结论，旧未挂载/已修复/误述及无收益分开；SIM-008动态奖励池保留待补证，不算本批已优化。A01整体仍未完成。';a01.evidence=[...new Set([...a01.evidence,...evidence])];a01.updated='2026-10-20';
board.revision++;board.updated='2026-10-20';board.next='U04';
board.updates.push({date:'2026-10-20',tasks:['U01','U03','A01'],evidence,change:'U01/U03剩余实现与验证完成：同轮HUD展示30→1而业务通知全保留；控制台/技能页/指针及历史/隐藏投影减少重复工作。1725回归、14+9状态、真实Boss重试/三尺寸/暂停/关间及8图通过。新卡片慢样本、布局无收益和全部失败保留。A01补15条UI结论，SIM-008仍待补证；50项完成36、剩余14，next U04未开始。'});
assert.equal(board.tasks.filter(t=>t.status==='已完成').length,36);
await fs.writeFile(boardFile,JSON.stringify(board,null,2)+'\n');
for(const file of ['docs/README.md','docs/DOCUMENT_INDEX.md','docs/PROJECT_STRUCTURE.md','docs/project/README.md']){
 const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n\n'),target=file==='docs/project/README.md'?'PERFORMANCE_U01_U03_20261020.md':'project/PERFORMANCE_U01_U03_20261020.md';
 const nav=`2026-10-20 U01/U03完成：[界面与输入优化](${target})。同轮HUD展示合并、技能/指针/历史及隐藏投影复用，1725回归与真实界面通过；业务通知保持，首次卡片无稳定收益。50项完成36、剩余14，A01仍有余项，下一项U04未开始。\n\n`;
 await fs.writeFile(file,old.slice(0,at+2)+nav+old.slice(at+2));
}
const agents=`## U01/U03 界面与输入小合批完成 · 2026-10-20

- 用户批准U01＋U03剩余部分及A01对应复核。记录docs/project/PERFORMANCE_U01_U03_20261020.md，证据reports/qa/performance-u01-u03-20261020.json。50项完成36、剩余14；U01/U03完成，下一项U04统计/遥测未开始，A01整体仍待办。
- 同次driver.advance只合并HUD展示，30次World业务通知保留、HUD30→1；购买观察/交易/到达/重试仍逐次。12实际固定步、8Boss交易状态/通知/到达顺序验证；真实Boss受阻30次保留回执，解除后领取一次。
- 单次控制台/手柄复用资格，施放后重新读取；5坦克14→6查询，手柄页3→1/资格43→17，鼠标空地inspect2→1。购买历史集合去重，隐藏详情不构造，关间皮肤按需投影。0历史/首次卡片无稳定收益，首次卡片2.400→2.830ms慢样本与独立1.6365→1.6530ms复查并存；布局两侧100次更新0重排，未改尺寸规则。
- 最终1725回归、类型/数据检查通过；14个UI/手柄＋9皮肤对照、5指针路径、实际三尺寸焦点/暂停/设置/关间及8图核验。错误0，请求失败/取消8条保留。无物理手柄/触屏、人类或全内容FPS验收。
- A01补15条UI复核；SIM-008动态奖励池仍原路径，缺自然频度/隔离成本，保留待补证。保留本机网络失败、脚本错误、内存局存档拒绝与设置选择器超时；未解除存档延期或改标失败。
- 最终JS ${js.sha256}，945编译输入/412生产输入，冻结R03仅9旧文件＋1新增文件，无关economic-egg排除。预览preview/performance-u01-u03-20261020-candidate-r1/（4436）；未替换Current、提交/推送或发布。300/4∶4∶1、完整效果、五图、经济、存档延期及整体MVP边界保持。

`;
await fs.writeFile('AGENTS.md',agents+await fs.readFile('AGENTS.md','utf8'));
console.log(JSON.stringify({doc,reportFile,changes,revision:board.revision,completed:36,next:board.next,files:files.length,rows,skinMs,hudMs}));
