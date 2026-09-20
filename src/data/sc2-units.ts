/** LotV 5.0.15, fixed source export fbbd6429b1eb6978c78a092dc68ba09029d03171.
 * Raw XML uses Normal-speed seconds; Faster multiplayer uses 1.4x.
 * See docs/DATA_SOURCES.md for inheritance and explicitly experimental adapters. */
export const SC2_VERSION = 'LotV 5.0.15 / fbbd6429';
export const FASTER = 1.4;
export const TERRAN = ['marine','hellion','tank','medivac'] as const;
export const ZERG = ['zergling','roach','baneling','ravager'] as const;
export type TerranType = typeof TERRAN[number];
export type ZergType = typeof ZERG[number];
export type UnitType = TerranType | ZergType;
export type Bonus = {attribute:string; amount:number};
export interface UnitData {
 name:string; zh:string; maxHp:number; armor:number; movementSpeed:number;
 attackDamage:number; attacks:number; attackPeriod:number; attackRange:number;
 targetType:'ground'|'air'|'both'|'none'; splash:{radius:number;fraction:number}[];
 bonusDamage:Bonus[]; attributes:string[]; productionTime:number; mineralCost:number; gasCost:number;
 unitRadius:number; flying:boolean; damagePoint:number;
}
const unit=(name:string,zh:string,hp:number,armor:number,speed:number,damage:number,period:number,range:number,
 attributes:string[],train:number,minerals:number,gas:number,radius:number,bonus:Bonus[]=[]):UnitData=>({
 name,zh,maxHp:hp,armor,movementSpeed:speed*FASTER,attackDamage:damage,attacks:damage?1:0,
 attackPeriod:period/FASTER,attackRange:range,targetType:'ground',splash:[],bonusDamage:bonus,
 attributes,productionTime:train/FASTER,mineralCost:minerals,gasCost:gas,unitRadius:radius,flying:false,damagePoint:0.1/FASTER,
});
export const SC2_UNITS:Record<UnitType,UnitData> = {
 marine:{...unit('Marine','陆战队员',45,0,2.25,6,.8608,5,['Light','Biological'],25,50,0,.375),targetType:'both',damagePoint:.05/FASTER},
 hellion:{...unit('Hellion','恶火',90,0,4.25,8,2.5,5,['Light','Mechanical'],30,100,0,.625,[{attribute:'Light',amount:6}]),damagePoint:.25/FASTER},
 tank:unit('Siege Tank','攻城坦克',175,1,2.25,15,1.04,7,['Armored','Mechanical'],45,150,125,.875,[{attribute:'Armored',amount:10}]),
 medivac:{...unit('Medivac','医疗运输机',150,1,2.5,0,1,0,['Armored','Mechanical'],42,100,100,.75),targetType:'none',flying:true},
 zergling:unit('Zergling','跳虫',35,0,2.9531,5,.696,.1,['Light','Biological'],24,25,0,.375),
 roach:unit('Roach','蟑螂',145,1,2.25,16,2,4,['Armored','Biological'],27,75,25,.5),
 baneling:{...unit('Baneling','爆虫',30,0,2.5,16,.833,.25,['Biological'],20,50,25,.375,[{attribute:'Light',amount:19}]),splash:[{radius:2.2,fraction:1}],damagePoint:0},
 ravager:unit('Ravager','破坏者',120,1,2.75,16,1.6,6,['Biological'],12,100,100,.75),
};
export const SIEGE = {damage:40,bonus:[{attribute:'Armored',amount:30}],range:13,minRange:2,
 period:3/FASTER,deploySeconds:4.0417/FASTER,undeploySeconds:3.5417/FASTER,
 splash:[{radius:.4687,fraction:1},{radius:.7812,fraction:.5},{radius:1.25,fraction:.25}]};
export const HEAL = {hpPerSecond:9*FASTER,energyPerHp:.33,range:4,regen:.5625*FASTER,startEnergy:50,maxEnergy:200};
export const BILE = {damage:60,radius:.5,range:9,cooldown:10/FASTER,delay:2.5}; // delay includes an experimental missile travel allowance
