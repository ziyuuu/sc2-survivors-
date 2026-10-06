# 六英雄正式游戏接入演示

输出：`D:/星际/dist/Six-Terran-Heroes-Integrated-Game-Demo.html`。运行 `node tools/build-hero-integrated-demo.mjs` 生成本地单文件 HTML；先使用项目的素材准备流程，保留原确认版 HTML。

此页直接运行正式 `World`、60 Hz `FixedStepper`、共享技能输入网关和正式 `BattleRenderer`。主弹、副弹、导弹、弹射、DOT、溅射、保护与维修均由正式仿真结算；效果只读取状态。确认版几何/着色器/纹理与全质量层次保留，脚下光环单独叠加，光环文字移除。当前修正版输出 `dist/Six-Terran-Heroes-With-Auras-20261005.html`，不覆盖原确认版HTML。

- 切换六英雄和 I–V；普攻观察、技能观察、光环协同分别演示；默认实际战斗。
- 点击地面或 WASD 移动，空格/按钮释放技能，可暂停、重开和切换视角。
- 观察模式明确使用 200 万生命的静止木桩。斯旺技能模式含六个普通机械身体和一艘受伤大和，便于看完四次真实维修与五秒保护。
- 两个 Boss 模式使用正式公共生成器：简单第 12 关 9000 HP、简单无尽第 3 轮新 Boss 23520 HP，护甲保持 3，不缩减生命；大和保持引导后一次爆发。无尽潜伏者用正式侦测能力显示。
- 演示不读写个人存档。`__INTEGRATED_HERO_REPORT__` 为只读检查接口；完整正式游戏没有修改状态的调试接口。

验证：`node tools/qa-hero-integrated-demo.mjs`，以及 `node --import tsx tools/qa-hero-confirmed-strength.mts`。实际命令、截图和哈希见 `docs/project/HERO_CONFIRMED_VALIDATION_20261005.md`。本页不代表自然完整战役、实体手机/手柄或人工视觉验收。
