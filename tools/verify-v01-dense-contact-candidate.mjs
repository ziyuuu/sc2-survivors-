import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as old from '../reports/local/v01-20261024/dense-contact-candidate/baseline.mjs';
import * as candidate from '../reports/local/v01-20261024/dense-contact-candidate/candidate.mjs';
const base='reports/local/v01-20261024/dense-contact-candidate',report={scope:'Exact controlled separation/contact and fixed-step comparisons; independent CPU microbenchmark, not browser FPS or balance.',separationBodies:0,contactCases:[],worldCases:[],benchmark:[],pass:false};
function make(api,seed=529,terrain=false,phase=false){const w=new api.World({sandbox:true,waves:false,terrain,obstacles:[],seed,initial:[]});w.start();w.entities.clear();w.autoWaves=false;w.starship.enabled=phase;w.starship.numbers.set('dominance-phase',phase?10:0);
 for(let i=0;i<316;i++){const angle=i*2.399963,radius=Math.sqrt(i)*.22,u=w.addUnit(i<16?'marine':['zergling','roach','hydralisk','mutalisk'][i%4],i<16?'terran':'zerg',Math.sin(angle)*radius,Math.cos(angle)*radius);u.hp=u.maxHp=1000000;}
 w.hash.rebuild(w.entities.values());return w;}
const state=w=>JSON.stringify(w.captureRun(),(k,v)=>['notice','noticeUntil','revision'].includes(k)?undefined:typeof v==='string'?v.replaceAll(w.runId,'$RUN'):v instanceof Map?{map:[...v]}:v instanceof Set?{set:[...v]}:v);
for(const terrain of [false,true])for(const phase of [false,true])for(const crossing of [false,true]){
 const a=make(old,529,terrain,phase),b=make(candidate,529,terrain,phase);if(crossing){a.specialStages.active={kind:'crossing'};b.specialStages.active={kind:'crossing'};}
 for(const [id,u]of a.entities){assert.deepEqual(b.separation(b.entities.get(id)),a.separation(u),`${terrain}/${phase}/${crossing}/${id}`);report.separationBodies++;}
 const sa=new old.ContactSolver(),sb=new candidate.ContactSolver(),ignore=(x,y)=>x.id%29===0||y.id%29===0;
 for(let step=0;step<12;step++){const ca=sa.resolve(a.entities.values(),a.hash,[],a.mapHalf,1/60,null,a.terrain,ignore,crossing?.6:1),cb=sb.resolve(b.entities.values(),b.hash,[],b.mapHalf,1/60,null,b.terrain,ignore,crossing?.6:1);assert.equal(cb,ca);assert.deepEqual([...b.entities].map(([id,u])=>[id,u.x,u.z]),[...a.entities].map(([id,u])=>[id,u.x,u.z]));a.hash.rebuild(a.entities.values());b.hash.rebuild(b.entities.values());}
 report.contactCases.push({terrain,phase,crossing,steps:12,exact:true});
}
for(const terrain of [false,true])for(const seed of [529,733]){const a=make(old,seed,terrain),b=make(candidate,seed,terrain);assert.equal(state(a),state(b));for(let tick=0;tick<180;tick++){a.step();b.step();if(tick%30===29)assert.equal(state(b),state(a),`World ${terrain}/${seed}/${tick}`);}report.worldCases.push({terrain,seed,ticks:180,exact:true});}
for(const terrain of [false,true]){const worlds={old:make(old,529,terrain),candidate:make(candidate,529,terrain)},solvers={old:new old.ContactSolver(),candidate:new candidate.ContactSolver()},snapshot=[...worlds.old.entities.values()].map(u=>({id:u.id,x:u.x,z:u.z}));
 const measure=k=>{const w=worlds[k];let separation=0,contacts=0;for(let j=0;j<60;j++){for(const p of snapshot){const u=w.entities.get(p.id);u.x=p.x;u.z=p.z;}w.hash.rebuild(w.entities.values());let at=performance.now();for(const u of w.entities.values())w.separation(u);separation+=performance.now()-at;at=performance.now();solvers[k].resolve(w.entities.values(),w.hash,[],w.mapHalf,1/60,null,w.terrain,()=>false);contacts+=performance.now()-at;}return {separation:separation/60,contacts:contacts/60};};
 for(let i=0;i<2;i++){measure('old');measure('candidate');}const rounds=[];for(let i=0;i<12;i++){const row={round:i};for(const k of i%2?['candidate','old']:['old','candidate'])row[k]=measure(k);rounds.push(row);}const mean=(k,p)=>rounds.reduce((n,r)=>n+r[k][p],0)/rounds.length;report.benchmark.push({terrain,oldSeparationMs:mean('old','separation'),newSeparationMs:mean('candidate','separation'),oldContactsMs:mean('old','contacts'),newContactsMs:mean('candidate','contacts'),rounds});}
report.pass=true;await fs.writeFile(base+'/verification.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({...report,benchmark:report.benchmark.map(({rounds,...r})=>r)},null,2));
