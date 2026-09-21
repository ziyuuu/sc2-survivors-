# 地图、掉落资源、前两关与关间选购研究

2026-09-21；代码基线 `6955ab918ab037cd7c353b75ee111649f610b9fb`。本轮只研究，未改游戏、数值、资源清单或离线包。以下“建议”不是已批准规则，不覆盖 DESIGN.md。

## 1. 地图实际完成度

已用原素材，但未完成原版地图视觉还原。

- `tools/import-terrain.mjs` 与 `assets/private/terrain-pack.json`：8 张原 DDS 转换出的纹理全部在本地，逐项 SHA-256 与清单相符。包括 Char Dirt、Dirt Normal、Rock、Rock Normal、Cracked Dirt、Cliff、Cliff Normal、Cliff Emissive；7 张 512×512，崖壁法线 256×256。没有证据表明这些图被本轮缩成低分辨率。
- `tools/m3-catalog.mjs`：原 `chardunerock_00` 和 `barrackswrecked_00` 已接入。`char-terrain.ts` 实际用一个岩石模型沿障碍重复排布，兵营遗迹只有一处。
- 地面、崖壁、坡道几何来自自建 `char-geometry.ts`；纹理混合、照明、接触暗部是网页适配，缺少原场景的多种地表过渡、形态变化及完整材质环境。不能以“原贴图存在”称为“SC2 地图还原完成”。
- Asset Explorer 的 `terrain-cliffs` / `terrain-doodads` 索引里很多 download 实际是 JPG 预览图，不是可铺设地形模型。`charcliff0_material.m3` 名称也不能直接当作完整崖壁几何的证据。
- 额外候选 `charcliffstructurelarge_00.m3` 已只读下载检查：185,648 bytes，43DM，section table 在文件内。尚未检查其贴图依赖、导入或视觉。建议补充真实 Char 岩壁/装饰的形态，再统一坡道衔接、纹理尺度及光照，保留已确认布局和可通行性，不重抄完整对战地图。

