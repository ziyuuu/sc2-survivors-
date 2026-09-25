import type {RunState} from '../run-state';
import {validateExpedition} from '../expedition-state';
import {ALL_FAMILIES,combatRace,isAirHeroType,type FamilyId} from '../../data/races';
import {allocationCost,allocationPoints,validateTalentAllocation} from '../../data/mvp-talents';
import {HEROES} from '../../data/heroes';
/** Explicit schema: adding RunState state requires choosing persistence or rebuild. */
export const RUN_FIELDS=[
 'expedition','runConfig','campaign18Runtime',
 'podSerial','time','tick','stage','stageElapsed','stageStartedAt','phase','paused','battlefield','endlessEntry','endlessTransitionReceipt','endlessRoundReceipts','runId','endlessAwardedMinutes','endless',
 'entities','pods','buildings','upgrades','wallet','anchor','marchDirection','order','movePending','commandRoute','trail','effects','pickups','rewardDrops','visualSerial',
 'offerSerial','rewards','rewardClaimed','rewardRound','clearReceipt','rerolls','nextBuilding','nextWave','wave','stageWave','nextId','nextJob','freeRerolls','freePurchases',
 'nextFreePodAt','nextEliteGrowthAt','nextMercenaryAt','nextTankSupportAt','supportUntil','nextSupportTick','talentSupportImpacts','dashUntil','dashReady','hive',
 'airliftReady','talentTransferPlan','expansionHives','nextExpansionAt','hiveWarningPoint','mainHiveNextBatchAt','mainHiveBatch','mainHivePending','fortifications','lordWarningPoint',
 'stats','difficulty','scvs','economicTargets','anchorMovingFor','anchorStoppedFor','tankCommand','economyTotals','productionCursor','productionPlan',
 'guardRemainders','nextGuardCounts','specialPlan','nextSpecial','waves','eventPlan','nextEvent','scheduledStage','ambientBacklog','extraDeliveries',
 'notice','noticeUntil','movementStall','detours','navigation','heroes','heroCasts','pendingElites','evolution','burns','productionChoices','groupNext','groupUnlocks','rngState',
 'corrosionZones','zoneSlowed','auraArmor','auraDamage','auraAttackSpeed','nextAuraUpdate'
] as const;
export const RUN_REBUILT_FIELDS=['input','hash','visualEvents','maxStretch','distancePairs','collisionContacts','spawnCells','revision','contacts','formation','engagement','movementAllies','formationPlanned','configStage','configDifficulty','stageData','attackLines','statuses'] as const;
export type RunData=ReturnType<RunState['snapshotData']>;
export function selectRunData(state:RunState):RunData {return state.snapshotData();}
export function validateRunData(data:RunData,defaults:object){
 if(!data||typeof data!=='object'||Object.keys(data).length!==RUN_FIELDS.length)throw Error('续局字段不完整');
 if(!data.expedition||typeof data.expedition!=='object')throw Error('三族状态缺失');
 validateExpedition(data.expedition);
 const template=defaults as Record<string,unknown>;
 for(const key of RUN_FIELDS){if(!Object.hasOwn(data,key))throw Error('续局字段缺失：'+key);const a=template[key],b=data[key];
  if(a instanceof Map?!(b instanceof Map):a instanceof Set?!(b instanceof Set):Array.isArray(a)?!Array.isArray(b):a!==null&&a!==undefined&&typeof a!==typeof b)throw Error('续局字段类型错误：'+key);
 }
 if(!data.runConfig)throw Error('战局配置缺失');
 const frozen=data.runConfig.frozenTalents;
 if(!frozen||frozen.ruleset!=='mvp-1.0'||frozen.race!==data.expedition.race||validateTalentAllocation(frozen.race,frozen.levels)||frozen.allocated!==allocationPoints(frozen.levels)||frozen.investment!==allocationCost(frozen.levels))throw Error('冻结天赋与战局状态不一致');
 if(!['battle','reward','won','endless-ready','finished','lost'].includes(data.phase)||!['easy','normal','hard','hell'].includes(data.difficulty)||!Number.isSafeInteger(data.tick)||data.tick<0||!Number.isFinite(data.time)||data.time<0||!Number.isInteger(data.stage)||data.stage<1||data.stage>18||typeof data.runId!=='string'||!data.runId||data.runConfig.rulesId!=='mvp-1.0'||data.runConfig.campaignId!=='campaign-18'||data.runConfig.mapId!=='campaign-kairos-v1'||!data.runConfig.mapHash||!Number.isSafeInteger(data.runConfig.seed)||data.runConfig.difficulty!==data.difficulty||data.runConfig.race!==data.expedition.race||!Number.isFinite(data.wallet?.minerals)||!Number.isFinite(data.wallet?.gas)||data.wallet.minerals<0||data.wallet.gas<0)throw Error('续局基本状态无效');
 if(!data.battlefield||data.battlefield.mode!==(data.endless?'endless':'campaign')||data.battlefield.mapId!==(data.endless?'endless-flat-v1':'campaign-kairos-v1')||typeof data.battlefield.mapHash!=='string'||!data.battlefield.mapHash||data.endlessEntry!==null&&(!data.endlessEntry||data.stage!==18||data.endless||data.endlessEntry.id!==data.runId+':endless-entry'||!Number.isSafeInteger(data.endlessEntry.revision)||data.endlessEntry.revision<0||typeof data.endlessEntry.ready!=='boolean')||data.endlessTransitionReceipt!==null&&typeof data.endlessTransitionReceipt!=='string'||!Array.isArray(data.endlessRoundReceipts)||data.endlessRoundReceipts.some(x=>typeof x!=='string')||new Set(data.endlessRoundReceipts).size!==data.endlessRoundReceipts.length)throw Error('续局战场或无尽整备状态无效');
 for(const [id,u] of data.entities){const combatBody=isAirHeroType(u.unitType)?u.heroId===u.unitType&&u.owner==='terran':ALL_FAMILIES.includes(u.unitType as FamilyId);if(!Number.isSafeInteger(id)||u?.id!==id||!combatBody||u.race!==combatRace(u.unitType)||u.team!==(u.owner==='terran'?'player':'enemy')||![u.x,u.z,u.hp,u.maxHp,u.weaponCooldown,u.nextShotAt,u.lastShotAt].every(n=>typeof n==='number'&&!Number.isNaN(n))||u.maxHp<=0)throw Error('续局单位无效');}
 for(const u of data.entities.values())if(u.rewardSourceKind!==undefined&&(!u.summonKind||!['ordinary','elite','hero','temporary'].includes(u.rewardSourceKind)||!Number.isSafeInteger(u.rewardOwnerId)||!Number.isFinite(u.rewardOwnerGeneration)||u.rewardOwnerId!==u.summonOwnerId))throw Error('召唤物奖励归属无效');
 if(!Array.isArray(data.heroCasts)||data.heroCasts.some(cast=>{
  if(!cast||!Number.isSafeInteger(cast.id)||!Number.isSafeInteger(cast.source)||!Number.isSafeInteger(cast.target)||!Object.hasOwn(HEROES,cast.hero)||![cast.at,cast.damage,cast.origin?.x,cast.origin?.z,cast.point?.x,cast.point?.z].every(Number.isFinite))return true;
  if(cast.phase!==undefined&&!['impact','channel','dot','line-travel','area-pulse'].includes(cast.phase)||cast.launched!==undefined&&typeof cast.launched!=='boolean')return true;
  if(cast.pulseIndex!==undefined&&(cast.hero!=='hots_leviathan'||cast.phase!=='area-pulse'||!Number.isInteger(cast.pulseIndex)||cast.pulseIndex<0||cast.pulseIndex>2))return true;
  return cast.phase==='line-travel'&&(!Number.isFinite(cast.progress)||cast.progress!<0||cast.progress!>1||!Array.isArray(cast.hitIds)||new Set(cast.hitIds).size!==cast.hitIds.length||cast.hitIds.some(id=>!Number.isSafeInteger(id)));
 }))throw Error('英雄弹体状态无效');
 if(!Array.isArray(data.talentSupportImpacts)||data.talentSupportImpacts.some(impact=>!impact||!Number.isSafeInteger(impact.id)||!['terran','zerg','protoss'].includes(impact.race)||![impact.at,impact.point?.x,impact.point?.z,impact.direction?.x,impact.direction?.z].every(Number.isFinite)||![0,1].includes(impact.packet)))throw Error('支援延迟命中数据无效');
 const transfer=data.talentTransferPlan;
 if(transfer!==null&&(!transfer||data.phase!=='battle'||![transfer.origin?.x,transfer.origin?.z,transfer.direction?.x,transfer.direction?.z,transfer.target?.x,transfer.target?.z,transfer.readyAt].every(Number.isFinite)||typeof transfer.mapHash!=='string'||!Number.isInteger(transfer.stage)||!Number.isInteger(transfer.endlessRound)||!Array.isArray(transfer.participants)||!transfer.participants.length||new Set(transfer.participants.map(item=>item.id)).size!==transfer.participants.length||transfer.participants.some(item=>!Number.isSafeInteger(item.id)||!Number.isFinite(item.generation))))throw Error('战术转移准备数据无效');
 for(const drop of data.rewardDrops)if(drop.talentLoot&&(!['purple','orange'].includes(drop.talentLoot.rarity)||typeof drop.talentLoot.receipt!=='string'||!data.expedition.talentLootReceipts.includes(drop.talentLoot.receipt)))throw Error('地图天赋掉落收据无效');
 for(const p of data.pods)if(!(p.guardianIds instanceof Set)||!Array.isArray(p.passengers))throw Error('续局运输舱无效');
 for(const b of data.buildings.values())if(!Array.isArray(b.queue))throw Error('续局生产队列无效');
 for(const group of ['barracks','factory','starport'] as const){const choice=data.productionChoices?.[group],allowed=group==='barracks'?['marine','marauder']:group==='factory'?['hellion','tank']:['medivac'];if(!Array.isArray(choice)||choice.length<1||choice.length>2||new Set(choice).size!==choice.length||choice.some(type=>!allowed.includes(type)))throw Error('续局生产选择无效');}
}
