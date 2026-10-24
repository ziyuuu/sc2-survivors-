import fs from 'node:fs/promises';import {make,elite} from './performance-s01-s02-cases.mjs';
const lib=await import('../reports/local/performance-s06-20261020/baseline-logic/main.mjs'),report={method:'S05 frozen production World.step only. No direct fire, forced windup, recovery clearing, source speed/range/damage editing. Diagnostic targets have 1e6 HP, stoppedUntil to isolate source behavior. Flat field; not natural campaign.',rows:[]};
for(const id of ['baneling','baneling.1','baneling.2','baneling.3'])for(const scenario of ['mixed-live','moving-target']){
 const w=make(lib,'zerg',529),u=id==='baneling'?w.addUnit('baneling','terran',0,0):elite(lib,w,id),target=w.addUnit(scenario==='air-only'?'mutalisk':'roach','zerg',0,scenario==='contact'?.6:6);
 target.hp=target.maxHp=1e6;target.stoppedUntil=1e9;target.weaponDamage=0;
 if(scenario==='mixed-live')for(let i=0;i<12;i++){const a=w.addUnit('hydralisk','terran',(i%4-1.5)*.8,1+Math.floor(i/4)*.8);}
 if(scenario==='moving-target'){target.stoppedUntil=0;target.weaponDamage=0;}
 const trace=[],shots=[];let old=u.shotSequence??0,minEdge=Infinity;
 for(let tick=0;tick<900;tick++){w.step();minEdge=Math.min(minEdge,w.edgeDistance(u,target));if((u.shotSequence??0)!==old){old=u.shotSequence??0;shots.push({tick:w.tick,time:w.time,hp:target.hp,recoveryUntil:u.recoveryUntil});}if(tick%60===0)trace.push({tick:w.tick,time:w.time,x:u.x,z:u.z,action:u.action,attackTarget:u.attackTarget,range:u.attackRange,edge:w.edgeDistance(u,target),windup:u.windup,recoveryUntil:u.recoveryUntil,canFire:w.canFireAt(u,target)});}
 report.rows.push({id,scenario,shots,minEdge,damage:1e6-target.hp,trace});console.log(JSON.stringify({id,scenario,shots:shots.length,minEdge,damage:1e6-target.hp,final:trace.at(-1)}));
}
await fs.mkdir('reports/local/baneling-s09-20261020',{recursive:true});await fs.writeFile('reports/local/baneling-s09-20261020/diagnosis-r2.json',JSON.stringify(report,null,2));
