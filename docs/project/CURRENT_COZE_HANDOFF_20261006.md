# 当前应用交接入口 · 2026-10-13

最新交付（2026-10-14）：**设置与横竖屏 Final R3／应用 0.6.28**。[离线 HTML](../../dist/SC2-Survivors-Mobile-Settings-Final-R3-20261014.html)、[应用 ZIP](../../dist/Mobile-Settings-Final-R3-Application-20261014.zip)、[验证记录](MOBILE_SETTINGS_VALIDATION_20261014.md)。Current 和本地 deploy/coze 已同步；资源与五图最终版相同，可复用其完整资源包。Safari 专项未执行，真机未验证，未进行线上部署。下列旧版本段落保留为历史交接。

当前本地交付为 **MVP 7A Final R1／应用 0.6.26**：[完整离线 HTML](../../dist/SC2-Survivors-MVP7A-Final-R1-20261013.html)、[应用 ZIP](../../dist/MVP7A-Final-R1-Application-20261013.zip)、`dist/web/`。Current 与具名 HTML 字节一致，`deploy/coze/` 已逐文件同步 198 个应用清单文件。

Web 构建 `ea42c5704c2964f581afb7ca2e6245de4554a2623bf3a3e62a59fccf2816c0aa`，应用身份 `169163d8f94cd5889e50852909c31b2c32f700d07cd56fa21637d2a8eba77798`。资源版本仍为 `cc35c4025c6da0949c70f68fefe9b421734faae6e0b49a015831a5c297086d6a`，1177 条记录／1129 文件／809073180 字节；资源、依赖、backend/vendor/config 和 schema26／档案v6／地图配方v3 均未增加或改变。

仅采用合并动画采样与可让出执行的 CPU 准备。三对立即开始实测，Web 配对中位少等 9.209 秒／8.55%，实际离线版少等 3.078 秒／约 3.14%；首十秒没有可重复的明显帧时退步。1,400 项回归、40 对原生状态、24 对 RGB 精确画面、五图两轮与正式 Web／离线恢复检查通过。74 个测量记录、候选拒绝理由、独立 CPU／GPU／进程内存归因见 [7A 实施说明](MVP7A_LOADING_20261013.md) 与 [验证记录](MVP7A_LOADING_VALIDATION_20261013.md)。菜单仍有数秒阻塞，缓存异常原因未确定；完整内容 60 FPS、人工／实体输入、生产／B4 仍开放。

四种本地 v10 启动与更新检查通过；1129 个资源文件全部复用，资源新增／重下载为 0，配置、旧应用和回滚指针保留，幂等及篡改拒绝通过。首次镜像同步复制 package-lock.json 遇到 UNKNOWN 错误，旧清单文件和 Current 当时仍完整；保留失败后，正常权限续传已核对的临时文件并逐项校验成功。真实同步记录为 `reports/local/7a-20261013/delivery.json`，完整机器结果为 `reports/qa/7a-20261013.json`。没有 Git 提交／推送或线上 Coze、数据库、后台操作。

**以下为较早交接记录，保留当时的构建、结果与限制，不替代上面的 0.6.26 入口。**

---

## 2026-10-13 较早的 Refraction / Science Vessel 交接记录（历史）

当前本地交付为 **Refraction / Science Vessel／应用 0.6.25**：[完整离线 HTML](../../dist/SC2-Survivors-Refraction-Science-Final-R2-20261013.html)、[应用 ZIP](../../dist/Refraction-Science-Final-R3-Application-20261013.zip)、`dist/web/`。Current 与具名 HTML 相同，`deploy/coze/` 已同步 196 个应用清单文件。应用 R3 只修正包内 README 入口，游戏字节仍为最终 R2。

Web 构建 `eb225a062a9e16201bd7e294c1320c99d4b36303a8f25a7d869eba00ddf7a19d`，应用身份 `548d792075fc298d0955f0a685b3772c8ed5b3463b43f1f3025201a0f58f6d6a`；资源版本 `cc35c4025c6da0949c70f68fefe9b421734faae6e0b49a015831a5c297086d6a`，1177 条记录／1129 文件／809073180 字节。schema26／档案v6／地图配方v3 不变。

范围与实际结果见 [本轮说明](REFRACTION_SCIENCE_20261013.md)、[来源记录](REFRACTION_SCIENCE_SOURCES_20261013.md)、[验证与交付](REFRACTION_SCIENCE_VALIDATION_20261013.md)。14 个可绘制折射定义已接入，三档全息科学球的死亡来源链已解决；密集遮挡按用户要求后移。用户后续明确不要求 1:1 复刻，客户端精确强度／逐阶段对照不再是验收门槛；以来源、代码、真实运行与正常游玩中的明显异常检查为准。自然性能、用户试玩／实体输入、生产／B4 等既定要求仍保留。

