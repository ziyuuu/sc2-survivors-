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

`src/data/game.ts` fixes the user-confirmed opening to one Rank-1 Marine. The earlier V3 default of four Marines, one Hellion, one Tank and one Medivac was an implementation mistake, corrected after user review; it was not an approved starting roster. This file separately owns experimental resources, finite steering, anchor speed, leash, ranks, waves, pickup yields and pod HP/armor. Player cap remains 5 per type, 20 total; larger test squads must use explicit overrides and a 25-friendly performance scenario is diagnostic only.

The currently shipped baseline uses paid remote production with construction clocks and omits workers, supply and tech labs. The newer user-confirmed design in [DESIGN.md](DESIGN.md) adds automatic building production, rescued SCV gathering bonuses and high-yield enemy Drones. These changes are not yet in the shipped runtime. Basic siege is available from start as in LotV; Siege Logistics is an experimental morph-time upgrade. Rank HP/damage, stage speed modifiers and Medivac energy upgrade are experimental.

The user explicitly revised early progression: a solo Marine must face manageable encounters, with pressure increasing as the squad develops. This supersedes the original blanket 20–40-Zergling rescue minimum for early squads. Stage 1 now has one Zergling at 12 seconds and one at 38 seconds; Stage 2 starts after 10 seconds, then every 12 seconds. Stages remain 60 seconds.

Experimental encounter power in `ENCOUNTERS`: Marine 1, Hellion 2, Tank 3, Medivac .25. Combat units multiply this by their current weapon damage / base weapon damage, so ranks and weapon upgrades count. This is a Survivors pacing heuristic, not a claim that these units have that exact relative strength in SC2. Ambient wave count is capped by floor(power × 1.5), at least one, and by the stage's configured maximum. Stage 2 alternates sides even when the wave budget is one. Enemy mix rotates between waves so low budgets do not permanently suppress Roach/Baneling/Ravager introductions.

Rescue Zergling count is floor(power × (2 + .1 × max(0, stage − 4))), clamped to 2–40. Roaches enter from Stage 4 at power 4 / 8; Banelings from Stage 6 at power 6 / 12; Ravagers from Stage 10 at power 8 / 16. Each threshold adds one of that unit. One Rank-1 Marine therefore starts against two Zerglings; a developed squad can face 40 Zerglings plus two of each other type. Composition is fixed at landing and does not shrink after friendly deaths. These numbers need continued playtesting.

The shipped baseline still has a 30-second deadline, but the user has explicitly CANCELLED it for the next implementation. The confirmed rescue rule is threat clearance while the pod survives; failure occurs only when pod HP reaches zero, without a refund. Paid production remains automatic under the new design. See [the numeric research](BALANCE_12_STAGES.md) for proposed early Zergling HP, pod durability, stage income and wave budgets; none changes the locked SC2 base values above.

Weapon backswing is shortened for stop → fire → move; damage point and weapon period stay separate. Siege timings omit client random delay. Bile uses a fixed 2.5-second telegraph including experimental missile travel allowance. Siege splash is approximate and retains friendly fire. Vision, creep, burrowing and full projectile ballistics are not simulated. Font files are never downloaded or packaged.
