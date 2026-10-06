import type {HeroId} from './heroes';
/** Explicit P3-B runtime contract; proposal JSON stays documentation/QA only. */
export const ZERG_HERO_IDS=['kerrigan','zagara','dehaka','stukov','niadra','hots_leviathan'] as const;
export type ZergHeroId=typeof ZERG_HERO_IDS[number];
export const isZergHero=(id:HeroId|undefined):id is ZergHeroId=>!!id&&(ZERG_HERO_IDS as readonly string[]).includes(id);
export const ZERG_HERO_PASSIVE_DESCRIPTIONS={
 kerrigan:'每三次主攻击横扫附近地面敌人。实际生命伤害的25%转为8秒护障，上限为自身最大生命的80%。',
 zagara:'永久生物战斗友军攻速+40%、移动+20%。附近每10次击杀孵化2只爆虫，最多6只、存活10秒；爆虫击杀不继续触发孵化。',
 dehaka:'附近死亡提供精华，吞噬额外提供8精华；精华提升攻击、生命和护甲。吞噬回复20%最大生命，并获得8秒独立生命储备。',
 stukov:'普通攻击附加6秒感染，感染宿主死亡留下4秒生物治疗池，重叠取最强。每六次主攻击追加范围爆破。',
 niadra:'持续治疗最多7名受伤生物友军，寄生宿主死亡触发范围回血。主动登记8秒复生窗口，每秒复生一个编制；I/V有2/4次，双跳虫共用一次。',
 hots_leviathan:'附近永久生物战斗友军生命+25%。每2秒触须攻击最多4个合法目标；主动释放三轮生体等离子风暴。',
} as const;
export function zergHeroGrowth(rank:number){const n=Math.max(0,Math.min(4,rank-1)),period=1-.05*n;return {health:1+.35*n,damage:(1+.35*n)*period,period,armor:.5*n,passive:1+.35*n,skill:[9200,12880,16560,20240,23920][n]};}
export const ZERG_HERO_RULES={
 kerrigan:{barrierFraction:.25,barrierMaxHp:.8,barrierSeconds:8,cleaveEvery:3,cleaveFraction:2,cleaveRadius:3.5},
 zagara:{speed:.4,move:.2,kills:10,spawnCount:2,lifetime:10,limit:6,killRadius:10},
 dehaka:{killEssence:1,devourEssence:8,essenceK:30,damage:.6,health:.8,armor:6,adaptation:8,regen:.03,armorIgnore:.5,range:1,reserveSeconds:8,healFraction:.2,reserve:[.3,.45,.6,.75,.9]},
 stukov:{infectionSeconds:6,poolSeconds:4,poolRadius:4,heal:220,grenadeEvery:6,grenadeFraction:2,grenadeRadius:3},
 niadra:{heal:550,targets:7,range:8,parasiteSeconds:5,deathHeal:400,deathRadius:5,revivalSeconds:8,revivalRange:6,revivalSeats:7,charges:[2,2,3,3,4],revive:[.4,.475,.55,.625,.7],immediate:[.2,.25,.3,.35,.4]},
 hots_leviathan:{tentaclePeriod:2,tentacleTargets:4,tentacleDamage:600,tentacleRange:6,health:.25,healthRadius:10},
} as const;