本轮仅更新本地交付，未提交／推送 Git 或执行线上 Coze、数据库、后台及新资源远端发布。完整 HTML 自带资源；应用 ZIP 使用外置资源，生产使用需配套本轮资源版本。同步事实记录在 `reports/local/refraction-science-20261013/delivery.json`，不是远端发布证明。

**以下全部为较早交接记录。** 其中“当前”、旧构建号、资源数与包名均按各段原日期理解，不替代上面的 0.6.25 入口。

---

## 2026-10-13 较早的 Combat Effects R3 交接记录（历史）

当前本地交付为 **Combat Effects Final R3／应用 0.6.24**，批次文件名保留 `20261012`。使用 [R3 应用 ZIP](../../dist/Combat-Effects-Final-R3-Application-20261012.zip)、[命名离线 HTML](../../dist/SC2-Survivors-Combat-Effects-Final-R3-20261012.html) 和 `dist/web/`；`deploy/coze/` 是已同步的应用镜像，Current 离线入口与 R3 相同。准确清单见 [delivery.json](../../dist/Combat-Effects-Final-R3-Application-20261012/delivery.json) 和 [web-release.json](../../dist/web/web-release.json)。

Web 构建 `0854ed362e7c5d223973e86917b1317b6a5918f43cf41b9237ba0af41b8d0059`，应用身份 `e7507b201b889b4dd7ddc42a6f28382503ba9667d8258c32fccc3d72d3662257`；资源版本 `f215909d007c35a7a8a607624e67ae3c8ab4e2fcd2457ec2ec155fc31d5c2f2c`，1157 条记录／1110 个文件／808224980 字节。继续保持战局 schema 26、档案 v6 和地图配方 v3。

当前实际检查、失败保留、原版缺层及来源限制见 [战斗特效验证](COMBAT_EFFECTS_VALIDATION_20261012.md)。本地 Current／镜像同步与 Git／CI 结果分开记录在 `reports/local/combat-effects-20261012/delivery.json`、`git-sync.json`。本次文档整理没有重建、更新镜像、执行 Git 同步或进行线上部署。

部署仍沿用既有 Coze v10、完整清单校验、资源复用、锁定依赖、配置保留与回滚流程；后台真实生产条件按 [P5 交接](P5_BACKEND_HANDOFF_20261006.md)。生产／B4、自然性能、人工与实体设备等未因本地交付关闭。后续范围见 [MVP 收尾计划](MVP_COMPLETION_CONTRACT_20261013.md)。

**以下为旧交接原文。** 其中“当前”指各自记录日期；旧包名、资源数和构建号不替代上面的 R3 入口，历史路径也不保证在已批准的本地清理后仍存在。

---

# 当前加载与自适应界面交接 · 2026-10-09

当前交付为 `dist/Entry-Fixes-Coze-Application-20261009.zip`，Git 的 `deploy/coze` 保存同一应用。Web 构建 `8fe4ce100758fcf415621b95f28efb32cbd66dece6819e1e409914755c32bbde`，应用版本 0.6.14。完整离线文件为 `dist/SC2-Survivors-Entry-Fixes-20261009.html`，通用 Current 文件在验证后更新为相同字节。范围见 [加载与自适应界面](ENTRY_FIXES_20261009.md)，实际检查及限制见仓库 `docs/project/ENTRY_FIXES_VALIDATION_20261009.md`。

本轮修复加载步骤反复、取消后的失效预览和慢资源等待提示，批量准备原部队资源并减少无变化的界面刷新。投递建筑保留原血量比例；“返回前线”使用原文和原动作。手机横屏按逻辑 PC 画幅缩放，竖屏同时缩小和重排，卡图、计数、说明、价格、操作与状态都保留。作战部署的续局提示使用正式栏位。离线包只增加 GLB 原字节共享边界，未缩减画质或删减资源。

目标资源为 656 条记录／638 个文件／667894443 字节，资源版本 `f6ac93dc0d0b4c20079e7a7229846026cbbe5d2f48885f3f43ecc35b0e678151`。相对上一份 UI 与战斗反馈包，本轮新增资源为零，全部 638 个文件复用。更早站点可能缺少此前关间 UI 的 9 张图片，实际更新始终校验当前 `resource-groups.json` 全表。包中没有数据库、账号或私有凭据。

