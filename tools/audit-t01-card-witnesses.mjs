import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const base='reports/local/t01-20261024/',read=async name=>JSON.parse(await fs.readFile(base+name,'utf8'));
const report={scope:'Effect-specific production-state witnesses. This does not establish probability calibration, complete gameplay branches, or rendered visual acceptance.',rows:[],inputs:[]};
for(const file of ['card-effect-natural-event-r1.json','card-effect-bait-r3.json','card-effect-shop-witness-r1.json']){
 const bytes=await fs.readFile(base+file);report.inputs.push({file,sha256:createHash('sha256').update(bytes).digest('hex')});
 for(const row of JSON.parse(bytes).rows){
  const effect=row.fixture.effect;if(file==='card-effect-natural-event-r1.json'&&effect.item!=='tavern')continue;
  const result={id:row.id,file,status:'pending',witness:null};report.rows.push(result);
  try{
   if(effect.item==='dice'){
    assert.equal(row.status,'immediate-effect');const s=row.samples.at(-1).state.shopRefresh;
    assert.equal(s.level,effect.level);assert.equal(s.after.revision,s.before.revision+1);assert.equal(s.after.page,s.before.page+1);assert.equal(s.after.offers.length,3);
    assert.ok(s.after.offers.every(o=>!o.sold&&!s.before.offers.some(b=>b.offerId===o.offerId)));
    result.witness={kind:'native-refresh',level:s.level,revision:[s.before.revision,s.after.revision],page:[s.before.page,s.after.page],offers:s.after.offers};
   }else if(effect.item==='pandora'){
    assert.equal(row.status,'cycle-simulated');const p=row.fixture.pandoraWitness;
    assert.deepEqual(p.existingAfter,p.existingBefore);assert.equal(p.newAfter.pandora,true);
    assert.ok(Math.abs(p.newAfter.maxHp/p.existingBefore.maxHp-1.25)<1e-12);assert.ok(Math.abs(p.newAfter.weaponDamage/p.existingBefore.weaponDamage-1.15)<1e-12);
    assert.equal(p.walletAfter.minerals-p.walletBefore.minerals,3000);assert.equal(p.walletAfter.gas-p.walletBefore.gas,1500);
    result.witness={kind:'native-purchase-and-spawn',existingUnchanged:true,newHpRatio:p.newAfter.maxHp/p.existingBefore.maxHp,newDamageRatio:p.newAfter.weaponDamage/p.existingBefore.weaponDamage,resourceDelta:{minerals:3000,gas:1500}};
   }else{
    assert.equal(row.status,'cycle-simulated');assert.equal(row.fixture.diagnosticRun,false);const first=row.samples.find(s=>s.state.eventPacing.lastKey),last=row.samples.at(-1);assert.ok(first);assert.equal(first.elapsed,20);assert.equal(last.elapsed,35);
    if(effect.item==='tavern'){assert.equal(first.state.eventPacing.lastKey,'mission:escort');assert.equal(first.state.eventActive.mission,'escort');}
    else{const total=Object.values(first.state.fun.bait.counts).reduce((a,b)=>a+b,0);assert.equal(total,1);assert.equal(last.state.diagnostic.enabled,true);assert.ok(last.state.diagnostic.prevented>0);assert.ok(last.state.diagnostic.damage>0);}
    result.witness={kind:'native-event-admission',time:first.elapsed,key:first.state.eventPacing.lastKey,lastAt:last.elapsed,counts:last.state.fun.bait.counts,diagnostic:last.state.diagnostic??null};
   }
   result.status='state-witness-verified';
  }catch(e){result.status='failed';result.failure=String(e);}
 }
}
report.verified=report.rows.filter(r=>r.status==='state-witness-verified').length;
assert.equal(report.rows.length,36);await fs.writeFile(base+'card-state-witnesses-r1.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({rows:report.rows.length,verified:report.verified,failed:report.rows.filter(r=>r.status==='failed').map(r=>({id:r.id,failure:r.failure}))}));
