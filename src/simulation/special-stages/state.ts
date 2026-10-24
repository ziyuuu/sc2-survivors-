import type {Body,Entity,Point,RewardDrop} from '../types';
import type {HeroId} from '../../data/heroes';
export const SPECIAL_STAGE_KINDS=['resources','arena','crossing','dodge'] as const;
export type SpecialStageKind=typeof SPECIAL_STAGE_KINDS[number];
export const SPECIAL_STAGE_NAMES:Record<SpecialStageKind,string>={resources:'资源关',arena:'竞技场',crossing:'横穿虫群',dodge:'毒爆弹幕'};
export const SPECIAL_STAGE_RULES:Record<SpecialStageKind,string>={
 resources:'30秒内攻击矿气和宝箱，靠近拾取。到时带回已拾取收益。',
 arena:'90秒内挑战英雄Boss和精英。全歼后整理战利品；超时带回已拾取收益。',
 crossing:'探索迷雾中的三处岔路，每次选择方向会遇到一波密集跳虫与蟑螂；可绕行或打穿。全体存活成员抵达终点，无时限；成功领取3件动力装备。',
 dodge:'随机4名地面成员，优先英雄／精英。移动小队中央白色判定点躲避60秒，共5次机会；成功+2级，失败−2级。'
};
export interface SpecialResource extends Body {kind:'mineral'|'rich'|'large'|'gas'|'chest'|'highChest';paid:boolean;amount:readonly [number,number]}
export type DodgePattern='ribbon'|'cross'|'fan'|'aim'|'squeeze';
export interface Barrage extends Point {id:number;vx:number;vz:number;radius:number;hit:boolean;born:number;originX?:number;originZ?:number;curve?:number;phase?:number}
export interface BarrageCue {at:number;axis:'x'|'z';side:1|-1;gap:number;pattern?:DodgePattern;serial?:number;width?:number;aim?:Point;speed?:number}
export interface CrossingGuard {id:string;point:Point;radius:number;members:number[];homes:Point[];alerted:boolean}
export interface SpecialActive {
 id:string;kind:SpecialStageKind;stage:number;phase:'loading'|'active'|'loot';clock:number;
 participants:number[];pairs:string[];caps:Map<number,number>;ranks:Map<number,number>;
 escaped:Set<number>;evacuated:Map<number,Entity>;resources:Map<number,SpecialResource>;enemies:number[];
 barrage:Barrage[];cue:BarrageCue|null;nextPattern:number;patterns:number;hits:number;graceUntil:number;
 crossingGuards?:CrossingGuard[];crossingChoices?:(-1|1)[];crossingFog?:{cells:Set<number>;revision:number};nextSwarm:number;swarmSerial:number;cards:RewardDrop[];rewardIds:string[];
 result?:'success'|'timeout'|'quit'|'failed';heroIds:HeroId[];
}
export interface SpecialStages {
 lastEnteredKind:SpecialStageKind|null;
 serial:number;used:Set<number>;ticket:{stage:number;kind:SpecialStageKind;claimed:boolean}|null;
 offerChecked:number;portalChecked:number;portal:{kind:SpecialStageKind;point:Point;until:number}|null;
 active:SpecialActive|null;last:{kind:SpecialStageKind;result:string;ranks:{id:number;before:number;after:number}[]}|null;
}
export const newSpecialStages=():SpecialStages=>({lastEnteredKind:null,serial:0,used:new Set(),ticket:null,offerChecked:0,portalChecked:0,portal:null,active:null,last:null});
