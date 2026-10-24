import fs from 'node:fs/promises';import assert from 'node:assert/strict';
import {scenario,buy,oldCards} from './lib/g02-fixtures.mts';
import {familyRace} from '../src/data/races';
import {withEquipmentWeapon,equipmentRecoveryFactor} from '../src/simulation/starship/runtime';
import {tickExpeditionRecovery} from '../src/simulation/combat/expedition-combat';
import {productionQuote} from '../src/simulation/expedition-production';
const rows:any[]=[],skips:any[]=[];
for(const quality of [0,3,4,5] as const)for(const [id,row] of Object.entries(oldCards) as [string,any][]){
 if(!['card','teamCard','resource'].includes(row.effect.kind))continue;
 const family=row.effect.family??row.family,race=familyRace(family),{w,gear,loadout,buildingWitness}=scenario({race,quality,stage:17,seed:102202,family,members:1,rank:3,channelOnly:true}),u=w.familyUnits(family)[0];assert.ok(u,id);
 const target=w.addUnit('roach','zerg',u.x,u.z+2);target.hp=target.maxHp=1e6;target.armor=0;
 const observe=()=>{u.hp=u.maxHp*.1;u.shield=(u.maxShield??0)*.1;u.energy=0;u.lastDamagedAt=-100;const hp=u.hp,shield=u.shield;tickExpeditionRecovery(w,u,1);u.shotInterval=u.attackPeriod;let packet=0;withEquipmentWeapon(w,u,target,()=>{packet=u.weaponDamage;});return {maxHp:u.maxHp,maxShield:u.maxShield??0,armor:u.armor,packet,period:u.attackPeriod,energyPerSecond:u.energy,healRate:u.healRate,recoveryPerSecond:u.hp-hp,shieldPerSecond:(u.shield??0)-shield,recoveryFactor:equipmentRecoveryFactor(w,u),production:productionQuote(w,family)};};
 const before=observe(),receipt=buy(w,id);if(!receipt){skips.push({quality,id,family,reason:'not in native pool'});continue;}const after=observe();
 rows.push({quality,id,family,gear,loadout,buildingWitness,receipt,before,after});
}
await fs.writeFile('reports/local/g02-20261022/channels-r4.json',JSON.stringify({method:'Every existing family/team/resource card in four lawful loadouts, current native eligibility and undiscounted purchase; one rank-III member and replayed native building witness (some complete at stage 17: isolated channel test, not proof of availability before stage 17). Native one-second recovery/energy and weapon packet, plus quote for future paid production. Controlled fixtures, not natural campaign acquisition or combat win-rate.',rows,skips},null,2));
console.log(JSON.stringify({rows:rows.length,skips:skips.length}));

