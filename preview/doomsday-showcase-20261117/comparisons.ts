import {ELITES,type EliteId} from '../../src/data/elites';
import type {UnitType} from '../../src/data/sc2-units';
import type {DoomsdayId} from '../../src/data/terran-doomsday';
import {grantMechanicalPolarization,mechanicalMemberCap} from '../../src/simulation/combat/doomsday-growth';
import {acquireDoomsdayBlueprint} from '../../src/simulation/combat/doomsday-refits';
import type {World} from '../../src/simulation/world';

type Stage={label:string;ranks:Partial<Record<DoomsdayId,number>>;rank?:number};
type Comparison={name:string;card:DoomsdayId;stages:Stage[]};
const armor={'M-P01':2},polar={'M-P01':2,'M-N03':1};
const phase={'M-B04':1,'M-B01':1,'M-W03':1,'M-N02':1},nano={'M-G02':1,'M-G04':1,'M-N01':1};
export const COMPARISONS={
 tiger:{name:'虎式 · 精英成长',card:'M-P01',stages:[
  {label:'V 级原装',ranks:{}},{label:'V 级精英装甲',ranks:armor},
  {label:'VIII 级突破',ranks:armor,rank:8},{label:'X 级极化',ranks:polar,rank:8},
  {label:'X 级极化＋贯穿',ranks:{...polar,'M-P05':1},rank:8}]},
 artillery:{name:'坦克 · 主炮改装',card:'M-P05',stages:[
  {label:'原装主炮',ranks:{}},{label:'联发 II',ranks:{'M-B03':2}},
  {label:'第三轮贯穿',ranks:{'M-P05':1}},{label:'第四轮阵地供弹',ranks:{'M-W03':1,'M-B03':1,'M-N06':1}}]},
 air:{name:'女妖 · 空军联动',card:'M-P06',stages:[
  {label:'原生双弹',ranks:{}},{label:'子母弹',ranks:{'M-P06':1}},
  {label:'共振引信',ranks:{'M-P06':1,'M-B05':1,'M-N09':1}},
  {label:'空地夹击',ranks:{'M-P06':1,'M-B07':1,'M-N08':1}}]},
 overload:{name:'末日过载 · 雷神叠加',card:'M-N02',stages:[
  {label:'X 级极化',ranks:polar,rank:8},{label:'极化＋幽能',ranks:{...polar,...phase},rank:8},
  {label:'极化＋纳米',ranks:{...polar,...nano},rank:8},{label:'极化＋幽能＋纳米',ranks:{...polar,...phase,...nano},rank:8}]},
 squad:{name:'混合小队 · 合战',card:'M-O02',stages:[
  {label:'原装小队',ranks:{}},{label:'机械枪兵／虎式／高达',ranks:{...polar,'M-P03':1,'M-W01':1,'M-G01':1,'M-P05':1,'M-O02':1},rank:8}]},
} satisfies Record<string,Comparison>;
export type ComparisonId=keyof typeof COMPARISONS;
export function comparisonId(value:string|null):ComparisonId|undefined{
 return value&&Object.hasOwn(COMPARISONS,value)?value as ComparisonId:undefined;
}
export function comparisonStage(group:ComparisonId,stage:number){
 const stages:Stage[]=COMPARISONS[group].stages;
 return stages[Number.isInteger(stage)?stage:0]??stages[0];
}

/** Every version in a group has identical actors, geometry, seed and camera. Only the loadout changes. */
export function prepareComparison(w:World,group:ComparisonId,index:number){
 const stage=comparisonStage(group,index),state=w.expedition.doomsday!;
 Object.assign(state.ranks,stage.ranks);
 const ally=(type:UnitType,x:number,z:number,elite?:EliteId)=>{
  const u=w.addUnit(type,'terran',x,z,5);
  if(elite){u.eliteId=elite;u.modelKey=ELITES[elite].model;}
  if(type==='tank')u.mode=u.desiredMode='siege';
  return u;
 };
 const target=(type:UnitType,x:number,z:number)=>{
  const u=w.addUnit(type,'zerg',x,z);
  u.hp=u.maxHp=1000000;u.moveSpeed=0;u.weaponDamage=0;u.attackPeriod=u.weaponCooldown=30;return u;
 };
 const main=group==='air'?ally('banshee',0,.4):group==='overload'?ally('thor',0,-.7,'thor.3'):group==='squad'?ally('marine',-3.5,1,'marine.2'):ally('tank',0,-.7,group==='tiger'?'tank.2':undefined);
 if(group==='air'){ally('viking',-2.4,.4);target('mutalisk',-2.2,4.8);}
 if(group==='overload'){ally('science_vessel',-2.4,.6);ally('marine',1.35,-.8);}
 if(group==='squad'){
  ally('tank',-3.4,-1.9,'tank.2');ally('thor',2.5,.4);
  const caster=target('ravager',-2.4,4.2);caster.weaponDamage=12;caster.bileCooldown=1;
  target('roach',2.3,2.6);
 }
 target('roach',0,5.4);target('roach',0,7.1);target('roach',.15,8.8);target('roach',1.45,6.4);
 const cards=Object.keys(stage.ranks) as DoomsdayId[];
 for(const card of cards)acquireDoomsdayBlueprint(w,card);
 for(const u of w.allies()){
  if(u===main||group==='squad'&&u.eliteId)u.rank=Math.min(stage.rank??5,mechanicalMemberCap(w,u));
  w.refreshStats(u);
 }
 if(state.ranks['M-N03'])grantMechanicalPolarization(w);
 if(group==='overload')main.hp=main.maxHp*.6;
 for(const u of w.entities.values())u.prev={x:u.x,z:u.z};
 w.hash.rebuild(w.entities.values());w.paused=true;
 return {mainId:main.id,cards};
}
