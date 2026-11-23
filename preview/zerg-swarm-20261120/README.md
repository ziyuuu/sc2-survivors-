# 虫群增殖逐卡展示

[卡牌图鉴](http://127.0.0.1:15302/preview/zerg-swarm-20261120/cards.html)按品质分为 15 组，第 16 组并排展示本轮三张新卡。点卡面切换简略和详情，点「查看详情」读取该卡全部档位。每个档位都能进入所选的实机。

[实机战场](http://127.0.0.1:15302/preview/zerg-swarm-20261120/)顶部可切换卡牌、基础对照和档位，亦可重放或暂停。点击战场移动，点「撤离」令队伍后撤。首次交互解除浏览器的声音限制。「战场记录」列出实际伤害、击杀、批次、军衔、短期兵寿命和冷却等读数。

[虫族主脑](http://127.0.0.1:15302/preview/zerg-swarm-20261120/?card=ZSW-G01&rank=3)可切换正式新兵和满员投放。[橙色节点](http://127.0.0.1:15302/preview/zerg-swarm-20261120/cards.html?card=ZSW-O01)可以一起查看。[英雄分裂](http://127.0.0.1:15302/preview/zerg-swarm-20261120/?card=ZSW-O01&rank=1)有六位可选英雄，原有英雄技能用于查看共享冷却。

[新卡九档](http://127.0.0.1:15302/preview/zerg-swarm-20261120/cards.html?group=density)共用一个蟑螂阵线。三张卡分别改变行军时的身形与间距、同层部队之间的碰撞半径，以及各类虫兵移动时的穿阵资格。点击对应档位后，队伍自动向前，随时可以点「撤离」折返。

在项目根目录运行以下命令重开本地服务。展示与主线共用单位、战斗和渲染代码。

```powershell
npm.cmd run dev -- --port 15302 --strictPort
```

定向复现

```powershell
node --import tsx tools/qa-zerg-swarm-showcase.mts
node tools/qa-zerg-swarm-trials.mjs
node tools/qa-zerg-swarm-trials.mjs --drops
```

概率触发使用固定种子。部分场景预置敌人伤势、首轮剩余倒计时或前两次孵化进度，让本轮效果可以尽早观察。群体对照保留同样的配套卡。场景内的命中、生产、召唤、复活和移动由真实 World 推进。
