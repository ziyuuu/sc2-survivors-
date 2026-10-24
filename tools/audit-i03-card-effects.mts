import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {familyWorld} from './lib/i03-fixtures.mts';
import {purchaseOffer} from '../src/simulation/expedition-economy';
import {productionQuote} from '../src/simulation/expedition-production';
import {tickExpeditionRecovery} from '../src/simulation/combat/expedition-combat';
const base='reports/local/integration-i03-20261022',source=JSON.parse(await fs.readFile(base+'/cards-paths-expanded.json','utf8')),rows:any[]=[];
for(const [id,row]of Object.entries(source.rows) as [string,any][]){if(!['card','teamCard'].includes(row.effect.kind))continue;const {w}=familyWorld(row.family),family=row.effect.family??row.family,u=w.familyUnits(family)[0];assert.ok(u,id);
 const observe=()=>{u.hp=u.maxHp*.4;u.shield=(u.maxShield??0)*.4;u.energy=0;u.lastDamagedAt=-100;const hp=u.hp,shield=u.shield;tickExpeditionRecovery(w,u,1);return {hp:u.maxHp,armor:u.armor,damage:u.weaponDamage,period:u.attackPeriod,energy:u.energy,heal:u.healRate,recovery:u.hp-hp,shieldRecovery:(u.shield??0)-shield,production:productionQuote(w,family).seconds};};
 const before=observe(),offer=structuredClone(row.offer);offer.sold=false;delete offer.purchaseReceipt;w.rewards=[offer];assert.ok(purchaseOffer(w,offer.offerId),id);const after=observe(),effect=row.effect;
 if(effect.kind==='teamCard'){if(effect.group==='firepower')assert.ok(after.damage>before.damage&&after.period<before.period,JSON.stringify({id,family,before,after,effect,cards:w.expedition.cardTotals}));else assert.ok(after.hp>before.hp&&after.armor>before.armor,id);}
 else if(effect.key.startsWith('energy.'))assert.ok(after.energy>before.energy,id);
 else if(effect.key.startsWith('production.'))assert.ok(after.production<before.production,id);
 else if(effect.key.startsWith('recovery.'))assert.ok(after.heal>before.heal||after.recovery>before.recovery||after.shieldRecovery>before.shieldRecovery,id);
 else throw Error('Unhandled card '+id);
 rows.push({id,effect,before,after,receipt:offer.purchaseReceipt});
}
await fs.writeFile(base+'/card-effects.json',JSON.stringify({at:new Date().toISOString(),scope:'Each previously sourced current family/team card is purchased on its replayed lawful family path, then measured through native unit recovery/stat refresh and paid production duration. Controlled damage/time/funds are fixtures; no appearance-frequency claim.',rows},null,2));console.log(JSON.stringify({cards:rows.length,pass:true}));
