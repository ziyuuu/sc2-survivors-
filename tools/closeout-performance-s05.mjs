import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s05-20261020',read=async p=>JSON.parse(await fs.readFile(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline=await read(root+'/baseline-5/report.json'),candidate=await read(root+'/candidate-1/report.json'),logic=await read(root+'/equivalence.json'),boundaries=await read(root+'/boundaries.json'),cpu=await read(root+'/cpu.json'),consumers=await read(root+'/consumer-cpu.json'),source=await read(root+'/source-proof.json'),summary=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json');
for(const r of [baseline,candidate,logic,boundaries,cpu,consumers,source,summary])assert.ok(r.pass);
assert.equal(logic.checkpoints,993);assert.equal(boundaries.checks,49);assert.equal(summary.pairs.length,12);assert.equal(pixels.pairs.length,9);assert.equal(summary.ui.length,4);for(const p of pixels.pairs.filter(p=>p.name.endsWith('-released')))assert.equal(p.battleRows30to620,0);assert.equal(process.env.SC2_VISUAL_REVIEWED,'1');
for(const r of [baseline,candidate]){assert.equal(r.errors.length,0);assert.equal(r.screens.length,9);assert.equal(r.checkpoints.length,12);assert.equal(r.scenarios.length,4);for(const s of r.screens)assert.equal(hash(await fs.readFile(s.file)),s.sha256);for(const c of r.checkpoints){assert.equal(c.state.phase,'battle');assert.equal(c.state.tick,0);}}
for(const x of source.changed)assert.equal(hash(await fs.readFile(x.file)),x.sha256);
for(const x of source.candidate.inputs.filter(x=>x.file.startsWith('tools/')))assert.equal(source.baseline.inputs.find(y=>y.file===x.file)?.sha256,x.sha256);
const tests=await fs.readFile(root+'/full-tests.log','utf8');assert.match(tests,/pass 1704/);assert.match(tests,/fail 0/);
const first=await read(root+'/baseline-1/report.json');assert.ok(first.failure);assert.equal(first.errors.length,0);
const decisions=[
 {id:'SAVE-005',result:'Retain full pods and economic records. Ledger job lookup is indexed, including queen injection; no blanket skip of destroyed pods: they can still release pending guards. A/B control proves both pending guards release once with guardianPod=null. Economic-record and historical-pod traversal remain; no memory compaction claim.'},
 {id:'SAVE-007',result:'Read the previous two draft-history records directly rather than copy all preceding history first. 0/1/2/3/20/1000/10000 histories include shown/chosen weighting and actual offers/RNG equality. Preserve complete history.'},
 {id:'SAVE-008',result:'Derived index by ledger array identity: append indexes once, settled jobs leave only the work set, full historical array and first-ID lookup remain. Cold build and extra Map memory measured. No receipt/purchase-history deletion; observer still needs all new orders, U04 unchanged.'},
 {id:'PG-002',result:'Share active-delivery queries for production, paid/body/tactical reservations, twin pending lookup, refunds, retirement and delivery. Read current passenger/body state each time; no cached counts across same-tick deaths or cargo mutation. Both UI consumers share these queries.'},
 {id:'PG-003',result:'Two living twins clear regrowth/birth-pending and return before ledger lookup. Missing/dead partner still checks waiting cargo and original recovery rules. Proxy test proves zero ledger access for healthy twins.'},
 {id:'PG-008',result:'Keep existing ordered Boss loot settlement and repeated queue filtering. These transitions may acquire units, change later eligibility or retain blocked retries. No independent optimization adopted or new speedup claimed; original source input is unchanged and full regression covers immediate/blocked/transition/idempotent settlement.'},
 {id:'PG-020',result:'Keep native purchase/claim army-stat refresh. Real building/cards/equipment and arrivals can alter recipients and subsequent eligibility. No dynamic stat cache or notification coalescing in S05; unchanged source plus full regression is the retained control, not a measured optimization.'}
];
const failures={items:[{file:root+'/baseline-4/report.json',result:'Waiting for detached DOM timed out: production closes by hiding the overlay while retaining its DOM. Read-only browser inspection confirmed battlePanel=null, paused=false and hidden modal.',resolution:'Use visibility assertions; baseline-5 reuses this loaded browser but resets all four World fixtures before formal captures, then closes it. No FPS comparison uses this reused session.'},{file:root+'/baseline-3/report.json',result:'Third runner asserted zero modal DOM nodes after close. The game intentionally retains hidden overlay markup; screenshot shows normal closed battlefield. Game errors 0.',resolution:'Fourth runner also incorrectly waited for DOM removal and timed out on the hidden node. Final runner waits for hidden state; production and diagnostic bundles unchanged.'},{file:root+'/baseline-2/report.json',result:'Second browser runner matched both the close icon and Cancel button, so Playwright strict selection refused the click; game errors 0.',resolution:'Select the first existing close button explicitly. Original report, runner and screenshots retained; same game and diagnostic builds.'},{file:root+'/baseline-1/report.json',result:'Initial browser runner looked for the production enable button on the construction-tree tab; selector assertion failed (0 vs 1). Page/console errors 0.',resolution:'Runner now navigates back to facilities, edits and applies the real placement draft, reopens/closes the panel, then verifies paid delivery. Same production/diagnostic bundles retained; baseline-5/candidate-1 are the formal pair. First report/screens/runner preserved.'}],negativeMeasurements:cpu.hot.filter(r=>r.changePercent>0),negativeConsumerMeasurements:consumers.rows.filter(r=>r.changePercent>0),coldIndex:cpu.cold.filter(r=>r.mode==='candidate'),note:'All measurement samples, including sub-microsecond short-history overhead and unchanged general UI variation, retained. Extra derived index costs memory and one cold scan.'};
const report={date:'2026-10-20',task:'S05 + U01 production display subtask',status:'verified-local',base:'S08 final frozen production inputs on main be9e298; seven S05 files differ, no Git commit',source,logic,boundaries,cpu,consumers,decisions,failures,validation:{tests:1704,newTests:6,testLog:root+'/full-tests.log',typecheck:root+'/typecheck-r2.log',dataCheck:root+'/docs-check.log',browser:{baseline:'baseline-5',candidate:'candidate-1',summary,pixels,pixelEquivalence:false,visualReview:'Three contact sheets and two original-size baseline images reviewed: no obvious missing icons, clipped labels or wrong bodies. Four released scenes are RGB-exact in rows 30–619. Modal captures have position/background differences; UI motion/layout completion was not synchronized and cause was not isolated. No whole-image equivalence claim.',visualContactsReviewed:true,captureMethod:baseline.captureMethod,baselineSession:{reusedFrom:'baseline-4',actualProfile:(await read(root+'/baseline-4/report.json')).profile,originalStartupErrors:(await read(root+'/baseline-4/report.json')).errors,originalStartupRequests:(await read(root+'/baseline-4/report.json')).requests,note:'baseline-5 raw profile.path is the unused default argument because it attached over CDP; actual profile is recorded here. All four formal World fixtures reset after attaching.'}}},limitations:[
 'CPU tests isolate production queries and consumers. This batch does not measure or claim whole-game FPS/60 FPS.',
 'Historical arrays, completed receipts, purchase history, pods and economic records remain. The derived ID map grows with history; saves remain deferred.',
 'Index contract follows native append-only ledger and array replacement on reset/restore. Same-length arbitrary in-place historical replacement/reordering is not a supported writer path. Native cargo/state writers notify the work index; passenger counts remain live.',
 'Browser four fixtures use actual boot/HUD/production rules, 1000 injected settled records, diagnostic paid training completion and direct paid passenger release. No natural rescue, human gameplay or physical-input acceptance; fixed snapshots remain tick 0.',
 'Tactical browser fixture supplies the existing soldier talent allocation diagnostically; it is not an ordinary empty-account start.',
 'U01 other notification/shop/layout tasks, U04 observer/statistics/telemetry, S06 spawn and S07 collision remain pending.',
 'No Current/named delivery replacement, commit, push or publication. Five maps, 300 cap, 4:4:1, quality, simulation/economy and save deferral unchanged.'
]};
await fs.writeFile('reports/qa/performance-s05-20261020.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile(root+'/failures.json',JSON.stringify(failures,null,2)+'\n');
const labels={'reservations':'无待交付时预留查询','production-idle':'生产推进／无活动订单','production-training':'生产推进／1 个训练订单','healthy-twins':'健康双生维护','ui':'普通构建树 UI','active-reservations':'1 个付费订单预留查询','tactical-ui':'战术进阶布置 UI','draft-weights':'奖励候选权重'};
const table=rows=>rows.map(r=>`| ${labels[r.name??r.kind]} | ${r.n} | ${r.baselineMs.toFixed(6)} | ${r.candidateMs.toFixed(6)} | ${r.changePercent.toFixed(1)}% |`).join('\n');
const build=source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
await fs.writeFile('docs/project/PERFORMANCE_S05_20261020.md',`# S05 活动生产与长历史查询 · 2026-10-20

用户批准 S05 小合批，包含 U01 的生产详情与战术预留两个消费端，以及 A01 对应七条审计。S05 已本地验证完成；U01 其余内容仍待办。[范围证据](../../reports/qa/performance-s05-20261020.json)；[性能看板](PERFORMANCE_BOARD.html)。

## 实现

- 以账本数组身份维护派生索引：新增订单只登记一次，ID 查询保留首个匹配；待处理集合保持原订单顺序，完全结算且没有等待乘客后移出。原账本、回执、购买历史不删除，也不序列化派生索引。重置／恢复更换数组后自动重建。
- 生产推进、人数预留、训练设施占用、退款、退役、舱内交付与女王注入共用查询。每次仍读取当前乘客、存活双生体、培养继承及目标资格，避免同一 tick 内首个双生体死亡、后半仍待交付时出现错误空位。
- 两个双生体均存活时，先完成原维护状态清理，再跳过无用账本查询。残缺双生继续执行原等待／重生逻辑。
- 奖励权重直接读取此前两轮历史，不先复制全部历史。生产详情及战术进阶 UI 复用对应查询；未合并其他 HUD 通知，也未改统计观察者。

索引遵循真实写入契约：账本原地追加，恢复／重置替换数组；订单状态／乘客变化走现有写入函数并通知索引。任意同长度原地重排或替换历史项不是当前生产路径；未为这种外部写入建立通用代理。等待人数不跨调用缓存。

## CPU 与内存

同进程两套冻结构建、串行交替 9 轮、100 次预热（消费端另为 60 次），表为每次调用的中位 ms。0／20／1000／10000 条已结算历史原样保留。第一张表每轮 2000 次，普通 UI 为 200 次；第二张表消费端每轮 200 次，预留查询为 2000 次。**局部 CPU 不是整场帧率。**

| 路径 | 历史条数 | 原实现 ms | 当前 ms | 变化 |
| --- | ---: | ---: | ---: | ---: |
${table(cpu.hot.filter(r=>r.n===0||r.n===10000))}

| 消费端 | 历史条数 | 原实现 ms | 当前 ms | 变化 |
| --- | ---: | ---: | ---: | ---: |
${table(consumers.rows.filter(r=>r.n===0||r.n===10000))}

所有中间档及逐轮原始数据保留。长历史反复扫描成本明显降低；0 条历史的生产推进及 20 条历史的训练路径有微小绝对成本回退，普通构建树 UI 无稳定收益，不推广为全界面加速。消费端补测的0历史战术面板约慢6.3%（约0.001ms）；10000历史战术面板0.358599→0.016376ms、奖励权重0.264791→0.066269ms，各9/9轮较快，约下降95.4%/75.0%。

首次读取包含建索引成本，7 轮强制 GC 后的 Node 测量：1000 条原／新约 ${cpu.cold.find(r=>r.mode==='baseline'&&r.n===1000).medianMs.toFixed(3)}／${cpu.cold.find(r=>r.mode==='candidate'&&r.n===1000).medianMs.toFixed(3)}ms；10000 条约 ${cpu.cold.find(r=>r.mode==='baseline'&&r.n===10000).medianMs.toFixed(3)}／${cpu.cold.find(r=>r.mode==='candidate'&&r.n===10000).medianMs.toFixed(3)}ms。当前派生索引净留存中位约 ${(cpu.cold.find(r=>r.mode==='candidate'&&r.n===1000).medianHeapBytes/1024).toFixed(1)}／${(cpu.cold.find(r=>r.mode==='candidate'&&r.n===10000).medianHeapBytes/1024).toFixed(1)} KiB。这是额外 Map 成本，不是内存压缩；并非浏览器整体堆大小或自然长期内存验收。

## 验证

- 1704 回归、类型与数据文档检查通过；新增 6 项直接覆盖索引读次数、追加／替换／截断／显式重开顺序、同 tick 双生变化、健康双生零账本读取、已结算但仍有等待乘客、遍历中结算不漏后续订单。
- 993 个完整状态／账户／事件／RNG／UI 检查：三族、三个种子、四档历史；关闭生产后已付款继续、落点阻塞和重试、交付、退款、退役、女王注入、双生死亡、战术进阶五份交付，以及奖励抽取。再加 49 个边界检查：接收／拒绝／重复回执、原生恢复、最近已展示／已选奖励权重和被毁舱剩余守卫。两构建仅归一三处新局 UUID；不删除其余状态差异。
- 查尔、seed529、1440×900 DPR1、完整效果，真实游戏启动；三族生产与人族战术进阶四场景，每场注入 1000 条已结算历史，真实支付建单。浏览器点击打开设施、切换页签、编辑并应用暂停生产、返回，再调用原生产和交付函数。训练／已投放／已交付共 12 对完整状态和活动绘制输出精确；18 张截图、三张联系表已查看。战术预留从 0+1/5 到 1+0/5，订单结算后历史仍为 1001 条。
- 浏览器只在冻结 tick 0 下验证上述规则和显示；100 秒训练完成参数、直接释放乘客及诊断天赋明确单列，不能当作自然救援／完整战役／物理输入验收。截图期间暂缓重复 WebGL 提交并断言 World 不变，再恢复。界面动效与布局完成时点未同步；模态窗口的相对位置/背景有差异，原因未单独隔离，不宣称全图像素一致。四个交付后场景的战场行30—619像素均一致；联系表未见明显缺图、文字溢出或错误兵种。
- 页面／控制台错误 ${baseline.errors.length}/${candidate.errors.length}，资源请求取消 ${baseline.requests.length}/${candidate.requests.length} 逐条保留。九对全图差异像素：${pixels.pairs.map(x=>x.name+' '+x.changedPixels).join('；')}。

## 七条审计与保留项

SAVE-005：只优化生产账本查询；历史运输舱、经济对象仍保留原扫描。被毁舱可能尚有未放守卫，补测确认其仍一次性放出并解除舱绑定，不能按“已毁”全部跳过。

SAVE-007：最近两轮奖励历史直接切片，保留抽样权重、RNG、选择及完整历史。SAVE-008：生产查询索引完成，回执／购买历史增长保持；统计观察者需要所有新增订单，不能直接换成活动订单集合。

PG-002：生产／双生预留共用实时查询，退款、交付和 UI 一并验证。PG-003：健康双生不再扫描任务乘客；残缺双生规则保留。

PG-008：Boss 轮末回收和队列结算保留原有顺序及过滤；可能改变后续单位资格或留下阻塞重试，本轮没有采纳独立优化，也不申报收益。PG-020：购买／领取后的友军属性刷新保持实时，未加入动态缓存；原源码不变及现有完整回归作为保留控制证据。

## 构建与失败记录

冻结 S08 最终输入，仅七处游戏文件变化；${source.candidate.inputs.length} 浏览器输入、${source.nodeNew.inputs.length} Node 输入绑定，排除其他任务的 economic-egg 修改。最终 JS \`${build}\`；预览 \`preview/performance-s05-20261020-candidate-r2/\`（4436）。

首次浏览器 baseline-1 在构建树页签寻找布置页签的按钮，脚本断言 0≠1，游戏错误 0；原报告、截图及 runner 保留。第二轮 baseline-2 又因关闭图标与取消按钮共用 action 导致严格选择器拒绝；已明确选择右上角关闭按钮。第三轮 baseline-3 检查关闭后DOM数量，第四轮 baseline-4 等待DOM删除，均不符合游戏保留隐藏面板的实现。只读检查确认 battlePanel=null、paused=false、面板已隐藏；最终改为检查不可见。四次失败均保留。正式 baseline-5 复用第四轮已载入的浏览器，但四场景均重新重置World；candidate-1独立启动，同一游戏和诊断构建重跑；没有把旧失败改标通过。短历史回退、冷索引开销及额外内存均保留。

看板完成 28/49，剩余 21，下一项 S06 尚未开始。U01 生产显示子项完成，其余通知／商店／布局待办；U04、S07 不在本批实施。未替换 Current／命名交付、提交／推送或发布；300 上限、4∶4∶1、五图、画质、模拟经济与存档延期保持。
`);
console.log(JSON.stringify({status:report.status,logic:1042,browser:12,screens:18,document:'docs/project/PERFORMANCE_S05_20261020.md'}));
