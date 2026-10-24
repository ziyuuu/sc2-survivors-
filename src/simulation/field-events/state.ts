import type {Point} from '../types';
export const FIELD_PICKUPS=['medical','firepower','armor','nuke','root'] as const;
export type FieldPickupKind=typeof FIELD_PICKUPS[number];
export const FIELD_PICKUP_NAMES:Record<FieldPickupKind,string>={medical:'医疗包',firepower:'火力强化',armor:'护甲强化',nuke:'核弹补给',root:'定身装置'};
export const HORDE_KINDS=['zerglings','roachHydra','mutalisks','ultralisks'] as const;
export type HordeKind=typeof HORDE_KINDS[number];
export const HORDE_NAMES:Record<HordeKind,string>={zerglings:'跳虫群',roachHydra:'蟑螂／刺蛇群',mutalisks:'飞龙群',ultralisks:'雷兽群'};
export const HORDE_RULES:Record<HordeKind,{stage:number;total:number;pulse:number}>={zerglings:{stage:4,total:150,pulse:15},roachHydra:{stage:6,total:110,pulse:11},mutalisks:{stage:8,total:70,pulse:7},ultralisks:{stage:10,total:30,pulse:3}};
export type EventCategory='mission'|'encounter'|'horde';
export interface EventPacing {stage:number;rolled:boolean;pending:boolean;started:boolean;next:number;choice:{category:EventCategory;kind:string}|null;lastKey:string;restUntil:number;observed:string[];pressure:boolean;baitElites:number[]}
export const newEventPacing=():EventPacing=>({stage:0,rolled:false,pending:false,started:false,next:20,choice:null,lastKey:'',restUntil:0,observed:[],pressure:false,baitElites:[]});
export interface FieldPickup extends Point {id:number;kind:FieldPickupKind;born:number}
export interface ReplacementHorde {kind:HordeKind;started:number;until:number;next:number;spawned:number;replaced:number}
export interface FieldEvents {
 pacing:EventPacing;
 stage:number;nextPickup:number;nextHorde:number;hordeTried:boolean;
 pickups:FieldPickup[];attackUntil:number;armorUntil:number;roots:Map<number,number>;rootGenerations:Map<number,number>;rootPositions:Map<number,Point>;
 horde:ReplacementHorde|null;lastHorde:ReplacementHorde|null;
}
export const newFieldEvents=():FieldEvents=>({pacing:newEventPacing(),stage:0,nextPickup:20,nextHorde:30,hordeTried:false,pickups:[],attackUntil:0,armorUntil:0,roots:new Map(),rootGenerations:new Map(),rootPositions:new Map(),horde:null,lastHorde:null});
export function validateEventPacing(p:EventPacing){
 if(!p||![p.stage,p.next,p.restUntil].every(n=>Number.isFinite(n)&&n>=0)||!['rolled','pending','started','pressure'].every(k=>typeof p[k as keyof EventPacing]==='boolean')||typeof p.lastKey!=='string'||!Array.isArray(p.observed)||p.observed.length>8||p.observed.some(k=>typeof k!=='string')||!Array.isArray(p.baitElites)||p.baitElites.length>2||p.baitElites.some(id=>!Number.isSafeInteger(id))||p.choice&&(!['mission','encounter','horde'].includes(p.choice.category)||typeof p.choice.kind!=='string')||p.started&&p.pending)throw Error('主事件节奏状态无效');
}
