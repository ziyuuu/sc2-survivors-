import type {Race} from './races';
import type {CombatUnitType} from './sc2-units';
/** Keep this list frozen for legacy reward tables and legacy 1/2/3 bindings. */
export const HERO_IDS=['raynor','tychus','nova'] as const;
export const HERO_IDS_BY_RACE={terran:['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'],zerg:['kerrigan','zagara','dehaka','stukov','niadra','hots_leviathan'],protoss:['artanis','zeratul','alarak','fenix','vorazun','purifier_flagship']} as const;
export const ALL_HERO_IDS=[...HERO_IDS_BY_RACE.terran,...HERO_IDS_BY_RACE.zerg,...HERO_IDS_BY_RACE.protoss] as const;
export type HeroId=typeof ALL_HERO_IDS[number];
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
 raynor:define('terran','雷诺',625,0,3,28,.18,6.5,3.5,'marine','穿透射击',300,12,10,.2,.5,12,1.4,{model:'hero.raynor'}),
 tychus:define('terran','泰凯斯',780,0,4,14,.08,5.5,3.15,'marine','手雷',240,5,10,.6,3.2,0,0,{model:'hero.tychus'}),
 nova:define('terran','诺娃',375,0,1,100,.7,9,3.8,'marine','狙击',650,12,9,.35,.5,0,0,{model:'hero.nova'}),
 swann:define('terran','斯旺',560,0,3,28,.4,5,3.15,'marauder','紧急抢修',75,7,15,1,0,0,0,{model:'hero.swann',target:'ground'}),
 tosh:define('terran','托什',440,0,1,52,.4,6.5,3.5,'marine','精神冲击',220,8,13,.5,2.8,0,0,{model:'hero.tosh'}),
 kerrigan:define('zerg','凯瑞甘',750,0,3,52,.36,1,3.5,'zergling','灵能冲击',300,11,10,.5,0,11,2.2,{model:'hero.kerrigan',target:'ground'}),
 zagara:define('zerg','扎加拉',525,0,1,36,.36,6.5,3.5,'queen','爆虫弹幕',100,9,12,.7,1.7,0,0,{model:'hero.zagara'}),
 dehaka:define('zerg','德哈卡',1100,0,4,80,.6,1.4,3.15,'ultralisk','原始吞噬',420,3,13,.35,0,0,0,{model:'hero.dehaka',target:'ground'}),
 stukov:define('zerg','斯托科夫',625,0,2,50,.44,6.5,3.15,'hydralisk','腐蚀弹',80,9,12,.25,3,0,0,{model:'hero.stukov'}),
 niadra:define('zerg','妮雅德拉',690,0,2,32,.45,5.5,3.15,'queen','哺育波',120,6,18,0,6,0,0,{model:'hero.niadra'}),
 artanis:define('protoss','阿塔尼斯',440,375,3,34,.55,1,3.5,'zealot','护盾复苏',150,6,16,0,6,0,0,{model:'hero.artanis',attacks:2,target:'ground'}),
 zeratul:define('protoss','泽拉图',440,315,1,90,.5,1,4.2,'zealot','虚空斩',520,3,10,.25,1.2,0,0,{model:'hero.zeratul',target:'ground',innateCloak:true}),
 alarak:define('protoss','阿拉纳克',750,250,3,85,.6,1.2,3.15,'zealot','毁灭波',300,10,12,.55,0,10,2.6,{model:'hero.alarak',target:'ground'}),
 fenix:define('protoss','菲尼克斯',565,440,3,72,.5,7.5,3.15,'immortal','太阳炮',360,10,13,.6,3.2,0,0,{model:'hero.fenix',attributes:['Mechanical','Armored','Heroic']}),
 vorazun:define('protoss','沃拉尊',375,315,1,75,.5,1,4,'zealot','时间停滞',0,9,16,.25,3.2,0,0,{model:'hero.vorazun',target:'ground',innateCloak:true}),
 yamato_battlecruiser:define('terran','大和战列巡洋舰',1100,0,4,40,.65,8,2.62,'yamato_battlecruiser','大和聚变炮',700,11,25,1.25,2.8,0,0,{model:'hero.yamato_battlecruiser',flying:true,attacks:2,attributes:['Mechanical','Armored','Massive','Heroic']}),
 hots_leviathan:define('zerg','利维坦',1300,0,4,60,.55,7.5,2.5,'hots_leviathan','生体等离子风暴',180,10,22,.8,3.5,0,0,{model:'hero.hots_leviathan',flying:true,attributes:['Biological','Armored','Massive','Heroic']}),
 purifier_flagship:define('protoss','净化者旗舰',850,750,4,0,1,8,2.62,'purifier_flagship','聚变核爆',600,12,30,1.4,4,0,0,{model:'elite.carrier.1',flying:true,target:'none',attributes:['Mechanical','Armored','Massive','Heroic']})
};
export function heroStats(rank:number){const n=Math.max(0,Math.min(4,rank-1)),attackSpeed=1+.08*n;return {rank,attackSpeed,damage:(1+.25*n)/attackSpeed,skill:1+.25*n,health:1+.2*n,armor:.25*n,movement:1,healing:1,energy:1};}
export function heroRevivalCost(rank:number){const f=1+.25*(Math.max(1,Math.min(5,rank))-1);return {minerals:250*f,gas:100*f};}
