import {validateProtossEliteRun,validateProtossEliteCombat,revisedProtossElite} from '../combat/protoss-elite-runtime';
import {validateTeamAuraRun} from '../combat/team-auras';
import {aggregateMvpTalentEffects} from '../progression/mvp-talent-effects';
import {eliteFixedGrowth} from '../../data/terran-elites';
import {validateTerranEliteRun,validateTerranEliteCombat,revisedElite} from '../combat/terran-elite-runtime';
import {validateZergEliteRun,validateZergEliteCombat,revisedZergElite} from '../combat/zerg-elite-runtime';
import {validateEliteSupport} from '../combat/elite-support';
import {validateProtossHeroRun,validateProtossCombat} from '../combat/protoss-hero-passives';
import {validateZergHeroRun} from '../combat/zerg-hero-passives';
import {validateHeroAttacks} from '../combat/hero-attack-upgrades';
import {validateWeaponFlights} from '../combat/weapon-flight';
import {validateSwarm} from '../../data/swarm';
import type {RunState} from '../run-state';
import {validateExpedition} from '../expedition-state';
import {ALL_FAMILIES,combatRace,isAirHeroType,type FamilyId} from '../../data/races';
import {allocationCost,allocationPoints,validateTalentAllocation} from '../../data/mvp-talents';
import {HEROES} from '../../data/heroes';
import {validBattleView} from '../combat/battle-view';
/** Explicit schema: adding RunState state requires choosing persistence or rebuild. */
export const RUN_FIELDS=[
 'protossElites','teamAuras','zergElites','terranElites','eliteSupport',
 // Saved inside entities.heroCombat / heroCasts: cycle, warmup, cloak episode/charge, protection expiry, cast rank/targets/view.
 // Saved in expedition.support.mines: phase, stable target, emergence timer, point/facing. Routes/poses rebuild.
 'expedition','runConfig','campaign18Runtime','swarm',
 'podSerial','time','tick','stage','stageElapsed','stageStartedAt','phase','paused','battlefield','endlessEntry','endlessTransitionReceipt','endlessRoundReceipts','runId','endlessAwardedMinutes','endless',
 'entities','pods','upgrades','wallet','anchor','marchDirection','order','movePending','commandRoute','trail','effects','pickups','rewardDrops','visualSerial',
 'offerSerial','rewards','rewardClaimed','rewardRound','clearReceipt','rerolls','nextWave','wave','stageWave','nextId','nextJob',
 'nextFreePodAt','nextEliteGrowthAt','nextMercenaryAt','nextTankSupportAt','supportUntil','nextSupportTick','talentSupportImpacts','dashUntil','dashReady','hive',
 'airliftReady','talentTransferPlan','expansionHives','nextExpansionAt','hiveWarningPoint','mainHiveNextBatchAt','mainHiveBatch','mainHivePending','fortifications',
 'stats','difficulty','workers','economicTargets','anchorMovingFor','anchorStoppedFor','tankCommand','economyTotals',
 'nextGuardCounts','specialPlan','nextSpecial','waves','eventPlan','nextEvent','scheduledStage','ambientBacklog',
 'notice','noticeUntil','movementStall','detours','navigation','heroes','heroCasts','weaponFlights','heroAttacks','zergHeroes','protossHeroes','pendingElites','rngState',
 'corrosionZones','zoneSlowed','auraArmor','auraDamage','auraAttackSpeed','nextAuraUpdate'
] as const;
export const RUN_REBUILT_FIELDS=['input','directionRoute','hash','visualEvents','heroAttackEvents','heroAuraMembership','maxStretch','distancePairs','collisionContacts','spawnCells','swarmSpawnCache','revision','contacts','formation','destinationFormation','engagement','movementAllies','formationPlanned','configStage','configDifficulty','stageData','attackLines','statuses'] as const;
export type RunData=ReturnType<RunState['snapshotData']>;
export function selectRunData(state:RunState):RunData {return state.snapshotData();}
export function validateRunData(data:RunData,defaults:object){
 if(!data||typeof data!=='object'||Object.keys(data).length!==RUN_FIELDS.length)throw Error('续局字段不完整');
 if(!data.expedition||typeof data.expedition!=='object')throw Error('三族状态缺失');
 validateExpedition(data.expedition);
 validateProtossEliteRun(data.protossElites,data.time,data.entities,data.nextId);validateTeamAuraRun(data.teamAuras,data.time,data.entities);validateZergEliteRun(data.zergElites);validateTerranEliteRun(data.terranElites);validateEliteSupport(data.eliteSupport);validateSwarm(data.swarm);validateWeaponFlights(data.weaponFlights);validateHeroAttacks(data.heroAttacks);validateZergHeroRun(data.zergHeroes);validateProtossHeroRun(data.protossHeroes);
 const template=defaults as Record<string,unknown>;
 for(const key of RUN_FIELDS){if(!Object.hasOwn(data,key))throw Error('续局字段缺失：'+key);const a=template[key],b=data[key];
  if(a instanceof Map?!(b instanceof Map):a instanceof Set?!(b instanceof Set):Array.isArray(a)?!Array.isArray(b):a!==null&&a!==undefined&&typeof a!==typeof b)throw Error('续局字段类型错误：'+key);
 }
 if(!data.runConfig)throw Error('战局配置缺失');
 if(![data.workers,data.stats?.workersRescued,data.stats?.workersLost].every(n=>Number.isSafeInteger(n)&&n>=0))throw Error('续局工人数量或救援统计无效');
 const campaign=data.campaign18Runtime;
 if(campaign&&(typeof campaign.finalBossKilled!=='boolean'||campaign.finalBossId!==null&&(!Number.isSafeInteger(campaign.finalBossId)||campaign.finalBossId<1)||campaign.finalBossKilled&&(campaign.stage!==18||campaign.finalBossId===null)))throw Error('最终首领击杀收据无效');
 const frozen=data.runConfig.frozenTalents;
 if(!frozen||frozen.effectsVersion!=='shared-tech-20260929'||frozen.ruleset!=='mvp-1.0'||frozen.race!==data.expedition.race||validateTalentAllocation(frozen.race,frozen.levels)||frozen.allocated!==allocationPoints(frozen.levels)||frozen.investment!==allocationCost(frozen.levels))throw Error('冻结天赋与战局状态不一致');
 if(!['battle','reward','won','endless-ready','finished','lost'].includes(data.phase)||!['easy','normal','hard','hell'].includes(data.difficulty)||!Number.isSafeInteger(data.tick)||data.tick<0||!Number.isFinite(data.time)||data.time<0||!Number.isInteger(data.stage)||data.stage<1||data.stage>18||typeof data.runId!=='string'||!data.runId||data.runConfig.rulesId!=='mvp-1.0'||data.runConfig.campaignId!=='campaign-18'||!['campaign-kairos-v1','campaign-radial-v1'].includes(data.runConfig.mapId)||!data.runConfig.mapHash||!Number.isSafeInteger(data.runConfig.seed)||data.runConfig.difficulty!==data.difficulty||data.runConfig.race!==data.expedition.race||!Number.isFinite(data.wallet?.minerals)||!Number.isFinite(data.wallet?.gas)||data.wallet.minerals<0||data.wallet.gas<0)throw Error('续局基本状态无效');
 if(!data.battlefield||data.battlefield.mode!==(data.endless?'endless':'campaign')||data.battlefield.mapId!==(data.endless?'endless-flat-v1':data.runConfig.mapId)||typeof data.battlefield.mapHash!=='string'||!data.battlefield.mapHash||data.endlessEntry!==null&&(!data.endlessEntry||data.stage!==18||data.endless||data.endlessEntry.id!==data.runId+':endless-entry'||!Number.isSafeInteger(data.endlessEntry.revision)||data.endlessEntry.revision<0||typeof data.endlessEntry.ready!=='boolean')||data.endlessTransitionReceipt!==null&&typeof data.endlessTransitionReceipt!=='string'||!Array.isArray(data.endlessRoundReceipts)||data.endlessRoundReceipts.some(x=>typeof x!=='string')||new Set(data.endlessRoundReceipts).size!==data.endlessRoundReceipts.length)throw Error('续局战场或无尽整备状态无效');
 for(const [id,u] of data.entities){const combatBody=isAirHeroType(u.unitType)?u.heroId===u.unitType&&u.owner==='terran':ALL_FAMILIES.includes(u.unitType as FamilyId);if(!Number.isSafeInteger(id)||u?.id!==id||!combatBody||u.race!==combatRace(u.unitType)||u.team!==(u.owner==='terran'?'player':'enemy')||![u.x,u.z,u.hp,u.maxHp,u.weaponCooldown,u.nextShotAt,u.lastShotAt].every(n=>typeof n==='number'&&!Number.isNaN(n))||u.maxHp<=0)throw Error('续局单位无效');}
 for(const u of data.entities.values())if(u.rewardSourceKind!==undefined&&(!u.summonKind||!['ordinary','elite','hero','temporary'].includes(u.rewardSourceKind)||!Number.isSafeInteger(u.rewardOwnerId)||!Number.isFinite(u.rewardOwnerGeneration)||u.rewardOwnerId!==u.summonOwnerId))throw Error('召唤物奖励归属无效');
 // Saved: pair identity/rank/regrowth tick, queen cooldown, per-carrier injection receipt.
 // Rebuilt: console selection/pages and engagement positions. No view objects in these DTOs.
 for(const u of data.entities.values()){
  // Saved per-body combat receipts and protection expiry; render layers rebuild independently.
  if(u.protossEliteCombat){if(!revisedProtossElite(u))throw Error('神族循环归属无效');validateProtossEliteCombat(u.protossEliteCombat);}
  if(u.teamAuraFactors&&(![u.teamAuraFactors.hp,u.teamAuraFactors.shield].every(n=>Number.isFinite(n)&&n>=1&&n<=12)||Object.keys(u.teamAuraFactors).length!==2))throw Error('团队最大值倍率无效');
  if(u.carrierEliteCycles!==undefined&&(!u.summonKind||!Number.isSafeInteger(u.carrierEliteCycles)||u.carrierEliteCycles<0))throw Error('子机循环无效');
  if(u.eliteCombat){if(!revisedElite(u))throw Error('精英循环归属无效');validateTerranEliteCombat(u.eliteCombat);}
  if(u.zergEliteCombat){if(!revisedZergElite(u))throw Error('虫族精英循环归属无效');validateZergEliteCombat(u.zergEliteCombat);const s=u.zergEliteCombat;if(s.stored>u.maxHp*(u.eliteId==='baneling.3'?2:.8)+1e-6||s.barrier>u.maxHp*.8+1e-6||s.redirectSpent>u.maxHp*.2+1e-6||s.burrowPhase&&u.eliteId!=='roach.1'||s.dash&&u.eliteId!=='ultralisk.3')throw Error('虫族精英有限状态越界');}
  if(u.zergEliteHpAuraFactor!==undefined&&![1,1.2,1.3,1.35,1.45].some(n=>Math.abs(n-u.zergEliteHpAuraFactor!)<1e-6))throw Error('育巢生命比例无效');
  if(u.eliteHpAuraFactor!==undefined&&![1,1.2,1.35,1.62].some(f=>Math.abs(u.eliteHpAuraFactor!-f)<1e-6))throw Error('精英生命光环倍率无效');
  if(u.damageReduction!==undefined&&(!Number.isFinite(u.damageReduction)||u.damageReduction<0||u.damageReduction>1))throw Error('百分比防御无效');
  if(u.protossCombat)validateProtossCombat(u.protossCombat);
  const z=u.zergCombat;if(z&&(!Object.values(z).every(Number.isFinite)||!Number.isSafeInteger(z.essence)||z.essence<0||z.essence>1000000||!Number.isSafeInteger(z.kills)||z.kills<0||z.kills>20||[z.barrier,z.reserve,z.reserveMax].some(n=>n<0)))throw Error('虫族英雄被动无效');
  const h=u.heroCombat;if(h&&(![h.cycles,h.lastFire,h.cloakUntil,h.charge,h.protectedUntil].every(Number.isFinite)||!Number.isSafeInteger(h.cycles)||h.cycles<0||![0,1].includes(h.charge)||typeof h.cloakEpisode!=='boolean'||h.target!==null&&!Number.isSafeInteger(h.target)||h.warmupStart!==null&&!Number.isFinite(h.warmupStart)))throw Error('英雄被动状态无效');
  const r=u.enemyRoute;
  if(r&&(u.team!=='enemy'||typeof r.map!=='string'||!Array.isArray(r.points)||r.points.length<1||r.points.length>3||![...r.points,r.lastPosition,...(r.lastVisible?[r.lastVisible]:[])].every(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z))||!Number.isSafeInteger(r.index)||r.index<0||r.index>=r.points.length||!Number.isFinite(r.checkAt)||!Number.isSafeInteger(r.stalled)||r.stalled<0))throw Error('敌军巡逻状态无效');
  if(u.injectReady!==undefined&&(!Number.isFinite(u.injectReady)||u.injectReady<0||u.unitType!=='queen'))throw Error('注卵冷却无效');
  if(u.pairId!==undefined&&u.hp>0){const p=data.expedition.zerglingPairs.find(p=>p.id===u.pairId);if(u.unitType!=='zergling'||u.team!=='player'||u.temporary||!p||!p.members.includes(u.id)||u.hp>0&&(u.rank!==p.rank||u.eliteId!==p.eliteId))throw Error('双生编制无效');}
 }
 for(const pod of data.pods)if(pod.injectedBy!==undefined&&(!Number.isSafeInteger(pod.injectedBy)||![1,2].includes(pod.injectedSeats??0)||!Number.isFinite(pod.injectedAt)||pod.injectedAt!<0))throw Error('注卵收据无效');
 if(!Array.isArray(data.heroCasts)||data.heroCasts.some(cast=>{
  if(cast.beganAt!==undefined&&(!Number.isFinite(cast.beganAt)||cast.beganAt<0))return true;
  if(cast.rank!==undefined&&(!Number.isInteger(cast.rank)||cast.rank<1||cast.rank>5)||cast.battleView!==undefined&&!validBattleView(cast.battleView)||cast.frozenTargets!==undefined&&(!Array.isArray(cast.frozenTargets)||new Set(cast.frozenTargets.map(t=>t.id)).size!==cast.frozenTargets.length||cast.frozenTargets.some(t=>!Number.isSafeInteger(t.id)||!Number.isFinite(t.maxHp)||t.maxHp<=0)||cast.hero==='swann'&&cast.frozenTargets.length>7))return true;
  if(!cast||!Number.isSafeInteger(cast.id)||!Number.isSafeInteger(cast.source)||!Number.isSafeInteger(cast.target)||!Object.hasOwn(HEROES,cast.hero)||![cast.at,cast.damage,cast.origin?.x,cast.origin?.z,cast.point?.x,cast.point?.z].every(Number.isFinite))return true;
  if(cast.phase!==undefined&&!['impact','channel','dot','line-travel','area-pulse'].includes(cast.phase)||cast.launched!==undefined&&typeof cast.launched!=='boolean')return true;
  if(cast.presentationLaunch&&(![cast.presentationLaunch.x,cast.presentationLaunch.z,cast.presentationLaunch.facing,cast.presentationLaunch.poseSeconds].every(Number.isFinite)||cast.presentationLaunch.poseSeconds<0))return true;
  if(cast.pulseIndex!==undefined&&(cast.hero!=='hots_leviathan'||cast.phase!=='area-pulse'||!Number.isInteger(cast.pulseIndex)||cast.pulseIndex<0||cast.pulseIndex>2))return true;
  return cast.phase==='line-travel'&&(!Number.isFinite(cast.progress)||cast.progress!<0||cast.progress!>1||!Array.isArray(cast.hitIds)||new Set(cast.hitIds).size!==cast.hitIds.length||cast.hitIds.some(id=>!Number.isSafeInteger(id)));
 }))throw Error('英雄弹体状态无效');
 if(!Array.isArray(data.talentSupportImpacts)||data.talentSupportImpacts.some(impact=>!impact||!Number.isSafeInteger(impact.id)||!['terran','zerg','protoss'].includes(impact.race)||![impact.at,impact.point?.x,impact.point?.z,impact.direction?.x,impact.direction?.z].every(Number.isFinite)||![0,1].includes(impact.packet)))throw Error('支援延迟命中数据无效');
 const transfer=data.talentTransferPlan;
 if(transfer!==null&&(!transfer||data.phase!=='battle'||![transfer.origin?.x,transfer.origin?.z,transfer.direction?.x,transfer.direction?.z,transfer.target?.x,transfer.target?.z,transfer.readyAt].every(Number.isFinite)||typeof transfer.mapHash!=='string'||!Number.isInteger(transfer.stage)||!Number.isInteger(transfer.endlessRound)||!Array.isArray(transfer.participants)||!transfer.participants.length||new Set(transfer.participants.map(item=>item.id)).size!==transfer.participants.length||transfer.participants.some(item=>!Number.isSafeInteger(item.id)||!Number.isFinite(item.generation))))throw Error('战术转移准备数据无效');
 for(const p of data.weaponFlights)if(p.source.eliteCombat){if(!revisedElite(p.source))throw Error('弹体精英归属无效');validateTerranEliteCombat(p.source.eliteCombat);}
 for(const p of data.weaponFlights)if(p.source.protossEliteCombat){if(!revisedProtossElite(p.source))throw Error('神族弹体归属无效');validateProtossEliteCombat(p.source.protossEliteCombat);}
 for(const p of data.weaponFlights)if(p.source.zergEliteCombat){if(!revisedZergElite(p.source))throw Error('虫族弹体归属无效');validateZergEliteCombat(p.source.zergEliteCombat);}
 const zids=[...data.zergElites.areas,...data.zergElites.biles,...data.zergElites.heals,...data.zergElites.lines,...data.zergElites.poisons].map(p=>p.id);
 if(zids.some(id=>id>=data.nextId)||zids.some(id=>data.weaponFlights.some(p=>p.id===id)||data.terranElites.areas.some(a=>a.id===id)))throw Error('虫族效果序号冲突');
 for(const [key,f] of Object.entries(data.zergElites.frenzy)){const p=data.expedition.zerglingPairs.find(p=>p.id===key),single=key.startsWith('body:')?data.entities.get(Number(key.slice(5))):null;if(!p&&!single||p&&p.eliteId!=='zergling.1'||single?.eliteId!=='zergling.1'&&!p||f.until>data.time+2.001)throw Error('狂潮编制归属无效');}
 for(const p of data.zergElites.poisons){const b=data.entities.get(p.target)??data.expansionHives.get(p.target)??(data.hive?.id===p.target?data.hive:null)??data.fortifications.get(p.target)??data.economicTargets.get(p.target)??data.pods.find(b=>b.id===p.target);if(!b||b.owner===p.source.owner||p.kind==='air'&&!b.flying||p.until>data.time+5.001||p.next>data.time+1.001||!p.spread&&p.layers!==1)throw Error('毒囊目标或时间无效');}
 for(const a of data.zergElites.areas)if(a.until>data.time+(a.kind==='acid'?5:6)+.001||a.next>data.time+1.001)throw Error('腐蚀地面时间无效');
 const bileGroups=new Map<number,typeof data.zergElites.biles>();for(const b of data.zergElites.biles){const group=bileGroups.get(b.source.id)??[];group.push(b);bileGroups.set(b.source.id,group);}for(const group of bileGroups.values()){const triple=group[0].source.eliteId==='ravager.1',starts=new Set(group.map(b=>b.launchAt));if(group.length>(triple?3:1)||starts.size!==group.length||group.some(b=>Math.abs(b.source.lastSkillAt!-group[0].source.lastSkillAt!)>1e-6||![0,...(triple?[.3,.6]:[])].some(t=>Math.abs(b.launchAt-b.source.lastSkillAt!-t)<1e-6)))throw Error('胆汁批次重复或发射时钟无效');}
 const healSources=new Set<number>();for(const h of data.zergElites.heals){if(healSources.has(h.source.id)||Math.abs(h.until-h.source.lastSkillAt!-4)>1e-6)throw Error('输血窗口重放或时钟无效');healSources.add(h.source.id);}
 const zergAbility=(u:import('../types').Entity,ability:string)=>aggregateMvpTalentEffects(frozen.levels,data.expedition.race,{team:u.team,race:u.race,kind:'elite',familyId:u.unitType,attributes:u.attributes,mode:u.nativeMode,freeConscript:u.freeConscript,tacticalTier:u.tacticalTier,tacticalDirection:u.tacticalDirection,ability,manualAbility:false});
 for(const b of data.zergElites.biles){const expected=1200*eliteFixedGrowth(b.source.rank)*(b.source.eliteId==='ravager.2'?4:1)*(1+(zergAbility(b.source,'bile').abilityDamagePct??0));if(b.launchAt>data.time+.601||b.impactAt>data.time+3.101||Math.abs(b.damage-expected)>1e-6)throw Error('胆汁延迟或冻结载荷无效');}
 for(const h of data.zergElites.heals){const expected=240*eliteFixedGrowth(h.source.rank)*(1+(zergAbility(h.source,'transfusion').healingPct??0));if(h.until>data.time+4.001||h.next>data.time+1.001||Math.abs(h.amount-expected)>1e-6||h.targets.some(id=>{const t=data.entities.get(id);return t&&(!t.attributes.includes('Biological')||t.owner!==h.source.owner||t.temporary||t.summonKind||t.attributes.includes('Structure'));}))throw Error('输血窗口或冻结载荷无效');}
 const newIds=[...data.terranElites.areas.map(a=>a.id),...data.weaponFlights.map(p=>p.id),...data.eliteSupport.mines.map(m=>m.id),...data.eliteSupport.fires.map(f=>f.id),...data.terranElites.absorptions.flatMap(r=>[r.id,r.hunter])];
 if(newIds.some(id=>id>=data.nextId))throw Error('精英实体序号冲突');
 const absorbed=new Map<number,number>();for(const r of data.terranElites.absorptions){if(data.entities.get(r.id)?.hp)throw Error('已吸收单位仍在场');const hunter=data.entities.get(r.hunter);if(hunter&&(hunter.eliteId!=='reaper.3'||!revisedElite(hunter)))throw Error('吸收者归属无效');absorbed.set(r.hunter,(absorbed.get(r.hunter)??0)+r.contribution);const job=data.expedition.ledger.find(j=>j.id===r.job);if(job&&r.passenger!==null){const p=job.passengers[r.passenger];if(!p||p.entityId!==r.id||p.status!=='released'||p.paid.minerals!==r.paid.minerals||p.paid.gas!==r.paid.gas)throw Error('吸收支付收据不一致');}}
 for(const u of data.entities.values())if(u.eliteId==='reaper.3'&&u.eliteCombat&&Math.abs(u.eliteCombat.absorbed-(absorbed.get(u.id)??0))>1e-6)throw Error('吸收成长与收据不一致');
 for(const drop of data.rewardDrops)if(drop.bossLootReceipt&&(!data.expedition.bossLootReceipts.includes(drop.bossLootReceipt)||data.expedition.bossLootClaimed.includes(drop.bossLootReceipt)||data.expedition.bossLootQueue.some(q=>q.receipt===drop.bossLootReceipt)||drop.reward.minerals!==0||drop.reward.gas!==0))throw Error('地图首领奖励收据无效');
 for(const drop of data.rewardDrops)if(drop.talentLoot&&(!['purple','orange'].includes(drop.talentLoot.rarity)||typeof drop.talentLoot.receipt!=='string'||!data.expedition.talentLootReceipts.includes(drop.talentLoot.receipt)))throw Error('地图天赋掉落收据无效');
  // The full guardTypes recipe and retained guardianIds reconstruct the release cursor.
  for(const p of data.pods)if(!(p.guardianIds instanceof Set)||!Array.isArray(p.passengers))throw Error('续局运输舱无效');
}
