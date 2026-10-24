import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const root='reports/local/g03-growth-consumption-20261023';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const repaired=process.argv[2]==='repaired',summaryPath=root+'/'+(repaired?'summary-final-live':'summary-live')+'.json',outputPath=root+'/'+(repaired?'consumption-analysis-final':'consumption-analysis')+'.json';
const summary=read(summaryPath);
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const round=n=>Math.round(n*100)/100;
const total=(rows,key)=>round(rows.reduce((n,r)=>n+(r[key]??0),0));
const tally=(rows,fn)=>rows.reduce((o,r)=>{const k=fn(r);o[k]=(o[k]??0)+1;return o;},{});
const unitsChanged=(before,after)=>after.flatMap(u=>{
 const previous=before.find(p=>p.id===u.id);
 return previous&&u.rank!==previous.rank?[{id:u.id,type:u.type,hero:u.hero,elite:u.elite,before:previous.rank,after:u.rank}]:[];
});
const raw=new Map(),rows=[],deliveries=[];
for(const row of summary.rows){
 assert.equal(sha(row.file),row.sha256);const d=read(row.file);raw.set(row.id,d);
 assert.equal(d.economyAudit.reconciliation.minerals,0,row.id);assert.equal(d.economyAudit.reconciliation.gas,0,row.id);
 const passengers=d.final.ledger.flatMap(j=>j.passengers.map(p=>({...p,job:j.id,family:j.family,jobState:j.state})));
 const passengerStates=Object.entries(tally(passengers,p=>p.purpose+':'+p.status)).map(([state,count])=>{const ps=passengers.filter(p=>p.purpose+':'+p.status===state);return {state,count,paidMinerals:total(ps.map(p=>p.paid),'minerals'),paidGas:total(ps.map(p=>p.paid),'gas'),paidCount:ps.filter(p=>p.paid.minerals+p.paid.gas>0).length};});
 deliveries.push({id:row.id,states:passengerStates,note:'Native passenger ledger. Lost means unresolved delivery loss, which may include destruction, refusal or retirement; the record does not establish which cause. Released passengers are separate from later combat deaths. Free passengers have zero paid cost.'});
 if(row.policy!=='spending')continue;
 const events=d.policyDetails.events;
 const purchases=events.filter(e=>e.kind==='shop-purchase'&&e.data.ok);
 const training=purchases.filter(e=>e.data.offer.expeditionEffect.kind==='training').map(e=>({stage:e.stage,offer:e.data.id,price:e.data.price,targets:e.data.offer.expeditionEffect.targets,changes:unitsChanged(e.data.before.units,e.data.after.units)}));
 for(const action of training){assert.ok(action.changes.length>0,`${row.id}: paid training must affect an actual unit`);assert.ok(action.changes.every(u=>u.after>u.before),`${row.id}: training must increase each changed unit rank`);}
 const identity=purchases.filter(e=>['hero','elite'].includes(e.data.offer.expeditionEffect.kind)).map(e=>({stage:e.stage,kind:e.data.offer.expeditionEffect.kind,offer:e.data.id,price:e.data.price,changes:unitsChanged(e.data.before.units,e.data.after.units),newIdentities:e.data.after.units.filter(u=>(u.hero||u.elite)&&!e.data.before.units.some(p=>p.id===u.id))}));
 const contracts=events.filter(e=>e.kind==='contract-availability');
 for(const event of contracts){assert.equal(event.data.count,0);assert.equal(event.data.findElites,0);}
 const development=events.filter(e=>e.kind==='development-purchase'&&e.data.ok);
 const ends=events.filter(e=>e.kind==='intermission-end');
 const shops=Object.entries(tally(purchases,e=>e.data.offer.expeditionEffect.kind)).map(([kind,count])=>({kind,count,minerals:total(purchases.filter(e=>e.data.offer.expeditionEffect.kind===kind).map(e=>e.data.price),'minerals'),gas:total(purchases.filter(e=>e.data.offer.expeditionEffect.kind===kind).map(e=>e.data.price),'gas')}));
 rows.push({id:row.id,race:row.race,difficulty:row.difficulty,tier:row.tier,version:row.version,seed:row.seed,stop:row.stop,training:{purchases:training.length,unitUpgrades:training.reduce((n,t)=>n+t.changes.length,0),rows:training},identityPurchases:identity,shops,development:{purchases:development.length,definitions:tally(development,e=>e.data.definition),perWindow:tally(development,e=>e.stage)},repair:row.repair,contractsChecked:contracts.length,finalTech:ends.at(-1)?.data.tech??{},finalProduction:ends.at(-1)?.data.production??{},skipReasons:tally(events.filter(e=>e.kind==='shop-skip'),e=>e.data.reason),stopReasons:row.shop.stopReasons,finalWallet:row.wallet});
}
const pairs=summary.pairs.filter(p=>p.arms.length===3).map(pair=>{
 const stage='campaign:'+pair.commonRewardStage;
 const arms=pair.arms.map(arm=>{
  const d=raw.get(arm.id),s=d.stages.find(s=>s.stage===stage&&s.phase==='reward');assert.ok(s);
  return {id:arm.id,version:arm.version,policy:arm.policy,wallet:s.wallet,purchases:s.economy.purchases,production:s.economy.production,refresh:s.economy.rerolls,heroes:s.heroes.map(h=>({id:h.id,rank:h.rank})),ordinaryRankSum:s.allies.filter(u=>!u.hero&&!u.elite).reduce((n,u)=>n+u.rank,0),ordinaryCount:s.allies.filter(u=>!u.hero&&!u.elite).length};
 });
 const [oldPolicy,newPolicy,newValues]=arms;
 const diff=(a,b)=>({purchaseMinerals:round(b.purchases.minerals-a.purchases.minerals),purchaseGas:round(b.purchases.gas-a.purchases.gas),refreshMinerals:round(b.refresh-a.refresh),bankMinerals:round(b.wallet.minerals-a.wallet.minerals),bankGas:round(b.wallet.gas-a.wallet.gas)});
 return {race:pair.race,difficulty:pair.difficulty,tier:pair.tier,commonRewardStage:pair.commonRewardStage,snapshot:'Arrival at reward phase, before spending in that window; all earlier spending included. Random streams can diverge through prior actions.',arms,policyDifference:diff(oldPolicy,newPolicy),valueDifference:diff(newPolicy,newValues)};
});
const repairComparison=repaired?summary.rows.filter(r=>r.policy==='spending').flatMap(r=>{
 const file=root+'/routes/'+r.id+'.json';if(!fs.existsSync(file))return [];const old=read(file),now=raw.get(r.id),oldRepairs=old.policyDetails.events.filter(e=>e.kind==='repair'&&e.data.ok),newRepairs=now.policyDetails.events.filter(e=>e.kind==='repair'&&e.data.ok);
 return [{id:r.id,before:{file,sha256:sha(file),stop:old.stop,stage:old.stage,repairs:oldRepairs.length,repairMinerals:total(oldRepairs.map(e=>e.data.quote),'minerals'),deaths:old.deathRows.length},after:{file:r.file,sha256:r.sha256,stop:r.stop,stage:r.stage,repairs:newRepairs.length,repairMinerals:total(newRepairs.map(e=>e.data.quote),'minerals'),deaths:r.deaths},note:'Only repair candidate filtering and its observational logging changed in the spending controller. Later RNG/gear/outcomes may diverge after the first actual extra repair.'}];
}):[];
const output={date:'2026-10-23',cohort:summary.cohort,complete:summary.complete,routes:summary.count,spendingRoutes:rows.length,summarySha256:sha(summaryPath),interpretation:'Identical prepared starting accounts and seeded native rules. Purchasing changes future RNG use and route exposure, so paired outcomes describe these policies; they are not a pure isolated damage benchmark or human win-rate estimate.',commonProgressPairs:pairs,repairComparison,deliveries,totals:{trainingPurchases:total(rows.map(r=>r.training),'purchases'),actualUnitRankUpgrades:total(rows.map(r=>r.training),'unitUpgrades'),identityPurchases:rows.reduce((n,r)=>n+r.identityPurchases.length,0),contractsChecked:total(rows,'contractsChecked')},rows};
output.policyBaseline=repaired?'Legacy cases retain their original repair-selection behavior as historical baselines. Policy deltas include the repair correction; before/after value deltas both use the corrected spending controller.':'Original policies retained, including the spending repair-selection defect; historical diagnostic cohort only.';
fs.writeFileSync(outputPath,JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({complete:output.complete,routes:output.routes,spendingRoutes:rows.length,pairs:pairs.length,totals:output.totals},null,2));
