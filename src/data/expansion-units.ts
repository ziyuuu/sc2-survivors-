/** Generated from the pinned 5.0.15 XML by tools/build-expansion-unit-data.mjs.
 * Do not replace absent sources with another unit's stats. Runtime adaptations
 * belong outside this source table. All times/rates use Faster (1.4).
 */
import type {UnitData} from './sc2-units';
export const EXPANSION_SOURCE={revision:'fbbd6429b1eb6978c78a092dc68ba09029d03171',layers:["core","liberty","swarm","void","voidmulti","balancemulti"],clock:'Faster: durations / 1.4, rates * 1.4'} as const;
export const EXPANSION_FAMILIES=["marine","marauder","reaper","hellion","tank","thor","viking","banshee","medivac","science_vessel","zergling","baneling","roach","ravager","hydralisk","queen","lurker","mutalisk","corruptor","ultralisk","zealot","adept","stalker","sentry","immortal","colossus","high_templar","phoenix","void_ray","carrier"] as const;
export type ExpansionFamilyId=typeof EXPANSION_FAMILIES[number];
export const ADDED_UNIT_IDS=["reaper","thor","viking","banshee","science_vessel","queen","lurker","mutalisk","corruptor","ultralisk","zealot","adept","stalker","sentry","immortal","colossus","high_templar","phoenix","void_ray","carrier"] as const;
export type AddedUnitType=typeof ADDED_UNIT_IDS[number];
export type VerifiedAddedUnitType=Exclude<AddedUnitType,'science_vessel'>;
export interface SourceWeapon {weaponId:string;effectId:string|null;attackDamage:number;attacks:number;attackPeriod:number;attackRange:number;minimumRange:number;targetType:UnitData['targetType'];damagePoint:number;bonusDamage:UnitData['bonusDamage'];shieldBonus:number;splash:{radius:number;fraction:number;arc:number}[];}
export interface ExpansionUnitData extends UnitData {maxShields:number;shieldArmor:number;shieldRegenPerSecond:number;shieldRegenDelay:number;hpRegenPerSecond:number;hpRegenDelay:number;maxEnergy:number;startEnergy:number;energyRegenPerSecond:number;creepSpeedMultiplier:number;targetPlanes:('ground'|'air')[];movementClass:'ground'|'flying'|'cliff-jumper'|'colossus';sourceUnitId:string;primaryWeapon:SourceWeapon|null;}
export interface SourceProductionRecipe {abilityId:string;entryId:string;baseFamily:ExpansionFamilyId|null;mineralCost:number;gasCost:number;productionTime:number;baseSeconds:number;morphSeconds:number;batchBodyCount:number;}
export const VERIFIED_EXPANSION_UNITS:Record<VerifiedAddedUnitType,ExpansionUnitData>={
  "reaper": {
    "name": "Reaper",
    "zh": "死神",
    "maxHp": 60,
    "armor": 0,
    "movementSpeed": 5.25,
    "attackDamage": 4,
    "attacks": 2,
    "attackPeriod": 0.7857142857142858,
    "attackRange": 5,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Light",
      "Biological"
    ],
    "productionTime": 32.142857142857146,
    "mineralCost": 50,
    "gasCost": 50,
    "unitRadius": 0.375,
    "flying": false,
    "damagePoint": 0,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 2.8,
    "hpRegenDelay": 7.142857142857143,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "cliff-jumper",
    "sourceUnitId": "Reaper",
    "primaryWeapon": {
      "weaponId": "P38ScytheGuassPistol",
      "effectId": "P38ScytheGuassPistol",
      "attackDamage": 4,
      "attacks": 2,
      "attackPeriod": 0.7857142857142858,
      "attackRange": 5,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "thor": {
    "name": "Thor",
    "zh": "雷神",
    "maxHp": 400,
    "armor": 1,
    "movementSpeed": 2.625,
    "attackDamage": 30,
    "attacks": 2,
    "attackPeriod": 0.9142857142857144,
    "attackRange": 7,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Armored",
      "Mechanical",
      "Massive"
    ],
    "productionTime": 42.85714285714286,
    "mineralCost": 300,
    "gasCost": 200,
    "unitRadius": 1,
    "flying": false,
    "damagePoint": 0.5935714285714285,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Thor",
    "primaryWeapon": {
      "weaponId": "ThorsHammer",
      "effectId": "ThorsHammerDamage",
      "attackDamage": 30,
      "attacks": 2,
      "attackPeriod": 0.9142857142857144,
      "attackRange": 7,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.5935714285714285,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "viking": {
    "name": "Viking",
    "zh": "维京",
    "maxHp": 135,
    "armor": 0,
    "movementSpeed": 3.8499999999999996,
    "attackDamage": 10,
    "attacks": 2,
    "attackPeriod": 1.4285714285714286,
    "attackRange": 9,
    "targetType": "air",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 4
      }
    ],
    "attributes": [
      "Armored",
      "Mechanical"
    ],
    "productionTime": 30.000000000000004,
    "mineralCost": 125,
    "gasCost": 75,
    "unitRadius": 0.75,
    "flying": true,
    "damagePoint": 0.03571428571428572,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "VikingFighter",
    "primaryWeapon": {
      "weaponId": "LanzerTorpedoes",
      "effectId": "LanzerTorpedoesDamage",
      "attackDamage": 10,
      "attacks": 2,
      "attackPeriod": 1.4285714285714286,
      "attackRange": 9,
      "minimumRange": 0,
      "targetType": "air",
      "damagePoint": 0.03571428571428572,
      "bonusDamage": [
        {
          "attribute": "Armored",
          "amount": 4
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "banshee": {
    "name": "Banshee",
    "zh": "女妖",
    "maxHp": 140,
    "armor": 0,
    "movementSpeed": 3.8499999999999996,
    "attackDamage": 12,
    "attacks": 2,
    "attackPeriod": 0.8928571428571429,
    "attackRange": 6,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Light",
      "Mechanical"
    ],
    "productionTime": 42.85714285714286,
    "mineralCost": 150,
    "gasCost": 100,
    "unitRadius": 0.75,
    "flying": true,
    "damagePoint": 0.1192857142857143,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 200,
    "startEnergy": 50,
    "energyRegenPerSecond": 0.7875,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "Banshee",
    "primaryWeapon": {
      "weaponId": "BacklashRockets",
      "effectId": "BacklashRocketsU",
      "attackDamage": 12,
      "attacks": 2,
      "attackPeriod": 0.8928571428571429,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "queen": {
    "name": "Queen",
    "zh": "虫后",
    "maxHp": 175,
    "armor": 1,
    "movementSpeed": 1.3125,
    "attackDamage": 4,
    "attacks": 2,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 5,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Biological",
      "Psionic"
    ],
    "productionTime": 35.714285714285715,
    "mineralCost": 175,
    "gasCost": 0,
    "unitRadius": 0.875,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0.38275999999999993,
    "hpRegenDelay": 0,
    "maxEnergy": 200,
    "startEnergy": 25,
    "energyRegenPerSecond": 0.7875,
    "creepSpeedMultiplier": 2.6665,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Queen",
    "primaryWeapon": {
      "weaponId": "TalonsMissile",
      "effectId": "TalonsMissileDamage",
      "attackDamage": 4,
      "attacks": 2,
      "attackPeriod": 0.7142857142857143,
      "attackRange": 5,
      "minimumRange": 3,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "lurker": {
    "name": "Lurker",
    "zh": "潜伏者",
    "maxHp": 190,
    "armor": 1,
    "movementSpeed": 4.13434,
    "attackDamage": 0,
    "attacks": 0,
    "attackPeriod": 1,
    "attackRange": 0,
    "targetType": "none",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Armored",
      "Biological"
    ],
    "productionTime": 41.60714285714286,
    "mineralCost": 150,
    "gasCost": 150,
    "unitRadius": 0.9375,
    "flying": false,
    "damagePoint": 0,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0.38275999999999993,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1.3,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "LurkerMP",
    "primaryWeapon": null
  },
  "mutalisk": {
    "name": "Mutalisk",
    "zh": "异龙",
    "maxHp": 120,
    "armor": 0,
    "movementSpeed": 5.6,
    "attackDamage": 9,
    "attacks": 1,
    "attackPeriod": 1.089,
    "attackRange": 3,
    "targetType": "both",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Light",
      "Biological"
    ],
    "productionTime": 23.571428571428573,
    "mineralCost": 100,
    "gasCost": 100,
    "unitRadius": 0.5,
    "flying": true,
    "damagePoint": 0,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 1.4,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "Mutalisk",
    "primaryWeapon": {
      "weaponId": "GlaiveWurm",
      "effectId": "GlaiveWurmU1",
      "attackDamage": 9,
      "attacks": 1,
      "attackPeriod": 1.089,
      "attackRange": 3,
      "minimumRange": 0,
      "targetType": "both",
      "damagePoint": 0,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "corruptor": {
    "name": "Corruptor",
    "zh": "腐化者",
    "maxHp": 200,
    "armor": 2,
    "movementSpeed": 4.725,
    "attackDamage": 14,
    "attacks": 1,
    "attackPeriod": 1.3571428571428572,
    "attackRange": 6,
    "targetType": "air",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Massive",
        "amount": 6
      }
    ],
    "attributes": [
      "Armored",
      "Biological"
    ],
    "productionTime": 28.571428571428573,
    "mineralCost": 150,
    "gasCost": 100,
    "unitRadius": 0.625,
    "flying": true,
    "damagePoint": 0.044642857142857144,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0.38275999999999993,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "Corruptor",
    "primaryWeapon": {
      "weaponId": "ParasiteSpore",
      "effectId": "ParasiteSporeDamage",
      "attackDamage": 14,
      "attacks": 1,
      "attackPeriod": 1.3571428571428572,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "air",
      "damagePoint": 0.044642857142857144,
      "bonusDamage": [
        {
          "attribute": "Massive",
          "amount": 6
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "ultralisk": {
    "name": "Ultralisk",
    "zh": "雷兽",
    "maxHp": 500,
    "armor": 2,
    "movementSpeed": 4.13434,
    "attackDamage": 35,
    "attacks": 1,
    "attackPeriod": 0.6142857142857143,
    "attackRange": 1,
    "targetType": "ground",
    "splash": [
      {
        "radius": 2,
        "fraction": 0.33
      },
      {
        "radius": 2,
        "fraction": 0.33
      }
    ],
    "bonusDamage": [],
    "attributes": [
      "Armored",
      "Biological",
      "Massive"
    ],
    "productionTime": 39.285714285714285,
    "mineralCost": 275,
    "gasCost": 200,
    "unitRadius": 1,
    "flying": false,
    "damagePoint": 0.23800000000000002,
    "maxShields": 0,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 0,
    "shieldRegenDelay": 0,
    "hpRegenPerSecond": 0.38275999999999993,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1.3,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Ultralisk",
    "primaryWeapon": {
      "weaponId": "KaiserBlades",
      "effectId": "KaiserBladesDamage",
      "attackDamage": 35,
      "attacks": 1,
      "attackPeriod": 0.6142857142857143,
      "attackRange": 1,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.23800000000000002,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": [
        {
          "radius": 2,
          "fraction": 0.33,
          "arc": 45
        },
        {
          "radius": 2,
          "fraction": 0.33,
          "arc": 180
        }
      ]
    }
  },
  "zealot": {
    "name": "Zealot",
    "zh": "狂热者",
    "maxHp": 100,
    "armor": 1,
    "movementSpeed": 3.15,
    "attackDamage": 8,
    "attacks": 2,
    "attackPeriod": 0.8571428571428572,
    "attackRange": 0.1,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Light",
      "Biological"
    ],
    "productionTime": 27.142857142857146,
    "mineralCost": 100,
    "gasCost": 0,
    "unitRadius": 0.5,
    "flying": false,
    "damagePoint": 0,
    "maxShields": 50,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Zealot",
    "primaryWeapon": {
      "weaponId": "PsiBlades",
      "effectId": "PsiBlades",
      "attackDamage": 8,
      "attacks": 2,
      "attackPeriod": 0.8571428571428572,
      "attackRange": 0.1,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "adept": {
    "name": "Adept",
    "zh": "使徒",
    "maxHp": 70,
    "armor": 1,
    "movementSpeed": 3.5,
    "attackDamage": 10,
    "attacks": 1,
    "attackPeriod": 1.6071428571428572,
    "attackRange": 4,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 12
      }
    ],
    "attributes": [
      "Light",
      "Biological"
    ],
    "productionTime": 30.000000000000004,
    "mineralCost": 100,
    "gasCost": 25,
    "unitRadius": 0.5,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 70,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Adept",
    "primaryWeapon": {
      "weaponId": "Adept",
      "effectId": "AdeptDamage",
      "attackDamage": 10,
      "attacks": 1,
      "attackPeriod": 1.6071428571428572,
      "attackRange": 4,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Light",
          "amount": 12
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "stalker": {
    "name": "Stalker",
    "zh": "追猎者",
    "maxHp": 80,
    "armor": 1,
    "movementSpeed": 4.13434,
    "attackDamage": 13,
    "attacks": 1,
    "attackPeriod": 1.3357142857142859,
    "attackRange": 6,
    "targetType": "both",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 5
      }
    ],
    "attributes": [
      "Armored",
      "Mechanical"
    ],
    "productionTime": 27.142857142857146,
    "mineralCost": 125,
    "gasCost": 50,
    "unitRadius": 0.625,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 80,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Stalker",
    "primaryWeapon": {
      "weaponId": "ParticleDisruptors",
      "effectId": "ParticleDisruptorsU",
      "attackDamage": 13,
      "attacks": 1,
      "attackPeriod": 1.3357142857142859,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "both",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Armored",
          "amount": 5
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "sentry": {
    "name": "Sentry",
    "zh": "哨兵",
    "maxHp": 40,
    "armor": 1,
    "movementSpeed": 3.5,
    "attackDamage": 6,
    "attacks": 1,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 5,
    "targetType": "both",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Mechanical",
      "Psionic"
    ],
    "productionTime": 22.857142857142858,
    "mineralCost": 50,
    "gasCost": 100,
    "unitRadius": 0.5,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 40,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 200,
    "startEnergy": 50,
    "energyRegenPerSecond": 0.7875,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Sentry",
    "primaryWeapon": {
      "weaponId": "DisruptionBeam",
      "effectId": "DisruptionBeamDamage",
      "attackDamage": 6,
      "attacks": 1,
      "attackPeriod": 0.7142857142857143,
      "attackRange": 5,
      "minimumRange": 0,
      "targetType": "both",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [],
      "shieldBonus": 4,
      "splash": []
    }
  },
  "immortal": {
    "name": "Immortal",
    "zh": "不朽者",
    "maxHp": 200,
    "armor": 1,
    "movementSpeed": 3.15,
    "attackDamage": 20,
    "attacks": 1,
    "attackPeriod": 1.142857142857143,
    "attackRange": 6,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 30
      }
    ],
    "attributes": [
      "Armored",
      "Mechanical"
    ],
    "productionTime": 39.285714285714285,
    "mineralCost": 275,
    "gasCost": 100,
    "unitRadius": 0.75,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 100,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "Immortal",
    "primaryWeapon": {
      "weaponId": "PhaseDisruptors",
      "effectId": "PhaseDisruptors",
      "attackDamage": 20,
      "attacks": 1,
      "attackPeriod": 1.142857142857143,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Armored",
          "amount": 30
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "colossus": {
    "name": "Colossus",
    "zh": "巨像",
    "maxHp": 250,
    "armor": 1,
    "movementSpeed": 3.15,
    "attackDamage": 10,
    "attacks": 2,
    "attackPeriod": 1.0714285714285714,
    "attackRange": 7,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 5
      }
    ],
    "attributes": [
      "Armored",
      "Mechanical",
      "Massive"
    ],
    "productionTime": 53.57142857142858,
    "mineralCost": 300,
    "gasCost": 200,
    "unitRadius": 1,
    "flying": false,
    "damagePoint": 0.05942857142857143,
    "maxShields": 100,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground",
      "air"
    ],
    "movementClass": "colossus",
    "sourceUnitId": "Colossus",
    "primaryWeapon": {
      "weaponId": "ThermalLances",
      "effectId": "ThermalLancesMU",
      "attackDamage": 10,
      "attacks": 2,
      "attackPeriod": 1.0714285714285714,
      "attackRange": 7,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.05942857142857143,
      "bonusDamage": [
        {
          "attribute": "Light",
          "amount": 5
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "high_templar": {
    "name": "High Templar",
    "zh": "高阶圣堂武士",
    "maxHp": 40,
    "armor": 0,
    "movementSpeed": 2.82184,
    "attackDamage": 4,
    "attacks": 1,
    "attackPeriod": 1.252857142857143,
    "attackRange": 6,
    "targetType": "ground",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Light",
      "Biological",
      "Psionic"
    ],
    "productionTime": 39.285714285714285,
    "mineralCost": 50,
    "gasCost": 150,
    "unitRadius": 0.375,
    "flying": false,
    "damagePoint": 0.1192857142857143,
    "maxShields": 40,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 200,
    "startEnergy": 50,
    "energyRegenPerSecond": 0.7875,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "ground"
    ],
    "movementClass": "ground",
    "sourceUnitId": "HighTemplar",
    "primaryWeapon": {
      "weaponId": "HighTemplarWeapon",
      "effectId": "HighTemplarWeaponDamage",
      "attackDamage": 4,
      "attacks": 1,
      "attackPeriod": 1.252857142857143,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "phoenix": {
    "name": "Phoenix",
    "zh": "凤凰",
    "maxHp": 120,
    "armor": 0,
    "movementSpeed": 5.949999999999999,
    "attackDamage": 5,
    "attacks": 2,
    "attackPeriod": 0.7857142857142858,
    "attackRange": 5,
    "targetType": "air",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 5
      }
    ],
    "attributes": [
      "Light",
      "Mechanical"
    ],
    "productionTime": 25,
    "mineralCost": 150,
    "gasCost": 100,
    "unitRadius": 0.75,
    "flying": true,
    "damagePoint": 0.1192857142857143,
    "maxShields": 60,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 200,
    "startEnergy": 50,
    "energyRegenPerSecond": 0.7875,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "Phoenix",
    "primaryWeapon": {
      "weaponId": "IonCannons",
      "effectId": "IonCannonsU",
      "attackDamage": 5,
      "attacks": 2,
      "attackPeriod": 0.7857142857142858,
      "attackRange": 5,
      "minimumRange": 0,
      "targetType": "air",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Light",
          "amount": 5
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "void_ray": {
    "name": "Void Ray",
    "zh": "虚空辉光舰",
    "maxHp": 150,
    "armor": 0,
    "movementSpeed": 3.8499999999999996,
    "attackDamage": 6,
    "attacks": 1,
    "attackPeriod": 0.35714285714285715,
    "attackRange": 6,
    "targetType": "both",
    "splash": [],
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 4
      }
    ],
    "attributes": [
      "Armored",
      "Mechanical"
    ],
    "productionTime": 37.142857142857146,
    "mineralCost": 200,
    "gasCost": 150,
    "unitRadius": 1,
    "flying": true,
    "damagePoint": 0.1192857142857143,
    "maxShields": 100,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "VoidRay",
    "primaryWeapon": {
      "weaponId": "VoidRaySwarm",
      "effectId": "VoidRaySwarmDamage",
      "attackDamage": 6,
      "attacks": 1,
      "attackPeriod": 0.35714285714285715,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "both",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Armored",
          "amount": 4
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "carrier": {
    "name": "Carrier",
    "zh": "航母",
    "maxHp": 300,
    "armor": 2,
    "movementSpeed": 2.625,
    "attackDamage": 0,
    "attacks": 0,
    "attackPeriod": 0.35714285714285715,
    "attackRange": 8,
    "targetType": "both",
    "splash": [],
    "bonusDamage": [],
    "attributes": [
      "Armored",
      "Mechanical",
      "Massive"
    ],
    "productionTime": 64.28571428571429,
    "mineralCost": 350,
    "gasCost": 250,
    "unitRadius": 1.25,
    "flying": true,
    "damagePoint": 0,
    "maxShields": 150,
    "shieldArmor": 0,
    "shieldRegenPerSecond": 2.8,
    "shieldRegenDelay": 7.142857142857143,
    "hpRegenPerSecond": 0,
    "hpRegenDelay": 0,
    "maxEnergy": 0,
    "startEnergy": 0,
    "energyRegenPerSecond": 0,
    "creepSpeedMultiplier": 1,
    "targetPlanes": [
      "air"
    ],
    "movementClass": "flying",
    "sourceUnitId": "Carrier",
    "primaryWeapon": {
      "weaponId": "InterceptorLaunch",
      "effectId": null,
      "attackDamage": 0,
      "attacks": 0,
      "attackPeriod": 0.35714285714285715,
      "attackRange": 8,
      "minimumRange": 0,
      "targetType": "both",
      "damagePoint": 0,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  }
};
export const EXPANSION_UNITS:Record<AddedUnitType,ExpansionUnitData|null>={...VERIFIED_EXPANSION_UNITS,science_vessel:null};
export const SOURCE_PRODUCTION_RECIPES:Record<ExpansionFamilyId,SourceProductionRecipe|null>={
  "marine": {
    "abilityId": "BarracksTrain",
    "entryId": "Train1",
    "baseFamily": null,
    "mineralCost": 50,
    "gasCost": 0,
    "productionTime": 17.857142857142858,
    "baseSeconds": 17.857142857142858,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "marauder": {
    "abilityId": "BarracksTrain",
    "entryId": "Train4",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 25,
    "productionTime": 21.42857142857143,
    "baseSeconds": 21.42857142857143,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "reaper": {
    "abilityId": "BarracksTrain",
    "entryId": "Train2",
    "baseFamily": null,
    "mineralCost": 50,
    "gasCost": 50,
    "productionTime": 32.142857142857146,
    "baseSeconds": 32.142857142857146,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "hellion": {
    "abilityId": "FactoryTrain",
    "entryId": "Train6",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 0,
    "productionTime": 21.42857142857143,
    "baseSeconds": 21.42857142857143,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "tank": {
    "abilityId": "FactoryTrain",
    "entryId": "Train2",
    "baseFamily": null,
    "mineralCost": 150,
    "gasCost": 125,
    "productionTime": 32.142857142857146,
    "baseSeconds": 32.142857142857146,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "thor": {
    "abilityId": "FactoryTrain",
    "entryId": "Train5",
    "baseFamily": null,
    "mineralCost": 300,
    "gasCost": 200,
    "productionTime": 42.85714285714286,
    "baseSeconds": 42.85714285714286,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "viking": {
    "abilityId": "StarportTrain",
    "entryId": "Train5",
    "baseFamily": null,
    "mineralCost": 125,
    "gasCost": 75,
    "productionTime": 30.000000000000004,
    "baseSeconds": 30.000000000000004,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "banshee": {
    "abilityId": "StarportTrain",
    "entryId": "Train2",
    "baseFamily": null,
    "mineralCost": 150,
    "gasCost": 100,
    "productionTime": 42.85714285714286,
    "baseSeconds": 42.85714285714286,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "medivac": {
    "abilityId": "StarportTrain",
    "entryId": "Train1",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 100,
    "productionTime": 30.000000000000004,
    "baseSeconds": 30.000000000000004,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "science_vessel": null,
  "zergling": {
    "abilityId": "LarvaTrain",
    "entryId": "Train2",
    "baseFamily": null,
    "mineralCost": 25,
    "gasCost": 0,
    "productionTime": 17.142857142857142,
    "baseSeconds": 17.142857142857142,
    "morphSeconds": 0,
    "batchBodyCount": 2
  },
  "baneling": {
    "abilityId": "MorphToBaneling",
    "entryId": "1",
    "baseFamily": "zergling",
    "mineralCost": 50,
    "gasCost": 25,
    "productionTime": 31.42857142857143,
    "baseSeconds": 17.142857142857142,
    "morphSeconds": 14.285714285714286,
    "batchBodyCount": 1
  },
  "roach": {
    "abilityId": "LarvaTrain",
    "entryId": "Train10",
    "baseFamily": null,
    "mineralCost": 75,
    "gasCost": 25,
    "productionTime": 19.28571428571429,
    "baseSeconds": 19.28571428571429,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "ravager": {
    "abilityId": "MorphToRavager",
    "entryId": "1",
    "baseFamily": "roach",
    "mineralCost": 100,
    "gasCost": 100,
    "productionTime": 31.42857142857143,
    "baseSeconds": 19.28571428571429,
    "morphSeconds": 12.142857142857144,
    "batchBodyCount": 1
  },
  "hydralisk": {
    "abilityId": "LarvaTrain",
    "entryId": "Train4",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 50,
    "productionTime": 23.571428571428573,
    "baseSeconds": 23.571428571428573,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "queen": {
    "abilityId": "TrainQueen",
    "entryId": "Train1",
    "baseFamily": null,
    "mineralCost": 175,
    "gasCost": 0,
    "productionTime": 35.714285714285715,
    "baseSeconds": 35.714285714285715,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "lurker": {
    "abilityId": "MorphToLurker",
    "entryId": "1",
    "baseFamily": "hydralisk",
    "mineralCost": 150,
    "gasCost": 150,
    "productionTime": 41.60714285714286,
    "baseSeconds": 23.571428571428573,
    "morphSeconds": 18.03571428571429,
    "batchBodyCount": 1
  },
  "mutalisk": {
    "abilityId": "LarvaTrain",
    "entryId": "Train5",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 100,
    "productionTime": 23.571428571428573,
    "baseSeconds": 23.571428571428573,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "corruptor": {
    "abilityId": "LarvaTrain",
    "entryId": "Train12",
    "baseFamily": null,
    "mineralCost": 150,
    "gasCost": 100,
    "productionTime": 28.571428571428573,
    "baseSeconds": 28.571428571428573,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "ultralisk": {
    "abilityId": "LarvaTrain",
    "entryId": "Train7",
    "baseFamily": null,
    "mineralCost": 275,
    "gasCost": 200,
    "productionTime": 39.285714285714285,
    "baseSeconds": 39.285714285714285,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "zealot": {
    "abilityId": "GatewayTrain",
    "entryId": "Train1",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 0,
    "productionTime": 27.142857142857146,
    "baseSeconds": 27.142857142857146,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "adept": {
    "abilityId": "GatewayTrain",
    "entryId": "Train7",
    "baseFamily": null,
    "mineralCost": 100,
    "gasCost": 25,
    "productionTime": 30.000000000000004,
    "baseSeconds": 30.000000000000004,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "stalker": {
    "abilityId": "GatewayTrain",
    "entryId": "Train2",
    "baseFamily": null,
    "mineralCost": 125,
    "gasCost": 50,
    "productionTime": 27.142857142857146,
    "baseSeconds": 27.142857142857146,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "sentry": {
    "abilityId": "GatewayTrain",
    "entryId": "Train6",
    "baseFamily": null,
    "mineralCost": 50,
    "gasCost": 100,
    "productionTime": 22.857142857142858,
    "baseSeconds": 22.857142857142858,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "immortal": {
    "abilityId": "RoboticsFacilityTrain",
    "entryId": "Train4",
    "baseFamily": null,
    "mineralCost": 275,
    "gasCost": 100,
    "productionTime": 39.285714285714285,
    "baseSeconds": 39.285714285714285,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "colossus": {
    "abilityId": "RoboticsFacilityTrain",
    "entryId": "Train3",
    "baseFamily": null,
    "mineralCost": 300,
    "gasCost": 200,
    "productionTime": 53.57142857142858,
    "baseSeconds": 53.57142857142858,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "high_templar": {
    "abilityId": "GatewayTrain",
    "entryId": "Train4",
    "baseFamily": null,
    "mineralCost": 50,
    "gasCost": 150,
    "productionTime": 39.285714285714285,
    "baseSeconds": 39.285714285714285,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "phoenix": {
    "abilityId": "StargateTrain",
    "entryId": "Train1",
    "baseFamily": null,
    "mineralCost": 150,
    "gasCost": 100,
    "productionTime": 25,
    "baseSeconds": 25,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "void_ray": {
    "abilityId": "StargateTrain",
    "entryId": "Train5",
    "baseFamily": null,
    "mineralCost": 200,
    "gasCost": 150,
    "productionTime": 37.142857142857146,
    "baseSeconds": 37.142857142857146,
    "morphSeconds": 0,
    "batchBodyCount": 1
  },
  "carrier": {
    "abilityId": "StargateTrain",
    "entryId": "Train3",
    "baseFamily": null,
    "mineralCost": 350,
    "gasCost": 250,
    "productionTime": 64.28571428571429,
    "baseSeconds": 64.28571428571429,
    "morphSeconds": 0,
    "batchBodyCount": 1
  }
};
export const SOURCE_WEAPONS:Record<string,SourceWeapon>={
  "P38ScytheGuassPistol": {
    "weaponId": "P38ScytheGuassPistol",
    "effectId": "P38ScytheGuassPistol",
    "attackDamage": 4,
    "attacks": 2,
    "attackPeriod": 0.7857142857142858,
    "attackRange": 5,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "ThorsHammer": {
    "weaponId": "ThorsHammer",
    "effectId": "ThorsHammerDamage",
    "attackDamage": 30,
    "attacks": 2,
    "attackPeriod": 0.9142857142857144,
    "attackRange": 7,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.5935714285714285,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "LanzerTorpedoes": {
    "weaponId": "LanzerTorpedoes",
    "effectId": "LanzerTorpedoesDamage",
    "attackDamage": 10,
    "attacks": 2,
    "attackPeriod": 1.4285714285714286,
    "attackRange": 9,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.03571428571428572,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 4
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "BacklashRockets": {
    "weaponId": "BacklashRockets",
    "effectId": "BacklashRocketsU",
    "attackDamage": 12,
    "attacks": 2,
    "attackPeriod": 0.8928571428571429,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "TalonsMissile": {
    "weaponId": "TalonsMissile",
    "effectId": "TalonsMissileDamage",
    "attackDamage": 4,
    "attacks": 2,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 5,
    "minimumRange": 3,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "GlaiveWurm": {
    "weaponId": "GlaiveWurm",
    "effectId": "GlaiveWurmU1",
    "attackDamage": 9,
    "attacks": 1,
    "attackPeriod": 1.089,
    "attackRange": 3,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "ParasiteSpore": {
    "weaponId": "ParasiteSpore",
    "effectId": "ParasiteSporeDamage",
    "attackDamage": 14,
    "attacks": 1,
    "attackPeriod": 1.3571428571428572,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.044642857142857144,
    "bonusDamage": [
      {
        "attribute": "Massive",
        "amount": 6
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "KaiserBlades": {
    "weaponId": "KaiserBlades",
    "effectId": "KaiserBladesDamage",
    "attackDamage": 35,
    "attacks": 1,
    "attackPeriod": 0.6142857142857143,
    "attackRange": 1,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.23800000000000002,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": [
      {
        "radius": 2,
        "fraction": 0.33,
        "arc": 45
      },
      {
        "radius": 2,
        "fraction": 0.33,
        "arc": 180
      }
    ]
  },
  "PsiBlades": {
    "weaponId": "PsiBlades",
    "effectId": "PsiBlades",
    "attackDamage": 8,
    "attacks": 2,
    "attackPeriod": 0.8571428571428572,
    "attackRange": 0.1,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "Adept": {
    "weaponId": "Adept",
    "effectId": "AdeptDamage",
    "attackDamage": 10,
    "attacks": 1,
    "attackPeriod": 1.6071428571428572,
    "attackRange": 4,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 12
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "ParticleDisruptors": {
    "weaponId": "ParticleDisruptors",
    "effectId": "ParticleDisruptorsU",
    "attackDamage": 13,
    "attacks": 1,
    "attackPeriod": 1.3357142857142859,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 5
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "DisruptionBeam": {
    "weaponId": "DisruptionBeam",
    "effectId": "DisruptionBeamDamage",
    "attackDamage": 6,
    "attacks": 1,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 5,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 4,
    "splash": []
  },
  "PhaseDisruptors": {
    "weaponId": "PhaseDisruptors",
    "effectId": "PhaseDisruptors",
    "attackDamage": 20,
    "attacks": 1,
    "attackPeriod": 1.142857142857143,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 30
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "ThermalLances": {
    "weaponId": "ThermalLances",
    "effectId": "ThermalLancesMU",
    "attackDamage": 10,
    "attacks": 2,
    "attackPeriod": 1.0714285714285714,
    "attackRange": 7,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.05942857142857143,
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 5
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "HighTemplarWeapon": {
    "weaponId": "HighTemplarWeapon",
    "effectId": "HighTemplarWeaponDamage",
    "attackDamage": 4,
    "attacks": 1,
    "attackPeriod": 1.252857142857143,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "IonCannons": {
    "weaponId": "IonCannons",
    "effectId": "IonCannonsU",
    "attackDamage": 5,
    "attacks": 2,
    "attackPeriod": 0.7857142857142858,
    "attackRange": 5,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 5
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "VoidRaySwarm": {
    "weaponId": "VoidRaySwarm",
    "effectId": "VoidRaySwarmDamage",
    "attackDamage": 6,
    "attacks": 1,
    "attackPeriod": 0.35714285714285715,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 4
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "InterceptorLaunch": {
    "weaponId": "InterceptorLaunch",
    "effectId": null,
    "attackDamage": 0,
    "attacks": 0,
    "attackPeriod": 0.35714285714285715,
    "attackRange": 8,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "JavelinMissileLaunchers": {
    "weaponId": "JavelinMissileLaunchers",
    "effectId": "JavelinMissileLaunchersDamage",
    "attackDamage": 6,
    "attacks": 4,
    "attackPeriod": 2.142857142857143,
    "attackRange": 10,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Light",
        "amount": 6
      }
    ],
    "shieldBonus": 0,
    "splash": [
      {
        "radius": 0.5,
        "fraction": 1,
        "arc": 360
      }
    ]
  },
  "AcidSpines": {
    "weaponId": "AcidSpines",
    "effectId": "AcidSpines",
    "attackDamage": 9,
    "attacks": 1,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 7,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "Talons": {
    "weaponId": "Talons",
    "effectId": "Talons",
    "attackDamage": 4,
    "attacks": 2,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 3,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "InterceptorBeam": {
    "weaponId": "InterceptorBeam",
    "effectId": "InterceptorBeamDamage",
    "attackDamage": 5,
    "attacks": 2,
    "attackPeriod": 2.142857142857143,
    "attackRange": 2,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "HellionTank": {
    "weaponId": "HellionTank",
    "effectId": "HellionTankDamage",
    "attackDamage": 18,
    "attacks": 1,
    "attackPeriod": 1.4285714285714286,
    "attackRange": 2,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  },
  "TwinGatlingCannon": {
    "weaponId": "TwinGatlingCannon",
    "effectId": "TwinGatlingCannons",
    "attackDamage": 12,
    "attacks": 1,
    "attackPeriod": 0.7142857142857143,
    "attackRange": 6,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Mechanical",
        "amount": 8
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "LurkerMP": {
    "weaponId": "LurkerMP",
    "effectId": "LurkerMPDamage",
    "attackDamage": 20,
    "attacks": 1,
    "attackPeriod": 1.4285714285714286,
    "attackRange": 8,
    "minimumRange": 0,
    "targetType": "ground",
    "damagePoint": 0,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 10
      }
    ],
    "shieldBonus": 0,
    "splash": []
  },
  "LanceMissileLaunchers": {
    "weaponId": "LanceMissileLaunchers",
    "effectId": "LanceMissileLaunchersDamage",
    "attackDamage": 25,
    "attacks": 1,
    "attackPeriod": 0.9142857142857144,
    "attackRange": 11,
    "minimumRange": 0,
    "targetType": "air",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [
      {
        "attribute": "Massive",
        "amount": 10
      }
    ],
    "shieldBonus": 0,
    "splash": []
  }
};
export const SOURCE_UNIT_WEAPON_IDS={
  "reaper": [
    "P38ScytheGuassPistol"
  ],
  "thor": [
    "JavelinMissileLaunchers",
    "ThorsHammer"
  ],
  "viking": [
    "LanzerTorpedoes"
  ],
  "banshee": [
    "BacklashRockets"
  ],
  "queen": [
    "AcidSpines",
    "Talons",
    "TalonsMissile"
  ],
  "lurker": [],
  "mutalisk": [
    "GlaiveWurm"
  ],
  "corruptor": [
    "ParasiteSpore"
  ],
  "ultralisk": [
    "KaiserBlades"
  ],
  "zealot": [
    "PsiBlades"
  ],
  "adept": [
    "Adept"
  ],
  "stalker": [
    "ParticleDisruptors"
  ],
  "sentry": [
    "DisruptionBeam"
  ],
  "immortal": [
    "PhaseDisruptors"
  ],
  "colossus": [
    "ThermalLances"
  ],
  "high_templar": [
    "HighTemplarWeapon"
  ],
  "phoenix": [
    "IonCannons"
  ],
  "void_ray": [
    "VoidRaySwarm"
  ],
  "carrier": [
    "InterceptorLaunch"
  ]
} as const;
/** Weapons retain their own range and target filters; a dual-plane victim is eligible for either weapon. */
const sourceWeaponLists=new Map<string,readonly SourceWeapon[]>();
export function sourceWeaponsForUnit(family:VerifiedAddedUnitType,mode?:keyof typeof SOURCE_UNIT_MODES):readonly SourceWeapon[]{
 const selected=mode&&mode in SOURCE_UNIT_MODES?mode:undefined,key=family+'/'+(selected??''),cached=sourceWeaponLists.get(key);if(cached)return cached;
 let result:readonly SourceWeapon[];if(selected){const raw=SOURCE_UNIT_MODES[selected].weapon,weapon:SourceWeapon={...raw,bonusDamage:[...raw.bonusDamage],splash:[...raw.splash]};result=selected==='thor_high_impact'?[SOURCE_WEAPONS.ThorsHammer,weapon]:[weapon];}
 else result=SOURCE_UNIT_WEAPON_IDS[family].map(id=>SOURCE_WEAPONS[id]);sourceWeaponLists.set(key,result);return result;
}
export const SOURCE_MOVEMENT={
  "CliffJumper": {
    "sourceMoverId": "CliffJumper",
    "pathMode": "Jumper",
    "heightMap": "Ground",
    "restoreSeconds": 0.17857142857142858
  },
  "Colossus": {
    "sourceMoverId": "Colossus",
    "pathMode": "Scaler",
    "heightMap": "Glide",
    "restoreSeconds": 0.17857142857142858
  }
} as const;
export const SOURCE_WEAPON_PATTERNS={
  "baneling": {
    "sourceIds": [
      "VolatileBurstU",
      "VolatileBurstU2"
    ],
    "structureEffectId": "VolatileBurstU2",
    "structureDamage": 80,
    "structureArmorReduction": 0
  },
  "hellbat": {
    "sourceIds": [
      "HellionTank",
      "HellionTankSearch",
      "HellionTankDamage"
    ],
    "radius": 2,
    "arcDegrees": 45,
    "impactLocation": "SourceUnit",
    "extendByUnitRadius": true,
    "offsetByUnitRadius": true,
    "excludePrimary": true
  },
  "thorExplosive": {
    "sourceIds": [
      "JavelinMissileLaunchersPersistent",
      "JavelinMissileLaunchersDamage"
    ],
    "shots": 4,
    "periodSeconds": [
      0,
      0.08928571428571429,
      0.17857142857142858,
      0.08928571428571429
    ],
    "bands": [
      {
        "radius": 0.5,
        "fraction": 1,
        "arc": 360
      }
    ],
    "targetPlanes": [
      "air"
    ],
    "impactLocation": "TargetUnitOrPoint",
    "excludePrimary": true
  },
  "ultralisk": {
    "sourceIds": [
      "KaiserBlades",
      "KaiserBladesDamage"
    ],
    "bands": [
      {
        "radius": 2,
        "fraction": 0.33,
        "arc": 45
      },
      {
        "radius": 2,
        "fraction": 0.33,
        "arc": 180
      }
    ],
    "targetPlanes": [
      "ground"
    ],
    "impactLocation": "TargetUnitOrPoint",
    "offsetByUnitRadius": true,
    "excludePrimary": true
  },
  "mutalisk": {
    "sourceIds": [
      "GlaiveWurmU1",
      "GlaiveWurmU2",
      "GlaiveWurmU3",
      "GlaiveWurmE1",
      "GlaiveWurmE2"
    ],
    "damage": [
      9,
      3,
      1
    ],
    "bounceRadius": 3,
    "maxTargets": 3,
    "repeatTarget": false
  },
  "lurker": {
    "sourceIds": [
      "LurkerMP",
      "LurkerMPSearch",
      "LurkerMPDamage"
    ],
    "offsets": [
      [
        0,
        -1,
        0
      ],
      [
        0,
        -2,
        0
      ],
      [
        0,
        -3,
        0
      ],
      [
        0,
        -4,
        0
      ],
      [
        0,
        -5,
        0
      ],
      [
        0,
        -6,
        0
      ],
      [
        0,
        -7,
        0
      ],
      [
        0,
        -8,
        0
      ],
      [
        0,
        -9,
        0
      ]
    ],
    "searchRadius": 0.5,
    "periodSeconds": [
      0,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429,
      0.08928571428571429
    ],
    "weaponRange": 8,
    "damagePerHit": 20,
    "bonusDamage": [
      {
        "attribute": "Armored",
        "amount": 10
      }
    ]
  },
  "colossus": {
    "sourceIds": [
      "ThermalLancesForward",
      "ThermalLancesReverse",
      "ThermalLancesE",
      "ThermalLancesMU"
    ],
    "forwardOffsets": [
      [
        -1.25,
        0,
        0
      ],
      [
        -1,
        0,
        0
      ],
      [
        -0.75,
        0,
        0
      ],
      [
        -0.5,
        0,
        0
      ],
      [
        -0.25,
        0,
        0
      ],
      [
        0,
        0,
        0
      ],
      [
        0.25,
        0,
        0
      ],
      [
        0.5,
        0,
        0
      ],
      [
        0.75,
        0,
        0
      ],
      [
        1,
        0,
        0
      ],
      [
        1.25,
        0,
        0
      ]
    ],
    "reverseOffsets": [
      [
        1.25,
        0,
        0
      ],
      [
        1,
        0,
        0
      ],
      [
        0.75,
        0,
        0
      ],
      [
        0.5,
        0,
        0
      ],
      [
        0.25,
        0,
        0
      ],
      [
        0,
        0,
        0
      ],
      [
        -0.25,
        0,
        0
      ],
      [
        -0.5,
        0,
        0
      ],
      [
        -0.75,
        0,
        0
      ],
      [
        -1,
        0,
        0
      ],
      [
        -1.25,
        0,
        0
      ]
    ],
    "searchRadius": 0.15,
    "stepSeconds": 0.016214285714285716,
    "damagePerBeam": 10,
    "bonusDamagePerBeam": [
      {
        "attribute": "Light",
        "amount": 5
      }
    ],
    "uniqueTargetPerBeam": true
  },
  "voidRay": {
    "sourceIds": [
      "VoidRaySwarm",
      "VoidRaySwarmDamage",
      "VoidRayWeaponABTarget"
    ],
    "baseDamage": 6,
    "armoredBonus": 4,
    "beamSearchSeconds": 0.044642857142857144,
    "damageCooldownSeconds": 0.35714285714285715,
    "hasAutomaticDamageRamp": false,
    "manualAlignment": {
      "sourceIds": [
        "VoidRaySwarmDamageBoost"
      ],
      "armoredDamageAdd": 6,
      "duration": 14.285714285714286,
      "movementMultiplier": 0.75,
      "cooldown": 42.85714285714286
    }
  }
} as const;
export const SOURCE_INTERCEPTOR={
  "sourceUnitId": "Interceptor",
  "maxHp": 40,
  "maxShields": 40,
  "armor": 0,
  "shieldArmor": 0,
  "shieldRegenPerSecond": 2.8,
  "shieldRegenDelay": 7.142857142857143,
  "movementSpeed": 10.5,
  "unitRadius": 0.25,
  "attributes": [
    "Light",
    "Mechanical"
  ],
  "flying": true,
  "targetPlanes": [
    "air"
  ],
  "weapon": {
    "weaponId": "InterceptorBeam",
    "effectId": "InterceptorBeamDamage",
    "attackDamage": 5,
    "attacks": 2,
    "attackPeriod": 2.142857142857143,
    "attackRange": 2,
    "minimumRange": 0,
    "targetType": "both",
    "damagePoint": 0.1192857142857143,
    "bonusDamage": [],
    "shieldBonus": 0,
    "splash": []
  }
} as const;
export const SOURCE_ABILITIES={
  "bansheeCloak": {
    "sourceIds": [
      "BansheeCloak"
    ],
    "startEnergy": 25,
    "energyDrainPerSecond": 2.0671,
    "normalRegenPerSecond": 0.7875
  },
  "transfusion": {
    "sourceIds": [
      "Transfusion",
      "TransfusionHealTick"
    ],
    "energy": 50,
    "range": 7,
    "cooldown": 0.7142857142857143,
    "instantHealing": 75,
    "tickHealing": 0.3125,
    "tickPeriod": 0.044642857142857144,
    "duration": 7.142857142857143
  },
  "guardianShield": {
    "sourceIds": [
      "GuardianShield",
      "GuardianShieldPersistent",
      "GuardianShieldSearch"
    ],
    "energy": 75,
    "cooldown": 12.857142857142858,
    "radius": 4.5,
    "duration": 12.857142857142858,
    "rangedDamageReduction": 2
  },
  "psiStorm": {
    "sourceIds": [
      "PsiStorm",
      "PsiStormPersistent",
      "PsiStormDamage"
    ],
    "energy": 75,
    "cooldown": 1.4285714285714286,
    "range": 8,
    "radius": 2,
    "searchPeriods": 14,
    "searchPeriod": 0.4000000000000001,
    "damagePerTick": 6.85,
    "damagePeriod": 0.4000000000000001,
    "targetBehaviorDuration": 0.46821428571428575
  },
  "blink": {
    "sourceIds": [
      "Blink"
    ],
    "range": 8,
    "cooldown": 7.142857142857143
  },
  "charge": {
    "sourceIds": [
      "Charge",
      "Charging",
      "ChargeMinTriggerDistance",
      "ChargeMaxDistance"
    ],
    "minTriggerDistance": 0.6,
    "maxTriggerDistance": 4,
    "duration": 2.5,
    "speedMultiplier": 2.2,
    "cooldown": 7.142857142857143
  },
  "immortalBarrier": {
    "sourceIds": [
      "ImmortalOverload",
      "BarrierDamageResponse"
    ],
    "absorption": 100,
    "duration": 0,
    "cooldown": 32.142857142857146
  },
  "carrierHangar": {
    "sourceIds": [
      "CarrierHangar",
      "Interceptor"
    ],
    "initialCount": 4,
    "maxCount": 8,
    "replacementSeconds": 8.571428571428571,
    "mineralCost": 15,
    "maxHp": 40,
    "maxShields": 40
  },
  "transformations": {
    "hellbat": {
      "seconds": 2.857142857142857,
      "randomDelayMax": 0.17857142857142858
    },
    "hellion": {
      "seconds": 2.857142857142857,
      "randomDelayMax": 0.17857142857142858
    },
    "vikingAssault": {
      "seconds": 1.6714285714285715,
      "randomDelayMax": 0.35714285714285715
    },
    "vikingFighter": {
      "seconds": 1.6664285714285716,
      "randomDelayMax": 0.35714285714285715
    },
    "thorHighImpact": {
      "seconds": 1.7857142857142858,
      "randomDelayMax": 0.17857142857142858
    },
    "thorExplosive": {
      "seconds": 1.7857142857142858,
      "randomDelayMax": 0.17857142857142858
    },
    "lurkerBurrow": {
      "seconds": 1.7857142857142858,
      "randomDelayMax": 0.17857142857142858
    },
    "lurkerUnburrow": {
      "seconds": 0.44642857142857145,
      "randomDelayMax": 0.17857142857142858
    }
  }
} as const;
export const SOURCE_UNIT_MODES={
  "hellbat": {
    "sourceUnitId": "HellionTank",
    "maxHp": 135,
    "armor": 0,
    "movementSpeed": 3.15,
    "unitRadius": 0.625,
    "flying": false,
    "attributes": [
      "Light",
      "Mechanical",
      "Biological"
    ],
    "weapon": {
      "weaponId": "HellionTank",
      "effectId": "HellionTankDamage",
      "attackDamage": 18,
      "attacks": 1,
      "attackPeriod": 1.4285714285714286,
      "attackRange": 2,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "viking_assault": {
    "sourceUnitId": "VikingAssault",
    "maxHp": 135,
    "armor": 0,
    "movementSpeed": 3.15,
    "unitRadius": 0.75,
    "flying": false,
    "attributes": [
      "Armored",
      "Mechanical"
    ],
    "weapon": {
      "weaponId": "TwinGatlingCannon",
      "effectId": "TwinGatlingCannons",
      "attackDamage": 12,
      "attacks": 1,
      "attackPeriod": 0.7142857142857143,
      "attackRange": 6,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Mechanical",
          "amount": 8
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "lurker_burrowed": {
    "sourceUnitId": "LurkerMPBurrowed",
    "maxHp": 190,
    "armor": 1,
    "movementSpeed": 0,
    "unitRadius": 0.75,
    "flying": false,
    "attributes": [
      "Armored",
      "Biological"
    ],
    "weapon": {
      "weaponId": "LurkerMP",
      "effectId": "LurkerMPDamage",
      "attackDamage": 20,
      "attacks": 1,
      "attackPeriod": 1.4285714285714286,
      "attackRange": 8,
      "minimumRange": 0,
      "targetType": "ground",
      "damagePoint": 0,
      "bonusDamage": [
        {
          "attribute": "Armored",
          "amount": 10
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  },
  "thor_high_impact": {
    "sourceUnitId": "ThorAP",
    "maxHp": 400,
    "armor": 1,
    "movementSpeed": 2.625,
    "unitRadius": 1,
    "flying": false,
    "attributes": [
      "Armored",
      "Mechanical",
      "Massive"
    ],
    "weapon": {
      "weaponId": "LanceMissileLaunchers",
      "effectId": "LanceMissileLaunchersDamage",
      "attackDamage": 25,
      "attacks": 1,
      "attackPeriod": 0.9142857142857144,
      "attackRange": 11,
      "minimumRange": 0,
      "targetType": "air",
      "damagePoint": 0.1192857142857143,
      "bonusDamage": [
        {
          "attribute": "Massive",
          "amount": 10
        }
      ],
      "shieldBonus": 0,
      "splash": []
    }
  }
} as const;
export const SOURCE_UNIT_DETAILS={
  "marine": {
    "xmlId": "Marine",
    "layers": [
      "liberty",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 45,
    "armor": 0,
    "speed": 2.25,
    "radius": 0.375,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "50"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "GuassRifle"
    ],
    "mover": "Ground"
  },
  "marauder": {
    "xmlId": "Marauder",
    "layers": [
      "liberty",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 125,
    "armor": 1,
    "speed": 2.25,
    "radius": 0.5625,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "100",
      "Vespene": "25"
    },
    "attributes": {
      "Armored": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "PunisherGrenades"
    ],
    "mover": "Ground"
  },
  "reaper": {
    "xmlId": "Reaper",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 60,
    "armor": 0,
    "speed": 3.75,
    "radius": 0.375,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 2,
    "lifeDelay": 10,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "50",
      "Vespene": "50"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "P38ScytheGuassPistol"
    ],
    "mover": "CliffJumper"
  },
  "hellion": {
    "xmlId": "Hellion",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 90,
    "armor": 0,
    "speed": 4.25,
    "radius": 0.625,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "100"
    },
    "attributes": {
      "Light": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "InfernalFlameThrower"
    ],
    "mover": "Ground"
  },
  "tank": {
    "xmlId": "SiegeTank",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 175,
    "armor": 1,
    "speed": 2.25,
    "radius": 0.875,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "150",
      "Vespene": "125"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "90mmCannons",
      "90mmCannonsFake",
      "90mmCannonsFake"
    ],
    "mover": "Ground"
  },
  "thor": {
    "xmlId": "Thor",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 400,
    "armor": 1,
    "speed": 1.875,
    "radius": 1,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "300",
      "Vespene": "200"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1",
      "Massive": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "JavelinMissileLaunchers",
      "ThorsHammer"
    ],
    "mover": "Ground"
  },
  "viking": {
    "xmlId": "VikingFighter",
    "layers": [
      "liberty",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 135,
    "armor": 0,
    "speed": 2.75,
    "radius": 0.75,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "125",
      "Vespene": "75"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "LanzerTorpedoes"
    ],
    "mover": "Fly"
  },
  "banshee": {
    "xmlId": "Banshee",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 140,
    "armor": 0,
    "speed": 2.75,
    "radius": 0.75,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 50,
    "energyRegen": 0.5625,
    "creep": 1,
    "cost": {
      "Minerals": "150",
      "Vespene": "100"
    },
    "attributes": {
      "Light": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "BacklashRockets"
    ],
    "mover": "Fly"
  },
  "medivac": {
    "xmlId": "Medivac",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 150,
    "armor": 1,
    "speed": 2.5,
    "radius": 0.75,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 50,
    "energyRegen": 0.5625,
    "creep": 1,
    "cost": {
      "Minerals": "100",
      "Vespene": "100"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [],
    "mover": "Fly"
  },
  "science_vessel": null,
  "zergling": {
    "xmlId": "Zergling",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 35,
    "armor": 0,
    "speed": 2.9531,
    "radius": 0.375,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "25"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "Claws"
    ],
    "mover": "Ground"
  },
  "baneling": {
    "xmlId": "Baneling",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 30,
    "armor": 0,
    "speed": 2.5,
    "radius": 0.375,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "50",
      "Vespene": "25"
    },
    "attributes": {
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "VolatileBurst",
      "VolatileBurstBuilding",
      "VolatileBurstBuilding"
    ],
    "mover": "Ground"
  },
  "roach": {
    "xmlId": "Roach",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 145,
    "armor": 1,
    "speed": 2.25,
    "radius": 0.5,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "75",
      "Vespene": "25"
    },
    "attributes": {
      "Armored": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "RoachMelee",
      "AcidSaliva"
    ],
    "mover": "Ground"
  },
  "ravager": {
    "xmlId": "Ravager",
    "layers": [
      "liberty",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 120,
    "armor": 1,
    "speed": 2.75,
    "radius": 0.75,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "100",
      "Vespene": "100"
    },
    "attributes": {
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "RavagerWeapon"
    ],
    "mover": "Ground"
  },
  "hydralisk": {
    "xmlId": "Hydralisk",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 90,
    "armor": 0,
    "speed": 2.25,
    "radius": 0.625,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "100",
      "Vespene": "50"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "HydraliskMelee",
      "NeedleSpines"
    ],
    "mover": "Ground"
  },
  "queen": {
    "xmlId": "Queen",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 175,
    "armor": 1,
    "speed": 0.9375,
    "radius": 0.875,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 25,
    "energyRegen": 0.5625,
    "creep": 2.6665,
    "cost": {
      "Minerals": "175"
    },
    "attributes": {
      "Biological": "1",
      "Psionic": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "AcidSpines",
      "Talons",
      "TalonsMissile"
    ],
    "mover": "Ground"
  },
  "lurker": {
    "xmlId": "LurkerMP",
    "layers": [
      "liberty",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 190,
    "armor": 1,
    "speed": 2.9531,
    "radius": 0.9375,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "150",
      "Vespene": "150"
    },
    "attributes": {
      "Armored": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [],
    "mover": "Ground"
  },
  "mutalisk": {
    "xmlId": "Mutalisk",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 120,
    "armor": 0,
    "speed": 4,
    "radius": 0.5,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 1,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "100",
      "Vespene": "100"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "GlaiveWurm"
    ],
    "mover": "Fly"
  },
  "corruptor": {
    "xmlId": "Corruptor",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 200,
    "armor": 2,
    "speed": 3.375,
    "radius": 0.625,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "150",
      "Vespene": "100"
    },
    "attributes": {
      "Armored": "1",
      "Biological": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "ParasiteSpore"
    ],
    "mover": "Fly"
  },
  "ultralisk": {
    "xmlId": "Ultralisk",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 500,
    "armor": 2,
    "speed": 2.9531,
    "radius": 1,
    "shields": 0,
    "shieldArmor": 0,
    "shieldRegen": 0,
    "shieldDelay": 0,
    "lifeRegen": 0.2734,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1.3,
    "cost": {
      "Minerals": "275",
      "Vespene": "200"
    },
    "attributes": {
      "Armored": "1",
      "Biological": "1",
      "Massive": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "KaiserBlades"
    ],
    "mover": "Ground"
  },
  "zealot": {
    "xmlId": "Zealot",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 100,
    "armor": 1,
    "speed": 2.25,
    "radius": 0.5,
    "shields": 50,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "100"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "PsiBlades"
    ],
    "mover": "Ground"
  },
  "adept": {
    "xmlId": "Adept",
    "layers": [
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 70,
    "armor": 1,
    "speed": 2.5,
    "radius": 0.5,
    "shields": 70,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "100",
      "Vespene": "25"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "Adept"
    ],
    "mover": "Ground"
  },
  "stalker": {
    "xmlId": "Stalker",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 80,
    "armor": 1,
    "speed": 2.9531,
    "radius": 0.625,
    "shields": 80,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "125",
      "Vespene": "50"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "ParticleDisruptors"
    ],
    "mover": "Ground"
  },
  "sentry": {
    "xmlId": "Sentry",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 40,
    "armor": 1,
    "speed": 2.5,
    "radius": 0.5,
    "shields": 40,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 50,
    "energyRegen": 0.5625,
    "creep": 1,
    "cost": {
      "Minerals": "50",
      "Vespene": "100"
    },
    "attributes": {
      "Light": "0",
      "Mechanical": "1",
      "Psionic": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "DisruptionBeam"
    ],
    "mover": "Ground"
  },
  "immortal": {
    "xmlId": "Immortal",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 200,
    "armor": 1,
    "speed": 2.25,
    "radius": 0.75,
    "shields": 100,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "275",
      "Vespene": "100"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "PhaseDisruptors"
    ],
    "mover": "Ground"
  },
  "colossus": {
    "xmlId": "Colossus",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 250,
    "armor": 1,
    "speed": 2.25,
    "radius": 1,
    "shields": 100,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "300",
      "Vespene": "200"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1",
      "Massive": "1"
    },
    "planes": {
      "Ground": "1",
      "Air": "1"
    },
    "weapons": [
      "ThermalLances"
    ],
    "mover": "Colossus"
  },
  "high_templar": {
    "xmlId": "HighTemplar",
    "layers": [
      "liberty",
      "swarm",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 40,
    "armor": 0,
    "speed": 2.0156,
    "radius": 0.375,
    "shields": 40,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 50,
    "energyRegen": 0.5625,
    "creep": 1,
    "cost": {
      "Minerals": "50",
      "Vespene": "150"
    },
    "attributes": {
      "Light": "1",
      "Biological": "1",
      "Psionic": "1"
    },
    "planes": {
      "Ground": "1"
    },
    "weapons": [
      "HighTemplarWeapon",
      "HighTemplarWeapon"
    ],
    "mover": "Ground"
  },
  "phoenix": {
    "xmlId": "Phoenix",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 120,
    "armor": 0,
    "speed": 4.25,
    "radius": 0.75,
    "shields": 60,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 200,
    "energyStart": 50,
    "energyRegen": 0.5625,
    "creep": 1,
    "cost": {
      "Minerals": "150",
      "Vespene": "100"
    },
    "attributes": {
      "Light": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "IonCannons"
    ],
    "mover": "Fly"
  },
  "void_ray": {
    "xmlId": "VoidRay",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 150,
    "armor": 0,
    "speed": 2.75,
    "radius": 1,
    "shields": 100,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "200",
      "Vespene": "150"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "VoidRaySwarm"
    ],
    "mover": "Fly"
  },
  "carrier": {
    "xmlId": "Carrier",
    "layers": [
      "liberty",
      "swarm",
      "void",
      "voidmulti",
      "balancemulti"
    ],
    "hp": 300,
    "armor": 2,
    "speed": 1.875,
    "radius": 1.25,
    "shields": 150,
    "shieldArmor": 0,
    "shieldRegen": 2,
    "shieldDelay": 10,
    "lifeRegen": 0,
    "lifeDelay": 0,
    "energy": 0,
    "energyStart": 0,
    "energyRegen": 0,
    "creep": 1,
    "cost": {
      "Minerals": "350",
      "Vespene": "250"
    },
    "attributes": {
      "Armored": "1",
      "Mechanical": "1",
      "Massive": "1"
    },
    "planes": {
      "Air": "1"
    },
    "weapons": [
      "InterceptorLaunch"
    ],
    "mover": "Fly"
  }
} as const;
export const EXPANSION_DATA_BLOCKERS={science_vessel:"No ScienceVessel combat CUnit/production/heal ability in the pinned multiplayer cache; a gluescreen dummy is not a valid substitute."} as const;
