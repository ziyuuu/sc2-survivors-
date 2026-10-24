# I03 全内容核验索引 · 2026-10-22

当前正式入口为旗舰配装。165 个旧天赋定义明确排除，不计为当前可达玩法；三族正式入口没有天赋分配入口且旧天赋值为零。详见 [入口回归](../../test/integration-i03-entry.test.ts)。

本表区分原生获取路径与受控效果验证。低概率来源使用原生权重、种子、资格和支付，不使用直接注入替代来源证明；效果测试可以控制时间、战场和资源。完整种子、报价、订单、随机状态与前后效果值见 [机器清单](../../reports/local/integration-i03-20261022/coverage-ledger.json)。自然出现频率、全战役难度、逐动作视听和真机输入不在本表冒称通过。

|目录|数量|证据|
|---|---:|---|
|equipmentTemplates|210|本清单对应目录|
|equipmentRaceTemplates|630|本清单对应目录|
|bindings|117|本清单对应目录|
|inheritance|59|本清单对应目录|
|effects|191|本清单对应目录|
|cards|563|本清单对应目录|
|directCardEffectMeasurements|310|本清单对应目录|
|developmentNodes|157|本清单对应目录|
|productionFamilies|30|本清单对应目录|
|heroes|18|本清单对应目录|
|elites|90|本清单对应目录|
|automaticEventCategories|34|本清单对应目录|
|mapAdmissions|40|本清单对应目录|

## 装备与继承

210 个模板逐模板验证合法品质／槽位／污染分支，并在三族各得到一次原生条件掉落样本；117 种绑定、59 个继承结果均有种子样本。

|模板|正概率来源|生效键|
|---|---|---|
|attribute.1|8 个槽位来源，3 个种族样本||
|attribute.2|8 个槽位来源，3 个种族样本||
|attribute.3|8 个槽位来源，3 个种族样本||
|attribute.4|8 个槽位来源，3 个种族样本||
|module.gathering.1|1 个槽位来源，3 个种族样本|opening_workers|
|module.logistics.1|1 个槽位来源，3 个种族样本|periodic_resources|
|module.control.1|1 个槽位来源，3 个种族样本|catch_up|
|module.support.1|1 个槽位来源，3 个种族样本|bombardment|
|module.workers.2|1 个槽位来源，3 个种族样本|opening_workers, worker_efficiency|
|module.pickup.2|1 个槽位来源，3 个种族样本|pickup_yield, pickup_radius|
|module.rescue.2|1 个槽位来源，3 个种族样本|worker_rescue|
|module.double_pickup.2|1 个槽位来源，3 个种族样本|pickup_double|
|module.supply.2|1 个槽位来源，3 个种族样本|periodic_resources, stage_resources|
|module.shop.2|1 个槽位来源，3 个种族样本|shop_refresh, free_product|
|module.purchase.2|1 个槽位来源，3 个种族样本|purchase_discount|
|module.refresh.2|1 个槽位来源，3 个种族样本|refresh_discount|
|module.formation.2|1 个槽位来源，3 个种族样本|catch_up, manual_cooldown|
|module.moving_fire.2|1 个槽位来源，3 个种族样本|moving_fire|
|module.split.2|1 个槽位来源，3 个种族样本|split|
|module.blade.2|1 个槽位来源，3 个种族样本|melee_range|
|module.telescope.2|1 个槽位来源，3 个种族样本|weapon_range|
|module.suppression.2|1 个槽位来源，3 个种族样本|bombardment|
|module.reinforcement.2|1 个槽位来源，3 个种族样本|reinforcement|
|module.egg.2|1 个槽位来源，3 个种族样本|egg_reinforcement|
|module.golden_egg.2|1 个槽位来源，3 个种族样本|bombardment|
|module.wind_serpent.2|1 个槽位来源，3 个种族样本|opening_hydralisk|
|set.training.2|8 个槽位来源，3 个种族样本|opening_rank|
|set.team.2|8 个槽位来源，3 个种族样本|opening_count|
|set.dogs.2|8 个槽位来源，3 个种族样本|opening_zerglings|
|set.traps.2|8 个槽位来源，3 个种族样本|periodic_trap|
|set.choice.2|8 个槽位来源，3 个种族样本|development_refresh|
|set.call.2|8 个槽位来源，3 个种族样本|opening_elite|
|set.blue.training.3|8 个槽位来源，3 个种族样本|opening_rank|
|set.blue.team.3|8 个槽位来源，3 个种族样本|opening_count, rescue_rank|
|set.blue.identity.3|8 个槽位来源，3 个种族样本|foreign_elites|
|set.blue.roaches.3|8 个槽位来源，3 个种族样本|opening_roaches|
|set.blue.bunker.3|8 个槽位来源，3 个种族样本|stage_bunker|
|set.blue.choice.3|8 个槽位来源，3 个种族样本|development_refresh|
|set.blue.drone_hunter.3|8 个槽位来源，3 个种族样本|drone_hunter|
|set.blue.bounty.3|8 个槽位来源，3 个种族样本|bounty|
|set.blue.overload.3|8 个槽位来源，3 个种族样本|overload|
|set.blue.hold.3|8 个槽位来源，3 个种族样本|hold|
|set.blue.pack.3|8 个槽位来源，3 个种族样本|opening_pack, pack_rank, pack_kill|
|set.blue.phantom.3|8 个槽位来源，3 个种族样本|stat.attackSpeed, phantom|
|set.blue.fleet.3|8 个槽位来源，3 个种族样本|opening_fleet, fleet_elite|
|set.blue.scorched.3|8 个槽位来源，3 个种族样本|periodic_trap, burn_area|
|set.blue.army.3|8 个槽位来源，3 个种族样本|direction.health, recruit_discount, capacity_members, direction_reinforcement|
|set.blue.soldier.3|8 个槽位来源，3 个种族样本|direction.attack, rank_discount, capacity_rank, kill_training|
|set.blue.elite.3|8 个槽位来源，3 个种族样本|bound.health, opening_elite_bound, bound.attack, opening_elite_rank, elite.health, elite.attack|
|set.blue.hero.3|8 个槽位来源，3 个种族样本|direction.attack, direction.health, opening_hero_proxy, opening_hero, replace_hero_proxy|
|set.blue.survivor.3|8 个槽位来源，3 个种族样本|ordinary.health, ordinary.reduction, rescue|
|set.blue.breakthrough.3|8 个槽位来源，3 个种族样本|stat.attack, stat.crit|
|set.blue.iron.3|8 个槽位来源，3 个种族样本|share_damage, armor_percent|
|set.blue.light.3|8 个槽位来源，3 个种族样本|stat.move, stat.attackSpeed|
|set.blue.precision.3|8 个槽位来源，3 个种族样本|stat.range, stat.crit, stat.critDamage|
|set.blue.wall.3|8 个槽位来源，3 个种族样本|stat.health, stat.defense, stat.reduction|
|set.blue.sustain.3|8 个槽位来源，3 个种族样本|stat.attack, stat.attackSpeed, stat.health|
|set.advanced.training.3|8 个槽位来源，3 个种族样本|opening_rank, training_evolution|
|set.advanced.training.4|8 个槽位来源，3 个种族样本|opening_rank, training_evolution|
|set.advanced.team.3|8 个槽位来源，3 个种族样本|opening_count, rescue_rank, volley|
|set.advanced.team.4|8 个槽位来源，3 个种族样本|opening_count, rescue_rank, volley|
|set.advanced.identity.3|8 个槽位来源，3 个种族样本|foreign_elites, foreign_elites_second|
|set.advanced.identity.4|8 个槽位来源，3 个种族样本|foreign_elites, foreign_elites_second|
|set.advanced.roaches.3|8 个槽位来源，3 个种族样本|opening_roaches, ravager_evolution|
|set.advanced.roaches.4|8 个槽位来源，3 个种族样本|opening_roaches, ravager_evolution|
|set.advanced.bunker.3|8 个槽位来源，3 个种族样本|stage_bunker, fortification|
|set.advanced.bunker.4|8 个槽位来源，3 个种族样本|stage_bunker, fortification|
|set.advanced.choice.3|8 个槽位来源，3 个种族样本|development_refresh, development_double|
|set.advanced.choice.4|8 个槽位来源，3 个种族样本|development_refresh, development_double|
|set.advanced.drone_hunter.3|8 个槽位来源，3 个种族样本|drone_hunter, drone_mentor|
|set.advanced.drone_hunter.4|8 个槽位来源，3 个种族样本|drone_hunter, drone_mentor|
|set.advanced.bounty.3|8 个槽位来源，3 个种族样本|bounty, bounty_hero|
|set.advanced.bounty.4|8 个槽位来源，3 个种族样本|bounty, bounty_hero|
|set.advanced.overload.3|8 个槽位来源，3 个种族样本|overload, overload_chain|
|set.advanced.overload.4|8 个槽位来源，3 个种族样本|overload, overload_chain|
|set.advanced.hold.3|8 个槽位来源，3 个种族样本|hold, hold_volley|
|set.advanced.hold.4|8 个槽位来源，3 个种族样本|hold, hold_volley|
|set.advanced.pack.3|8 个槽位来源，3 个种族样本|opening_pack, pack_rank, pack_kill, capture|
|set.advanced.pack.4|8 个槽位来源，3 个种族样本|opening_pack, pack_rank, pack_kill, capture|
|set.advanced.phantom.3|8 个槽位来源，3 个种族样本|stat.attackSpeed, phantom|
|set.advanced.phantom.4|8 个槽位来源，3 个种族样本|stat.attackSpeed, phantom|
|set.advanced.fleet.3|8 个槽位来源，3 个种族样本|opening_fleet, fleet_elite, fleet_reinforcement|
|set.advanced.fleet.4|8 个槽位来源，3 个种族样本|opening_fleet, fleet_elite, fleet_reinforcement|
|set.advanced.scorched.3|8 个槽位来源，3 个种族样本|periodic_trap, burn_area, burn_trail|
|set.advanced.scorched.4|8 个槽位来源，3 个种族样本|periodic_trap, burn_area, burn_trail|
|set.advanced.army.3|8 个槽位来源，3 个种族样本|capacity_members, opening_direction, direction_reinforcement|
|set.advanced.army.4|8 个槽位来源，3 个种族样本|capacity_members, opening_direction, direction_reinforcement|
|set.advanced.soldier.3|8 个槽位来源，3 个种族样本|recruit_rank, capacity_rank, kill_training|
|set.advanced.soldier.4|8 个槽位来源，3 个种族样本|recruit_rank, capacity_rank, kill_training|
|set.advanced.elite.3|8 个槽位来源，3 个种族样本|opening_elite_bound, opening_elite_rank, elite.health, elite.attack, bound.native|
|set.advanced.elite.4|8 个槽位来源，3 个种族样本|opening_elite_bound, opening_elite_rank, elite.health, elite.attack, bound.native|
|set.advanced.hero.3|8 个槽位来源，3 个种族样本|direction.health, direction.attack, opening_direction_elites, opening_hero, bound.native|
|set.advanced.hero.4|8 个槽位来源，3 个种族样本|direction.health, direction.attack, opening_direction_elites, opening_hero, bound.native|
|set.advanced.survivor.3|8 个槽位来源，3 个种族样本|ordinary.health, ordinary.reduction, rescue, insurance|
|set.advanced.survivor.4|8 个槽位来源，3 个种族样本|ordinary.health, ordinary.reduction, rescue, insurance|
|set.advanced.breakthrough.3|8 个槽位来源，3 个种族样本|stat.attack, stat.crit, crit_pursuit|
|set.advanced.breakthrough.4|8 个槽位来源，3 个种族样本|stat.attack, stat.crit, crit_pursuit|
|set.advanced.iron.3|8 个槽位来源，3 个种族样本|share_damage, armor_percent, iron_counter|
|set.advanced.iron.4|8 个槽位来源，3 个种族样本|share_damage, armor_percent, iron_counter|
|set.advanced.light.3|8 个槽位来源，3 个种族样本|stat.move, stat.attackSpeed, light_assault|
|set.advanced.light.4|8 个槽位来源，3 个种族样本|stat.move, stat.attackSpeed, light_assault|
|set.advanced.precision.3|8 个槽位来源，3 个种族样本|stat.range, stat.crit, stat.critDamage, precision_crit|
|set.advanced.precision.4|8 个槽位来源，3 个种族样本|stat.range, stat.crit, stat.critDamage, precision_crit|
|set.advanced.wall.3|8 个槽位来源，3 个种族样本|stat.health, stat.defense, stat.reduction, wall_counter|
|set.advanced.wall.4|8 个槽位来源，3 个种族样本|stat.health, stat.defense, stat.reduction, wall_counter|
|set.advanced.sustain.3|8 个槽位来源，3 个种族样本|stat.attack, stat.attackSpeed, stat.health, sustain_heal|
|set.advanced.sustain.4|8 个槽位来源，3 个种族样本|stat.attack, stat.attackSpeed, stat.health, sustain_heal|
|set.advanced.enhancer_attack.3|8 个槽位来源，3 个种族样本|white_dps, stat.critDamage, stat.attack|
|set.advanced.enhancer_attack.4|8 个槽位来源，3 个种族样本|white_dps, stat.critDamage, stat.attack|
|set.advanced.enhancer_defense.3|8 个槽位来源，3 个种族样本|white_hp, white_armor, stat.reduction|
|set.advanced.enhancer_defense.4|8 个槽位来源，3 个种族样本|white_hp, white_armor, stat.reduction|
|set.advanced.enhancer_speed.3|8 个槽位来源，3 个种族样本|stat.move, stat.dodge, stat.attackSpeed|
|set.advanced.enhancer_speed.4|8 个槽位来源，3 个种族样本|stat.move, stat.dodge, stat.attackSpeed|
|set.advanced.corrupted_hero.4|8 个槽位来源，3 个种族样本|capacity_members, capacity_rank, opening_direction_elites, opening_hero, bound.native|
|set.orange.hero.4|8 个槽位来源，3 个种族样本|direction.health, direction.attack, opening_direction_elites, opening_hero, bound.native, direction.attackSpeed, capacity_rank, bound.health, bound.shield, hero_orange, hero_growth|
|set.orange.hero.5|8 个槽位来源，3 个种族样本|direction.health, direction.attack, opening_direction_elites, opening_hero, bound.native, direction.attackSpeed, capacity_rank, bound.health, bound.shield, hero_orange, hero_growth|
|set.orange.corrupted_hero.4|8 个槽位来源，3 个种族样本|capacity_members, capacity_rank, opening_direction_elites, opening_hero, bound.native, direction.health, direction.attack, bound.health, bound.shield, hero_orange, hero_growth|
|set.orange.corrupted_hero.5|8 个槽位来源，3 个种族样本|capacity_members, capacity_rank, opening_direction_elites, opening_hero, bound.native, direction.health, direction.attack, bound.health, bound.shield, hero_orange, hero_growth|
|set.orange.survivor.4|8 个槽位来源，3 个种族样本|ordinary.health, insurance, rescue, capacity_members_all, capacity_rank_all|
|set.orange.survivor.5|8 个槽位来源，3 个种族样本|ordinary.health, insurance, rescue, capacity_members_all, capacity_rank_all|
|set.orange.soldier.4|8 个槽位来源，3 个种族样本|recruit_rank, capacity_rank, kill_training, direction.attack, direction.attackSpeed|
|set.orange.soldier.5|8 个槽位来源，3 个种族样本|recruit_rank, capacity_rank, kill_training, direction.attack, direction.attackSpeed|
|set.orange.army.4|8 个槽位来源，3 个种族样本|capacity_members, opening_direction, direction_reinforcement, capacity_squads|
|set.orange.army.5|8 个槽位来源，3 个种族样本|capacity_members, opening_direction, direction_reinforcement, capacity_squads|
|set.orange.elite.4|8 个槽位来源，3 个种族样本|opening_elite_bound, opening_elite_rank, elite.health, elite.attack, bound.native, bound.health, bound.shield, bound.native_tier, bound.attackSpeed|
|set.orange.elite.5|8 个槽位来源，3 个种族样本|opening_elite_bound, opening_elite_rank, elite.health, elite.attack, bound.native, bound.health, bound.shield, bound.native_tier, bound.attackSpeed|
|set.special.adventurer.4|8 个槽位来源，3 个种族样本|adventurer, adventurer_replace|
|set.special.sky.4|8 个槽位来源，3 个种族样本|stage_yamato|
|set.special.lost.4|8 个槽位来源，3 个种族样本|lost_templar, lost_adept|
|set.special.flame.4|8 个槽位来源，3 个种族样本|true_burn, burn_execute|
|module.workers.3|1 个槽位来源，3 个种族样本|opening_workers, worker_efficiency, periodic_worker|
|module.workers.4|1 个槽位来源，3 个种族样本|opening_workers, worker_efficiency, periodic_worker, worker_building|
|module.pickup.3|1 个槽位来源，3 个种族样本|pickup_yield, pickup_radius, equipment_drop_chance|
|module.pickup.4|1 个槽位来源，3 个种族样本|pickup_yield, pickup_radius, equipment_drop_chance, card_copy|
|module.rescue.3|1 个槽位来源，3 个种族样本|worker_rescue, rescue_double|
|module.rescue.4|1 个槽位来源，3 个种族样本|worker_rescue, rescue_double, rescue_elite|
|module.double_pickup.3|1 个槽位来源，3 个种族样本|pickup_double, equipment_drop|
|module.double_pickup.4|1 个槽位来源，3 个种族样本|pickup_double, boss_quality, harvest|
|module.loan.3|1 个槽位来源，3 个种族样本|loan|
|module.loan.4|1 个槽位来源，3 个种族样本|loan|
|module.supply.3|1 个槽位来源，3 个种族样本|periodic_resources, stage_reward_percent, resource_drop|
|module.supply.4|1 个槽位来源，3 个种族样本|periodic_resources, stage_reward_percent, resource_drop, supply_interest|
|module.shop.3|1 个槽位来源，3 个种族样本|shop_refresh, free_product, free_refresh_quality|
|module.shop.4|1 个槽位来源，3 个种族样本|shop_refresh, free_product, free_refresh_quality, purchase_copy|
|module.purchase.3|1 个槽位来源，3 个种族样本|purchase_discount, purchase_identity_discount|
|module.purchase.4|1 个槽位来源，3 个种族样本|purchase_discount, purchase_identity_discount, purchase_rank|
|module.refresh.3|1 个槽位来源，3 个种族样本|refresh_discount, stable_refresh|
|module.refresh.4|1 个槽位来源，3 个种族样本|refresh_discount, stable_refresh, refresh_credit|
|module.unreasonable.3|1 个槽位来源，3 个种族样本|free_product, refresh_multiplier|
|module.unreasonable.4|1 个槽位来源，3 个种族样本|first_purchase_free, refresh_multiplier|
|module.contract.3|1 个槽位来源，3 个种族样本|build_free, build_double|
|module.contract.4|1 个槽位来源，3 个种族样本|build_free, build_double, build_research|
|module.academy.3|1 个槽位来源，3 个种族样本|paid_elite|
|module.academy.4|1 个槽位来源，3 个种族样本|paid_elite, elite_training|
|module.formation.3|1 个槽位来源，3 个种族样本|catch_up, manual_cooldown|
|module.formation.4|1 个槽位来源，3 个种族样本|catch_up, manual_cooldown, manual_reset|
|module.moving_fire.3|1 个槽位来源，3 个种族样本|moving_fire|
|module.moving_fire.4|1 个槽位来源，3 个种族样本|moving_fire, moving_extra|
|module.split.3|1 个槽位来源，3 个种族样本|split, bounce|
|module.split.4|1 个槽位来源，3 个种族样本|split, bounce|
|module.blade.3|1 个槽位来源，3 个种族样本|melee_range, cleave|
|module.blade.4|1 个槽位来源，3 个种族样本|melee_range, cleave|
|module.telescope.3|1 个槽位来源，3 个种族样本|weapon_range, distance_damage|
|module.telescope.4|1 个槽位来源，3 个种族样本|weapon_range, distance_damage, pierce|
|module.adrenaline.3|1 个槽位来源，3 个种族样本|adrenaline|
|module.adrenaline.4|1 个槽位来源，3 个种族样本|adrenaline, last_stand|
|module.rapid.3|1 个槽位来源，3 个种族样本|prepare_reduction|
|module.suppression.3|1 个槽位来源，3 个种族样本|bombardment|
|module.suppression.4|1 个槽位来源，3 个种族样本|bombardment|
|module.reinforcement.3|1 个槽位来源，3 个种族样本|reinforcement|
|module.reinforcement.4|1 个槽位来源，3 个种族样本|reinforcement, reinforcement_elite|
|module.egg.3|1 个槽位来源，3 个种族样本|egg_reinforcement|
|module.egg.4|1 个槽位来源，3 个种族样本|egg_reinforcement, egg_conversion|
|module.incendiary.3|1 个槽位来源，3 个种族样本|incendiary|
|module.incendiary.4|1 个槽位来源，3 个种族样本|incendiary|
|module.elephant.3|1 个槽位来源，3 个种族样本|opening_ultralisk|
|module.elephant.4|1 个槽位来源，3 个种族样本|opening_ultralisk, ultralisk_elite|
|module.drop_pod.3|1 个槽位来源，3 个种族样本|drop_pod|
|module.drop_pod.4|1 个槽位来源，3 个种族样本|drop_pod, drop_elite|
|module.reactor.3|1 个槽位来源，3 个种族样本|reactor|
|module.reactor.4|1 个槽位来源，3 个种族样本|reactor|
|module.joint.4|1 个槽位来源，3 个种族样本|joint_support|
|module.swarm.3|1 个槽位来源，3 个种族样本|swarm|
|module.konstant.3|1 个槽位来源，3 个种族样本|konstant|
|module.plague.4|1 个槽位来源，3 个种族样本|plague|
|module.konstant.4|1 个槽位来源，3 个种族样本|konstant|
|module.rewind.4|1 个槽位来源，3 个种族样本|rewind|
|module.bounty_order.5|1 个槽位来源，3 个种族样本|bounty_order|
|module.plunder.5|1 个槽位来源，3 个种族样本|plunder|
|module.armory.5|1 个槽位来源，3 个种族样本|capacity_baseline, recruit_rank_all|
|module.singularity.5|1 个槽位来源，3 个种族样本|research_cap, hero_cap|
|module.weakness.5|1 个槽位来源，3 个种族样本|weakness|
|module.dominance.5|1 个槽位来源，3 个种族样本|dominance|
|module.yamato.5|1 个槽位来源，3 个种族样本|yamato_support|
|module.behemoth.5|1 个槽位来源，3 个种族样本|behemoth|
|module.devour.5|1 个槽位来源，3 个种族样本|devour|
|module.unlimited.5|1 个槽位来源，3 个种族样本|capacity_baseline|
|module.phase.5|1 个槽位来源，3 个种族样本|phase|
|module.ark.5|1 个槽位来源，3 个种族样本|ark|
|special.doom.3|4 个槽位来源，3 个种族样本|weapon_area|
|special.doom.4|4 个槽位来源，3 个种族样本|weapon_area, cluster|
|special.unstable.3|4 个槽位来源，3 个种族样本|execute|
|special.unstable.4|4 个槽位来源，3 个种族样本|execute, execute_chain|
|special.shield.3|2 个槽位来源，3 个种族样本|out_of_combat_shield|
|special.shield.4|2 个槽位来源，3 个种族样本|out_of_combat_shield, shield_rebuild|
|special.recall.3|2 个槽位来源，3 个种族样本|auto_recall|
|special.recall.4|2 个槽位来源，3 个种族样本|auto_recall, recall_phantom|
|special.counter.3|4 个槽位来源，3 个种族样本|weapon_bonus|
|special.counter.4|4 个槽位来源，3 个种族样本|weapon_bonus|
|special.double.4|4 个槽位来源，3 个种族样本|double_attack|

