# 三族独有趣味卡、缓存与增量交付验证

## 范围与基线

基线main `dd6275ffabcb480a19fff03ef4d1437e077aaa4e`。本轮保留工作区修改，无磁盘清理、历史重写或旧开发战局兼容。唯一规则稿为[RACE_FUN_CACHE_20260929.md](RACE_FUN_CACHE_20260929.md)。战局schema13；永久档案v5、三族余额/预设/配点不改。

## 已运行的工程检查

- `npm run typecheck`：通过。
- `npm test`：734/734通过；最后复测734/734，64.663秒。含独有卡时序、状态冻结/存读、缓存损坏恢复与并发去重、增量更新失败保留旧入口。日志：`reports/race-fun-tests-release.log`，较早的完整结果保留在`reports/race-fun-tests-final.log`。
- 三族各2500页抽样：每族8张趣味卡均出现、允许同页不同趣味卡、品质先抽、有效首格趣味比例在22%—28%统计区间内；无跨族卡与同页重复。
- `npm run docs:data`、`npm run docs:check`：通过。
- 离线与Web构建已执行；最终产物散列在本报告交付段记录。

## 浏览器与资源证据

- `tools/qa-race-fun.mjs`：三族发展/商店/下一关、主动入口与触屏取消/确认通过；1440×900、390×844、844×390、667×375、930×430共15组布局，小地图左上8px、无水平溢出，短横屏控制台128px；暂停/关间仍可见、面板避让地图，浏览器错误为空。最后结果`reports/race-fun-layout-release.log`；材料仅本地：`reports/local/race-fun-browser/`。
- `tools/qa-cache-bytes.mjs`：实际HTTP资源读取器、普通持久浏览器配置，完整730文件458,372,920字节；彻底关闭浏览器再启动，下载0、复用458,372,920字节。不是只验证一个模拟缓存接口。证据`reports/local/race-fun-cache/cache-menu-debug.json`。
- `tools/qa-race-fun-presentations.mjs`：真实World/渲染、人工构造的卡牌触发；不属于自然平衡或用户视觉签收。逐卡材料仅保存在本地。
- 可见Chrome缓存流程记录首次游玩、同页重开、再访、显卡恢复与更新后访问；同一页面复用已解码模型与显卡准备键。时间受本机其他任务影响，不作为M6帧率验收。
- 正常新局自动缓存：首次下载299,609,464字节/680文件，同页重开无新增下载；完整浏览器退出再启动，下载0、缓存复用299,609,464字节。显卡上下文恢复不重新下载；内容不变的应用再访，菜单下载0。证据`reports/local/race-fun-cache/report.json`。
- 上述首次准备333.397秒、同页重开7.138秒、浏览器重启后准备177.101秒。机器同时运行其他诊断，不能当作受控速度对比；重新解析/GPU准备仍有长等待，未宣称已达到快速进入的最终体验目标。
- `test:browser:save`：新局虫族困难、相反菜单偏好下原难度暂停恢复、无尽平地60秒轮次及存读通过；加入虚拟手柄D-pad导航至战术技能、A键真实激活。`reports/race-fun-browser-save-r2.log`。`test:offline:save`：断网单文件神族简单新建、保存、读取通过，`reports/race-fun-offline-save.log`。
- 菜单虚拟手柄与触屏返回流程通过：`reports/race-fun-input-menu.log`。这不是实体手柄或手机验证。

## 查实并修正的问题

1. 原新增模型预热会重复处理整张场景；现改为隔离新增批次编译/上传，仅新增批次首次屏幕准备。上下文丢失清除显卡准备键，资源字节缓存保留。
2. 正常加载与可选预下载交叠时可能重复下载同一内容，现共享在途任务，专项测试验证只发一个请求。
3. 趣味卡曾共用group去重而限制一页只能一张，已改为稳定ID去重。
4. 跳弹冻结地空资格，原射手死亡不使原地面武器获得对空。
5. 增量基线使用Git HEAD已提交资源清单，避免重复本地打包吞掉尚未发布差量；Coze全目录按原字节进入Git，避免换行转换破坏交付散列。
6. 发现子进程读取Git基线失败时被误当成首次发布，已移除吞错回退；现在失败即停止，首次发行必须显式`--first-release`。
7. 暂停时的小地图隐藏条件及旧CSS隐藏规则一并移除；棱镜持续扫射增加持续束心，避免两次伤害脉冲之间消失。均只影响表现。
8. Git暂存字节核验发现旧服务/下载脚本仍保留历史换行转换；按新的原字节交付规则重新暂存后，14个应用文件与delivery清单完全一致。

