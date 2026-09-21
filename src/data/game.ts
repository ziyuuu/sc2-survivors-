import type {TerranType,ZergType} from './sc2-units';
/** Survivors balance, NOT original SC2 values. Kept separate from the unit source table. */
export const TUNING = {step:1/60,stageSeconds:60,rescueSeconds:30,anchorSpeed:5.6,
 softLeash:9,hardLeash:20,catchUp:1.22,rankHp:.18,rankDamage:.16,
 podHp:1200,podArmor:2,enemyCap:300,worldHalf:52,startingMinerals:400,startingGas:150,
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
// Experimental encounter budgets grow with surviving offensive strength, independently of SC2 stats.
export const ENCOUNTERS={power:{marine:1,hellion:2,tank:3,medivac:.25} as Record<TerranType,number>,ambientPerPower:1.5,rescueLingsPerPower:2};
export const STAGES:{name:string;waveEvery:number;count:number;mix:ZergType[];speed:number;firstWaveDelay?:number;openingWaves?:{at:number;count:number}[]}[]=[
 {name:'边境警报',waveEvery:26,count:1,mix:['zergling'],speed:1,openingWaves:[{at:12,count:1},{at:38,count:1}]},
 {name:'双向夹击',waveEvery:12,count:2,mix:['zergling'],speed:1,firstWaveDelay:10},
 {name:'代谢加速',waveEvery:11,count:3,mix:['zergling'],speed:1.25,firstWaveDelay:6},
 {name:'酸液装甲',waveEvery:10,count:4,mix:['zergling','zergling','zergling','roach'],speed:1.1,firstWaveDelay:6},
 {name:'地面虫潮',waveEvery:5,count:22,mix:['zergling','zergling','roach'],speed:1.1},
 {name:'爆虫冲锋',waveEvery:5,count:22,mix:['zergling','zergling','roach','baneling'],speed:1.15},
 {name:'孤立降落区',waveEvery:4.5,count:24,mix:['zergling','zergling','roach','baneling'],speed:1.2},
 {name:'重甲围攻',waveEvery:5,count:26,mix:['zergling','roach','roach','baneling'],speed:1.22},
 {name:'离心钩',waveEvery:4.5,count:28,mix:['zergling','roach','baneling','baneling'],speed:1.3},
 {name:'腐蚀胆汁',waveEvery:5,count:30,mix:['zergling','roach','baneling','ravager'],speed:1.25},
 {name:'无尽虫群',waveEvery:4,count:32,mix:['zergling','zergling','roach','baneling','ravager'],speed:1.3},
 {name:'摧毁虫巢',waveEvery:4,count:32,mix:['zergling','roach','baneling','ravager'],speed:1.35},
];
export type Obstacle={x:number;z:number;w:number;h:number};
export const OBSTACLES:Obstacle[]=[
 {x:14,z:-20,w:4,h:29},{x:14,z:22,w:4,h:29},
 {x:-17,z:-24,w:4,h:24},{x:-17,z:16,w:4,h:28},
 {x:33,z:14,w:11,h:5},{x:-34,z:-8,w:12,h:5},{x:0,z:34,w:16,h:4},
];
