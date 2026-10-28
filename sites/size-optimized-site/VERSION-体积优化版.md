# 体积优化版 · Sites第13版

当前发布身份及验证见[项目发布记录](../../docs/project/SITES_QUALITY_DEPLOY_20261028.md)。站点保持原网址、公开权限及DB/BUCKET，已发布源码为355c01a24c888024bac3c93c6b03cc6c7b943138。

- 游戏构建27897f5107714c97b660e39525ecd25b5c709cebfa30158a3e4ea127afcfe0b9，存档runSchema 26、规则mvp-1.0保持。
- public保存完整三档资源与旧资源源码；生产构建通过scripts/build-delivery.mjs裁剪由BUCKET承载的资源包。delivery/assets.json是精确白名单，mode默认r2且关闭上传。构建输出不能直接当成包含全部资源的离线包。
- 已有WebP/Opus属于有损衍生资源；本轮按批准方案增加中低档变体，KTX2没有全量采用。服务器资源托管不再编码或改变这些字节。
- 403个新旧包通过原网址读取，原有统计/反馈后台和玩家存档保持；密钥不在源码内。第13版线上资源与首战验证通过，原手机和完整画质体验待用户验证。
- 此目录是主仓库跟踪快照，sites/v04-private-test为独立Sites仓库。GitHub推送与Sites部署分别完成，不假定其他平台自动更新。
