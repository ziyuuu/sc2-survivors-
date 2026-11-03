# 两轮代码审查缺陷修复 · 2026-11-02

用户授权修复聊天“bug寻找分支”的发现。本批以 `体积优化版` 的 `8d680aca1b3150b3faa0c9c170458d084c9a1a1e` 为基线，处理[全面审查](FULL_CODE_AUDIT_20261102.md)与[运行补充审查](RUNTIME_CODE_AUDIT_20261102.md)的15项产品缺陷、1项CI缺口，并补修同类普通兵等级保存问题。当前为本地工作区候选，未提交、推送、合并main或部署；既有Coze和压缩发布快照保持原版。

## 修复与证据对应

下表省略统一前缀 `V06-`。每项沿用原编号，不把同一问题的对照数量计作新缺陷。

| 编号 | 修复后行为 | 定向证据 |
| --- | --- | --- |
| FULL-SAVE-NATIVE-001 | 胆汁、输血、腐土/雨幕保存释放时的舰装原生倍率；脊刺按已保存攻击效果核对宽度与伤害，卸装不改已承诺载荷 | audit-persistence-contracts：6种精英各有无装备对照、卸装、载荷篡改拒绝 |
| FULL-SAVE-HP-CAP-001 | 屏障、蓄存和转伤池保存贡献时的生命上限；卸生命装后已生成的屏障可保存 | 同文件：实际蓄力、攻击、卸装、保存/导出/恢复，超额屏障拒绝 |
| FULL-INDEX-HANG-001 | 索引请求/正文有45秒上限；清缓存取消旧任务，reload替换旧任务，晚到结果不能回填 | packed-cache-recovery：头/正文挂起、清理、reload和旧结果竞争 |
| FULL-HTTP-CACHE-001 | 校验失败的HTTP缓存包在同次请求中使用reload重取一次，正确数据才发布 | 同文件：坏200缓存与健康源站、全坏包及既有缓存边界 |
| FULL-KTX-WORKER-001 | Worker error/messageerror、初始化和转码超时会释放该代解码器与通道，回退原贴图 | decoder-recovery：锁定Three真实KTX解析入口、替身Worker故障、晚初始化和重试 |
| FULL-AUDIO-HANG-001 | 音频请求、正文和解码有上限，取消最后一个等待者会结束任务；旧解码不回填，多消费者互不误取消 | decoder-recovery及audio-preparation：挂起、取消/重试、晚到结果和后续播放失败重新准备 |
| FULL-FAMILY-LIFE-001 | 退役兵种同步退出舰装复生名册、待恢复、回溯快照和投影；独立舰装成员与英雄保持 | audit-lifecycle-contracts：相位恢复、回溯一次性与独立成员对照 |
| FULL-WIPE-001 | 团灭判定采用真实战斗能力，纯辅助存活不拖住战败；合法战斗单位恢复仍有效 | 同文件：医疗运输机/科学球反例及合法恢复对照 |
| FULL-CI-001 | push分支过滤包含“体积优化版” | workflow静态核对；本机执行相应回归、类型、数据和构建；远端触发待提交后确认 |
| RUNTIME-RESCUE-SAVE-001 | 临时跳虫只按当前营救任务、护卫次序及双生身份校验 | audit-persistence-contracts：第14关最后240步真实任务、保存恢复和伪造身份拒绝 |
| RUNTIME-SAVE-SWANN-001 | 保存施放时的装备档位，识别原生7、橙套10及腐化套全部合法目标 | 同文件：三种档位、重复目标拒绝 |
| RUNTIME-SAVE-NIADRA-001 | 复生窗口冻结装备额外次数，识别原生4次/腐化5次且不重领 | 同文件：有无装备、6次篡改拒绝 |
| RUNTIME-SAVE-HERORANK-001 | 英雄技能、攻击与被动收据接受真实成长后的正安全整数等级，保留载荷/身份校验 | 同文件：击杀成长至6级，雷诺、斯托科夫、阿塔尼斯、诺娃跨关保存与恢复 |
| RUNTIME-MAP-RETRY-001 | 地图成功后才提交地形身份；原准备入口可重试，恢复原地图清除过期错误 | runtime-resource-recovery：真实特殊关与地图创建、一次图片失败、准备协调器重试 |
| RUNTIME-GAMEPAD-RAF-001 | 可选手柄API拒绝被隔离，键盘与渲染继续运行；诊断/校准也不会再抛相同异常 | gamepad单测及真实Chrome `Permissions-Policy: gamepad=()` |
| RUNTIME-TEXTURE-TIER-001 | 切档同时更新Source、压缩类型、mipmap、格式和缓存模板，保留材质引用及采样设置 | runtime-resource-recovery：克隆/回退；Chrome真实GPU高→中→高像素核对 |
| RUNTIME-SAVE-RANKCAP-002（本轮新增） | 装备培养至8级的双生编制、尼亚德拉复生身体与孤星吸收回执可保存；非整数/非有限等级仍拒绝 | audit-persistence-contracts：真实装备/培养，修复前3条均被旧7级上限拒绝，修复后保存/导出/恢复通过 |

