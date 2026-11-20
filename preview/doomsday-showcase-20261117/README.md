# 末日兵器 45 张实机展示

从仓库根运行 `node tools/serve-doomsday.mjs`，或双击本目录的 `启动展示.cmd`，打开 <http://127.0.0.1:5199/preview/doomsday-showcase-20261117/>。

两个三卡入口各备 100,000 矿与 100,000 气。以任意顺序买下同页三张普通牌，第三笔成交后即可免费三选一。普通货架、扣款、进度和节点领取都使用正式游戏流程。[试末日兵器](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shop.html?branch=doomsday) · [试武装支援](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shop.html?branch=armed)

在 [末日兵器](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shop.html?branch=doomsday&after=9) 或 [武装支援](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shop.html?branch=armed&after=9) 的第三个紫节点已领试玩局，再买三张就会弹出橙色三选一；领取时播放原开卡动效。

从目录点卡名即可打开该卡所在的完整游戏界面。卡内循环箭头切换简略与详情，普通牌按报价购买，紫色和橙色节点均免费三选一。每次打开都从独立的内存试玩局开始，浏览器后退回目录，刷新可重看同一张。[45 张购卡入口](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shops.html) · [直接打开「贯穿炮膛」货架](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/shop.html?card=M-P05)

贯穿命中可在战场重播。[普通坦克的第三轮](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=artillery&stage=2) · [虎式的第三轮](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=tiger&stage=4)

在[纳米护甲](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-B01)里点「重新播放」看青绿、玫紫电路沿原机体闪动。[幽能护甲](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-B04)的左侧蟑螂会攻击移动中的坦克，观察来弹侧甲片上的暗核。可切到「基础组合」重播同一击，也可看[冰原同场景](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-B04&terrain=ice)。[幽能怒火复选](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-N02&variant=2)显示敌方爆心的双重裂缘。

### 同队构筑对照

打开下列任一场景即开始交战。第一个下拉框选场景或单卡，第二个选改装阶段。「重新播放」恢复同一组的种子、成员、站位和镜头。「暂停」可定格炮口、弹体或命中。浏览器允许声音后，点「重新播放」即可连同原版武器音效重看。

| 场景 | 观察位置与时机 |
| --- | --- |
| [虎式 · 精英成长](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=tiger&stage=0) | 从 V 级原装切到精英装甲、VIII 级突破、X 级极化。看同一块炮塔装甲和同一发炮弹。最后一档每第三轮穿向后排。 |
| [坦克 · 主炮改装](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=artillery&stage=1) | 联发 II 的弱弹跟在主发之后。切到阵地供弹时，第四轮从两侧补炮。 |
| [女妖 · 空军联动](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=air&stage=2) | 看母弹在接触处分裂、两个子弹落点点亮、两点之间延迟引爆。切到空地夹击可看维京和女妖跟进。 |
| [末日过载 · 雷神叠加](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=overload&stage=3) | 科技球的绿雾包住伤机，工程官兵在近侧维修。弹仓亮起后，原版双炮开火，敌方爆心随后塌缩。 |
| [混合小队 · 合战](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?group=squad&stage=1) | 左侧机械化枪兵和虎式交战，右侧高达近身挥剑。观察敌方腐蚀胆汁预警。 |

五组共 19 个阶段，使用与正常游戏相同的 World、BattleRenderer 和 AudioEffects。展示中的耐久目标和起始卡组用于重放。五组之外，下拉框继续提供按品质排列的 45 张单卡。

点开[冷焰校炮](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-N07)可以看前排蓝焰和靶后爆尘。[共振引信](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-N09)可用「复选一次」对照两次着弹间的爆带宽度。[高达远程](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-O02&variant=1)的靶位留出了四枚弹幕飞出炮口的距离，「近战对照」可看加长的剑刃。

选择卡牌后点「重新播放」。九张紫节点可切换基础组合、加入卡牌、复选一次；可切换首领靶。英雄装甲可选雷诺、泰凯斯、诺娃、斯旺、托什，开始播放时通过正式技能接口施放一次原技能。场景详情显示真实伤害、修复、成员与执行器状态。

