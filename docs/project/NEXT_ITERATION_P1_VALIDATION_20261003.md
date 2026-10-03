# P1 实际验证与成品 · 2026-10-03

以下为原P1提交`80ca05f`的历史证据；后续用户要求减少常驻文字和缩小英雄字号，新的749项回归、界面状态/音效检查及成品指纹见[视听语言修订](HUD_VISUAL_LANGUAGE_20261003.md)。

本记录用于[地图、队伍与移动布局](NEXT_ITERATION_P1_20261003.md)。用户已批准P0并授权P1；战斗新值仍待后续阶段实施。run schema14/profile v5、素材来源及既有M6/M7等开放项保持。截图、原始报告和构建日志全部保存在本地`reports/local/`，不提交截图或HTML/ZIP到Git。

P1工程实现及本地成品检查已完成；这不关闭实体设备、真实宿主、人工视觉或完整M6/M7验收。Chrome实际版本为`154.0.8037.58`，布局检查采用本地无头浏览器、视口/触控模拟和真实World的冻结诊断场景；成品存读通过实际界面操作，不调用开发调试API。

| 检查 | 实际结果/范围 |
|---|---|
| `npm run typecheck` | 已通过，包含有效视口、折叠状态及单位血条容器修改 |
| `node --import tsx --test test/mobile-viewport.test.ts test/hud-preferences.test.ts` | 5项通过：全屏失败/进入/退出、旋转合并、偏移与稳定尺寸、偏好隔离、存储不可用回退 |
| `npm test` | 最终代码748项通过、0失败/跳过，20.071秒；日志`reports/local/next-p1-tests-final.log`。初轮日志保留于`reports/local/next-p1-tests.log` |
| `npm run docs:check` | 通过：运行数据参考与代码一致 |
| `node --import tsx tools/docs/export-next-iteration-p0.mts --check` | P0批准状态、30/90/18/24覆盖、90精英/18英雄预算及31个本地链接核对通过；不是战斗验收 |
| `node tools/check-mvp-plan.mjs --write-board`及只读复核 | 47任务、13需求、10决策ID一致；不把P1工程结果写成M6/M7验收 |
| `node tools/build-web.mjs` | 实际通过，538资源身份/531独立文件/599,199,318字节均校验；资源发行ID仍为`ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64` |
| `node tools/build-demo.mjs` | 最终离线HTML实际构建通过；415,071,165字节，SHA-256见下文 |
| `node tools/qa-next-p1.mjs` | 最终三族×四尺寸×文字1/1.5倍×四折叠组合，共96布局通过；24组商店尺寸/详情状态、三族键盘折叠、三族触控旋转、分页/查看对象/偏好恢复通过；全屏实际进入/退出、本地HTTP iframe通过 |
| `node --import tsx tools/qa-next-p1-artifacts.mjs` | 生产Web与离线HTML均通过实际新局、折叠、暂停、保存、导出、刷新与读档继续；运行ID、schema、配置、时间、钱包、单位、付款账本及英雄状态保持，生产调试API不存在 |

96布局的尺寸为1440×900、390×844、844×390、667×375。最终报告`reports/local/next-p1-20261003-r3/report.json`记录96布局、32条交互/测量记录、0浏览器错误；检查钱包/价格/继续及技能可见宽度，无横向溢出或地图占位遮挡。三族键盘空格/回车切换地图前后完整战局快照相同。旋转清空旧摇杆输入；旋转前已暂停的战局仍暂停。折叠/展开队伍保留原分页、查看对象与详情状态，页面刷新和新局也保留两个独立偏好。

本地iframe内有效视口与游戏容器均为390×600、原点0/0；宿主故意保留的20px外边距属于游戏容器外部。生产Web的CDP页面缩放1.25倍检查得到有效视口312×675.200、游戏容器312×675.188、血条容器原点0/0，布局断点与画布保持对齐。触控脚本尝试捏合时页面比例未改变，所以不将该记录当作真实捏合缩放通过；1.25倍检查是视口模拟，实体手机缩放仍未验收。成品报告为`reports/local/next-p1-artifacts-20261003/report.json`，Web检查390×844，离线检查844×390且浏览器上下文断网。

本地可运行产物：`dist/web/index.html`（使用本地HTTP服务）及`dist/SC2-Survivors-Demo.html`（独立离线文件）。Web应用构建ID为`6e7956b164648fe712a9319d5ac7144dba4380d06a70bacba5fd2220bb1dea5c`，资源发行ID和资源内容保持9月30日基线。离线HTML为415,071,165字节（395.84MiB），实际文件SHA-256为`a07d66dc3f3c4cad584e686786b5719b3318cb37137a310f32f3ec994e4f8121`。构建日志为`reports/local/next-p1-build-web.log`及`reports/local/next-p1-build-offline.log`，离线分块和同内容共享记录见`reports/local/offline-pack.json`；这些数字记录实际产物，不是包体定额验收。P6的最终应用/独立LFS增量发行和Coze账户部署仍按后续阶段执行。

初轮和第二轮布局各完成三族96状态，并验证24组商店尺寸/详情状态、旋转、暂停与折叠恢复。两轮末尾的iframe检查分别超时30秒/120秒；宿主是`about:blank`的空白测试页面，不能将该失败记为通过。改用本地有效HTTP宿主后，最终完整脚本通过；原始失败分别保留于`reports/local/next-p1-20261003/report.json`和`reports/local/next-p1-20261003-r2/report.json`。截图还揭示了横屏大字时指令被英雄栏挤掉的问题，已给两组保留独立滚动宽度；最终检查新增了实际可见宽度断言。成品存读脚本初次误读导出包的`run`层级而失败，改为`readArchive(...).bundle`后Web/离线均通过；失败记录保留于`reports/local/next-p1-artifacts-20261003/first-failure.json`。

本阶段没有云端部署、数据上报、原素材/缓存清理或原资源替换。既有瞬时欠账0.11663秒、自然后期/完整M6、M7、用户视觉、实体手机/手柄与三款科技球源死亡片段仍OPEN。本地HTTP嵌入页只验证容器内布局，不代表Coze宿主上线或外部留白已验收。