没有调整伤害、成长、生产、随机顺序或奖励数量；新增的是冻结收据的校验依据。没有新增玩家UI、按钮、说明或操作方式。保持Run schema26与当前规则ID；缺少可选记录的既有合法存档按原生默认值读取，不扩展旧开发档兼容范围。原档/两份备份、多页面冲突保护与统一账户事务保持。

## 实际验证

最终完整回归 **2957/2957通过，0失败、0跳过**，其中本批新增48项。类型和数据检查通过。正式Web构建通过，3847项资源/3750份载荷逐一校验，appBuildId为`34408a35562ffdf62b278e8a310ae04d06515af98cee00f2c6ab61006922dbab`。详见[机器结论](../../reports/qa/audit-fixes-20261102.json)。首轮2951项中2942通过，失败包括音频后续播放失败未重新准备1项、旧地图测试替身2项，以及本机HTTP权限6项。音频实现已补正，测试替身补入地图入口；相关20项通过，网络所属文件15项在正常回环权限下通过。最终回归独立计数，不将复跑累加。

三族有限连续模拟均通过：每族18个战役关卡和2轮无尽、115200个固定步、20次快照恢复，共60个检查点。虫族第14关任务护卫状态可保存，后续关卡继续。该夹具固定seed及runId，并使用诊断生命保护、每秒有限清敌；用于状态/回执连续性，不代表自然游戏难度、平衡或性能验收。

Windows Chrome无头模式、本机独立HTTP来源、临时档案，1280×720：

- 本地源码诊断构建首战、关间真实按钮推进、刷新恢复最近检查点及再次开新局通过，无页面异常或HTTP失败。关末由诊断调用触发，未宣称自然通关。
- gamepad禁用策略下，菜单1.8秒间帧号5062→5347；战斗时间0.117→2.15秒，键盘操作与渲染继续，无未捕获异常。未认定该策略存在于当前线上环境。
- `model.science_vessel.death`图0实际KTX高档为1024×1024、11级mip；切中档后为512×512普通纹理、旧压缩mip移除。记录真实GPU分配并读取渲染结果：与独立读取中档GLB生成的参考像素平均绝对误差0；切回高档像素逐字节一致，GL错误0。该结论针对真实Chrome支持BPTC的路径，不替代iPhone ASTC实机验证。
- 代表性的关间、权限拒绝后战场及纹理对照截图已人工查看。没有重新开启全目录截图或长时间自动游玩。

故障注入的KTX Worker、音频超时和地图失败以自动化替身控制时序；不将其冒称原手机现场。原iPhone/Safari、物理手柄、OS杀页、完整自然长局及线上部署验收仍开放。正常/权限浏览器检查先于最后的普通兵等级校验补修，该补修由26项保存回归及最终2957项全回归覆盖；GPU检测重新构建了最终产品源码。

## 复现与交付边界

```powershell
node --import tsx --test test/audit-persistence-contracts.test.ts test/audit-lifecycle-contracts.test.ts test/decoder-recovery.test.ts test/runtime-resource-recovery.test.ts test/gamepad.test.ts test/packed-cache-recovery.test.ts
node --import tsx tools/inspect-runtime-simulation-20261102.mts terran
node --import tsx tools/inspect-runtime-simulation-20261102.mts zerg
node --import tsx tools/inspect-runtime-simulation-20261102.mts protoss
node tools/verify-audit-browser-20261102.mjs --continuation-only --normal-only
node tools/verify-audit-browser-20261102.mjs --no-build --policy-only
node tools/verify-audit-browser-20261102.mjs --no-build --texture-only
```

浏览器脚本只在隔离Vite构建中注入观察入口，使用当前SW模板与已核验的压缩素材；未改写生产源码、`dist/web`、Current或已发布快照。三族模拟沿用原审查脚本中正常行为断言，历史报告不覆盖；其他`inspect-full-audit-*`及故障复现脚本仍属于修复前证据，不能为使其通过而恢复旧缺陷。构建标识、输入哈希和实际检查摘要写入机器结论。首次常规Web打包输出误设在reports/local，被构建工具的dist边界检查拒绝；改为独立的`dist/audit-fixes-20261102/web`后成功，不将路径保护计为产品失败。

本地验证完成后已按产物保留规则清理本批隔离构建、截图、临时档案与详细日志，共3793份文件、1515913504字节；绝对路径、目录链接和Git跟踪状态检查通过。仅保留修复源码、测试、可复现工具和简要结论。其他任务的共享改动、正式成品和真实玩家数据保持。后续如发布，应先按现有流程更新压缩前端并验证同版标识，再按具体授权提交/推送/部署。
