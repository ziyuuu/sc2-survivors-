# P1 界面反馈修订 · 2026-10-03

用户直接反馈常驻文字过多、英雄名字等字体过大，要求用游戏视听语言传达变化。这次修改承接已完成P1，属于表现调整，不提前执行P2—P6战斗机制。

战斗界面以原单位/英雄肖像、血盾条、冷却遮罩、必要倒计时、技能高亮和失效标记呈现状态。英雄名字作为较小辅助标签，技能描述、精确参数和长解释放到悬停/键盘提示或点击单位详情。单位详情默认收起，桌面不再固定展示参数表；空位用暗肖像表达，不重复打印空位/待招募/阵亡。地图和队伍折叠使用固定44px图标按钮，保留可访问名称和折叠状态。

资源、阶段、时间、价格和支付/替换等决策仍清晰可读。去掉战斗品牌、反复任务教学与冗长日常提示；重要异常/无法执行原因仍用简短提示表达。地图/技能的真实动作、发射命中效果保留，英雄技能发射使用已经本地加载的音效，避免只靠文字回应施放；复用音效不称为该英雄原作专属音频。

终关三个必要条件保留为主巢、雷兽首领、生存计时的图标与进度，完成后打勾；名称与状态通过提示/可访问名称提供。读取既有主巢生命、首领击杀收据与计时，不修改通关判断。进度按整数百分比绘制，保持HUD缓存对稳定标记的复用；0→3完成标记和悬停不改变战局的诊断检查通过。

不改World、伤害、冷却、经济、随机商品、付款、schema14/profile v5或素材发行。旧P1证据对应提交`80ca05f27467beccd3fb1c2053fa7025f263aaa4`，本次成品和检查另记于下文。原资源、截图、缓存及旧未跟踪文件没有清理或替换。

英雄名字默认11px（原为16px），文字设置1.5倍时为16.5px（原为24px）；字号设置仍作用于需要阅读的内容，交互热区至少44px。英雄小标签与肖像不再常驻重复技能名称/冷却句子。单位查看器只有用户点选时出现，精确属性和英雄技能仍可查看。高亮、失效标记、倒计时和血盾状态不只依赖颜色。

| 实际检查 | 结果与本地证据 |
|---|---|
| `npm run typecheck` / `npm run docs:check` | 通过；运行数据参考一致 |
| `node --import tsx tools/docs/export-next-iteration-p0.mts --check` | P0覆盖、批准状态及预算一致；仅文档检查 |
| `npm test` | 最终749项通过、0失败/跳过，41.450秒；`reports/local/hud-visual-language-tests-final.log` |
| `$env:QA_OUT='reports/local/hud-visual-language-20261003'; node tools/qa-next-p1.mjs` | 三族×四尺寸×两种文字设置×四种折叠组合，共96布局；24商店状态、旋转/暂停/偏好、全屏进入/退出和390×600本地HTTP iframe通过，0浏览器错误 |
| `node tools/qa-hud-visual-language.mjs` | 施放/冷却/就绪/阵亡、图标可访问名称、按需英雄详情及8组四尺寸/文字设置检查通过；关闭按钮44×44、详情在控制台上方且可滚动；`reports/local/hud-visual-language-cues-20261003/report.json` |
| `node tools/build-web.mjs` / `node tools/build-demo.mjs` | 最终生产Web与离线HTML构建通过，538资源身份/531独立文件/599,199,318字节重新核验；没有新增原素材 |
| `$env:QA_OUT='reports/local/hud-visual-language-artifacts-20261003'; node --import tsx tools/qa-next-p1-artifacts.mjs` | 最终生产Web和断网离线HTML实际新局、折叠、保存、导出、刷新与读档恢复通过；配置/时间/钱包/单位/付款/英雄状态保持，生产调试API不存在；0浏览器错误 |

最终生产成品报告在`reports/local/hud-visual-language-artifacts-20261003/report.json`。Web采用390×844，离线采用844×390且上下文断网；另检查生产Web的1.25倍视口模拟，画布/血条容器仍对齐。此处不称为真实手机捏合或Coze宿主验收。

布局截图在`reports/local/hud-visual-language-20261003/`；查看器在1440×900、390×844、844×390和667×375分别检查文字1/1.5倍。冷却遮罩从95%降到65%，技能发射实际音频播放计数增加，冻结画面400ms不重播。单独的音效回归验证同一事件跨60次更新只播一次，陈旧/远处事件不播；这是播放工程证据，不是人工听感验收。技能发射复用已加载的攻击/本地合成音效，不称为该英雄原作专属音频。

Web应用构建ID为`31df30b3ed0ea69223f9417985abfb2eec9438b96cd6eec51afd10b8b54ccbb0`。资源发行ID保留`ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64`。最终离线文件`dist/SC2-Survivors-Demo.html`为415,080,535字节（395.85MiB），SHA-256为`b5a651d77dda68f0350b2da9ae4402c3f52202a44886c690cdd6a229cfef7943`。日志分别在`reports/local/hud-visual-language-build-web-final.log`与`reports/local/hud-visual-language-build-offline-final.log`；没有向Git新增离线HTML、ZIP或截图。

新增诊断首次未重建新敌人的空间索引，导致施放按钮合法禁用；修正诊断场景后施放通过。随后实际固定步检查发现冷却合法就绪时，浮点余量仍让UI显示1秒；界面现在沿用运行就绪的`1e-8`精度，实际冷却不变。失败分别保留于`first-failure.json`与`ready-boundary-failure.json`，最终完整检查通过。首次`npm test`被沙箱子进程权限`EPERM`阻止，允许本地测试进程后最终749项通过；原失败日志保留。

实体手机/手柄、Safari、真实Coze宿主、人工视觉/听感、完整自然M6/M7、已记录的瞬时欠账以及三款全息科技球原始死亡片段继续OPEN。本地Chrome冻结诊断、截屏、播放计数与本地iframe都不代替这些验收；没有云端部署或数据采集。
