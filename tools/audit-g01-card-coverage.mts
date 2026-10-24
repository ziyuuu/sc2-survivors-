import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {familyWorld} from './lib/i03-fixtures.mts';
import {grantEquipment,beginEquipmentRun} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,isOffensiveSlot} from '../src/simulation/starship/types';
import {equipmentTotals,withEquipmentWeapon} from '../src/simulation/starship/runtime';
import {purchaseOffer} from '../src/simulation/expedition-economy';
import {productionQuote} from '../src/simulation/expedition-production';
import {tickExpeditionRecovery} from '../src/simulation/combat/expedition-combat';
const base='reports/local/g01-20261022',source=JSON.parse(await fs.readFile('reports/local/integration-i03-20261022/cards-paths-expanded.json','utf8')),rows:any[]=[],catalog:any[]=[];
for(const [id,row]of Object.entries(source.rows) as [string,any][]){
 const e=row.effect;catalog.push({id,effect:e,route:row.family,priorReceipt:row.purchaseReceipt,channel:e.kind==='teamCard'?'unit-percentage-including-gear':e.kind==='card'?e.effect:e.kind==='support'?'support-fixed-or-derived':e.kind==='hero'||e.kind==='elite'||e.kind==='training'||e.kind==='supply'?'native-member-stats':e.kind==='resource'?'wallet':e.kind});
 if(!['card','teamCard'].includes(e.kind))continue;
 const {w}=familyWorld(row.family),family=e.family??row.family,u=w.familyUnits(family)[0];assert.ok(u,id);
 for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:'attribute.3',race:w.expedition.race,slot},'g01-coverage:'+slot,w.starship.account.run?{kind:'backpack',run:w.starship.account.run.id}:{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;r.value.affixes=(isOffensiveSlot(slot)?['attack','trueDps','range']:['defense','health','reduction']).map(key=>({key,score:200})) as typeof r.value.affixes;const equipped=w.equipItem(r.value.id,slot);assert.ok(equipped.ok,JSON.stringify(equipped));}
 if(!w.starship.account.run)assert.ok(beginEquipmentRun(w.starship.account,w.expedition.race,w.runId!).ok);
 const target=w.addUnit('roach','zerg',u.x,u.z+2);target.hp=target.maxHp=1e6;target.armor=0;
 const observe=()=>{u.hp=u.maxHp*.4;u.shield=(u.maxShield??0)*.4;u.energy=0;u.lastDamagedAt=-100;const hp=u.hp,shield=u.shield;tickExpeditionRecovery(w,u,1);u.shotInterval=u.attackPeriod;let packet=0;withEquipmentWeapon(w,u,target,()=>{packet=u.weaponDamage;});return {hp:u.maxHp,shield:u.maxShield??0,armor:u.armor,damage:u.weaponDamage,packet,period:u.attackPeriod,energy:u.energy,heal:u.healRate,recovery:u.hp-hp,shieldRecovery:(u.shield??0)-shield,production:productionQuote(w,family).seconds};};
 const before=observe(),offer=structuredClone(row.offer);offer.sold=false;delete offer.purchaseReceipt;w.rewards=[offer];assert.ok(purchaseOffer(w,offer.offerId),id);const after=observe();
 if(e.kind==='teamCard'){if(e.group==='firepower')assert.ok(after.damage>before.damage&&after.period<before.period&&after.packet>before.packet,id);else assert.ok(after.hp>before.hp&&after.armor>before.armor,id);}
 else if(e.effect==='energy')assert.ok(after.energy>before.energy,id);else if(e.effect==='production')assert.ok(after.production<before.production,id);else if(e.effect==='recovery')assert.ok(after.heal>before.heal||after.recovery>before.recovery||after.shieldRecovery>before.shieldRecovery,id);else throw Error('Inactive card '+id);
 rows.push({id,effect:e,family,before,after,gear:equipmentTotals(w),receipt:offer.purchaseReceipt});
}
await fs.writeFile(base+'/card-coverage.json',JSON.stringify({method:'Replay the prior I03 lawful building and production witnesses; equip eight legal blue attribute items with controlled maximum valid affixes, buy every current family/team card through native purchase, measure stat/recovery/production channels. Other catalog rows map to dedicated support/member/hero tests; an entry alone is not a fresh per-item playthrough.',catalog,measured:rows},null,2));
console.log(JSON.stringify({catalog:catalog.length,measured:rows.length,pass:true}));
