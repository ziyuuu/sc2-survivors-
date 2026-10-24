import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-d04-complete-20261021',qaFile='reports/qa/performance-d04-complete-20261021.json',docFile='docs/project/PERFORMANCE_D04_COMPLETE_20261021.md';
const read=async p=>JSON.parse(await fs.readFile(p)),q=await read(qaFile);assert.equal(q.pass,true);
const review=await read(root+'/visual-review.json');assert.equal(review.reviewedScreens,q.verification.allScreens.length);
const accepted=q.measurements.accepted,sec=v=>(v/1000).toFixed(3),ms=v=>v.toFixed(1),gib=v=>(v/1073741824).toFixed(2);
const rows=accepted.flatMap(r=>r.cycles.map(c=>`| ${r.offline?'离线人族':r.race==='terran'?'Web人族':r.race==='zerg'?'Web虫族蓝装':'Web星灵蓝装'}／${c.cycle?'热':'冷'} | ${sec(c.startupReadyMs)}秒 | ${c.stages.map(s=>s.complete.ready+'/'+s.complete.total).join(' → ')} | 第${c.stages.find(s=>s.complete.complete).stage}关 | ${c.stages.at(-1).models} |`)).join('\n');
const comp=q.measurements.fullWorkloadComparison,cold=accepted[0].cycles[0],warm=accepted[0].cycles[1];
const old=await read(root+'/formal-r5-terran/report.json');
const stageRows=cold.stages.map((s,i)=>{const f=old.cycles[0].stages[i].frames.map(f=>f.interval).filter(Number.isFinite);return `| 第${i+1}关 | ${f.filter(v=>v>250).length} → ${s.interval.over250} | ${f.filter(v=>v>100).length} → ${s.interval.over100} | ${ms(Math.max(...f))} → ${ms(s.interval.max)} | ${ms(f.reduce((a,b)=>a+b,0)/f.length)} → ${ms(s.interval.mean)} |`;}).join('\n');
const terminal=accepted.flatMap(r=>r.cycles.flatMap(c=>c.stages.filter(s=>s.discarded).map(s=>`${r.offline?'离线人族':r.race==='protoss'?'星灵蓝装':r.race==='zerg'?'虫族蓝装':'人族'}第${s.stage}关约${s.discarded.toFixed(4)}`)));
const text=`# D04 原开局批次分阶段预热补完 · 2026-10-21

原开局批次的模型、动作和GPU预热已补齐；本机已测三族均在前三关内完成，未用到第4–6关延续窗口。严重长帧有所减少，仍未达到无新增卡顿。D04本地完成；看板46/52、剩余6项，下一项V01尚未启动，D05／D06暂缓。[正式证据](../../reports/qa/performance-d04-complete-20261021.json)。

## 本次范围与实现

用户明确要求完成“原开局加载的那批”，并授权尽量均匀分散到前三关，必要时延续到第4–6关。这里按所选种族、实际装备可能产生的单位和原固定敌人确定范围，包含原生／死亡／变形、四份无尽建筑模板与无尽平地图；不是整个游戏全部内容。当前战役地图仍完整。此前D04的“未来仅备文件、无尽到入口才完整准备”是历史阶段，本补充已覆盖该不足；旧报告和失败原样保留。

后台使用每显示帧约3ms、慢帧约1.5ms的软CPU预算，持续移动时也推进，并在关间继续。按后续敌人和本族原族谱排序，第3关开始已确定的实际Boss奖励仍优先；不提前制造实体或消耗主模拟随机流。模型和建筑在独立场景准备，完整后一次发布。必需入口继续串行排空，取消与重试保持隔离；图形恢复后按新上下文重新预热。同步解析和驱动调用不能被抢占，所以这不是1.5／3ms硬上限，也没有宣称所有设备都能在第三关内完成。

本次发现颜色材质的差异使完全相同的深度程序重复编译，现按生成的深度源码逐字复用，各材质仍持有独立参数。原颜色、透明裁剪、纹理、几何、动作和画质不变。475份材质×8种布局共3,800组实际Three深度源码检查通过，测试键由2,384种颜色关联键变为88种精确深度键；这不是运行时显卡程序数量或显存节省的测量。

## 前三关与开局测量

同机Chrome／AMD Radeon D3D11、1440×900、DPR1、原生分辨率／完整效果／完整动作；简单查尔seed529、正常1倍速。控制器调用原移动、生产和关间操作，不锁血、不秒杀、不改战斗时钟；不是人类或物理输入验收。人族为空账户；虫族和星灵补测用合法蓝装初始账户，装备在开局前设置，单列于裸装失败。冷指新浏览器测试目录，不表示系统缓存清空。所有正式测量串行，无其他测试浏览器并发。

| 轮次 | 点击开始至可进入 | 各关末完成项 | 首个全部就绪关末 | 最终模型变体 |
| --- | ---: | --- | --- | ---: |
${rows}

完成项按模型家族加四个建筑模板和一张地图计数，模型变体另含原生／死亡／变形，不把两种计数混用。人族原开局104个模型键与最终名单逐个精确相同；三族原族谱和全部所选英雄的资源范围另有回归。五轮共15个完整关卡逐帧素材等待和跳绘均为0，战斗帧新增积压丢弃为0。${terminal.length?'关卡结束尾部仍保留：'+terminal.join('；')+'秒。':'连同关卡结束尾部，新增丢弃也均为0。'}实际奖励均在第3关Boss出现前准备好。开局时长是这次观测，不能与不同工作量的旧D04直接当作稳定收益对照。

裸装虫族在time=156.1333秒、星灵在time=168.7秒第三关战败，两轮都已在第二关完成预热，素材等待／跳绘为0；完整三关断言失败原样保留。星灵失败尾部有1/60秒积压丢弃，不归并为“所有轮次零丢弃”。蓝装补测不替代这两条战败证据，也不代表平衡或通关率完成。

## 长帧变化与残留

对照使用本次已经完成整批工作的R5和最终R7各一轮人族冷启动，前三关均为原生完整60秒。R5与R7工作范围相同；R23仅备未来文件的旧工作量不用于这张收益表。24组初末及每600tick战局快照精确相同，仅按记录排除notice字段并归一新局身份。

| 区间 | >250ms帧 | >100ms帧 | 最大帧间隔ms | 平均帧间隔ms |
| --- | ---: | ---: | ---: | ---: |
${stageRows}
| 三关合计 | ${comp.before.over250} → ${comp.after.over250} | ${comp.before.over100} → ${comp.after.over100} | ${ms(comp.before.max)} → ${ms(comp.after.max)} | ${ms(comp.before.mean)} → ${ms(comp.after.mean)} |

超过250ms的帧减少${(comp.over250Reduction*100).toFixed(1)}%，但第一关最大值反而由478.3升到512.4ms，第二关均值略慢。热轮三关仍有${warm.summary.over100}帧超过100ms、${warm.summary.over250}帧超过250ms，最大${ms(warm.summary.max)}ms。只有一组串行前后对照，没有重复独立试验的稳定性结论，帧间隔也不是单独GPU耗时。V01继续保留这些长帧；不宣称无卡顿或全内容60FPS。

## 正确性、画面与构建

- 最终1,803项完整回归全过，新增10项；18项定向检查、类型和数据检查通过。727个原src/test中720个未改，修改6个生产文件及1个旧测试，新增2个测试文件。421个生产编译输入中415个与原D04冻结输入精确相同，economic-egg其他工作流继续排除。
- 最终功能25条、16图：完整批次独立预热不改变冻结战局，三档／三尺寸、原生战役转无尽、18英雄资源准备、三族精英身体和幻影，以及实际WebGL epoch 0→1恢复和建筑／地图再次预热均通过。功能轮与回归并行，不用于性能计时。
- R4／R7的16组画面对照中12组全图RGB精确；其余包括异步界面图标／文字、390宽士兵栏按钮截取时机差异，虫族战斗中部另有3像素、最大1色阶差异。未写成全图无差异；原390宽标签边缘限制仍保留，镜头与布局未在本批修改。
- ${review.reviewedScreens}张本批原始图已查看，包含先导失败、战败和最终结果。正式及补测页面／控制台错误0；裸装战败是运行结果，不是页面错误。离线HTTP请求0。
- 1,817份共享资源共878,440,787字节已逐SHA读回，137份旧D04证据／输出及Current保护项通过。旧证据中已授权修改的实时源码、测试和生成看板明确排除，原冻结输入仍保留。

最终诊断预览：preview/performance-d04-complete-20261021/；主JS SHA-256：${q.build.main.sha256}。离线输出SHA：${q.offline.html.sha256}；它已核验并归档，按下文命令还原。所有模型／纹理来源共用原文件，不复制整套素材。

## 失败保留与空间管理

R2／R3曾在另一份玩法测试浏览器运行、可用内存约1.4GiB时测量，秒级长帧和未按时完成原样保存，不纳入正式性能对照。等另一任务结束后才测正式样本。R6延后首次编译查询200ms，首关完成量反而28→25、最大帧仍约517ms，方案全部撤回。R1类型错误、最早环回网络权限失败、重复构建目录拒绝、保护核验初版把已授权变化的实时文件／生成看板当作冻结项而失败的记录保留，核验范围修正后全量重读通过。未恢复此前已撤回的纹理解码替代方案。

本批${q.cleanup.profiles.length}份已关闭测试浏览器缓存逐次清理，逻辑大小合计${gib(q.cleanup.profileLogicalBytes)}GiB；另清理两份本次回归数据库共81,363,754字节。它们是本批产生和清理的逻辑字节，不是磁盘净空闲增量，不重复计入前两次清理。截图、原始日志、测量、输入和失败均保留。

只生成一份最终离线候选。实际文件和重组流SHA均验证后移除${q.offline.html.bytes}字节整包，保留压缩前后缀与原载荷供体，恢复命令：

\`node tools/restore-performance-d04-complete-offline.mjs restore r7\`

供体dist/SC2-Survivors-Loot-Elites-R2-20261019.html必须保留。每轮中间JS仅压缩保存，Web候选共用一个目录。没有新增游戏磁盘预算／自动驱逐，也没有长期无泄漏结论。

300／4∶4∶1、五图、默认完整效果、三档选择、经济和存档延期保持。独立趣味分支未混入。未替换Current、提交、推送或发布；V01–V04及整体MVP仍开放。
`;
await fs.writeFile(docFile,text);
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,105);assert.equal(board.next,'D04');
const summary='D04原开局批次模型/GPU预热补完：按所选族谱/装备与原敌人逐步完成，实际Boss优先；本机人族冷/热、虫族/星灵蓝装及离线五轮15关均前三关内就绪，素材等待/跳绘0。人族104模型键与原开局精确，24状态对照、1803回归、25功能记录和实际WebGL恢复通过。整批同工作量冷轮>250ms帧65→7；首关512.4ms、热轮592.2ms及裸装两族第三关战败保留，V01未关闭。共享资源/原证据校验和本批缓存/离线差异归档完成，未替换Current/发布。';
const evidence=['PERFORMANCE_D04_COMPLETE_20261021.md','../../reports/qa/performance-d04-complete-20261021.json'];
const d04=board.tasks.find(t=>t.id==='D04');d04.status='已完成';d04.updated='2026-10-21';d04.result=summary;d04.steps.push('按追加授权补齐原开局批次模型/GPU预热，优先前三关，必要时4–6关；核验完整名单、模型变体与长帧残留');d04.acceptance.push('原开局批次在已测前三关完整准备，模型和GPU就绪可追溯；失败及跨设备期限限制明确');d04.evidence.push(...evidence);
const v01=board.tasks.find(t=>t.id==='V01');v01.evidence.push(...evidence);v01.result+=' D04补充已将整批同工作量冷轮>250ms帧65→7，但512.4／592.2ms峰值及前三关剩余长帧仍开放；三族按时就绪不等于无卡顿通过。';v01.steps.push('在最终统一构建继续核验D04整批模型/GPU后台准备的长帧；保留裸装两族战败与蓝装补测的范围差异');
const audit=board.auditRows.find(r=>r.id==='L03');audit.currentReview='【部分解决】2026-10-21 D04补充把原开局族谱/装备/固定敌人、建筑和无尽地图模型/GPU预热分散完成；五轮15关在前三关内就绪、无素材等待/跳绘，人族104原模型键精确。整批同工作量>250ms帧65→7，但0.5秒左右峰值仍在，无新增卡顿未通过，后续V01复核。';audit.reviewEvidence.push(docFile,qaFile);
board.revision=106;board.next='V01';board.updated='2026-10-21';board.updates.push({date:'2026-10-21',tasks:['D04','V01'],change:summary,evidence});assert.equal(board.tasks.filter(t=>t.status==='已完成').length,46);assert.equal(board.tasks.length,52);
await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');await fs.writeFile(root+'/board-after.json',JSON.stringify(board,null,2)+'\n');
const header=`## D04原开局批次预热补完 · 2026-10-21\n\n- 用户授权补齐原开局批次模型／GPU准备，优先前三关，必要时4–6关。6生产文件完成；记录docs/project/PERFORMANCE_D04_COMPLETE_20261021.md，证据reports/qa/performance-d04-complete-20261021.json。52项完成46、剩余6，下一项V01未启动，D05/D06暂缓。\n- 本机人族冷／热、虫族／星灵蓝装及离线五轮15关均前三关内全部就绪，素材等待／跳绘0；完整104人族模型键与原开局精确。裸装虫族156.1333秒、星灵168.7秒第三关战败保留，两轮此前已完成预热；星灵结束尾部1/60秒丢弃单列。\n- 软CPU分片与逐字相同深度程序复用，原画质／材质／动作保持；整批同工作量冷轮>250ms帧65→7，仍有首关512.4ms、热轮592.2ms峰值，非无卡顿或全内容60FPS。并发先导与R6无收益撤回保留，V01开放。\n- 1803完整回归、类型／数据、24状态对照、25功能记录及实际WebGL恢复通过；${review.reviewedScreens}图已查看。16画面对照12全图RGB精确，剩余界面／3像素微差保留。727既有文件720未改，421生产输入415冻结精确，economic-egg及趣味他线排除。\n- 1817资源／137旧证据与Current保护项SHA核验；${q.cleanup.profiles.length}份本批浏览器缓存约${gib(q.cleanup.profileLogicalBytes)}GiB逻辑大小及两份回归数据库已清理，不重复计入旧清理。离线只留差异＋共享载荷重组；JS ${q.build.main.sha256}，预览preview/performance-d04-complete-20261021/。未替换Current、提交／推送／发布；五图、300／4∶4∶1、三档、经济、存档延期及MVP边界保持。\n\n`;
await fs.writeFile('AGENTS.md',header+await fs.readFile('AGENTS.md','utf8'));
for(const [file,prefix]of [['docs/project/README.md',''],['docs/DOCUMENT_INDEX.md','project/'],['docs/README.md','project/'],['README.md','docs/project/']]){const old=await fs.readFile(file,'utf8'),at=old.indexOf('\n');const line=`\n\n2026-10-21 [D04原开局批次预热补完](${prefix}PERFORMANCE_D04_COMPLETE_20261021.md)：已测三族在前三关完成模型／GPU准备，严重长帧65→7但峰值仍在；缓存即时清理，52项完成46、下一项V01。此前“批次尚未完整”的记录保留其历史含义。`;await fs.writeFile(file,old.slice(0,at)+line+old.slice(at));}
q.verification.visualReview=root+'/visual-review.json';q.evidence=[];
q.openFindings[1]='Naked Zerg died in stage three at 156.1333s and Protoss at 168.7s after both completed their batches in stage two. Protoss loss tail discarded 1/60 second. Separate blue-equipment completions do not replace these failures.';
q.preservedFailures=['R1 build type error and repeated R5 build EEXIST guard; no successful result is claimed for those commands.','Pilot R2 local-network sandbox rejection; subsequent approved browser runs succeeded.','R2/R3 concurrent-browser low-memory runs did not meet the full-batch deadline and are excluded from performance comparisons, including the old R2 runner PASS flag that lacked a complete-batch assertion.','R6 delayed shader poll gave less work with similar peak delay; reverted completely.','Naked Zerg and Protoss third-stage losses retained separately from blue-equipment passes.','Three protection-verifier scope failures retained; approved live source/test and generated board changes explicitly excluded, all remaining bindings reread and verified.'];
for(const r of q.preservedRuns)r.scope=(await read(root+'/'+r.run+'/report.json')).scope;
for(const file of [docFile,root+'/board-after.json',root+'/verification.json',root+'/asset-protection-verification.json',root+'/measurements.json',root+'/visual-review.json',root+'/functional-r7/visual-comparison.json',root+'/regression-r7.log',root+'/targeted-r7.log',root+'/typecheck-r7.log',root+'/docs-check-r7.log',root+'/offline-r7/build-inputs.json',root+'/offline-r7/cleanup.json',...q.preservedRuns.map(r=>root+'/'+r.run+'/report.json')]){const b=await fs.readFile(file);q.evidence.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex')});}
await fs.writeFile(qaFile,JSON.stringify(q,null,2)+'\n');console.log(JSON.stringify({pass:true,doc:docFile,revision:board.revision,next:board.next,completed:46}));
