/** Generated from pinned 5.0.15 UpgradeData. Ordinary weapon increments are source values, not flat +1 assumptions. */
import type {FamilyId} from './races';
export interface SourceWeaponUpgradeDelta {damage:number;bonusDamage:Record<string,number>;shieldBonus:number;}
export interface SourceWeaponUpgrade {upgradeKey:string;sourceIds:readonly string[];perLevel:readonly SourceWeaponUpgradeDelta[];}
export const SOURCE_UPGRADE_PROFILE={
  "version": "5.0.15",
  "revision": "fbbd6429b1eb6978c78a092dc68ba09029d03171",
  "files": [
    {
      "file": ".cache/sc2-data/core-upgradedata.xml",
      "sha256": "462d854c7f49451553a4124cff4bca42b10446b4c625b64920c748090e1790ff"
    },
    {
      "file": ".cache/sc2-data/liberty-upgradedata.xml",
      "sha256": "df36f1b58beab90371d87c84b5acf79d03a547e7093469057d03348ee7ef1faf"
    },
    {
      "file": ".cache/sc2-data/swarm-upgradedata.xml",
      "sha256": "2f173334d69228b817c62236a9dc451798aeab7ee3670dc39f3a1d55a20af1cb"
    },
    {
      "file": ".cache/sc2-data/void-upgradedata.xml",
      "sha256": "763c7ffbb8e1d714909792f0bb9f1c0c80173160e51cd64cfc2b426918ad8a4e"
    },
    {
      "file": ".cache/sc2-data/voidmulti-upgradedata.xml",
      "sha256": "459e00fd3ecae50cc8c11d1a4027752b39b10aab9102317b12f19ff46ee8c06e"
    },
    {
      "file": ".cache/sc2-data/balancemulti-upgradedata.xml",
      "sha256": "a289677c41c60d3b49b343132c38140a9ed20e79e193754e6f0ee094151aa4c5"
    }
  ]
} as const;
export const SOURCE_PRIMARY_DAMAGE_EFFECT:Record<FamilyId,string|null>={
  "marine": "GuassRifle",
  "marauder": "PunisherGrenadesU",
  "reaper": "P38ScytheGuassPistol",
  "hellion": "InfernalFlameThrower",
  "tank": "90mmCannons",
  "thor": "ThorsHammerDamage",
  "viking": "LanzerTorpedoesDamage",
  "banshee": "BacklashRocketsU",
  "medivac": null,
  "science_vessel": null,
  "zergling": "Claws",
  "baneling": "VolatileBurstU",
  "roach": "AcidSalivaU",
  "ravager": "RavagerWeaponDamage",
  "hydralisk": "NeedleSpinesDamage",
  "queen": "TalonsMissileDamage",
  "lurker": "LurkerMPDamage",
  "mutalisk": "GlaiveWurmU1",
  "corruptor": "ParasiteSporeDamage",
  "ultralisk": "KaiserBladesDamage",
  "zealot": "PsiBlades",
  "adept": "AdeptDamage",
  "stalker": "ParticleDisruptorsU",
  "sentry": "DisruptionBeamDamage",
  "immortal": "PhaseDisruptors",
  "colossus": "ThermalLancesMU",
  "high_templar": "HighTemplarWeaponDamage",
  "phoenix": "IonCannonsU",
  "void_ray": "VoidRaySwarmDamage",
  "carrier": "InterceptorBeamDamage"
};
export const SOURCE_WEAPON_UPGRADE_STEPS:Readonly<Record<string,SourceWeaponUpgrade>>={
  "GuassRifle": {
    "upgradeKey": "terran.infantry",
    "sourceIds": [
      "TerranInfantryWeaponsLevel1",
      "TerranInfantryWeaponsLevel2",
      "TerranInfantryWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "P38ScytheGuassPistol": {
    "upgradeKey": "terran.infantry",
    "sourceIds": [
      "TerranInfantryWeaponsLevel1",
      "TerranInfantryWeaponsLevel2",
      "TerranInfantryWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "PunisherGrenadesU": {
    "upgradeKey": "terran.infantry",
    "sourceIds": [
      "TerranInfantryWeaponsLevel1",
      "TerranInfantryWeaponsLevel2",
      "TerranInfantryWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "ThorsHammerDamage": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "JavelinMissileLaunchersDamage": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "90mmCannons": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "CrucioShockCannonBlast": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 4,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 4,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 4,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "InfernalFlameThrower": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "HellionTankDamage": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "LanceMissileLaunchersDamage": {
    "upgradeKey": "terran.vehicle",
    "sourceIds": [
      "TerranVehicleWeaponsLevel1",
      "TerranVehicleWeaponsLevel2",
      "TerranVehicleWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 3,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "BacklashRocketsU": {
    "upgradeKey": "terran.air_weapon",
    "sourceIds": [
      "TerranShipWeaponsLevel1",
      "TerranShipWeaponsLevel2",
      "TerranShipWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "LanzerTorpedoesDamage": {
    "upgradeKey": "terran.air_weapon",
    "sourceIds": [
      "TerranShipWeaponsLevel1",
      "TerranShipWeaponsLevel2",
      "TerranShipWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "TwinGatlingCannons": {
    "upgradeKey": "terran.air_weapon",
    "sourceIds": [
      "TerranShipWeaponsLevel1",
      "TerranShipWeaponsLevel2",
      "TerranShipWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Mechanical": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Mechanical": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Mechanical": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "Claws": {
    "upgradeKey": "zerg.melee",
    "sourceIds": [
      "ZergMeleeWeaponsLevel1",
      "ZergMeleeWeaponsLevel2",
      "ZergMeleeWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "KaiserBladesDamage": {
    "upgradeKey": "zerg.melee",
    "sourceIds": [
      "ZergMeleeWeaponsLevel1",
      "ZergMeleeWeaponsLevel2",
      "ZergMeleeWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 3,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "VolatileBurstU": {
    "upgradeKey": "zerg.melee",
    "sourceIds": [
      "ZergMeleeWeaponsLevel1",
      "ZergMeleeWeaponsLevel2",
      "ZergMeleeWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "VolatileBurstU2": {
    "upgradeKey": "zerg.melee",
    "sourceIds": [
      "ZergMeleeWeaponsLevel1",
      "ZergMeleeWeaponsLevel2",
      "ZergMeleeWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 5,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 5,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 5,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "NeedleSpinesDamage": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "Talons": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "AcidSpines": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "AcidSalivaU": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "TalonsMissileDamage": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "RavagerWeaponDamage": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "LurkerMPDamage": {
    "upgradeKey": "zerg.missile",
    "sourceIds": [
      "ZergMissileWeaponsLevel1",
      "ZergMissileWeaponsLevel2",
      "ZergMissileWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "GlaiveWurmU1": {
    "upgradeKey": "zerg.flyer_weapon",
    "sourceIds": [
      "ZergFlyerWeaponsLevel1",
      "ZergFlyerWeaponsLevel2",
      "ZergFlyerWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "GlaiveWurmU2": {
    "upgradeKey": "zerg.flyer_weapon",
    "sourceIds": [
      "ZergFlyerWeaponsLevel1",
      "ZergFlyerWeaponsLevel2",
      "ZergFlyerWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 0.333,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 0.333,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 0.333,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "GlaiveWurmU3": {
    "upgradeKey": "zerg.flyer_weapon",
    "sourceIds": [
      "ZergFlyerWeaponsLevel1",
      "ZergFlyerWeaponsLevel2",
      "ZergFlyerWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 0.111,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 0.111,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 0.111,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "ParasiteSporeDamage": {
    "upgradeKey": "zerg.flyer_weapon",
    "sourceIds": [
      "ZergFlyerWeaponsLevel1",
      "ZergFlyerWeaponsLevel2",
      "ZergFlyerWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Massive": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "PsiBlades": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "DisruptionBeamDamage": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "ParticleDisruptorsU": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Armored": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "PhaseDisruptors": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 3
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 3
        },
        "shieldBonus": 0
      },
      {
        "damage": 2,
        "bonusDamage": {
          "Armored": 3
        },
        "shieldBonus": 0
      }
    ]
  },
  "ThermalLancesMU": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "AdeptDamage": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {
          "Light": 1
        },
        "shieldBonus": 0
      }
    ]
  },
  "HighTemplarWeaponDamage": {
    "upgradeKey": "protoss.ground_weapon",
    "sourceIds": [
      "ProtossGroundWeaponsLevel1",
      "ProtossGroundWeaponsLevel2",
      "ProtossGroundWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "IonCannonsU": {
    "upgradeKey": "protoss.air_weapon",
    "sourceIds": [
      "ProtossAirWeaponsLevel1",
      "ProtossAirWeaponsLevel2",
      "ProtossAirWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "InterceptorBeamDamage": {
    "upgradeKey": "protoss.air_weapon",
    "sourceIds": [
      "ProtossAirWeaponsLevel1",
      "ProtossAirWeaponsLevel2",
      "ProtossAirWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  },
  "VoidRaySwarmDamage": {
    "upgradeKey": "protoss.air_weapon",
    "sourceIds": [
      "ProtossAirWeaponsLevel1",
      "ProtossAirWeaponsLevel2",
      "ProtossAirWeaponsLevel3"
    ],
    "perLevel": [
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      },
      {
        "damage": 1,
        "bonusDamage": {},
        "shieldBonus": 0
      }
    ]
  }
};
export const SOURCE_RESEARCH_EFFECTS={
  "infernal": {
    "sourceId": "HighCapacityBarrels",
    "hellionLightBonus": 5,
    "hellbatLightBonus": 12
  },
  "shield": {
    "sourceId": "ShieldWall",
    "maxHpAdd": 10
  },
  "ling_speed": {
    "sourceId": "zerglingmovementspeed",
    "speedAdd": 2.4444
  },
  "bane_speed": {
    "sourceId": "CentrificalHooks",
    "speedAdd": 0.63434,
    "maxHpAdd": 5
  },
  "roach_speed": {
    "sourceId": "GlialReconstitution",
    "speedAdd": 1.0499999999999998
  },
  "hydra_range": {
    "sourceId": "EvolveGroovedSpines",
    "rangeAdd": 1
  },
  "lurker_deploy": {
    "sourceId": "DiggingClaws",
    "burrowSecondsSubtract": 1.0714285714285714,
    "randomDelaySecondsSubtract": 0.17857142857142858,
    "speedAdd": 0.42098
  },
  "charge": {
    "sourceId": "Charge",
    "speedAdd": 1.575
  },
  "glaives": {
    "sourceId": "AdeptPiercingAttack",
    "attackSpeedAdd": 0.45
  },
  "colossus_range": {
    "sourceId": "ExtendedThermalLance",
    "rangeAdd": 2
  }
} as const;
export function sourceWeaponUpgradeDelta(effectId:string|null,level:number):SourceWeaponUpgradeDelta {const result:SourceWeaponUpgradeDelta={damage:0,bonusDamage:{},shieldBonus:0};if(!effectId)return result;for(const step of SOURCE_WEAPON_UPGRADE_STEPS[effectId]?.perLevel.slice(0,Math.max(0,Math.min(3,Math.floor(level))))??[]){result.damage+=step.damage;result.shieldBonus+=step.shieldBonus;for(const [attribute,amount] of Object.entries(step.bonusDamage))result.bonusDamage[attribute]=(result.bonusDamage[attribute]??0)+amount;}return result;}
