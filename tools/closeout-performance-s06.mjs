import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const root='reports/local/performance-s06-20261020',read=async p=>JSON.parse(await fs.readFile(p)),hash=x=>createHash('sha256').update(x).digest('hex');
const baseline=await read(root+'/baseline-2/report.json'),candidate=await read(root+'/candidate-1/report.json'),logic=await read(root+'/equivalence-r3.json'),boundary=await read(root+'/boundaries.json'),cpu=await read(root+'/cpu-r2.json'),fallback=await read(root+'/cpu-r3.json'),source=await read(root+'/source-proof.json'),summary=await read(root+'/summary.json'),pixels=await read(root+'/pixels.json');
for(const r of [baseline,candidate,logic,boundary,cpu,fallback,source,summary])assert.ok(r.pass);
assert.equal(logic.checkpoints,584);assert.equal(boundary.rows.length,20);assert.equal(summary.pairs.length,8);assert.equal(pixels.pairs.length,8);
for(const row of pixels.pairs)assert.equal(row.changedPixels,0);assert.equal(process.env.SC2_VISUAL_REVIEWED,'1');
for(const r of [baseline,candidate]){assert.equal(r.errors.length,0);assert.equal(r.screens.length,8);for(const s of r.screens)assert.equal(hash(await fs.readFile(s.file)),s.sha256);}
for(const x of source.changed)assert.equal(hash(await fs.readFile(x.file)),x.sha256);
for(const x of source.candidate.inputs.filter(x=>x.file.startsWith('tools/')))assert.equal(source.baseline.inputs.find(y=>y.file===x.file)?.sha256,x.sha256);
const tests=await fs.readFile(root+'/full-tests.txt','utf8'),retest=await fs.readFile(root+'/environment-retest.txt','utf8');
assert.match(tests,/tests 1708/);assert.match(tests,/pass 1701/);assert.match(tests,/fail 7/);assert.match(retest,/pass 16/);assert.match(retest,/fail 0/);
const limitations=await read(root+'/retained-limitations.json');
limitations.invalidFallbackPilot={files:['equivalence-r1.json','equivalence-r2.json','cpu-r1.json','cpu-r2.json'],issue:'The fallback fixture used circular r instead of actual rectangle w/h. Those fallback-labeled rows did not exercise fallback and are excluded. R3 uses w=4,h=4 plus an assertion that every birth leaves the blocked desired point. No production or browser bundle changed.'};
await fs.writeFile(root+'/retained-limitations.json',JSON.stringify(limitations,null,2));
const decisions={
 'SIM-009':'保留满员积压清场后同一步补齐原可用名额，不分帧、不丢队列。176出生与实际固定步A/B精确且局部CPU下降；时序取舍仍归D01。',
 'SIM-010':'releaseAmbient调用内复用备用落点候选；每个敌人原随机调用仍保留，连备用点未使用也不跳过。无跨tick池；新锚点和新地图下一次重新筛选。',
 'SIM-011':'现有swarm按半径缓存合法格，逐次仍按当前锚点筛距离并取最近；每步最多8只。保持现状，未将原有优化计成本轮收益。',
 'SIM-012':'虫巢一次落点搜索内按需收集当前活地面实体；下一只出生重新构建，上一只仍立即成为阻挡，尸体不再每候选重复过滤。',
 'SIM-015':'补五个实际MapTerrain的出生/运输舱/直接补给/虫巢查询状态对照及查尔浏览器。保留原寻路与地形规则；不是完整自然路线或全图性能验收。',
 'SIM-020':'跨轮ambient/swarm积压与原优先级保留。删除/截断/摊平会改变战斗投放，未采用；体验决策仍D01。',
 'SIM-021':'保留原稳定sort和shift。10000积压排序追加调用约0.322/0.286ms且仅6/12对较快，代码未改，不归因收益；本批收益来自落点重复查询。',
 'SIM-022':'驳回“some总是与积压总长成正比”：首条到期即可短路。保留原<=time判断（不同于ambient的epsilon）；到期ambient优先级控制通过。',
 'C18':'候选点搜索调用内复用集合；不缓存全局失败或降低重试频率。结构死亡/新生、同tick大体型友军与空落点、等距首项对照通过。选敌策略未改。',
 'C24':'保留敌路由已有格数组身份中心缓存、每敌三段各最多48候选；guardianPod仍读取现有舱与状态。176出生后的完整step/浏览器复核，不新增历史舱索引或声称此项单独收益。',
 'PG-011':'freePosition每次调用按需只收集当前同平面活体，所有原半径/角度/建筑和舱碰撞规则保留。1000实体堵塞压力下降，空场景微小回退保留。',
 'PG-012':'运输舱一次搜索共用当前体型、活动舱、活建筑/结构集合；每次重试重新采集，原192候选窗口、逐点高度/通行/路线验证和重复提交校验保留。',
 'PG-022':'付费英雄落点仍原每tick重试，无退避/降频。共享freePosition降低查询重复工作，失败不扣除/丢弃队列；不宣称改变付费英雄时序。',
 'PG-023':'无尽就绪预览与提交各自验证当前占位和状态，保留重复计算。未共享可变实体的旧预览；原转换/原子性回归通过，无单独新增收益。'
};
const report={schemaVersion:1,id:'performance-s06-20261020',status:'verified-local',scope:'S06 spawn and landing local CPU optimization; S09 added and diagnosed only.',source,tests:{coverage:1708,initial:{pass:1701,fail:7,file:root+'/full-tests.txt'},environmentRetest:{files:['coze-fetch.test.mjs','coze-web.test.mjs','p5-backend.test.mjs'],pass:16,fail:0,file:root+'/environment-retest.txt'},typecheck:root+'/typecheck.txt',data:root+'/docs-check.txt'},logic,boundary,cpu:{...cpu,rows:[...cpu.rows.filter(r=>r.name!=='ambient-fallback'),...fallback.rows],excluded:'cpu-r2 ambient-fallback row invalid; replaced by cpu-r3 blocked-point test'},browser:summary,pixels,visualReview:{reviewed:true,contacts:pixels.contacts,note:'16 images inspected through three contact sheets; no introduced display differences. All eight RGB pairs exact. Carrier in falling phase after 120 ticks, not completed rescue.'},decisions,limitations,s09:{status:'diagnosed-not-fixed',node:['reports/local/baneling-s09-20261020/diagnosis-r1.json','reports/local/baneling-s09-20261020/diagnosis-r2.json'],browserRuns:[root+'/baseline-2/report.json',root+'/candidate-1/report.json'],result:'Normal and three elites each fire 3 times in 900 ticks in open approach/contact/moving-target. Frozen and normally acting 12-hydralisk formations: 0 baneling shots, existing target but stalled approach. Actual Char browser confirms normal baneling 3 vs 0. Enemy/hero-temporary variants and fix remain S09.'},notClaimed:['full-content FPS or 60FPS','natural campaign or supported physical input','user final acceptance','S09 gameplay fix','Current replacement or Git commit/push or online publication']};
await fs.writeFile('reports/qa/performance-s06-20261020.json',JSON.stringify(report,null,2));
const sha=source.candidate.outputs.find(x=>x.file.endsWith('/main.js')).sha256;
const table=report.cpu.rows.map(r=>`| ${r.name}${r.theme?' / '+r.theme:''} | ${r.n} | ${r.baselineMs.toFixed(6)} | ${r.candidateMs.toFixed(6)} | ${r.fasterPairs}/12 |`).join('\n');
const doc=`# S06 敌人出生与落点搜索 · 2026-10-20

用户授权开始 S06，同时新增毒爆主动攻击任务 S09。S06 已本地验证完成；S09 已核验现象并列为下一项，未在本批修改攻击逻辑。[看板](PERFORMANCE_BOARD.html) · [完整证据](../../reports/qa/performance-s06-20261020.json)。

## 实现与保持的规则

只改 world.ts 与 movement/carrier-landing.ts。同一出生批次复用备用落点候选及无尽友军列表，每只敌人仍消耗原来的随机数；合法落点失败时单遍找最近候选，严格小于比较保留原稳定排序的等距首项。直接补给与虫巢每次搜索只收集一次当前存活碰撞实体；每次新搜索重新采集，刚出生的单位仍能阻挡后续单位。运输舱一次搜索共用当前体型和结构集合，逐候选的地形高度、通行、路线及原192个窗口不变。

所有集合仅存在于同步调用内，不序列化、不跨tick缓存。原排队时刻、强度、位置、RNG、300上限、4∶4∶1、已付款与经济规则保持。未删除积压或历史对象，未降低重试频率。原sort/shift、swarm每步8只与优先级、无尽就绪/提交双重验证、敌路由和旧舱查找保留；逐项决定见文末。D01的分帧投放仍待讨论。

## 测量

同进程冻结两套构建，串行交替12轮，准备夹具不计时；查询每轮30次，出生/队列/固定步每轮1次。表中为单次中位毫秒。**这是局部CPU，不是整场FPS。** 1000实体/历史舱为压力测试，不代表普通小队规模。

| 路径 | 数量 | 原实现 ms | 当前 ms | 较快对数 |
| --- | ---: | ---: | ---: | ---: |
${table}

176集中出生中位26.1615→1.8020ms；同一状态的完整一次World.step中位41.3847→7.1710ms，12轮观察到的最慢样本61.0938→23.6157ms。不是最坏情况上界。查尔实际地形出生25.5128→1.7579ms。强制阻塞落点的正式R3为301.8020→26.7076ms，12/12较快。空场freePosition略慢；无尽空友军出生中位约慢7%，只有6/12较快，无稳定收益。队列代码未改，其波动不算优化收益。

浏览器每组只有一次出生单步和一次50调用落点测量，加载/JIT/运行次序不同，仅保留原值，不据此推广性能百分比。没有录制新的整场FPS结论。

## 核验

- 1708回归覆盖通过：初次1701通过、7项沙箱文件/本机HTTP权限失败；仅复测三个受影响文件，16项全通过。原失败保留，未伪称单轮1708全绿。类型与数据文档检查通过。
- 正式R3：100组、584完整状态/账户/事件/RNG/查询结果对照，包含两个种子、0/1/176/1000密度、五个实际MapTerrain。另20边界检查覆盖四难度×四关卡、三种原生密度字段（.3/.5/1）、等距首项、无合法落点、无尽全入口封堵后重试及ambient优先级。仅既有三处新局UUID归一。
- 4项新增回归覆盖同tick结构死亡/新生、体型与飞行变化、出生后阻挡、原未来时刻和随机调用数。逻辑构建170输入、浏览器445输入，源码证明只有两处游戏文件改变；无关economic-egg工作区修改继续排除。
- 查尔seed529，1440×900 DPR1、完整效果，实际启动/绘制。集中出生176只后120步、运输舱落点后120步、两种毒爆场景各900步；共8对完整状态和活动源绘制输出精确，16张截图全图RGB相同，三张联系表已查看，页面/控制台错误0/0，请求取消${baseline.requests.length}/${candidate.requests.length}逐条保留。运输舱仍在下落期，未冒称完成救援。
- S09：普通与三种精英毒爆在空旷接近/贴身/移动目标场景15秒均主动攻击3次，五秒恢复后重攻；12刺蛇混编的固定与正常行动版本均0次，已有目标但接近停滞。查尔浏览器普通毒爆也复现3次对0次。无地面目标不攻击符合现有规则。未直接调用fire、设置起手或清恢复期；目标高生命/停止攻击属于受控夹具。后续应定位队形/避让与接触距离，补敌方及英雄临时毒爆；不能据此声称已证明所有根因或已修复。

## 保留的失败与限制

R1无尽夹具漏startedAt导致NaN与0活敌，整组作废；R2补完整运行态、FlatTerrain和有限数值/精确数量断言。R1/R2“fallback”夹具误用圆形r字段，实际障碍应为矩形w/h，未触发回退；正式R3更正并断言所有出生离开被堵点。这两次仅改验证脚本，游戏与浏览器构建未变。旧报告不改成通过。

旧服务4436重复启动被拒，复用既有服务；baseline-1被沙箱拒绝访问本机HTTP，正式baseline-2/candidate-1经获准访问完成。首次看板更新记录字段不符合生成器格式，已修正该记录并重新生成；原问题记于范围报告。

最终JS ${sha}；预览 preview/performance-s06-20261020-candidate/（4436）。未替换Current、提交/推送或在线发布。五图、画质、模拟与经济、存档延期保持；自然完整战役、物理输入、人类体验和全内容60FPS仍开放。

## 14条审计结论

${Object.entries(decisions).map(([id,text])=>`- **${id}**：${text}`).join('\n')}
`;
await fs.writeFile('docs/project/PERFORMANCE_S06_20261020.md',doc);
await fs.writeFile('docs/project/BANELING_S09_DIAGNOSIS_20261020.md',`# S09 毒爆主动攻击初步核验 · 2026-10-20\n\n用户报告“当前毒爆几乎不会主动攻击”。任务已新增为优先待办，尚未实现修复。\n\n实际生产World.step连续900步：普通及三种精英毒爆在贴身/空旷接近/移动目标场景各主动攻击3次；12刺蛇混编时，无论刺蛇固定还是正常行动射击，毒爆均0次，已选中目标但接近停滞。仅空军目标时不攻击符合原资格。查尔真实浏览器普通毒爆空旷3次/混编0次，旧新S06完全一致。\n\n因此反馈有可重复证据；不能解释为爆炸效果没接线，也不能据此确认全部原因。优先排查EngagementSlots、avoidStationaryBodies、分离移动与0.25近战触发距离之间的接近过程。未直接fire、清恢复期、改变源速度/射程/伤害；目标高血/停止攻击为诊断夹具，非自然通关证据。敌方、英雄临时毒爆、不同密度/地形与具体修复仍待S09。\n\n固定步证据：[第一组](../../reports/local/baneling-s09-20261020/diagnosis-r1.json) · [正常行动混编补测](../../reports/local/baneling-s09-20261020/diagnosis-r2.json)。浏览器和构建绑定见[S06范围报告](../../reports/qa/performance-s06-20261020.json)。\n\n修复验收：正常自主选敌/接近/起手，混编可通过现有合法地面路径接近，保留伤害/范围/五秒恢复、空军排除和敌方/临时体例外；需要玩法取舍时单列决定。不得通过删碰撞或扩大爆炸伤害偷偷改变规则。\n`);
console.log(JSON.stringify({status:report.status,logic:logic.checkpoints,boundaries:boundary.rows.length,pairs:summary.pairs.length,sha}));
