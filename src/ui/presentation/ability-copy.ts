import {HEROES,type HeroId} from '../../data/heroes';
import {PROTOSS_HERO_PASSIVE_DESCRIPTIONS,isProtossHero} from '../../data/protoss-heroes';
import {ZERG_HERO_PASSIVE_DESCRIPTIONS,isZergHero} from '../../data/zerg-heroes';
/** Display copy follows expedition-heroes / terran-hero-passives. No executable rules. */
const ACTIVE:Record<HeroId,string>={
 raynor:'向目标方向释放贯穿射击，沿路径命中合法敌人。',tychus:'投掷范围手雷，存活的非建筑敌人随后受到三次持续伤害。',nova:'蓄势后沿直线狙击非建筑敌人，并准备下一次强化攻击。',
 swann:'锁定最多七名永久机械友军，提供五秒保护，并在四秒内分次维修。',tosh:'锁定施放时战场视野内可见且有攻击通路的敌人，延迟造成精神伤害。',yamato_battlecruiser:'聚变炮命中主目标，并对附近最多五个额外目标造成部分伤害。',
 kerrigan:'释放沿路径推进的灵能冲击。',zagara:'向三个相邻方向发射爆虫弹幕，命中地面非建筑敌人。',dehaka:'吞噬近处目标，造成伤害后恢复生命、获得精华与临时生命储备。',stukov:'范围腐蚀冲击后，对存活目标追加四次持续伤害。',niadra:'恢复友军并开启八秒复生窗口，按实际剩余次数逐一复生编制。',hots_leviathan:'在目标区域连续释放三轮生体等离子风暴。',
 artanis:'锁定最多七名原生护盾友军，立即回盾并在八秒内持续重构。',zeratul:'斩击主目标，并对附近最多两名地面非建筑敌人造成部分伤害。',alarak:'释放贯穿毁灭波并减速命中的敌人。',fenix:'发射太阳炮，在目标区域造成范围伤害。',vorazun:'使普通敌人停滞；对 Boss 和领主施加移动与攻击减速。',purifier_flagship:'在目标区域引爆聚变核爆；所属存活子机参与聚能表现。',
};
const TERRAN:Partial<Record<HeroId,string>>={
 raynor:'强化陆战队、劫掠者与收割者编制。持续攻击同一目标时，每第三次主攻击追加打击。',
 tychus:'持续开火逐渐提升攻速；连续射击时减少所受伤害，每第五周期追加范围压制。',
 nova:'脱战后短暂隐形并准备强化首击；对精英与 Boss 的主攻击有额外强化。',
 swann:'持续维修最多七名受伤永久机械友军，并强化永久机械友军的攻击与护甲。',
 tosh:'射击时削弱附近敌方火力，每第四主攻击周期追加范围冲击。',
 yamato_battlecruiser:'正面承受的敌方伤害降低，每第八主攻击周期对附近最多四个额外目标追加打击。',
};
export function heroAbilityCopy(id:HeroId){return {active:ACTIVE[id]+` 基础冷却 ${HEROES[id].cooldown} 秒。`,passive:isProtossHero(id)?PROTOSS_HERO_PASSIVE_DESCRIPTIONS[id]:isZergHero(id)?ZERG_HERO_PASSIVE_DESCRIPTIONS[id]:TERRAN[id]!};}
