# Coze升级指南：英雄、死亡与中心扩张地图

本版使用战局schema14、永久档案v5。应用、更新工具、完整清单和必需的真实模型资源都在Git中；日常升级不需要重复下载ZIP，也不需要转换SC原素材。离线HTML与ZIP只作为本地交付备用。

保留现有Coze项目、访问域名、PORT、ASSET_BASE_URL、ASSET_ROOT和生产配置。永久成长、三族余额和预设不清空。旧开发战局只能导出留档，新局使用schema14。

## 已部署项目：按缺项升级

1. 确认服务器资源目录在重新部署后仍保留。不能持久保存时，将资源放在独立HTTPS静态服务，保持ASSET_BASE_URL指向同一个目录。浏览器缓存与服务器资源目录是两份独立缓存。
2. 从本次交付的固定40位提交取得`deploy/coze`，放到暂存目录，不覆盖在线入口。已有仓库使用同一稀疏目录更新；首次取得应用可用下方命令。
3. 用新应用中的更新工具，指定**原项目与原资源根目录**：

```sh
node <新应用>/apply-update.mjs --app <新应用> --root <原项目> --assets <原资源根目录> --commit <目标40位提交号>
```

资源根目录必须是`assets/`的父目录。工具先验证本地文件，散列相同的直接复用；只下载目标完整清单中缺失或损坏的真实LFS对象。它不要求部署方恰好使用上一版。若已取得本地资源差量ZIP，可解压后追加`--resources <差量目录>`，无需再下载相同文件。

4. 资源与应用均通过校验后，工具才更新`active-release.json`。旧应用与旧散列资源保留；失败不会切换应用，不修改`.env`或浏览器存档。
5. 首次使用此工具时会安装`start-coze.mjs`启动器并修改`package.json`的start命令，其他配置保留。核验预览后，在原Coze项目重新部署或重启。原进程在重启前仍服务旧版。若平台重新生成整个发布目录，应将应用及资源清单同步到其发布来源，不能只改临时容器。
6. 独立HTTPS托管时，先把新增散列文件上传到原资源目录，再切换应用。资源完整后才重新部署，不能只更新JS而漏掉模型。
7. `/health`中的`appBuildId`、`assetReleaseId`、`runSchema:14`必须与本版`public/web-release.json`一致。应用ID与资源ID独立，纯代码更新时资源ID可以不变。

更新失败可重试同一命令。成功后需要回退时，将`active-release.json.directory`恢复为其`previous`字段记录的目录并重启；不删除资源。旧应用不能继续读取较新的战局格式。

## 从Git只取得应用

将占位值替换为交付提交号。所有应用与资源操作都固定同一提交，不跟随main在操作中途变化。

```sh
GIT_LFS_SKIP_SMUDGE=1 git clone --filter=blob:none --no-checkout https://github.com/ziyuuu/sc2-survivors-.git sc2-delivery
git -C sc2-delivery sparse-checkout init --cone
git -C sc2-delivery sparse-checkout set deploy/coze
GIT_LFS_SKIP_SMUDGE=1 git -C sc2-delivery checkout <目标40位提交号>
cd sc2-delivery/deploy/coze
```

`GIT_LFS_SKIP_SMUDGE=1`避免检出时下载全部素材；运行资源随后由工具按需获取。工具下载LFS的实际内容，拒绝把指针文本当成模型。已有稀疏仓库只需fetch目标提交并checkout，不需要重复clone。

## 首次部署与分批获取

需要Node22以上，无需安装应用依赖。首次部署可按七组取得运行资源；已有部署升级也可用相同命令预取，增加`--resources-only`，并将`--out`改为原资源根目录。

```sh
node fetch-resources.mjs --commit <目标40位提交号> --group common --out public
node fetch-resources.mjs --commit <目标40位提交号> --group campaign --out public
node fetch-resources.mjs --commit <目标40位提交号> --group enemies --out public
node fetch-resources.mjs --commit <目标40位提交号> --group terran --out public
node fetch-resources.mjs --commit <目标40位提交号> --group zerg --out public
node fetch-resources.mjs --commit <目标40位提交号> --group protoss --out public
node fetch-resources.mjs --commit <目标40位提交号> --group endless --out public
npm start
```

也可使用`--group all`，或逗号指定多组。每组都跳过已校验文件，可以中断后重跑；最多四次重试，每个文件核对字节数与SHA-256。同内容只保存一次。完整发布仍需七组齐全。基础版本不同只影响缺项数量，不强制全量下载。

公开仓库无需凭证；私有仓库用服务端环境变量GITHUB_TOKEN提供只读权限，不能放入网页或Git。404先检查固定提交及访问权限，LFS限流或配额错误需解决服务状态，不能跳过散列验证。

跨机器离线交接可使用本地`SC2-Coze-App.zip`与`SC2-Web-Resources.zip`，或应用包与资源差量包；这不是日常Git升级的必经步骤。

## 资源托管与缓存

同域部署默认从`public/assets/`提供资源。ASSET_ROOT可指向其他持久目录，目录内应有assets/。服务监听`0.0.0.0`并使用平台PORT，默认3000。

独立资源服务配置示例：

```text
ASSET_BASE_URL=https://你的资源域名/sc2/
```

实际文件地址为`https://你的资源域名/sc2/assets/<散列>.glb`。这里不能填写GitHub预览页；GitHub用于部署取资源，不充当长期游戏资源CDN。

静态资源服务需支持GET/HEAD/OPTIONS和跨域读取；无Cookie时可用`Access-Control-Allow-Origin: *`。GLB、JSON、WebP、音频及SVG需正确内容类型，SVG使用`image/svg+xml`。散列文件使用`Cache-Control: public,max-age=31536000,immutable`，入口、清单与runtime-config.json使用重新验证或no-cache。支持gzip/Brotli时客户端校验解压后的实际字节。

首次正常游玩自动缓存，不要求玩家先点预下载。再次访问只下载缺项或变化文件；解析模型与准备显卡仍可能需要短暂等待。保持原访问域名才能复用原站点的浏览器缓存。浏览器空间不足或主动清理后允许重新补取，不清理永久成长。

## 发布检查

- 健康检查中的应用ID、资源ID、schema与本次清单一致。
- 三族完整首载与再访，实际模型下载量及缓存复用正确；没有404、LFS指针、跨域或散列错误。
- 中心扩张地图、固定左上小地图、载体线框与详情、英雄真实弹体及死亡显示正常。
- 桌面和手机横竖切换、150%文字、发展→购物→一次继续可操作；iframe需允许fullscreen。
- 新局存读保留种族、难度、伤损与未完成选择；进入无尽为独立平地。

Coze账户内预览与重新部署由部署方完成，本地通过不代表线上已经发布。[Coze官方部署说明](https://docs.coze.cn/guides_deploy_vibe_web)

## 开发机生成交付

```sh
npm run build:web
node --import tsx tools/publish-coze-tree.mts
python tools/package-coze.py
npm run build
```

差量默认对比Git HEAD已提交的资源清单，重复构建不会丢失未发布变化。也可用`--base-manifest <旧版资源清单.json>`指定已部署基线；基线读取失败会停止，不悄悄改成全量。仅首次发行且确实无旧清单时用`--first-release`。

Git提交源码、deploy/coze及清单实际引用的变化运行资源。旧散列文件保留，不重复提交HTML或ZIP，不改写历史。推送后按固定提交读取远端真实资源并核对散列。业务后台与管理员统计本轮仍未实现。
