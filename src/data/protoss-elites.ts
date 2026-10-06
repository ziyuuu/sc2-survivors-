import {rankStats} from './ranks';
import {TERRAN_ELITE_BODIES,eliteFixedGrowth} from './terran-elites';
/** Explicit approved runtime constants, authored offline; no runtime proposal import. */
export const PROTOSS_ELITE_RULES={
  "zealot.1": {
    "name": "誓刃狂徒",
    "body": "assault",
    "parameters": {
      "stacks": 6,
      "attackSpeedPerStack": 0.35,
      "cleaveEveryCycles": 3,
      "cleaveRadius": 3,
      "cleaveFraction": 1.5
    },
    "description": "双刃连击逐层点燃战意，满层后每第三击扩大为灵能斩面。 两刃仍是一个武器周期；伤害只来自实在斩面，战意两秒无攻击清除；不新增对空。",
    "visual": "真实双刃密度与第三周期灵能弧。"
  },
  "zealot.2": {
    "name": "光盾卫士",
    "body": "bulwark",
    "parameters": {
      "shieldBreakCooldown": 14,
      "retaliationDamageFactor": 3,
      "retaliationSeconds": 4,
      "shieldPerEffectiveDamageFraction": 0.35,
      "shieldRestoreMaxPerSecondFraction": 0.15
    },
    "description": "受敌伤破盾时触发短反击窗口，近战斩击恢复有限原生盾。 只由敌伤击破原生盾触发，临时盾消失不触发；回盾按缺口和每秒预算封顶。",
    "visual": "真实盾裂、四秒强化双刃与有效回盾。"
  },
  "zealot.3": {
    "name": "裂阵先锋",
    "body": "mobile",
    "parameters": {
      "chargeDamageI": 1800,
      "chargeRadius": 3.5,
      "openingCycles": 3,
      "openingDamageFactor": 3,
      "chargeCooldown": 10
    },
    "description": "冲锋触敌时横扫落点，前三个周期每击都撕裂敌阵。 合法冲锋路径、不得隔墙触发；前三次连击是实际攻击周期，冷却不被脱战抹掉。",
    "visual": "真实冲锋与前三次接触光刃，不设假分身。"
  },
  "adept.1": {
    "name": "双相战刃",
    "body": "assault",
    "parameters": {
      "echoDelay": 0.3,
      "echoDamageFactor": 1.5,
      "lightDamageFactor": 1.6
    },
    "description": "同一周期发出实体刃与延迟相位刃，第二刃击中原落点才伤害。 回响用冻结落点，不凭残像必中；每个原周期一个回响、不递归趣味卡；无法对空。",
    "visual": "实体刃和一次实际相位回响。"
  },
  "adept.2": {
    "name": "晨星巡猎",
    "body": "mobile",
    "parameters": {
      "outOfCombatSeconds": 2,
      "openingCycles": 4,
      "openingDamageFactor": 3,
      "moveFactor": 1.35,
      "rangeAdd": 2
    },
    "description": "脱战后首个目标承受四周期突袭，随后靠高机动绕开近战。 脱战只按真实开火空窗；不新增必须手动影子切换，不靠攻击动画重置冷却。",
    "visual": "四次真实亮刃、短残像与原使徒体态。"
  },
  "adept.3": {
    "name": "裂光共振",
    "body": "precision",
    "parameters": {
      "hitsRequired": 4,
      "resonanceDamageFactor": 5,
      "resonanceRadius": 3.5,
      "markSeconds": 5
    },
    "description": "攻击标记敌人，第四次命中令标记爆裂并波及轻甲群。 第五倍包替换第四发主伤，邻敌只吃一包；本机标记不被别家兵反复兑换。",
    "visual": "真实第四刃共振裂光与接触爆心。"
  },
  "stalker.1": {
    "name": "虚空连射",
    "body": "assault",
    "parameters": {
      "burstEveryCycles": 4,
      "burstShots": 3,
      "burstDamageFactor": 1.2,
      "rangeAdd": 2
    },
    "description": "持续锁定同一敌人使晶体连射成型，第四周期发射三连主弹。 三弹各真实飞行，共3.6倍该周期；切换不清累计周期但不刷新冷却，地空合法层保持。",
    "visual": "第四周期三枚真实晶体弹。"
  },
  "stalker.2": {
    "name": "裂隙刺客",
    "body": "mobile",
    "parameters": {
      "empoweredCycles": 6,
      "empoweredDamageFactor": 3,
      "barrierMaxShieldFraction": 0.8,
      "barrierSeconds": 5,
      "triggerCooldown": 12
    },
    "description": "合法闪现后六次武器周期高爆发，并获得有限相位护障。 保留手动闪现与地形校验；无自动传送，无武器/CD刷新；触发有十二秒独立冷却。",
    "visual": "真实闪现残像、六次强化晶弹及护障耗尽。"
  },
  "stalker.3": {
    "name": "晶棘破甲",
    "body": "precision",
    "parameters": {
      "positiveArmorIgnoreFraction": 0.7,
      "armoredDamageFactor": 2.5,
      "pierceLength": 10,
      "secondaryFraction": 0.8
    },
    "description": "晶体弹穿过目标正护甲的一部分，并对重甲形成穿透线。 忽略正护甲为自身包规则，不改变全队敌甲；生命/盾分别算，不能忽略敌伤免疫。",
    "visual": "粗晶弹与真实后排贯穿裂光。"
  },
  "sentry.1": {
    "name": "光穹织者",
    "body": "support",
    "parameters": {
      "radius": 7,
      "shieldRestorePerSecondI": 180,
      "targets": 7,
      "damageReduction": 0.25
    },
    "description": "守护者护盾升级为稳定织盾阵，圈内原生盾持续修复。 实际缺原生盾才恢复，消耗原能量；无原生盾不虚构治疗；与普通守护盾同通道取强值。",
    "visual": "原哨兵、有限织盾穹和真实逐目标回盾。"
  },
  "sentry.2": {
    "name": "静滞监察者",
    "body": "support",
    "parameters": {
      "controlCooldown": 14,
      "controlRadius": 4,
      "ordinaryStasisSeconds": 2.5,
      "bossSlow": 0.25
    },
    "description": "每个控制周期短暂停住范围普通敌人，Boss仅降攻速与移速。 敌人停滞期间本稿可受伤；同名停滞仅刷新有限期限，不叠加时长；Boss不完全停止；能源不足不施放。",
    "visual": "真实静滞残像、Boss短减速；不显示假伤害。"
  },
  "sentry.3": {
    "name": "折射惩戒",
    "body": "precision",
    "parameters": {
      "storedShieldDamageFraction": 0.7,
      "storedLimitMaxShieldFraction": 2,
      "releaseCooldown": 3,
      "beamLength": 10,
      "beamWidth": 1.6
    },
    "description": "敌伤被本体护盾实际吸收后储存折射，下一次武器周期释放穿透束。 敌伤经护甲后实际盾损才存入，不能从回盾/无敌无限刷；束伤不再次充能。",
    "visual": "实际盾承伤充能、下一周期一次真实折射束。"
  },
  "immortal.1": {
    "name": "破城判官",
    "body": "precision",
    "parameters": {
      "armoredDamageFactor": 3,
      "lockStacks": 4,
      "damagePerStack": 0.25,
      "barrierBreakNextDamageFactor": 1.5
    },
    "description": "反甲双炮越打同一重甲越强，屏障耗尽时下一炮为重判。 重判只一次且不与锁定再多层递归；Boss取合法重甲属性，不把建筑/巨型当重甲。",
    "visual": "重型双炮、真实锁定灯与一次重判炮。"
  },
  "immortal.2": {
    "name": "永恒壁垒",
    "body": "bulwark",
    "parameters": {
      "barrierFactor": 4,
      "barrierBreakShieldRestoreFraction": 0.5,
      "damageReduction": 0.3,
      "reductionSeconds": 4,
      "triggerCooldown": 16
    },
    "description": "屏障规模大增，被打破后短时恢复原生盾并保护自身前线位置。 屏障触发沿既有条件，新增破屏反应有独立冷却；有限屏障不等于斯旺无敌。",
    "visual": "真实厚屏障、破屏后实际原生回盾。"
  },
  "immortal.3": {
    "name": "引力裁决",
    "body": "support",
    "parameters": {
      "gravityRadius": 4,
      "pullDistance": 2,
      "pullCooldown": 3,
      "splashFraction": 0.8
    },
    "description": "反甲炮在主目标周围生成短引力区，把地面杂兵收拢给后排清场。 每三秒一个牵引区；合法路径，Boss/领主免拉只减速；对空不生成拉地面效果。",
    "visual": "炮弹真实接触、有限引力收拢与邻敌伤包。"
  },
  "colossus.1": {
    "name": "焚天双束",
    "body": "assault",
    "parameters": {
      "heatSeconds": 2,
      "maximumDamageFactor": 3,
      "lineWidthFactor": 1.8,
      "fireSeconds": 2,
      "fireDpsI": 220
    },
    "description": "双束沿地面持续扫灼，第二秒后把同一目标灼成高热。 高热逐目标计时、离束重置；同源火区不叠，不解除巨像可被对空攻击的弱点。",
    "visual": "两条真实热束与局部两秒残火。"
  },
  "colossus.2": {
    "name": "地平线切割",
    "body": "precision",
    "parameters": {
      "rangeIncrease": 1,
      "lengthIncrease": 1,
      "armoredDamageFactor": 2.5,
      "widthFactor": 0.75
    },
    "description": "射程和切割长度扩大，以窄双束远距贯穿敌人纵队。 射程/长度二倍，宽度变窄；视线障碍仍挡，不从地图外无成本开火。",
    "visual": "两条细长真实束路，逐目标接触。"
  },
  "colossus.3": {
    "name": "震慑行者",
    "body": "bulwark",
    "parameters": {
      "everyCycles": 4,
      "shockDamageFactor": 2,
      "shockRadius": 5,
      "moveReduction": 0.5,
      "attackSpeedReduction": 0.3,
      "seconds": 2,
      "shieldRestoreFraction": 0.15
    },
    "description": "双束每第四周期释放一次广域震慑，延缓近敌进攻并重构自己护盾。 第四周期额外冲击只一包，Boss控制减半；回盾按缺口，不每个命中敌人恢复一次。",
    "visual": "第四周期低亮震慑波、实际自回盾。"
  },
  "high_templar.1": {
    "name": "风暴执政",
    "body": "precision",
    "parameters": {
      "stormDamageFactor": 2.5,
      "stormRadiusFactor": 1.6,
      "stormPulsePeriodFactor": 0.5,
      "totalStormDamageMultiplier": 2.5,
      "stormBaseTotalI": 1200,
      "stormBaseCooldown": 12
    },
    "description": "灵能风暴覆盖加大，同一风暴脉冲更密、更强。 总伤只提高2.5倍，更密脉冲分拆该预算，不再乘2；保留能量、前置与合法目标。",
    "visual": "真实密集风暴脉冲、范围一致，压低全屏遮挡。"
  },
  "high_templar.2": {
    "name": "反馈先知",
    "body": "support",
    "parameters": {
      "feedbackCooldown": 12,
      "feedbackRadius": 4,
      "energyDamageRatio": 6,
      "fixedFeedbackDamageI": 1600,
      "energyDrainFraction": 1
    },
    "description": "优先抽取消耗敌方能量并转成灵能伤害，额外给高危目标固定反馈。 无能量敌人只受固定包；Boss不凭身份虚构能量，反馈总额冻结消耗一次。",
    "visual": "实际被抽能者灵能裂光、一次范围反馈。"
  },
  "high_templar.3": {
    "name": "静电织网",
    "body": "support",
    "parameters": {
      "webSeconds": 6,
      "webRadius": 5,
      "attackSpeedReduction": 0.4,
      "allyEnergyPerSecond": 6,
      "allyTargets": 7
    },
    "description": "每次风暴形成静电织网，圈内敌人攻速降低，友方能量缓慢回流。 不叠同源织网，Boss攻速减半；能量按各自上限，只给既有能量战斗身体。",
    "visual": "真实织网低亮节点、有效能量回流，不伪造攻击伤害。"
  },
  "phoenix.1": {
    "name": "离子六翼",
    "body": "assault",
    "parameters": {
      "shotsPerCycle": 6,
      "lightDamageFactor": 1.6,
      "moveFactor": 1.2
    },
    "description": "空战每周期发射六枚离子弹，以高速压制轻型空军。 普通为双弹，六枚是三倍周期弹次；没有地面普通武器，引力仍沿合法地面目标。",
    "visual": "六枚真实离子弹，快机翼拖尾。"
  },
  "phoenix.2": {
    "name": "引力狩猎者",
    "body": "support",
    "parameters": {
      "gravityTargets": 2,
      "liftSeconds": 4,
      "liftDamageFactor": 3,
      "gravityCooldown": 10
    },
    "description": "同时维持两个合法引力目标，悬空目标接受更强己方离子打击。 只对原规则可举目标；Boss/领主不悬空，不能凭举起给建筑开对空射击资格。",
    "visual": "两条真实引力束和合法悬空，免举者无假动作。"
  },
  "phoenix.3": {
    "name": "相位突击翼",
    "body": "mobile",
    "parameters": {
      "outOfCombatSeconds": 2,
      "openingCycles": 6,
      "openingDamageFactor": 3,
      "barrierMaxShieldFraction": 0.75,
      "chargeSeconds": 6
    },
    "description": "脱战储存一次相位冲击，进战首六周期以三倍离子火力突袭。 六秒脱战储能才护障完整，开火消耗；没有自动闪现/穿墙，无无限护障叠加。",
    "visual": "真实六周期离子亮芯与有限相位护障。"
  },
  "void_ray.1": {
    "name": "棱光处刑舰",
    "body": "precision",
    "parameters": {
      "chargeSeconds": 5,
      "maximumDamageFactor": 5,
      "armoredDamageFactor": 1.5,
      "moveFactor": 0.8
    },
    "description": "同目标持续束流五秒后进入五倍棱镜处刑。 转火/两秒无合法束流重置；不能把新五倍再乘旧模板同类充能，直接替换。",
    "visual": "实际单束逐层聚亮，最大束宽受可读性限制。"
  },
  "void_ray.2": {
    "name": "裂光分束舰",
    "body": "assault",
    "parameters": {
      "secondaryTargets": 3,
      "secondaryFraction": 0.75,
      "secondaryRadius": 5,
      "mainDamageFactor": 1.5
    },
    "description": "主束旁分出三条辅助束，同时压制附近其他敌人。 主目标1.5倍，三个不同邻敌各普通主包75%；不对同一目标叠四束，不递归复制束流。",
    "visual": "四条真实连接各自目标的束流。"
  },
  "void_ray.3": {
    "name": "能量虹吸舰",
    "body": "bulwark",
    "parameters": {
      "shieldPerEffectiveDamageFraction": 0.3,
      "shieldPerSecondMaxFraction": 0.18,
      "barrierMaxShieldFraction": 0.8,
      "barrierSeconds": 6
    },
    "description": "束流有效伤害回充自身原生盾，满盾溢出形成有限临时护障。 不吸无敌/未命中包，治疗溢出预算不可再回盾；临时护障不改变原生盾上限。",
    "visual": "真实束流、有效盾重构与有限护障分段。"
  },
  "carrier.1": {
    "name": "蜂群指挥舰",
    "body": "assault",
    "parameters": {
      "interceptors": 8,
      "childAttackSpeedIncrease": 1,
      "overdriveSeconds": 6,
      "overdriveCooldown": 18
    },
    "description": "八架真实截击机围攻，连续锁定后进入蜂群超载。 每架独立所属身体；只存活出勤子机计火力；数量与攻速四倍峰值，不给母舰假普攻。",
    "visual": "原航母、八架实际出勤子机，六秒真实密集射击。"
  },
  "carrier.2": {
    "name": "重矛母舰",
    "body": "precision",
    "parameters": {
      "interceptors": 4,
      "childDamageFactor": 2.5,
      "childArmoredDamageFactor": 1.8,
      "heavyEveryCycles": 4,
      "heavyPacketFraction": 1
    },
    "description": "四架截击机改为重型穿甲火力，每第四周期追加一次重矛包。 重矛追加一次已增强主包，单周期峰值九倍对甲；技能强度不从虚假新增模型/轰炸机计算。",
    "visual": "四架原截击机、实际重弹和第四周期重矛。"
  },
  "carrier.3": {
    "name": "圣盾巡航舰",
    "body": "bulwark",
    "parameters": {
      "parentDamageReduction": 0.3,
      "interceptorHpFactor": 2.5,
      "returnHealPerSecondFraction": 0.15,
      "childDpsFactor": 1.5,
      "repairRange": 3
    },
    "description": "母舰盾损先由有限矩阵分担，所属截击机回收时真实维修重整。 只有实际回到母舰近处且不攻击的子机维修；不满血传送重生，不改变其他航母/英雄所属权。",
    "visual": "原母舰厚盾、真实归航截击机与维修绿光。"
  }
} as const;
export type ProtossEliteId=keyof typeof PROTOSS_ELITE_RULES;
export const PROTOSS_ELITE_IDS=Object.keys(PROTOSS_ELITE_RULES) as ProtossEliteId[];
export const isProtossEliteId=(id:string|undefined):id is ProtossEliteId=>!!id&&Object.hasOwn(PROTOSS_ELITE_RULES,id);
export function protossEliteGrowth(id:ProtossEliteId,rank:number){const base=rankStats(5),n=Math.max(0,Math.min(4,rank-1)),b=TERRAN_ELITE_BODIES[PROTOSS_ELITE_RULES[id].body];return {...base,rank,damage:base.damage*b.dps*eliteFixedGrowth(rank),health:base.health*b.hp*(1+.3*n),armor:base.armor,movement:b.move,healing:base.healing*b.heal*eliteFixedGrowth(rank),energy:5*(1+.2*n)};}
export const protossEliteArmor=(id:ProtossEliteId,rank:number)=>TERRAN_ELITE_BODIES[PROTOSS_ELITE_RULES[id].body].armor+.5*Math.max(0,Math.min(4,rank-1));
