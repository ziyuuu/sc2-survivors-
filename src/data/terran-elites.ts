import {rankStats} from './ranks';
/** Explicit approved runtime rules. Documentation JSON is never loaded by the game. */
export const TERRAN_ELITE_RULES={
  "marine.1": {
    "name": "金属风暴",
    "body": "assault",
    "parameters": {
      "moveFactor": 0.9,
      "warmupSeconds": 5,
      "attackSpeedIncrease": 3,
      "maximumSeconds": 10,
      "forcedCoolingSeconds": 2,
      "lightDamageFactor": 1.6
    },
    "description": "持续开火在5秒内预热至4倍攻速，满速压制10秒后停火排热2秒。轻甲伤害×1.6，移动速度略降。"
  },
  "marine.2": {
    "name": "精英杀手",
    "body": "precision",
    "parameters": {
      "eliteDamageFactor": 3,
      "bossDamageFactor": 5,
      "dodgeByRank": [
        0.12,
        0.16,
        0.2,
        0.24,
        0.28
      ]
    },
    "description": "蓝色穿甲弹对精英造成3倍伤害、对Boss造成5倍伤害。I–V级闪避直接普通攻击的概率为12%／16%／20%／24%／28%。"
  },
  "marine.3": {
    "name": "战场指挥官",
    "body": "bulwark",
    "parameters": {
      "familyAttributeIncrease": 0.2,
      "auraRadius": null
    },
    "description": "全队普通与精英陆战队员的生命、护盾、武器伤害、攻速、移速和护甲提高20%；同类指挥加成只生效一次。"
  },
  "reaper.1": {
    "name": "午夜死神",
    "body": "mobile",
    "parameters": {
      "shotsPerCycle": 6,
      "lightDamageFactor": 1.8,
      "moveFactor": 1.4
    },
    "description": "每次攻击连续射出6发高速子弹，对轻甲造成1.8倍伤害；子弹逐发命中。"
  },
  "reaper.2": {
    "name": "大枪管",
    "body": "precision",
    "parameters": {
      "openingCycles": 10,
      "openingDamageFactor": 3,
      "splashFraction": 0.5,
      "splashRadius": 2.6,
      "armoredDamageFactor": 1.5,
      "outOfCombatSeconds": 2
    },
    "description": "进入战斗后的前10轮攻击强化至3倍伤害，重甲伤害额外×1.5；命中向周围2.6范围溅射50%伤害。脱战2秒重置。"
  },
  "reaper.3": {
    "name": "孤星猎手",
    "body": "bulwark",
    "parameters": {
      "familyOnly": true,
      "absorbAttributesOnly": true,
      "growthK": 20,
      "dpsAsymptoteFactor": 4,
      "hpAsymptoteFactor": 5,
      "armorAsymptoteAdd": 10
    },
    "description": "死神家族仅保留这一名永久战士；吸收其余死神与后续送达死神，按军衔和精英身份积累成长。伤害、生命、护甲增长逐渐趋缓，上限分别为基础的4倍、5倍和额外10点护甲。其他兵种与英雄照常保留。"
  },
  "hellion.1": {
    "name": "长炎",
    "body": "assault",
    "parameters": {
      "lengthIncrease": 3,
      "lightDamageFactor": 1.8,
      "widthFactor": 1,
      "attackRangeFactor": 4
    },
    "description": "火焰射程提高至4倍，沿窄幅直线灼烧地面目标；对轻甲造成1.8倍伤害。恶蝠形态同样延长火焰攻击距离。"
  },
  "hellion.2": {
    "name": "地狱骑士",
    "body": "assault",
    "parameters": {
      "fanDegrees": 150,
      "lengthIncrease": 1,
      "lightDamageFactor": 1.8,
      "attackRangeFactor": 2
    },
    "description": "火焰射程提高至2倍，覆盖前方150°扇面；对轻甲造成1.8倍伤害。恶蝠形态保留扇面喷火。"
  },
  "hellion.3": {
    "name": "布雷车",
    "body": "mobile",
    "parameters": {
      "minePeriod": 12,
      "mineCount": 2,
      "mineDamageI": 1200,
      "mineRadius": 4.2,
      "fireSeconds": 2,
      "fireDamagePerSecondI": 180,
      "activeMineLimit": 8,
      "chaseSpeed": 6,
      "detectionRadius": 6
    },
    "description": "每12秒部署2枚大型追踪雷，最多保留8枚；发现6范围内地面敌人后出土并以6速度追击。I级爆炸1200、半径4.2，随后两次每秒180残火；随军衔强化。"
  },
  "marauder.1": {
    "name": "震撼弹专家",
    "body": "assault",
    "parameters": {
      "radius": 3.2,
      "seconds": 3,
      "attackSpeedReduction": 0.35,
      "moveReduction": 0.45,
      "attackDamageReduction": 0.3,
      "bossControlFactor": 0.5
    },
    "description": "重型震撼弹在接触区压低敌方攻击速度、移动与攻击伤害。 三项独立状态，同来源刷新；Boss控制强度减半；攻击伤害降低不改固定技能/百分比伤害，不能永久归零。"
  },
  "marauder.2": {
    "name": "破甲精英",
    "body": "precision",
    "parameters": {
      "radius": 3,
      "armorReductionByRank": [
        0.4,
        0.45,
        0.5,
        0.55,
        0.6
      ],
      "seconds": 5
    },
    "description": "范围穿甲榴弹削弱敌人护甲，为全队打开重甲目标。 百分比作用于正护甲，不把护甲压成负数；来源同类取强值；原生盾甲按同样比例，生命/盾减伤分开。"
  },
  "marauder.3": {
    "name": "拒绝者",
    "body": "bulwark",
    "parameters": {
      "shells": 3,
      "packetFraction": 0.65,
      "radius": 2,
      "knockbackChance": 0.35,
      "knockbackDistance": 2,
      "knockbackInternalSeconds": 1,
      "bossMoveReduction": 0.2,
      "bossSlowSeconds": 1
    },
    "description": "每周期三枚小范围榴弹组成弹幕，命中有机会推开冲锋者。 一次周期最多推同敌一次；按合法路径推，墙边缩短；Boss/领主免位移改短减速；无递归反弹。"
  },
  "tank.1": {
    "name": "豹石",
    "body": "mobile",
    "parameters": {
      "weaponMode": "siege",
      "moveFactor": 1.3,
      "canFireMoving": true,
      "hasSiegeToggle": false
    },
    "description": "保持机动时仍使用攻城炮，保留原生攻城弹与溅射；不能切换至驻扎形态，仍受攻城炮最小射程限制。"
  },
  "tank.2": {
    "name": "虎式",
    "body": "precision",
    "parameters": {
      "weaponMode": "siege",
      "siegeDamageIncrease": 1,
      "siegeAttackSpeedIncrease": 1,
      "siegeRangeIncrease": 2,
      "canFireMoving": false
    },
    "description": "驻扎后攻击速度和炮弹伤害均提高至2倍，射程提高至3倍；移动形态保留机动，但不发射攻城炮。"
  },
  "tank.3": {
    "name": "毁灭者",
    "body": "precision",
    "parameters": {
      "weaponMode": "siege",
      "blastIncrease": 4,
      "blastInterpretation": "AREA_USER_CONFIRMED",
      "fireSeconds": 1,
      "fireDamageFraction": 0.5,
      "blastAreaFactor": 5,
      "blastRadiusFactor": 2.23606797749979
    },
    "description": "驻扎炮击的爆炸面积扩大至5倍，原有各档溅射伤害保留；爆点1秒后造成一次50%炮击伤害的残火，同一炮手的残火对同一目标每秒最多一次。"
  },
  "thor.1": {
    "name": "雷霆支点",
    "body": "bulwark",
    "parameters": {
      "quakeEveryCycles": 3,
      "quakeDamageFraction": 2,
      "quakeRadius": 4,
      "enemyMoveReduction": 0.4,
      "slowSeconds": 2,
      "allyArmorAdd": 4,
      "allyRadius": 6
    },
    "description": "每第3轮对地攻击引发4范围震击，额外造成2倍本轮伤害并减速40%持续2秒，Boss减速减半。6范围永久机械友军额外获得4护甲。"
  },
  "thor.2": {
    "name": "天罚炮台",
    "body": "precision",
    "parameters": {
      "airArmoredDamageFactor": 3,
      "lockSeconds": 3,
      "lockAttackSpeedIncrease": 1,
      "splashFraction": 0.6,
      "splashRadius": 3
    },
    "description": "对重甲空军造成3倍伤害，命中向3范围其他空军溅射60%；连续锁定同一空中目标3秒后攻速翻倍，换目标或脱战后重新锁定。"
  },
  "thor.3": {
    "name": "末日过载",
    "body": "assault",
    "parameters": {
      "chargeSeconds": 4,
      "overdriveSeconds": 8,
      "overdriveDpsFactor": 3,
      "coolingSeconds": 4,
      "coolingDpsFactor": 1,
      "moveFactor": 0.8
    },
    "description": "持续交战4秒蓄力后进入8秒过载，武器伤害提高至3倍；随后4秒冷却，再次循环。换目标不会跳过蓄力。"
  },
  "viking.1": {
    "name": "苍穹猎鹰",
    "body": "mobile",
    "parameters": {
      "lockStacks": 5,
      "damagePerStack": 0.35,
      "openingMissileFraction": 1.5,
      "moveFactor": 1.25
    },
    "description": "首次对空攻击追加一对导弹，合计额外造成150%单发伤害；连续攻击同一空军每轮增加35%伤害，最多5层，换目标清除层数。"
  },
  "viking.2": {
    "name": "钢铁落锤",
    "body": "bulwark",
    "parameters": {
      "landingDamageI": 1600,
      "landingRadius": 4,
      "landingCooldown": 12,
      "assaultDpsFactor": 2,
      "assaultArmorAdd": 5
    },
    "description": "真实降落完成后造成4范围冲击，I级伤害1600、冷却12秒；地面形态武器伤害翻倍，额外获得5护甲。受阻时等待落点腾出。"
  },
  "viking.3": {
    "name": "双相王牌",
    "body": "assault",
    "parameters": {
      "empoweredCycles": 10,
      "empoweredDpsFactor": 2.5,
      "barrierMaxHp": 0.35,
      "barrierSeconds": 6,
      "triggerCooldown": 14
    },
    "description": "真实形态转换完成后强化下10轮攻击至2.5倍，并获得相当于最大生命35%的6秒有限屏障；共用14秒触发冷却。"
  },
  "banshee.1": {
    "name": "报丧女妖",
    "body": "support",
    "parameters": {
      "radius": 8,
      "armorReduction": 0.4,
      "defenseReduction": 0.25
    },
    "description": "8范围内可见敌人的正护甲降低40%，已有减伤效果相对降低25%；不会消除免疫或有限屏障。"
  },
  "banshee.2": {
    "name": "瘟疫女妖",
    "body": "support",
    "parameters": {
      "radius": 7,
      "ordinaryMaxHpPerSecondByRank": [
        0.03,
        0.035,
        0.04,
        0.045,
        0.05
      ],
      "eliteMaxHpPerSecondFactor": 0.5,
      "bossMaxHpPerSecondFactor": 0.2,
      "secondsPerPulse": 1
    },
    "description": "7范围持续污染敌方战斗单位，每秒按进入范围时的最大生命造成3%／3.5%／4%／4.5%／5%伤害；敌精英减半，Boss与领主仅承受五分之一。"
  },
  "banshee.3": {
    "name": "振奋女妖",
    "body": "mobile",
    "parameters": {
      "teamMoveIncrease": 0.3,
      "chargeSeconds": 8,
      "chargeMaximumI": 2600,
      "blastRadius": 5,
      "outOfCombatSeconds": 2
    },
    "description": "脱战2秒后为下次交战蓄能，8秒蓄满；I级满蓄能造成5范围2600伤害，随军衔强化。脱战期间永久战斗友军移动速度提高30%。"
  },
  "medivac.1": {
    "name": "战场女武神",
    "body": "bulwark",
    "parameters": {
      "radius": 8,
      "allyHpIncrease": 0.35,
      "allyArmorAdd": 5
    },
    "description": "治疗一个伤员；8范围永久战斗友军生命提高35%，额外获得5护甲。同类指挥加成只生效一次，进出范围保持生命比例。"
  },
  "medivac.2": {
    "name": "精英救护",
    "body": "support",
    "parameters": {
      "healTargets": 5,
      "range": 8,
      "energyPerActualHealFactor": 1
    },
    "description": "同时用医疗束治疗最多5名伤员，优先照顾生命比例最低者。治疗生物单位为全效，机械单位为三分之一；按实际恢复消耗能量。"
  },
  "medivac.3": {
    "name": "微光护盾",
    "body": "support",
    "parameters": {
      "shieldPerEffectiveHealFraction": 1.2,
      "shieldMaxTargetHpFraction": 0.5,
      "shieldSeconds": 6,
      "range": 8,
      "combatEntry": "EFFECTIVE_HEAL_TO_ALLY_ATTACKING_OR_ENEMY_DAMAGED_WITHIN_2_SECONDS"
    },
    "description": "治疗一个伤员；伤员最近2秒开火或受伤时，每实际恢复1生命额外生成1.2有限屏障，最高为其最大生命50%，持续6秒。"
  },
  "science_vessel.1": {
    "name": "铁幕研究员",
    "body": "support",
    "parameters": {
      "repairTargets": 3,
      "range": 8,
      "barrierPerEffectiveRepair": 1.5,
      "barrierMaxHp": 0.6,
      "barrierSeconds": 7
    },
    "description": "以绿色纳米迷雾修复最多3名伤员。每实际恢复1生命额外生成1.5有限屏障，最高为伤员最大生命60%，持续7秒；机械单位全效、生物单位三分之一。"
  },
  "science_vessel.2": {
    "name": "辐照工程师",
    "body": "support",
    "parameters": {
      "radiationCooldown": 10,
      "radiationSeconds": 6,
      "radiationDpsI": 380,
      "radiationRadius": 3,
      "repairTargets": 2,
      "range": 8
    },
    "description": "纳米迷雾修复最多2名伤员；每10秒对8范围生物敌人施加6秒辐照，I级每秒对3范围生物敌人造成380伤害，随军衔强化，辐照跟随宿主。"
  },
  "science_vessel.3": {
    "name": "磁脉冲主宰",
    "body": "support",
    "parameters": {
      "empCooldown": 14,
      "empRadius": 5,
      "shieldDamageI": 2400,
      "energyDrainFraction": 0.6,
      "attackSpeedReduction": 0.3,
      "debuffSeconds": 4,
      "repairTargets": 3,
      "range": 8
    },
    "description": "纳米迷雾修复最多3名伤员；每14秒释放5范围EMP，I级削去最多2400护盾并抽掉60%当前能量，随军衔强化护盾伤害。敌方攻速降低30%持续4秒，Boss减半；无护盾时不会转为生命伤害。"
  }
} as const;
export type TerranEliteId=keyof typeof TERRAN_ELITE_RULES;
export const TERRAN_ELITE_IDS=Object.keys(TERRAN_ELITE_RULES) as TerranEliteId[];
export const isTerranEliteId=(id:string|undefined):id is TerranEliteId=>!!id&&Object.hasOwn(TERRAN_ELITE_RULES,id);
export const TERRAN_ELITE_BODIES={assault:{hp:1.8,dps:1.6,armor:3,move:1,heal:1},precision:{hp:1.7,dps:1.8,armor:1,move:1,heal:1},bulwark:{hp:3,dps:1.5,armor:7,move:1,heal:1},mobile:{hp:1.9,dps:1.6,armor:2,move:1.15,heal:1},support:{hp:2.4,dps:1.5,armor:3,move:1,heal:3}} as const;
export const eliteFixedGrowth=(rank:number)=>1+.35*Math.max(0,Math.min(4,rank-1));
export function terranEliteGrowth(id:TerranEliteId,rank:number){const base=rankStats(5),n=Math.max(0,Math.min(4,rank-1)),b=TERRAN_ELITE_BODIES[TERRAN_ELITE_RULES[id].body];return {...base,rank,damage:base.damage*b.dps*eliteFixedGrowth(rank),health:base.health*b.hp*(1+.3*n),armor:base.armor,movement:b.move,healing:base.healing*b.heal*eliteFixedGrowth(rank),energy:5*(1+.2*n)};}
export const terranEliteArmor=(id:TerranEliteId,rank:number)=>TERRAN_ELITE_BODIES[TERRAN_ELITE_RULES[id].body].armor+.5*Math.max(0,Math.min(4,rank-1));
