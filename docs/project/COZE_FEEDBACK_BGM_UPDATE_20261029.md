# Coze 本批反馈与 BGM 更新

2026-10-29。按用户要求准备本地更新包与部署步骤，**尚未部署 Coze、Sites 或阿里云**。本包包含已推送的关间操作、装备批量与一键散件换装、商店资格/权重、菜单按键音、两首 BGM、孤星/无尽及全来源掉落调整；也累积此前 Safari 续局与关间音频准备修复。无需先安装上一份四文件补丁。

源码基线为 GitHub「体积优化版」`674c528ee8657f7b2f6ba743e2aac6c13f644eec`，功能提交 `adcf9a8`。本次生成的是 Coze 静态前端增量，不替换现有后台、认证、数据库、域名或玩家数据；没有改动共享 Sites 发布快照。

## 交付文件

- [Coze-Feedback-BGM-Update.zip](../../dist/coze-feedback-bgm-20261029/Coze-Feedback-BGM-Update.zip)：13,415,520 字节，约 13.4 MB。
- [CHECKSUMS.json](../../dist/coze-feedback-bgm-20261029/CHECKSUMS.json)：整包 SHA-256 与 ZIP 读回结果。
- 包内 `README.md`：可直接交给 Coze 部署助手的完整步骤。
- 包内 `PATCH-MANIFEST.json`：7 个更新文件的长度、SHA-256、切换顺序，以及应保留的现有依赖。

ZIP SHA-256：`af207c95d83785464c36320b1052a855d8069b641c93415e537e99263ab76544`。

`public/` 要合并到现有 Coze 工程的实际静态根目录，不能作为完整站点替换工程。两首 MP3 合计 4,526,957 字节，保持已确认音频字节，不再压缩或改变听感；菜单曲约 153 秒，关间曲约 113 秒，默认背景音乐音量 15%。

| 标识 | 值 |
| --- | --- |
| 原 Coze 网址 | https://sc-survivors.coze.site |
| 本次公开 GET 读到的线上 appBuildId | `fb923fd9ec6430f39c00c0a96400b020a82932ffd4babe4e2a0bbf94a4a457c5` |
| 必需的旧资源 release | `ae1ee84c46fba61f6d2ab38a19032991daaf5bd0f3e127d0ac43371577355bb2` |
| 目标 appBuildId | `b785addbf5e8ed98de78dd8363d1c9d87cf2a03915c30918df8e2eeef856bc67` |
| 新资源 release | `50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a` |
| 压缩主程序 SHA-256 | `4145d8b6cab2a55286c55eaf1b5551fc0a574ba2ddcfc836b43084e7585189e3` |
| 存档与规则 | Run schema 26、profile v6、archive v2、rules `mvp-1.0`，保持 |

## 包内更新范围

以下路径相对现有静态根目录：

| 文件 | 字节数 | 用途 |
| --- | ---: | --- |
| `assets/a8b4c87df6e68a28e834bf81595453dcfb7a24c19c4fe1dea2fbd43b17453ca0.mp3` | 2,573,610 | 菜单与局外舰装 BGM |
| `assets/b5c5fc434632765c636690c12ebd76d5c132fb971517bbe35d6594049bf9974c.mp3` | 1,953,347 | 关间与结算 BGM |
| `assets/index-7e155d295a2cdab9.js` | 4,018 | 新启动器 |
| `assets/sc2-entry.4145d8b6cab2a552.js.gz` | 7,673,847 | 累积本批修复的正式程序 |
| `asset-manifest.50c5462e64fed40b39fe61da8d479b108fd6b3550f75d6ceb44f9dc45780474a.json` | 2,309,774 | 新清单，增加两个音乐资源 |
| `index.html` | 955,167 | 最后切换的入口 |
| `web-release.json` | 1,121 | 最后切换的版本描述 |

原 3,845 条资源、三档品质变体、43 条 GPU 贴图记录及资源包索引保持。新清单共 3,847 条资源，含变体和 GPU 贴图的唯一文件数为 5,138，逻辑字节与去重字节已核对。MP3 独立提供，原资源包不重打；旧 CSS、SW、固定索引、basis 解码器、资源合包及独立 KTX2 都继续保留。

## 部署步骤

1. **先备份。** 在原手机游戏设置中导出存档，保留下载文件。部署方备份原工程部署版本及当前 `index.html`、`web-release.json`。继续使用原 Coze 项目和网址。
2. **核对基线与更新包。** 用带一次性查询参数的 `/web-release.json` 核对旧资源 release 和 schema；若不符合上表，先停止应用并重新核对。当前公开读取的 `runtime-config.json` 为 `{"assetBaseUrl":""}`，音乐仍与游戏同源。核对 ZIP 及包内 7 文件 SHA-256，不保存 GitHub 预览网页来代替二进制文件。
3. **先放新资源与程序。** 将 `public/assets/` 的四个文件及新资源清单加入现有静态目录。确认两首 MP3、新启动器、压缩主程序和新清单均可访问、长度和 SHA 正确。保留所有旧 hash 文件，不删除原资源目录。包内 `retainedFiles` 给出现有依赖，未重新打入 ZIP。
4. **同一次发布切换入口。** 最后更新 `index.html` 和 `web-release.json`。沿用 Coze 现有构建和发布流程；只合并这批静态文件，不用主仓库 Sites 工程替换 Coze 的后台与认证。用户本次仅授权准备包，实际发布需等后续部署授权。
5. **核对缓存与类型。** 根页、`index.html`、`web-release.json` 使用 `no-cache`，`runtime-config.json` 使用 `no-cache` 或 `no-store`。hash 命名的程序、清单和 MP3 可使用长期 `immutable`；MP3 类型为 `audio/mpeg`。`.js.gz` 是启动器自行解压的原始文件，不额外设置导致浏览器自动解压的 `Content-Encoding`。本次公开读取发现两个 JSON 仍为一年 `immutable`，需在实际部署时修正。
6. **实际核验后记录部署号。** 对照下节检查入口、音乐、保存和原有后台；记录 Coze 实际部署号、时间和结果。GitHub 已推送或 ZIP 已生成均不代表 Coze 已更新。

