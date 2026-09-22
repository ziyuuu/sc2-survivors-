import type {TerranType} from './sc2-units';
import {rankStats} from './ranks';
/** USER_CONFIRMED game tuning. These are not original SC2 skin abilities. */
export type EliteId=`${TerranType}.${1|2|3}`;
export type EliteTemplate='quick'|'heavy'|'guard'|'mobile'|'support';
export const ELITE_TEMPLATES={
 quick:{output:1.3,as:1.45,hp:1.15,move:1.1,armor:0,dpsStep:.25,asStep:.1,hpStep:.12},
 heavy:{output:1.45,as:.9,hp:1.15,move:1,armor:.5,dpsStep:.3,asStep:.04,hpStep:.12},
 guard:{output:1.1,as:1,hp:1.65,move:1,armor:1,dpsStep:.15,asStep:.04,hpStep:.25},
 mobile:{output:1.2,as:1.15,hp:1.2,move:1.2,armor:.5,dpsStep:.2,asStep:.06,hpStep:.12},
 support:{output:1.25,as:1,hp:1.25,move:1.1,armor:.5,dpsStep:.25,asStep:0,hpStep:.15},
} as const;
export interface EliteDefinition {id:EliteId;family:TerranType;name:string;template:EliteTemplate;description:string;model:string;sourceModel:string;icon:string}
const family=(type:TerranType,rows:readonly (readonly [string,EliteTemplate,string])[]):EliteDefinition[]=>rows.map(([name,template,description],i)=>({id:`${type}.${i+1}` as EliteId,family:type,name,template,description,model:`elite.${type}.${i+1}`,sourceModel:`${type} / ${i===0?'Covert Ops':i===1?(type==='tank'?'Junker':'Merc'):type==='tank'?'Commando':'Junker'}`,icon:'unit.'+type}));
export const ELITES:Record<EliteId,EliteDefinition>=Object.fromEntries([
 ...family('marine',[['突击枪兵','quick','兴奋剂不扣血，期间每秒恢复 1% 最大生命。'],['重火力枪兵','heavy','对重甲总伤害额外提高 25%。'],['重装枪兵','guard','强化装甲与生命，适合持续交战。']]),
 ...family('marauder',[['压制劫掠者','quick','命中降低移速及攻速 30%，持续 1.5 秒；Boss 效果减半。'],['破甲劫掠者','heavy','每 15 秒额外发射三倍单发伤害的破甲弹药。'],['堡垒劫掠者','guard','高生命与护甲，承担前线压力。']]),
 ...family('hellion',[['高速恶火','mobile','转向与加速提高 20%。'],['焚烧恶火','heavy','附加三秒灼烧，每秒为该次直接伤害的 20%；同来源刷新。'],['清场恶火','quick','火焰宽度 ×1.5，长度 ×1.25。']]),
 ...family('tank',[['重型攻城坦克','heavy','架起后每三秒射程 +1，最多 +3；收炮清除。'],['重炮坦克','heavy','攻速 ×0.8、单发补偿，攻城溅射半径 ×1.25。'],['突击坦克','mobile','架起与收起时间 ×0.75。']]),
 ...family('medivac',[['急救医疗艇','support','单目标治疗额外 ×1.25。'],['群疗医疗艇','support','额外治疗两名伤员，各为主治疗量的一半；按实际治疗耗能。'],['维修医疗艇','support','机械治疗 ×1.5，能耗 ×0.75；仍需要纳米维修。']]),
].map(e=>[e.id,e])) as Record<EliteId,EliteDefinition>;
export function eliteStats(id:EliteId,rank:number){const t=ELITE_TEMPLATES[ELITES[id].template],n=Math.max(0,Math.min(4,rank-1)),base=rankStats(5),attackSpeed=base.attackSpeed*t.as*(1+t.asStep*n)*(id==='tank.2'?.8:1),output=5*t.output*(1+t.dpsStep*n);
 return {rank,attackSpeed,damage:output/attackSpeed,health:base.health*t.hp*(1+t.hpStep*n),armor:base.armor+t.armor+.25*n,movement:t.move+(ELITES[id].template==='mobile'?.025*n:0),healing:5*1.25*(1+.25*n)*(id==='medivac.1'?1.25:1),energy:5*(1+.2*n)};
}
