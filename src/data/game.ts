import type {TerranType} from './sc2-units';
/** Survivors balance, NOT original SC2 values. Kept separate from the unit source table. */
export const TUNING = {step:1/60,anchorSpeed:5.6,
 softLeash:9,hardLeash:20,catchUp:1.22,rankHp:.18,rankDamage:.16,
 podHp:1200,podArmor:2,enemyCap:300,worldHalf:56,startingMinerals:50,startingGas:0,
 initialSquad:['marine'] as TerranType[]};
export type BuildingType='barracks'|'factory'|'starport';
export const FORMATION:Record<TerranType,{back:number;spacing:number;lane:number}>={
 marine:{back:1.5,spacing:1.4,lane:.65},hellion:{back:4,spacing:2,lane:0},tank:{back:7,spacing:2.2,lane:0},medivac:{back:8,spacing:1.3,lane:1.4},
};
export const BUILDINGS:Record<BuildingType,{name:string;minerals:number;gas:number;time:number;types:TerranType[]}>={
 barracks:{name:'Barracks · 兵营',minerals:150,gas:0,time:65/1.4,types:['marine']},
 factory:{name:'Factory · 重工厂',minerals:150,gas:100,time:60/1.4,types:['hellion','tank']},
 starport:{name:'Starport · 星港',minerals:150,gas:100,time:50/1.4,types:['medivac']},
};
export {STAGES} from './stages';
export type Obstacle={x:number;z:number;w:number;h:number};
export const OBSTACLES:Obstacle[]=[
 {x:14,z:-20,w:4,h:29},{x:14,z:22,w:4,h:29},
 {x:-17,z:-24,w:4,h:24},{x:-17,z:16,w:4,h:28},
 {x:33,z:14,w:11,h:5},{x:-34,z:-8,w:12,h:5},{x:0,z:34,w:16,h:4},
];
