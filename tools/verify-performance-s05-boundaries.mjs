import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {make,state} from './performance-s05-cases.mjs';
const root='reports/local/performance-s05-20261020',a=await import('../'+root+'/baseline-r2-logic/main.mjs'),b=await import('../'+root+'/candidate-r2-logic/main.mjs'),report={pass:false,rows:[]},hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function receipts(lib,n,reject){
 const w=make(lib,'terran',529,n),s=w.expedition,rows=[],record=()=>rows.push(state(lib,w));s.familySlots=['marine','marauder','reaper','hellion','tank'];Object.assign(s.tech,{starport:1,factory:1,starport_lab:1});for(let i=0;i<5;i++)w.addUnit('marine','terran',-8,i*2,5);
 const pod=w.spawnPod('viking',{x:8,z:0},99,1);pod.status='opening';pod.resolvedAt=0;pod.guardianIds.clear();s.ledger.push({id:99,family:'viking',line:'starport',facilityIds:[1],remaining:0,state:'risk',podId:pod.id,passengers:[{paid:{minerals:125,gas:75},status:'waiting',entityId:null,purpose:'body'}]});
 lib.receiptNeeded(w,pod,0);const request=s.pendingReceipt;assert.ok(request);record();
 const pos=w.freePosition;w.freePosition=()=>null;assert.equal(lib.commitReplacement(w,request.id,'marine',w.revision),false);record();w.freePosition=pos;
 const act=()=>reject?lib.rejectReceipt(w,request.id,w.revision):lib.commitReplacement(w,request.id,'marine',w.revision);
 assert.equal(act(),true);record();assert.equal(act(),false);record();assert.equal(s.completedReceipts.length,1);assert.equal(s.ledger.length,n+1);
 if(n===0){lib.paidReservations(w,'viking');const saved=w.captureRun();const copy=new lib.World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:529});copy.restoreRun(saved);rows.push(state(lib,copy));assert.equal(copy.expedition.completedReceipts.length,1);}
 return rows;
}
function weights(lib,race,n){
 const s=lib.newExpedition(race);let rng=529,serial=0;const ctx={state:s,stage:5,random:()=>{rng=(Math.imul(rng,1664525)+1013904223)>>>0;return rng/4294967296;},nextOfferId:id=>id+':'+(++serial),familyInfo:f=>({name:f,alive:s.familySlots.includes(f)?1:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:10,canProduce:true,capabilities:['ground']}),heroes:[]};
 lib.beginExpeditionWindow(s,5);const pool=lib.inspectReinforcementPool(ctx),ids=pool.filter(x=>x.id.startsWith('card.')).slice(0,4).map(x=>x.id);assert.ok(ids.length>1);
 s.draftHistory=Array.from({length:n},(_,i)=>({shown:ids.slice(),chosen:i%2?ids[0]:null}));s.draftHistory.push({shown:[],chosen:null});const weighted=lib.inspectReinforcementPool(ctx);
 if(n>0)assert.ok(weighted.some((x,i)=>x.weight<pool[i].weight));return {weighted,offers:lib.drawExpeditionReinforcements(ctx,true),rng,serial,history:s.draftHistory};
}
function guards(lib){
 const w=make(lib),p=w.spawnPod('marine',{x:8,z:0},99,1);p.status='destroyed';p.hp=0;p.guardTypes=['zergling','roach'];p.guardianIds.clear();w.releaseWaitingPodGuards();assert.equal(p.guardianIds.size,2);for(const id of p.guardianIds)assert.equal(w.entities.get(id).guardianPod,null);const first=state(lib,w);w.releaseWaitingPodGuards();assert.equal(p.guardianIds.size,2);return [first,state(lib,w)];
}
try{
 for(const n of [0,1000,10000])for(const reject of [false,true]){const old=receipts(a,n,reject),current=receipts(b,n,reject);assert.deepEqual(current,old);report.rows.push({kind:'receipt',n,reject,checks:old.length,sha256:hash(old)});}
 for(const race of ['terran','zerg','protoss'])for(const n of [0,1,2,3,20,1000,10000]){const old=weights(a,race,n),current=weights(b,race,n);assert.deepEqual(current,old);report.rows.push({kind:'recent-shown-chosen-weights',race,n,checks:1,sha256:hash(old)});}
 const old=guards(a),current=guards(b);assert.deepEqual(current,old);report.rows.push({kind:'destroyed-carrier-pending-guards',checks:2,sha256:hash(old)});report.pass=true;
}catch(e){report.failure=String(e.stack??e);process.exitCode=1;}finally{report.checks=report.rows.reduce((s,r)=>s+r.checks,0);await fs.writeFile(root+'/boundaries.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
