/** USER_CONFIRMED game tuning, not abilities claimed for original collection skins.
 * Apply effect once per living elite; elite level growth remains in eliteStats.
 * Model identity is resolved from original ModelData; conversion/visual readiness
 * is tracked separately and must gate delivery.
 */
import type {ExpansionFamilyId} from './expansion-units';
import type {EliteTemplate} from './elites';
export const EXPANSION_ELITE_FAMILIES=["reaper", "thor", "viking", "banshee", "science_vessel", "zergling", "baneling", "roach", "ravager", "hydralisk", "lurker", "queen", "mutalisk", "corruptor", "ultralisk", "zealot", "adept", "stalker", "sentry", "immortal", "colossus", "high_templar", "phoenix", "void_ray", "carrier"] as const;
export type ExpansionEliteId=`${typeof EXPANSION_ELITE_FAMILIES[number]}.${1|2|3}`;
export type ExpansionEliteStat='regenDelayMultiplier'|'airAttackDamageMultiplier'|'transformTimeMultiplier'|'groundAttackRangeAdd'|'recoveryMultiplier'|'attackPeriodMultiplier'|'explosionRadiusMultiplier'|'innateRegenMultiplier'|'bileCooldownMultiplier'|'attackRangeAdd'|'spineWidthMultiplier'|'transfusionEnergyMultiplier'|'secondaryBounceDamageMultiplier'|'armoredAirDamageMultiplier'|'lifeArmorAdd'|'chargeCooldownMultiplier'|'lightBonusMultiplier'|'armoredDamageMultiplier'|'guardianShieldDurationMultiplier'|'barrierAbsorptionMultiplier'|'stormEnergyMultiplier'|'lightAirDamageMultiplier'|'armoredBonusMultiplier'|'interceptorAttackPeriodMultiplier'|'assaultGroundRangeAdd'|'bileRadiusMultiplier'|'bileDamageMultiplier'|'maxEnergyMultiplier'|'stormDamageMultiplier'|'lightAttackDamageMultiplier'|'groundAttackDamageMultiplier'|'maxHealthMultiplier'|'cloakEnergyMultiplier'|'healingRangeAdd'|'movementSpeedMultiplier'|'explosionDamageMultiplier'|'armoredGroundDamageMultiplier'|'burrowedRangeAdd'|'transfusionHealingMultiplier'|'firstBounceLightDamageMultiplier'|'maxShieldMultiplier'|'blinkCooldownMultiplier'|'guardianShieldRadiusMultiplier'|'interceptorDamageMultiplier';
export interface ExpansionEliteDefinition {
 readonly id:ExpansionEliteId; readonly family:ExpansionFamilyId; readonly name:string;
 readonly template:EliteTemplate; readonly description:string; readonly model:string;
 readonly sourceModel:string; readonly icon:string;
 readonly effect:Readonly<{stat:ExpansionEliteStat;amount:number}>;
}
const BASE_EXPANSION_ELITES={
  "reaper.1": {
    "id": "reaper.1",
    "family": "reaper",
    "name": "突击死神",
    "template": "mobile",
    "description": "脱战恢复等待时间 ×0.75。",
    "model": "elite.reaper.1",
    "sourceModel": "Reaper_CovertOps_Collection",
    "icon": "unit.reaper",
    "effect": {
      "stat": "regenDelayMultiplier",
      "amount": 0.75
    }
  },
  "thor.1": {
    "id": "thor.1",
    "family": "thor",
    "name": "防空雷神",
    "template": "guard",
    "description": "对空普攻伤害 ×1.20。",
    "model": "elite.thor.1",
    "sourceModel": "Thor_CovertOps_Collection",
    "icon": "unit.thor",
    "effect": {
      "stat": "airAttackDamageMultiplier",
      "amount": 1.2
    }
  },
  "viking.1": {
    "id": "viking.1",
    "family": "viking",
    "name": "快速变形维京",
    "template": "mobile",
    "description": "变形时间 ×0.70。",
    "model": "elite.viking.1",
    "sourceModel": "Viking_MercFighter_Collection",
    "icon": "unit.viking",
    "effect": {
      "stat": "transformTimeMultiplier",
      "amount": 0.7
    }
  },
  "banshee.1": {
    "id": "banshee.1",
    "family": "banshee",
    "name": "远程女妖",
    "template": "quick",
    "description": "对地射程 +1。",
    "model": "elite.banshee.1",
    "sourceModel": "Banshee_CovertsOps_Collection",
    "icon": "unit.banshee",
    "effect": {
      "stat": "groundAttackRangeAdd",
      "amount": 1
    }
  },
  "science_vessel.1": {
    "id": "science_vessel.1",
    "family": "science_vessel",
    "name": "修复科技球",
    "template": "support",
    "description": "恢复输出 ×1.25，保持主系与跨系比例。",
    "model": "elite.science_vessel.1",
    "sourceModel": "Hologram_Skin_ScienceVessel",
    "icon": "unit.science_vessel",
    "effect": {
      "stat": "recoveryMultiplier",
      "amount": 1.25
    }
  },
  "zergling.1": {
    "id": "zergling.1",
    "family": "zergling",
    "name": "利爪跳虫",
    "template": "quick",
    "description": "普攻周期 ×0.80。",
    "model": "elite.zergling.1",
    "sourceModel": "Zergling_CollectionSkin_Webby",
    "icon": "unit.zergling",
    "effect": {
      "stat": "attackPeriodMultiplier",
      "amount": 0.8
    }
  },
  "baneling.1": {
    "id": "baneling.1",
    "family": "baneling",
    "name": "强酸爆虫",
    "template": "heavy",
    "description": "爆炸半径 ×1.25。",
    "model": "elite.baneling.1",
    "sourceModel": "Baneling_Webby_Collection",
    "icon": "unit.baneling",
    "effect": {
      "stat": "explosionRadiusMultiplier",
      "amount": 1.25
    }
  },
  "roach.1": {
    "id": "roach.1",
    "family": "roach",
    "name": "再生蟑螂",
    "template": "guard",
    "description": "固有再生 ×2。",
    "model": "elite.roach.1",
    "sourceModel": "Roach_CollectionSkin_Webby",
    "icon": "unit.roach",
    "effect": {
      "stat": "innateRegenMultiplier",
      "amount": 2
    }
  },
  "ravager.1": {
    "id": "ravager.1",
    "family": "ravager",
    "name": "速射破坏者",
    "template": "heavy",
    "description": "胆汁冷却 ×0.80。",
    "model": "elite.ravager.1",
    "sourceModel": "Ravager_CollectionSkin_Webby",
    "icon": "unit.ravager",
    "effect": {
      "stat": "bileCooldownMultiplier",
      "amount": 0.8
    }
  },
  "hydralisk.1": {
    "id": "hydralisk.1",
    "family": "hydralisk",
    "name": "长刺刺蛇",
    "template": "quick",
    "description": "射程 +1。",
    "model": "elite.hydralisk.1",
    "sourceModel": "Hydralisk_Collection_Webby",
    "icon": "unit.hydralisk",
    "effect": {
      "stat": "attackRangeAdd",
      "amount": 1
    }
  },
  "lurker.1": {
    "id": "lurker.1",
    "family": "lurker",
    "name": "宽刺潜伏者",
    "template": "heavy",
    "description": "穿刺宽度 ×1.25。",
    "model": "elite.lurker.1",
    "sourceModel": "Lurker_CollectionSkin_Webby",
    "icon": "unit.lurker",
    "effect": {
      "stat": "spineWidthMultiplier",
      "amount": 1.25
    }
  },
  "queen.1": {
    "id": "queen.1",
    "family": "queen",
    "name": "哺育虫后",
    "template": "support",
    "description": "输血耗能 ×0.75。",
    "model": "elite.queen.1",
    "sourceModel": "Queen_CollectionSkin_Webby",
    "icon": "unit.queen",
    "effect": {
      "stat": "transfusionEnergyMultiplier",
      "amount": 0.75
    }
  },
  "mutalisk.1": {
    "id": "mutalisk.1",
    "family": "mutalisk",
    "name": "弹射异龙",
    "template": "mobile",
    "description": "后续弹射伤害 ×1.25。",
    "model": "elite.mutalisk.1",
    "sourceModel": "Mutalisk_CollectionSkin_Webby",
    "icon": "unit.mutalisk",
    "effect": {
      "stat": "secondaryBounceDamageMultiplier",
      "amount": 1.25
    }
  },
  "corruptor.1": {
    "id": "corruptor.1",
    "family": "corruptor",
    "name": "猎空腐化者",
    "template": "heavy",
    "description": "对重甲空中目标普攻伤害 ×1.20。",
    "model": "elite.corruptor.1",
    "sourceModel": "Corruptor_CollectionSkin_Webby",
    "icon": "unit.corruptor",
    "effect": {
      "stat": "armoredAirDamageMultiplier",
      "amount": 1.2
    }
  },
  "ultralisk.1": {
    "id": "ultralisk.1",
    "family": "ultralisk",
    "name": "厚甲雷兽",
    "template": "guard",
    "description": "生命护甲 +2。",
    "model": "elite.ultralisk.1",
    "sourceModel": "Ultralisk_CollectionSkin_Webby",
    "icon": "unit.ultralisk",
    "effect": {
      "stat": "lifeArmorAdd",
      "amount": 2
    }
  },
  "zealot.1": {
    "id": "zealot.1",
    "family": "zealot",
    "name": "突进狂热者",
    "template": "mobile",
    "description": "已解锁冲锋冷却 ×0.75。",
    "model": "elite.zealot.1",
    "sourceModel": "Zealot_Purifier_Collection",
    "icon": "unit.zealot",
    "effect": {
      "stat": "chargeCooldownMultiplier",
      "amount": 0.75
    }
  },
  "adept.1": {
    "id": "adept.1",
    "family": "adept",
    "name": "穿透使徒",
    "template": "quick",
    "description": "对轻甲额外伤害 ×1.50。",
    "model": "elite.adept.1",
    "sourceModel": "Adept_Purifier_Collection",
    "icon": "unit.adept",
    "effect": {
      "stat": "lightBonusMultiplier",
      "amount": 1.5
    }
  },
  "stalker.1": {
    "id": "stalker.1",
    "family": "stalker",
    "name": "猎甲追猎者",
    "template": "mobile",
    "description": "对重甲普攻伤害 ×1.20。",
    "model": "elite.stalker.1",
    "sourceModel": "Stalker_Purifier_Collection",
    "icon": "unit.stalker",
    "effect": {
      "stat": "armoredDamageMultiplier",
      "amount": 1.2
    }
  },
  "sentry.1": {
    "id": "sentry.1",
    "family": "sentry",
    "name": "守护哨兵",
    "template": "support",
    "description": "守护者之盾持续时间 ×1.30。",
    "model": "elite.sentry.1",
    "sourceModel": "Sentry_Purifier_Collection",
    "icon": "unit.sentry",
    "effect": {
      "stat": "guardianShieldDurationMultiplier",
      "amount": 1.3
    }
  },
  "immortal.1": {
    "id": "immortal.1",
    "family": "immortal",
    "name": "屏障不朽者",
    "template": "guard",
    "description": "护障吸收量 ×1.40。",
    "model": "elite.immortal.1",
    "sourceModel": "Immortal_Purifier_Collection",
    "icon": "unit.immortal",
    "effect": {
      "stat": "barrierAbsorptionMultiplier",
      "amount": 1.4
    }
  },
  "colossus.1": {
    "id": "colossus.1",
    "family": "colossus",
    "name": "远距巨像",
    "template": "heavy",
    "description": "射程 +1。",
    "model": "elite.colossus.1",
    "sourceModel": "Colossus_Purifier_Collection",
    "icon": "unit.colossus",
    "effect": {
      "stat": "attackRangeAdd",
      "amount": 1
    }
  },
  "high_templar.1": {
    "id": "high_templar.1",
    "family": "high_templar",
    "name": "风暴圣堂",
    "template": "support",
    "description": "已解锁灵能风暴耗能 ×0.80。",
    "model": "elite.high_templar.1",
    "sourceModel": "HighTemplar_Purifier_Collection",
    "icon": "unit.high_templar",
    "effect": {
      "stat": "stormEnergyMultiplier",
      "amount": 0.8
    }
  },
  "phoenix.1": {
    "id": "phoenix.1",
    "family": "phoenix",
    "name": "猎轻凤凰",
    "template": "mobile",
    "description": "对轻甲空中目标普攻伤害 ×1.25。",
    "model": "elite.phoenix.1",
    "sourceModel": "Phoenix_Purifier_Collection",
    "icon": "unit.phoenix",
    "effect": {
      "stat": "lightAirDamageMultiplier",
      "amount": 1.25
    }
  },
  "void_ray.1": {
    "id": "void_ray.1",
    "family": "void_ray",
    "name": "聚焦辉光舰",
    "template": "heavy",
    "description": "对重甲额外伤害 ×1.50。",
    "model": "elite.void_ray.1",
    "sourceModel": "VoidRay_Purifier_Collection",
    "icon": "unit.void_ray",
    "effect": {
      "stat": "armoredBonusMultiplier",
      "amount": 1.5
    }
  },
  "carrier.1": {
    "id": "carrier.1",
    "family": "carrier",
    "name": "高速舰载航母",
    "template": "heavy",
    "description": "已有截击机普攻周期 ×0.85。",
    "model": "elite.carrier.1",
    "sourceModel": "Carrier_Purifier_Collection",
    "icon": "unit.carrier",
    "effect": {
      "stat": "interceptorAttackPeriodMultiplier",
      "amount": 0.85
    }
  },
  "viking.2": {id:"viking.2",family:"viking",name:"猎舰维京",template:"heavy",description:"战机模式对重甲空中目标的普通攻击直接伤害＋25%；突击模式不加成。",model:"elite.viking.1",sourceModel:"Viking_MercFighter_Collection",icon:"unit.viking",effect:{stat:"armoredAirDamageMultiplier",amount:1.25}},
  "viking.3": {id:"viking.3",family:"viking",name:"突击维京",template:"mobile",description:"突击模式对地射程＋1；战机模式射程不变。",model:"elite.viking.1",sourceModel:"Viking_MercFighter_Collection",icon:"unit.viking",effect:{stat:"assaultGroundRangeAdd",amount:1}},
  "ravager.2": {id:"ravager.2",family:"ravager",name:"广域破坏者",template:"support",description:"自动胆汁伤害半径×1.20；预警圈与实际半径一致。",model:"elite.ravager.1",sourceModel:"Ravager_CollectionSkin_Webby",icon:"unit.ravager",effect:{stat:"bileRadiusMultiplier",amount:1.2}},
  "ravager.3": {id:"ravager.3",family:"ravager",name:"猛酸破坏者",template:"heavy",description:"自动胆汁直接伤害＋25%；半径和冷却不变。",model:"elite.ravager.1",sourceModel:"Ravager_CollectionSkin_Webby",icon:"unit.ravager",effect:{stat:"bileDamageMultiplier",amount:1.25}},
  "high_templar.2": {id:"high_templar.2",family:"high_templar",name:"储能圣堂",template:"support",description:"最大能量＋25%；新增容量不免费回能，不能解锁风暴。",model:"elite.high_templar.1",sourceModel:"HighTemplar_Purifier_Collection",icon:"unit.high_templar",effect:{stat:"maxEnergyMultiplier",amount:1.25}},
  "high_templar.3": {id:"high_templar.3",family:"high_templar",name:"强电圣堂",template:"heavy",description:"灵能风暴已研究后总伤害＋20%；按原tick比例分摊。",model:"elite.high_templar.1",sourceModel:"HighTemplar_Purifier_Collection",icon:"unit.high_templar",effect:{stat:"stormDamageMultiplier",amount:1.2}}
} as const satisfies Partial<Record<ExpansionEliteId,ExpansionEliteDefinition>>;

