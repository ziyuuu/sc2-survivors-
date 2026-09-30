# 本轮交付 · 2026-09-30

固定应用与资源提交：`fad19db54504d8e37b6bec16d04cca5bea43946e`（main）。验收记录提交不改变应用／资源树。

- 离线试玩：`D:\星际\dist\SC2-Survivors-Demo.html`，415,057,198字节，SHA-256 `2b6d4a22e508fe8c7ce814b018ecf5e814787180e34793e436628bad099f6d68`。
- Coze应用：`dist/coze-deployment/SC2-Coze-App.zip`，579,992字节。
- 资源更新：`dist/coze-deployment/SC2-Web-Resources-Update.zip`，147,208,869字节；完整资源包仅首次部署备用。
- 完整校验清单：`dist/coze-deployment/CHECKSUMS.json`。
- 本地逐身份画面与录像索引：`reports/local/hero-iteration/visual-review.html`。

18英雄、30普通与90精英，真实飞行／命中、完整有界死亡播放、三主题九布局、建筑线框及响应式界面均有逐项工程证据。745规则测试、数据文档、离线/Web构建、最终浏览器及断网存读通过。远端90变化资源/170,045,790字节及6应用文件全部散列相符；441未变资源复用。

## 已部署Coze怎样升级

按[Coze升级指南](COZE_GITHUB_DEPLOY.md)，将示例目标提交替换成上面的40位提交；在原项目升级，保留原域名、环境变量和持久资源目录。只取deploy/coze，工具按完整目标清单补缺；无需下载离线HTML或全部ZIP，已有散列一致模型会跳过。先补资源再切应用。服务器health应显示appBuildId `349286b4a8f860330226b1428ec7d4458410dde9b4a36641848772d428b8f688`、assetReleaseId `ab86912deb86a0a8bf083cb6b10c5be6b988b995220f87502b2910c8cbfb6e64`、schema14。

## 保持开放

- 人工对英雄辨识、出手华丽度和死亡表现的统一验收。
- 三款全息科技球原可动死亡片段及完整原版Havok/粒子还原。
- 完整自然前六关、第12/16—18关、无尽、41/80点和实体设备M6/M7覆盖。已测六段早期样本达帧时门槛；合法第10—11关180秒样本帧时达标，但瞬时欠账峰值0.11663秒仍超0.1秒，不据此关闭M6。

详见[工程核验](HERO_MAP_UI_VALIDATION_20260929.md)与[性能报告](HERO_MAP_PERFORMANCE_20260930.md)。不以构建、录像或局部帧时证明MVP最终签收。Coze账户内发布由执行方完成。