参考：[暴雪地图美术教程](https://news.blizzard.com/en-us/article/20097658/mastering-mapmaking-part-one)；[Asset Explorer](https://github.com/sc2-arcade-watcher/asset-explorer)。

## 2. 掉落资源的现状及准确原素材

现状：`src/render/scene/battle-renderer.ts:50` 使用 `OctahedronGeometry(.17)`；第 148 行仅按是否含瓦斯染绿/染蓝。矿气混合掉落也只是一个绿色八面体。原 HUD 图标不能算地面掉落用了原模型。

从锁定 SC2Data ModelData 查到：

| 用途 | ModelData ID | 原包路径 | 本次只读下载检查 |
|---|---|---|---|
| 小块矿物 | CarryMineralFieldMinerals | `Assets/Buildings/Resources/Crystal/Crystal.m3` | crystal.m3，13,904 bytes，43DM/section table 通过 |
| 瓦斯罐 | PickupPalletGas / CarryHarvestableVespeneGeyserGas | `Assets/Buildings/Resources/GasCanister/GasCanister.m3` | gascanister.m3，15,152 bytes，43DM/section table 通过 |
| 大堆矿物补给 | PickupPalletMinerals | `Assets/Doodads/SpaceMineralCluster/SpaceMineralCluster_00.m3` | spacemineralcluster_00.m3，93,904 bytes，43DM/section table 通过 |
| 拾取发光候选 | PickupMineralCrystalGlow / PickupGasCanisterGlow | `Assets/Effects/Other/ActiveCrystals/ActiveCrystals.m3` | 本次只核对数据路径，未下载/解析 |

[锁定 ModelData 原始来源](https://github.com/Joshua-Leibold/SC2Data/blob/fbbd6429b1eb6978c78a092dc68ba09029d03171/mods/liberty.sc2mod/base.sc2data/gamedata/modeldata.xml)。

实际下载入口：
- https://dist.sc2arcade.com/star-assets/models/crystal.m3
- https://dist.sc2arcade.com/star-assets/models/gascanister.m3
- https://dist.sc2arcade.com/star-assets/models/spacemineralcluster_00.m3
- https://dist.sc2arcade.com/star-assets/models/charcliffstructurelarge_00.m3

Python 直连返回 403，现有 `fetchBinary` 原生 curl/TLS 流程成功取得上述四个模型并在内存核验，没有把错误页面落成模型。没有把素材加入游戏；纹理完整性、转换、材质/动作与运行视觉仍待实施验收。

建议普通矿物用小晶体，瓦斯用原气罐；同时掉落矿与气时显示两类原模型，但保证收入只结算一次。不能把整个气矿建筑缩小当掉落气体，也不能仅把原图标贴在八面体上。继续合批和掉落合并，不改变收益。

## 3. 前两关：更多经济目标、更少普通跳虫

当前普通难度：第一关 12 跳虫、2 Drone、2 SCV 虫卵；第二关 26 跳虫、2 Drone、2 虫卵。普通跳虫掉 3 矿；Drone 掉 30 矿/15 气；每个 SCV 永久增加 0.15 矿/秒、0.04 气/秒。简单收入再乘 1.25。

建议首轮试验（未修改，非实测平衡结论）：

| 关卡 | 普通跳虫 | Drone | SCV 虫卵 | 每个落仓守军 |
|---|---:|---:|---:|---:|
| 1 | 12 → 6，单只 | 2 → 4 | 2 → 3 | 保持 2 跳虫 |
| 2 | 26 → 12，6 次双只 | 2 → 4 | 2 → 3 | 保持 3 跳虫 |

保持早期开始活动，把战斗波、追杀 Drone、SCV 抢救分开错峰，避免单纯拉长刷怪间隔再次无事可做。第一关 6 个战斗事件+4 Drone+3 虫卵已有 13 个非落仓活动，平均数量不等于保证玩家每 9 秒就能接触目标，仍需结合出生距离验证。

条件账本（普通、全部击杀并拾取，仅普通跳虫+Drone，不含守军、SCV、被动采集、通关奖励和生产支出）：
- 第一关：96 矿/30 气 → 138 矿/60 气，增加 42 矿/30 气。
- 第二关：138 矿/30 气 → 156 矿/60 气，增加 18 矿/30 气。
- 合计即时资源多 60 矿/60 气；SCV 收入另外计算。一个 SCV 每存活采集 120 秒多 18 矿/4.8 气；剩余 45 分钟则多 405 矿/108 气。因此不能只看前两关收入而忽略整局复利。
- 收入增加会让自动生产更快、落仓更多，每仓守军虽不变，总救援威胁仍会增加。评估应一起统计订单、仓、守军与可支配余额。
- 发现实现限制：`stageSchedule` 的虫卵时间按 `.15 + i*.5` 排布，只适合两只；数量改 3 后第三只约在 138 秒，超过前两关 120 秒。必须先改为独立事件窗口，例如第 15/50/85 秒附近错峰，完整保留每只 30 秒抢救期限。
- 不改变高危区身份，不加入免费救援、免死和根据伤亡减少敌人。第三关以后的预算先保持；用条件账本评估早期新增收入的影响，不用自动通关率硬调。

## 4. VS 原作规则与本项目的多买刷新

《Vampire Survivors》的常规升级：经验升级暂停，给三/四个候选，选一个；Reroll 用于更换当前候选，受可用刷新次数限制。并不是有钱就能在同一次升级把三个全买走。商人、宝箱、局外强化是另外的系统。

资料：[Level up](https://vampire-survivors.fandom.com/wiki/Level_up)、[Reroll](https://vampire-survivors.fandom.com/wiki/Reroll)、[Merchant](https://vampire-survivors.fandom.com/wiki/Merchant)。Fandom 页面正文直读受限，搜索索引与另一独立升级机制说明交叉核对；不把本项目的付费刷新称为 VS 原机制。

用户描述的“随机货架、钱够可多买、买完还能刷”更接近 [Brotato 的波间商店](https://brotato.wiki.spellsandguns.com/Shop)：每个商品独立购买，可花材料刷新，价格随刷新递增。它的货架通常四格；本项目仍可用三格，不必照搬数量、锁定或清空奖励。

建议本项目保留建筑轮→随机轮，但从“买一张立即退出”改为“有限随机货架”：
- 每页三个不同候选（建筑轮只展示已解锁类型，不重复凑数）。可以分别买 0–3 个，支付后该格售罄，其他报价保持。
- 购买不自动结束本轮；手动“继续”进入下一轮/下一关，完全不买也能继续。
- 买部分、买空后均可付费刷新，重新抽候选/折扣；用户最新要求刷新费每次增加 40；沿用原首次 50 时为 50/90/130…，跨两轮共享且不因购买重置。不额外送清空免费刷新。
- 每个报价有独立身份，只结算一次；买后重新检查科技上限、建筑升级状态、增援培养容量。刷新后可再买合法的重复建筑/增援，已满科技不出现。建造/生产/战斗在关间仍冻结。
- 这不是旧完整商品列表，仍只显示本次随机候选；没有局内购买入口。

用户最新明确：补给卡的正收益是允许的随机购买收益，不归类为玩家违规刷钱，也不因此增加每关一次或延迟到账限制。刷新费每次增加 40，以递增成本产生取舍；首次价格未另改时沿用 50。撤回上一版对此建议的购买次数限制。每份已购买报价只结算一次属于输入/交易正确性，不限制刷新后合法买到新报价。

研究结论：地图和资源表现仍有实质未完成项；经济目标增加符合探索/救援玩法但需重算长期采集和仓量；多买刷新可采用，但应明确这是本项目的关间经济设计，不是对 VS 升级规则的原样复刻。


## 5. 最新地图方向：真实 1v1 地图切片的可行性

用户目标是最终 12 关使用真实 SC2 对战地图区域，例如一张 1v1 图的不同大小切片；不能用随意摆放几种原素材来代替原地图。此次只评估，没有导入实际 SC2Map 或修改地图实现。

### 技术判断

有可行的数据与验证路线，但不是直接把 SC2Map 交给 Three.js 加载。地图包中的地形定义、高度、纹理混合、坡道/崖壁和物件摆放，需要在本机预处理；基础游戏依赖中的模型、材质和贴图也必须解析。最终生成网页使用的静态地图网格、材质、物件实例及共享寻路数据，运行时无需 SC2 客户端或联网。

证据：
- 暴雪官方协议 `StartRaw` 提供 map_size、pathing_grid、terrain_height、playable_area；官方 GameInfo 说明这些是实际地图维度、通行格与地形高度。可用于核对几何/通行对应关系，但接口本身不提供完整美术场景。
- 原格式研究 `t3Terrain.xml` 文档说明 heightMap 的 dim/scale/offset、纹理集合、混合 mask、cliff sets 和 ramps，支持按原数据重建而不是手摆近似地图。它是逆向研究资料，解析仍需针对选定地图做样本核验。
- 暴雪 s2client-proto 列出公开天梯地图包，说明原地图来源可追溯。本次没有下载/解包地图，也没有测出实际转换率、输出体积和帧率。

来源：
https://github.com/Blizzard/s2client-proto/blob/master/s2clientprotocol/raw.proto
https://blizzard.github.io/s2client-api/structsc2_1_1_game_info.html
https://github.com/sc2-arcade-watcher/sc2-file-format-docs/blob/main/t3terrain-xml.md
https://github.com/Blizzard/s2client-proto#map-packs

### 建议的 12 关组织

先一张资源依赖齐全、坡道清晰、常规地表的真实 1v1 母图，制作 12 个逐步扩大的开放区域；用真实基地/自然扩张区/通道/中场组织进程。保持原坐标与比例，通过裁切范围控制面积，不缩小整张图。12 个范围可以共用一份母图数据及资产。

这符合原来的逐关扩展和跨关保留规则。若 12 关分别切到不相交的地区或 12 张独立地图，技术也可做，但必须另定在途部队、敌人和未解决仓如何跨图；不能默默清空、瞬移或自动结算。

裁切不能简单截一个正方形：要保留坡道两端与完整通路，选择连通区域；边缘留可见地形缓冲，并封闭通往未开放区的出口。原物件摆放和碰撞要对应；原矿区固定资源与动态击杀掉落需区分，不能把原采矿点误当自动吸取掉落。SCV 和落仓按裁切内实际路线可达性取点，跨坡道距离不得用直线替代。

### 比例与移速

原地图尺度让原速度有可核对的参照，但导入地图不会自动还原控制手感。需要统一：SC2 地图坐标单位、模型身体尺寸、单位半径、射程、速度和 Faster 时间换算。

本项目基础表已记录 Marine/Tank 3.15、Hellion 5.95 地图单位/实际秒；当前锚点 5.6、超距追赶 1.22 倍、加减速和转向是网页适配。不能仅因为读取了原速度数字就称为原版运动。

建议用 1 Three.js 世界单位对应 1 SC2 平面地图单位（坐标轴可变换，但统一比例）。无障碍、无交战、无转弯/加速/追赶修正的 30 单位直线，基础匀速计算：Marine/Tank 9.52 秒，Hellion 5.04 秒。这是校准参照，不是实际已测成绩。若要求完全原版常态移速，追赶修正需要单独标明并评估是否撤除，不能隐性加速。

### 先证明一个切片

第一步应只做原图中一个包含平地、坡道、高台和装饰的代表切片，核对原数据来源、坐标、纹理混合、物件摆放与通行网格；再测枪兵、恶火、坦克经过固定地标的路径与耗时，以及摄像机下的实际比例。通过后扩展到 12 个范围。

网页仍需适配 SC2 特有材质/水体/粒子/光照，不能承诺与 SC2 客户端逐像素一致。可承诺的工作目标是原地图布局和资源摆放可追溯、尺度一致、坡道和碰撞一致。单 HTML 可内嵌预处理结果；分块裁剪、共享素材和静态实例化降低运行成本，但实际大小和手机性能必须在转换样本后测，当前不报虚构数字。

## 实施记录（研究后的批准决定）

用户明确接受经济卡正收益；不称为刷钱漏洞。刷新每次增加 40 矿，首刷 50。两轮多买且可刷新后续买，offerId 防重复输入结算，不限制资源卡跨刷新再次购买。首两关改为四 Drone、三虫卵、六波小规模跳虫。已取得真实 Kairos Junction / Acropolis SC2Map，原地图提取工作正在进行；上一节“未下载”仅为研究当时状态。