## 保留的失败与限制

- 初版就绪构造器直接监听document造成2个Node回归失败，监听已移到app入口，全量复测通过。
- 早期浏览器诊断有超时/主动中止，包含前台解析与预热长等待；不是通过结果。测试日志保留，不用后续一次通过掩盖。
- 私有/临时浏览器上下文关闭后复访曾重复下载299,609,464字节，记为失败；后续普通持久配置通过，不据此承诺所有浏览器上下文均持久保存。失败证据`reports/local/race-fun-cache/private-context-failure.json`。
- 三族300敌起始、全部独有卡3层、锁血600固定步CPU诊断：P95分别16.754/14.093/14.915ms，P99分别24.944/18.269/22.336ms，最高126.030/109.107/103.055ms，快照均有效。无GPU、非自然战局，长步仍存在，不作为60FPS达标。`reports/local/race-fun-pressure/report.json`。
- 24张卡均留有真实World构造触发的桌面截图，渲染错误为空。截图为看清效果临时隐藏暂停遮罩；不是完整自然战斗的逐帧视觉签收。神族束心修复另有8张补测；逐卡窄屏动效、原版粒子还原度和主观爽感仍需验收。
- 人工观感、真实手机/实体手柄、完整自然三族前六关及后期/无尽性能、原版死亡表现缺口、M6/M7继续开放。无锁血或构造战斗结果冒充自然通关。
- Coze账户内发布仍由部署执行方操作，本地升级测试不代表线上已发布。

## 最终交付与追加结果

|本地产物|字节数|SHA-256|
|---|---:|---|
|`dist/SC2-Survivors-Demo.html`|361190932|`4bfe9dc3a3355d9d71c95a157afb815505037a6e75c3a64450b8bd5c039f8d63`|
|`dist/coze-deployment/SC2-Coze-App.zip`|583965|`11a703cfdd701ca5461fc7ff6681ac50471e864ce25ffb99c582b7148b778b2d`|
|`dist/coze-deployment/SC2-Web-Resources-Update.zip`|48298|`3e0cac85714a6e09f7a0cc9b7bd60816b647fdd003489b964c9fd2f8c64ea464`|
|`dist/coze-deployment/SC2-Web-Resources.zip`|355719933|`131253d6e78e6c4dd0bbaf55f69f4e4f39766f8383b7264414db78531bd292c1`|

应用构建ID：`dd555107fb164a5aa616178f05484c7ae76c255e6b6f5c9c2904c572f4e949ea`。
资源发行ID：`47069188a309497929f28f037f25168dc7986384fbdf69923d66f9e1b33f11b7`。
737逻辑资源对应730独立HTTP文件、458372920字节；本轮没有新增模型字节，资源差量0文件。差量ZIP包含完整目标清单与差量描述，不包含模型；完整ZIP仅供首次部署。

真实目录更新核验通过：保留730文件、安装0、下载0；资源校验完成后才切换应用，`/health`匹配新应用ID、资源ID及schema13。证据`reports/race-fun-delivery-final.log`与`reports/local/race-fun-final-delivery.json`。单测另覆盖损坏文件/中断时旧应用保持可用。

构建实际命令：`npm run build`、`npm run build:web`已运行完整流水线；最终表现修正后再次执行`node tools/build-demo.mjs`、`node tools/build-web.mjs`，随后`node --import tsx tools/publish-coze-tree.mts`及`python tools/package-coze.py`。构建的大脚本分块提示保留，不当作性能通过。

Git按普通提交推送main，无强推；离线HTML停止追踪但本地文件和历史保留。提交后的远端资源验证保存到`reports/local/race-fun-remote.json`，实际提交号随最终交付回复提供；不把本地校验写成远端已通过。

最终361190932字节离线产物再次执行`npm run test:offline:save`通过，浏览器错误为空；日志`reports/race-fun-offline-release.log`。最终布局15组及暂停/关间显示断言通过，`reports/race-fun-layout-release.log`。
