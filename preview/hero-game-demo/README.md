# 六英雄实际战斗演示

本地独立 HTML，打开后自动开战，可切换雷诺、泰凯斯、诺娃、斯旺、托什和大和战列巡洋舰，暂停、重新开始、选择 I–V 军衔、切换视角、点击地面或用方向键移动。

使用生产 World.step、固定 60 Hz 和 BattleRenderer，保留英雄实际普攻、被动、敌军移动、伤害、死亡及原版模型。没有主动技能按钮，不读写永久档案或运行存档。独立训练场持续生成敌军，停止战役阶段和奖励决策；英雄死亡后重新演示，不代表自然战役或平衡验收。

构建：`node tools/build-hero-game-demo.mjs`。资源由当前已准备的原模型、死亡模型、头像、地表和普攻纹理按引用打包，全部嵌入 HTML，离线使用。没有更改游戏运行源代码或发布包。

验证：`npx tsc --noEmit -p .cache/hero-attack-lab/demo-tsconfig.json`；`node tools/qa-hero-game-demo.mjs`。实际输出、文件 SHA-256、Chrome 六英雄战斗和手机视口截图位于 `reports/local/hero-game-demo/`。这些结果不关闭 M6/M7、人类视觉验收或原始死亡片段缺口。
