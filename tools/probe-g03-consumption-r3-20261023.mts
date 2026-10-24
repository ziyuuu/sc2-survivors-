const OUT='D:/星际/reports/local/g03-farm-minor-20261023';
import assert from 'node:assert/strict';import fs from 'node:fs';
import {growthRuntime} from './lib/g03-growth-runtime.mts';
import {consumptionController} from './lib/g03-consumption-controller-r3.mts';
const r=await growthRuntime('live'),rows:any[]=[];
function world(race='terran',seed=529){return new r.World({race,seed,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:r.newEquipmentAccount(seed)});}
function put(w:any,template:string,slot:string){const g=r.grantEquipment(w.starship.account,{template,race:w.selectedRace,slot,...(template.includes('.hero.')?{binding:{hero:'raynor'}}:{})},'consumption-probe:'+w.starship.account.serial,{kind:'warehouse'});assert.ok(g.ok);assert.ok(w.equipItem(g.value.id,slot).ok);}
function check(name:string,fn:()=>any){try{const evidence=fn();rows.push({name,pass:true,evidence});console.log('PASS '+name);}catch(e){rows.push({name,pass:false,error:String(e instanceof Error?e.stack:e)});console.log('FAIL '+name+': '+e);}}
for(const race of ['terran','zerg','protoss'])check(race+' native intermission with production reserve',()=>{
 const w=world(race),p=consumptionController(w,r,race,{advance:false});p.initialize();w.start();w.endStage();const initial={...w.wallet};p.intermission();
 assert.equal(w.talent('find_elites'),0);assert.equal(w.expedition.eliteContracts.length,0);assert.ok(p.events.some(e=>e.kind==='development-purchase'&&e.data.ok||e.kind==='development-stop'));assert.ok(p.events.some(e=>e.kind==='shop-purchase'&&e.data.ok||e.kind==='shop-stop'));
 assert.ok(w.wallet.minerals>=0&&w.wallet.gas>=0);return {initial,final:{...w.wallet},events:p.events};
});
for(const race of ['terran','zerg','protoss'])check(race+' loan and choice consumes four distinct legal development opportunities',()=>{
 const w=world(race);put(w,'module.loan.4','gathering');for(const slot of ['offense1','offense2','offense3','offense4'])put(w,'set.advanced.choice.4',slot);
 const p=consumptionController(w,r,race,{advance:false});p.initialize();w.start();w.endStage();assert.equal(r.equipmentDevelopmentLimit(w),4);p.development(p.reserve());
 const paid=p.events.filter(e=>e.kind==='development-purchase'&&e.data.ok);assert.equal(paid.length,4);assert.notEqual(paid[0].data.definition,paid[1].data.definition);assert.equal(w.rewardRound,'random');return {events:p.events,tech:w.expedition.tech,wallet:w.wallet};
});
check('rich wallet spends on native paid/free refreshes and first-free purchases',()=>{
 const w=world();put(w,'module.loan.4','gathering');put(w,'module.unreasonable.4','logistics');const p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();w.endStage();w.skipDevelopment();p.shopping(p.reserve());
 assert.ok(p.events.some(e=>e.kind==='shop-refresh'&&e.data.cost>0));assert.ok(p.events.some(e=>e.kind==='shop-purchase'&&e.data.ok&&e.data.price.firstFree));return p.events;
});
check('refresh-credit module uses earned free refresh through native action',()=>{
 const w=world();put(w,'module.loan.4','gathering');put(w,'module.refresh.4','logistics');const p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();w.endStage();w.skipDevelopment();p.shopping(p.reserve());
 const refreshes=p.events.filter(e=>e.kind==='shop-refresh');assert.ok(refreshes.some(e=>e.data.cost>0));assert.ok(refreshes.some(e=>e.data.cost===0));return p.events;
});
check('insufficient reserve logs the decision without forced currency',()=>{
 const w=world(),p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();w.endStage();w.skipDevelopment();w.wallet={minerals:0,gas:0};p.shopping(p.reserve());assert.ok(p.events.some(e=>e.kind==='shop-stop'));assert.ok(w.wallet.minerals>=0&&w.wallet.gas>=0);return p.events;
});
check('native training card is prioritized and both selected soldiers actually rank up',()=>{
 const attempts:any[]=[];let found=false;
 for(let seed=529;seed<553&&!found;seed++){
  const w=world('terran',seed);put(w,'module.loan.4','gathering');const p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();w.addUnit('marine','terran',3,0);w.endStage();w.skipDevelopment();p.shopping(p.reserve());
  const purchases=p.events.filter(e=>e.kind==='shop-purchase'&&e.data.ok&&e.data.offer.expeditionEffect.kind==='training');
  for(const e of purchases){const target=e.data.offer.expeditionEffect;assert.equal(target.targets.length,2);for(const t of target.targets)assert.equal(e.data.after.units.find((u:any)=>u.id===t.id).rank,target.rank);found=true;}
  attempts.push({seed,events:p.events});
 }assert.ok(found,'No native training purchase observed in the declared fixture-seed range');return {attempts,seedSearch:'Controlled coverage search, not a probability or natural campaign sample.'};
});
check('native full-family elite purchase confirms replacement and charges exactly once',()=>{
 const attempts:any[]=[];let found=false;
 for(let seed=529;seed<553&&!found;seed++){
  const w=world('terran',seed);put(w,'module.loan.4','gathering');const p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();while(w.familySeatCount('marine')<w.familyMemberCap('marine'))w.addUnit('marine','terran',w.familySeatCount('marine')*2,0);
  let confirmations=0;const native=w.confirmShopElite.bind(w);w.confirmShopElite=(...args:any[])=>{const result=native(...args);if(result)confirmations++;return result;};w.endStage();w.skipDevelopment();p.shopping(p.reserve());
  const purchases=p.events.filter(e=>e.kind==='shop-purchase'&&e.data.ok&&e.data.offer.expeditionEffect.kind==='elite');
  for(const e of purchases){assert.ok(e.data.after.units.some((u:any)=>u.elite===e.data.variant));if(confirmations){assert.equal(e.data.before.wallet.minerals-e.data.after.wallet.minerals,e.data.price.minerals);assert.equal(e.data.before.wallet.gas-e.data.after.wallet.gas,e.data.price.gas);found=true;}}
  attempts.push({seed,confirmations,events:p.events});
 }assert.ok(found,'No confirmed elite purchase observed in declared fixture-seed range');return {attempts,seedSearch:'Controlled full-family fixture coverage; no RNG replacement.'};
});
check('existing equipment hero receives a real paid duplicate and higher rank',()=>{
 const attempts:any[]=[];let found=false;
 for(let seed=529;seed<553&&!found;seed++){
  const w=world('terran',seed);put(w,'module.loan.4','gathering');for(const slot of ['offense1','offense2','offense3','offense4','defense1','defense2'])put(w,'set.orange.hero.5',slot);
  const p=consumptionController(w,r,'terran',{advance:false});p.initialize();w.start();w.stage=12;w.endStage();w.skipDevelopment();p.shopping(p.reserve());
  const purchases=p.events.filter(e=>e.kind==='shop-purchase'&&e.data.ok&&e.data.offer.expeditionEffect.kind==='hero');
  for(const e of purchases){const id=e.data.offer.expeditionEffect.heroId,before=e.data.before.units.find((u:any)=>u.hero===id),after=e.data.after.units.find((u:any)=>u.hero===id);assert.ok(after);if(before&&after.rank>before.rank){assert.ok(e.data.price.minerals+e.data.price.gas>0);found=true;}}
  attempts.push({seed,events:p.events});
 }assert.ok(found,'No native duplicate hero purchase observed in declared fixture-seed range');return {attempts,seedSearch:'Controlled legal equipment-start hero, native offers, no hero/RNG injection.'};
});
const label=process.argv[2]??'r2';fs.writeFileSync(OUT+'/consumption-probes-'+label+'.json',JSON.stringify({fixture:'Controlled native intermissions; sandbox, explicit window completion and one zero-wallet fixture. Not natural campaign outcomes.',rows},null,2));assert.ok(rows.every(r=>r.pass),rows.filter(r=>!r.pass).map(r=>r.name).join(', '));
