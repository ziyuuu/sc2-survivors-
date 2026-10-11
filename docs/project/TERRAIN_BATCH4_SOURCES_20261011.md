# 第四批地表与环境来源清单 · 2026-10-11

28 个原 DDS 文件对应 28 个独立派生 PNG。既有原文件保持只读；此清单记录实际字节来源与转换，不代表 SC2 客户端的完整材质或天气复刻。

- 冰雪身份目录：[fbbd6429b1eb6978c78a092dc68ba09029d03171](https://raw.githubusercontent.com/Joshua-Leibold/SC2Data/fbbd6429b1eb6978c78a092dc68ba09029d03171/mods/swarm.sc2mod/base.sc2data/gamedata/terraintexdata.xml)。
- 目录 SHA-256：`c21887c1d329417722c32f83a8bdaa3cfc8415ac8adbf59078c7d45029f978c9`。
- 文件下载端点与完整机器可读条目：`tools/terrain-batch4-sources.json`。
- PNG、Git 路径和生成代码绑定：`deploy/runtime/environment-textures.json`。

颜色保留解码后的原 RGB，alpha 置为不透明。法线按 SC2 压缩法线约定从原 alpha 读取 X、从 green 读取并反转 Y，再归一化为 RGB；法线 alpha 没有被当作地形高度、地表覆盖率或材质透明度。灰烬逐像素保留原 DDS 中的 alpha 覆盖，RGB 改为白色供着色；其余装饰粒子把原图 RGB 最大值作为新透明度。这些是明确的适配，不把源 alpha 当作地形高度或混合权重，也不宣称复刻原作天气。

| 资源 | 原 DDS | 分辨率 | PNG 字节 | 原始 SHA-256 | PNG SHA-256 |
| --- | --- | --- | ---: | --- | --- |
| sand | [marsaraex2_2.dds](https://dist.sc2arcade.com/star-assets/textures/marsaraex2_2.dds) | 1024×1024 | 469137 | `d2fa7a429b73f1b13f7fd05fd443d813987a1bdb64f78a54f8772f7a32d3aa6a` | `3cf0305cdb90be3e810e7d602a8e900f394eb41e0b45a0ccc09775443e48fb91` |
| sand-normal | [meinhoffex3_1normal.dds](https://dist.sc2arcade.com/star-assets/textures/meinhoffex3_1normal.dds) | 512×512 | 401352 | `ba984902a76ebe03b265f51340705327996d8fd00c2cf5b9accef096a1a8b785` | `c286b81a3f0d3e11b04144eb234b073b28032b75747e63163d65c9f0952a6a7c` |
| rock | [marsaraex2_3.dds](https://dist.sc2arcade.com/star-assets/textures/marsaraex2_3.dds) | 1024×1024 | 635860 | `001425f40533b204a45aef540a3ed885cf9c1f3060eb326da8339034b55a0e09` | `02346f52eff4965223e301e6f2bc46d6c4c3370eeac1a4919af0b18e3c3cff67` |
| rock-normal | [korhalcityex2_7normal.dds](https://dist.sc2arcade.com/star-assets/textures/korhalcityex2_7normal.dds) | 512×512 | 463992 | `f13ddc53dbf5e1e88840aaaf948cd0d97bb619e15c9b2de12db886d25206ad76` | `50d8c458028d0ebf8f05247d402bbf318cdd800c4b83879cfee29adee86d5121` |
| cracked | [marsaraex2_4.dds](https://dist.sc2arcade.com/star-assets/textures/marsaraex2_4.dds) | 1024×1024 | 873093 | `16c9f894e99633730b6d8abf37b606b554e6ee1516b2389ee2094ec560a273ff` | `0db05d5a34d083a01590304dcbe160b4552f8b18d0dfb0b1ed767e6d0df1bfe3` |
| cracked-normal | [marsaraex2_4normal.dds](https://dist.sc2arcade.com/star-assets/textures/marsaraex2_4normal.dds) | 1024×1024 | 1498241 | `9a29ddfe4aed7b606a88e225f1d8f67fa05ec75d2baaa146bd6426c60df5c023` | `b7b98a2eedb1cf86f4365becb3b121538937e044454a4b2fdddc34dd7b8bfff6` |
| dark-rock | [marsaraex2_6.dds](https://dist.sc2arcade.com/star-assets/textures/marsaraex2_6.dds) | 1024×1024 | 738070 | `aee4914e239ef50fa3d1ef1dce80474c4d80caa4656743bc8b8dd7493d4cfd8d` | `88d78ba5904ef1af6c6a82d37d270fcbcd639832bc84e214791a1dd97bb59632` |
| dark-rock-normal | [snowrefinery_05normal.dds](https://dist.sc2arcade.com/star-assets/textures/snowrefinery_05normal.dds) | 512×512 | 453627 | `5e070e325a3b38b62b877486735e7c43730dcd51caeb64fee2134f7971e9d4bb` | `399993acb0fac4a5f562da73dcfacff8d6ed73399c5d8015b17be317e89d05d8` |
| panels | [castanarex2_panels.dds](https://dist.sc2arcade.com/star-assets/textures/castanarex2_panels.dds) | 1024×1024 | 674858 | `8a3f9d30dd8bf4dea055f3bc7c97f3630daecfd6d282e12968abb88a0c54bf73` | `71adbce29a2c24f51334e7675084cafe60a9594c5e98d165be88460985fa78c8` |
| panels-normal | [castanarex2_panelsnormal.dds](https://dist.sc2arcade.com/star-assets/textures/castanarex2_panelsnormal.dds) | 1024×1024 | 670931 | `916522bcf8de28141ee963251c8ab04b6d30e808e6269548dae49b1100abd241` | `bf2222eb85c933ce7756d16f6cd7c151eafb50ed0ba44aceb139d957d11f11d0` |
| plates | [prisonship_7.dds](https://dist.sc2arcade.com/star-assets/textures/prisonship_7.dds) | 512×512 | 150941 | `095f2a84034467d4b4925e7f7f639e15116daf33f53e77699adfd660c958e03c` | `542726b35d4a66f731a3a26c518292b310ff74fb1b62d1b37ca1f921f0691a35` |
| plates-normal | [prisonship_7normal.dds](https://dist.sc2arcade.com/star-assets/textures/prisonship_7normal.dds) | 512×512 | 243710 | `46da32cd428b1372d6f28a077923bc0d411092aa566185f78b26a04a100110e6` | `e06eb7566e07ba065ea0f17e1646266789a523b5cc0ff4a0b807496e8c83bca6` |
| char-soil | [char_dirt.dds](https://dist.sc2arcade.com/star-assets/textures/char_dirt.dds) | 512×512 | 229891 | `0c18bfcfeed5cbb97eb152e6c64fd1bd85992fbd5a17c8dcb030c65fc6a65d09` | `1199b51bd6b3733dacf4608d54f399e78f3757364d5039c7118cf3bade5fd16c` |
| char-soil-normal | [char_dirtnormal.dds](https://dist.sc2arcade.com/star-assets/textures/char_dirtnormal.dds) | 512×512 | 498037 | `28bc079f94a624f174140b850594d8f773ce24ae8fd6524efbe8cb1698f0975a` | `7444c7fe09ec5d1bf6405b72b21d9464d1cb32b0bb89061d1d1b9003899cce3c` |
| char-rock | [char_rock.dds](https://dist.sc2arcade.com/star-assets/textures/char_rock.dds) | 512×512 | 266519 | `8e0259a10d0b647e06e0fafd76acd5ef1ea088ba66c6d8e4b7ec8a6ce3d7a31b` | `97518c4da75f3c709f813412c89ab64c4677ee991f0e48c73fd8566a4e770d8e` |
| char-rock-normal | [char_rocknormal.dds](https://dist.sc2arcade.com/star-assets/textures/char_rocknormal.dds) | 512×512 | 496134 | `d0b1cbdc0c82dfe4cf707e27445d573144e73f400adcf6d01710c12ae65bc1dc` | `785bcde623e230a4277935b7ba6ca8aae98589b0276da46baf65518228d0843c` |
| char-cracked | [char_dirt_cracked.dds](https://dist.sc2arcade.com/star-assets/textures/char_dirt_cracked.dds) | 512×512 | 276229 | `35fa232de800779403ac9614e9b468bbbc195046f7da85831928bb932e75a3c4` | `ace43e1f12c11956e2006e3588ca12aeb6c37ba330a11dbcd9c3ba9e5b3da00c` |
| char-cracked-normal | [char_dirt_crackednormal.dds](https://dist.sc2arcade.com/star-assets/textures/char_dirt_crackednormal.dds) | 512×512 | 603089 | `2a6b37d38f1e60b70ed9c8b17ff422d0c7ab6a5a424ede458d19c8e26e868cea` | `4c73fe70b694c24596e112bffcc9bf81055f61bae2e1f99cd6d3f3dba7cc3438` |
| snow | [iceworld_1.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_1.dds) | 512×512 | 236505 | `70250012e39a746950414efab0e7eeb236f950e37ec176fa55223447c2d36841` | `bd4c07f74f6f3cb894028a59d4ecd67a5241927c83a0e5f25e73a796af6feffa` |
| snow-normal | [iceworld_1normal.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_1normal.dds) | 512×512 | 387892 | `4c6adb7459740bd7aa04247c0520769e92ed1473e09d9506ff7fab8420ebfef8` | `c6b6057d4db284456948464e95b899f87dac9bcdd4f551638c1d83031f3199a4` |
| ice | [iceworld_2.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_2.dds) | 1024×1024 | 878592 | `947bd772e5dd1851eddafeb50085280c772269c7db3dc3a6551f90b8521f2325` | `14ab456aa3e459d53c67f27a5d36bc3015c397409c1550de19c988822b1dd7c2` |
| ice-normal | [iceworld_2normal.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_2normal.dds) | 1024×1024 | 1490138 | `22cdc00d2da04c7d65cb0a024351ae64e706166a49fa4c661fe206433ab61b13` | `f7ec8f603e7a0096e2020f79f425ea65a528daf3de1375be07267e63244fdde9` |
| ice-rock | [iceworld_8.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_8.dds) | 1024×1024 | 1176235 | `bb02debd4b893d7f43f24cb9b60b6bd9698baf23cafc74b1a9db3491f4a26430` | `45cd96ba0285a879cc220b070f0afef3004a04d4e12e3069ab652d37650daa29` |
| ice-rock-normal | [iceworld_8normal.dds](https://dist.sc2arcade.com/star-assets/textures/iceworld_8normal.dds) | 1024×1024 | 2230409 | `d08dba0bfa32e18ad1e21f9943fadd229695832c37f1caf89fb6f43d6d77526f` | `eeb8466bc6e5c6d410a292d19d6c774fe53c3511c0774d95a844dd1f94d83ab9` |
| dust | [dust3.dds](https://dist.sc2arcade.com/star-assets/textures/dust3.dds) | 64×64 | 2584 | `cbafd0dc52de1dbcf0adfeb6d42d8a5dea669e80fdb0fe24eef192c12cbd7524` | `86290b53c9d07a968200f3c6f243ee3740da820c5dd93095d48142255a9bf2fd` |
| smoke | [smoke_wispy11.dds](https://dist.sc2arcade.com/star-assets/textures/smoke_wispy11.dds) | 256×256 | 36791 | `7ea661b3c3e8d1bc69fb8284c9f78247f008421cb020af7553641a4f39769131` | `5d571738306396ed8537d9bfe2c5f6f8540d1022fd11d96b3ae2c14eb0dedbae` |
| ash | [ash_r1.dds](https://dist.sc2arcade.com/star-assets/textures/ash_r1.dds) | 256×256 | 35034 | `b0294515b071eb0b761ef03e14d3dabe88f25f2efe7121959b383dff371d3e44` | `6578f7d42b0960c7e7ad619f7b52797ccd3dee163d82e292c8fa9dcc3777759b` |
| snow-fleck | [dustdots2.dds](https://dist.sc2arcade.com/star-assets/textures/dustdots2.dds) | 128×128 | 1946 | `e616e1b6d5ebf65fa92ef965463db1da875aef9b8a3409a9abea8df898526aeb` | `af503082f0a1cef0ef211396a856a296460951813956af011a33f89957b54c60` |

总计原 DDS 18993056 字节；新增派生 PNG 16119837 字节。

首次来源记录把所有 alpha 都标为 unused，和法线转换说明不一致。该元数据已修正为法线使用 alpha-X、颜色/粒子不使用原 alpha；初始清单保留在本批本地证据中。此次修正未改变任何原 DDS、派生 PNG 或运行资产标识。
