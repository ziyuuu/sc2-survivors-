/** Approved composite aura constants. Generated once from reviewed documentation; runtime imports only this TS module. */
export const ELITE_TEAM_AURAS={
  "zergling.3": {
    "effectName": "血巢号令",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.2,
      "speed": 0.2,
      "maxHp": 0.2,
      "maxShield": 0.2,
      "armorPct": 0.2,
      "shieldArmorPct": 0.2,
      "move": 0.2
    }
  },
  "ravager.3": {
    "effectName": "腐蚀气溶胶",
    "kind": "debuff",
    "radius": 8,
    "stats": {
      "armorReduction": 0.45,
      "defenseReduction": 0.25
    }
  },
  "hydralisk.3": {
    "effectName": "毒囊裂隙",
    "kind": "conditional-debuff",
    "radius": null,
    "stats": {
      "vulnerabilityPerStack": 0.05
    },
    "trigger": {
      "maxStacks": 4,
      "duration": 5,
      "secondaryStacks": 1
    },
    "rangeMode": "EXISTING_POISON_TARGETS_NOT_GLOBAL_FIELD"
  },
  "queen.1": {
    "effectName": "母巢护育",
    "kind": "buff",
    "radius": 9,
    "stats": {
      "maxHp": 0.45,
      "armorFlat": 6,
      "regenHpPerSecond": 0.02
    }
  },
  "queen.2": {
    "effectName": "鲜血共生",
    "kind": "conditional-buff",
    "radius": 8,
    "stats": {
      "receivedHealing": 0.3,
      "weaponLifeLeech": 0.15
    },
    "trigger": {
      "duration": 6,
      "leechMaxHpPerSecond": 0.1,
      "requiresEffectiveHpHeal": true,
      "maxTargets": 5
    }
  },
  "queen.3": {
    "effectName": "巢毒压制",
    "kind": "debuff",
    "radius": 8,
    "stats": {
      "weaponSuppression": 0.3,
      "attackSlow": 0.35,
      "moveSlow": 0.45
    },
    "bossControlScale": 0.5
  },
  "mutalisk.3": {
    "effectName": "迁徙血羽",
    "kind": "conditional-buff",
    "radius": null,
    "stats": {
      "move": 0.3
    },
    "trigger": {
      "outOfCombatSeconds": 2,
      "chargeSeconds": 6,
      "entryRadius": 8,
      "maxTargets": 5,
      "barrierMaxHp": 0.15,
      "barrierSeconds": 4,
      "entryCooldown": 12
    }
  },
  "corruptor.2": {
    "effectName": "护翼巢域",
    "kind": "buff",
    "radius": 9,
    "stats": {
      "maxHp": 0.35,
      "maxShield": 0.35,
      "armorFlat": 6,
      "shieldArmorFlat": 6,
      "speed": 0.25
    }
  },
  "zealot.3": {
    "effectName": "先锋战旗",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.2,
      "speed": 0.2,
      "maxHp": 0.2,
      "maxShield": 0.2,
      "armorPct": 0.2,
      "shieldArmorPct": 0.2,
      "move": 0.2
    }
  },
  "sentry.1": {
    "effectName": "光穹矩阵",
    "kind": "buff",
    "radius": 9,
    "stats": {
      "maxHp": 0.2,
      "maxShield": 0.4,
      "armorFlat": 3,
      "shieldArmorFlat": 5
    }
  },
  "sentry.2": {
    "effectName": "静滞力场",
    "kind": "debuff",
    "radius": 8,
    "stats": {
      "weaponSuppression": 0.3,
      "attackSlow": 0.35,
      "moveSlow": 0.45
    },
    "bossControlScale": 0.5
  },
  "immortal.3": {
    "effectName": "引力护阵",
    "kind": "buff",
    "radius": 8,
    "stats": {
      "armorFlat": 5,
      "shieldArmorFlat": 5,
      "directWeaponReduction": 0.15
    }
  },
  "high_templar.2": {
    "effectName": "反馈暴露",
    "kind": "conditional-debuff",
    "radius": 4,
    "stats": {
      "vulnerability": 0.25
    },
    "trigger": {
      "duration": 6
    }
  },
  "high_templar.3": {
    "effectName": "离子解构场",
    "kind": "debuff",
    "radius": 8,
    "stats": {
      "armorReduction": 0.45,
      "defenseReduction": 0.25
    }
  },
  "phoenix.3": {
    "effectName": "相位航路",
    "kind": "conditional-buff",
    "radius": null,
    "stats": {
      "move": 0.3
    },
    "trigger": {
      "outOfCombatSeconds": 2,
      "chargeSeconds": 6,
      "entryRadius": 8,
      "maxTargets": 5,
      "barrierMaxShield": 0.2,
      "barrierSeconds": 6,
      "entryCooldown": 12
    }
  },
  "carrier.3": {
    "effectName": "圣盾航阵",
    "kind": "buff",
    "radius": 10,
    "stats": {
      "maxHp": 0.3,
      "maxShield": 0.4,
      "speed": 0.25,
      "armorFlat": 5,
      "shieldArmorFlat": 5
    }
  }
} as const;
export const HERO_TEAM_AURAS={
  "kerrigan": {
    "effectName": "刀锋意志",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.5,
      "speed": 0.3,
      "maxHp": 0.35,
      "maxShield": 0.35,
      "armorPct": 0.3,
      "shieldArmorPct": 0.3,
      "move": 0.25
    }
  },
  "zagara": {
    "effectName": "虫群围压",
    "kind": "debuff",
    "radius": 10,
    "stats": {
      "attackSlow": 0.45,
      "weaponSuppression": 0.3,
      "moveSlow": 0.5
    },
    "bossControlScale": 1
  },
  "dehaka": {
    "effectName": "原始威慑",
    "kind": "debuff",
    "radius": 9,
    "stats": {
      "weaponSuppression": 0.5,
      "attackSlow": 0.35,
      "moveSlow": 0.45
    },
    "bossControlScale": 1
  },
  "stukov": {
    "effectName": "感染破绽",
    "kind": "debuff",
    "radius": 10,
    "stats": {
      "vulnerability": 0.45,
      "healingSuppression": 0.5
    },
    "plague": {
      "ordinaryMaxHpPerSecond": 0.06,
      "eliteMaxHpPerSecond": 0.03,
      "bossMaxHpPerSecond": 0.012,
      "period": 1,
      "firstPulse": 1
    }
  },
  "niadra": {
    "effectName": "殖群甲壳",
    "kind": "buff",
    "radius": 12,
    "stats": {
      "maxHp": 0.6,
      "armorFlat": 10,
      "regenHpPerSecond": 0.03
    }
  },
  "hots_leviathan": {
    "effectName": "母巢律动",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.2,
      "speed": 0.6,
      "maxHp": 0.2,
      "maxShield": 0.2,
      "armorPct": 0.3,
      "shieldArmorPct": 0.3,
      "move": 0.25
    }
  },
  "artanis": {
    "effectName": "达拉姆圣盾",
    "kind": "buff",
    "radius": 12,
    "stats": {
      "maxShield": 0.6,
      "shieldArmorFlat": 10,
      "armorFlat": 6,
      "damageReduction": 0.4
    }
  },
  "zeratul": {
    "effectName": "虚空裂隙",
    "kind": "debuff",
    "radius": 10,
    "stats": {
      "vulnerability": 0.6,
      "armorReduction": 0.65,
      "defenseReduction": 0.3
    }
  },
  "alarak": {
    "effectName": "高阶压制",
    "kind": "debuff",
    "radius": 10,
    "stats": {
      "weaponSuppression": 0.45,
      "attackSlow": 0.4,
      "moveSlow": 0.45
    },
    "bossControlScale": 1
  },
  "fenix": {
    "effectName": "净化武库",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.6,
      "speed": 0.25,
      "maxHp": 0.25,
      "maxShield": 0.4,
      "armorPct": 0.3,
      "shieldArmorPct": 0.3,
      "move": 0.25
    }
  },
  "vorazun": {
    "effectName": "暗影迟滞",
    "kind": "debuff",
    "radius": 10,
    "stats": {
      "attackSlow": 0.5,
      "weaponSuppression": 0.3,
      "moveSlow": 0.5
    },
    "bossControlScale": 1
  },
  "purifier_flagship": {
    "effectName": "矩阵共鸣",
    "kind": "buff",
    "radius": null,
    "stats": {
      "damage": 0.3,
      "speed": 0.5,
      "maxHp": 0.25,
      "maxShield": 0.5,
      "armorPct": 0.3,
      "shieldArmorPct": 0.4,
      "move": 0.25
    }
  }
} as const;
export const TEAM_AURA_HELP={
  "zergling.3": "全队跳虫攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。",
  "ravager.3": "半径8持续范围：敌正生命/盾护甲－45%，已有百分比减伤相对降低25%。",
  "hydralisk.3": "每层毒囊附带受到武器伤害＋5%，4层上限＋20%；继发1层仅＋5%。",
  "queen.1": "半径9，生命＋45%、生命护甲＋6、每秒恢复最大生命2%。",
  "queen.2": "原输血实际恢复后给予6秒：受到生命治疗＋30%，武器实际生命伤吸血15%，每体每秒吸血最多自身最大生命10%。",
  "queen.3": "半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。",
  "mutalisk.3": "来源脱战2秒后，全队生物移速＋30%；入战按真实储能比例给半径8内5名其他友军最多15%生命护障，4秒，团队触发间隔12秒。",
  "corruptor.2": "新半径9属性场：生命/原生盾＋35%、生命/盾护甲＋6、攻速＋25%；原半径7分担继续。",
  "zealot.3": "全队狂热者攻击、攻速、生命、原生盾、生命/盾护甲、移动各＋20%；主武器零甲持续输出×1.44。",
  "sentry.1": "新增常驻半径9：生命＋20%、原生盾＋40%、生命护甲＋3、盾护甲＋5。",
  "sentry.2": "半径8持续范围：武器伤害－30%、攻速－35%、移动－45%；Boss各半效。",
  "immortal.3": "半径8：生命/盾护甲＋5，承受直接武器伤害降低15%。",
  "high_templar.2": "反馈实际命中后，受到武器伤害＋25%，持续6秒。",
  "high_templar.3": "新增半径8持续范围：正生命/盾护甲－45%，已有百分比减伤相对降低25%。",
  "phoenix.3": "来源脱战2秒后，全队原生盾友军移速＋30%；入战按储能比例给半径8内5名其他友军最多20%原生盾护障，6秒，团队触发间隔12秒。",
  "carrier.3": "生命＋30%、原生盾＋40%、攻速＋25%、生命/盾护甲＋5，半径10。",
  "kerrigan": "攻击＋50%、攻速＋30%、生命/原生盾＋35%、生命/盾护甲＋30%、移动＋25%；全队生物。",
  "zagara": "敌攻速－45%、武器伤害－30%、移动－50%；半径10，Boss完整生效。",
  "dehaka": "敌武器伤害－50%、攻速－35%、移动－45%；半径9，Boss完整生效。",
  "stukov": "受到武器伤害＋45%、实际生命治疗－50%；每秒瘟疫为入圈时最大生命的普通6%/精英3%/Boss1.2%；半径10。",
  "niadra": "生命＋60%、生命护甲＋10、每秒恢复最大生命3%；半径12。",
  "hots_leviathan": "攻击＋20%、攻速＋60%、生命/原生盾＋20%、生命/盾护甲＋30%、移动＋25%；全队生物。",
  "artanis": "原生盾上限＋60%、盾护甲＋10、生命护甲＋6、承受敌伤降低40%；半径12。",
  "zeratul": "受到武器伤害＋60%、正生命/盾护甲－65%、已有百分比减伤相对降低30%；半径10，Boss完整。",
  "alarak": "敌武器伤害－45%、攻速－40%、移动－45%；半径10，Boss完整生效。",
  "fenix": "攻击＋60%、攻速＋25%、生命＋25%、原生盾＋40%、生命/盾护甲＋30%、移动＋25%；全队机械。",
  "vorazun": "敌攻速－50%、武器伤害－30%、移动－50%；半径10，Boss完整生效。",
  "purifier_flagship": "攻击＋30%、攻速＋50%、生命＋25%、原生盾＋50%、生命护甲＋30%、盾护甲＋40%、移动＋25%；全队原生盾友军。"
} as const;