2026-11-17 表现 R2：高达新增「近战对照」，纳米／幽能与机体分色已更新。可直接进入[高达光剑](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-O02&variant=2)、[高达远程](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-O02)、[纳米与幽能叠加](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-N01&stack=1)、[浅色地面对照](http://127.0.0.1:5199/preview/doomsday-showcase-20261117/?card=M-N01&stack=1&terrain=ice)。`terrain=char` 指定深色地面；切换地图仍恢复到原 World。

`scenarios.ts` 只准备种子 171145、队列、既有牌和触发前状态；`main.ts` 使用正式 World、BattleRenderer、AudioEffects，并在同一个 World 上恢复快照。卡牌不是展示专用的模拟执行器。工具控制区独立于玩家 HUD，不读取或写入玩家存档。

完整正式流程从服务根地址 <http://127.0.0.1:5199/> 进入；正常游戏会使用这个地址的独立浏览器存档。此入口来自本地源码，不是线上版本。

复验工具：

- `node --import tsx tools/qa-doomsday-shop-ui.mts` 逐张验证 45 张卡的正式购买或领取，另从目录点击进入三种布局，核验卡内翻面、画面资源和交易结果。

- `node --import tsx tools/qa-doomsday-simulation.mts`：45 张基础／持牌、九节点普通／首领靶及复选，以及档案往返和中途恢复。
- `node tools/qa-doomsday-showcase.mjs`：逐卡打开、播放、渲染与音频错误；`DOOMSDAY_QA_VISUAL=1` 补五种复杂效果与五位驾驶员。
- `node --import tsx tools/qa-doomsday-player.mts`：真实菜单、隔离工程档案、按钮购买、节点、两页竞争、下一战及保存恢复。
- `node --import tsx tools/qa-doomsday-lifecycle.mts`：五英雄原技能和复活、五图纸战损补造、I／V 级女妖与维京 12 秒对照。
- `node --import tsx tools/qa-doomsday-budget.mts`：固定阵容、种子、普通原价预算的 3／6／9 点分支对照。
- `node tools/qa-doomsday-packaged.mjs`：将玩家流程导出的档案读入指定 Web 构建并进入下一战。
- `node tools/qa-doomsday-refits.mjs`：光剑挂点、护盾／机体／弹药及幽能代表状态，验证渲染不改保存状态、实际更新开销及退场清零。`DOOMSDAY_REFIT_CASES=combo-dark,combo-light,phase-light,sword-contact,artillery-ring,artillery-pierce` 指定最终六项复验；采样绕开暂停帧复用，每项 60 次完整呈现更新，不是 GPU 帧率或整场战斗压力测试。
- `node tools/qa-doomsday-comparisons.mjs` 在 5199 服务上依次重放五组构筑和 45 张单卡，检查炮击时序、代表帧、暂停、场景切换与退场。玩家入口和打包复验可用 `SC2_DOOMSDAY_QA_OUTPUT` 指向同一个隔离输出目录。
- `node tools/qa-doomsday-card-visuals.mjs` 在实机中等到每张常规牌和紫节点的对应状态或事件，再采样实际渲染。也覆盖高达近远程、重炮、雷神组合与复选共振。支持 `SC2_DOOMSDAY_QA_OUTPUT`。

生命周期工具可设 `DOOMSDAY_NATURAL_ARRIVAL=1`，增加五种图纸的实际制造、落地、清守卫、开舱和替补接入，使用正式移动与侦测操作。浏览器工具可设 `DOOMSDAY_QA_SERVE=1` 自建服务，`SC2_QA_URL=http://127.0.0.1:5198` 指定端口；GPU 检查串行。`DOOMSDAY_QA_CARDS=M-G06,M-O01` 可缩小展示复验范围，`DOOMSDAY_QA_BOSS=1` 可改为首领靶。输出到 `reports/local/doomsday-20261117`，结束按产物保留规则清理；保留本目录源码与工具。

打包复验先设置 `SC2_QA_URL=http://127.0.0.1:5199` 运行玩家工具生成隔离的橙牌测试档案，再设置 `SC2_WEB_OUTPUT=dist/doomsday-refits-20261117/web` 运行 `npm run build:web`，最后以相同的 `SC2_DOOMSDAY_WEB` 路径运行打包工具。已结束的构建和测试档案不长期保留。

本次结果见[逐卡特效实机复验](../../reports/qa/doomsday-card-visuals-20261118.md)。前期记录见[攻击与高级精英验证](../../reports/qa/doomsday-attack-fx-20261118.md)、[表现 R2 验证](../../reports/qa/doomsday-refits-20261117.md)和[初版简要 QA](../../reports/qa/doomsday-implementation-20261117.md)。
