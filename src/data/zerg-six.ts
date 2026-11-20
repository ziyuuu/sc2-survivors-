import config from '../../docs/project/zerg-six-design-20261120.json';
import type {UnitData} from './sc2-units';

/** Ordinary campaign families and their temporary combat bodies. */
export const ZERG_SIX = ['aberration','devourer','infestor','swarm_host','viper','brood_lord'] as const;
export type ZergSixFamily = typeof ZERG_SIX[number];
export type ZergSixChild = 'zerg_locust' | 'zerg_broodling';
export type ZergSixBody = ZergSixFamily | ZergSixChild;
export const ZERG_SIX_CAPS = config.caps;
export const ZERG_SIX_PRODUCTION = config.friendly;
export const ZERG_SIX_SUMMONER_COMBAT = 'swarm_host';

/** Original catalog body costs, separate from R2's seconds and free Hatchery orders.
 * The campaign InfestedMonsterTrain entry specifies six seconds without a resource cost. */
export const ZERG_SIX_SOURCE_COST = {
 aberration:[0,0],devourer:[250,150],infestor:[100,150],swarm_host:[100,75],viper:[100,200],brood_lord:[300,250],
} as const satisfies Record<ZergSixFamily,readonly [number,number]>;
export const isZergSixFamily = (id:string): id is ZergSixFamily => (ZERG_SIX as readonly string[]).includes(id);
export const isZergSixBody = (id:string): id is ZergSixBody => isZergSixFamily(id)||id==='zerg_locust'||id==='zerg_broodling';

const body = (name:string,zh:string,hp:number,armor:number,movementSpeed:number,unitRadius:number,flying:boolean,
 attributes:string[],attackDamage:number,attackPeriod:number,attackRange:number,damagePoint:number,targetType:UnitData['targetType'],productionTime=0):UnitData =>
 ({name,zh,maxHp:hp,armor,movementSpeed,unitRadius,flying,attributes:['Biological',...attributes],
 attackDamage,attacks:attackDamage?1:0,attackPeriod,attackRange,damagePoint,targetType,productionTime,
 mineralCost:0,gasCost:0,bonusDamage:[],splash:[]});

const families = {
 aberration:['Aberration',false,['Armored','Massive'],.25,'ground'],
 devourer:['Devourer',true,['Armored'],.25,'both'],
 infestor:['Infestor',false,['Armored','Psionic'],.15,'both'],
 swarm_host:['Swarm Host',false,['Armored'],0,'none'],
 viper:['Viper',true,['Armored','Psionic'],.15,'both'],
 brood_lord:['Brood Lord',true,['Armored','Massive'],.4,'ground'],
} satisfies Record<ZergSixFamily,[string,boolean,string[],number,UnitData['targetType']]>;

export const ZERG_SIX_UNITS = {
 ...Object.fromEntries(ZERG_SIX.map(id=>{
  const {hp,armor,move,radius,damage,period,range,trainingSeconds}=config.friendly[id];
  const [name,flying,attributes,windup,layer]=families[id];
  return [id,body(name,config.names[ZERG_SIX.indexOf(id)],hp,armor,move,radius,flying,attributes,damage,period,range,windup,layer,trainingSeconds)];
 })) as Record<ZergSixFamily,UnitData>,
 zerg_locust:body('Locust','蝗虫',40,0,3.85,.375,false,['Light'],6,.9,2.5,.12,'ground'),
 zerg_broodling:body('Broodling','巢虫',20,0,4.13,.375,false,['Light'],4,1,.6,.1,'ground'),
} satisfies Record<ZergSixBody,UnitData>;

export const ZERG_SIX_WEAPON_RESEARCH = {aberration:2,devourer:2,infestor:1,swarm_host:1,viper:1,brood_lord:2};
export const ZERG_SIX_PROJECTILE_SPEED = {devourer:10,infestor:10,brood_lord:8,zerg_locust:10} as const;
export const ZERG_SIX_ENGAGEMENT_RANGE:Record<ZergSixFamily,number> = {aberration:1.25,devourer:6,infestor:6,swarm_host:9,viper:4.5,brood_lord:9.5};
