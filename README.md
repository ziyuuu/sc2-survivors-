# SC2 SURVIVORS · 星际幸存小队

《星际争霸 II》同人、非盈利的 Three.js 小队生存玩法验证。当前开发在 `D:\星际`、`v3/playable-sc2-demo`，保留 V2 素材实验页与既有实体模拟，没有覆盖 main。

当前 V16 保留五兵种、按建筑组合批增援、15 款紫色精英、雷诺/泰凯斯/诺娃三位英雄、补给情报、四种发光敌方精英和四次 Boss。简单波次与守军从第一关起累计减半。保留 **12 关共 30 分钟**、原 Kairos Junction LE 地图、真实实体战斗与碰撞、手动架炮、点选集火和 PC 手柄。本轮新增原素材无损去重打包、紫色精英名称/拥有状态、英雄常驻生命条，以及第 12 关胜利后的可选无尽战场。详见 [当前设计](docs/DESIGN.md) 与 [验收记录](docs/QA.md)。

## 运行与构建

需要 Node.js 22+，本机使用 24.14.0。

```sh
npm install
npm run dev
```

打开 `http://127.0.0.1:5173/`。首次启动会下载已记录的公开原模型、贴图和图标，校验文件并在本地转换；这一步需要网络。以后开发运行使用本地资源。

```sh
npm test
npm run typecheck
npm run build
```

单文件输出：**`D:\星际\dist\SC2-Survivors-Demo.html`**。双击即可离线运行，无需 Node 或服务器，CSS、JS、模型、纹理、图标、现有音频和配置全部内嵌。当前约 **212.09 MiB**，精确字节数与 SHA-256 见 `reports/STATUS.json`。资源采用相同字节分片共享与 gzip 无损压缩，解码器也内嵌；启动时恢复本地 Blob URL，全部 647 项与原文件 SHA-256 相同，没有删除或降采样动作、纹理。开发版和 HTML 共享 World，朋友版不含 F1 修改状态接口。

原声音与两项补充武器源文件可从锁定的暴雪公开 CASC 包取得（PowerShell 7.4+ / Python 3.12 / Git，仅在本机处理）：

```powershell
python -m pip install --target .cache/audio-python -r tools/audio-requirements.txt
npm run assets:originals
node tools/import-m3-pack.mjs fx.muzzle fx.flame
npm run build
```

脚本只取 12 个指定文件，校验固定 SHA-256；保留原包，并把 9 个浏览器不能直接解码的 IMA ADPCM 声音转为同采样率、同声道 PCM16。SCV 中文 Ogg 保持原文件。素材包版本 5.0.16.97563 与既有 **5.0.15 规则数据** 分开锁定，未导入新版数值。

小地图显示当前开放区域、视野范围、小队、敌军、资源、虫巢及带兵种字母的救援仓（M/R/H/T/+ 与乘员数量，SCV 为 S）。右键小地图移动，左键／右键点敌集火；触屏轻点移动或集火。高台可向低地开火，近战不能隔崖攻击。此前拥堵坡口已按新编队复测，见 [当前验收](docs/QA.md)。

电脑右键地面指令小队前进交战，右键敌人追击集火；左键敌人也会寻路集火，左键地面不下令。手机轻点地面／敌人执行右键同样操作。绿色圆环标示目的地，红色圆环标示集火目标。前进途中保留短停射击，到点或编队拥堵仍正常索敌。点敌集火时各单位自行寻路进入射程，优先指定目标并继续追踪；架炮坦克仍等待手动收炮，医疗艇继续治疗。WASD／方向键或摇杆随时接管并取消点选指令。Space 推进，T 全队架炮／收炮，E 使用已研究的兴奋剂，Escape 暂停。架炮坦克不会因点选指令自动收炮。手机左侧摇杆与右侧技能支持同时操作，拖动／长按不会误发轻点指令。没有局内手动商店／建造／生产按钮。生产状态只读显示。

PC 手柄：左摇杆移动，松杆追击自动锁定目标，LT／RT 循环切换；A 推进、X 兴奋剂、Y 架炮、B 自动选敌、Menu 暂停。菜单用方向键或摇杆导航，A 确认，B 聚焦继续。未知映射从设置进行校准并保存在本地；重连先回中立，再明确继续。键鼠／触屏随时接管；接管后手柄须回中立，才可再次取得控制。

F1 仅在开发版提供资源、跳关、救援、指定敌人、速度、FPS、实体数、draw calls、战线长度、空间格子和碰撞体积。`npm run lab` 保留 V2 历史素材实验页，不是新版游戏。

## 当前规则

