# 近期更新双分支合流 · 2026-11-20

核验与本地双分支合流已完成。游戏更新提交为 `main` 的 `ca8c87a6` 与 `体积优化版` 的 `47888bea`；其后仅补充本报告、看板和导航收尾记录。用户授权范围为核验及本地合流；未推送、部署或替换线上版本。

纳入人族三分支和六个新家族、虫族六个新家族、战役／无尽的正常新敌与独立体验敌群、近期表现和资源修复，以及虫群增殖45张卡已确认设计与接口。虫族仍为16个正式家族、基础5个选用槽。45张卡运行时尚未实现；感染孢子的设计只允许爪击、骨刺等物理武器，明确排除酸液／毒液普攻。

两分支647份游戏源码与4320份已跟踪运行资源完全一致，保留各自交付结构。原始模型目录合并保留体积优化侧独有的31条来源记录，共652条；解放者对地形态及死亡资源补入正式资源登记。体积优化工作区原有的无关预览、实验和媒体改动未整批提交。

| 对象 | 核验值 |
| --- | --- |
| 两分支 `src` Git tree | `13ca07f951c03c3ef319c7e91212b5ee072fed6c` |
| 两分支 `deploy/runtime` Git tree | `1e4234e7dc19451bf48a3f70409e276780b86631` |
| 同版应用标识 | `1ccb8fc08ee7423aadd1be84fb5b2d34e9393ca566ef59eb3dfd6f516fa6e71d` |
| 原画质资源标识 | `ca1b2c00da27f8b7604fed04324589caf676b57b94eab16de13a5a937dcc73f7` |
| 压缩资源标识 | `db9aca87dd4cf27c63de48da10968d332ee4083dd1c3a9aff611ead8e496123b` |
| 正式资源 | 4161项；原画质4036个文件、1,604,911,623字节 |
| 压缩资源包 | 526,169,364字节；这是资源包体积，不是整个应用下载量 |
| 压缩增量 | 复用3952项，新增209项、106个画质变体、31个资源包；既有原资源映射修改／删除均为0 |

已将核验过的压缩结果安装到 `D:/星际/sites/size-optimized-site/public`，交付清单同步为443项。压缩入口、Service Worker、211处模型身份引用及所有画质档资源使用同一候选。提交前分别核对188／183个LFS对象的指针、尺寸和真实载荷哈希。

| 本轮实际检查 | 结果与边界 |
| --- | --- |
| `main` 完整回归 | 3457通过，0失败／取消／跳过 |
| `体积优化版` 完整回归 | 3457通过，0失败／取消／跳过 |
| 两分支类型、数据文档 | 均通过 |
| 45张卡接口静态核验 | 两分支通过；31个现存文件94个入口，42项未来验收；不代表已接线或战斗测试 |
| 虫族资源 | 81项通过；模型来源合并后的25项针对回归通过 |
| 原画质与压缩资源 | 5560个唯一载荷的尺寸／SHA、869个GLB、入口及Worker哈希通过；安装后的压缩目录再次通过 |
| 原画质虫族友方 | 六个家族逐一走通零资源解锁、生产、真实拾取入编、关间导出／导入及下一关 |
| 压缩版虫族友方 | 感染虫、虫群宿主正式流程通过；其余四个新家族在压缩敌群检查的友军编队中实际加载和作战 |
| 原画质敌群恢复 | 第12关活动战斗恢复后继续运行；采样中正常新母体入场2只、体验敌入场205只、体验击杀185、普通击杀30 |
| 压缩版敌群恢复 | 同档恢复后继续运行；采样中正常新母体入场1只、体验敌入场201只、体验击杀184、普通击杀30 |
| 压缩版人族 | 桌面1440×900、横屏844×390、竖屏390×844三组正式购卡、下一关、六单位技能、非零音频、保存和恢复全部通过，页面／资源错误0；桌面另测零资源解锁／生产及撤离。横竖屏为Chrome触摸模拟 |

