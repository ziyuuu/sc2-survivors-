import type {Entity} from '../types';
import {rankStats} from '../../data/ranks';
import {heroGrowth} from '../../data/hero-growth';
import {OFFENSIVE_AFFIXES,DEFENSIVE_AFFIXES,isAttributeSlot,isOffensiveSlot,type EquipmentItem,type EquipmentTotals,type Quality,type WhiteAllocation,type Affix} from './types';

/** STARSHIP_EQUIPMENT_REDESIGN_20261013, confirmed 2026-10-15. Percentages are fractions. */
export const WHITE_BASE:Record<Quality,readonly [number,number,number,number]>={1:[2,.01,.25,15],2:[5,.025,.75,40],3:[12,.06,2,100],4:[30,.15,5,250],5:[75,.36,12,650]};
export const WHITE_ALLOCATION=[[1.4,.6],[1.16,.84],[1,1],[.84,1.16],[.6,1.4]] as const;
/** STARSHIP_GREEN_DESIGN_20261013: quality maxima, not obsolete individual uniform rolls. */
export const AFFIX_MAX:Record<Affix,readonly [number,number,number,number]>={
 attack:[.02,.05,.12,.28],trueDps:[3,8,20,50],range:[.03,.07,.16,.36],crit:[.02,.05,.11,.24],critDamage:[.08,.18,.4,.9],
 defense:[30,70,160,360],dodge:[.015,.035,.08,.18],move:[.02,.05,.12,.28],health:[.04,.09,.2,.45],reduction:[.01,.025,.06,.14]
};
export const emptyTotals=():EquipmentTotals=>({dps:0,attackSpeed:0,armor:0,hp:0,attack:0,trueDps:0,range:0,crit:0,critDamage:0,defense:0,dodge:0,move:0,health:0,reduction:0});
const rounded=(n:number)=>Math.round(n*100)/100;
export function whiteValues(quality:Quality,slot:EquipmentItem['slot'],allocation:WhiteAllocation){
 const out=emptyTotals();if(!isAttributeSlot(slot))return out;
 const [dps,speed,armor,hp]=WHITE_BASE[quality],[a,b]=WHITE_ALLOCATION[allocation];
 if(isOffensiveSlot(slot)){out.dps=rounded(dps*a);out.attackSpeed=rounded(speed*100*b)/100;}
 else {out.armor=rounded(armor*a);out.hp=rounded(hp*b);}return out;
}
export function itemValues(item:EquipmentItem){const out=whiteValues(item.quality,item.slot,item.allocation);
 for(const affix of item.affixes)out[affix.key]+=AFFIX_MAX[affix.key][item.quality-2]*affix.score/200;return out;
}
export function totalAttributes(items:readonly EquipmentItem[]){const out=emptyTotals();for(const item of items){const values=itemValues(item);for(const key of Object.keys(out) as (keyof EquipmentTotals)[])out[key]+=values[key];}return out;}
export function itemScore(item:EquipmentItem){return item.affixes.length?item.affixes.reduce((n,a)=>n+a.score,0)/item.affixes.length:null;}
export function validAffixes(item:EquipmentItem,count:number){
 const pool=isOffensiveSlot(item.slot)?OFFENSIVE_AFFIXES:DEFENSIVE_AFFIXES;
 return item.affixes.length===count&&new Set(item.affixes.map(a=>a.key)).size===count&&item.affixes.every(a=>(pool as readonly string[]).includes(a.key)&&Number.isInteger(a.score)&&a.score>=100&&a.score<=200&&(item.pollution==='none'||a.score===200));
}
export function identityFactors(u:Pick<Entity,'rank'|'heroId'|'eliteId'>&Partial<Pick<Entity,'enemyTier'>>){
 const r=Math.max(1,u.rank);
 if(u.heroId){const growth=heroGrowth(r);return {dps:20*growth.damage/growth.period,hp:12*growth.health,armor:1.5};}
 if(u.eliteId||u.enemyTier==='elite')return {dps:4*(1+.35*(r-1)),hp:3*(1+.3*(r-1)),armor:1.25};
 const growth=rankStats(r);return {dps:growth.damage*growth.attackSpeed,hp:growth.health,armor:1};
}

/** Count completions before choosing each coordinate: every permitted ordered score tuple is equiprobable. */
export function rollScores(count:number,target:number,perfect:boolean,random:()=>number):number[]{
 if(count===0)return [];const lo=Math.max(perfect?180:100,target-20),hi=Math.min(200,target+20),memo=new Map<string,number>();
 const ways=(n:number,sum:number):number=>{if(n===0)return sum===0?1:0;if(sum<n*lo||sum>n*hi)return 0;const key=n+':'+sum,cached=memo.get(key);if(cached!==undefined)return cached;let total=0;for(let q=lo;q<=hi;q++)total+=ways(n-1,sum-q);memo.set(key,total);return total;};
 let sum=count*target;const result:number[]=[];for(let n=count;n>0;n--){let ticket=random()*ways(n,sum),selected=hi;for(let q=lo;q<=hi;q++){ticket-=ways(n-1,sum-q);if(ticket<0){selected=q;break;}}result.push(selected);sum-=selected;}return result;
}
export function rollAffixes(quality:Quality,slot:EquipmentItem['slot'],count:number,polluted:boolean,misses:number,random:()=>number){
 if(count===0)return {affixes:[] as EquipmentItem['affixes'],misses};
 const pool=[...(isOffensiveSlot(slot)?OFFENSIVE_AFFIXES:DEFENSIVE_AFFIXES)] as Affix[],keys:Affix[]=[];
 for(let i=0;i<count;i++)keys.push(pool.splice(Math.floor(random()*pool.length),1)[0]);
 if(polluted)return {affixes:keys.map(key=>({key,score:200})),misses};
 const perfectChance=Math.min(1,.1+.05*misses),draw=random(),perfect=draw<perfectChance;let low:number,high:number;
 if(perfect){low=190;high=200;}else {const ordinary=(draw-perfectChance)/(1-perfectChance);[low,high]=ordinary<10/90?[100,139]:ordinary<35/90?[140,169]:[170,189];}
 const target=low+Math.floor(random()*(high-low+1)),scores=rollScores(count,target,perfect,random);
 return {affixes:keys.map((key,i)=>({key,score:scores[i]})),misses:perfect?0:misses+1};
}
