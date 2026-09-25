/** Approved Survivors tuning; these are not original StarCraft II talent values. */
import type {Race} from './races';
export type TalentRace = Race;
export type TalentColumn = 'bio' | 'mechanical' | 'aviation' | 'assault' | 'carapace' | 'flight' | 'warriors' | 'robotics' | 'fleet';
export type TalentStat = 'weaponDamagePct' | 'maxHpPct' | 'moveSpeedPct' | 'energyRegenPct' | 'attackSpeedPct' | 'armorFlat' | 'rangePct' | 'healingPct' | 'productionTimeReductionPct' | 'maxEnergyFlat' | 'transformTimeReductionPct' | 'productionCostReductionPct' | 'detectionDurationFlat' | 'regenMaxHpPerSecond' | 'abilityDamagePct' | 'abilityCooldownReductionPct' | 'detectionRadiusPct' | 'maxShieldPct' | 'shieldRegenPct' | 'shieldArmorFlat' | 'shieldDelayReductionSeconds' | 'abilityEnergyReductionPct';
export type TalentCondition = {kind:'mode'; mode:string} | {kind:'threshold'; resource:'hp'|'shield'; atMost:number} | {kind:'noEnemyDamage'; seconds:number};
export interface TalentEffect {
  stat:TalentStat;
  /** Percentages are fractions (0.02 = 2%); flat modifiers use simulation units. */
  amount:number;
  families:readonly string[];
  ability?:string;
  condition?:TalentCondition;
  /** Only explicitly scoped carrier output may cross the owner/summon boundary. */
  ownedSummon?:'interceptor';
  summonsOnly?:boolean;
  raceAbility?:boolean;
}
export interface ThreeRaceTalentNode {
  id:string; race:TalentRace; line:TalentColumn; tier:number; column:0|1;
  name:string; maxRank:1|3; allocationCost:1; resourceCost:3;
  requiredLowerTierPoints:number; effects:readonly TalentEffect[]; description:string;
}
export const TALENT_ALLOCATION_CAP=50;
export const TALENT_RESOURCE_COST=3;
export const TALENT_TIER_THRESHOLDS=[0,5,10,15,20,25,30] as const;
export const THREE_RACE_TALENT_COLUMNS:Readonly<Record<TalentRace,readonly {id:TalentColumn;name:string}[]>>={
  terran:[{id:'bio',name:'生化'},{id:'mechanical',name:'机械'},{id:'aviation',name:'航空'}],
  zerg:[{id:'assault',name:'突击'},{id:'carapace',name:'甲壳'},{id:'flight',name:'飞行'}],
  protoss:[{id:'warriors',name:'战士'},{id:'robotics',name:'机械'},{id:'fleet',name:'舰队'}]
};
const e=(stat:TalentStat,amount:number,families:readonly string[],extra:Partial<Omit<TalentEffect,'stat'|'amount'|'families'>>={}):TalentEffect=>({stat,amount,families,...extra});
const b=['marine','marauder','reaper'],m=['hellion','tank','thor'],a=['viking','banshee'];
const zGround=['roach','ravager','hydralisk','lurker'],pWarriors=['zealot','adept','stalker'],pMech=['immortal','colossus'],pAir=['phoenix','void_ray','carrier'];
type Row=readonly [string,string,readonly TalentEffect[],string];
const r=(id:string,name:string,effects:readonly TalentEffect[],description:string):Row=>[id,name,effects,description];
function column(race:TalentRace,line:TalentColumn,rows:readonly Row[],capstone:Row):ThreeRaceTalentNode[]{
  if(rows.length!==12)throw new Error(`Talent column ${line} must have twelve normal nodes`);
  return [...rows,capstone].map(([id,name,effects,description],index)=>({id:`${race}_${line}_${id}`,race,line,tier:Math.floor(index/2)+1,column:index===12?0:index%2 as 0|1,name,maxRank:index===12?1:3,allocationCost:1,resourceCost:3,requiredLowerTierPoints:TALENT_TIER_THRESHOLDS[Math.floor(index/2)],effects,description}));
}
export const THREE_RACE_TALENTS:readonly ThreeRaceTalentNode[]=[
 ...column('terran','bio',[
  r('fire_control','步兵火控',[e('weaponDamagePct',.02,b)],'枪兵、劫掠者、死神伤害 +2%／级'),
  r('light_protection','轻型防护',[e('maxHpPct',.03,b)],'三种步兵生命 +3%／级'),
  r('march','行军整备',[e('moveSpeedPct',.02,b)],'三种步兵移速 +2%／级'),
  r('medical_battery','医疗电池',[e('energyRegenPct',.05,['medivac'])],'医疗艇回能 +5%／级'),
  r('marine_fire','枪兵速射',[e('attackSpeedPct',.03,['marine'])],'枪兵攻速 +3%／级'),
  r('marauder_armor','劫掠装甲',[e('armorFlat',.25,['marauder'])],'劫掠者护甲 +0.25／级'),
  r('reaper_range','死神校准',[e('rangePct',.02,['reaper'])],'死神射程 +2%／级'),
  r('medical_output','医疗专精',[e('healingPct',.04,['medivac'])],'医疗艇恢复输出 +4%／级，跨类型比例不变'),
  r('training','步兵训练',[e('productionTimeReductionPct',.03,b)],'三种步兵训练时间 −3%／级'),
  r('reserve_energy','储备能源',[e('maxEnergyFlat',10,['medivac'])],'医疗艇最大能量 +10／级'),
  r('bio_fire','生化火力',[e('weaponDamagePct',.03,['marine','marauder'])],'枪兵、劫掠者伤害 +3%／级'),
  r('reaper_stamina','死神耐力',[e('maxHpPct',.05,['reaper'])],'死神生命 +5%／级')
 ],r('capstone','战地续战',[e('regenMaxHpPerSecond',.004,b,{condition:{kind:'noEnemyDamage',seconds:4}}),e('energyRegenPct',.25,['medivac'])],'步兵连续4秒未受敌伤后每秒额外恢复最大生命0.4%；医疗艇回能 +25%')),
 ...column('terran','mechanical',[
  r('frame','机械骨架',[e('maxHpPct',.03,m)],'恶火、坦克、雷神生命 +3%／级'),
  r('line','产线整备',[e('productionTimeReductionPct',.02,m)],'地面机械训练时间 −2%／级'),
  r('flame','燃烧校准',[e('weaponDamagePct',.03,['hellion'])],'恶火、恶蝠伤害 +3%／级'),
  r('shell','炮弹装药',[e('weaponDamagePct',.03,['tank'])],'坦克两模式伤害 +3%／级'),
  r('thor_loading','雷神装填',[e('attackSpeedPct',.02,['thor'])],'雷神攻速 +2%／级'),
  r('heat_armor','耐热装甲',[e('armorFlat',.25,['hellion'])],'恶火、恶蝠护甲 +0.25／级'),
  r('hydraulics','部署液压',[e('transformTimeReductionPct',.06,['tank'])],'坦克架收时间 −6%／级'),
  r('heavy_frame','重型骨架',[e('maxHpPct',.04,['thor'])],'雷神生命 +4%／级'),
  r('procurement','机械采购',[e('productionCostReductionPct',.02,m)],'地面机械生产矿气 −2%／级'),
  r('range','火炮测距',[e('rangePct',.015,['tank'])],'坦克射程 +1.5%／级'),
  r('flame_cycle','燃烧循环',[e('attackSpeedPct',.03,['hellion'])],'恶火、恶蝠攻速 +3%／级'),
  r('thor_damage','重炮校准',[e('weaponDamagePct',.03,['thor'])],'雷神伤害 +3%／级')
 ],r('capstone','阵地核心',[e('weaponDamagePct',.18,['tank'],{condition:{kind:'mode',mode:'siege'}}),e('armorFlat',1,['hellion'],{condition:{kind:'mode',mode:'hellbat'}}),e('armorFlat',1,['thor'])],'架炮坦克伤害 +18%；恶蝠模式和雷神护甲 +1')),
 ...column('terran','aviation',[
  r('airframe','航空机体',[e('maxHpPct',.04,a)],'维京、女妖生命 +4%／级'),
  r('support_hull','支援外壳',[e('maxHpPct',.04,['science_vessel'])],'科技球生命 +4%／级'),
  r('viking_fire','维京火控',[e('weaponDamagePct',.03,['viking'])],'维京两模式伤害 +3%／级'),
  r('banshee_ammo','女妖弹药',[e('weaponDamagePct',.03,['banshee'])],'女妖伤害 +3%／级'),
  r('capacitor','科学电容',[e('maxEnergyFlat',10,['science_vessel'])],'科技球最大能量 +10／级'),
  r('scan','扫描校准',[e('detectionDurationFlat',.3,[],{raceAbility:true})],'主动侦测持续 +0.3秒／级'),
  r('escort_loading','护航装填',[e('attackSpeedPct',.02,['viking'])],'维京攻速 +2%／级'),
  r('repair','修复专精',[e('healingPct',.04,['science_vessel'])],'科技球恢复输出 +4%／级，跨类型比例不变'),
  r('assembly','飞行装配',[e('productionTimeReductionPct',.03,a)],'维京、女妖训练时间 −3%／级'),
  r('power','科学供能',[e('energyRegenPct',.05,['science_vessel'])],'科技球回能 +5%／级'),
  r('escort_range','护航测距',[e('rangePct',.02,['viking'])],'维京射程 +2%／级'),
  r('banshee_armor','女妖防护',[e('armorFlat',.25,['banshee'])],'女妖护甲 +0.25／级')
 ],r('capstone','航空协同',[e('attackSpeedPct',.12,a),e('energyRegenPct',.25,['science_vessel'])],'维京、女妖攻速 +12%；科技球回能 +25%')),
 ...column('zerg','assault',[
  r('skin','柔韧外皮',[e('maxHpPct',.04,['zergling','baneling'])],'跳虫、爆虫生命 +4%／级'),
  r('legs','突击足肢',[e('moveSpeedPct',.02,['zergling'])],'跳虫移速 +2%／级'),
  r('claws','利爪进化',[e('weaponDamagePct',.03,['zergling'])],'跳虫伤害 +3%／级'),
  r('baneling_cost','爆虫培育',[e('productionCostReductionPct',.02,['baneling'])],'爆虫完整配方矿气 −2%／级'),
  r('bite','连续撕咬',[e('attackSpeedPct',.02,['zergling'])],'跳虫攻速 +2%／级'),
  r('sac','酸囊保护',[e('maxHpPct',.05,['baneling'])],'爆虫生命 +5%／级'),
  r('ultralisk_hp','巨兽组织',[e('maxHpPct',.04,['ultralisk'])],'雷兽生命 +4%／级'),
  r('acid','强酸配方',[e('weaponDamagePct',.03,['baneling'])],'爆虫爆炸伤害 +3%／级'),
  r('hatch','虫群孵育',[e('productionTimeReductionPct',.03,['zergling','baneling','ultralisk'])],'跳虫、爆虫、雷兽完整生产时间 −3%／级'),
  r('ultralisk_armor','巨兽甲壳',[e('armorFlat',.25,['ultralisk'])],'雷兽护甲 +0.25／级'),
  r('blades','巨刃进化',[e('weaponDamagePct',.03,['ultralisk'])],'雷兽伤害 +3%／级'),
  r('zergling_armor','跳虫甲壳',[e('armorFlat',.25,['zergling'])],'跳虫护甲 +0.25／级')
 ],r('capstone','突击韧性',[e('armorFlat',2,['zergling','ultralisk'],{condition:{kind:'threshold',resource:'hp',atMost:.5}}),e('weaponDamagePct',.15,['baneling'])],'跳虫、雷兽生命不高于50%时护甲 +2；爆虫爆炸伤害 +15%')),
 ...column('zerg','carapace',[
  r('tissue','厚实组织',[e('maxHpPct',.04,['roach','ravager'])],'蟑螂、破坏者生命 +4%／级'),
  r('hydra_hp','刺蛇韧性',[e('maxHpPct',.04,['hydralisk'])],'刺蛇生命 +4%／级'),
  r('metabolism','虫后代谢',[e('energyRegenPct',.05,['queen'])],'虫后回能 +5%／级'),
  r('spines','针刺循环',[e('attackSpeedPct',.02,['hydralisk'])],'刺蛇攻速 +2%／级'),
  r('bile_damage','胆汁浓度',[e('abilityDamagePct',.04,['ravager'],{ability:'bile'})],'胆汁伤害 +4%／级'),
  r('roach_armor','蟑螂甲壳',[e('armorFlat',.25,['roach'])],'蟑螂护甲 +0.25／级'),
  r('burrow','地下部署',[e('transformTimeReductionPct',.06,['lurker'])],'潜伏者埋出时间 −6%／级'),
  r('transfusion','输血强化',[e('healingPct',.04,['queen'])],'虫后治疗 +4%／级'),
  r('evolution','进化培育',[e('productionTimeReductionPct',.02,[...zGround,'queen'])],'蟑螂、破坏者、刺蛇、潜伏者、虫后生产时间 −2%／级'),
  r('regeneration','再生组织',[e('regenMaxHpPerSecond',.001,zGround)],'蟑螂、破坏者、刺蛇、潜伏者每秒额外恢复最大生命0.1%／级'),
  r('lurker_damage','地刺强化',[e('weaponDamagePct',.03,['lurker'])],'潜伏者伤害 +3%／级'),
  r('bile_cooldown','胆汁循环',[e('abilityCooldownReductionPct',.03,['ravager'],{ability:'bile'})],'胆汁冷却 −3%／级')
 ],r('capstone','顽强进化',[e('regenMaxHpPerSecond',.005,zGround,{condition:{kind:'noEnemyDamage',seconds:4}}),e('energyRegenPct',.2,['queen'])],'四种地面进化单位连续4秒未受敌伤后每秒额外恢复最大生命0.5%；虫后回能 +20%')),
 ...column('zerg','flight',[
  r('muta_hp','异龙组织',[e('maxHpPct',.04,['mutalisk'])],'异龙生命 +4%／级'),
  r('corruptor_hp','腐化外壳',[e('maxHpPct',.04,['corruptor'])],'腐化者生命 +4%／级'),
  r('glaives','刃虫强化',[e('weaponDamagePct',.03,['mutalisk'])],'异龙伤害 +3%／级'),
  r('spores','腐蚀孢子',[e('weaponDamagePct',.03,['corruptor'])],'腐化者伤害 +3%／级'),
  r('tendons','飞行肌腱',[e('moveSpeedPct',.02,['mutalisk'])],'异龙移速 +2%／级'),
  r('shell','厚重外壳',[e('armorFlat',.25,['corruptor'])],'腐化者护甲 +0.25／级'),
  r('cycle','刃虫循环',[e('attackSpeedPct',.02,['mutalisk'])],'异龙攻速 +2%／级'),
  r('senses','感知扩张',[e('detectionRadiusPct',.02,[],{raceAbility:true})],'主动侦测半径 +2%／级'),
  r('muta_cost','异龙培育',[e('productionCostReductionPct',.02,['mutalisk'])],'异龙生产矿气 −2%／级'),
  r('corruptor_cost','腐化培育',[e('productionCostReductionPct',.02,['corruptor'])],'腐化者生产矿气 −2%／级'),
  r('muta_time','异龙孵化',[e('productionTimeReductionPct',.03,['mutalisk'])],'异龙训练时间 −3%／级'),
  r('corruptor_time','腐化孵化',[e('productionTimeReductionPct',.03,['corruptor'])],'腐化者训练时间 −3%／级')
 ],r('capstone','空中猎群',[e('attackSpeedPct',.15,['mutalisk']),e('weaponDamagePct',.2,['corruptor'])],'异龙攻速 +15%；腐化者伤害 +20%')),
 ...column('protoss','warriors',[
  r('physique','战士体魄',[e('maxHpPct',.04,pWarriors)],'狂热者、使徒、追猎者生命 +4%／级'),
  r('shield','护盾织构',[e('maxShieldPct',.03,pWarriors)],'三种战士最大护盾 +3%／级'),
  r('blades','灵能刀锋',[e('weaponDamagePct',.03,['zealot'])],'狂热者伤害 +3%／级'),
  r('adept_fire','使徒速射',[e('attackSpeedPct',.03,['adept'])],'使徒攻速 +3%／级'),
  r('stalker_damage','追猎校准',[e('weaponDamagePct',.03,['stalker'])],'追猎者伤害 +3%／级'),
  r('stride','冲锋步幅',[e('moveSpeedPct',.02,['zealot'])],'狂热者移速 +2%／级'),
  r('recharge','护盾回充',[e('shieldRegenPct',.05,pWarriors)],'三种战士回盾速度 +5%／级'),
  r('blink','闪烁整备',[e('abilityCooldownReductionPct',.03,['stalker'],{ability:'blink'})],'已解锁闪烁冷却 −3%／级'),
  r('training','传送整备',[e('productionTimeReductionPct',.03,pWarriors)],'三种战士训练时间 −3%／级'),
  r('adept_stride','使徒步幅',[e('moveSpeedPct',.02,['adept'])],'使徒移速 +2%／级'),
  r('shield_armor','护盾硬化',[e('shieldArmorFlat',.25,pWarriors)],'三种战士护盾护甲 +0.25／级'),
  r('range','追猎测距',[e('rangePct',.02,['stalker'])],'追猎者射程 +2%／级')
 ],r('capstone','坚毅屏障',[e('maxShieldPct',.1,pWarriors),e('armorFlat',2,pWarriors,{condition:{kind:'threshold',resource:'shield',atMost:.25}})],'三种战士最大护盾 +10%；护盾不高于25%时生命护甲 +2')),
 ...column('protoss','robotics',[
  r('immortal_hp','不朽机体',[e('maxHpPct',.04,['immortal'])],'不朽者生命 +4%／级'),
  r('colossus_hp','巨像骨架',[e('maxHpPct',.04,['colossus'])],'巨像生命 +4%／级'),
  r('cannon','相位火炮',[e('weaponDamagePct',.03,['immortal'])],'不朽者伤害 +3%／级'),
  r('thermal','热能聚焦',[e('weaponDamagePct',.03,['colossus'])],'巨像伤害 +3%／级'),
  r('immortal_shield','不朽屏障',[e('maxShieldPct',.04,['immortal'])],'不朽者最大护盾 +4%／级'),
  r('colossus_shield','巨像屏障',[e('maxShieldPct',.04,['colossus'])],'巨像最大护盾 +4%／级'),
  r('armor','不朽装甲',[e('armorFlat',.25,['immortal'])],'不朽者生命护甲 +0.25／级'),
  r('stride','巨像步幅',[e('moveSpeedPct',.02,['colossus'])],'巨像移速 +2%／级'),
  r('assembly','机械装配',[e('productionTimeReductionPct',.03,pMech)],'不朽者、巨像训练时间 −3%／级'),
  r('recharge','机械回充',[e('shieldRegenPct',.05,pMech)],'两种机械回盾速度 +5%／级'),
  r('cycle','火炮循环',[e('attackSpeedPct',.02,['immortal'])],'不朽者攻速 +2%／级'),
  r('range','热能测距',[e('rangePct',.015,['colossus'])],'巨像射程 +1.5%／级')
 ],r('capstone','机械壁垒',[e('maxShieldPct',.2,pMech),e('shieldDelayReductionSeconds',1,pMech)],'不朽者、巨像最大护盾 +20%；受伤回盾延迟 −1秒，最低1秒')),
 ...column('protoss','fleet',[
  r('sentry_hp','哨兵外壳',[e('maxHpPct',.04,['sentry'])],'哨兵生命 +4%／级'),
  r('templar_energy','圣堂储能',[e('maxEnergyFlat',10,['high_templar'])],'高阶圣堂最大能量 +10／级'),
  r('sentry_power','哨兵供能',[e('energyRegenPct',.05,['sentry'])],'哨兵回能 +5%／级'),
  r('phoenix_damage','凤凰火控',[e('weaponDamagePct',.03,['phoenix'])],'凤凰伤害 +3%／级'),
  r('storm','风暴聚焦',[e('abilityDamagePct',.04,['high_templar'],{ability:'storm'})],'灵能风暴总伤害 +4%／级'),
  r('void_ray_damage','辉光聚焦',[e('weaponDamagePct',.03,['void_ray'])],'虚空辉光舰伤害 +3%／级'),
  r('carrier_shield','航母屏障',[e('maxShieldPct',.04,['carrier'])],'航母最大护盾 +4%／级'),
  r('scan','灵能回响',[e('detectionDurationFlat',.3,[],{raceAbility:true})],'主动侦测持续 +0.3秒／级'),
  r('assembly','舰队装配',[e('productionTimeReductionPct',.03,pAir)],'三种航空单位训练时间 −3%／级'),
  r('efficiency','施法节能',[e('abilityEnergyReductionPct',.03,['sentry','high_templar'])],'哨兵、高阶圣堂技能耗能 −3%／级'),
  r('templar_power','圣堂供能',[e('energyRegenPct',.05,['high_templar'])],'高阶圣堂回能 +5%／级'),
  r('interceptors','舰载火控',[e('weaponDamagePct',.03,['carrier'],{ownedSummon:'interceptor',summonsOnly:true})],'所属截击机伤害 +3%／级，仅结算一次')
 ],r('capstone','灵能舰队',[e('energyRegenPct',.25,['sentry','high_templar']),e('weaponDamagePct',.12,['phoenix','void_ray']),e('weaponDamagePct',.12,['carrier'],{ownedSummon:'interceptor',summonsOnly:true})],'哨兵、高阶圣堂回能 +25%；凤凰、虚空辉光舰、所属截击机伤害 +12%'))
];
export const THREE_RACE_TALENT_BY_ID:ReadonlyMap<string,ThreeRaceTalentNode>=new Map(THREE_RACE_TALENTS.map(node=>[node.id,node]));
export type TalentLevels=Readonly<Record<string,number>>;
export const allocatedTalentPoints=(levels:TalentLevels)=>Object.values(levels).reduce((sum,rank)=>sum+rank,0);
export function lowerTierTalentPoints(levels:TalentLevels,node:ThreeRaceTalentNode):number{
 return THREE_RACE_TALENTS.reduce((sum,other)=>sum+(other.race===node.race&&other.line===node.line&&other.tier<node.tier?(levels[other.id]??0):0),0);
}
/** Null means valid; rejection leaves the caller's existing profile untouched. */
export function validateTalentAllocation(race:TalentRace,levels:TalentLevels):string|null{
 if(!['terran','zerg','protoss'].includes(race)||!levels||typeof levels!=='object'||Array.isArray(levels))return 'invalid-allocation';
 for(const [id,rank] of Object.entries(levels)){
  const node=THREE_RACE_TALENT_BY_ID.get(id);
  if(!node||node.race!==race||!Number.isSafeInteger(rank)||rank<0||rank>node.maxRank)return 'invalid-node-rank';
 }
 if(allocatedTalentPoints(levels)>TALENT_ALLOCATION_CAP)return 'allocation-cap';
 for(const [id,rank] of Object.entries(levels))if(rank>0){const node=THREE_RACE_TALENT_BY_ID.get(id)!;if(lowerTierTalentPoints(levels,node)<node.requiredLowerTierPoints)return 'tier-locked';}
 return null;
}
export interface TalentEffectContext {
 race:TalentRace; kind:'ordinary'|'elite'|'hero'|'worker'|'summon'|'raceAbility'; familyId?:string;
 ownerFamilyId?:string; summonType?:string; mode?:string; hp?:number; maxHp?:number;
 shield?:number; maxShield?:number; secondsSinceEnemyDamage?:number; ability?:string;
}
function matchesEffect(effect:TalentEffect,context:TalentEffectContext):boolean{
 if(effect.raceAbility)return context.kind==='raceAbility';
 if(context.kind==='hero'||context.kind==='worker'||context.kind==='raceAbility')return false;
 if(context.kind==='summon'){
  if(!effect.ownedSummon||context.summonType!==effect.ownedSummon||!context.ownerFamilyId||!effect.families.includes(context.ownerFamilyId))return false;
 }else if(effect.summonsOnly||!context.familyId||!effect.families.includes(context.familyId))return false;
 if(effect.ability&&effect.ability!==context.ability)return false;
 const condition=effect.condition;if(!condition)return true;
 if(condition.kind==='mode')return condition.mode===context.mode;
 if(condition.kind==='noEnemyDamage')return (context.secondsSinceEnemyDamage??0)>=condition.seconds;
 const maximum=condition.resource==='hp'?context.maxHp:context.maxShield,current=condition.resource==='hp'?context.hp:context.shield;
 return maximum!==undefined&&maximum>0&&current!==undefined&&current>=0&&current/maximum<=condition.atMost;
}
/** Add once per stat, then apply once in the existing rank/technology damage order. */
export function aggregateTalentEffects(levels:TalentLevels,context:TalentEffectContext):Partial<Record<TalentStat,number>>{
 const result:Partial<Record<TalentStat,number>>={};
 for(const [id,rank] of Object.entries(levels)){
  const node=THREE_RACE_TALENT_BY_ID.get(id);if(!node||node.race!==context.race||!Number.isSafeInteger(rank)||rank<=0||rank>node.maxRank)continue;
  for(const effect of node.effects)if(matchesEffect(effect,context))result[effect.stat]=(result[effect.stat]??0)+effect.amount*rank;
 }
 return result;
}
export function talentAdjustedTransformSeconds(base:number,reduction:number){return Math.max(.25,base*(1-reduction));}
export function talentAdjustedShieldDelaySeconds(base:number,reduction:number){return Math.max(1,base-reduction);}
