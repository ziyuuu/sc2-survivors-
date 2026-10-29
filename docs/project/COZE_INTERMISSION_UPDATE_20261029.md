# Coze 关间性能优化更新

2026-10-29。本轮优化已提交并推送至 GitHub「体积优化版」，代码提交为`854fe1f2b61250d1371094f8520af7125ffcdf9f`，远端已核对。用户随后自行更新 Coze、使用原 iPhone 17 Pro 复测。本记录提供当前 Coze 压缩前端的增量更新步骤；尚未执行 Coze 或 Sites 部署。

## 本次更新内容与身份

包含关间音频重复解码修复，以及上一批已推送的 Safari 续局资源准备修复。原音源、画质、玩法、资源版本、Run schema 26 保持。11项试玩反馈中的掉落、撤离、批量装备操作、按钮声音、BGM和商店规则尚未实施。

本机固定场景的普通／无尽16关间准备中位数分别为1384.2→77.2 ms、1806.6→136.5 ms；这是Windows Chrome模拟触屏预算的有限对照，不能当作原iPhone结果。详见[性能结果](FEEDBACK_PERFORMANCE_20261029.md)与[Safari候选](SAFARI_RESTORE_20261029.md)。

| 项目 | 本次值 |
| --- | --- |
| 已核对的原Coze入口 | https://sc-survivors.coze.site |
| 更新前线上appBuildId | `fb923fd9ec6430f39c00c0a96400b020a82932ffd4babe4e2a0bbf94a4a457c5` |
| 目标appBuildId | `88e920c3b848e76f20f4de7c5cf895d8facd7f29d0b99868866c2698b4a6a4fa` |
| 保持的资源release | `ae1ee84c46fba61f6d2ab38a19032991daaf5bd0f3e127d0ac43371577355bb2` |
| 压缩主程序SHA-256 | `faa5306eeb61f78acd41b9b2533259493436247c37f92db37273512683b3fea3` |
| 本地更新包 | `dist/intermission-release-20261029/Coze-Intermission-Update.zip` |
| 更新包长度／SHA-256 | 8,376,506字节／`011b57e23d5369956fdd4117f29366107641c671b62acc73ef38aa78d2b3f587` |

2026-10-29再次公开GET核对：Coze根页和web-release.json均200，应用仍是上表旧版、资源release相同。根页为no-cache，web-release.json仍为一年immutable，需要在本次Coze更新时修正其响应缓存策略。未读取Coze项目设置或部署后台，不假设GitHub推送会自动部署。

## 更新步骤

1. 在原手机的游戏设置中导出存档，并保留下载文件。Coze继续使用现有项目、原网址和当前服务。部署方先备份现有`index.html`、`web-release.json`及当前部署版本标识。
2. 将上述ZIP交给现有Coze项目的开发助手，或从仓库`ziyuuu/sc2-survivors-`的固定提交`854fe1f2b61250d1371094f8520af7125ffcdf9f`提取下表4个文件。ZIP里的`public/`是增量目录，按当前Coze实际静态根目录合并覆盖。不能将整个`sites/size-optimized-site`作为Coze工程替换：其中的Sites认证、Workers和数据库不是现有Coze后台。
3. 先核对线上资源release与上表一致；若不同，先重新比对资源兼容性。先加入两个新hash程序文件，再一起切换`index.html`和`web-release.json`。保留旧hash程序、资源合包、43份独立KTX2、资源清单/索引、SW、basis、现有接口及数据。增量包没有重发这些资源，也不包含测试入口或测试存档。
4. 沿用现有Coze发布流程更新原项目。让根页、`index.html`与`web-release.json`使用no-cache；hash资源继续immutable。`*.js.gz`是启动器自行解压的文件，保持原始gzip字节，不额外设置会使浏览器自动解压的Content-Encoding。
5. 发布后核对下列验收项；记录Coze实际部署号及结果。仅GitHub提交成功、发布按钮完成或版本文字正确均不足以代替文件与入口核验。