|继承|可用宿主数|生效键|
|---|---:|---|
|C01|4|opening_workers|
|C02|4|worker_efficiency|
|C03|4|periodic_worker|
|C04|4|pickup_yield|
|C05|4|pickup_radius|
|C06|4|equipment_drop_chance|
|C07|4|worker_rescue|
|C08|4|rescue_double|
|C09|4|pickup_double|
|C10|4|boss_quality|
|C11|4|loan|
|E01|6|periodic_resources|
|E02|6|stage_reward_percent|
|E03|6|resource_drop|
|E04|6|shop_refresh|
|E05|5|free_product|
|E06|6|free_refresh_quality|
|E07|6|purchase_discount, purchase_identity_discount|
|E08|6|refresh_discount|
|E09|6|stable_refresh|
|E10|6|free_product, refresh_multiplier|
|E11|6|build_free|
|E12|6|build_double|
|E13|6|paid_elite|
|M01|7|catch_up|
|M02|7|manual_cooldown|
|M03|7|turn_factor|
|M04|7|moving_chance|
|M05|7|split|
|M06|7|bounce|
|M07|7|melee_range|
|M08|7|cleave|
|M09|7|weapon_range|
|M10|7|distance_damage|
|M11|7|adrenaline|
|M12|8|prepare_reduction|
|S01|8|bombardment|
|S02|8|reinforcement|
|S03|8|egg_reinforcement|
|S04|8|incendiary|
|S05|8|opening_ultralisk|
|S06|8|drop_pod|
|S07|8|reactor|
|C-B1|2|pickup_yield|
|C-B2|2|boss_quality|
|C-P1|2|card_copy|
|C-P2|2|pickup_double, harvest|
|E-B1|2|shop_refresh|
|E-B2|2|purchase_discount, purchase_identity_discount|
|E-P1|2|refresh_credit|
|E-P2|2|purchase_copy|
|M-B1|2|weapon_range|
|M-B2|2|prepare_reduction|
|M-P1|2|manual_reset|
|M-P2|2|cleave|
|S-B1|2|reinforcement|
|S-B2|2|reactor|
|S-P1|2|reactor|
|S-P2|2|joint_support|

## 效果消费者与回归

191 个生效键逐项映射到当前消费者和效果族回归。绑定、方向、普通／精英属性及容量按真实动态分派检查；继承 M03/M04 使用自然生成继承并验证实际瞄准／移动射击。这里只列首个证据入口，完整关联测试见 JSON。

