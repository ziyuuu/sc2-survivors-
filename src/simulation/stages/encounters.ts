import {ENCOUNTERS} from '../../data/game';
import {SC2_UNITS,type TerranType,type ZergType} from '../../data/sc2-units';
import type {Entity} from '../types';
export function squadPower(units:Entity[]){return units.reduce((sum,u)=>{
 if(u.hp<=0||u.owner!=='terran')return sum;const type=u.unitType as TerranType,d=SC2_UNITS[type];
 return sum+ENCOUNTERS.power[type]*(type==='medivac'?1:u.weaponDamage/d.attackDamage);
},0);}
export function ambientCount(maximum:number,units:Entity[]){return Math.min(maximum,Math.max(1,Math.floor(squadPower(units)*ENCOUNTERS.ambientPerPower)));}
export function rescueEnemies(stage:number,units:Entity[]):ZergType[]{
 const power=squadPower(units),growth=ENCOUNTERS.rescueLingsPerPower+Math.max(0,stage-4)*.1;
 const result:ZergType[]=Array.from({length:Math.max(2,Math.min(40,Math.floor(power*growth)))},()=> 'zergling');
 if(stage>=4&&power>=4)result.push('roach');if(stage>=4&&power>=8)result.push('roach');
 if(stage>=6&&power>=6)result.push('baneling');if(stage>=6&&power>=12)result.push('baneling');
 if(stage>=10&&power>=8)result.push('ravager');if(stage>=10&&power>=16)result.push('ravager');
 return result;
}
