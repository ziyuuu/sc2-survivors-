import type {HeroId} from './heroes';
export const PROTOSS_HERO_IDS=['artanis','zeratul','alarak','fenix','vorazun','purifier_flagship'] as const;
export type ProtossHeroId=typeof PROTOSS_HERO_IDS[number];
export const isProtossHero=(id:HeroId|undefined):id is ProtossHeroId=>!!id&&(PROTOSS_HERO_IDS as readonly string[]).includes(id);
/** Explicit runtime values. The approved proposal remains a documentation/QA input only. */
export function protossHeroGrowth(rank:number){const n=Math.max(0,Math.min(4,rank-1)),period=1-.05*n;return {health:1+.35*n,damage:(1+.35*n)*period,period,armor:.5*n,passive:1+.35*n,skill:[9200,12880,16560,20240,23920][n]};}
export const PROTOSS_HERO_RULES={
 artanis:{shieldRate:560,range:8,targets:7,damageReduction:.3,cleaveEvery:3,cleaveDegrees:150,seconds:8,immediate:[.2,.3,.4,.5,.6],pulse:[.1,.125,.15,.175,.2]},
 zeratul:{openingCycles:3,openingFactor:3,idle:2,openingCooldown:12,echoEvery:4,echoFraction:.5,echoDelay:.4},
 alarak:{maxPower:20,powerDamage:.05,powerArmor:.3,hits:3,killRange:9},
 fenix:{solarEvery:4,solarFraction:2.5,solarRadius:3.5,restore:.6,cooldown:20,overdrive:6,speed:1},
 vorazun:{veilRange:8,veilSeconds:6,idle:2,veilCooldown:14,controlledFactor:2.5,stasis:[4.5,5,5.5,6,6.5],bossSlow:[.45,.5,.55,.6,.65]},
 purifier_flagship:{children:12,childDamage:250,childPeriod:.4,shieldRate:420,range:8,targets:7,overdrive:6,cooldown:18,speed:1},
} as const;
export const PROTOSS_HERO_PASSIVE_DESCRIPTIONS={
 artanis:'持续重构最多七名友军的原生护盾；保护附近原生盾友军。每第三周期双刃扇斩，主动在八秒内持续回盾。',
 zeratul:'脱战后获得三个强化攻击周期，四次主攻击后延迟回响斩向原目标。虚空斩附带两名邻敌伤害，原侦测规则保留。',
 alarak:'附近敌亡与对精英、Boss的连续主攻击积累权势，最多二十层，提升火力和护甲。毁灭波贯穿并减速。',
 fenix:'每第四周期发射额外太阳炮。原生盾被敌伤击破后重构并短时超载，二十秒内只能触发一次。',
 vorazun:'友军脱战后获得限时暗影帷幕，攻击解除帷幕。攻击被控制的目标造成强化伤害；时间停滞对普通敌人停滞，对Boss只减速。',
 purifier_flagship:'十二架真实所属截击机组成火网，母舰无普通武器。重构最多七名友军的原生盾，母舰受盾伤触发子机超载。',
} as const;