敌群两次采样起止时间不同，不能按入场数量直接比较两版行为。原画质采样34.033–40.567秒，压缩版34.100–39.467秒；均为143帧，帧间隔p95约66.6／50.1毫秒。它们是桌面无头Chrome的有限恢复场景，**不是同条件性能对照，也不证明相对上轮约100毫秒的性能改善**。两入口敌群检查的页面／音频错误均为0，实际画面已查看。

本轮保留以下限制与处理记录：

- 首轮完整回归受沙箱本机回环连接EACCES影响；在允许本机回环的环境重跑单项及完整轮后通过，未据此改游戏逻辑。
- 首次原画质敌群检查在其他重型检查同时运行时超时，停在GPU准备296/317；串行重跑通过。后续浏览器检查均串行。
- 压缩重建首次缺少可重建的虫族模型别名，恢复后通过。旧检查服务器按裸文件读取压缩资源会报ENOENT；新增 `qa-release-server.mjs` 自动选用原画质或压缩入口，随后用实际Service Worker链路复验通过。
- 已有改动含8处行尾空白／文件尾空行，未为格式整理改动已核验运行源码；没有把 `git diff --check` 记为通过。
- 三种尺寸的代表性画面已查看，横屏的大型空中模型仍可能被画面上沿裁切；本轮未改镜头，也不替代用户画面验收。
- [虫族敌方第三阶段](zerg-six-integration-20261120.md)继续为待验证：真实设备、完整自然长轮及R2表中未覆盖的边缘组合保持开放。既有10,000次体验击杀与救援隔离结论见原接入报告，不扩大为穷尽实战验证。V05保持原状态和下一项。

可复现方式（PowerShell；浏览器检查串行，需允许本机回环和启动Chrome）：

```powershell
# 各分支分别运行
npm test
npm run typecheck
npm run docs:check
node tools/qa-zerg-swarm-interfaces.mjs
node tools/zerg-six-assets.mjs --check

# 在main工作区重建原画质候选
$env:SC2_WEB_OUTPUT = 'dist/dual-branch-20261120/web'
npm run build:web
$env:SC2_ZERG_WEB = $env:SC2_WEB_OUTPUT
node --import tsx tools/qa-zerg-six-campaign.mts
node --import tsx tools/qa-zerg-enemy-web.mts --resume-active
```

```powershell
# 在D:/星际检查已纳入分支的压缩交付
$taskOriginal = 'C:/Users/zyuu/.codex/worktrees/v14-main-integration/星际/dist/dual-branch-20261120/web'
$taskPacked = 'D:/星际/sites/size-optimized-site/public'
node tools/qa-dual-branch-resources.mjs $taskOriginal $taskPacked
$env:SC2_ZERG_WEB = $taskPacked
$env:SC2_QA_FAMILIES = 'infestor,swarm_host'
node --import tsx tools/qa-zerg-six-campaign.mts
node --import tsx tools/qa-zerg-enemy-web.mts --resume-active
$env:SC2_TERRAN_WEB = $taskPacked
$env:SC2_TERRAN_QA_OUTPUT = 'reports/local/dual-branch-20261120/terran'
node --import tsx tools/qa-terran-six-packaged.mts

# 从当前压缩基线重建时没有新增资源；本轮从ad28ddbc基线处理的增量为209
$env:SC2_EXPECTED_NEW_ASSETS = '0'
$env:SC2_PACK_OUTPUT = 'dist/dual-branch-20261120/packed'
$env:SC2_PACK_QA_OUTPUT = 'reports/local/dual-branch-20261120'
node tools/build-armed-audit-pack.mjs $taskOriginal
```

已删除本轮4616个临时构建、截图、合成测试存档和详细日志文件，共2,199,375,651字节（约2.048GiB）。保留本结论、复现工具、Git记录、原始资料与分支实际交付资源。测试自建浏览器／服务器已正常关闭；用户原有15302开发服务已核对HTTP 200，保持运行。