|效果键|消费者|回归入口|
|---|---|---|
|adrenaline|[src/simulation/starship/combat.ts:73](../../src/simulation/starship/combat.ts)|[test/starship-combat.test.ts:35](../../test/starship-combat.test.ts)|
|adventurer|[src/simulation/starship/drops.ts:47](../../src/simulation/starship/drops.ts)|[test/starship-drops.test.ts:20](../../test/starship-drops.test.ts)|
|adventurer_replace|[src/simulation/starship/drops.ts:47](../../src/simulation/starship/drops.ts)|[test/starship-drops.test.ts:20](../../test/starship-drops.test.ts)|
|ark|[src/simulation/starship/advanced-support.ts:16](../../src/simulation/starship/advanced-support.ts)|[test/starship-advanced-support.test.ts:25](../../test/starship-advanced-support.test.ts)|
|armor_percent|[src/simulation/starship/runtime.ts:59](../../src/simulation/starship/runtime.ts)|[test/starship-defense-lifecycle.test.ts:16](../../test/starship-defense-lifecycle.test.ts)|
|auto_recall|[src/simulation/starship/recall.ts:10](../../src/simulation/starship/recall.ts)|[test/starship-capture-projection.test.ts:17](../../test/starship-capture-projection.test.ts)|
|behemoth|[src/simulation/starship/advanced-support.ts:16](../../src/simulation/starship/advanced-support.ts)|[test/starship-advanced-support.test.ts:24](../../test/starship-advanced-support.test.ts)|
|bombardment|[src/simulation/combat/shop-support.ts:8](../../src/simulation/combat/shop-support.ts)|[test/shared-tech-cards-20260929.test.ts:35](../../test/shared-tech-cards-20260929.test.ts)|
|boss_quality|[src/simulation/starship/drops.ts:47](../../src/simulation/starship/drops.ts)|[test/starship-drops.test.ts:31](../../test/starship-drops.test.ts)|
|bounce|[src/simulation/combat/hero-attack-upgrades.ts:13](../../src/simulation/combat/hero-attack-upgrades.ts)|[test/performance-s04.test.ts:27](../../test/performance-s04.test.ts)|
|bound.attack|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:112](../../test/integration-i03-effects.test.ts)|
|bound.attackSpeed|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/starship-members.test.ts:22](../../test/starship-members.test.ts)|
|bound.health|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|bound.native|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|bound.native_tier|[src/simulation/starship/runtime.ts:61](../../src/simulation/starship/runtime.ts)|[test/starship-members.test.ts:22](../../test/starship-members.test.ts)|
|bound.shield|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|bounty|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/battle-preload.test.ts:44](../../test/battle-preload.test.ts)|
|bounty_hero|[src/simulation/starship/asset-plan.ts:32](../../src/simulation/starship/asset-plan.ts)|[test/starship-growth.test.ts:24](../../test/starship-growth.test.ts)|
|bounty_order|[src/simulation/starship/growth.ts:53](../../src/simulation/starship/growth.ts)|[test/starship-growth.test.ts:30](../../test/starship-growth.test.ts)|
|build_double|[src/simulation/expedition-economy.ts:64](../../src/simulation/expedition-economy.ts)|[test/integration-i03-effects.test.ts:92](../../test/integration-i03-effects.test.ts)|
|build_free|[src/simulation/expedition-economy.ts:64](../../src/simulation/expedition-economy.ts)|[test/integration-i03-effects.test.ts:92](../../test/integration-i03-effects.test.ts)|
|build_research|[src/simulation/expedition-economy.ts:64](../../src/simulation/expedition-economy.ts)|[test/integration-i03-effects.test.ts:92](../../test/integration-i03-effects.test.ts)|
|burn_area|[src/simulation/starship/combat.ts:76](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:57](../../test/integration-i03-effects.test.ts)|
|burn_execute|[src/simulation/starship/combat.ts:41](../../src/simulation/starship/combat.ts)|[test/starship-combat.test.ts:26](../../test/starship-combat.test.ts)|
|burn_trail|[src/simulation/starship/combat.ts:78](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:57](../../test/integration-i03-effects.test.ts)|
|capacity_baseline|[src/simulation/starship/eligibility.ts:30](../../src/simulation/starship/eligibility.ts)|[test/starship-members.test.ts:31](../../test/starship-members.test.ts)|
|capacity_members|[src/simulation/starship/eligibility.ts:28](../../src/simulation/starship/eligibility.ts)|[test/equipment-effects.test.ts:57](../../test/equipment-effects.test.ts)|
|capacity_members_all|[src/simulation/starship/eligibility.ts:28](../../src/simulation/starship/eligibility.ts)|[test/starship-defense-lifecycle.test.ts:18](../../test/starship-defense-lifecycle.test.ts)|
|capacity_rank|[src/simulation/starship/eligibility.ts:28](../../src/simulation/starship/eligibility.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|capacity_rank_all|[src/simulation/starship/eligibility.ts:28](../../src/simulation/starship/eligibility.ts)|[test/starship-defense-lifecycle.test.ts:18](../../test/starship-defense-lifecycle.test.ts)|
|capacity_squads|[src/simulation/starship/eligibility.ts:28](../../src/simulation/starship/eligibility.ts)|[test/starship-members.test.ts:15](../../test/starship-members.test.ts)|
|capture|[src/simulation/starship/capture.ts:17](../../src/simulation/starship/capture.ts)|[test/difficulty-r2.test.ts:124](../../test/difficulty-r2.test.ts)|
|card_copy|[src/simulation/starship/economy.ts:30](../../src/simulation/starship/economy.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|catch_up|[src/simulation/starship/runtime.ts:127](../../src/simulation/starship/runtime.ts)|[test/starship-controls.test.ts:10](../../test/starship-controls.test.ts)|
|cleave|[src/simulation/starship/combat.ts:57](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:33](../../test/integration-i03-effects.test.ts)|
|cluster|[src/simulation/starship/weapon-areas.ts:15](../../src/simulation/starship/weapon-areas.ts)|[test/starship-ui-flow.test.ts:25](../../test/starship-ui-flow.test.ts)|
|crit_pursuit|[src/simulation/starship/combat.ts:57](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:48](../../test/integration-i03-effects.test.ts)|
|development_double|[src/simulation/starship/economy.ts:18](../../src/simulation/starship/economy.ts)|[test/starship-support-economy.test.ts:16](../../test/starship-support-economy.test.ts)|
|development_refresh|[src/simulation/starship/modules.ts:33](../../src/simulation/starship/modules.ts)|[test/starship-modules.test.ts:20](../../test/starship-modules.test.ts)|
|devour|[src/simulation/starship/growth.ts:51](../../src/simulation/starship/growth.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|direction.attack|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|direction.attackSpeed|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|direction.health|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|direction_reinforcement|[src/simulation/starship/members.ts:73](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:86](../../test/integration-i03-effects.test.ts)|
|distance_damage|[src/simulation/starship/runtime.ts:96](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:36](../../test/integration-i03-effects.test.ts)|
|dominance|[src/simulation/starship/controls.ts:22](../../src/simulation/starship/controls.ts)|[test/starship-controls.test.ts:11](../../test/starship-controls.test.ts)|
|double_attack|[src/simulation/starship/combat.ts:58](../../src/simulation/starship/combat.ts)|[test/performance-s04.test.ts:22](../../test/performance-s04.test.ts)|
|drone_hunter|[src/simulation/starship/growth.ts:62](../../src/simulation/starship/growth.ts)|[test/integration-i03-effects.test.ts:69](../../test/integration-i03-effects.test.ts)|
|drone_mentor|[src/simulation/starship/growth.ts:62](../../src/simulation/starship/growth.ts)|[test/integration-i03-effects.test.ts:69](../../test/integration-i03-effects.test.ts)|
|drop_elite|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/starship-support-economy.test.ts:42](../../test/starship-support-economy.test.ts)|
|drop_pod|[src/simulation/starship/runtime.ts:88](../../src/simulation/starship/runtime.ts)|[test/starship-support-economy.test.ts:42](../../test/starship-support-economy.test.ts)|
|egg_conversion|[src/simulation/starship/conditional.ts:10](../../src/simulation/starship/conditional.ts)|[test/starship-forts-conditional.test.ts:23](../../test/starship-forts-conditional.test.ts)|
|egg_reinforcement|[src/simulation/starship/modules.ts:28](../../src/simulation/starship/modules.ts)|[test/starship-forts-conditional.test.ts:23](../../test/starship-forts-conditional.test.ts)|
|elite.attack|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:112](../../test/integration-i03-effects.test.ts)|
|elite.health|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:112](../../test/integration-i03-effects.test.ts)|
|elite_training|[src/simulation/starship/members.ts:72](../../src/simulation/starship/members.ts)|[test/starship-members.test.ts:35](../../test/starship-members.test.ts)|
|equipment_drop|[src/simulation/starship/drops.ts:47](../../src/simulation/starship/drops.ts)|[test/integration-i03-effects.test.ts:89](../../test/integration-i03-effects.test.ts)|
|equipment_drop_chance|[src/simulation/starship/drops.ts:53](../../src/simulation/starship/drops.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|execute|[src/simulation/starship/combat.ts:64](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:39](../../test/integration-i03-effects.test.ts)|
|execute_chain|[src/simulation/starship/combat.ts:64](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:39](../../test/integration-i03-effects.test.ts)|
|first_purchase_free|[src/simulation/starship/economy.ts:24](../../src/simulation/starship/economy.ts)|[test/starship-support-economy.test.ts:25](../../test/starship-support-economy.test.ts)|
|fleet_elite|[src/simulation/starship/members.ts:45](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:76](../../test/integration-i03-effects.test.ts)|
|fleet_reinforcement|[src/simulation/starship/members.ts:74](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:76](../../test/integration-i03-effects.test.ts)|
|foreign_elites|[src/simulation/starship/members.ts:46](../../src/simulation/starship/members.ts)|[test/starship-main-integration.test.ts:12](../../test/starship-main-integration.test.ts)|
|foreign_elites_second|[src/simulation/starship/members.ts:46](../../src/simulation/starship/members.ts)|[test/starship-main-integration.test.ts:12](../../test/starship-main-integration.test.ts)|
|fortification|[src/simulation/starship/fortifications.ts:33](../../src/simulation/starship/fortifications.ts)|[test/starship-forts-conditional.test.ts:17](../../test/starship-forts-conditional.test.ts)|
|free_product|[src/simulation/starship/modules.ts:37](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:95](../../test/integration-i03-effects.test.ts)|
|free_refresh_quality|[src/simulation/expedition-economy.ts:26](../../src/simulation/expedition-economy.ts)|[test/integration-i03-effects.test.ts:95](../../test/integration-i03-effects.test.ts)|
|harvest|[src/simulation/starship/modules.ts:31](../../src/simulation/starship/modules.ts)|[test/starship-drops.test.ts:31](../../test/starship-drops.test.ts)|
|hero_cap|[src/simulation/combat/expedition-heroes.ts:40](../../src/simulation/combat/expedition-heroes.ts)|[test/integration-i03-effects.test.ts:103](../../test/integration-i03-effects.test.ts)|
|hero_growth|[src/simulation/starship/growth.ts:57](../../src/simulation/starship/growth.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|hero_orange|[src/simulation/starship/hero-advancements.ts:29](../../src/simulation/starship/hero-advancements.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|hold|[src/simulation/starship/combat.ts:70](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:54](../../test/integration-i03-effects.test.ts)|
|hold_volley|[src/simulation/starship/combat.ts:75](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:54](../../test/integration-i03-effects.test.ts)|
|incendiary|[src/simulation/starship/runtime.ts:88](../../src/simulation/starship/runtime.ts)|[test/starship-support-economy.test.ts:32](../../test/starship-support-economy.test.ts)|
|insurance|[src/simulation/starship/defense.ts:25](../../src/simulation/starship/defense.ts)|[test/starship-defense-lifecycle.test.ts:18](../../test/starship-defense-lifecycle.test.ts)|
|iron_counter|[src/simulation/starship/defense.ts:29](../../src/simulation/starship/defense.ts)|[test/starship-defense-lifecycle.test.ts:16](../../test/starship-defense-lifecycle.test.ts)|
|joint_support|[src/simulation/starship/runtime.ts:88](../../src/simulation/starship/runtime.ts)|[test/starship-support-economy.test.ts:32](../../test/starship-support-economy.test.ts)|
|kill_training|[src/simulation/starship/growth.ts:58](../../src/simulation/starship/growth.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|konstant|[src/simulation/starship/controls.ts:28](../../src/simulation/starship/controls.ts)|[test/starship-controls.test.ts:12](../../test/starship-controls.test.ts)|
|last_stand|[src/simulation/starship/defense.ts:22](../../src/simulation/starship/defense.ts)|[test/starship-defense-lifecycle.test.ts:17](../../test/starship-defense-lifecycle.test.ts)|
|light_assault|[src/simulation/starship/combat.ts:53](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:51](../../test/integration-i03-effects.test.ts)|
|loan|[src/simulation/starship/economy.ts:14](../../src/simulation/starship/economy.ts)|[test/starship-support-economy.test.ts:16](../../test/starship-support-economy.test.ts)|
|lost_adept|[src/simulation/starship/members.ts:51](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|lost_templar|[src/simulation/starship/members.ts:50](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|manual_cooldown|[src/simulation/combat/expedition-combat.ts:49](../../src/simulation/combat/expedition-combat.ts)|[test/starship-controls.test.ts:10](../../test/starship-controls.test.ts)|
|manual_reset|[src/simulation/starship/controls.ts:10](../../src/simulation/starship/controls.ts)|[test/starship-controls.test.ts:10](../../test/starship-controls.test.ts)|
|melee_range|[src/simulation/starship/runtime.ts:69](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:33](../../test/integration-i03-effects.test.ts)|
|moving_chance|[src/simulation/combat/expedition-combat.ts:49](../../src/simulation/combat/expedition-combat.ts)|[test/integration-i03.test.ts:42](../../test/integration-i03.test.ts)|
|moving_extra|[src/simulation/starship/combat.ts:57](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:51](../../test/integration-i03-effects.test.ts)|
|moving_fire|[src/simulation/combat/expedition-combat.ts:49](../../src/simulation/combat/expedition-combat.ts)|[test/integration-i03-effects.test.ts:51](../../test/integration-i03-effects.test.ts)|
|opening_count|[src/simulation/starship/members.ts:32](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:54](../../test/integration-i03-effects.test.ts)|
|opening_direction|[src/simulation/starship/members.ts:49](../../src/simulation/starship/members.ts)|[test/starship-members.test.ts:15](../../test/starship-members.test.ts)|
|opening_direction_elites|[src/simulation/starship/members.ts:48](../../src/simulation/starship/members.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|opening_elite|[src/simulation/starship/members.ts:32](../../src/simulation/starship/members.ts)|[test/starship-drops.test.ts:24](../../test/starship-drops.test.ts)|
|opening_elite_bound|[src/simulation/starship/members.ts:47](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:112](../../test/integration-i03-effects.test.ts)|
|opening_elite_rank|[src/simulation/starship/members.ts:47](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:112](../../test/integration-i03-effects.test.ts)|
|opening_fleet|[src/simulation/starship/members.ts:45](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:76](../../test/integration-i03-effects.test.ts)|
|opening_hero|[src/simulation/missions/rewards.ts:21](../../src/simulation/missions/rewards.ts)|[test/difficulty-r2.test.ts:109](../../test/difficulty-r2.test.ts)|
|opening_hero_proxy|[src/simulation/starship/members.ts:48](../../src/simulation/starship/members.ts)|[test/starship-tiers.test.ts:18](../../test/starship-tiers.test.ts)|
|opening_hydralisk|[src/simulation/starship/members.ts:42](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|opening_pack|[src/simulation/starship/growth.ts:59](../../src/simulation/starship/growth.ts)|[test/difficulty-r2.test.ts:124](../../test/difficulty-r2.test.ts)|
|opening_rank|[src/simulation/starship/members.ts:32](../../src/simulation/starship/members.ts)|[test/starship-members.test.ts:28](../../test/starship-members.test.ts)|
|opening_roaches|[src/simulation/starship/members.ts:41](../../src/simulation/starship/members.ts)|[test/starship-forts-conditional.test.ts:20](../../test/starship-forts-conditional.test.ts)|
|opening_ultralisk|[src/simulation/starship/members.ts:43](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|opening_workers|[src/simulation/starship/runtime.ts:87](../../src/simulation/starship/runtime.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|opening_zerglings|[src/simulation/starship/members.ts:40](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|ordinary.health|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/starship-defense-lifecycle.test.ts:18](../../test/starship-defense-lifecycle.test.ts)|
|ordinary.reduction|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/starship-defense-lifecycle.test.ts:18](../../test/starship-defense-lifecycle.test.ts)|
|out_of_combat_shield|[src/simulation/starship/defense.ts:35](../../src/simulation/starship/defense.ts)|[test/starship-defense-lifecycle.test.ts:25](../../test/starship-defense-lifecycle.test.ts)|
|overload|[src/simulation/starship/combat.ts:65](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:42](../../test/integration-i03-effects.test.ts)|
|overload_chain|[src/simulation/starship/combat.ts:65](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:42](../../test/integration-i03-effects.test.ts)|
|pack_kill|[src/simulation/starship/growth.ts:59](../../src/simulation/starship/growth.ts)|[test/difficulty-r2.test.ts:124](../../test/difficulty-r2.test.ts)|
|pack_rank|[src/simulation/starship/members.ts:44](../../src/simulation/starship/members.ts)|[test/difficulty-r2.test.ts:124](../../test/difficulty-r2.test.ts)|
|paid_elite|[src/simulation/expedition-production.ts:115](../../src/simulation/expedition-production.ts)|[test/starship-members.test.ts:35](../../test/starship-members.test.ts)|
|periodic_resources|[src/simulation/starship/runtime.ts:88](../../src/simulation/starship/runtime.ts)|[test/starship-forts-conditional.test.ts:23](../../test/starship-forts-conditional.test.ts)|
|periodic_trap|[src/simulation/starship/modules.ts:25](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:57](../../test/integration-i03-effects.test.ts)|
|periodic_worker|[src/simulation/starship/economy.ts:32](../../src/simulation/starship/economy.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|phantom|[src/simulation/starship/projections.ts:13](../../src/simulation/starship/projections.ts)|[test/equipment-effects.test.ts:25](../../test/equipment-effects.test.ts)|
|phase|[src/simulation/building/expedition.ts:9](../../src/simulation/building/expedition.ts)|[test/integration-i02.test.ts:40](../../test/integration-i02.test.ts)|
|pickup_double|[src/simulation/starship/modules.ts:31](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:89](../../test/integration-i03-effects.test.ts)|
|pickup_radius|[src/simulation/world.ts:1102](../../src/simulation/world.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|pickup_yield|[src/simulation/starship/modules.ts:31](../../src/simulation/starship/modules.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|pierce|[src/simulation/combat/protoss-elite-runtime.ts:23](../../src/simulation/combat/protoss-elite-runtime.ts)|[test/integration-i03-effects.test.ts:36](../../test/integration-i03-effects.test.ts)|
|plague|[src/simulation/starship/advanced-support.ts:16](../../src/simulation/starship/advanced-support.ts)|[test/starship-advanced-support.test.ts:23](../../test/starship-advanced-support.test.ts)|
|plunder|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/starship-growth.test.ts:33](../../test/starship-growth.test.ts)|
|precision_crit|[src/simulation/starship/combat.ts:52](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:45](../../test/integration-i03-effects.test.ts)|
|prepare_reduction|[src/simulation/combat/expedition-combat.ts:49](../../src/simulation/combat/expedition-combat.ts)|[test/integration-i03-effects.test.ts:106](../../test/integration-i03-effects.test.ts)|
|purchase_copy|[src/simulation/starship/economy.ts:28](../../src/simulation/starship/economy.ts)|[test/integration-i03-effects.test.ts:95](../../test/integration-i03-effects.test.ts)|
|purchase_discount|[src/simulation/starship/modules.ts:36](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:100](../../test/integration-i03-effects.test.ts)|
|purchase_identity_discount|[src/simulation/starship/modules.ts:36](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:100](../../test/integration-i03-effects.test.ts)|
|purchase_rank|[src/simulation/starship/economy.ts:27](../../src/simulation/starship/economy.ts)|[test/integration-i03-effects.test.ts:100](../../test/integration-i03-effects.test.ts)|
|rank_discount|[src/simulation/expedition-production.ts:55](../../src/simulation/expedition-production.ts)|[test/starship-forts-conditional.test.ts:21](../../test/starship-forts-conditional.test.ts)|
|ravager_evolution|[src/simulation/starship/conditional.ts:15](../../src/simulation/starship/conditional.ts)|[test/starship-forts-conditional.test.ts:20](../../test/starship-forts-conditional.test.ts)|
|reactor|[src/simulation/starship/runtime.ts:88](../../src/simulation/starship/runtime.ts)|[test/starship-support-economy.test.ts:39](../../test/starship-support-economy.test.ts)|
|recall_phantom|[src/simulation/starship/recall.ts:15](../../src/simulation/starship/recall.ts)|[test/starship-capture-projection.test.ts:17](../../test/starship-capture-projection.test.ts)|
|recruit_discount|[src/simulation/expedition-production.ts:55](../../src/simulation/expedition-production.ts)|[test/integration-i03-effects.test.ts:86](../../test/integration-i03-effects.test.ts)|
|recruit_rank|[src/simulation/starship/eligibility.ts:33](../../src/simulation/starship/eligibility.ts)|[test/difficulty-r2.test.ts:95](../../test/difficulty-r2.test.ts)|
|recruit_rank_all|[src/simulation/starship/eligibility.ts:33](../../src/simulation/starship/eligibility.ts)|[test/starship-members.test.ts:31](../../test/starship-members.test.ts)|
|refresh_credit|[src/simulation/expedition-economy.ts:96](../../src/simulation/expedition-economy.ts)|[test/starship-support-economy.test.ts:22](../../test/starship-support-economy.test.ts)|
|refresh_discount|[src/simulation/starship/modules.ts:39](../../src/simulation/starship/modules.ts)|[test/starship-modules.test.ts:39](../../test/starship-modules.test.ts)|
|refresh_multiplier|[src/simulation/starship/modules.ts:39](../../src/simulation/starship/modules.ts)|[test/starship-support-economy.test.ts:25](../../test/starship-support-economy.test.ts)|
|reinforcement|[src/simulation/starship/advanced-support.ts:44](../../src/simulation/starship/advanced-support.ts)|[test/entry-readiness.test.ts:21](../../test/entry-readiness.test.ts)|
|reinforcement_elite|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/integration-i03-effects.test.ts:76](../../test/integration-i03-effects.test.ts)|
|replace_hero_proxy|[src/simulation/starship/members.ts:48](../../src/simulation/starship/members.ts)|[test/starship-tiers.test.ts:18](../../test/starship-tiers.test.ts)|
|rescue|[src/simulation/encounters/expanded-state.ts:21](../../src/simulation/encounters/expanded-state.ts)|[test/expanded-encounters.test.ts:48](../../test/expanded-encounters.test.ts)|
|rescue_double|[src/simulation/starship/modules.ts:29](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:83](../../test/integration-i03-effects.test.ts)|
|rescue_elite|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/integration-i03-effects.test.ts:83](../../test/integration-i03-effects.test.ts)|
|rescue_rank|[src/simulation/starship/members.ts:70](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:54](../../test/integration-i03-effects.test.ts)|
|research_cap|[src/simulation/building/expedition.ts:27](../../src/simulation/building/expedition.ts)|[test/integration-i03-effects.test.ts:103](../../test/integration-i03-effects.test.ts)|
|resource_drop|[src/simulation/starship/conditional.ts:8](../../src/simulation/starship/conditional.ts)|[test/starship-forts-conditional.test.ts:23](../../test/starship-forts-conditional.test.ts)|
|rewind|[src/simulation/starship/lifecycle.ts:25](../../src/simulation/starship/lifecycle.ts)|[test/starship-defense-lifecycle.test.ts:23](../../test/starship-defense-lifecycle.test.ts)|
|share_damage|[src/simulation/combat/expedition-combat.ts:139](../../src/simulation/combat/expedition-combat.ts)|[test/starship-defense-lifecycle.test.ts:16](../../test/starship-defense-lifecycle.test.ts)|
|shield_rebuild|[src/simulation/starship/defense.ts:16](../../src/simulation/starship/defense.ts)|[test/starship-defense-lifecycle.test.ts:25](../../test/starship-defense-lifecycle.test.ts)|
|shop_refresh|[src/simulation/starship/modules.ts:33](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:95](../../test/integration-i03-effects.test.ts)|
|split|[src/simulation/starship/combat.ts:57](../../src/simulation/starship/combat.ts)|[test/performance-s04.test.ts:22](../../test/performance-s04.test.ts)|
|stable_refresh|[src/simulation/expedition-economy.ts:96](../../src/simulation/expedition-economy.ts)|[test/starship-support-economy.test.ts:22](../../test/starship-support-economy.test.ts)|
|stage_bunker|[src/simulation/starship/fortifications.ts:33](../../src/simulation/starship/fortifications.ts)|[test/starship-forts-conditional.test.ts:17](../../test/starship-forts-conditional.test.ts)|
|stage_resources|[src/simulation/starship/modules.ts:32](../../src/simulation/starship/modules.ts)|[test/starship-modules.test.ts:24](../../test/starship-modules.test.ts)|
|stage_reward_percent|[src/simulation/world.ts:1029](../../src/simulation/world.ts)|[test/starship-forts-conditional.test.ts:23](../../test/starship-forts-conditional.test.ts)|
|stage_yamato|[src/simulation/starship/asset-plan.ts:27](../../src/simulation/starship/asset-plan.ts)|[test/integration-i03-effects.test.ts:80](../../test/integration-i03-effects.test.ts)|
|stat.attack|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:48](../../test/integration-i03-effects.test.ts)|
|stat.attackSpeed|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:51](../../test/integration-i03-effects.test.ts)|
|stat.crit|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:45](../../test/integration-i03-effects.test.ts)|
|stat.critDamage|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:45](../../test/integration-i03-effects.test.ts)|
|stat.defense|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:63](../../test/integration-i03-effects.test.ts)|
|stat.dodge|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:109](../../test/integration-i03-effects.test.ts)|
|stat.health|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:60](../../test/integration-i03-effects.test.ts)|
|stat.move|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:51](../../test/integration-i03-effects.test.ts)|
|stat.range|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:45](../../test/integration-i03-effects.test.ts)|
|stat.reduction|[src/simulation/starship/runtime.ts:53](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:63](../../test/integration-i03-effects.test.ts)|
|supply_interest|[src/simulation/starship/economy.ts:31](../../src/simulation/starship/economy.ts)|[test/starship-support-economy.test.ts:29](../../test/starship-support-economy.test.ts)|
|sustain_heal|[src/simulation/starship/combat.ts:79](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:60](../../test/integration-i03-effects.test.ts)|
|swarm|[src/simulation/persistence/run-fields.ts:30](../../src/simulation/persistence/run-fields.ts)|[test/fun-shop-boundaries.test.ts:52](../../test/fun-shop-boundaries.test.ts)|
|training_evolution|[src/simulation/starship/asset-plan.ts:31](../../src/simulation/starship/asset-plan.ts)|[test/starship-members.test.ts:28](../../test/starship-members.test.ts)|
|true_burn|[src/simulation/starship/combat.ts:66](../../src/simulation/starship/combat.ts)|[test/performance-s04.test.ts:18](../../test/performance-s04.test.ts)|
|turn_factor|[src/simulation/combat/expedition-combat.ts:49](../../src/simulation/combat/expedition-combat.ts)|[test/integration-i03.test.ts:22](../../test/integration-i03.test.ts)|
|ultralisk_elite|[src/simulation/starship/members.ts:43](../../src/simulation/starship/members.ts)|[test/integration-i03-effects.test.ts:72](../../test/integration-i03-effects.test.ts)|
|volley|[src/simulation/starship/combat.ts:75](../../src/simulation/starship/combat.ts)|[test/integration-i03-effects.test.ts:54](../../test/integration-i03-effects.test.ts)|
|wall_counter|[src/simulation/starship/defense.ts:29](../../src/simulation/starship/defense.ts)|[test/integration-i03-effects.test.ts:63](../../test/integration-i03-effects.test.ts)|
|weakness|[src/simulation/starship/combat.ts:40](../../src/simulation/starship/combat.ts)|[test/starship-combat.test.ts:23](../../test/starship-combat.test.ts)|
|weapon_area|[src/simulation/starship/weapon-areas.ts:9](../../src/simulation/starship/weapon-areas.ts)|[test/starship-ui-flow.test.ts:25](../../test/starship-ui-flow.test.ts)|
|weapon_bonus|[src/simulation/combat/expedition-combat.ts:69](../../src/simulation/combat/expedition-combat.ts)|[test/integration-i03-effects.test.ts:66](../../test/integration-i03-effects.test.ts)|
|weapon_range|[src/simulation/starship/runtime.ts:69](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:36](../../test/integration-i03-effects.test.ts)|
|white_armor|[src/simulation/starship/runtime.ts:59](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:109](../../test/integration-i03-effects.test.ts)|
|white_dps|[src/simulation/starship/runtime.ts:59](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:109](../../test/integration-i03-effects.test.ts)|
|white_hp|[src/simulation/starship/runtime.ts:59](../../src/simulation/starship/runtime.ts)|[test/integration-i03-effects.test.ts:109](../../test/integration-i03-effects.test.ts)|
|worker_building|[src/simulation/starship/economy.ts:33](../../src/simulation/starship/economy.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|worker_efficiency|[src/simulation/world.ts:631](../../src/simulation/world.ts)|[test/integration-i03.test.ts:27](../../test/integration-i03.test.ts)|
|worker_rescue|[src/simulation/starship/modules.ts:28](../../src/simulation/starship/modules.ts)|[test/integration-i03-effects.test.ts:83](../../test/integration-i03-effects.test.ts)|
|yamato_support|[src/simulation/starship/advanced-support.ts:66](../../src/simulation/starship/advanced-support.ts)|[test/starship-advanced-support.test.ts:30](../../test/starship-advanced-support.test.ts)|

## 当前商店卡牌

563 个 ID 均经过原生资格／非零权重、真实抽取、购买、回执与重复拒绝检查；其中 300 张兵种功能牌与 10 张全队牌逐张测量实际恢复、能量、生产时间、生命、防护或输出。128 个补给组合、七商品各档、18 英雄和精英购买由对应功能回归核验。

|卡牌 ID|实际效果类型|原生来源兵种|逐张测量|
|---|---|---|---|
|fun-shop.gland.1|funShop|marine|对应运行时效果族回归|
|fun-shop.eye.1|funShop|marine|对应运行时效果族回归|
|fun-shop.nydus.1|funShop|marine|对应运行时效果族回归|
|fun-shop.tavern.1|funShop|marine|对应运行时效果族回归|
|fun-shop.tavern.2|funShop|marine|对应运行时效果族回归|
|fun-shop.tavern.3|funShop|marine|对应运行时效果族回归|
|fun-shop.bait.1|funShop|marine|对应运行时效果族回归|
|fun-shop.bait.2|funShop|marine|对应运行时效果族回归|
|fun-shop.bait.3|funShop|marine|对应运行时效果族回归|
|fun-shop.dice.1|funShop|marine|对应运行时效果族回归|
|fun-shop.pandora.1|funShop|marine|对应运行时效果族回归|
|team.firepower.white|teamCard|marine|前后值见 JSON|
|team.firepower.green|teamCard|marine|前后值见 JSON|
|team.firepower.blue|teamCard|marine|前后值见 JSON|
|team.firepower.purple|teamCard|marine|前后值见 JSON|
|team.firepower.orange|teamCard|marine|前后值见 JSON|
|team.defense.white|teamCard|marine|前后值见 JSON|
|team.defense.green|teamCard|marine|前后值见 JSON|
|team.defense.blue|teamCard|marine|前后值见 JSON|
|team.defense.purple|teamCard|marine|前后值见 JSON|
|team.defense.orange|teamCard|marine|前后值见 JSON|
|training.2|training|marine|对应运行时效果族回归|
|training.3|training|marine|对应运行时效果族回归|
|training.4|training|marine|对应运行时效果族回归|
|training.5|training|marine|对应运行时效果族回归|
|support.terran.mines|support|marine|对应运行时效果族回归|
|support.terran.bombardment|support|marine|对应运行时效果族回归|
|support.terran.mutation|support|marine|对应运行时效果族回归|
|support.terran.strategic|support|marine|对应运行时效果族回归|
|support.terran.ricochet|support|marine|对应运行时效果族回归|
|support.terran.bunker|support|marine|对应运行时效果族回归|
|support.terran.missiles|support|marine|对应运行时效果族回归|
|support.terran.overdrive|support|marine|对应运行时效果族回归|
|supply.pod.marine.1|supply|marine|对应运行时效果族回归|
|supply.pod.marine.2|supply|marine|对应运行时效果族回归|
|supply.pod.marine.3|supply|marine|对应运行时效果族回归|
|supply.direct.marine.1|supply|marine|对应运行时效果族回归|
|supply.direct.marine.2|supply|marine|对应运行时效果族回归|
|supply.direct.marine.3|supply|marine|对应运行时效果族回归|
|card.production.marine.white|card|marine|前后值见 JSON|
|card.production.marine.green|card|marine|前后值见 JSON|
|card.production.marine.blue|card|marine|前后值见 JSON|
|card.production.marine.purple|card|marine|前后值见 JSON|
|card.production.marine.orange|card|marine|前后值见 JSON|
|economy.minerals|resource|marine|对应运行时效果族回归|
|economy.gas|resource|marine|对应运行时效果族回归|
|economy.salvage|resource|marine|对应运行时效果族回归|
|economy.supply|resource|marine|对应运行时效果族回归|
|hero.raynor|hero|marine|对应运行时效果族回归|
|hero.tychus|hero|marine|对应运行时效果族回归|
|hero.nova|hero|marine|对应运行时效果族回归|
|hero.swann|hero|marine|对应运行时效果族回归|
|hero.tosh|hero|marine|对应运行时效果族回归|
|hero.yamato_battlecruiser|hero|marine|对应运行时效果族回归|
|elite.marine.1|elite|science_vessel|对应运行时效果族回归|
|elite.marine.1.v|elite|science_vessel|对应运行时效果族回归|
|card.production.marauder.white|card|marauder|前后值见 JSON|
|card.production.marauder.green|card|marauder|前后值见 JSON|
|card.production.marauder.blue|card|marauder|前后值见 JSON|
|card.production.marauder.purple|card|marauder|前后值见 JSON|
|card.production.marauder.orange|card|marauder|前后值见 JSON|
|elite.marauder.1|elite|marauder|对应运行时效果族回归|
|elite.marauder.1.v|elite|marauder|对应运行时效果族回归|
|card.recovery.reaper.white|card|reaper|前后值见 JSON|
|card.recovery.reaper.green|card|reaper|前后值见 JSON|
|card.recovery.reaper.blue|card|reaper|前后值见 JSON|
|card.recovery.reaper.purple|card|reaper|前后值见 JSON|
|card.recovery.reaper.orange|card|reaper|前后值见 JSON|
|card.production.reaper.white|card|reaper|前后值见 JSON|
|card.production.reaper.green|card|reaper|前后值见 JSON|
|card.production.reaper.blue|card|reaper|前后值见 JSON|
|card.production.reaper.purple|card|reaper|前后值见 JSON|
|card.production.reaper.orange|card|reaper|前后值见 JSON|
|elite.reaper.1|elite|reaper|对应运行时效果族回归|
|elite.reaper.1.v|elite|reaper|对应运行时效果族回归|
|supply.pod.hellion.1|supply|hellion|对应运行时效果族回归|
|supply.pod.hellion.2|supply|hellion|对应运行时效果族回归|
|supply.pod.hellion.3|supply|hellion|对应运行时效果族回归|
|supply.direct.hellion.1|supply|hellion|对应运行时效果族回归|
|supply.direct.hellion.2|supply|hellion|对应运行时效果族回归|
|supply.direct.hellion.3|supply|hellion|对应运行时效果族回归|
|card.production.hellion.white|card|hellion|前后值见 JSON|
|card.production.hellion.green|card|hellion|前后值见 JSON|
|card.production.hellion.blue|card|hellion|前后值见 JSON|
|card.production.hellion.purple|card|hellion|前后值见 JSON|
|card.production.hellion.orange|card|hellion|前后值见 JSON|
|elite.hellion.1|elite|hellion|对应运行时效果族回归|
|elite.hellion.1.v|elite|hellion|对应运行时效果族回归|
|supply.pod.tank.2|supply|tank|对应运行时效果族回归|
|supply.pod.tank.3|supply|tank|对应运行时效果族回归|
|supply.direct.tank.2|supply|tank|对应运行时效果族回归|
|supply.direct.tank.3|supply|tank|对应运行时效果族回归|
|card.production.tank.white|card|tank|前后值见 JSON|
|card.production.tank.green|card|tank|前后值见 JSON|
|card.production.tank.blue|card|tank|前后值见 JSON|
|card.production.tank.purple|card|tank|前后值见 JSON|
|card.production.tank.orange|card|tank|前后值见 JSON|
|elite.tank.1|elite|tank|对应运行时效果族回归|
|elite.tank.1.v|elite|tank|对应运行时效果族回归|
|supply.pod.thor.3|supply|thor|对应运行时效果族回归|
|supply.direct.thor.3|supply|thor|对应运行时效果族回归|
|card.production.thor.white|card|thor|前后值见 JSON|
|card.production.thor.green|card|thor|前后值见 JSON|
|card.production.thor.blue|card|thor|前后值见 JSON|
|card.production.thor.purple|card|thor|前后值见 JSON|
|card.production.thor.orange|card|thor|前后值见 JSON|
|elite.thor.1|elite|thor|对应运行时效果族回归|
|elite.thor.1.v|elite|thor|对应运行时效果族回归|
|supply.pod.medivac.1|supply|viking|对应运行时效果族回归|
|supply.pod.medivac.2|supply|viking|对应运行时效果族回归|
|supply.pod.medivac.3|supply|viking|对应运行时效果族回归|
|supply.direct.medivac.1|supply|viking|对应运行时效果族回归|
|supply.direct.medivac.2|supply|viking|对应运行时效果族回归|
|supply.direct.medivac.3|supply|viking|对应运行时效果族回归|
|card.production.viking.white|card|viking|前后值见 JSON|
|card.production.viking.green|card|viking|前后值见 JSON|
|card.production.viking.blue|card|viking|前后值见 JSON|
|card.production.viking.purple|card|viking|前后值见 JSON|
|card.production.viking.orange|card|viking|前后值见 JSON|
|elite.viking.1|elite|viking|对应运行时效果族回归|
|elite.viking.1.v|elite|viking|对应运行时效果族回归|
|supply.pod.viking.2|supply|banshee|对应运行时效果族回归|
|supply.pod.viking.3|supply|banshee|对应运行时效果族回归|
|supply.direct.viking.2|supply|banshee|对应运行时效果族回归|
|supply.direct.viking.3|supply|banshee|对应运行时效果族回归|
|supply.pod.banshee.2|supply|banshee|对应运行时效果族回归|
|supply.pod.banshee.3|supply|banshee|对应运行时效果族回归|
|supply.direct.banshee.2|supply|banshee|对应运行时效果族回归|
|supply.direct.banshee.3|supply|banshee|对应运行时效果族回归|
|supply.pod.science_vessel.2|supply|banshee|对应运行时效果族回归|
|supply.pod.science_vessel.3|supply|banshee|对应运行时效果族回归|
|supply.direct.science_vessel.2|supply|banshee|对应运行时效果族回归|
|supply.direct.science_vessel.3|supply|banshee|对应运行时效果族回归|
|card.energy.banshee.white|card|banshee|前后值见 JSON|
|card.energy.banshee.green|card|banshee|前后值见 JSON|
|card.energy.banshee.blue|card|banshee|前后值见 JSON|
|card.energy.banshee.purple|card|banshee|前后值见 JSON|
|card.energy.banshee.orange|card|banshee|前后值见 JSON|
|card.production.banshee.white|card|banshee|前后值见 JSON|
|card.production.banshee.green|card|banshee|前后值见 JSON|
|card.production.banshee.blue|card|banshee|前后值见 JSON|
|card.production.banshee.purple|card|banshee|前后值见 JSON|
|card.production.banshee.orange|card|banshee|前后值见 JSON|
|elite.banshee.1|elite|banshee|对应运行时效果族回归|
|elite.banshee.1.v|elite|banshee|对应运行时效果族回归|
|card.recovery.medivac.white|card|medivac|前后值见 JSON|
|card.recovery.medivac.green|card|medivac|前后值见 JSON|
|card.recovery.medivac.blue|card|medivac|前后值见 JSON|
|card.recovery.medivac.purple|card|medivac|前后值见 JSON|
|card.recovery.medivac.orange|card|medivac|前后值见 JSON|
|card.energy.medivac.white|card|medivac|前后值见 JSON|
|card.energy.medivac.green|card|medivac|前后值见 JSON|
|card.energy.medivac.blue|card|medivac|前后值见 JSON|
|card.energy.medivac.purple|card|medivac|前后值见 JSON|
|card.energy.medivac.orange|card|medivac|前后值见 JSON|
|card.production.medivac.white|card|medivac|前后值见 JSON|
|card.production.medivac.green|card|medivac|前后值见 JSON|
|card.production.medivac.blue|card|medivac|前后值见 JSON|
|card.production.medivac.purple|card|medivac|前后值见 JSON|
|card.production.medivac.orange|card|medivac|前后值见 JSON|
|elite.medivac.1|elite|medivac|对应运行时效果族回归|
|elite.medivac.1.v|elite|medivac|对应运行时效果族回归|
|card.recovery.science_vessel.white|card|science_vessel|前后值见 JSON|
|card.recovery.science_vessel.green|card|science_vessel|前后值见 JSON|
|card.recovery.science_vessel.blue|card|science_vessel|前后值见 JSON|
|card.recovery.science_vessel.purple|card|science_vessel|前后值见 JSON|
|card.recovery.science_vessel.orange|card|science_vessel|前后值见 JSON|
|card.energy.science_vessel.white|card|science_vessel|前后值见 JSON|
|card.energy.science_vessel.green|card|science_vessel|前后值见 JSON|
|card.energy.science_vessel.blue|card|science_vessel|前后值见 JSON|
|card.energy.science_vessel.purple|card|science_vessel|前后值见 JSON|
|card.energy.science_vessel.orange|card|science_vessel|前后值见 JSON|
|card.production.science_vessel.white|card|science_vessel|前后值见 JSON|
|card.production.science_vessel.green|card|science_vessel|前后值见 JSON|
|card.production.science_vessel.blue|card|science_vessel|前后值见 JSON|
|card.production.science_vessel.purple|card|science_vessel|前后值见 JSON|
|card.production.science_vessel.orange|card|science_vessel|前后值见 JSON|
|elite.science_vessel.1|elite|science_vessel|对应运行时效果族回归|
|elite.science_vessel.1.v|elite|science_vessel|对应运行时效果族回归|
|support.zerg.mines|support|zergling|对应运行时效果族回归|
|support.zerg.bombardment|support|zergling|对应运行时效果族回归|
|support.zerg.strategic|support|zergling|对应运行时效果族回归|
|support.zerg.hatch|support|zergling|对应运行时效果族回归|
|support.zerg.consume|support|zergling|对应运行时效果族回归|
|support.zerg.parasite|support|zergling|对应运行时效果族回归|
|support.zerg.evolve|support|zergling|对应运行时效果族回归|
|supply.pod.zergling.1|supply|zergling|对应运行时效果族回归|
|supply.pod.zergling.2|supply|zergling|对应运行时效果族回归|
|supply.pod.zergling.3|supply|zergling|对应运行时效果族回归|
|supply.direct.zergling.1|supply|zergling|对应运行时效果族回归|
|supply.direct.zergling.2|supply|zergling|对应运行时效果族回归|
|supply.direct.zergling.3|supply|zergling|对应运行时效果族回归|
|supply.pod.roach.1|supply|zergling|对应运行时效果族回归|
|supply.pod.roach.2|supply|zergling|对应运行时效果族回归|
|supply.pod.roach.3|supply|zergling|对应运行时效果族回归|
|supply.direct.roach.1|supply|zergling|对应运行时效果族回归|
|supply.direct.roach.2|supply|zergling|对应运行时效果族回归|
|supply.direct.roach.3|supply|zergling|对应运行时效果族回归|
|supply.pod.queen.1|supply|zergling|对应运行时效果族回归|
|supply.pod.queen.2|supply|zergling|对应运行时效果族回归|
|supply.pod.queen.3|supply|zergling|对应运行时效果族回归|
|supply.direct.queen.1|supply|zergling|对应运行时效果族回归|
|supply.direct.queen.2|supply|zergling|对应运行时效果族回归|
|supply.direct.queen.3|supply|zergling|对应运行时效果族回归|
|card.recovery.zergling.white|card|zergling|前后值见 JSON|
|card.recovery.zergling.green|card|zergling|前后值见 JSON|
|card.recovery.zergling.blue|card|zergling|前后值见 JSON|
|card.recovery.zergling.purple|card|zergling|前后值见 JSON|
|card.recovery.zergling.orange|card|zergling|前后值见 JSON|
|card.production.zergling.white|card|zergling|前后值见 JSON|
|card.production.zergling.green|card|zergling|前后值见 JSON|
|card.production.zergling.blue|card|zergling|前后值见 JSON|
|card.production.zergling.purple|card|zergling|前后值见 JSON|
|card.production.zergling.orange|card|zergling|前后值见 JSON|
|hero.kerrigan|hero|zergling|对应运行时效果族回归|
|hero.zagara|hero|zergling|对应运行时效果族回归|
|hero.dehaka|hero|zergling|对应运行时效果族回归|
|hero.stukov|hero|zergling|对应运行时效果族回归|
|hero.niadra|hero|zergling|对应运行时效果族回归|
|hero.hots_leviathan|hero|zergling|对应运行时效果族回归|
|elite.zergling.1|elite|ultralisk|对应运行时效果族回归|
|elite.zergling.1.v|elite|ultralisk|对应运行时效果族回归|
|card.recovery.baneling.white|card|baneling|前后值见 JSON|
|card.recovery.baneling.green|card|baneling|前后值见 JSON|
|card.recovery.baneling.blue|card|baneling|前后值见 JSON|
|card.recovery.baneling.purple|card|baneling|前后值见 JSON|
|card.recovery.baneling.orange|card|baneling|前后值见 JSON|
|card.production.baneling.white|card|baneling|前后值见 JSON|
|card.production.baneling.green|card|baneling|前后值见 JSON|
|card.production.baneling.blue|card|baneling|前后值见 JSON|
|card.production.baneling.purple|card|baneling|前后值见 JSON|
|card.production.baneling.orange|card|baneling|前后值见 JSON|
|elite.baneling.1|elite|baneling|对应运行时效果族回归|
|elite.baneling.1.v|elite|baneling|对应运行时效果族回归|
|card.recovery.roach.white|card|roach|前后值见 JSON|
|card.recovery.roach.green|card|roach|前后值见 JSON|
|card.recovery.roach.blue|card|roach|前后值见 JSON|
|card.recovery.roach.purple|card|roach|前后值见 JSON|
|card.recovery.roach.orange|card|roach|前后值见 JSON|
|card.production.roach.white|card|roach|前后值见 JSON|
|card.production.roach.green|card|roach|前后值见 JSON|
|card.production.roach.blue|card|roach|前后值见 JSON|
|card.production.roach.purple|card|roach|前后值见 JSON|
|card.production.roach.orange|card|roach|前后值见 JSON|
|elite.roach.1|elite|roach|对应运行时效果族回归|
|elite.roach.1.v|elite|roach|对应运行时效果族回归|
|card.recovery.ravager.white|card|ravager|前后值见 JSON|
|card.recovery.ravager.green|card|ravager|前后值见 JSON|
|card.recovery.ravager.blue|card|ravager|前后值见 JSON|
|card.recovery.ravager.purple|card|ravager|前后值见 JSON|
|card.recovery.ravager.orange|card|ravager|前后值见 JSON|
|card.production.ravager.white|card|ravager|前后值见 JSON|
|card.production.ravager.green|card|ravager|前后值见 JSON|
|card.production.ravager.blue|card|ravager|前后值见 JSON|
|card.production.ravager.purple|card|ravager|前后值见 JSON|
|card.production.ravager.orange|card|ravager|前后值见 JSON|
|elite.ravager.1|elite|ravager|对应运行时效果族回归|
|elite.ravager.1.v|elite|ravager|对应运行时效果族回归|
|support.zerg.mutation|support|hydralisk|对应运行时效果族回归|
|card.recovery.hydralisk.white|card|hydralisk|前后值见 JSON|
|card.recovery.hydralisk.green|card|hydralisk|前后值见 JSON|
|card.recovery.hydralisk.blue|card|hydralisk|前后值见 JSON|
|card.recovery.hydralisk.purple|card|hydralisk|前后值见 JSON|
|card.recovery.hydralisk.orange|card|hydralisk|前后值见 JSON|
|card.production.hydralisk.white|card|hydralisk|前后值见 JSON|
|card.production.hydralisk.green|card|hydralisk|前后值见 JSON|
|card.production.hydralisk.blue|card|hydralisk|前后值见 JSON|
|card.production.hydralisk.purple|card|hydralisk|前后值见 JSON|
|card.production.hydralisk.orange|card|hydralisk|前后值见 JSON|
|elite.hydralisk.1|elite|hydralisk|对应运行时效果族回归|
|elite.hydralisk.1.v|elite|hydralisk|对应运行时效果族回归|
|card.recovery.queen.white|card|queen|前后值见 JSON|
|card.recovery.queen.green|card|queen|前后值见 JSON|
|card.recovery.queen.blue|card|queen|前后值见 JSON|
|card.recovery.queen.purple|card|queen|前后值见 JSON|
|card.recovery.queen.orange|card|queen|前后值见 JSON|
|card.energy.queen.white|card|queen|前后值见 JSON|
|card.energy.queen.green|card|queen|前后值见 JSON|
|card.energy.queen.blue|card|queen|前后值见 JSON|
|card.energy.queen.purple|card|queen|前后值见 JSON|
|card.energy.queen.orange|card|queen|前后值见 JSON|
|card.production.queen.white|card|queen|前后值见 JSON|
|card.production.queen.green|card|queen|前后值见 JSON|
|card.production.queen.blue|card|queen|前后值见 JSON|
|card.production.queen.purple|card|queen|前后值见 JSON|
|card.production.queen.orange|card|queen|前后值见 JSON|
|elite.queen.1|elite|queen|对应运行时效果族回归|
|elite.queen.1.v|elite|queen|对应运行时效果族回归|
|card.recovery.lurker.white|card|lurker|前后值见 JSON|
|card.recovery.lurker.green|card|lurker|前后值见 JSON|
|card.recovery.lurker.blue|card|lurker|前后值见 JSON|
|card.recovery.lurker.purple|card|lurker|前后值见 JSON|
|card.recovery.lurker.orange|card|lurker|前后值见 JSON|
|card.production.lurker.white|card|lurker|前后值见 JSON|
|card.production.lurker.green|card|lurker|前后值见 JSON|
|card.production.lurker.blue|card|lurker|前后值见 JSON|
|card.production.lurker.purple|card|lurker|前后值见 JSON|
|card.production.lurker.orange|card|lurker|前后值见 JSON|
|elite.lurker.1|elite|lurker|对应运行时效果族回归|
|elite.lurker.1.v|elite|lurker|对应运行时效果族回归|
|card.recovery.mutalisk.white|card|mutalisk|前后值见 JSON|
|card.recovery.mutalisk.green|card|mutalisk|前后值见 JSON|
|card.recovery.mutalisk.blue|card|mutalisk|前后值见 JSON|
|card.recovery.mutalisk.purple|card|mutalisk|前后值见 JSON|
|card.recovery.mutalisk.orange|card|mutalisk|前后值见 JSON|
|card.production.mutalisk.white|card|mutalisk|前后值见 JSON|
|card.production.mutalisk.green|card|mutalisk|前后值见 JSON|
|card.production.mutalisk.blue|card|mutalisk|前后值见 JSON|
|card.production.mutalisk.purple|card|mutalisk|前后值见 JSON|
|card.production.mutalisk.orange|card|mutalisk|前后值见 JSON|
|elite.mutalisk.1|elite|mutalisk|对应运行时效果族回归|
|elite.mutalisk.1.v|elite|mutalisk|对应运行时效果族回归|
|card.recovery.corruptor.white|card|corruptor|前后值见 JSON|
|card.recovery.corruptor.green|card|corruptor|前后值见 JSON|
|card.recovery.corruptor.blue|card|corruptor|前后值见 JSON|
|card.recovery.corruptor.purple|card|corruptor|前后值见 JSON|
|card.recovery.corruptor.orange|card|corruptor|前后值见 JSON|
|card.production.corruptor.white|card|corruptor|前后值见 JSON|
|card.production.corruptor.green|card|corruptor|前后值见 JSON|
|card.production.corruptor.blue|card|corruptor|前后值见 JSON|
|card.production.corruptor.purple|card|corruptor|前后值见 JSON|
|card.production.corruptor.orange|card|corruptor|前后值见 JSON|
|elite.corruptor.1|elite|corruptor|对应运行时效果族回归|
|elite.corruptor.1.v|elite|corruptor|对应运行时效果族回归|
|card.recovery.ultralisk.white|card|ultralisk|前后值见 JSON|
|card.recovery.ultralisk.green|card|ultralisk|前后值见 JSON|
|card.recovery.ultralisk.blue|card|ultralisk|前后值见 JSON|
|card.recovery.ultralisk.purple|card|ultralisk|前后值见 JSON|
|card.recovery.ultralisk.orange|card|ultralisk|前后值见 JSON|
|card.production.ultralisk.white|card|ultralisk|前后值见 JSON|
|card.production.ultralisk.green|card|ultralisk|前后值见 JSON|
|card.production.ultralisk.blue|card|ultralisk|前后值见 JSON|
|card.production.ultralisk.purple|card|ultralisk|前后值见 JSON|
|card.production.ultralisk.orange|card|ultralisk|前后值见 JSON|
|elite.ultralisk.1|elite|ultralisk|对应运行时效果族回归|
|elite.ultralisk.1.v|elite|ultralisk|对应运行时效果族回归|
|support.protoss.mines|support|zealot|对应运行时效果族回归|
|support.protoss.bombardment|support|zealot|对应运行时效果族回归|
|support.protoss.strategic|support|zealot|对应运行时效果族回归|
|support.protoss.reserve|support|zealot|对应运行时效果族回归|
|support.protoss.counter|support|zealot|对应运行时效果族回归|
|support.protoss.echo|support|zealot|对应运行时效果族回归|
|support.protoss.prism|support|zealot|对应运行时效果族回归|
|supply.pod.zealot.1|supply|zealot|对应运行时效果族回归|
|supply.pod.zealot.2|supply|zealot|对应运行时效果族回归|
|supply.pod.zealot.3|supply|zealot|对应运行时效果族回归|
|supply.direct.zealot.1|supply|zealot|对应运行时效果族回归|
|supply.direct.zealot.2|supply|zealot|对应运行时效果族回归|
|supply.direct.zealot.3|supply|zealot|对应运行时效果族回归|
|supply.pod.adept.1|supply|zealot|对应运行时效果族回归|
|supply.pod.adept.2|supply|zealot|对应运行时效果族回归|
|supply.pod.adept.3|supply|zealot|对应运行时效果族回归|
|supply.direct.adept.1|supply|zealot|对应运行时效果族回归|
|supply.direct.adept.2|supply|zealot|对应运行时效果族回归|
|supply.direct.adept.3|supply|zealot|对应运行时效果族回归|
|card.recovery.zealot.white|card|zealot|前后值见 JSON|
|card.recovery.zealot.green|card|zealot|前后值见 JSON|
|card.recovery.zealot.blue|card|zealot|前后值见 JSON|
|card.recovery.zealot.purple|card|zealot|前后值见 JSON|
|card.recovery.zealot.orange|card|zealot|前后值见 JSON|
|card.production.zealot.white|card|zealot|前后值见 JSON|
|card.production.zealot.green|card|zealot|前后值见 JSON|
|card.production.zealot.blue|card|zealot|前后值见 JSON|
|card.production.zealot.purple|card|zealot|前后值见 JSON|
|card.production.zealot.orange|card|zealot|前后值见 JSON|
|hero.artanis|hero|zealot|对应运行时效果族回归|
|hero.zeratul|hero|zealot|对应运行时效果族回归|
|hero.alarak|hero|zealot|对应运行时效果族回归|
|hero.fenix|hero|zealot|对应运行时效果族回归|
|hero.vorazun|hero|zealot|对应运行时效果族回归|
|hero.purifier_flagship|hero|zealot|对应运行时效果族回归|
|elite.zealot.1|elite|carrier|对应运行时效果族回归|
|elite.zealot.1.v|elite|carrier|对应运行时效果族回归|
|card.recovery.adept.white|card|adept|前后值见 JSON|
|card.recovery.adept.green|card|adept|前后值见 JSON|
|card.recovery.adept.blue|card|adept|前后值见 JSON|
|card.recovery.adept.purple|card|adept|前后值见 JSON|
|card.recovery.adept.orange|card|adept|前后值见 JSON|
|card.production.adept.white|card|adept|前后值见 JSON|
|card.production.adept.green|card|adept|前后值见 JSON|
|card.production.adept.blue|card|adept|前后值见 JSON|
|card.production.adept.purple|card|adept|前后值见 JSON|
|card.production.adept.orange|card|adept|前后值见 JSON|
|elite.adept.1|elite|adept|对应运行时效果族回归|
|elite.adept.1.v|elite|adept|对应运行时效果族回归|
|support.protoss.mutation|support|stalker|对应运行时效果族回归|
|card.recovery.stalker.white|card|stalker|前后值见 JSON|
|card.recovery.stalker.green|card|stalker|前后值见 JSON|
|card.recovery.stalker.blue|card|stalker|前后值见 JSON|
|card.recovery.stalker.purple|card|stalker|前后值见 JSON|
|card.recovery.stalker.orange|card|stalker|前后值见 JSON|
|card.production.stalker.white|card|stalker|前后值见 JSON|
|card.production.stalker.green|card|stalker|前后值见 JSON|
|card.production.stalker.blue|card|stalker|前后值见 JSON|
|card.production.stalker.purple|card|stalker|前后值见 JSON|
|card.production.stalker.orange|card|stalker|前后值见 JSON|
|elite.stalker.1|elite|stalker|对应运行时效果族回归|
|elite.stalker.1.v|elite|stalker|对应运行时效果族回归|
|card.recovery.sentry.white|card|sentry|前后值见 JSON|
|card.recovery.sentry.green|card|sentry|前后值见 JSON|
|card.recovery.sentry.blue|card|sentry|前后值见 JSON|
|card.recovery.sentry.purple|card|sentry|前后值见 JSON|
|card.recovery.sentry.orange|card|sentry|前后值见 JSON|
|card.energy.sentry.white|card|sentry|前后值见 JSON|
|card.energy.sentry.green|card|sentry|前后值见 JSON|
|card.energy.sentry.blue|card|sentry|前后值见 JSON|
|card.energy.sentry.purple|card|sentry|前后值见 JSON|
|card.energy.sentry.orange|card|sentry|前后值见 JSON|
|card.production.sentry.white|card|sentry|前后值见 JSON|
|card.production.sentry.green|card|sentry|前后值见 JSON|
|card.production.sentry.blue|card|sentry|前后值见 JSON|
|card.production.sentry.purple|card|sentry|前后值见 JSON|
|card.production.sentry.orange|card|sentry|前后值见 JSON|
|elite.sentry.1|elite|sentry|对应运行时效果族回归|
|elite.sentry.1.v|elite|sentry|对应运行时效果族回归|
|supply.pod.immortal.2|supply|immortal|对应运行时效果族回归|
|supply.pod.immortal.3|supply|immortal|对应运行时效果族回归|
|supply.direct.immortal.2|supply|immortal|对应运行时效果族回归|
|supply.direct.immortal.3|supply|immortal|对应运行时效果族回归|
|card.recovery.immortal.white|card|immortal|前后值见 JSON|
|card.recovery.immortal.green|card|immortal|前后值见 JSON|
|card.recovery.immortal.blue|card|immortal|前后值见 JSON|
|card.recovery.immortal.purple|card|immortal|前后值见 JSON|
|card.recovery.immortal.orange|card|immortal|前后值见 JSON|
|card.production.immortal.white|card|immortal|前后值见 JSON|
|card.production.immortal.green|card|immortal|前后值见 JSON|
|card.production.immortal.blue|card|immortal|前后值见 JSON|
|card.production.immortal.purple|card|immortal|前后值见 JSON|
|card.production.immortal.orange|card|immortal|前后值见 JSON|
|elite.immortal.1|elite|immortal|对应运行时效果族回归|
|elite.immortal.1.v|elite|immortal|对应运行时效果族回归|
|card.recovery.colossus.white|card|colossus|前后值见 JSON|
|card.recovery.colossus.green|card|colossus|前后值见 JSON|
|card.recovery.colossus.blue|card|colossus|前后值见 JSON|
|card.recovery.colossus.purple|card|colossus|前后值见 JSON|
|card.recovery.colossus.orange|card|colossus|前后值见 JSON|
|card.production.colossus.white|card|colossus|前后值见 JSON|
|card.production.colossus.green|card|colossus|前后值见 JSON|
|card.production.colossus.blue|card|colossus|前后值见 JSON|
|card.production.colossus.purple|card|colossus|前后值见 JSON|
|card.production.colossus.orange|card|colossus|前后值见 JSON|
|elite.colossus.1|elite|colossus|对应运行时效果族回归|
|elite.colossus.1.v|elite|colossus|对应运行时效果族回归|
|supply.pod.phoenix.1|supply|high_templar|对应运行时效果族回归|
|supply.pod.phoenix.2|supply|high_templar|对应运行时效果族回归|
|supply.pod.phoenix.3|supply|high_templar|对应运行时效果族回归|
|supply.direct.phoenix.1|supply|high_templar|对应运行时效果族回归|
|supply.direct.phoenix.2|supply|high_templar|对应运行时效果族回归|
|supply.direct.phoenix.3|supply|high_templar|对应运行时效果族回归|
|card.recovery.high_templar.white|card|high_templar|前后值见 JSON|
|card.recovery.high_templar.green|card|high_templar|前后值见 JSON|
|card.recovery.high_templar.blue|card|high_templar|前后值见 JSON|
|card.recovery.high_templar.purple|card|high_templar|前后值见 JSON|
|card.recovery.high_templar.orange|card|high_templar|前后值见 JSON|
|card.energy.high_templar.white|card|high_templar|前后值见 JSON|
|card.energy.high_templar.green|card|high_templar|前后值见 JSON|
|card.energy.high_templar.blue|card|high_templar|前后值见 JSON|
|card.energy.high_templar.purple|card|high_templar|前后值见 JSON|
|card.energy.high_templar.orange|card|high_templar|前后值见 JSON|
|card.production.high_templar.white|card|high_templar|前后值见 JSON|
|card.production.high_templar.green|card|high_templar|前后值见 JSON|
|card.production.high_templar.blue|card|high_templar|前后值见 JSON|
|card.production.high_templar.purple|card|high_templar|前后值见 JSON|
|card.production.high_templar.orange|card|high_templar|前后值见 JSON|
|elite.high_templar.1|elite|high_templar|对应运行时效果族回归|
|elite.high_templar.1.v|elite|high_templar|对应运行时效果族回归|
|card.recovery.phoenix.white|card|phoenix|前后值见 JSON|
|card.recovery.phoenix.green|card|phoenix|前后值见 JSON|
|card.recovery.phoenix.blue|card|phoenix|前后值见 JSON|
|card.recovery.phoenix.purple|card|phoenix|前后值见 JSON|
|card.recovery.phoenix.orange|card|phoenix|前后值见 JSON|
|card.energy.phoenix.white|card|phoenix|前后值见 JSON|
|card.energy.phoenix.green|card|phoenix|前后值见 JSON|
|card.energy.phoenix.blue|card|phoenix|前后值见 JSON|
|card.energy.phoenix.purple|card|phoenix|前后值见 JSON|
|card.energy.phoenix.orange|card|phoenix|前后值见 JSON|
|card.production.phoenix.white|card|phoenix|前后值见 JSON|
|card.production.phoenix.green|card|phoenix|前后值见 JSON|
|card.production.phoenix.blue|card|phoenix|前后值见 JSON|
|card.production.phoenix.purple|card|phoenix|前后值见 JSON|
|card.production.phoenix.orange|card|phoenix|前后值见 JSON|
|elite.phoenix.1|elite|phoenix|对应运行时效果族回归|
|elite.phoenix.1.v|elite|phoenix|对应运行时效果族回归|
|supply.pod.void_ray.2|supply|void_ray|对应运行时效果族回归|
|supply.pod.void_ray.3|supply|void_ray|对应运行时效果族回归|
|supply.direct.void_ray.2|supply|void_ray|对应运行时效果族回归|
|supply.direct.void_ray.3|supply|void_ray|对应运行时效果族回归|
|card.recovery.void_ray.white|card|void_ray|前后值见 JSON|
|card.recovery.void_ray.green|card|void_ray|前后值见 JSON|
|card.recovery.void_ray.blue|card|void_ray|前后值见 JSON|
|card.recovery.void_ray.purple|card|void_ray|前后值见 JSON|
|card.recovery.void_ray.orange|card|void_ray|前后值见 JSON|
|card.production.void_ray.white|card|void_ray|前后值见 JSON|
|card.production.void_ray.green|card|void_ray|前后值见 JSON|
|card.production.void_ray.blue|card|void_ray|前后值见 JSON|
|card.production.void_ray.purple|card|void_ray|前后值见 JSON|
|card.production.void_ray.orange|card|void_ray|前后值见 JSON|
|elite.void_ray.1|elite|void_ray|对应运行时效果族回归|
|elite.void_ray.1.v|elite|void_ray|对应运行时效果族回归|
|card.recovery.carrier.white|card|carrier|前后值见 JSON|
|card.recovery.carrier.green|card|carrier|前后值见 JSON|
|card.recovery.carrier.blue|card|carrier|前后值见 JSON|
|card.recovery.carrier.purple|card|carrier|前后值见 JSON|
|card.recovery.carrier.orange|card|carrier|前后值见 JSON|
|card.production.carrier.white|card|carrier|前后值见 JSON|
|card.production.carrier.green|card|carrier|前后值见 JSON|
|card.production.carrier.blue|card|carrier|前后值见 JSON|
|card.production.carrier.purple|card|carrier|前后值见 JSON|
|card.production.carrier.orange|card|carrier|前后值见 JSON|
|elite.carrier.1|elite|carrier|对应运行时效果族回归|
|elite.carrier.1.v|elite|carrier|对应运行时效果族回归|
|supply.pod.marauder.2|supply|marauder|对应运行时效果族回归|
|supply.pod.marauder.3|supply|marauder|对应运行时效果族回归|
|supply.direct.marauder.2|supply|marauder|对应运行时效果族回归|
|supply.direct.marauder.3|supply|marauder|对应运行时效果族回归|
|supply.pod.reaper.2|supply|reaper|对应运行时效果族回归|
|supply.pod.reaper.3|supply|reaper|对应运行时效果族回归|
|supply.direct.reaper.2|supply|reaper|对应运行时效果族回归|
|supply.direct.reaper.3|supply|reaper|对应运行时效果族回归|
|supply.pod.baneling.2|supply|baneling|对应运行时效果族回归|
|supply.pod.baneling.3|supply|baneling|对应运行时效果族回归|
|supply.direct.baneling.2|supply|baneling|对应运行时效果族回归|
|supply.direct.baneling.3|supply|baneling|对应运行时效果族回归|
|supply.pod.ravager.2|supply|ravager|对应运行时效果族回归|
|supply.pod.ravager.3|supply|ravager|对应运行时效果族回归|
|supply.direct.ravager.2|supply|ravager|对应运行时效果族回归|
|supply.direct.ravager.3|supply|ravager|对应运行时效果族回归|
|supply.pod.hydralisk.2|supply|hydralisk|对应运行时效果族回归|
|supply.pod.hydralisk.3|supply|hydralisk|对应运行时效果族回归|
|supply.direct.hydralisk.2|supply|hydralisk|对应运行时效果族回归|
|supply.direct.hydralisk.3|supply|hydralisk|对应运行时效果族回归|
|supply.pod.lurker.3|supply|lurker|对应运行时效果族回归|
|supply.direct.lurker.3|supply|lurker|对应运行时效果族回归|
|supply.pod.mutalisk.2|supply|mutalisk|对应运行时效果族回归|
|supply.pod.mutalisk.3|supply|mutalisk|对应运行时效果族回归|
|supply.direct.mutalisk.2|supply|mutalisk|对应运行时效果族回归|
|supply.direct.mutalisk.3|supply|mutalisk|对应运行时效果族回归|
|supply.pod.corruptor.2|supply|corruptor|对应运行时效果族回归|
|supply.pod.corruptor.3|supply|corruptor|对应运行时效果族回归|
|supply.direct.corruptor.2|supply|corruptor|对应运行时效果族回归|
|supply.direct.corruptor.3|supply|corruptor|对应运行时效果族回归|
|supply.pod.ultralisk.3|supply|ultralisk|对应运行时效果族回归|
|supply.direct.ultralisk.3|supply|ultralisk|对应运行时效果族回归|
|supply.pod.stalker.2|supply|stalker|对应运行时效果族回归|
|supply.pod.stalker.3|supply|stalker|对应运行时效果族回归|
|supply.direct.stalker.2|supply|stalker|对应运行时效果族回归|
|supply.direct.stalker.3|supply|stalker|对应运行时效果族回归|
|supply.pod.sentry.2|supply|sentry|对应运行时效果族回归|
|supply.pod.sentry.3|supply|sentry|对应运行时效果族回归|
|supply.direct.sentry.2|supply|sentry|对应运行时效果族回归|
|supply.direct.sentry.3|supply|sentry|对应运行时效果族回归|
|supply.pod.colossus.3|supply|colossus|对应运行时效果族回归|
|supply.direct.colossus.3|supply|colossus|对应运行时效果族回归|
|supply.pod.high_templar.2|supply|high_templar|对应运行时效果族回归|
|supply.pod.high_templar.3|supply|high_templar|对应运行时效果族回归|
|supply.direct.high_templar.2|supply|high_templar|对应运行时效果族回归|
|supply.direct.high_templar.3|supply|high_templar|对应运行时效果族回归|
|supply.pod.carrier.3|supply|carrier|对应运行时效果族回归|
|supply.direct.carrier.3|supply|carrier|对应运行时效果族回归|
|fun-shop.dice.2|funShop|marine|对应运行时效果族回归|
|fun-shop.dice.3|funShop|marine|对应运行时效果族回归|
|fun-shop.dice.4|funShop|marine|对应运行时效果族回归|
|fun-shop.dice.5|funShop|marine|对应运行时效果族回归|

## 发展与身份

82 个发展项目的 157 个等级／自动解锁节点、30 个生产兵种都有原生路径。发展明细含种子、方向、阶段、报价和支付。

|节点|来源|
|---|---|
|barracks:1|native opening|
|unlock.marine:1|native opening or facility/evolution automatic unlock|
|barracks:2|terran seed 1|
|unlock.reaper:1|terran seed 1|
|system.barracks:1|terran seed 1|
|factory:1|terran seed 1|
|unlock.hellion:1|native opening or facility/evolution automatic unlock|
|barracks:3|terran seed 1|
|starport:1|terran seed 1|
|unlock.medivac:1|native opening or facility/evolution automatic unlock|
|infernal:1|terran seed 1|
|research.barracks.defense:1|terran seed 1|
|factory:2|terran seed 1|
|starport:2|terran seed 1|
|shield:1|terran seed 1|
|research.barracks.defense:2|terran seed 1|
|barracks:4|terran seed 1|
|stim:1|terran seed 1|
|research.barracks.weapon:1|terran seed 1|
|factory:3|terran seed 1|
|barracks:5|terran seed 1|
|starport:3|terran seed 1|
|system.factory:1|terran seed 2|
|research.factory.weapon:1|terran seed 2|
|research.factory.defense:1|terran seed 2|
|research.factory.defense:2|terran seed 2|
|factory:4|terran seed 2|
|unlock.tank:1|terran seed 2|
|research.factory.defense:3|terran seed 2|
|unlock.thor:1|terran seed 2|
|research.factory.weapon:2|terran seed 2|
|factory:5|terran seed 2|
|unlock.marauder:1|terran seed 3|
|unlock.science_vessel:1|terran seed 3|
|support_efficiency:1|terran seed 3|
|unlock.viking:1|terran seed 3|
|system.starport:1|terran seed 3|
|research.barracks.weapon:2|terran seed 3|
|research.starport.weapon:1|terran seed 3|
|research.starport.defense:1|terran seed 3|
|research.starport.defense:2|terran seed 4|
|research.factory.weapon:3|terran seed 5|
|starport:4|terran seed 7|
|research.barracks.defense:3|terran seed 9|
|research.barracks.weapon:3|terran seed 9|
|research.starport.weapon:2|terran seed 10|
|starport:5|terran seed 10|
|research.starport.weapon:3|terran seed 10|
|unlock.banshee:1|terran seed 13|
|research.starport.defense:3|terran seed 15|
|cloak:1|terran seed 24|
|hatchery:1|native opening|
|unlock.zergling:1|native opening or facility/evolution automatic unlock|
|hatchery:2|zerg seed 1|
|unlock.queen:1|zerg seed 1|
|hatchery:3|zerg seed 1|
|hatchery:4|zerg seed 1|
|evolve-zerg.evolution:1|zerg seed 1|
|unlock.hydralisk:1|native opening or facility/evolution automatic unlock|
|hydra_range:1|zerg seed 1|
|hatchery:5|zerg seed 1|
|hatchery:6|zerg seed 1|
|evolve-zerg.air:1|zerg seed 1|
|unlock.mutalisk:1|native opening or facility/evolution automatic unlock|
|system.zerg.air:1|zerg seed 1|
|hatchery:7|zerg seed 1|
|ling_speed:1|zerg seed 1|
|hatchery:8|zerg seed 1|
|system.zerg.basic:1|zerg seed 1|
|hatchery:9|zerg seed 1|
|hatchery:10|zerg seed 1|
|hatchery:11|zerg seed 1|
|research.zerg.basic.defense:1|zerg seed 1|
|unlock.roach:1|zerg seed 2|
|unlock.baneling:1|zerg seed 2|
|roach_speed:1|zerg seed 2|
|system.zerg.evolution:1|zerg seed 2|
|bane_speed:1|zerg seed 2|
|research.zerg.evolution.weapon:1|zerg seed 2|
|unlock.corruptor:1|zerg seed 2|
|research.zerg.evolution.defense:1|zerg seed 2|
|unlock.ravager:1|zerg seed 3|
|unlock.lurker:1|zerg seed 3|
|unlock.ultralisk:1|zerg seed 3|
|research.zerg.basic.weapon:1|zerg seed 3|
|lurker_deploy:1|zerg seed 3|
|research.zerg.air.weapon:1|zerg seed 3|
|research.zerg.basic.weapon:2|zerg seed 4|
|research.zerg.basic.weapon:3|zerg seed 4|
|hatchery:12|zerg seed 4|
|research.zerg.basic.defense:2|zerg seed 5|
|research.zerg.basic.defense:3|zerg seed 5|
|research.zerg.evolution.weapon:2|zerg seed 6|
|hatchery:13|zerg seed 7|
|hatchery:14|zerg seed 7|
|research.zerg.air.defense:1|zerg seed 10|
|research.zerg.air.weapon:2|zerg seed 10|
|research.zerg.air.defense:2|zerg seed 10|
|research.zerg.evolution.defense:2|zerg seed 10|
|research.zerg.air.weapon:3|zerg seed 10|
|research.zerg.air.defense:3|zerg seed 10|
|research.zerg.evolution.weapon:3|zerg seed 25|
|research.zerg.evolution.defense:3|zerg seed 25|
|hatchery:15|zerg seed 64|
|gateway:1|native opening|
|unlock.zealot:1|native opening or facility/evolution automatic unlock|
|crystal:2|protoss seed 1|
|stargate:1|protoss seed 1|
|robotics:1|protoss seed 1|
|gateway:2|protoss seed 1|
|crystal:4|protoss seed 1|
|stargate:2|protoss seed 1|
|stargate:3|protoss seed 1|
|robotics:2|protoss seed 1|
|charge:1|protoss seed 1|
|system.gateway:1|protoss seed 1|
|research.gateway.weapon:1|protoss seed 1|
|research.gateway.weapon:2|protoss seed 1|
|gateway:3|protoss seed 1|
|robotics:3|protoss seed 1|
|robotics:4|protoss seed 1|
|research.gateway.weapon:3|protoss seed 1|
|gateway:4|protoss seed 1|
|stargate:4|protoss seed 1|
|unlock.adept:1|protoss seed 2|
|unlock.sentry:1|protoss seed 2|
|system.robotics:1|protoss seed 2|
|unlock.stalker:1|protoss seed 2|
|research.robotics.weapon:1|protoss seed 2|
|research.robotics.weapon:2|protoss seed 2|
|research.robotics.defense:1|protoss seed 2|
|unlock.immortal:1|protoss seed 2|
|unlock.colossus:1|protoss seed 2|
|glaives:1|protoss seed 2|
|research.robotics.defense:2|protoss seed 2|
|research.robotics.weapon:3|protoss seed 2|
|colossus_range:1|protoss seed 2|
|blink:1|protoss seed 2|
|unlock.phoenix:1|protoss seed 3|
|system.stargate:1|protoss seed 3|
|research.stargate.weapon:1|protoss seed 3|
|research.stargate.defense:1|protoss seed 3|
|research.stargate.weapon:2|protoss seed 3|
|research.stargate.weapon:3|protoss seed 3|
|unlock.high_templar:1|protoss seed 4|
|stargate:5|protoss seed 4|
|unlock.void_ray:1|protoss seed 4|
|storm:1|protoss seed 4|
|gateway:5|protoss seed 5|
|research.gateway.defense:1|protoss seed 5|
|research.gateway.defense:2|protoss seed 5|
|unlock.carrier:1|protoss seed 7|
|robotics:5|protoss seed 8|
|research.robotics.defense:3|protoss seed 8|
|research.stargate.defense:2|protoss seed 9|
|research.stargate.defense:3|protoss seed 10|
|research.gateway.defense:3|protoss seed 11|

|身份|合法来源|效果测试入口|
|---|---|---|
|raynor|原生货架／支付／身份资格，详见 JSON|[test/battle-ui-sample-layout.test.ts:22](../../test/battle-ui-sample-layout.test.ts)|
|tychus|原生货架／支付／身份资格，详见 JSON|[test/battle-ui-sample-layout.test.ts:22](../../test/battle-ui-sample-layout.test.ts)|
|nova|原生货架／支付／身份资格，详见 JSON|[test/battle-ui-integration.test.ts:33](../../test/battle-ui-integration.test.ts)|
|swann|原生货架／支付／身份资格，详见 JSON|[test/equipment-effects.test.ts:58](../../test/equipment-effects.test.ts)|
|tosh|原生货架／支付／身份资格，详见 JSON|[test/camera-calibration.test.ts:48](../../test/camera-calibration.test.ts)|
|kerrigan|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:16](../../test/feedback-f06-hero-balance.test.ts)|
|zagara|原生货架／支付／身份资格，详见 JSON|[test/difficulty-r2.test.ts:116](../../test/difficulty-r2.test.ts)|
|dehaka|原生货架／支付／身份资格，详见 JSON|[test/difficulty-r2.test.ts:116](../../test/difficulty-r2.test.ts)|
|stukov|原生货架／支付／身份资格，详见 JSON|[test/feedback-f05-f06-review.test.ts:19](../../test/feedback-f05-f06-review.test.ts)|
|niadra|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:16](../../test/feedback-f06-hero-balance.test.ts)|
|artanis|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:17](../../test/feedback-f06-hero-balance.test.ts)|
|zeratul|原生货架／支付／身份资格，详见 JSON|[test/feedback-f05-f06-review.test.ts:19](../../test/feedback-f05-f06-review.test.ts)|
|alarak|原生货架／支付／身份资格，详见 JSON|[test/difficulty-r2.test.ts:116](../../test/difficulty-r2.test.ts)|
|fenix|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:17](../../test/feedback-f06-hero-balance.test.ts)|
|vorazun|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:17](../../test/feedback-f06-hero-balance.test.ts)|
|yamato_battlecruiser|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:18](../../test/feedback-f06-hero-balance.test.ts)|
|hots_leviathan|原生货架／支付／身份资格，详见 JSON|[test/feedback-f06-hero-balance.test.ts:18](../../test/feedback-f06-hero-balance.test.ts)|
|purifier_flagship|原生货架／支付／身份资格，详见 JSON|[test/feedback-f05-f06-review.test.ts:24](../../test/feedback-f05-f06-review.test.ts)|
|marine.1|原生货架／支付／身份资格，详见 JSON|[test/combat-fixes-v22.test.ts:9](../../test/combat-fixes-v22.test.ts)|
|marine.2|原生货架／支付／身份资格，详见 JSON|[test/feedback-boss-loot.test.ts:15](../../test/feedback-boss-loot.test.ts)|
|marine.3|原生货架／支付／身份资格，详见 JSON|[test/feedback-boss-loot.test.ts:18](../../test/feedback-boss-loot.test.ts)|
|marauder.1|原生货架／支付／身份资格，详见 JSON|[test/expedition-drafts.test.ts:106](../../test/expedition-drafts.test.ts)|
|marauder.2|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:47](../../test/p4-terran-elites.test.ts)|
|marauder.3|原生货架／支付／身份资格，详见 JSON|[test/movement-query.test.ts:30](../../test/movement-query.test.ts)|
|hellion.1|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:54](../../test/p4-terran-elites.test.ts)|
|hellion.2|原生货架／支付／身份资格，详见 JSON|[test/hellion-knight-correction.test.ts:6](../../test/hellion-knight-correction.test.ts)|
|hellion.3|原生货架／支付／身份资格，详见 JSON|[test/p4-mine-medical-samples.test.ts:16](../../test/p4-mine-medical-samples.test.ts)|
|tank.1|原生货架／支付／身份资格，详见 JSON|[test/expedition-upgrade-combat.test.ts:60](../../test/expedition-upgrade-combat.test.ts)|
|tank.2|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:30](../../test/p4-terran-elites.test.ts)|
|tank.3|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:58](../../test/p4-terran-elites.test.ts)|
|medivac.1|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:30](../../test/p4-terran-elites.test.ts)|
|medivac.2|原生货架／支付／身份资格，详见 JSON|[test/p4-mine-medical-samples.test.ts:22](../../test/p4-mine-medical-samples.test.ts)|
|medivac.3|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:70](../../test/p4-terran-elites.test.ts)|
|reaper.1|原生货架／支付／身份资格，详见 JSON|[test/feedback-reaper.test.ts:43](../../test/feedback-reaper.test.ts)|
|thor.1|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:31](../../test/p4-terran-elites.test.ts)|
|viking.1|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:22](../../test/m4-combat-samples.test.ts)|
|banshee.1|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:66](../../test/p4-terran-elites.test.ts)|
|science_vessel.1|原生货架／支付／身份资格，详见 JSON|[test/p4-mine-medical-samples.test.ts:15](../../test/p4-mine-medical-samples.test.ts)|
|zergling.1|原生货架／支付／身份资格，详见 JSON|[test/feedback-boss-loot.test.ts:24](../../test/feedback-boss-loot.test.ts)|
|baneling.1|原生货架／支付／身份资格，详见 JSON|[test/baneling-approach.test.ts:5](../../test/baneling-approach.test.ts)|
|roach.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:31](../../test/p4-zerg-elites.test.ts)|
|ravager.1|原生货架／支付／身份资格，详见 JSON|[test/expedition-combat.test.ts:20](../../test/expedition-combat.test.ts)|
|hydralisk.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:36](../../test/p4-zerg-elites.test.ts)|
|lurker.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:42](../../test/p4-zerg-elites.test.ts)|
|queen.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:23](../../test/p4-zerg-elites.test.ts)|
|mutalisk.1|原生货架／支付／身份资格，详见 JSON|[test/expedition-secondary-damage.test.ts:13](../../test/expedition-secondary-damage.test.ts)|
|corruptor.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:48](../../test/p4-zerg-elites.test.ts)|
|ultralisk.1|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:51](../../test/p4-zerg-elites.test.ts)|
|zealot.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:14](../../test/p4-protoss-elites.test.ts)|
|adept.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:17](../../test/p4-protoss-elites.test.ts)|
|stalker.1|原生货架／支付／身份资格，详见 JSON|[test/material-batch2.test.ts:84](../../test/material-batch2.test.ts)|
|sentry.1|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:37](../../test/m5-elites.test.ts)|
|immortal.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:11](../../test/p4-protoss-elites.test.ts)|
|colossus.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:23](../../test/p4-protoss-elites.test.ts)|
|high_templar.1|原生货架／支付／身份资格，详见 JSON|[test/integration-i03-effects.test.ts:74](../../test/integration-i03-effects.test.ts)|
|phoenix.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:26](../../test/p4-protoss-elites.test.ts)|
|void_ray.1|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:28](../../test/p4-protoss-elites.test.ts)|
|carrier.1|原生货架／支付／身份资格，详见 JSON|[test/battle-preload-complete.test.ts:12](../../test/battle-preload-complete.test.ts)|
|viking.2|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:22](../../test/m4-combat-samples.test.ts)|
|viking.3|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:22](../../test/m4-combat-samples.test.ts)|
|ravager.2|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:22](../../test/m4-combat-samples.test.ts)|
|ravager.3|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:65](../../test/m4-combat-samples.test.ts)|
|high_templar.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:24](../../test/p4-protoss-elites.test.ts)|
|high_templar.3|原生货架／支付／身份资格，详见 JSON|[test/m4-combat-samples.test.ts:40](../../test/m4-combat-samples.test.ts)|
|reaper.2|原生货架／支付／身份资格，详见 JSON|[test/feedback-reaper.test.ts:43](../../test/feedback-reaper.test.ts)|
|reaper.3|原生货架／支付／身份资格，详见 JSON|[test/feedback-reaper.test.ts:43](../../test/feedback-reaper.test.ts)|
|thor.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:17](../../test/m5-elites.test.ts)|
|thor.3|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:62](../../test/p4-terran-elites.test.ts)|
|banshee.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:44](../../test/m5-elites.test.ts)|
|banshee.3|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:68](../../test/p4-terran-elites.test.ts)|
|science_vessel.2|原生货架／支付／身份资格，详见 JSON|[test/p4-terran-elites.test.ts:70](../../test/p4-terran-elites.test.ts)|
|science_vessel.3|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:39](../../test/m5-elites.test.ts)|
|zergling.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:28](../../test/m5-elites.test.ts)|
|zergling.3|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:23](../../test/p4-zerg-elites.test.ts)|
|baneling.2|原生货架／支付／身份资格，详见 JSON|[test/baneling-approach.test.ts:5](../../test/baneling-approach.test.ts)|
|baneling.3|原生货架／支付／身份资格，详见 JSON|[test/baneling-approach.test.ts:5](../../test/baneling-approach.test.ts)|
|roach.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:21](../../test/m5-elites.test.ts)|
|roach.3|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:25](../../test/m5-elites.test.ts)|
|hydralisk.2|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:37](../../test/p4-zerg-elites.test.ts)|
|hydralisk.3|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:38](../../test/p4-zerg-elites.test.ts)|
|lurker.2|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:43](../../test/p4-zerg-elites.test.ts)|
|lurker.3|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:52](../../test/m5-elites.test.ts)|
|queen.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:35](../../test/m5-elites.test.ts)|
|queen.3|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:29](../../test/m5-elites.test.ts)|
|mutalisk.2|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:46](../../test/p4-zerg-elites.test.ts)|
|mutalisk.3|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:47](../../test/p4-zerg-elites.test.ts)|
|corruptor.2|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:23](../../test/p4-zerg-elites.test.ts)|
|corruptor.3|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:50](../../test/p4-zerg-elites.test.ts)|
|ultralisk.2|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:52](../../test/p4-zerg-elites.test.ts)|
|ultralisk.3|原生货架／支付／身份资格，详见 JSON|[test/p4-zerg-elites.test.ts:53](../../test/p4-zerg-elites.test.ts)|
|zealot.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:15](../../test/p4-protoss-elites.test.ts)|
|zealot.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:16](../../test/p4-protoss-elites.test.ts)|
|adept.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:18](../../test/p4-protoss-elites.test.ts)|
|adept.3|原生货架／支付／身份资格，详见 JSON|[test/integration-i03-effects.test.ts:74](../../test/integration-i03-effects.test.ts)|
|stalker.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:30](../../test/m5-elites.test.ts)|
|stalker.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:11](../../test/p4-protoss-elites.test.ts)|
|sentry.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:21](../../test/p4-protoss-elites.test.ts)|
|sentry.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:21](../../test/p4-protoss-elites.test.ts)|
|immortal.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:22](../../test/p4-protoss-elites.test.ts)|
|immortal.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:22](../../test/p4-protoss-elites.test.ts)|
|colossus.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:23](../../test/p4-protoss-elites.test.ts)|
|colossus.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:23](../../test/p4-protoss-elites.test.ts)|
|phoenix.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:26](../../test/p4-protoss-elites.test.ts)|
|phoenix.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:27](../../test/p4-protoss-elites.test.ts)|
|void_ray.2|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:28](../../test/p4-protoss-elites.test.ts)|
|void_ray.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:28](../../test/p4-protoss-elites.test.ts)|
|carrier.2|原生货架／支付／身份资格，详见 JSON|[test/m5-elites.test.ts:46](../../test/m5-elites.test.ts)|
|carrier.3|原生货架／支付／身份资格，详见 JSON|[test/p4-protoss-elites.test.ts:29](../../test/p4-protoss-elites.test.ts)|

