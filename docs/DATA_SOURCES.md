# Fixed game data profile

SC2 **Legacy of the Void 5.0.15**, exported XML snapshot
[Joshua-Leibold/SC2Data at fbbd6429b1eb6978c78a092dc68ba09029d03171](https://github.com/Joshua-Leibold/SC2Data/tree/fbbd6429b1eb6978c78a092dc68ba09029d03171).
The source README identifies 5.0.15 (2025-10-08). This is a community-hosted Blizzard data export, not independent verification against an installed live client.

`node tools/fetch-data-source.mjs` downloaded unit, weapon, effect, ability and behavior XML. Local cache only. Selected inheritance: Core → Liberty → Swarm → Void → VoidMulti → BalanceMulti. LibertyMulti and SwarmMulti were inspected for context, not applied as additional legacy multiplayer balance layers.

Sources: CUnit LifeMax/LifeArmor/Speed/CostResource/Attributes; CWeaponLegacy Range/Period/DamagePoint; CEffectDamage Amount/AttributeBonus/AreaArray; CAbilTrain InfoArray Time; MedivacHeal RechargeVitalRate/DrainVitalCostFactor; SiegeMode/Unsiege morph sections; RavagerCorrosiveBile effects. Normal XML seconds convert to Faster time: durations / 1.4, movement/regen/healing rates × 1.4. Ranges/HP/damage/costs unchanged.

| Unit | HP / armor | Speed | Damage | Period | Range | Minerals / gas |
|---|---|---|---|---|---|---|
| Marine | 45 / 0 | 3.15 | 6 | .61486 | 5 | 50 / 0 |
| Hellion | 90 / 0 | 5.95 | 8 + 6 light | 1.78571 | 5 | 100 / 0 |
| Tank | 175 / 1 | 3.15 | 15 + 10 armored | .74286 | 7 | 150 / 125 |
| Siege | same | 0 | 40 + 30 armored | 2.14286 | 2–13 | same |
| Medivac | 150 / 1 | 3.5 | continuous heal | — | heal 4 | 100 / 100 |
| Zergling | 35 / 0 | 4.13434 | 5 | .49714 | .1 | 25 / 0 per unit |
| Roach | 145 / 1 | 3.15 | 16 | 1.42857 | 4 | 75 / 25 |
| Baneling | 30 / 0 | 3.5 | 16 + 19 light | suicide | .25 | 50 / 25 total |
| Ravager | 120 / 1 | 3.85 | 16 | 1.14286 | 6 | 100 / 100 total |

Training: Marine 25/1.4, Hellion 30/1.4, Tank 45/1.4, Medivac 42/1.4. Zerg fields describe original pair/morph semantics; no player Zerg production exists. Medivac 12.6 HP/sec, .33 energy/HP, 50 initial/200 max energy, .7875 energy/sec regen. Baneling radius 2.2; tank splash 100/50/25% at .4687/.7812/1.25; Hellion line 6.5 with radius .15. Bile 60 damage, range 9, radius .5, cooldown 10/1.4.

## Explicit Survivors adaptations

`src/data/game.ts` separately owns experimental initial squad (4 Marines, 1 Hellion, 1 Tank, 1 Medivac), resources, finite steering, anchor speed, leash, ranks, waves, pickup yields and pod HP/armor. Player cap remains 5 per type, 20 total; a 25-friendly performance scenario is diagnostic only.

Buildings are paid remote production support, with construction clocks. Worker, supply and tech-lab systems are omitted. Basic siege is available from start as in LotV; Siege Logistics is an experimental morph-time upgrade. Rank HP/damage, stage speed modifiers and Medivac energy upgrade are experimental.

Rescue always spawns 20–40 Zerglings plus 2 Roaches and stage-appropriate Banelings/Ravagers. Guardians and nearby threats must die before expiry. A rescue spawns the recruit at the pod, or promotes the lowest rank when full.

Weapon backswing is shortened for stop → fire → move; damage point and weapon period stay separate. Siege timings omit client random delay. Bile uses a fixed 2.5-second telegraph including experimental missile travel allowance. Siege splash is approximate and retains friendly fire. Vision, creep, burrowing and full projectile ballistics are not simulated. Font files are never downloaded or packaged.
