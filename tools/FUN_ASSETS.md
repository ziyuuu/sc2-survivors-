# 趣味遭遇原素材重建

运行时构建读取已哈希的 deploy/runtime/mission-assets.json、combat-effects.json 和对应打包文件；普通 Vite 构建不要求重新下载原件。

- 原始模型输入：tools/fun-models.json；锁定原件：tools/fun-dependencies.json；源粒子输入：tools/fun-source-map.json。
- 使用现有 import-m3-pack.mjs 导入 model.fun-* 六个模型。为遵守本项目图片保存在 D 盘的约定，在 D 盘工作目录中运行资源转换，复制 tools 脚本并联接已有 node_modules、assets/private；不要在 C 盘积累转换图片。
- 追加源粒子时，把 fun-source-map.json 复制为该次 --out 目录中的 source-map.json，以新增这两个定义前的 catalog.json 与 combat-effects.json 作为基线，运行 node tools/prepare-combat-effects.mjs --append --out=<D盘证据目录> --dependencies=tools/fun-dependencies.json。--append 拒绝替换已有定义，不能对已含 FunNydus／FunCocoonDeath 的目录重复追加。
- 不把 CocoonDeath 导出为GLB：原件只有粒子。FunNydus 的身体由单位原模型绘制，源特效条目只负责九个粒子发射器与一条带。
- 合并新增记录时按内容SHA去重，既有ID的SHA必须相同；新增文件存D盘并通过 public/assets/fun、fun-fx 的目录联接提供开发入口。deploy/runtime/<sha> 为打包入口。prepare-mission-assets.mjs 保留已登记的趣味模型并允许从 gitPath 恢复资源读取。
- 本次可复核脚本与全部失败／中间输出：D:/星际/reports/local/fun-gameplay-implementation-20261020/；关键步骤 setup-assets.mjs、extract-fun-assets.ps1、register-models.mjs、setup-source-fx.mjs、register-fx.mjs。原件SHA见 original-fun-assets.json，最终输入与构建绑定见 reports/qa/fun-gameplay-20261020.json。