## 自动事件与流程出口

34 个自动类别全部从原生时钟、条件和随机分支产生：7 任务、10 遭遇、5 拾取物、4 虫群、4 门票及 4 传送门。五地图另外核验 40 次合法放置。

|类别|条目|实际来源|
|---|---|---|
|missions|repair|tickMissions → advanceMissionClock → eligible kind → spawn；seed 1013904242|
|missions|hives|tickMissions → advanceMissionClock → eligible kind → spawn；seed 1309757500|
|missions|fleet|tickMissions → advanceMissionClock → eligible kind → spawn；seed 683130215|
|missions|escort|tickMissions → advanceMissionClock → eligible kind → spawn；seed 1697034457|
|missions|eggs|tickMissions → advanceMissionClock → eligible kind → spawn；seed 2710938699|
|missions|intel|tickMissions → advanceMissionClock → eligible kind → spawn；seed 1514187059|
|missions|rescue|tickMissions → advanceMissionClock → eligible kind → spawn；seed 4225125758|
|encounters|whitePack|tickEncounters → real 12% trial → eligible kind → spawn；seed 3041712726|
|encounters|golden|tickEncounters → real 12% trial → eligible kind → spawn；seed 2175735113|
|encounters|devourer|tickEncounters → real 12% trial → eligible kind → spawn；seed 1936384785|
|encounters|cruelQueen|tickEncounters → real 12% trial → eligible kind → spawn；seed 683130215|
|encounters|gentle|tickEncounters → real 12% trial → eligible kind → spawn；seed 1070407172|
|encounters|infectedTerrans|tickEncounters → real 12% trial → eligible kind → spawn；seed 831056844|
|encounters|corruptedProtoss|tickEncounters → real 12% trial → eligible kind → spawn；seed 4020696199|
|encounters|giant|tickEncounters → real 12% trial → eligible kind → spawn；seed 3394068914|
|encounters|flyingRoaches|tickEncounters → real 12% trial → eligible kind → spawn；seed 3154718586|
|encounters|parasites|tickEncounters → real 12% trial → eligible kind → spawn；seed 2915368258|
|pickups|root|20-second native weighted trial → reachable pickup → collect once；seed 683130215|
|pickups|firepower|20-second native weighted trial → reachable pickup → collect once；seed 3337565984|
|pickups|medical|20-second native weighted trial → reachable pickup → collect once；seed 1697034457|
|pickups|armor|20-second native weighted trial → reachable pickup → collect once；seed 56502930|
|pickups|nuke|20-second native weighted trial → reachable pickup → collect once；seed 3232803677|
|hordes|ultralisks|safe native replacement window → 20% trial → actual enemy admission → 20-second end；seed 683130215|
|hordes|mutalisks|safe native replacement window → 20% trial → actual enemy admission → 20-second end；seed 3337565984|
|hordes|zerglings|safe native replacement window → 20% trial → actual enemy admission → 20-second end；seed 1697034457|
|hordes|roachHydra|safe native replacement window → 20% trial → actual enemy admission → 20-second end；seed 2084311414|
|tickets|dodge|native 25% intermission ticket → claim → next-stage entry；seed 683130215|
|tickets|crossing|native 25% intermission ticket → claim → next-stage entry；seed 3337565984|
|tickets|resources|native 25% intermission ticket → claim → next-stage entry；seed 1697034457|
|tickets|arena|native 25% intermission ticket → claim → next-stage entry；seed 2710938699|
|portals|resources|native 20% portal trial → connected legal point；seed 683130215|
|portals|crossing|native 20% portal trial → connected legal point；seed 3337565984|
|portals|dodge|native 20% portal trial → connected legal point；seed 1697034457|
|portals|arena|native 20% portal trial → connected legal point；seed 56502930|

- four-member eligibility changed before admission
- blocked portal and ordinary movement
- stale training recipient and skip/continue
- blocked mission atomic rejection and retry
- full inventory and make-room claim
- pending reward / identity reservation
- special success, failure, abandon, settlement and repeat claim

## 明确边界

- Seeded native pools use controlled money, stage windows and landing-guard elimination. This proves legal paths and nonzero source weights, not human full-campaign appearance frequency or difficulty.
- Effect-family regressions and 310 measured card effects prove simulation behavior; this is not all-action visual/audio playback, which remains T01.
- Five real terrain themes passed object-footprint admission; this is not a human navigation/combat playthrough of all maps.
- G01/G02 equipment-card scaling and value, G03 economy/difficulty, U05 guidance, visual batches 3/4, D05 storage and final V-series acceptance remain open.
