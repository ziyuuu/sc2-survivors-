/** Generated from an explicitly separate original campaign profile, not the 5.0.15 multiplayer table. */
import type {ExpansionUnitData,SourceProductionRecipe} from './expansion-units';
export const SCIENCE_VESSEL_SOURCE={
  "profile": "Liberty campaign + LibertyStory production; no StarCoop modifiers",
  "version": "5.0.16.97563",
  "buildConfig": "5bc8dcc1fade3a320c12936586b7c0ed",
  "clock": "Normal durations / 1.4; rates * 1.4",
  "files": {
    "unit": {
      "file": ".cache/sc2-campaign-data/liberty-unitdata.xml",
      "sha256": "52026354da439891b67b4767f3caa7adb21088382aa61f167ac30f692574b963"
    },
    "ability": {
      "file": ".cache/sc2-campaign-data/liberty-abildata.xml",
      "sha256": "4c4020f5bbd1bd02cc88df5be7946e045626869967fd120631fd04032471f746"
    },
    "effect": {
      "file": ".cache/sc2-campaign-data/liberty-effectdata.xml",
      "sha256": "6e0739ef81bf313f0bbe42d6d1b8b029a45753ad4892cf39fbeb2fc6442159f4"
    },
    "train": {
      "file": ".cache/sc2-campaign-data/libertystory-abildata.xml",
      "sha256": "0241cbd3ad314be4b59e4415b710bef70444cf4a16647d7338e5cc850bc32814"
    }
  }
} as const;
export const CAMPAIGN_SCIENCE_VESSEL:ExpansionUnitData={
  "name": "Science Vessel",
  "zh": "科技球",
  "maxHp": 200,
  "armor": 1,
  "movementSpeed": 2.8,
  "attackDamage": 0,
  "attacks": 0,
  "attackPeriod": 1,
  "attackRange": 0,
  "targetType": "none",
  "splash": [],
  "bonusDamage": [],
  "attributes": [
    "Light",
    "Mechanical"
  ],
  "productionTime": 42.85714285714286,
  "mineralCost": 100,
  "gasCost": 200,
  "unitRadius": 0.625,
  "flying": true,
  "damagePoint": 0,
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
  "sourceUnitId": "ScienceVessel",
  "primaryWeapon": null
};
export const CAMPAIGN_SCIENCE_VESSEL_RECIPE:SourceProductionRecipe={
  "abilityId": "StarportTrain",
  "entryId": "Train7",
  "baseFamily": null,
  "mineralCost": 100,
  "gasCost": 200,
  "productionTime": 42.85714285714286,
  "baseSeconds": 42.85714285714286,
  "morphSeconds": 0,
  "batchBodyCount": 1
};
export const SCIENCE_VESSEL_REPAIR={
  "sourceAbilityId": "NanoRepair",
  "sourceEffectId": "NanoRepair",
  "range": 4,
  "hpPerSecond": 12.6,
  "energyPerHp": 0.33
} as const;
/** USER_CONFIRMED adaptation: only repair is inherited. Biology is repaired at 1/3 output, with energy charged per actual restored HP; passive Detector11 and Irradiate are excluded. */
export const SCIENCE_VESSEL_ADAPTATION={mechanicalRecoveryMultiplier:1,biologicalRecoveryMultiplier:1/3,excludeSelf:true,excludeStructures:true,passiveDetector:false,irradiate:false} as const;