- 第 12 关胜利后可选择进入无尽，继续使用完整原地图、原小队、HP、资源、建筑和未解决事件。每轮 240 秒，结算、两轮选卡和英雄复活延续。小兵/精英/Boss 刷新间隔分别每 30/60/90 秒缩短；新精英与 Boss 逐只增强，已有敌人不变，详见当前设计。
- 精英在战场显示紫色名字和等级，卡牌显示“已拥有/未拥有/待编入”与晋升目标。英雄有金色名字、脚下标记、小地图菱形、独立战场血条与 HUD 生命值；技能不可用不再让血条变暗。
- 一名 Rank 1 枪兵、一座兵营、50 矿/0 气开局。人族枪兵、劫掠者、恶火、坦克、医疗艇各五席。虫族刺蛇从第七关加入，其余原有预算不变。
- 建筑购买/解锁升级立即完成，训练保留原耗时。三个建筑组各一批，每座参与建筑一名乘员；整批足额扣费，完成后一个多人仓。同兵种仓未解决时不继续投放。劫掠者/枪兵、坦克/恶火交替；昂贵批次等待资金。
- 降落仓没有超时，清完威胁逐个出舱，出口拥堵等待。毁仓不退款、杀死尚在仓内的乘员，守军留场。SCV 虫卵有独立 30 秒期限；Drone 为高收益资源目标。
- 普通军衔最高五级；每类三款唯一精英替换普通席位，只能同款紫卡晋升，永久死亡。已付费普通增援优先保留容量。三个英雄使用额外席位，总友军最多 28，同名橙卡晋升，仅关间付费复活。
- 英雄技能由玩家施放：键盘 1/2/3、屏幕技能栏、手柄上/左/右。玩家指定目标优先，非法或超距目标不消耗技能。
- 简单波次和守军按来源、兵种累计 50%，经济仍 ×1.25。敌方精英从普通预算升格；3/6/9/12 关 Boss 参数两档相同。存活 Boss 跨关，末关仍须摧毁虫巢。
- 通关奖励先到账，建筑与随机两轮均可多买、跳过、刷新。共享刷新费 50/90/130…矿，资源卡收益属于正常玩法。随机折扣、不按钱包筛选、不按伤亡降难度。
- 绿队员 Rank 3、蓝 Rank 5 直接获得普通队员；紫精英、橙英雄和强化。补给情报最高五级，每级提升后续蓝紫橙基础概率 20%，从白色扣除。地图奖励免费，过期内容按原基础价格回收一次。

所有新增精英/Boss/英雄数值属于本游戏适配，完整公式见 [DESIGN.md](docs/DESIGN.md)、`src/data/elites.ts`、`src/data/heroes.ts`、`src/data/enemies.ts`。自动规则测试、条件经济账本和人工试玩分别报告，不以自动操作通关作为普通标准。

## 数据和素材

基础数据固定 **LotV 5.0.15**，来源为 [SC2Data 导出快照 fbbd6429](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171)，Normal 秒转换为 Faster：时长除 1.4，移速／回复率乘 1.4；不声称验证过当前安装客户端。Survivors 改动单独记录在 [DATA_SOURCES.md](docs/DATA_SOURCES.md)。

战斗模型为 10 个基础单位、15 个精英皮肤、3 个英雄，共 28 款；原死亡变体、坦克两态/变形、医疗、降落仓、SCV、Drone 和虫卵继续使用原资源。31 个原图标（精英共用对应原兵种图标）、原榴弹/骨针、原声音及地图资源一并内嵌。新增模型按需解码和上传。来源及哈希见 `tools/expansion-models.json`、`tools/expansion-dependencies.json`，首次补齐执行 [素材管线](docs/ASSET_DOWNLOAD_REQUIRED.md) 的本地步骤。

原素材不意味着复刻了 SC2 客户端画质。枪兵原上身动作与移动混合、开舱门骨骼、粒子时序、接触阴影和 PBR 都有网页适配。没有独立开舱动画；不把死亡当开门。原字体不存在时用系统回退，禁止下载未知字体。

素材说明：[ANIMATION_EFFECTS.md](docs/ANIMATION_EFFECTS.md)。原声音、补齐的效果源文件与可复现下载路径：[ASSET_DOWNLOAD_REQUIRED.md](docs/ASSET_DOWNLOAD_REQUIRED.md)。下载失败绝不写入伪 GLB；生成资源、原包和 HTML 均在 Git 忽略目录，仅用于约定的朋友试玩。

## 验证

```sh
npm test
npm run typecheck
npm run build
npm run test:browser
node tools/qa-v16.mjs
node tools/qa-gamepad-calibration.mjs
node --import tsx tools/budget-envelope.mts
node --import tsx tools/audit-map-crowding.mts
python tools/audit-m3-independent.py
```

全部地图边缘/坡脚：设置 `SC2_MAP_AUDIT_SHOULDERS=1` 后运行 `node --import tsx tools/audit-map-navigation.mts`。冻结本地性能对照：`node tools/build-performance-fixtures.mjs 2059e87`，设置 `SC2_PERF_URL` 指向生成的 baseline/optimized HTML 后运行 `node tools/qa-runtime-performance.mjs`；28 人扩展场景使用 `SC2_PERF_EXPANSION=1`。这些诊断副本带开发接口，朋友版不带。

浏览器脚本使用本地已安装 Chrome；本轮 V15 脚本固定本机安装路径，换电脑需调整。桌面鼠标/键盘输入流程、诊断边界场景、390×844／844×390 触摸与压力、断网 `file://` 分开记录。截图仅保存在本机。手机尺寸模拟不是手机真机；headless 加载或测试通过也不是人工视觉验收。
