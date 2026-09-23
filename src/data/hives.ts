import type {ZergType} from './sc2-units';

/** Survivors tuning for destructible Hell expansion hives. */
export function expansionProfile(stage:number){
 if(stage<=6)return {hp:1800,armor:2,interval:60,limit:2,batchInterval:16,reward:[60,20] as const};
 if(stage<=9)return {hp:4000,armor:3,interval:50,limit:2,batchInterval:14,reward:[90,35] as const};
 return {hp:7500,armor:3,interval:40,limit:3,batchInterval:12,reward:[120,50] as const};
}
export function expansionBatch(stage:number,serial:number):ZergType[]{
 if(stage<=6)return ['zergling','zergling','zergling','zergling','roach'];
 if(stage<=9)return [...Array<ZergType>(5).fill('zergling'),'roach','hydralisk',...(stage>=9?['baneling' as const]:[])];
 return [...Array<ZergType>(6).fill('zergling'),'roach','roach','baneling','hydralisk',...(serial%3===0?['ravager' as const]:[])];
}
export function mainHiveBatch(serial:number):ZergType[]{
 return [...Array<ZergType>(6).fill('zergling'),'roach','roach','hydralisk',...(serial%3===0?['ravager' as const]:[])];
}
