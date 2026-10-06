import {rankStats} from './ranks';
import {TERRAN_ELITE_BODIES,eliteFixedGrowth} from './terran-elites';
/** Explicit approved P4-B runtime rules. The planning JSON is never imported by the game. */
export const ZERG_ELITE_RULES={
  "zergling.1": {
    "name": "裂爪狂潮",
    "body": "assault",
    "parameters": {
      "stacks": 8,
      "attackSpeedPerStack": 0.3,
      "stackExpireSeconds": 2,
      "lightDamageFactor": 1.5
    },
    "description": "双身体交替撕咬；连续出手逐层叠加狂潮，打出远超普通虫群的近战密度。 两个真实身体共享狂潮层数，各自武器周期；不复制第三身体；幸存再生仍按900步。",
    "visual": "两身体真实爪击密度、红色甲节，不加假分身。"
  },
  "zergling.2": {
    "name": "噬甲獠牙",
    "body": "precision",
    "parameters": {
      "armorReduction": 0.5,
      "armorSeconds": 4,
      "finisherEveryCycles": 3,
      "finisherDamageFactor": 4,
      "armoredDamageFactor": 1.6
    },
    "description": "双身体同一周期连续命中后撕裂护甲，第三次啃咬释放处决伤害。 按身体真实周期计数；处决替换该次伤害，非额外四击；Boss可破甲不能秒杀，不打空军。",
    "visual": "粗硬獠牙、实际第三次深咬和破甲甲片。"
  },
  "zergling.3": {
    "name": "共生血巢",
    "body": "bulwark",
    "parameters": {
      "sharedDamageFraction": 0.5,
      "lifeStealFraction": 0.25,
      "survivorRegrowSteps": 900,
      "regrowHpFraction": 0.6
    },
    "description": "双身体分摊伤害，攻击吸收养分；一体存活维持另一体再生。 分摊不能回环；按有效生命伤吸血，不能吸盾/无敌；900步保留，任一体都死仍丧失名额。",
    "visual": "双体短生体连线、实际吸血，不画成永久不死。"
  },
  "baneling.1": {
    "name": "灾厄酸核",
    "body": "assault",
    "parameters": {
      "explosionDamageFactor": 3,
      "radiusFactor": 1.8,
      "postExplosionStopSeconds": 5
    },
    "description": "自爆伤害三倍、酸爆覆盖扩展，爆后存活但停顿五秒。 仅玩家爆虫存活；停顿不能通过升级/读档跳过；酸爆一次，无法对空，不把爆炸当免费技能连发。",
    "visual": "大酸核真实爆心和存活休眠身体。"
  },
  "baneling.2": {
    "name": "腐土播种者",
    "body": "precision",
    "parameters": {
      "explosionDamageFactor": 2,
      "acidGroundSeconds": 5,
      "acidDpsI": 420,
      "acidRadius": 4,
      "postExplosionStopSeconds": 5
    },
    "description": "爆心留下腐土，五秒休眠期间继续侵蚀范围内地面敌军。 腐土逐秒按实在范围敌人结算，同源取强值；Boss允许固定伤害，无永久百分比蒸发。",
    "visual": "真实酸爆与五次腐土脉冲，恢复前不移动/攻击。"
  },
  "baneling.3": {
    "name": "甲壳反应堆",
    "body": "bulwark",
    "parameters": {
      "storedDamageFraction": 0.5,
      "storedDamageMaxHpFraction": 2,
      "explosionDamageFactor": 1.8,
      "healMaxHpFraction": 0.35,
      "postExplosionStopSeconds": 5
    },
    "description": "受到攻击积累酸压，爆炸释放储压并把部分威力变成自身再生。 只积累实际承受敌伤，不收无敌阻止量/友伤；储压一次消费，固定上限可被击杀，爆后同样停五秒。",
    "visual": "甲壳酸压由暗到亮、释放一次、有效再生。"
  },
  "roach.1": {
    "name": "深壳堡垒",
    "body": "bulwark",
    "parameters": {
      "lowHpThreshold": 0.35,
      "lowHpArmorAdd": 8,
      "burrowSeconds": 3,
      "burrowCooldown": 18,
      "burrowHealMaxHpPerSecond": 0.12
    },
    "description": "血量越低甲壳越硬，濒危时自动钻地短时修复后出土。 自动钻地为明确新变体行为；受侦测仍可被击杀，钻地不攻击；不取消指令或无限躲避Boss。",
    "visual": "原蟑螂钻入/出土动作、厚甲与实际再生。"
  },
  "roach.2": {
    "name": "穿甲酸喉",
    "body": "precision",
    "parameters": {
      "stacks": 5,
      "damagePerStack": 0.3,
      "burstEveryCycles": 6,
      "burstDamageFactor": 4,
      "burstRadius": 2.5
    },
    "description": "同目标连续酸击逐层软化重甲，第六发喷出高浓酸。 六发循环，转火清酸层；高浓酸替换第六发主伤，不把层数和四倍再无限相乘。",
    "visual": "酸囊逐层膨大、第六发真实粗酸弹和局部接触。"
  },
  "roach.3": {
    "name": "反噬菌甲",
    "body": "assault",
    "parameters": {
      "retaliationDamageFraction": 0.6,
      "retaliationRadius": 2,
      "retaliationInternalSeconds": 0.5,
      "attackRegenMaxHpPerSecond": 0.04,
      "regenSeconds": 4
    },
    "description": "受到近战攻击反射腐蚀，攻击命中后再生增强，成为能输出的生体前线。 反伤以实际受伤包为基数，无递归；只反近战敌人，不能让远程或空军无成本受伤。",
    "visual": "甲壳受击喷酸与四秒有效再生，普攻保持原酸弹。"
  },
  "ravager.1": {
    "name": "连囊炮手",
    "body": "assault",
    "parameters": {
      "bileCount": 3,
      "bilePacketFraction": 1,
      "bileInterval": 0.3,
      "bileCooldownFactor": 0.75,
      "bileBaseDamageI": 1200,
      "bileBaseCooldown": 12
    },
    "description": "胆汁技能一次投出三枚，沿同一目标区域分段砸落。 三枚独立预警/落点，重叠允许三次实际伤害；仍需原胆汁技能解锁，不把普攻重复当技能。",
    "visual": "三次真实胆汁上抛与各自危险落点。"
  },
  "ravager.2": {
    "name": "破城酸星",
    "body": "precision",
    "parameters": {
      "bileDamageFactor": 4,
      "bileRadiusFactor": 1.5,
      "armoredAndBuildingDamageFactor": 1.5,
      "armorReduction": 0.5,
      "armorSeconds": 5,
      "bileBaseDamageI": 1200,
      "bileBaseCooldown": 12
    },
    "description": "胆汁变为超重酸星，对重甲/建筑增伤并短时降低正护甲。 胆汁冷却不缩；体积与延迟保留，建筑/重甲倍率取一次；不是打Boss生命百分比。",
    "visual": "单枚巨大真实酸星、预警和接触裂甲。"
  },
  "ravager.3": {
    "name": "腐蚀雨幕",
    "body": "support",
    "parameters": {
      "rainSeconds": 6,
      "rainRadius": 4,
      "rainDpsI": 380,
      "moveReduction": 0.45,
      "bossMoveReduction": 0.2,
      "bileBaseDamageI": 1200,
      "bileBaseCooldown": 12
    },
    "description": "胆汁落点形成六秒酸雨，侵蚀并迟滞地面密集敌群。 本机雨区重叠取强值，敌人离区即停止收益；普攻对空能力不改变雨区只打地面的边界。",
    "visual": "真实胆汁与六次局部酸雨脉冲，低遮挡。"
  },
  "hydralisk.1": {
    "name": "千针风暴",
    "body": "assault",
    "parameters": {
      "needles": 5,
      "needleDamageFraction": 0.7,
      "coneDegrees": 35,
      "rangeAdd": 2
    },
    "description": "每周期五根实体骨针形成窄锥，主目标承受全部实际命中骨针。 单周期最多3.5倍主伤；五根针不能各触发一轮五针，地空同原合法层。",
    "visual": "五根真实细骨针、局部命中，不画整屏箭雨。"
  },
  "hydralisk.2": {
    "name": "裂甲长棘",
    "body": "precision",
    "parameters": {
      "armoredDamageFactor": 2.5,
      "pierceLength": 12,
      "pierceWidth": 1.2,
      "secondaryDamageFraction": 0.8
    },
    "description": "重型骨棘贯穿敌阵，对装甲主目标提高伤害并穿过后排。 首目标全包，后排每敌一次80%；地空贯穿分层，不隔山射击。",
    "visual": "单根长棘与实际贯穿接触，不追加假酸爆。"
  },
  "hydralisk.3": {
    "name": "毒囊猎手",
    "body": "support",
    "parameters": {
      "poisonStacks": 4,
      "poisonSeconds": 5,
      "poisonDpsPerStackI": 120,
      "spreadRadius": 4,
      "spreadTargets": 4
    },
    "description": "主击把毒囊植入敌人，连续植入加强缓释毒伤并在敌人死亡时传播。 每来源最多四层；死亡传播只传播剩余一层且不再传播；Boss不传播，固定毒伤仍可用。",
    "visual": "实体毒针、宿主毒囊、实际死亡传播路径。"
  },
  "queen.1": {
    "name": "母巢女王",
    "body": "bulwark",
    "parameters": {
      "radius": 8,
      "allyHpIncrease": 0.4,
      "allyRegenMaxHpPerSecond": 0.02,
      "allyArmorAdd": 4
    },
    "description": "护育光环提高生物战斗友军生命和再生，自己以厚壳稳住后方。 再生只恢复HP；原45秒注卵与同舱一次保留，不把战斗光环兑换额外免费经济。",
    "visual": "原虫后育囊与低亮护育环，实际再生细光。"
  },
  "queen.2": {
    "name": "输血主母",
    "body": "support",
    "parameters": {
      "healTargets": 5,
      "healDpsI": 240,
      "range": 8,
      "channelSeconds": 4,
      "healCooldown": 12
    },
    "description": "输血改成多目标连续治疗，救回正在失血的生体阵线。 每个目标实际缺血封顶；消耗原输血能量来源，零能量不空放；机械不可受生物输血。",
    "visual": "最多五条真实生体治疗流，每秒有效恢复。"
  },
  "queen.3": {
    "name": "毒巢守卫",
    "body": "precision",
    "parameters": {
      "venomDamageFactor": 2,
      "venomMoveReduction": 0.5,
      "venomAttackSpeedReduction": 0.3,
      "venomSeconds": 3,
      "venomRadius": 3
    },
    "description": "攻击登记巢毒，受伤友军附近的敌人优先被毒刺压制。 优先级不制造新追敌移动指令；Boss控制减半；不把毒刺封锁写成无限眩晕。",
    "visual": "真实毒刺与附近敌人绿紫压制裂纹。"
  },
  "lurker.1": {
    "name": "三脊穿心",
    "body": "assault",
    "parameters": {
      "spineLines": 3,
      "fanDegrees": 40,
      "lineDamageFactor": 1,
      "pierceLength": 12
    },
    "description": "埋地下每周期沿三条扇向释放真实刺脊，中央敌人可被三线交会命中。 需埋地；每条独立交集，未在交会处只中一/两条；不以动画给三倍虚假全场伤害。",
    "visual": "三条从真实埋点伸出的脊线，接触点一致。"
  },
  "lurker.2": {
    "name": "地裂巨刺",
    "body": "precision",
    "parameters": {
      "everyCycles": 4,
      "giantDamageFactor": 5,
      "giantLength": 18,
      "giantWidth": 2.2,
      "moveReduction": 0.6,
      "slowSeconds": 2
    },
    "description": "每第四周期发出超长巨刺，击穿重甲并掀动地面敌人。 巨刺替换该周期；Boss慢速半效、不能掀飞；需地面连通/视线，无空中伤害。",
    "visual": "第四周期大脊线与真实短迟滞，不作爆炸地雷。"
  },
  "lurker.3": {
    "name": "潜巢伏击者",
    "body": "mobile",
    "parameters": {
      "burrowTimeFactor": 0.4,
      "openingCycles": 3,
      "openingDamageFactor": 4,
      "barrierMaxHp": 0.4,
      "barrierSeconds": 5,
      "triggerCooldown": 12
    },
    "description": "埋地转场更快，第一次伏击前三个周期带高额伤害和护壳。 十二秒触发内置冷却，钻出钻入不无限重开；未埋地依旧不能发刺。",
    "visual": "原钻地动作加快、前三线粗刺与有限护壳。"
  },
  "mutalisk.1": {
    "name": "六翼回旋",
    "body": "assault",
    "parameters": {
      "bouncePackets": [
        1,
        0.8,
        0.65,
        0.5,
        0.4,
        0.3
      ],
      "bounceRadius": 5
    },
    "description": "一枚刃虫最多六次反弹，后几跳保持高强度清空散群。 同一敌人最多一次命中；有六个合法邻敌才兑现全部，不把六跳全算单体。",
    "visual": "最多六段真实刃虫路径，每段各自命中。"
  },
  "mutalisk.2": {
    "name": "绞杀翼群",
    "body": "precision",
    "parameters": {
      "glaives": 3,
      "mainPacketFraction": 1,
      "bouncePackets": [
        0.35,
        0.15
      ],
      "armoredDamageFactor": 1.5
    },
    "description": "三枚刃虫同时攻击一个目标，反弹削弱但主目标可承受三重绞杀。 三枚各有实际命中，共三倍主包；转火/飞行不能刷弹次，无虚假第四身体。",
    "visual": "三枚真实刃虫出手，各自短反弹。"
  },
  "mutalisk.3": {
    "name": "血羽迁徙",
    "body": "mobile",
    "parameters": {
      "outOfCombatSeconds": 2,
      "chargeSeconds": 6,
      "barrierMaxHp": 0.8,
      "openingSeconds": 3,
      "openingAttackSpeedIncrease": 2,
      "lifeStealFraction": 0.35
    },
    "description": "脱战积蓄血羽护壳，进战前三秒高速吸血，随后恢复平常循环。 需要完整储能才最大护壳；进战消耗且不重复叠；吸血只主目标有效生命伤。",
    "visual": "真实翼膜变化、三秒密集刃虫与有效吸血。"
  },
  "corruptor.1": {
    "name": "蚀空锁喉",
    "body": "precision",
    "parameters": {
      "lockSeconds": 4,
      "maximumDamageFactor": 4,
      "airArmoredDamageFactor": 1.5,
      "armorReduction": 0.45,
      "armorSeconds": 4
    },
    "description": "对同一空中目标持续喷酸越久越强，最终形成重甲腐蚀锁。 换目标重置充能；无法攻击地面，不能把锁定爆发复制给地面Boss。",
    "visual": "真实粗酸束及锁定甲壳腐蚀。"
  },
  "corruptor.2": {
    "name": "空巢铁卫",
    "body": "bulwark",
    "parameters": {
      "radius": 7,
      "redirectFraction": 0.3,
      "redirectMaxHpPerSecond": 0.2,
      "selfDamageReduction": 0.25
    },
    "description": "护翼光环替附近空中友军承受部分直接敌伤，并靠厚甲支撑空战。 分摊量每秒有自身HP预算，不递归分摊；不是替地面全队无敌，友军真实HP伤先减少才记收益。",
    "visual": "原腐化者厚壳、实际空中分摊短脉冲。"
  },
  "corruptor.3": {
    "name": "腐空瘟囊",
    "body": "support",
    "parameters": {
      "poisonSeconds": 5,
      "poisonDpsI": 260,
      "deathExplosionI": 1800,
      "deathRadius": 4.5,
      "spreadTargets": 3
    },
    "description": "击中空军种下腐空囊，宿主死亡时爆炸并给附近空军补一个毒囊。 排除Boss/领主传播；每来源每目标一囊，继发囊不再传播，地面不受伤。",
    "visual": "宿主真实囊体、实际空中爆心与三条传播线。"
  },
  "ultralisk.1": {
    "name": "暴君镰刃",
    "body": "assault",
    "parameters": {
      "thirdDamageFactor": 3,
      "cleaveDegrees": 170,
      "cleaveRangeFactor": 1.8,
      "lightDamageFactor": 1.5
    },
    "description": "宽镰每第三击释放三倍撕裂，切断轻甲前排。 第三击替换而非额外三击；仍近战到位，不能通过墙/空军；大扇形只命中真实覆盖。",
    "visual": "第三次大镰刃接触，低遮挡局部裂甲。"
  },
  "ultralisk.2": {
    "name": "不灭甲兽",
    "body": "bulwark",
    "parameters": {
      "damageStoredFraction": 0.4,
      "storedMaxHpFraction": 0.8,
      "triggerHpThreshold": 0.3,
      "healMaxHpFraction": 0.5,
      "triggerCooldown": 25,
      "damageReduction": 0.35,
      "reductionSeconds": 5
    },
    "description": "满壳承伤积蓄甲盾，跌破生命阈值时消耗盾壳恢复并短暂稳住。 敌人可一次打穿触发阈值；护壳不是复活，冷却保存；不从免伤量储蓄，不永久免疫。",
    "visual": "厚壳储压、实际触发回血和五秒稳定甲光。"
  },
  "ultralisk.3": {
    "name": "原始踏碎者",
    "body": "precision",
    "parameters": {
      "chargeCooldown": 12,
      "chargeDistance": 6,
      "stompDamageI": 2200,
      "stompRadius": 4,
      "attackSpeedIncrease": 1,
      "empoweredSeconds": 6,
      "armoredDamageFactor": 1.5
    },
    "description": "短距冲锋结束踩碎地面，随后六秒以双倍攻速追猎重甲。 冲锋沿合法通道、撞墙截断；Boss不被击飞，冲锋不能穿崖/瞬移到落点。",
    "visual": "真实冲锋、接地重踏和六秒真实快镰。"
  }
} as const;
export type ZergEliteId=keyof typeof ZERG_ELITE_RULES;
export const ZERG_ELITE_IDS=Object.keys(ZERG_ELITE_RULES) as ZergEliteId[];
export const isZergEliteId=(id:string|undefined):id is ZergEliteId=>!!id&&Object.hasOwn(ZERG_ELITE_RULES,id);
export function zergEliteGrowth(id:ZergEliteId,rank:number){const base=rankStats(5),n=Math.max(0,Math.min(4,rank-1)),b=TERRAN_ELITE_BODIES[ZERG_ELITE_RULES[id].body];return {...base,rank,damage:base.damage*b.dps*eliteFixedGrowth(rank),health:base.health*b.hp*(1+.3*n),armor:base.armor,movement:b.move,healing:base.healing*b.heal*eliteFixedGrowth(rank),energy:5*(1+.2*n)};}
export const zergEliteArmor=(id:ZergEliteId,rank:number)=>TERRAN_ELITE_BODIES[ZERG_ELITE_RULES[id].body].armor+.5*Math.max(0,Math.min(4,rank-1));
