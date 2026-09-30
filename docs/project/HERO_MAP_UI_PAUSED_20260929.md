# 本轮暂停交接 · 2026-09-29

用户要求保留成果并中断任务，因为当前 token 不足。本记录仅保存恢复位置，不代表验收完成。暂停后不继续修复、测试、构建或推送。

2026-09-30：用户要求继续完成并交付，任务已恢复。以下为暂停当时的状态，最新实际结果见 HERO_MAP_UI_VALIDATION_20260929.md。

## 保留状态

- 工作区全部现有修改保留，未重置、未清理。
- 当前工作基线为 main / e44e39a268e8924939ffa590a35b1d84edc8c7e2；本轮尚未新建提交或推送。
- 已实现内容、清理实绩、来源证据及未验项见 HERO_MAP_UI_20260929.md、HERO_MAP_UI_VALIDATION_20260929.md、HERO_MAP_CONTENT_AUDIT.md 和 status.json。
- 保留本地录像、报告、离线 HTML、Web/Coze 应用及资源产物。不要将本地录像、截图、过程日志或重复压缩包加入 Git。

## 精确恢复位置

1. 18 名英雄的新版实战录像已全部生成，记录在 reports/local/hero-iteration/playback-clean/progress.json。报告 report.json 在录像完成后的附加 UI 检查失败，不能将整轮检查标为通过。
2. 当前失败为 tools/qa-hero-map.mjs 第 45 行的技能名宽度检查：1440×900 下首个 #hero-skills b 的 heroWidth=0，heroFont=16。需检查真实 DOM、隐藏元素和三英雄测试准备状态，不能直接放宽断言。失败截图位于该目录 failure.png。
3. 可仅恢复 protoss 的布局检查，避免重录全部录像：QA_RESUME=1、QA_RACES=protoss、QA_EXPECT_HEROES=18、QA_SKIP_IDENTITIES=1。先检查脚本现有参数和开发服务。
4. 固定种子的完整动作／节能模式自然性能对照尚未执行。完整前六关、后期与无尽性能仍未关闭。
5. 当前组合录像包含死亡初段，完整退场尾段仍应补充核验。三个全息科技球精英缺原始活动死亡片段，保持明确缺口。
6. 恢复后重新生成身份审计及本地视觉查看页，更新最终事实、哈希和未验项，再完成相应验证、正常 main 提交推送及真实远端 LFS 下载校验。

## 当前最后构建标识

- 应用构建 ID：4935ee3e881fc00d2cbdc10c7cc59376c5b4420e87eccbe53d4cd5bfbd8cd3be
- 资源发行 ID：ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64
- 离线 HTML：415056835 字节；SHA-256 0e18932e04d3ac485699e656370ce59d03b1c8696cf99e2177859ebae52314f3
- 其余产物校验见 dist/coze-deployment/CHECKSUMS.json（以目录内实际校验文件名为准）和 reports/local/hero-iteration/artifacts-final.json。
- 上述标识是暂停前最近构建；后续若修改源码，必须重新生成并记录，不能沿用旧标识宣称新包已验证。

## 恢复时注意

- 不新增旧开发存档兼容、不调整战斗数值、不继续磁盘清理。
- 不使用 git add deploy/runtime 全目录纳入无引用中间资源；按当前发行清单核对新增对象。
- 不纳入原先未提交的无关日志。保留其他任务的服务和进程。
- 人工视觉、完整 M6 和 M7 仍开放，自动化通过不能替代签收。
