import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root='reports/local/performance-b02-20261019';
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const summary=await read(root+'/summary.json'),verification=await read(root+'/verification.json'),findings=await read(root+'/lifecycle-findings.json'),visual=await read(root+'/visual-review/manifest.json'),binding=await read(root+'/source-binding.json');
const names=['normal-terran-1','normal-zerg-1','normal-protoss-1','synthetic-2'];
const results=names.map(n=>summary.results.find(r=>r.run===n));
const raws=await Promise.all(names.map(n=>read(`${root}/${n}/report.json`)));
if(!verification.passed||results.some(r=>!r))throw Error('Missing verified records');
const num=(v,n=2)=>Number.isFinite(v)?v.toFixed(n):'—';
const table=(headers,rows)=>['| '+headers.join(' | ')+' |','| '+headers.map(()=>'---').join(' | ')+' |',...rows.map(r=>'| '+r.join(' | ')+' |')].join('\n');
const normalized=results.flatMap(r=>r.rows.map(s=>({run:r.run,...s,stableCombatEligible:!(r.run==='normal-zerg-1'&&s.label==='stage-3-sustain'),scope:s.live?'实时窗口':'冻结渲染窗口'})));
const evidence=[];
async function bind(file){const b=await fs.readFile(file);evidence.push({file:file.replaceAll('\\','/'),bytes:b.length,sha256:hash(b)});}
for(const n of names){for(const file of await fs.readdir(`${root}/${n}`)){if(file==='report.json'||file==='requested-assets.json'||file==='runner.mts'||file.endsWith('.state.json')||file.endsWith('.png'))await bind(`${root}/${n}/${file}`);}}
for(const file of ['verification.json','summary.json','source-binding.json','lifecycle-findings.json','visual-review/manifest.json'])await bind(root+'/'+file);
for(const file of visual.sheets)await bind(file);
for(const file of ['tools/build-performance-b02.mjs','tools/performance-b02-runtime.ts','tools/performance-b02-scenes.ts','tools/qa-performance-b02.mts','tools/summarize-performance-b02.mjs','tools/verify-performance-b02.mjs','tools/review-performance-b02.py'])await bind(file);
const report={schemaVersion:1,date:'2026-10-19',task:'B02',status:'已完成',scope:'SC01–SC04 代表场景测量完成；非优化、自然通关、全内容60FPS或MVP验收。',baselineCommit:binding.buildCommit,sourceBinding:binding,checks:{passed:verification.passed,count:verification.checks.length,items:verification.checks.map(c=>({name:c.name,passed:c.passed})),raw:root+'/verification.json'},counts:{formalRuns:4,windows:normalized.length,checkpoints:raws.reduce((n,r)=>n+r.checkpoints.length,0),formalScreens:visual.screens.filter(p=>!p.includes('synthetic-1')).length,pilotScreens:visual.screens.filter(p=>p.includes('synthetic-1')).length,visuallyReviewedSheets:visual.sheets.length},device:raws[3].device,host:raws[3].host,assets:verification.assets,finalBuild:verification.build,runs:results.map((r,i)=>({run:r.run,rawPassed:r.passed,failure:r.failure??null,classification:r.run==='normal-zerg-1'?'已记录自然规则控制器第三关失败':'采集完成',method:raws[i].method,profile:raws[i].profile,build:r.build,errors:r.errors,requestFailures:r.requestFailures,input:r.input,samples:r.rows.length,checkpoints:r.points.length,raw:`${root}/${r.run}/report.json`})),normalOutcomes:verification.normalOutcomes,dense:verification.dense,findings,metrics:normalized,evidence,limits:['每种族一个种子和路线；非人类成功率或连续实时全程。','低探针与详细探针窗口顺序采集，状态不同，不可由差值推断探针开销或优化收益。','CPU嵌套跨度与GPU不可相加；上传仅记录bufferSubData和浮点texSubImage2D子集。','每次诊断冻结显式重置积压；实时窗口丢弃量与冻结后重置量分开。','虫族第三关持续窗口含失败界面，排除稳定战斗FPS结论。','结束场景保留友军和掉落，不是实体空场；驻停治疗者旧目标作为F04候选。','原图、旧构建、先导失败全部保留；当前工作区其他任务的economic-egg修改未编入。'],next:'B03',gameChanges:false,commitPush:false,currentReplaced:false};
await fs.writeFile('reports/qa/performance-b02-20261019.json',JSON.stringify(report,null,2)+'\n');
const low=normalized.filter(r=>r.live&&!r.detail),syn=results[3];
const detail=syn.rows.filter(r=>r.label.endsWith('-sustain'));
const lines=[
'# B02 战斗与特效代表场景基线 · 2026-10-19','',
'B02 已完成：SC01–SC04 的三族普通前三关路线，以及九类合成战斗／特效场景已录制。共 100 个正式采样窗口、86 个状态点、46 张正式截图；另保留 2 张先导截图。58 项证据与覆盖检查通过，12 张联系表所含 48 张截图均已查看。这里只完成基线，不代表游戏无缺陷、通关或达到 60 FPS。','',
'[性能看板](PERFORMANCE_BOARD.html) · [机器可读报告](../../reports/qa/performance-b02-20261019.json) · [原始摘要](../../reports/local/performance-b02-20261019/summary.json) · [核验记录](../../reports/local/performance-b02-20261019/verification.json)','',
'## 构建与测量口径','',
`冻结 main ${binding.buildCommit}。403 个 src 输入与 B01 换行归一后相同，新增真实入口 src/app/start-game.ts；共 404 个 src、434 个编译输入。生成资源清单与 B01 相同。工作区同时出现的 economic-egg.ts 修改属于其他任务，已通过冻结源码构建排除，本轮未改游戏 src/test。`,
'普通流程使用原生菜单、新局、空账户、普通难度、真实付费生产和公开操作控制器，无赠装或锁血。固定查尔 map recipe v3 / seed529，三族各一条路线。测量外用原生 World.step 固定步准备并定期渲染；测量窗口使用实时驱动。这不是全程不间断实时游玩。原始 quiet 标签实际表示关初冻结渲染，后续关还可能保留敌人，不应读作自然实时空闲。',
'设备 Ryzen 7 5800U／AMD Radeon（ANGLE D3D11），Windows 10.0.26300、Chrome 155，1440×900、DPR1；native 分辨率、普通／英雄完整特效、完整动画。浏览器键盘 Escape 暂停与继续已记录，自动操作往返时间不是物理输入延迟。',
'低探针窗口约 4 秒；详细窗口另采 CPU、GPU、P50/P95/P99、绘制和上传。两类窗口顺序执行，状态持续推进，不构成相同状态的开销对照。CPU 为嵌套累计跨度，GPU 独立计时，不能相加；尚未完成的 GPU 查询尾部不进入均值，已回收查询 disjoint=0。上传只覆盖 bufferSubData 与浮点 texSubImage2D 子集，不是全部显存带宽。',
'模拟积压记录在停止实时窗口、进入诊断冻结之前。合成实时采样窗口丢弃增量为 0；随后冻结会显式重置积压，afterFreeze 保留该值。普通阶段转换亦有重置记录，不能宣称整次运行零丢弃。合成冻结窗口的完整状态逐一精确不变。',
`实际资源记录合并为 ${verification.assets.count} 个文件、${verification.assets.bytes} 字节，已逐文件重新核对哈希。人族／虫族／星灵／合成请求清单分别 653／549／604／675；合成复用已关闭人族测试的缓存，其资源归属包含人族清单，不能只将本轮675条请求视为全部已用资源。`,
'',table(['最终文件','SHA-256'],verification.build.map(b=>[b.file,'`'+b.sha256+'`'])),'',
'普通样本使用 build-1；合成先导使用 build-2；正式合成使用 build-3（当前预览）。各构建原始 JS/CSS/HTML 和编译输入均归档；报告按实际构建绑定，不把早期数据改标成最终构建。','',
'## 普通前三关结果','',
'人族和星灵推进至第三关结算（180 秒模拟时间）；虫族完成前两关，在第三关 36.033 秒失败，总计 156.033 秒。虫族原始 passed=false 和异常不改写。其第三关低探针交火窗口有效；随后 stage-3-sustain 详细窗口仅约 1.017 秒战斗，余下为失败界面，从稳定战斗统计中排除。一个控制器路线不足以推断难度或人类通关率，也不覆盖历史不同地图／构建的结果。','',
table(['运行／窗口','低探针 FPS','帧 P50/P95/P99 ms','模拟／墙钟 s','结束积压 s'],low.filter(r=>r.run!=='synthetic-2').map(r=>[r.run+'/'+r.label,num(r.fps),[r.p50,r.p95,r.p99].map(v=>num(v)).join('/'),num(r.simulationSeconds,3)+' / '+num(r.wallSeconds,3),num(r.backlog,4)])),
'','## 合成代表场景','',
'近战／远程均取原生波次混合生成器的 300 个敌人，主力／30%弱兵／50%弱兵为 133／133／34，保持累计4∶4∶1投放规则。准备阶段锁定友军生存、提高敌人生命以维持密度，开始和持续均为300；不改正式上限、伤害、步长或配比。与 B01 的队伍、摆放及密度构造不同，不作优化前后比较。',
'治疗场景含医疗运输机、科学球、虫后及伤兵；灵能场景包含守护者护盾、灵能风暴、护盾波纹、巨像／虚空辉光舰光束。随机精英、蟑螂 Boss 和最终主巢分别取原生阶段／技能状态。主巢从时间44秒、已过事件游标5开始，保留45秒胆汁和后续扇形攻击。航母两场保留真实机库、截击机，并区分属性装备和触发型装备，后者包含投影与灼烧区域。完整构造见 tools/performance-b02-scenes.ts 和各 begin.state.json。','',
table(['场景','低探针 FPS','帧 P50/P95/P99 ms','模拟／墙钟 s','结束积压 s'],low.filter(r=>r.run==='synthetic-2').map(r=>[r.label.replace('-sustain-low',''),num(r.fps),[r.p50,r.p95,r.p99].map(v=>num(v)).join('/'),num(r.simulationSeconds,3)+' / '+num(r.wallSeconds,3),num(r.backlog,4)])),
'','下表来自随后独立的详细持续窗口；不得把它与上表拼成同一状态或精确探针开销。','',
table(['场景','绘制 CPU ms/帧','GPU ms/查询','源特效 CPU ms/帧','模拟驱动 CPU ms/帧'],detail.map(r=>[r.label.replace('-sustain',''),num(r.renderCpuMean),num(r.gpuMean),num((r.cpu['render.sourceEffects']?.totalMs??0)/r.frames),num((r.cpu['simulation.advance']?.totalMs??0)/r.frames)])),
'','远程300敌人与触发装备样本的源特效 CPU 分别约36.99和34.58ms/帧，支持后续 X01–X04 继续细分；不能把全部耗时归因于单个缓存或空层。近战GPU也有压力，仍需按R类任务拆分。结束冻结窗口仍有约71–97MiB/3秒的 bufferSubData，约0.56–0.59MiB/帧，源请求归零的样本也有上传；这里只确认上传事实，不提前断言全部为空批次或可删除。','',
'## 生命周期与新发现','',
'治疗量在持续及重复阶段真实增长；满血停疗20秒后、治疗源死亡再等待后，活动源请求为0。护盾／风暴／光束各有实际渲染记录，灵能结束后请求为0。精英／Boss技能序号正增长；主巢结束后技能预告与弹道为空。航母真实截击机持续存在，战后由自然收益完成机库付费生产而新增截击机属于原生逻辑，不能当作泄漏。',
'**新增 F05（待办）：到期投影反复重置死亡时间，无法正常回收。** 在77.2秒仍保留20个hp=0投影，到期时间为30.15–60.7167秒，但deadAt全部变为77.2。src/simulation/starship/projections.ts 的 retireEquipmentProjection 每次到期处理都写 deadAt=w.time，随后每步再次调用；World回收要求 time-deadAt>1.5，条件持续不能成立。此路径直接写hp/deadAt，与诊断伤害锁无关。证据见 lifecycle-findings.json 与 carrier-equipment-ended.state.json；本轮只记录，尚未修复、未测修复收益。',
'**F04 保留候选：驻停后的旧治疗目标。** 近战／远程／属性航母结束时用 stoppedUntil 将活友军驻停，单位提前返回后旧 healTarget 仍在，造成20或40段治疗条带。该夹具不是正常满血停疗，需后续以原生短停／眩晕路径复核；不能据此宣布所有治疗停止均失败。结束场景还保留友军与掉落，并非所有实体为空。源死亡瞬间允许合法结束动画，不能从该截图断言F01光束残留。',
'','## 失败、图像与边界','',
'初次构建误用 git show 读取被忽略的生成资源清单失败，随后按已跟踪输入处理并核对与B01哈希。synthetic-1 先导发现原生 start 已排队的生产任务尚未清理；检查又发现主巢事件游标会重放过去技能。先导只执行到近战场景，未把未运行主巢写成实际失败。停止本任务专属浏览器后保留原始异常、5个窗口、4状态点、2截图；修正诊断夹具后生成build-3重新采集九场，不进入正式统计。',
'四个正式运行页面／控制台／HTTP错误均为0；请求取消分别为人族4、虫族3、星灵6、合成7，原样保留，未包装为零失败。模型错误为0。12联系表覆盖46正式和2先导截图，地图／模型／HUD呈现正常，无错误页；查尔偏暗与密集遮挡属于既有边界。没有进行全像素差异或人类视觉验收。',
'未重跑整个游戏回归套件：本轮只增加隔离诊断与文档，没有修改游戏逻辑。58项是本轮采样证据／覆盖检查，不是性能或产品验收通过数。保留三族失败事实、普通60FPS目标、自然全战役、物理输入、长局、五图冻结、存档延期及整体MVP边界。未替换Current，未提交／推送／发布。下一项B03尚未开始。','',
'## 复跑与原始证据','',
'先使用 node tools/build-performance-b02.mjs 构建固定版本并通过现有本地预览服务提供 preview/；服务端口4436。使用 npx tsx tools/qa-performance-b02.mts，SC2_B02_MODE 指定 normal-terran／normal-zerg／normal-protoss／synthetic，SC2_B02_RUN 必须使用新的目录名以保留旧证据。合成可用 SC2_B02_CASES 指定场景；默认新缓存，复用缓存须设置 SC2_B02_PROFILE 并绑定其来源。只串行运行GPU测量。',
'每次报告保留实际runner、build清单、请求资源、完整状态及截图；summary.json 包含先导，正式集合只能使用 normal-terran-1、normal-zerg-1、normal-protoss-1、synthetic-2。重新采集后应相应更新汇总脚本选择，禁止覆盖旧运行或套用旧哈希。','',
'## 全部正式窗口','',
'冻结窗口是渲染基线，实时窗口才包含模拟推进；虫族 stage-3-sustain 标为混合失败界面。完整CPU调用、上传、模型峰值及资源内存见机器报告和原始记录。','',
table(['运行／标签','模式','FPS','P50/P95/P99 ms','CPU/GPU ms','模拟／墙钟 s','积压／丢弃增量 s'],normalized.map(r=>[r.run+'/'+r.label,(r.live?'实时':'冻结')+(r.detail?'详细':'低探针')+(r.stableCombatEligible?'':'（混合失败界面）'),num(r.fps),[r.p50,r.p95,r.p99].map(v=>num(v)).join('/'),num(r.renderCpuMean)+' / '+num(r.gpuMean),num(r.simulationSeconds,3)+' / '+num(r.wallSeconds,3),num(r.backlog,4)+' / '+num(r.discardedDelta,4)])),''
];
await fs.writeFile('docs/project/PERFORMANCE_B02_SCENES_20261019.md',lines.filter(x=>x!=='').join('\n\n')+'\n');
console.log(JSON.stringify({report:'reports/qa/performance-b02-20261019.json',counts:report.counts,checks:report.checks.count,evidence:report.evidence.length}));