## 发布后检查与回退

- 重新打开原网址，页面 `meta[name="sc2-app-build"]` 与 `/web-release.json` 都应等于目标 appBuildId，新资源 release 应为 `50c5462e…`；schema 仍为 26。Coze 可能注入页面脚本，因此 HTML 整文件 hash 可有差异，但应用标识、清单及启动器引用必须正确，新增静态资源字节必须一致。
- 点击菜单或设置后应播放菜单曲；正常关间应播放另一首，进入战斗时淡出。音量可以静音，刷新后设置保留；菜单按键音和原战斗音效仍正常。手机浏览器首次播放可能需要一次真实点击，不应靠自动播放判断音乐缺失。
- 原 iPhone 17 Pro 用原网址、原浏览器、原画质和原存档，核对继续游戏、装备/资源、两个正常关间及一次关间刷新恢复；记录是否仍自动刷新。不要清网站数据或导入检测存档。检查原有反馈和后台接口，前端包不替代后台验收。
- 若失败，恢复原部署版本，或恢复备份的两份入口文件，并核对旧 appBuildId 与旧清单。保留新旧所有 hash 文件和玩家数据；不通过删存档、换域名或注销 SW 代替回退。
- 回退到不支持 BGM 的旧版后再升级，应重新检查背景音乐音量。本地样本从 1% 回到默认 15%；同一新版内刷新保存音量已通过。

## 本地验证与范围

正式构建输出在独立目录；应用标识与已通过规则验证的候选 `b785addb` 一致。构建首次收尾因新父目录未创建而失败；核对已完成的 staging 后创建父目录并移入目标，未改变构建内容。ZIP 九个条目（7 文件、README、清单）全部解压读回一致；7 个更新文件及 366 个保留依赖完成本机逐文件 SHA 核对。旧资源清单、SW、固定索引、CSS 和两份 basis 解码器的公开在线 GET 与本地基线逐字节一致；未读取线上数据库、管理界面或真实玩家档案。

独立 Chrome、844×390 模拟触屏及模拟音频输出下，解压后的正式压缩入口通过：7 文件 HTTP 字节一致；菜单曲真实加载、播放时钟推进、静音和音量刷新保留；正常首战运行超过 5 秒并淡出 BGM；合成关间档由正式设置导入、播放关间曲并刷新续局；同一本机网址回退旧候选入口 `88e920c3…`，再重新应用新包并继续同一局。最终页面错误和 HTTP 失败均为 0，已查看设置、战场和关间截图。首轮检测仅因测试服务缺少 `/api/config` 返回 404 而未通过；补接本机关闭状态的后台接口后整段复验通过，游戏包未修改。

这是本机候选 `88e920c3…` 的入口回退检查，不是实际 Coze 发布或线上旧版 `fb923fd9…` 的回退演练；合成档不代表所有玩家档案。未验证真实后台、物理扬声器或 iPhone。完整结果见[简要交付报告](../../reports/qa/coze-feedback-bgm-delivery-20261029.json)。规则验证复用同一源码的[关间操作](FEEDBACK_ACTIONS_20261029.md)、[BGM](BGM_INTEGRATION_20261029.md)和[孤星/无尽/掉落结果](GROWTH_LOOT_IMPLEMENTATION_20261029.md)，本轮不重复全量游戏矩阵。

原 iPhone 听感与恢复、后期压力、掉落高收益组合仍未全部验收。用户决定暂时保留当前平衡；这次打包不更改参数、不关闭上述事项。

完成后已清理本次原始 Web、中间压缩目录、截图、详细日志和合成存档；保留 ZIP、可查看的增量目录、校验清单、复现工具与简要报告。本次新增交付工具和记录保持本地，线上与共享 Sites 快照均未更新。

复现工具：`tools/package-coze-feedback-bgm.mjs`、`tools/verify-coze-feedback-bgm.mts`。前者锁定本批源码与旧压缩快照，需要先创建输出父目录、设置 `SC2_WEB_OUTPUT=dist/coze-feedback-bgm-20261029/web` 并运行 `npm run build:web`，且输出 `packed` 与 `Coze-Feedback-BGM-Update` 尚不存在；使用 Python 标准库生成 ZIP 并逐条读回。不要覆盖当前保留交付。后者通过 `node --import tsx` 运行，读取 ZIP 实际解压到 `reports/local/coze-feedback-bgm-20261029/unpacked` 的文件，合并旧资源启动独立服务，并生成合成存档。检测文件不进入交付包，完成后按保留规则删除。
