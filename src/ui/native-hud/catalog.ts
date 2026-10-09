import type {Race} from '../../data/races';
export interface HudSkin {id:string;race:Race;name:string;skin:string;accent:string;material:string}
export const HUD_SKINS:readonly HudSkin[]=[
  {
    "id": "terran-01",
    "race": "terran",
    "name": "人族 · 经典装甲",
    "skin": "consoleterran_classic",
    "accent": "#90ddb5",
    "material": "钛灰合金 · 绿色状态灯"
  },
  {
    "id": "terran-02",
    "race": "terran",
    "name": "人族 · 机械工坊",
    "skin": "consoleterran_machined",
    "accent": "#e9b66b",
    "material": "重型机械 · 琥珀指示灯"
  },
  {
    "id": "protoss-01",
    "race": "protoss",
    "name": "神族 · 净化者",
    "skin": "fenix_consoleprotoss",
    "accent": "#efc472",
    "material": "象牙装甲 · 金色能量脉络"
  },
  {
    "id": "protoss-02",
    "race": "protoss",
    "name": "神族 · 奈拉齐姆",
    "skin": "consoleprotoss_nerazim",
    "accent": "#76d4b1",
    "material": "紫金曲面 · 翠绿能量核心"
  },
  {
    "id": "zerg-01",
    "race": "zerg",
    "name": "虫族 · 虫群",
    "skin": "consoleskinzergdefault",
    "accent": "#d7a25d",
    "material": "有机甲壳 · 棘刺与筋膜"
  },
  {
    "id": "zerg-02",
    "race": "zerg",
    "name": "虫族 · 原始虫群",
    "skin": "dehaka_consolezerg",
    "accent": "#acc956",
    "material": "黑岩骨甲 · 荧绿生命腔"
  }
];
