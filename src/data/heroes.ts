import type {Race} from './races';
import type {CombatUnitType} from './sc2-units';
/** Keep this list frozen for legacy reward tables and legacy 1/2/3 bindings. */
export const HERO_IDS=['raynor','tychus','nova'] as const;
export const HERO_IDS_BY_RACE={terran:['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'],zerg:['kerrigan','zagara','dehaka','stukov','niadra','hots_leviathan'],protoss:['artanis','zeratul','alarak','fenix','vorazun','purifier_flagship']} as const;
export const ALL_HERO_IDS=[...HERO_IDS_BY_RACE.terran,...HERO_IDS_BY_RACE.zerg,...HERO_IDS_BY_RACE.protoss] as const;
export type HeroId=typeof ALL_HERO_IDS[number];
/** F06 approved basic attack modifiers, applied once at stat derivation (including flagship children). */
export const HERO_BASIC_ATTACK={damage:1.15,frequency:1.15} as const;
/** Actual simulation projectile travel, shared with presentation. Windup is delay minus this value. */
export const HERO_SKILL_FLIGHT:Partial<Record<HeroId,number>>={raynor:.2,tychus:.6,tosh:.2,kerrigan:.2,zagara:.35,stukov:.25,alarak:.2,fenix:.4,yamato_battlecruiser:.25,hots_leviathan:.4,purifier_flagship:.4};
export interface HeroDefinition {
 name:string;race:Race;hp:number;shield:number;armor:number;damage:number;attacks:number;period:number;range:number;speed:number;
 target:'ground'|'both'|'none';baseFamily:CombatUnitType;attributes:readonly string[];innateCloak:boolean;flying?:boolean;
 skill:string;skillDamage:number;skillRange:number;cooldown:number;delay:number;radius:number;length:number;width:number;model:string;
}
const define=(race:Race,name:string,hp:number,shield:number,armor:number,damage:number,period:number,range:number,speed:number,baseFamily:CombatUnitType,skill:string,skillDamage:number,skillRange:number,cooldown:number,delay:number,radius:number,length=0,width=0,extra:Partial<HeroDefinition>={}):HeroDefinition=>({race,name,hp,shield,armor,damage,attacks:1,period,range,speed,target:'both',baseFamily,attributes:['Biological','Heroic'],innateCloak:false,skill,skillDamage,skillRange,cooldown,delay,radius,length,width,model:'',...extra});
/** Approved Survivors tuning. New hero numbers are experimental, not original multiplayer balance. */
export const HEROES:Record<HeroId,HeroDefinition>={
 raynor:define('terran','雷诺',9500,0,10,360,.2,7.5,4,'marine','穿透射击',5060,12,12,.2,.5,12,1.4,{model:'hero.raynor'}),
 tychus:define('terran','泰凯斯',11000,0,12,300,.1,6.5,3.6,'marine','手雷',4140,5,14,.6,3.2,0,0,{model:'hero.tychus'}),
 nova:define('terran','诺娃',11000,1600,6,1100,.5,10,4.8,'marine','狙击',6900,12,18,.35,.5,12,1,{model:'hero.nova'}),
 swann:define('terran','斯旺',10000,0,14,420,.3,8,3.2,'marauder','紧急抢修',0,7,30,1,0,0,0,{model:'hero.swann',target:'ground'}),
 tosh:define('terran','托什',8500,0,8,480,.3,8,4.3,'marine','精神冲击',4600,10000,35,.5,2.8,0,0,{model:'hero.tosh'}),
 kerrigan:define('zerg','凯瑞甘',18000,0,14,1800,.2,1.8,4.5,'zergling','灵能冲击',5520,11,12,.5,0,11,2.2,{model:'hero.kerrigan',target:'ground'}),
 zagara:define('zerg','扎加拉',13000,0,10,1150,.2,8,3.8,'queen','爆虫弹幕',2300,9,16,.7,1.7,0,0,{model:'hero.zagara'}),
 dehaka:define('zerg','德哈卡',23000,0,16,2100,.25,2,3.6,'ultralisk','原始吞噬',9660,3,20,.35,0,0,0,{model:'hero.dehaka',target:'ground'}),
 stukov:define('zerg','斯托科夫',15000,0,12,1500,.3,8,3.5,'hydralisk','腐蚀弹',1840,9,16,.25,3,0,0,{model:'hero.stukov'}),
 niadra:define('zerg','妮雅德拉',14500,0,11,650,.4,7,3.7,'queen','殖群复生',0,6,35,0,6,0,0,{model:'hero.niadra'}),
 artanis:define('protoss','阿塔尼斯',11000,10000,15,550,.28,1.8,3.9,'zealot','护盾复苏',0,6,24,0,6,0,0,{model:'hero.artanis',attacks:2,target:'ground'}),
 zeratul:define('protoss','泽拉图',8000,7000,8,800,.24,1.6,5.2,'zealot','虚空斩',10120,3,18,.25,1.2,0,0,{model:'hero.zeratul',target:'ground',innateCloak:true}),
 alarak:define('protoss','阿拉纳克',15000,8000,14,800,.22,2,3.9,'zealot','毁灭波',5520,10,14,.55,0,10,2.6,{model:'hero.alarak',target:'ground'}),
 fenix:define('protoss','菲尼克斯',11000,12000,15,950,.25,9,3.5,'immortal','太阳炮',5980,10,16,.6,3.2,0,0,{model:'hero.fenix',attributes:['Mechanical','Armored','Heroic']}),
 vorazun:define('protoss','沃拉尊',8500,7500,9,550,.28,1.8,4.8,'zealot','时间停滞',0,10,18,.25,5.5,0,0,{model:'hero.vorazun',target:'ground',innateCloak:true}),
 yamato_battlecruiser:define('terran','大和战列巡洋舰',22000,0,18,660,.2,10,2.9,'yamato_battlecruiser','大和聚变炮',9200,11,25,1.25,2.8,0,0,{model:'hero.yamato_battlecruiser',flying:true,attacks:2,attributes:['Mechanical','Armored','Massive','Heroic']}),
 hots_leviathan:define('zerg','利维坦',26000,0,18,2300,.25,9,2.8,'hots_leviathan','生体等离子风暴',2760,10,26,.8,3.5,0,0,{model:'hero.hots_leviathan',flying:true,attributes:['Biological','Armored','Massive','Heroic']}),
 purifier_flagship:define('protoss','净化者旗舰',15000,16000,18,0,1,10,2.9,'purifier_flagship','聚变核爆',7360,12,30,1.4,4,0,0,{model:'elite.carrier.1',flying:true,target:'none',attributes:['Mechanical','Armored','Massive','Heroic']})
};
export function heroStats(rank:number){const n=Math.max(0,Math.min(4,rank-1)),attackSpeed=1+.08*n;return {rank,attackSpeed,damage:(1+.25*n)/attackSpeed,skill:1+.25*n,health:1+.2*n,armor:.25*n,movement:1,healing:1,energy:1};}
export function heroRevivalCost(rank:number){const f=1+.25*(Math.max(1,Math.min(5,rank))-1);return {minerals:250*f,gas:100*f};}