沿用原 Coze v10 启动器、vendor、锁定依赖与提供方配置；本地预览显式关闭后端，不修改交付配置。本轮只更新仓库中的交付副本，不执行线上 Coze 发布、数据库或后台操作。schema26／档案v6／地图配方v3 不变；未开始旧存档匹配或迁移。自然战役与性能、实体设备、人工视觉、P6-V01、Science Vessel 来源和生产/B4 门槛仍开放。

以下为 2026-10-07 的历史交接记录，保留当时的文件名、构建号与资源差额。

当前UI保留原R12菜单、R11卡面及R12实时单位面板，并接入UI线程最新动态开屏及统一英文Logo。首页手动封面切换按钮移除，按常用种族自动选择并保留上方锁定，不新增说明。地狱骑士扇形半径按用户要求改为对应普通恶火／恶蝠的2/3，基础10/3与4/3；变形、150°角度、伤害及其他精英定位保留。连续输入仍控制无体积的点，真实部队碰撞、寻路及武器遮挡保留。离线编码容器由Blob改为原编码字符串，避免同时为编码及解码资源分配Blob；原资源和编码数据不变。

战局schema26、地图配方v3、永久档案v6保持不变，只接收当前格式。原稿假价格、假钱包、假兵力及与后续批准机制冲突的说明没有写回玩法。本目录合并了用户指定的 Coze 部署分支 `ed70fe4`，保留其 `sc2-backend.conf` 启用状态、v10 启动逻辑、vendored PGlite 及隐藏后台路径；本轮没有另行部署 Coze 或操作线上数据。

完整游戏：`dist/SC2-Survivors-Current-20261006.html`。Web：`dist/web`。应用：`dist/Opening-Cover-Coze-Application-20261007.zip`，Git的`deploy/coze`保存同一应用。`delivery.json`列出逐文件SHA-256，包身份独立于Web构建身份；包中没有数据库、账号、凭据或游戏资源二进制。PGlite 的程序依赖包含在 vendor 中，不能误删。

最终Web构建 `d502a132ea56395855ae3c1a3e04c0b254692df763ea96750153d82972ed986a`。资源版本 `2848cfe41f50528ce1cc9128edd1e5ddccdf9bd7e889aa15af72df16f3fc287a`，647记录／629文件／648838732字节，零新增游戏资源；开屏及Logo内联原稿五张UI位图。原模型、动作、特效、地图、图片和UI原稿保留。

对已记录的旧Coze资源仍复用531文件、补齐98文件／49639414字节，使用已有 `dist/Current-Coze-Resources-From-Live-20261006.zip`。实际更新须校验全部629目标文件，不能依站点版本号跳过验证。

后续部署时，沿用 [P6增量更新流程](P6_COZE_DEPLOY_20261006.md)，应用路径替换为当前合并包。先验证包、锁定依赖和资源，再切换不可变应用指针；保留原应用、环境、资源和回滚指针。Coze 的直接部署使用包内 vendor，无需在线安装 PGlite；私有 bundle 沿用部署环境，不能提交 Git。资源下载须锁定包含此应用的实际Git提交，不混用旧阶段程序。旧性能／UI应用包及资源增量保留。

本次保留 Coze 分支的后台配置，没有创建生产账号或配置生产PostgreSQL。根目录配置及数据在增量更新时保持原样。只读目录的 `/tmp` 数据重定向不证明跨实例持久性；真实域名、运营方、联系方式、删除日志卷及B4在线验收按 [P5后台交接](P5_BACKEND_HANDOFF_20261006.md) 单独完成。合并与打包说明见 [新 UI 与 Coze 合并](UI_COZE_MAIN_20261007.md)。

范围见 [本轮实施记录](UI_FIDELITY_ROUND_20261006.md)，实际结果见 [本轮验证](UI_FIDELITY_ROUND_VALIDATION_20261006.md) 和 `reports/local/ui-fidelity-round-20261006/delivery.json`。P6-V01、自然／高密度性能、完整M6/M7、人工视觉、物理设备、高刷新率、长期使用、低内存设备和三个科学船来源缺口继续OPEN。诊断存档、固定视图、浏览器尺寸和虚拟输入不是自然战役或实体设备验收。

本轮范围与检查见 [开屏／封面／扇形更新](OPENING_COVER_FLAME_20261007.md)。原UI-Coze-Main应用包与旧完整HTML保留，历史验证记录不改写。

