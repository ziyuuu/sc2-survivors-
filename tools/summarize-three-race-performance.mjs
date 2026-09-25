import fs from 'node:fs/promises';
const root='reports/local',before=JSON.parse(await fs.readFile(`${root}/qa-three-race-performance/results.json`,'utf8')),after=JSON.parse(await fs.readFile(`${root}/qa-three-race-performance-optimized/results.json`,'utf8'));
after.method=after.method.replace('preserves their population throughout the sample','reduces early interceptor losses; actual ending counts are reported');after.measurementComplete=after.runs.length===6&&!after.failure;after.performanceAcceptance='not-passed: 300-enemy stress scenes retain positive simulation debt';after.caveats=['Development build with CPU instrumentation and profiling; same-machine final validation may run concurrently. Single sample per race/viewport, not a statistical benchmark.','Health is diagnostically increased to keep 25 ordinary, 3 heroes and 300 enemies present; this is not campaign balance evidence.','Baseline Protoss interceptors could die normally. The optimized Protoss fixture increases shield/air armor to preserve a much heavier child population; these two Protoss datasets are not an exact before/after comparison.','Viewport 390x844 runs on the same desktop AMD machine, not a physical mobile device.','Short heap measurements do not certify absence of long-run leaks.'];await fs.writeFile(`${root}/qa-three-race-performance-optimized/results.json`,JSON.stringify(after,null,2));
const names={terran:'人族',zerg:'虫族',protoss:'神族'},f=n=>n.toFixed(2),table=after.runs.map(r=>`| ${r.width}×${r.height} | ${names[r.race]} | ${f(r.frameMs.mean)} / ${f(r.frameMs.p95)} | ${f(r.stepMs.mean)} / ${f(r.stepMs.p95)} | ${f(r.wallSeconds)} / ${f(r.simSeconds)} | +${f(r.backlogDelta)} | ${f(r.finish.heap.used/1048576)} | ${r.finish.counts.interceptors} |`).join('\n'),comparison=after.runs.filter(r=>r.race!=='protoss').map(r=>{const b=before.runs.find(b=>b.race===r.race&&b.width===r.width);return `| ${r.width} | ${names[r.race]} | ${f(b.stepMs.mean)} → ${f(r.stepMs.mean)} | ${f((1-r.stepMs.mean/b.stepMs.mean)*100)}% | ${f(b.simSeconds)} → ${f(r.simSeconds)} |`;}).join('\n');
const text=`# 三族高压浏览器性能记录

记录日期：${after.at}。**采样完成，性能验收未通过。** 所有场景没有控制台错误，但300敌军场景仍出现模拟积债。不能把脚本退出码0或规则测试通过解释为实时性能达标。

## 方法与范围

- 主机：${after.host.cpu.trim()}，${after.host.logicalCores}逻辑核，${f(after.host.totalRAM/1073741824)}GiB RAM；Chrome ${after.browserVersion}。
- 实际渲染器：${after.runs[0].start.renderer}；native画质、像素比1、抗锯齿开启。不是SwiftShader。
- 每个尺寸的三族均采用种子421；25名普通单位、3名英雄、300名混合敌军；真实原始地图、模型、移动、攻击、伤害和特效。每场2秒预热、12秒墙钟采样。
- 为维持压力，诊断场景提高普通单位、英雄、敌军生命。神族用真实付款补造方法为5航母提供40截击机；优化后场景额外提高护盾/航空护甲，结束时桌面39架、窄屏37架。普通/英雄/敌军结束数量始终25/3/300。
- 390×844在同一台桌面主机运行，不是实体手机或手柄测试。开发构建和CPU计时/采样有额外开销；同机还可能有最终构建和测试负载。每组只有一次短采样，不作统计性能保证或长期内存泄漏结论。

## 优化后实际结果

帧时与step单位毫秒；帧时为rAF间隔，step为World.step包围计时；两列均为平均/P95。墙钟/模拟与积债单位秒。

| 尺寸 | 种族 | 帧时均值/P95 | step均值/P95 | 墙钟/模拟 | 新增积债 | JS堆MiB | 末帧截击机 |
|---|---|---|---|---|---|---|---|
${table}

短样本末端JS堆约${f(Math.min(...after.runs.map(r=>r.finish.heap.used))/1048576)}—${f(Math.max(...after.runs.map(r=>r.finish.heap.used))/1048576)}MiB，包含开发模块和已加载原素材。原始结果同时保留heap起止值、渲染提交耗时、draw calls、三角形数、各方法计时、CDP metrics、CPU采样热点和实际存活数。

## 已修复热点与局限

自动施法的非适用兵种直接返回；虫后、哨兵、高阶圣堂能量不足时，在全军搜索前返回。能量恢复、合法目标、共享预约和扣费行为仍由真实测试验证。已核实武器列表按兵种/模式缓存，避免索敌过程中反复复制bonus/splash数组。

以下为人族/虫族相同诊断配置的观测变化，不能排除同机负载影响：

| 宽度 | 种族 | step平均毫秒：前→后 | 观测减少 | 12秒内模拟秒：前→后 |
|---|---|---|---|---|
${comparison}

神族前后子机存活负载不同，不计算同配置改善百分比。剩余CPU采样热点集中在SpatialHash.query、World.updateUnit、MapTerrain.path/walkLine、接触碰撞和BattleRenderer.render/Three材质提交。当前记录不足以通过高压实时性能要求，未降低兵数或跳过模拟时间来制造通过结果。

## 实际执行与证据

- 'node tools/qa-three-race-performance.mjs'：六基线采样，退出0；原始数据在 'qa-three-race-performance/results.json'。
- '$env:SC2_PERF_OUT='reports/local/qa-three-race-performance-optimized'; node tools/qa-three-race-performance.mjs'：六复测采样，退出0；数据在 'qa-three-race-performance-optimized/results.json'。两个目录均保留每场.cpuprofile。
- 'npm run typecheck'：通过。
- 'node --import tsx --test test/auto-spell-scheduling.test.ts test/expedition-combat.test.ts test/three-race-talents.test.ts'：30/30通过。
- 'node tools/qa-main-hive.mjs'：1440×900和390×844的扇形、胆汁、直线、飞行弹道渲染，控制台0错误；截图及JSON在 'qa-main-hive/'，未上传。
- 'node --import tsx --test test/main-hive.test.ts test/campaign18-world.test.ts test/campaign18.test.ts'：32/32通过。

本地截图只是可复核素材；没有据此声明人工视觉验收。此性能记录也不替代完整18关通关、离线、长期续档或真实设备测试。
`;
await fs.writeFile(`${root}/three-race-performance.md`,text);console.log(text);
