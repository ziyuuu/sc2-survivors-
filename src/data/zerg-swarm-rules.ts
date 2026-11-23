import type {FamilyId} from './races';

export const SWARM_PERIODIC={
 W02:{cd:[24,22,20],life:[18,20,22],cap:[7,7,7],pack:[['zergling',[2,3,4],2]],delay:1},
 G02:{cd:[45,40,35],life:[12,12,12],cap:[7,7,7],pack:[['baneling',[8,10,12],1]],delay:1.5},
 G03:{cd:[36,32,28],life:[20,22,24],cap:[2,3,4],pack:[],random:[4,6,8],delay:1},
 G05:{cd:[30,27,24],life:[18,20,22],cap:[2,3,4],pack:[['hydralisk',[3,4,5],1]],delay:1.5},
 G06:{cd:[36,30,30],life:[20,22,24],cap:[2,3,4],pack:[['aberration',[2,2,3],1]],delay:1},
 B04:{cd:[40,36,30],life:[22,24,26],cap:[3,4,5],pack:[['devourer',[2,3,3],1]],delay:1},
 B05:{cd:[40,36,32],life:[20,22,24],cap:[3,4,5],pack:[['infestor',[1,1,2],1],['roach',[2,3,4],1]],delay:1},
 B06:{cd:[44,40,36],life:[20,22,24],cap:[3,4,5],pack:[['swarm_host',[1,1,2],1],['hydralisk',[2,3,4],1]],delay:1},
 P01:{cd:[75,65,55],life:[18,20,22],cap:[4,5,6],pack:[['ultralisk',[9,9,9],1]],delay:1},
 P02:{cd:[54,48,42],life:[24,26,28],cap:[4,5,6],pack:[],random:[3,4,5],delay:2},
 P03:{cd:[50,44,38],life:[18,20,22],cap:[4,5,6],pack:[['zergling',[8,10,12],2]],delay:1},
 P04:{cd:[64,56,48],life:[24,26,28],cap:[4,5,6],pack:[['swarm_host',[2,2,2],1],['brood_lord',[2,2,2],1]],delay:1},
 P05:{cd:[60,54,48],life:[20,22,24],cap:[4,5,6],pack:[['infestor',[2,3,4],1]],delay:1},
 P06:{cd:[54,48,42],life:[22,24,26],cap:[4,5,6],pack:[['aberration',[2,2,2],1],['viper',[2,2,2],1]],delay:1},
} as const satisfies Record<string,{cd:readonly number[];life:readonly number[];cap:readonly number[];pack:readonly (readonly [FamilyId,readonly number[],1|2])[];delay:number;random?:readonly number[]}>;
export type SwarmPeriodic=keyof typeof SWARM_PERIODIC;
export const SWARM_AIR=['devourer','viper','brood_lord'] as const;
export const SWARM_REVERSION:Readonly<Partial<Record<FamilyId,readonly FamilyId[]>>>={
 hydralisk:['roach'],ravager:['hydralisk','roach'],aberration:['hydralisk','roach'],lurker:['hydralisk','roach'],
 infestor:['hydralisk','roach'],ultralisk:['aberration','hydralisk','roach'],swarm_host:['ravager','hydralisk','roach'],
 corruptor:['mutalisk'],devourer:['mutalisk'],viper:['corruptor','mutalisk'],brood_lord:['corruptor','mutalisk'],
};
