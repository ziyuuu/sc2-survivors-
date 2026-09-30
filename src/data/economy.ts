import type {Race} from './races';
export const RESCUE_PRESENTATION={
 terran:{workerName:'SCV',workerModel:'scv',carrierName:'兵营',carrierModel:'barracks',carrierBirthModel:null,carrierDeathModel:'barracks.death'},
 zerg:{workerName:'工蜂',workerModel:'drone',carrierName:'孵化场',carrierModel:'hatchery',carrierBirthModel:null,carrierDeathModel:'hatchery.death'},
 protoss:{workerName:'探机',workerModel:'probe',carrierName:'水晶塔',carrierModel:'pylon',carrierBirthModel:'pylon.birth',carrierDeathModel:'pylon.death'},
} as const satisfies Record<Race,{workerName:string;workerModel:string;carrierName:string;carrierModel:string;carrierBirthModel:string|null;carrierDeathModel:string}>;
export const ECONOMY={passive:{minerals:.5,gas:.1},perWorker:{minerals:.15*1.15,gas:.04*1.15},dropMultiplier:1.15,eggSeconds:30,eggHp:24,droneHp:40,landingSeconds:3.266,openingSeconds:1.2};
export const DROPS={ambient:{zergling:[3,0],roach:[6,3],baneling:[4,2],ravager:[10,5],hydralisk:[8,4]},guard:{zergling:[1,0],roach:[2,1],baneling:[1,1],ravager:[3,2],hydralisk:[2,1]},drone:[30,15]} as const;
export const DISCOUNTS=[{off:0,weight:50},{off:.15,weight:30},{off:.3,weight:15},{off:.5,weight:5}] as const;
