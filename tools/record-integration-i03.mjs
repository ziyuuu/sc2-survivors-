import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/integration-i03-20261022',read=async f=>JSON.parse((await fs.readFile(f,'utf8')).replace(/^\uFEFF/,''));
const [verification,coverage,packaging,cleanup,production,touch,effects]=await Promise.all(['verification','coverage-ledger','packaging','cleanup','qa-production-r1/result','qa-touch-r1/result','qa-effects-r3/result'].map(n=>read(base+'/'+n+'.json')));
assert.ok(verification.pass&&packaging.pass&&cleanup.pass&&production.pass&&effects.pass);assert.equal(production.errors.length+touch.errors.length+effects.errors.length,0);assert.equal(touch.records.length,8);assert.equal(touch.httpRequests.length,0);
const regression=await fs.readFile(base+'/regression-r2.log','utf8');assert.match(regression,/tests 2108/);assert.match(regression,/pass 2101/);assert.match(regression,/fail 7/);
for(const [name,count]of [['regression-localhost-r1',16],['effects-r4',26],['dead-ends-r2',4],['entry-r1',1]]){const text=await fs.readFile(base+'/'+name+'.log','utf8');assert.ok(text.includes('pass '+count)&&text.includes('fail 0'),name);}
const paths=['catalog-structural','development-paths','equipment-seeds','cards-paths-expanded','card-effects','event-sources','map-paths','coverage-ledger','verification','packaging','cleanup'].map(n=>base+'/'+n+'.json'),bindings=[];
for(const file of paths){const bytes=await fs.readFile(file);bindings.push({file,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const changes=[{id:'I03-01',file:'src/simulation/combat/expedition-combat.ts',problem:'Equipment inheritance M03 turn_factor had no live consumer.',result:'Natural inherited equipment now changes native aiming speed to ×2.5.'},{id:'I03-02',file:'src/simulation/combat/expedition-combat.ts',problem:'Equipment inheritance M04 moving_chance had no live consumer.',result:'Natural inherited equipment now grants its declared legal moving-shot chance.'},{id:'I03-03',file:'src/simulation/starship/catalog-modules.ts',problem:'The old card_drop equipment clause had no valid current non-Boss card source.',result:'By explicit user decision, blue/purple pickup and C06 inheritance use +15% relative optional base equipment drop chance: 2.7% → 3.105%; guaranteed counts and quality weights unchanged.'},{id:'I03-04',file:'src/simulation/progression/supply-cards.ts',problem:'Flattened facility projections hid basic/air supply eligibility after a Zerg hatchery evolved both ground and air.',result:'Supply eligibility reads the native building direction ownership; all 128 current lawful supply combinations are reachable.'}];
const report={pass:true,task:'I03',date:'2026-10-22',scope:coverage.scope,authorization:{task:'检查全部内容的正常可达性、实际生效和流程死路，保持现在main的镜头和操作不变',equipmentDropDecision:'+15%（原2.7%→3.105%），仅可选基础层；不改保底数量或品质权重',legacyCorrection:'用户问为什么还有天赋；正式入口为旗舰配装，旧165定义从活动清单排除，未恢复或增加天赋功能。'},changes,coverage:coverage.counts,ledger:base+'/coverage-ledger.json',humanLedger:'docs/project/INTEGRATION_I03_COVERAGE_20261022.md',verification,regressions:{uniqueCovered:2139,newTests:37,full:{total:2108,firstPass:2101,localNetworkPermissionFailures:7,log:base+'/regression-r2.log'},permissionRerun:{total:16,passed:16,includesAllSevenFailures:true,log:base+'/regression-localhost-r1.log'},additional:[{tests:26,log:base+'/effects-r4.log'},{tests:4,log:base+'/dead-ends-r2.log'},{tests:1,log:base+'/entry-r1.log'}],note:'Final production source unchanged after the full 2108 run. The subsequent 31 new tests passed separately; 2139 is unique combined coverage, not a single 2139-pass log.',typecheck:base+'/typecheck-r3.log',dataExport:base+'/docs-data-r1.log',docsCheck:base+'/docs-check-r2.log'},browser:{production:{path:base+'/qa-production-r1/result.json',records:8,finalScreens:4,mouse:'native left/right commands in Web and file://',noLabDebugInFormal:true},touch:{path:base+'/qa-touch-r1/result.json',records:8,finalScreens:6,sizes:[[390,844],[844,390],[1280,720],[1440,900]],method:'CDP touch enabled before file:// page startup; actual joystick movement; not a physical device',offlineHttpRequests:0},effects:{path:base+'/qa-effects-r3/result.json',records:11,finalScreens:5,actualWebglRecovery:true,recoveryStateExact:true,scope:'Seeded items inspected via native equipment UI; local helper calls final production modules in controlled fixtures. Helper is absent from production build inputs.'},errors:0,viewedFinalScreens:15,viewedOldFailureScreens:2,contactSheets:base+'/visual-review/index.json',limits:['No pixel-equivalence comparison was asserted for I03.','Context recovery here is the controlled equipment/shop scene; full final V-series remains open.']},packaging,cleanup,bindings,failuresPreserved:[{kind:'actual gameplay defects',files:['inheritance-before.log','supply-before.log'],resolution:'fixed final five production files'},{kind:'old supply test fixtures',files:['regression-r1.log'],resolution:'36 fixtures now initialize native building ownership, original assertions retained'},{kind:'local network permissions',files:['regression-r2.log','qa-production-sandbox-failure.json','qa-production-server-failure.json'],resolution:'7 tests passed in prior permitted localhost rerun; final Web/offline production passed'},{kind:'audit fixture/seed assumptions',files:['cards-expanded-run-r1.log','events-run-r3.log','card-effects-r1.log','effects-r1.log','map-paths-r1.log'],resolution:'Real landing guards, initial job drain, worker rescue, safe horde windows, fixed seed dispersion and legal test conditions; retained logs are not counted as game defects'},{kind:'browser fixture and selectors',files:['qa-effects-initial-failure.json','qa-effects-text-assumption-failure.json','qa-effects-close-selector-failure.json'],resolution:'Outside-only cleansing fixture, literal ×2.5 description and native Escape close; final offline r3 passed'},{kind:'packaging and cleanup environment',files:['packaging-r1.log','cleanup-r1.log','cleanup-r2.log'],resolution:'Hardlink EPERM and elevated automatic-review timeout; reference-only delivery adds no large duplicate. Cleanup used verified exited owned sessions when sandbox CIM inventory was unavailable.'}],limitations:coverage.limitations,unchanged:{mainCameraAndInput:true,performanceD01ThroughD04:true,assets:true,current:true,gitCommitPushPublish:false},next:'G01'};
await fs.writeFile('reports/qa/integration-i03-20261022.json',JSON.stringify(report,null,2));
const game=verification.delivery.find(r=>r.mode==='game'),lab=verification.delivery.find(r=>r.mode==='lab');
const document=`# I03 当前全部内容可达性、实际生效与流程出口 · 2026-10-22

状态：I03 本地完成。看板修订112，62项完成49、剩余13（11待办、2暂缓），下一项 G01 尚未启动。

按用户授权在 I02 后的 main 当前工作区完成。原镜头、鼠标左右键／触屏摇杆、控制栏、五地图及 D01–D04 成果保持；未替换 Current、提交、推送或发布。

## 当前内容范围

正式入口是旗舰配装。165 个旧天赋定义仍在历史源码／测试中，但不是当前正式玩法。本次曾误将其列入活动内容，用户指出后已纠正：三族正式菜单、部署与新局检查确认没有天赋分配入口，旧天赋值全部为零，不读取旧天赋存档。没有恢复或新增天赋功能。

[完整逐项索引](INTEGRATION_I03_COVERAGE_20261022.md)和[机器清单](../../${base}/coverage-ledger.json)把原生来源、资格、随机种子、触发与消费者／效果测试关联起来。原生来源试验可以控制阶段、资源和守军击杀；直接注入的效果夹具不冒充自然获取证据。

| 目录 | 当前覆盖与证据 |
| --- | --- |
| 装备 | 210 模板，三族各一份条件掉落样本，共630；117 种绑定、59 个继承结果有原生种子。所有现行品质／槽位来源存在非零权重，候选池无意外为空。 |
| 装备效果 | 191 个效果键逐项追到实际消费者；属性／绑定／方向／容量的动态分派单列。新增26项效果测试补足此前缺少直接触发证据的63个键，另6项缺陷回归。 |
| 当前卡牌 | 563 个 ID 经过原生候选、随机货架、实际支付／免费规则、回执和重买拒绝；包含128个合法补给组合、全部商品档次及当前身份卡。 |
| 卡牌实际效果 | 300 张兵种功能牌及10张全队牌逐张测量恢复、能量、生产时间或实际单位属性／输出变化，共310组前后值。其余商品／支援／训练／补给／身份使用对应当前运行时回归；装备全局加成另由G01负责。 |
| 发展与身份 | 82个发展项目的157个等级／自动解锁节点、30个生产家族有合法前置路径；18英雄、90精英通过原生身份资格与购买／晋升路径取得，并关联当前技能／被动回归。 |
| 自动事件 | 7任务、10遭遇、5拾取物、4替代虫群、4门票、4传送门，共34类别全部从原生时钟／资格／概率分支产生；没有指定种类注入代替这部分来源检查。 |
| 地图与出口 | 五个生产地图各7种任务及1个自动传送门，共40次合法实体占位；无队员、成员死亡、入口受阻、过期目标、满包待领与失败重试有明确后续路径。 |

## 已确认并修复

| 问题 | 最终行为 |
| --- | --- |
| 装备继承 M03 的转向倍率未被战斗读取 | 实际移动瞄准采用 ×2.5。这里的 M03 是装备继承编号，不是恢复旧天赋。 |
| 装备继承 M04 的移动开火概率未被战斗读取 | 合法移动射击按继承值生效；与转向倍率分别核验，避免互相误授予。 |
| 拾取模块旧“卡牌掉率”没有当前生效路径 | 按用户明确选择改为装备基础随机掉率相对 +15%，2.7%→3.105%；蓝／紫拾取模块及 C06 继承一致。普通装备掉落与任务规划共用修正；不改保底数量、品质权重或非Boss不掉卡规则。 |
| 虫族同一孵化场同时具备地面／空中方向后，旧扁平设施视图隐藏部分补给 | 改用原生建筑方向所有权，基础／地面／空中补给可同时合法出现；128组合全部有来源。 |

新增4份测试共37项，另将既有36个关间补给测试夹具改为建立真实建筑组，保留原断言。没有新增退出按钮或更改镜头／操作政策。

## 流程与限制

- 四人门票在队员资格变化后拒绝进入并保留正常战斗；不消费本次次数。
- 受阻传送门不会变成强制弹窗，普通移动仍可用，到期按原规则消失。
- 已报价训练对象死亡后拒绝支付，关间仍能跳过并继续。
- 任务放置受阻不产生半个任务或预占残留；空间恢复后可重试。
- 满包特殊奖励可整理后领取、待领取Boss奖励、身份席位、在途生产／复生以及特殊关成功／失败返回，关联 I02 和当前完整回归，不重复宣称存档已经实现。

有意限制保持：同身份／队员／军衔上限、指定种族／关段／难度／无尽资格、特殊关一次性与安全窗口、污染宿主和绑定范围。旧被替代卡牌、旧天赋及非Boss禁掉卡不当作需要重新打开的内容。

## 验证结果

- 2139项唯一回归覆盖：完整2108项中2101首过，7项本机网络 EACCES 在同版3文件16项重跑中全部通过；之后新增26+4+1项全部通过。2139是去重汇总，不伪称一份单次全绿日志。新增测试后生产源码未变。
- 最终类型检查、数据导出和数据一致性检查通过。
- 正式 Web／file:// 菜单启动、鼠标左右键移动与设置返回共8记录；正式包无试玩选择器／调试入口。启动前启用触摸模拟，原生摇杆移动及390×844、844×390、1280×720、1440×900共8记录通过，不是真机输入。
- 3件装备的原生详情显示、生产效果函数及实际 WebGL 丢失／恢复共11记录通过；恢复前后账户、实体、阶段和游戏时间精确一致。效果夹具及注入助手只用于 QA，不进入493／494份生产编译输入。
- 最终15图已查看，另查看2张旧失败图；主检查页面／控制台错误0，已记录的离线普通／触屏运行HTTP请求0。本批没有宣称像素全等、自然战役通关或全内容60FPS。
- 804个原有src/test中798逐字节未改：5生产文件、1既有测试变化，4新增测试，最终808份。271个启动／UI／渲染文件中只变更装备效果说明一份，其余270份逐字节保持。
- 普通／试玩 Web 各1909资产、1852独立资源；离线各2975块／1909资产，使用正式解码器全部逐SHA读回。所有编译输入、主程序、HTML和资源与当前源码／产物清单一致。

| 构建 | 主JS SHA-256 | 离线HTML SHA-256 |
| --- | --- | --- |
| 普通 | ${game.webJs} | ${game.offlineHtml} |
| 试玩 | ${lab.webJs} | ${lab.offlineHtml} |

## 失败与证据归属

修改前继承／补给失败探针、旧36个扁平设施夹具失败、7个网络权限失败均保留。自动事件早期种子聚集、缺工人／原生初始订单未排空、虫群安全窗口、已售货架重放、移动／到期时刻等夹具错误均保留原日志，不能算作游戏缺陷或抹去。

浏览器先导包含局内净化夹具错误、×2.5文字被误期望为150%、嵌入背包不存在关闭按钮的选择器错误；最终改用合法局外生成和原生 Escape 返回后通过。两次浏览器外部执行审批超时后改为沙箱内 file:// 完成；硬链接打包遇到 EPERM／审批超时，最终使用引用交付，不复制第二份大包。清理先导的脚本授权／CIM读取限制单列，最终仅按已退出的本批QA会话清理本批缓存。

原始日志、JSON、冻结输入、最终截图及旧失败全部保留。报告：[integration-i03-20261022.json](../../reports/qa/integration-i03-20261022.json)。

## 本地交付与后续

[交付入口](../../preview/integration-i03-20261022/index.html)直接引用已校验的[正式离线包](../../${base}/offline-game-r1.html)和[39入口独立试玩](../../${base}/offline-lab-r1.html)，新增大二进制副本0。Web服务为[正式普通游戏](http://127.0.0.1:4483/game/)／[独立试玩](http://127.0.0.1:4483/)；已有服务可继续使用。

已关闭的单份本批QA profile 清理 ${cleanup.logicalBytes} 字节（约${(cleanup.logicalBytes/1024**2).toFixed(1)} MiB），2837文件；828保护项前后SHA保持。Current SHA ${verification.current.sha256} 保持。

下一项G01仍未启动。G02/G03收益与整局经济难度、U05引导、第三／四批视觉、T01全动作视听检测、D05跨关闭存档及最终V系列均保持开放。来源存在与受控效果通过，不等于自然出现频率、最终平衡、人类／真机或完整战役验收。
`;
await fs.writeFile('docs/project/INTEGRATION_I03_20261022.md',document);
const board=await read('docs/project/performance-board.json');assert.equal(board.revision,111);const task=board.tasks.find(t=>t.id==='I03');assert.equal(task.status,'待办');
const result='当前正式舰装入口的全量来源／生效／流程核验完成：210装备模板、191效果键、563卡牌、157发展节点／30兵种、18英雄／90精英及34自动事件类别；310卡牌效果逐张实测，五图40放置。修复装备继承M03/M04、用户批准的基础装备掉率+15%相对加成及虫族多方向补给资格。2139唯一回归覆盖、类型／数据、正式与离线输入／图形恢复／15图通过。旧165天赋定义明确排除，正式新局旧天赋为零；镜头与操作源码保持。自然频率／平衡、全视听T01、持久化D05及最终V系列保持开放，未替换Current、提交／推送／发布。';
task.status='已完成';task.updated='2026-10-22';task.result=result;task.evidence.push('INTEGRATION_I03_20261022.md','INTEGRATION_I03_COVERAGE_20261022.md','../../reports/qa/integration-i03-20261022.json');board.revision=112;board.updated='2026-10-22';board.next='G01';board.updates.push({date:'2026-10-22',tasks:['I03'],change:result+' 看板62项完成49，剩余13（11待办、2暂缓），下一项G01尚未开始。',evidence:['INTEGRATION_I03_20261022.md','INTEGRATION_I03_COVERAGE_20261022.md','../../reports/qa/integration-i03-20261022.json']});
await fs.writeFile('docs/project/performance-board.json',JSON.stringify(board,null,2)+'\n');
for(const file of ['docs/DESIGN.md','docs/ARCHITECTURE.md']){const old=await fs.readFile(file,'utf8');await fs.writeFile(file,`> 2026-10-22 I03：[当前内容核验](project/INTEGRATION_I03_20261022.md)与[逐项清单](project/INTEGRATION_I03_COVERAGE_20261022.md)。正式入口为旗舰配装，旧天赋不属于现行玩法；本批没有恢复天赋。装备继承瞄准／移动射击已接线，拾取模块及继承按用户决定改为基础随机装备掉率相对+15%（2.7%→3.105%，不改保底和品质），虫族多方向补给使用原生建筑资格。main镜头／输入／性能成果保持；G01等后续仍开放。\n\n`+old);}
const handoff=`## I03 当前内容可达性与生效核验完成 · 2026-10-22

- 用户授权I03并明确当前main镜头／操作不变；5生产文件完成。装备继承M03/M04接入实际瞄准／移动射击，拾取模块及C06按用户确认改为基础装备掉率相对+15%（2.7%→3.105%，保底／品质保持），虫族同时地空发展后的补给读原生方向资格。
- 210装备模板／630种族样本、117绑定、59继承、191效果键、563卡牌（128补给）、310张牌实际效果、157发展节点／30兵种、18英雄／90精英、34原生自动事件类别及五图40合法放置完成。来源与受控触发分开，不当自然出现率或人类全战役。
- 用户指出“为什么还有天赋”后纠正范围：正式入口为旗舰配装，三族菜单无天赋分配、新局旧天赋值全零。165旧定义仅为历史代码／回归，不计活动内容，未恢复天赋或新增天赋功能。
- 37新增专项；2139唯一回归覆盖＝同版完整2108（7网络权限项在16项重跑补齐）＋后加31项通过。最终类型／数据、正式Web／离线原鼠标、模拟触屏四尺寸、装备说明及实际WebGL恢复通过；15最终图已查看。804既有src/test中798未改，Current及270个其余启动／UI／渲染文件SHA保持。
- 记录docs/project/INTEGRATION_I03_20261022.md、INTEGRATION_I03_COVERAGE_20261022.md及reports/qa/integration-i03-20261022.json。硬链接EPERM／自动审批超时后使用preview/integration-i03-20261022/index.html引用已验证包，未再复制大二进制；原失败保留。本批关闭QA缓存约651MiB清理、828保护项SHA保持。
- 看板112：62项完成49，剩余13（11待办2暂缓），下一项G01未启动。第三／四批视觉、G01/G02/G03、U05、T01、D05及最终V系列仍开放；未改镜头／操作、替换Current、提交／推送／发布。

`;
await fs.writeFile('AGENTS.md',handoff+await fs.readFile('AGENTS.md','utf8'));
const readme=await fs.readFile('README.md','utf8');await fs.writeFile('README.md','> 2026-10-22 I03完成：[当前内容可达性／生效核验](docs/project/INTEGRATION_I03_20261022.md) · [逐项清单](docs/project/INTEGRATION_I03_COVERAGE_20261022.md) · [本地候选入口](preview/integration-i03-20261022/index.html)。正式入口为旗舰配装，未恢复旧天赋；镜头和操作保持，下一项G01尚未开始。\n\n'+readme);
console.log(JSON.stringify({pass:true,revision:board.revision,next:board.next,counts:board.tasks.reduce((a,t)=>(a[t.status]=(a[t.status]??0)+1,a),{}),sourceChanged:verification.changed.map(r=>r.path)}));
