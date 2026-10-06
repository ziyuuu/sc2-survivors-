# 三族绘制封面 · R3

内置 image_gen 的纯文字生成模式。9 张新绘封面，均已复制到本项目，PNG 实际尺寸均为 1672 × 941。没有上传任何项目原素材、模型、纹理或截图；没有替换游戏运行模型。字体仍为系统回退。

| 阵营 | 立绘 | 场景 | 原始文件 |
| --- | --- | --- | --- |
| 人族 | 雷诺 | 休伯利安机库 | [terran-raynor.png](terran-raynor.png) |
| 人族 | 诺娃 | 隐秘行动平台 | [terran-nova.png](terran-nova.png) |
| 人族 | 泰凯斯 | 钢铁与火光 | [terran-tychus.png](terran-tychus.png) |
| 虫族 | 凯瑞甘 | 刀锋女王与虫巢 | [zerg-kerrigan.png](zerg-kerrigan.png) |
| 虫族 | 扎加拉 | 虫群之母 | [zerg-zagara.png](zerg-zagara.png) |
| 虫族 | 德哈卡 | 泽鲁斯原始进化 | [zerg-dehaka.png](zerg-dehaka.png) |
| 神族 | 阿塔尼斯 | 达拉姆与艾尔 | [protoss-artanis.png](protoss-artanis.png) |
| 神族 | 泽拉图 | 沙库拉斯虚空 | [protoss-zeratul.png](protoss-zeratul.png) |
| 神族 | 菲尼克斯 | 净化者舰队 | [protoss-fenix.png](protoss-fenix.png) |

完整生成提示词见 [prompts-r3.json](prompts-r3.json)。图像内容没有通过本地绘图脚本替代生成；横竖屏复用原始画面，通过 CSS 裁切焦点和渐变适配。

本轮查看的公开参考包括 [暴雪官方 UI 改版与战役界面](https://news.blizzard.com/en-us/article/19911221/new-user-interface-coming-to-starcraft-ii)、[暴雪官方三族近景封面](https://news.blizzard.com/en-us/article/23544726/starcraft-ii-update-october-15-2020) 与 [虫群之心主菜单截图](https://sports.khan.co.kr/article/201301221709473)。参考观察为构图、文字量和人物／场景光影关系；新生成调用没有附带这些图片。

全部图像的字节、尺寸和 SHA-256 保存在 `reports/local/ui-redesign-20261003/artifact-r3.json`。原图按新文件保存，既有模型渲染图与 R1／R2 交付均保留。
