# F05 工人及临时出兵载体实施 · 2026-09-27

依据 `MVP_FEEDBACK_F05_F07_APPROVED.md`。工作区原有未提交修改保留；不提交、不推送、不清理。

## 运行边界

- 三族工人名称/模型固定为 SCV/scv、工蜂/drone、探机/probe；阵营判定保持原 player/enemy 语义，虫族玩家仍能救援工蜂，敌方摧毁虫卵不给收益。
- 经济计数统一为保存字段 `workers`，统计为 `workersRescued`/`workersLost`，`ECONOMY.perWorker` 保持每秒 0.1725 矿/0.046 气，原难度、采矿大师和救援天赋不变。父任务统一升级 schema8；不增加旧开发档兼容。
- 临时载体按本局种族使用兵营/孵化场/水晶塔原模型。模型平面最长边统一 2.7，仅影响 Three 场景缩放；原 Pod 生命、半径1.25、付款 ledger、等待/安全出舱、损毁、换兵代码不改。
- 资源进入初始加载协调器及离线强制可达闭包；启动只准备所选种族工人/建筑与公共敌方工蜂/虫卵，之后切新局或载入档案按相应种族补载。缺少任何必需原模型会明确失败，不能静默换成运输舱或普通模型。原 SCV 配音仅用于人族救援。
- `RESCUE_PRESENTATION` 是不可变展示映射；工人模型由存档本局 race 重建，建筑视图缓存随 presentation reset 清除，DTO 不保存 Three 对象。

## 原模型来源与本地处理

初始本地检查：项目 `.cache` 不存在，项目私有 M3、已配置 temp/sc2-v26-assets 缓存无 Probe/Barracks/Pylon/Hatchery 四源文件。没有假定现成模型存在。

使用现有锁定 CASCLib 工具获取指定原文件及 DDS 依赖，不上传私有素材，不下载整包游戏，不通过远程服务转换。工具锁定 `3f8be478177802de4ae7ebae24fb25ab860ef104`，模型资产锁定 SC2 `B97563 / 5.0.16.97563`。精确 ModelData 路径及提取目标见 `tools/f05-rescue-models.json`；原始字节散列/路径由 `tools/f05-rescue-dependencies.json` 记录。

本地 M3 转换器固定 `ee0eff037e2e40d2aad72f4f856af0710b8a44e5`，保留原骨架、材质和可导出的动作；源字节、成功转换、动画绑定、人工视觉和分发权利保持分别记录。

提取/转换实际结果：`pwsh -NoProfile -File tools/fetch-expansion-casc.ps1 -ModelManifest tools/f05-rescue-models.json -DependenciesFile tools/f05-rescue-dependencies.json -MissingReport reports/local/f05-rescue-missing.json` 核验62个源/依赖文件，0缺失。CASC元数据缓存154文件、78,475,254字节；其中编码表46,185,270字节、根表14,412,722字节，其余为索引/配置。没有下载整客户端/整资源归档。

`node tools/import-m3-pack.mjs model.probe model.barracks model.hatchery model.pylon` 实际导入4模型，现有总manifest483项、0失败；GLTFExporter报告规范化原法线，无导入错误。运行 `npm run assets:prepare`、`python tools/optimize-glb-webp.py`（无prune参数）、再次prepare及`node --import tsx tools/m6-release-assets.mjs`：755/755资产可用，145个逐像素等价WebP模型衍生，闭包755项。原始M3/DDS及转换GLB保留不删，四个新增打包GLB合计13,807,612字节。

| 模型 | 原M3字节 | 动作/骨骼 | 打包字节 | 打包SHA256 |
| --- | ---: | ---: | ---: | --- |
| probe | 129072 | 8 / 27 | 392168 | `050929f94f9e8589dae738c0d5b78d66f658e4794212376e727fdb516ae95b5d` |
| barracks | 546416 | 16 / 92 | 2972852 | `721e189fe40529227ba6dbcdce93f0f474172d75e881c23a0d0c9098ff98f6a0` |
| hatchery | 1065696 | 23 / 154 | 9337104 | `c2ba26c2a2e83bbbab6c418f9997e8a136da9a517ce5c92307bbc935492fd3fa` |
| pylon | 91232 | 1 / 23 | 1105488 | `e1cfc2c7e623db14e5b42b1d34effc40e24a8d1cf6ca52795342582867517555` |

精确源路径、源散列、完整动作名及派生散列在 `reports/local/f05-source-validation.json`。四模型来自mods/liberty.sc2mod/base.sc2assets，分别Probe/Probe.m3、Barracks/Barracks.m3、HatcheryEx1MP/HatcheryEx1MP.m3、PylonEx2/PylonEx2.m3。

动作适配通过 `CarrierViewAdapter`：人族落地为原 `Fly End`，待援 `Stand`，释放 `Stand Work`；虫族出现为原 `Build A Start`，待援 `Stand`，释放 `Stand Work`。水晶塔源文件仅有 `Stand`，没有Birth/Work/Death，不伪称原版跃迁动作：本地小幅模型出现缩放、私有克隆材质发光脉冲给释放反馈。三建筑源主体均无Death，损毁由已存在事件效果和源模型短缩退场表现；不称原版死亡动作。旧DropPod_Door骨骼开门代码已删除，未用替代建筑或几何体补模型。源M3粒子系统仍不等于完整SC引擎复现。

## 实际验证

- RED：新工人测试首次 4/4 失败：`workers` 未定义和种族映射缺失。随后夹具纠正为真实 terrain:true，满足非 sandbox 续局地图校验；不放松生产校验。
- RED：建筑视图平面足迹测试在旧按高度缩放逻辑失败。
- GREEN：`node --import tsx --test test/feedback-workers.test.ts test/feedback-carrier-view.test.ts test/m2-elite-rescue.test.ts test/m1-save.test.ts test/m2-economy-contract.test.ts test/elite-receipt-regression.test.ts`：26 通过、0 失败（第一轮）；最终再加 `test/m6-snapshot-assets.test.ts` 与载体适配/材质隔离测试，34通过、0失败；覆盖三族收益/防重/阵营/存读、视图不改载体状态、精英救援及已有付费事务。
- `npm run typecheck`：退出码0（上述逻辑和展示接入后）。
- Node sandbox 初次子进程 EPERM，提升本地测试进程权限后实际执行；不是把 EPERM 当测试通过。
- 本子任务不运行完整 build、不声明浏览器或离线验收；完整包、hash/大小、桌面/窄屏及输入由父任务的整合记录提供。

## 保持开放

四种原模型转换/绑定及离线可达闭包已核验；实际浏览器视觉、加载与最终HTML离线流程由父任务整合核验。水晶塔单Stand及主体缺失Death动作限制如上，不把本地反馈冒充原版粒子/动作覆盖。M4/M5人工视觉、M6自然性能和M7最终签收不因本记录通过。
