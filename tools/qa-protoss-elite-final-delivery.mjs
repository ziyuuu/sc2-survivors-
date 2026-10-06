import fs from 'node:fs/promises';import assert from 'node:assert/strict';import crypto from 'node:crypto';
const root='reports/local/protoss-elites-auras-20261005',read=async p=>JSON.parse(await fs.readFile(root+'/'+p,'utf8'));
const preservation=await read('preservation.json'),demo=await read('demo/browser.json'),production=await read('production/report.json'),offline=await read('production-offline/report.json'),aura=await read('zerg-aura-production/report.json'),strength=await read('strength.json');
for(const r of [demo,production,offline,aura]){assert.ok(!r.failure,r.failure);assert.deepEqual(r.errors,[]);}
assert.equal(demo.cases.length,90);assert.equal(demo.saves.length,30);assert.equal(demo.visuals.length,17);assert.equal(demo.boundaries.length,5);assert.equal(demo.layouts.length,15);assert.deepEqual(demo.remote,[]);
for(const [r,n]of [[production,5],[offline,1],[aura,2]]){assert.equal(r.checks.length,n);assert.equal(r.appBuildId,preservation.web.appBuildId);assert.ok(r.checks.every(c=>c.schema===23&&c.saveRestored&&c.mechanismsPreserved&&!c.debugApi));}
const heroes=new Set([...production.checks,...offline.checks,...aura.checks].flatMap(c=>c.heroAura.map(h=>h.id)));assert.equal(heroes.size,12);
assert.ok(strength.comparisons.every(r=>r.ratio>=1.25));assert.ok(strength.durability.every(r=>r.ratio>=1.25));assert.ok(strength.healing.ratio>=1.25);assert.ok(strength.bosses.every(b=>b.id==='zeratul'?b.remaining===0:b.fraction>=.5));
const tests=await fs.readFile(root+'/tests-final-r2.log','utf8');assert.match(tests,/tests 1161/);assert.match(tests,/pass 1161/);assert.match(tests,/fail 0/);assert.equal((await fs.readFile(root+'/typecheck-final.log','utf8')).trim(),'');
const addedSource=[];for(const path of ['src/data/protoss-elites.ts','src/data/team-auras.ts','src/simulation/combat/protoss-elite-runtime.ts','src/simulation/combat/team-auras.ts','src/render/effects/protoss-elite-effects.ts']){const raw=await fs.readFile(path);addedSource.push({path,bytes:raw.length,sha256:crypto.createHash('sha256').update(raw).digest('hex')});}
const report={scope:'Formal implementation of the approved sixteen elite/twelve hero team aura profiles and all thirty Protoss elites. Shared production World/BattleRenderer, no runtime proposal import.',schema:23,profile:5,preservation,addedSource,validation:{regressions:1161,typecheck:true,demo:{cases:90,saves:30,visuals:17,boundaries:5,layouts:15,errors:[],remote:[]},production:{webGroups:5,offlineGroups:1,zergAuraGroups:2,heroes:[...heroes],saveRestored:true,mechanismsPreserved:true,debugApi:false}},strength,open:['Human visual acceptance of the new Protoss elites','Full natural M6/M7','Physical devices and long-term performance','Three original Science Vessel death-source clips'],noCleanupUploadPushDeploy:true};
await fs.writeFile(root+'/delivery.json',JSON.stringify(report,null,2));
const outputRows=preservation.outputs.map(r=>`| \`${r.path}\` | ${r.bytes} | \`${r.sha256}\` |`).join('\n'),powerRows=strength.comparisons.map(r=>`| ${r.id} | ${r.heroI.toFixed(3)} | ${r.eliteV.toFixed(3)} | ${r.ratio.toFixed(4)} |`).join('\n');
const document=`# P4-C · 神族精英与两族光环实际验证 · 2026-10-05

用户授权按前轮数值正式落地已完成英雄/精英光环，并制作神族30精英。契约为 [接入说明](NEXT_ITERATION_P4C_PROTOSS_ELITES_AND_AURAS_20261005.md)，批准光环参数快照与原P4快照不变；准确散列、原始日志、正常界面存档和截图均位于 reports/local/protoss-elites-auras-20261005/，汇总为 delivery.json。

## 最终本地文件

| 文件 | 字节 | SHA-256 |
| --- | ---: | --- |
${outputRows}

独立演示内嵌156个原资源，完整离线游戏内嵌575个原资源。Web appBuildId为 \`${preservation.web.appBuildId}\`。run schema23 / profile v5；无运行时文档JSON导入、无开发者旧存档分支或正式页面战斗写调试接口。

保留检查实际逐字节散列了20个历史HTML、两份批准参数快照，以及全部575资源记录对应的557实体文件、601352859字节。资源release仍为 \`${preservation.resources.release}\`，新增资源字节0。批次前212个源码中190个不变、22个共享接入文件修改；21个受保护的英雄本体/原专用表现/人族和虫族数值文件全部一致。详细路径与前后散列见 preservation.json。已确认的神族英雄剑光/舰群聚能和人族填满扇形仍在原专用表现代码中。

## 规则与强度检查

最终 tests-final-r2.log 为 **1161/1161通过**，失败/跳过0；typecheck-final.log为空、类型检查成功。新增 test/p4-protoss-elites.test.ts 与 test/team-aura-rebalance.test.ts 覆盖全部30身份五级数据/保存和主要真实机制、12英雄/16精英团队规则、资格、Boss区别、源死亡、光环伤势比例、实际子机继承、有限护障、有效输血与瘟疫时钟。

重点边界包括：真实回响冻结落点，闪现成功/失败，墙后的贯穿，两个实际抬升目标及返回平面，有限能量消耗、风暴总额，四活跃重子机和已付费备机，原生对甲加成与新倍率去重，以及新光环对原武器附伤只应用一次。旧测试仅更新被新批准机制/光环/ schema23取代的期待；原人族金额、已付费事务、检测和资源回归继续。

strength.json 使用排除光环/卡牌/天赋后的实际V精英统计、批准条件周期预算及实际子机，比较空光环注册表下60秒真实英雄模拟；没有任意添加敌人数量来制造输出。结果：

| 英雄I | 实际输出/秒 | 对应V精英条件上界 | 比值 |
| --- | ---: | ---: | ---: |
${powerRows}

阿塔尼斯七体实际恢复I为${strength.healing.heroI}，对应V精英固定七体恢复上界为${strength.healing.eliteV}，比值${strength.healing.ratio.toFixed(4)}；六英雄生命+原生盾比值最小${Math.min(...strength.durability.map(r=>r.ratio)).toFixed(4)}。沃拉尊仍按原控制角色预算，未改技能值。原虫/人族英雄本体和技能数值文件相同，本次不把新光环加成混入裸英雄标准。

真实Easy stage12 9000生命与endless3 23520生命Boss由正式工厂创建；泽拉图I/V原技能击杀，阿拉纳克/菲尼克斯/旗舰对应技能均超过半血。原技能时序与金额保留，未通过提高英雄值绕过精英预算。这些是隔离工程/预算检查，不是自然战役平衡验收。

## 最终浏览器和正式界面

最终 demo/browser.json：**90场景、30次恢复、17组实际效果截图、5个空能量/地空边界、15个布局画质组合**，脚本/控制台错误0，远程请求0。五个视口390×844、844×390、1440×900、1024×768、768×1024，各覆盖完整/均衡/简化。实际查看了持续双刃、双线热扫、风暴、抬升螺旋、真实航母/重子机和移动竖屏截图。原纹理与原模型组件的作者组合不宣称完整原SC2特效资产；新效果仍供用户视觉复核。

production/report.json为最终Web五组覆盖30神族精英；production-offline/report.json为完整离线HTML一组；zerg-aura-production/report.json为两组虫族支援和六虫族英雄。神族六英雄分别在Web和离线组出现，全部12个调整光环的英雄实际通过正式存档链。显示报告确认英雄脚底光环存在、文字标签为0；已保留实际战斗截图。

各组诊断档由正式World和正常导出器构造，再通过正式UI文件导入→准备资源→战斗→导出→继续战斗→保存→刷新→本地读取→再导出；真实机制数据、生命/盾/甲/移动/能量/时钟、钱包和支付账本精确一致，无浏览器内写状态或生产调试API。示例是诊断导入场景，不是自然获得全部角色的证明。两个虫族组涵盖5个重设计支援源（女王三型、血羽、空巢），其余三支援源由全量规则回归验证。

## 失败尝试与剩余范围

首轮测试受受限子进程EPERM阻止，后续在正常本地执行权限下运行。第一次全量执行保留31个旧机制/旧光环期待失败，按已批准变更更新后通过。最初演示在第81例发现报告只枚举普通友军而漏掉真实所属子机，修正诊断枚举后，包含航母的全部90个身份/等级场景通过，未通过增加假子机修补。强度首查暴露新对甲倍率重复原生同类加成，运行时改为替代并增加回归；最终强度复验通过。

虫族持续恢复会刷新详情面板，最初UI自动化关闭按钮因节点替换而超时；改用既有正式Escape关闭入口后通过，不写战斗状态。截图另发现新精英扫线分段的羽化接缝，改为只合并同源、同宽、连续且同向的实际存活段，共用一个连续UV光带；不加伤害或延长有效轨迹。修正后重新打包并完成最终90场景、五组Web、两组虫族和离线复验。原日志保留，未删除失败证据。

没有清理、上传、推送或部署。原开放项继续：新精英人眼视觉验收、完整自然M6/M7、真实设备与长期性能、三个科技球原始死亡片段缺口。新增工程通过不关闭这些项目。
`;
await fs.writeFile('docs/project/NEXT_ITERATION_P4C_VALIDATION_20261005.md',document);
console.log(JSON.stringify({regressions:1161,previousHTMLs:preservation.artifacts.length,protectedFiles:preservation.protectedSource.length,webGroups:5,offlineGroups:1,zergAuraGroups:2,heroes:[...heroes],outputs:preservation.outputs}));
