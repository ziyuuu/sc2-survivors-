# 武装支援实机展示

当前候选及逐卡复验见[第二轮验收记录](../../reports/qa/armed-support-polish-20261111.md)。45 卡与九组基础对照用 `ARMED_QA_OUT=reports/local/armed-support-polish-20261111`、`ARMED_CARD_REPORT=reports/qa/armed-support-polish-cards-20261111.json` 指向本轮，再运行 `node --import tsx tools/verify-armed-feedback.mts` 汇总。

在项目根目录运行 `node tools/serve-armed-support.mjs`，打开：

<http://127.0.0.1:5196/preview/armed-support-showcase-20261111/>

也可双击本目录的 `启动展示.cmd`。服务只监听本机，不发布到外网。按品质和卡名选择任意一项，先观察触发前状态，再点「重新播放」；不需等待冷却或打前置牌。九张紫节点可切换同种子、同阵容的基础组合和加入节点。

入口只准备种子、前置牌、敌我站位和触发前状态。播放后的出勤、每发炮弹、每名乘员、状态、寿命与结算使用 `src/simulation` 正式 World，渲染/模型/声音使用正式 BattleRenderer/AudioEffects。战斗卡沿真实攻击抽取概率，救场沿正式阵亡、W03 沿新订单判定；成功后进入 CD，CD 到期不自动施放。W03 显示基础 10 秒旧订单与 I 档概率提速成功后的 8.8 秒新订单。最新规则见[第二轮表现与出勤节奏](../../docs/project/V1_4_TERRAN_ARMED_SUPPORT_POLISH_20261111.md)。已按确认范围保留触发类 CD，缩短投送、部署和其他炮击；P05 使用原版补给站装甲设备外形，O03 光柱持续 2 秒。

这是当前未提交工作区的候选版；共用经济/免费生产第一批 `PLAY-1X` 仍待合流。工程前态不等同自然完整战役，也不表示物理手机或用户美术验收。

重现检查：`node tools/qa-armed-showcase.mjs`；按 `ARMED_QA_CARDS` 可仅跑选定卡号，`ARMED_QA_REPORT` 指定报告名，`ARMED_QA_OUT` 指定本轮证据目录。旧 `verify-armed-showcase.mts` 只汇总首次候选，不用于本次事件概率版本。正常玩家入口检查用 `node --import tsx tools/qa-armed-player.mts`，在独立浏览器账户导入兼容的工程检查点，通过正式 UI 购买、领取、续局和下一战生效。