| 覆盖路径（相对Coze静态目录） | 仓库来源（相对仓库根） | 字节数 |
| --- | --- | ---: |
| `assets/index-ca1494ca74ce0cea.js` | `sites/size-optimized-site/public/assets/index-ca1494ca74ce0cea.js` | 4,018 |
| `assets/sc2-entry.faa5306eeb61f78a.js.gz` | `sites/size-optimized-site/public/assets/sc2-entry.faa5306eeb61f78a.js.gz` | 7,670,504 |
| `index.html` | `sites/size-optimized-site/public/index.html` | 955,167 |
| `web-release.json` | `sites/size-optimized-site/public/web-release.json` | 971 |

每个文件完整SHA见包内`PATCH-MANIFEST.json`及[交付校验记录](../../reports/qa/intermission-delivery-20261029.json)。若从Git下载，提取原始文件字节，不能把GitHub文件预览网页当作资源保存。

## 发布后核验与回退

- 使用带一次性查询参数的根页和`/web-release.json`检查最新内容；页面的`meta[name="sc2-app-build"]`与JSON的`appBuildId`均应等于目标值，资源release和schema仍与上表一致。
- 新启动器与压缩主程序均应200，长度及SHA与清单相同。Coze可能注入自己的页面脚本，因此在线HTML整文件hash可变化，须另外核对其应用标识和启动器引用；静态程序文件应保持逐字节一致。
- 检查菜单进入、继续游戏、声音、原有反馈/后台接口及43份独立KTX2仍可访问。线上完整验证及原手机体验由本次实际部署后补充，不能复用本机检查宣称通过。
- 若更新失败，恢复事先备份的两份入口文件／原部署版本，保留旧hash程序和所有资源。再次核对旧appBuildId与入口可用性；不要删除玩家存档或改变原域名。

## 原iPhone 17 Pro复测

1. 使用之前相同的浏览器、原网址、画质和存档。导出备份后关闭其他游戏标签，更新完成再重新打开；不要清除网站数据，也不要注销SW或导入测试档。
2. 先点“继续游戏”，记录能否越过此前约35%的位置，装备、资源与当前关间是否一致。
3. 从现有存档正常通过两个关间；若仍有无尽存档，优先复测无尽后续关间。记录每次载入大概多久、是否出现新单位/新资源、是否自动刷新，以及声音能否正常播放。
4. 到下一个成功保存的关间后，主动刷新一次再继续，核对进度和装备。若发生自动刷新，记录关卡、当时动作及载入进度；原机刷新原因仍未确定。

第一次准备新资源仍可能显示加载；本次目标是消除已准备音频的反复解码，不能保证所有后期转场完全不出现载入页。

## 本机交付核验与同步

- 正式Web构建和压缩入口更新完成；4文件ZIP内容、工作区快照与本机HTTP入口逐字节一致，资源release/schema保持。
- Windows Chrome、中档、模拟触屏预算：使用正常菜单进入首战并运行超过5秒，无页面错误、资源HTTP错误或图形上下文丢失；已查看实际战场截图。这是正式压缩入口的功能冒烟，不是iOS性能结论。
- 源码回归沿用同一最终音频源码的已完成证据：核心修复2771项，最后保护补充后的51项定向、类型和数据检查通过。本次仅构建与打包，没有再次修改游戏逻辑。
- 同步状态：19个明确文件已进入代码提交`854fe1f2b61250d1371094f8520af7125ffcdf9f`，推送到GitHub「体积优化版」并通过`ls-remote`核对；提交内4个运行文件与测试包逐字节一致。main仍为`2924d9b`；本条后续记录提交不改变已验证代码和前端。Coze/Sites尚未部署，原机仍待复测。
- 已清理完成的入口截图、详细日志和中间Web/压缩构建，保留ZIP与其增量目录供本次Coze更新使用。旧资源、正式候选和其他线程现场未纳入本次清理或提交。
