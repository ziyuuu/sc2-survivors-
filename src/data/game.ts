import type {TerranType} from './sc2-units';
/** Survivors balance, NOT original SC2 values. Kept separate from the unit source table. */
export const TUNING = {step:1/60,anchorSpeed:5.6,unitScale:.8,
 softLeash:9,hardLeash:20,catchUp:1.22,
 podHp:1200,podArmor:2,enemyCap:300,worldHalf:56,startingMinerals:50,startingGas:0,
 initialSquad:['marine'] as TerranType[]};
export type BuildingType='barracks'|'factory'|'starport';
export const FORMATION={columns:3,frontOffset:.9,bodyGap:.38,rowGap:.35,refreshSeconds:.18,searchHalfWidth:5,searchBack:12};
export const BUILDINGS:Record<BuildingType,{name:string;minerals:number;gas:number;time:number;types:TerranType[]}>={
 barracks:{name:'Barracks · 兵营',minerals:150,gas:0,time:65/1.4,types:['marine']},
 factory:{name:'Factory · 重工厂',minerals:150,gas:100,time:60/1.4,types:['hellion','tank']},
 starport:{name:'Starport · 星港',minerals:150,gas:100,time:50/1.4,types:['medivac']},
};
// Locked SC2 liberty UnitData TechLab 50/25; FactoryAddOns 25 game seconds at Faster.
export const FACTORY_TECH_LAB={minerals:50,gas:25,time:25/1.4};
export {STAGES} from './stages';
export type Obstacle={x:number;z:number;w:number;h:number};
export const OBSTACLES:Obstacle[]=[
 {x:14,z:-20,w:4,h:29},{x:14,z:22,w:4,h:29},
 {x:-17,z:-24,w:4,h:24},{x:-17,z:16,w:4,h:28},
 {x:33,z:14,w:11,h:5},{x:-34,z:-8,w:12,h:5},{x:0,z:34,w:16,h:4},
];