/** M0 r6 permits a family's three options to share its verified original SC body. */
function variant(family:ExpansionFamilyId,index:2|3,name:string,template:EliteTemplate,description:string,stat:ExpansionEliteStat,amount:number):ExpansionEliteDefinition {
 const base=(BASE_EXPANSION_ELITES as Record<string,ExpansionEliteDefinition>)[`${family}.1`];
 if(!base)throw Error(`Missing verified elite body for ${family}`);
 return {...base,id:`${family}.${index}` as ExpansionEliteId,name,template,description,effect:{stat,amount}};
}
export const EXPANSION_ELITES:Readonly<Record<ExpansionEliteId,ExpansionEliteDefinition>>={
 ...BASE_EXPANSION_ELITES,
 'reaper.2':variant('reaper',2,'猎轻死神','quick','对轻甲目标的普攻直接伤害＋25%。','lightAttackDamageMultiplier',1.25),
 'reaper.3':variant('reaper',3,'装甲死神','guard','最大生命＋25%；保留已损生命。','maxHealthMultiplier',1.25),
 'thor.2':variant('thor',2,'重炮雷神','heavy','对地普攻直接伤害＋20%。','groundAttackDamageMultiplier',1.2),
 'thor.3':variant('thor',3,'堡垒雷神','guard','生命护甲＋2。','lifeArmorAdd',2),
 'banshee.2':variant('banshee',2,'隐秘女妖','mobile','隐形已研究时持续每秒能耗×0.80。','cloakEnergyMultiplier',.8),
 'banshee.3':variant('banshee',3,'速射女妖','quick','对地普攻周期×0.85。','attackPeriodMultiplier',.85),
 'science_vessel.2':variant('science_vessel',2,'储能科技球','support','最大能量＋25%，不免费回能。','maxEnergyMultiplier',1.25),
 'science_vessel.3':variant('science_vessel',3,'远距科技球','mobile','合法治疗／维修射程＋1.5。','healingRangeAdd',1.5),
 'zergling.2':variant('zergling',2,'疾行跳虫','mobile','地面移动速度＋15%。','movementSpeedMultiplier',1.15),
 'zergling.3':variant('zergling',3,'硬壳跳虫','guard','生命护甲＋1.5。','lifeArmorAdd',1.5),
 'baneling.2':variant('baneling',2,'裂变爆虫','heavy','一次真实自爆的直接伤害＋25%。','explosionDamageMultiplier',1.25),
 'baneling.3':variant('baneling',3,'疾行爆虫','mobile','移动速度＋15%。','movementSpeedMultiplier',1.15),
 'roach.2':variant('roach',2,'破甲蟑螂','heavy','对重甲地面目标的普攻直接伤害＋20%。','armoredGroundDamageMultiplier',1.2),
 'roach.3':variant('roach',3,'厚甲蟑螂','guard','最大生命＋25%；保留已损生命。','maxHealthMultiplier',1.25),
 'hydralisk.2':variant('hydralisk',2,'连射刺蛇','quick','普攻周期×0.85，针刺数不变。','attackPeriodMultiplier',.85),
 'hydralisk.3':variant('hydralisk',3,'猎空刺蛇','heavy','对空普攻直接伤害＋25%。','airAttackDamageMultiplier',1.25),
 'lurker.2':variant('lurker',2,'远刺潜伏者','mobile','完成埋地后地刺攻击射程＋1。','burrowedRangeAdd',1),
 'lurker.3':variant('lurker',3,'连刺潜伏者','quick','埋地普攻周期×0.85。','attackPeriodMultiplier',.85),
 'queen.2':variant('queen',2,'强疗虫后','support','自动输血实际恢复量＋25%。','transfusionHealingMultiplier',1.25),
 'queen.3':variant('queen',3,'储能虫后','guard','最大能量＋25%，不免费回能。','maxEnergyMultiplier',1.25),
 'mutalisk.2':variant('mutalisk',2,'猎轻异龙','quick','第一段弹射对轻甲普攻直接伤害＋20%。','firstBounceLightDamageMultiplier',1.2),
 'mutalisk.3':variant('mutalisk',3,'厚翼异龙','guard','最大生命＋25%；保留已损生命。','maxHealthMultiplier',1.25),
 'corruptor.2':variant('corruptor',2,'连射腐化者','quick','对空普攻周期×0.85。','attackPeriodMultiplier',.85),
 'corruptor.3':variant('corruptor',3,'远猎腐化者','mobile','对空普攻射程＋1。','attackRangeAdd',1),
 'ultralisk.2':variant('ultralisk',2,'猛攻雷兽','heavy','对地普攻周期×0.85。','attackPeriodMultiplier',.85),
 'ultralisk.3':variant('ultralisk',3,'巨躯雷兽','guard','最大生命＋25%；碰撞半径不变。','maxHealthMultiplier',1.25),
 'zealot.2':variant('zealot',2,'坚盾狂热者','guard','最大原生护盾＋25%；不治疗生命。','maxShieldMultiplier',1.25),
 'zealot.3':variant('zealot',3,'连斩狂热者','quick','双刀完整攻击周期×0.85。','attackPeriodMultiplier',.85),
 'adept.2':variant('adept',2,'疾行使徒','mobile','移动速度＋15%。','movementSpeedMultiplier',1.15),
 'adept.3':variant('adept',3,'远击使徒','heavy','普攻射程＋1。','attackRangeAdd',1),
 'stalker.2':variant('stalker',2,'坚盾追猎者','guard','最大原生护盾＋25%。','maxShieldMultiplier',1.25),
 'stalker.3':variant('stalker',3,'迅闪追猎者','mobile','已研究闪烁冷却×0.75。','blinkCooldownMultiplier',.75),
 'sentry.2':variant('sentry',2,'储能哨兵','support','最大能量＋25%，不免费回能。','maxEnergyMultiplier',1.25),
 'sentry.3':variant('sentry',3,'广域哨兵','guard','守护者之盾真实生效半径×1.20。','guardianShieldRadiusMultiplier',1.2),
 'immortal.2':variant('immortal',2,'破甲不朽者','heavy','对重甲地面目标普攻直接伤害＋25%。','armoredGroundDamageMultiplier',1.25),
 'immortal.3':variant('immortal',3,'坚盾不朽者','guard','最大原生护盾＋25%。','maxShieldMultiplier',1.25),
 'colossus.2':variant('colossus',2,'连灼巨像','quick','完整热能攻击周期×0.85。','attackPeriodMultiplier',.85),
 'colossus.3':variant('colossus',3,'坚盾巨像','guard','最大原生护盾＋25%。','maxShieldMultiplier',1.25),
 'phoenix.2':variant('phoenix',2,'远猎凤凰','mobile','对空普攻射程＋1。','attackRangeAdd',1),
 'phoenix.3':variant('phoenix',3,'迅翼凤凰','quick','飞行移动速度＋15%。','movementSpeedMultiplier',1.15),
 'void_ray.2':variant('void_ray',2,'坚盾辉光舰','guard','最大原生护盾＋25%。','maxShieldMultiplier',1.25),
 'void_ray.3':variant('void_ray',3,'连束辉光舰','quick','完整光束结算周期×0.85。','attackPeriodMultiplier',.85),
 'carrier.2':variant('carrier',2,'强袭舰载航母','heavy','所属截击机普攻直接伤害＋20%，继承一次。','interceptorDamageMultiplier',1.2),
 'carrier.3':variant('carrier',3,'坚盾航母','guard','母体最大原生护盾＋25%。','maxShieldMultiplier',1.25),
};
