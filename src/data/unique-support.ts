import type {Race} from './races';
export const UNIQUE_SUPPORT={
 'terran.ricochet':{race:'terran',rarity:'green',name:'跳弹弹链',description:'步兵实弹跳向额外目标 · 25/35/45%触发'},
 'terran.bunker':{race:'terran',rarity:'blue',name:'空降地堡',description:'部署30秒临时地堡 · 耐久与双枪火力随层数提升'},
 'terran.missiles':{race:'terran',rarity:'purple',name:'导弹齐射',description:'每24秒发射4/6/8枚集束导弹'},
 'terran.overdrive':{race:'terran',rarity:'orange',name:'火力超载',description:'主动 · 8秒攻速+20/30/40%，移速+15%'},
 'zerg.hatch':{race:'zerg',rarity:'green',name:'尸骸孵育',description:'附近12次击杀孵化2/3/4只临时跳虫'},
 'zerg.consume':{race:'zerg',rarity:'blue',name:'吞噬回收',description:'附近尸骸产生恢复40/60/80生命的精华'},
 'zerg.parasite':{race:'zerg',rarity:'purple',name:'寄生毒囊',description:'普攻植入毒囊 · 宿主死亡酸爆80/120/160'},
 'zerg.evolve':{race:'zerg',rarity:'orange',name:'应激进化',description:'主动 · 生物单位回血15/22.5/30%，强化甲壳8秒'},
 'protoss.reserve':{race:'protoss',rarity:'green',name:'护盾回流',description:'自然回盾溢出转为15/22.5/30%护盾储备'},
 'protoss.counter':{race:'protoss',rarity:'blue',name:'破盾反击',description:'原生盾击破时反击120/180/240伤害并减速'},
 'protoss.echo':{race:'protoss',rarity:'purple',name:'相位回响',description:'每3次普攻延迟追加35/50/65%相位伤害'},
 'protoss.prism':{race:'protoss',rarity:'orange',name:'棱镜扫射',description:'主动 · 定向持续扫射800/1100/1400伤害'},
} as const;
export type UniqueSupportId=keyof typeof UNIQUE_SUPPORT;
export const tacticalCard=(race:Race):UniqueSupportId=>race==='terran'?'terran.overdrive':race==='zerg'?'zerg.evolve':'protoss.prism';
