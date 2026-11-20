# V5 宣传片制作与复现

用户于2026-11-02要求：购牌后立即有战果、减少等待；特殊玩法段加“完成任务”艺术字；死战改为三族多种精英／英雄及技能快切，首领种类与方位变化；展示死亡掉装及多件装备。保持约5分钟，无旁白。Drive连接失败后，用户明确“先交付本地视频即可”。

## 当前时间线

300秒，1920×1080、30FPS，72个镜头。

- 0:00–0:24：V4R1三族团灭、Logo和短菜单。
- 0:24–1:25.2：三族购牌与战果。人族、虫族各24秒；神族13.2秒，保留扫射和反击的有效连段。
- 1:25.2–1:49.2：护送、两种特殊玩法；开头叠“完成任务”艺术字。
- 1:49.2–4:00：三族6种精英、9名英雄及技能快切。
- 4:00–4:26：三族精英／Boss死亡掉装，地面品质光柱与拾取。
- 4:26–4:50：三族配装、数值及同条件穿戴前后对比。
- 4:50–5:00：战果和Logo。

## 入口

- 场景：`v5-scenes.json`；隔离游戏入口：`v5-entry.ts`。
- 剪辑：`v5-edit.json`；合成：`v5-compose.py`。
- 图形、配乐、游戏音效、撞击／原声：`v5-graphics.py`、`v5-score.py`、`v5-sound.py`、`v5-impacts.py`。
- 结算／成片检查：`v5-check.py`；手机编码：`v5-mobile.py`；浏览器播放：`v5-check-player.mjs`；来源清单：`v5-provenance.py`。
- 仍复用通用的 `v4-build.mjs`、`v4-preflight.mjs`、`v4-record.mjs`、`v4-serve.mjs`，用环境变量隔离输出。

```powershell
$env:PROMO_ROOT='reports/local/promo-video-v5-20261102'
$env:PROMO_ENTRY='tools/promo-video/v5-entry.ts'
$env:PROMO_SCENES='tools/promo-video/v5-scenes.json'
$env:PROMO_OUTPUT='dist/promo-video-v5-20261102'
$env:PROMO_PORT='18846'
$env:PROMO_ORIGIN='http://127.0.0.1:18846'
node tools/promo-video/v4-build.mjs
node tools/promo-video/v4-serve.mjs
```

服务保持运行，在另一个同配置终端按需要执行：

```powershell
node tools/promo-video/v4-record.mjs
python -X utf8 tools/promo-video/v5-graphics.py
python -X utf8 tools/promo-video/v5-score.py
python -X utf8 tools/promo-video/v5-sound.py
python -X utf8 tools/promo-video/v5-impacts.py
python -X utf8 tools/promo-video/v5-check.py --outcomes-only
python -X utf8 tools/promo-video/v5-compose.py
python -X utf8 tools/promo-video/v5-check.py
python -X utf8 tools/promo-video/v5-mobile.py
node tools/promo-video/v5-check-player.mjs
python -X utf8 tools/promo-video/v5-provenance.py
```

先核对端口、共享资源和其他重型浏览器工作，录制串行。支持通过 `v4-record.mjs payoff-protoss` 只补录一个场景。构建从当前 `dist/web` 读取资源；它不会覆盖该目录。旧V2/V4/V4R1素材仍是时间线必需输入，具体文件与哈希见成品 `edit.json` 和 `provenance.json`。

## 真实性和验证范围

15段新增录制采用内存账户、固定步推进与真实游戏渲染。拍摄编排包含敌军阵型、生命／伤害参数及奖励候选选择；正式产品源码、玩法、UI和玩家档案不改。三族购牌前后保留同一队伍、属性和场上残余敌人；剪掉冷却等待。掉装走正式死亡和掉落路径，多次击杀积累数量，不把单个Boss剪成固定掉一堆。

`outcome-check.json`核对购牌回执、关间仍有敌人、队伍身份与属性、技能实际伤害、死亡、装备落地及拾取。复用的V4三精英／三英雄保留原版本标识。镜头审看与解码、浏览器播放共同验证最终输出；这些不等于实机FPS测量、物理手机测试或用户审片认可。

本地成品在 `dist/promo-video-v5-20261102`，简要结论在 `reports/qa`，任务记录在 `docs/project/PROMO_VIDEO_V5_20261102.md`。临时合成片段、预演截图、审看片及缓存在完成检查后清理；当前源镜头和两份成片保留供用户审片。
