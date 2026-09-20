# Asset download / import status

2026-09-20T16:43:42.175Z

8/8 combat GLBs passed structural validation. Animation and rendering are separately reported.

后续已取得 8/8 单位原始骨骼动画、8/8 独立死亡模型、两个坦克模式包与 24 张特效贴图。运行 `npm run assets:animate`，本地自动转换并优先使用；[完整包文件名、验证下载链接和稳定导入路径](ANIMATION_EFFECTS.md)。下表保留基础静态预览资源路径，不代表当前动画版缺失。

## Missing resources

- **model.droppod**: Exact asset not indexed: droppod, terrandroppod. Local destination: `public/assets/models/droppod.glb`. [Source index](https://github.com/sc2-arcade-watcher/asset-explorer/blob/main/site/list/models.json). No verified binary download link exists for this missing entry. No exact catalog entry. Authored mechanical rescue capsule is explicitly used.
- **9 个原版音效槽**：公开目录没有可验证的对应 WAV 下载，声音站出现 403，未绕过；当前用本地合成声音。准确游戏内源文件名和 `public/assets/audio/sc2/` 放置路径在 [原版声音缺失清单](ANIMATION_EFFECTS.md#原版音效尚缺)。放入并执行 `npm run assets:prepare` 后自动接入，无需改组件代码。

## Stable manual destinations

| ID | Exact filename / destination | Verified download |
|---|---|---|
| model.marine | `public/assets/models/marine.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/marine.glb) |
| unit.marine | `public/assets/icons/unit.marine.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-marine.png) |
| model.hellion | `public/assets/models/hellionex1.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/hellionex1.glb) |
| unit.hellion | `public/assets/icons/unit.hellion.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-hellion.png) |
| model.tank | `public/assets/models/siegetank.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/siegetank.glb) |
| unit.tank | `public/assets/icons/unit.tank.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-siegetank.png) |
| model.medivac | `public/assets/models/medivacex1.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/medivacex1.glb) |
| unit.medivac | `public/assets/icons/unit.medivac.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-medivac.png) |
| model.zergling | `public/assets/models/zergling.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/zergling.glb) |
| unit.zergling | `public/assets/icons/unit.zergling.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-zerg-zergling.png) |
| model.roach | `public/assets/models/roach.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/roach.glb) |
| unit.roach | `public/assets/icons/unit.roach.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-zerg-roach.png) |
| model.baneling | `public/assets/models/banelingex1.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/banelingex1.glb) |
| unit.baneling | `public/assets/icons/unit.baneling.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-zerg-baneling.png) |
| model.ravager | `public/assets/models/ravager.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/ravager.glb) |
| unit.ravager | `public/assets/icons/unit.ravager.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-zerg-ravager.png) |
| building.barracks | `public/assets/icons/building.barracks.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-building-terran-barracks.png) |
| building.factory | `public/assets/icons/building.factory.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-building-terran-factory.png) |
| building.starport | `public/assets/icons/building.starport.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-building-terran-starport.png) |
| tech.stim | `public/assets/icons/tech.stim.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-ability-terran-stimpack.png) |
| tech.shield | `public/assets/icons/tech.shield.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-techupgrade-terran-combatshield.png) |
| tech.infernal | `public/assets/icons/tech.infernal.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-techupgrade-terran-infernalpreigniter.png) |
| tech.heal | `public/assets/icons/tech.heal.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-ability-terran-heal.png) |
| tech.bile | `public/assets/icons/tech.bile.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-ability-zerg-corrosivebile.png) |
| tech.attack | `public/assets/icons/tech.attack.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-upgrade-terran-infantryweaponslevel1.png) |
| tech.armor | `public/assets/icons/tech.armor.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-upgrade-terran-infantryarmorlevel1.png) |
| tech.vehicle | `public/assets/icons/tech.vehicle.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-upgrade-terran-vehicleweaponslevel1.png) |
| tech.siege | `public/assets/icons/tech.siege.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-siegetank.png) |
| tech.boost | `public/assets/icons/tech.boost.png` | [source](https://dist.sc2arcade.com/star-assets/buttons-png/btn-unit-terran-medivac.png) |
| ui.minerals | `public/assets/icons/ui.minerals.png` | [source](https://dist.sc2arcade.com/star-assets/ui-png/ui_emoticons_minerals.png) |
| ui.gas | `public/assets/icons/ui.gas.png` | [source](https://dist.sc2arcade.com/star-assets/icons-png/icon-vespene.png) |
| terrain.char | `public/assets/terrain/terrain.char.jpg` | [source](https://dist.sc2arcade.com/star-assets/terrain-tilesets/Char%20Dirt.jpg) |
| terrain.rock | `public/assets/terrain/terrain.rock.jpg` | [source](https://dist.sc2arcade.com/star-assets/terrain-tilesets/Char%20Rock.jpg) |
| model.hive | `public/assets/models/hatcheryex1mp.glb` | [source](https://dist.sc2arcade.com/star-assets/models-glb/hatcheryex1mp.glb) |

Place valid files at these paths and run `npm run assets:prepare`. Fonts are not downloaded. Original animations/effects are acquired through `npm run assets:animate`; the friend build rejects missing animation/death packages. Development explicitly labels its fallback if conversion fails.
