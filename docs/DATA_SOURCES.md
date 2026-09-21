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

## Explicit Survivors adaptations (current runtime)

The locked SC2 table above is unchanged. src/data/stages.ts and src/data/economy.ts separately own the approved two-difficulty Survivors tuning: 120/240/360-second rounds, first-stage five timed individual Zerglings, early Ling HP 18/24/30, fixed stage budgets, no army-strength scaling, and no pod timeout. SCV eggs alone expire after 30 seconds.

Start one Marine, one completed Barracks and 50/0 resources. Every building independently pays for production; completed orders create pods. Passive income, SCVs, Drone drops, stage rewards and paid discounted cards use the same World in both builds. No supply or tech lab system is added. Factory and Starport cards can enter the pool after stage 2; they are neither guaranteed nor affordability-filtered.

Finite turns and radius-based ranges, rank HP/damage, map expansion, stage speed modifiers, Siege Logistics and the Medivac energy upgrade are gameplay adaptations. The stage-12 nest is an original hatchery model with experimental HP 9000 Easy / 12000 Normal, armor 2; these are not original SC2 Hive stats. Destroying it is necessary but does not finish the round early.

Ambient waves now enter along a spread approach arc and are staggered by .3 seconds early, .8 seconds in stages 4–5, .35 seconds later. This changes the arrival shape, not the table's budget. Guards still appear together at landing. Deferred actors remain owed if the live ambient population reaches 300.

[Current measurements](BALANCE_12_STAGES.md) distinguish isolated unit duels, scripted attempts, phase fixtures and browser checks. No installed SC2 client match was simulated. The historical reports/balance/study.json used the older hypothetical economy and is not current gameplay evidence.
