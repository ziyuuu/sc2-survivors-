import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';import {make} from './performance-s05-cases.mjs';
const root='reports/local/performance-s05-20261020',libs=[await import('../'+root+'/baseline-r2-logic/main.mjs'),await import('../'+root+'/candidate-r2-logic/main.mjs')],report={method:'Independent serial alternating CPU measurements after browser closes. Native active reservations, tactical facilities UI and reinforcement pool weights; no frame-rate claim.',rows:[],pass:false},median=a=>a.toSorted((a,b)=>a-b)[Math.floor(a.length/2)];
for(const n of [0,20,1000,10000])for(const kind of ['active-reservations','tactical-ui','draft-weights']){
 const cases=libs.map(lib=>{
  if(kind==='draft-weights'){const s=lib.newExpedition('terran'),ctx={state:s,stage:5,random:()=>.5,nextOfferId:id=>id,familyInfo:f=>({name:f,alive:s.familySlots.includes(f)?1:0,canAttack:true,canSupport:false,usesEnergy:false,cultivationCapacity:10,canProduce:true,capabilities:['ground']}),heroes:[]};lib.beginExpeditionWindow(s,5);s.draftHistory=Array.from({length:n+1},(_,i)=>({shown:i%2?['card.firepower.marine.white']:[],chosen:null}));return ()=>lib.inspectReinforcementPool(ctx);}
  const w=make(lib,'terran',529,n,kind==='tactical-ui');lib.updateExpeditionProduction(w,0,true);assert.equal(w.expedition.ledger.length,n+1);
  return kind==='tactical-ui'?()=>lib.renderProductionWindow(w,'facilities'):()=>[lib.paidReservations(w,'marine'),lib.tacticalReservations(w,'marine')];
 });
 assert.deepEqual(cases[0](),cases[1]());for(let k=0;k<60;k++)for(const f of cases)f();const count=kind==='active-reservations'?2000:200,samples=[];
 for(let round=0;round<9;round++){const times=[];for(const i of round%2?[1,0]:[0,1]){const at=performance.now();for(let k=0;k<count;k++)cases[i]();times[i]=(performance.now()-at)/count;}samples.push({baselineMs:times[0],candidateMs:times[1]});}
 const baselineMs=median(samples.map(s=>s.baselineMs)),candidateMs=median(samples.map(s=>s.candidateMs));report.rows.push({kind,n,count,baselineMs,candidateMs,changePercent:(candidateMs/baselineMs-1)*100,fasterPairs:samples.filter(s=>s.candidateMs<s.baselineMs).length,samples});console.log(JSON.stringify({...report.rows.at(-1),samples:undefined}));
}
report.pass=true;await fs.writeFile(root+'/consumer-cpu.json',JSON.stringify(report,null,2));
