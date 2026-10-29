// Investigation only: controlled wounded squad, no renderer or player saves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount,grantEquipment,equip} from '../src/simulation/starship/inventory';
import {beginSpecialStage,markSpecialReady,finishSpecialStage} from '../src/simulation/special-stages/runtime';

function fixture(gear:boolean,wounded:boolean,carryCache=false){
 const account=newEquipmentAccount(529);
 if(gear){const r=grantEquipment(account,{template:'attribute.3',race:'terran',slot:'defense1'},'fixture',{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;assert.ok(equip(account,'terran',r.value.id,'defense1').ok);}
 const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],initial:['marine'],equipmentAccount:account});
 assert.ok(w.start());w.stage=4;w.prepareStage();w.pods=[];w.missions.enabled=false;w.encounters.enabled=false;
 for(let rank=2;rank<=5;rank++)w.addUnit('marine','terran',rank*2,0,rank);
 w.addUnit('ultralisk','terran',0,3);
 for(const u of w.allies())u.hp*=wounded?(u.unitType==='marine'&&u.rank<5?.2:.9):1;
 const native=new Map(w.allies().map(u=>[u.id,w.starship.native.get(u)]));
 const original=w.refreshStats.bind(w);
 const trace:object[]=[];
 w.refreshStats=(u,fill=false)=>{
  if(w.specialStages.active){
   const before={hp:u.hp,maxHp:u.maxHp,hasNativeCache:w.starship.native.has(u)};
   // Counterfactual diagnostic only: transfer the parked native baseline to clones.
   if(carryCache&&!w.starship.native.has(u)&&native.get(u.id))w.starship.native.set(u,structuredClone(native.get(u.id)!));
   original(u,fill);trace.push({id:u.id,rank:u.rank,before,after:{hp:u.hp,maxHp:u.maxHp}});
  }else original(u,fill);
 };
 const rows=()=>[...w.entities.values()].filter(u=>u.owner==='terran').map(u=>({id:u.id,type:u.unitType,rank:u.rank,hp:u.hp,maxHp:u.maxHp}));
 return {w,rows,trace};
}
const results:object[]=[];
let example:object|undefined;
for(const kind of ['resources','arena','crossing'] as const)for(const [gear,wounded,carryCache] of [[false,true,false],[true,false,false],[true,true,false],[true,true,true]]){
 const {w,rows,trace}=fixture(gear,wounded,carryCache),before=rows();
 assert.ok(beginSpecialStage(w,kind,'fixture'));const entry=rows();assert.ok(markSpecialReady(w));
 // No combat step: timeout isolates transition damage from enemy attacks.
 assert.ok(finishSpecialStage(w,'timeout'));const returned=rows();
 const dead=returned.filter(u=>u.hp<=0).map(u=>u.id);
 if(gear&&wounded&&!carryCache){assert.equal(dead.length,4);assert.deepEqual(entry.filter(u=>u.type==='marine'&&u.hp>0).map(u=>u.rank),[5]);}
 else assert.equal(dead.length,0);
 if(carryCache)for(const u of entry){const old=before.find(v=>v.id===u.id)!;assert.ok(Math.abs(u.hp/u.maxHp-old.hp/old.maxHp)<1e-10);}
 for(const u of w.allies())w.refreshStats(u);
 const afterReturnRefresh=rows();
 if(gear&&wounded&&carryCache)assert.equal(afterReturnRefresh.filter(u=>u.hp<=0).length,4);
 results.push({kind,gear,wounded,diagnosticCacheTransfer:carryCache,entryAlive:entry.filter(u=>u.hp>0).length,returnAlive:returned.filter(u=>u.hp>0).length,aliveAfterReturnRefresh:afterReturnRefresh.filter(u=>u.hp>0).length,dead});
 if(kind==='resources'&&gear&&wounded&&!carryCache)example={before,entry,returned,afterReturnRefresh,trace};
}
const report={date:'2026-10-29',issue:'V06-SPECIAL-ROSTER-001',sourceHead:'674c528ee8657f7b2f6ba743e2aac6c13f644eec',workingTree:'shared uncommitted changes present',scope:'Controlled simulation only; no battle ticks, no private player save, no production modification or deployment.',results,example};
fs.writeFileSync('reports/qa/special-roster-inspection-20261029.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:results.length,result:'passed: transition alone kills four wounded marines; diagnostic native-cache transfer prevents entry loss',report:'reports/qa/special-roster-inspection-20261029.json'}));
