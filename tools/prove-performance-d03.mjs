import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';import {createRequire} from 'node:module';import {createHash} from 'node:crypto';
const root='reports/local/performance-d03-20261021',variant=process.argv[2]??'candidate-r1',run=process.argv[3]??'r2',require=createRequire(import.meta.url),baseline=require(path.resolve(root+'/'+variant+'-baseline.cjs')),candidate=require(path.resolve(root+'/'+variant+'-candidate.cjs'));
const hash=b=>createHash('sha256').update(b).digest('hex'),rows=[],report={variant,scope:'Paired frozen baseline/candidate World transitions. Only approved deletion of uncollected resources and expired ground items is projected onto the baseline. Ground-age metadata and account cache revision are excluded explicitly; all other serialized simulation, status, special-system, account and loot-runtime data must match. Constructed transitions, not natural campaign or performance measurement.',pairs:rows};
const input=(q,race)=>({template:q===5?'set.orange.hero.5':'attribute.'+q,race,slot:'offense1',...(q===5?{binding:{hero:{terran:'raynor',zerg:'kerrigan',protoss:'artanis'}[race]}}:{})});
function fixture(lib,seed,race,start,endless){const w=new lib.World({seed,sandbox:true,waves:false,terrain:false,obstacles:[],difficulty:'easy',equipmentAccount:lib.newEquipmentAccount(seed)});assert.ok(w.selectRace(race));assert.ok(w.start());if(endless){w.stage=18;w.endless={round:start,startedAt:0,elites:0,bosses:0,progress:{wave:0,elite:0,boss:0},retry:{elite:0,boss:0},last:{}};}else w.stage=start;w.prepareStage();
 const ids=[];for(const q of [1,2,3,4,5]){const result=lib.grantEquipment(w.starship.account,input(q,race),'case:'+q,{kind:'ground',run:w.runId,x:10+q,z:8});assert.ok(result.ok,JSON.stringify({seed,race,start,endless,q,result}));lib.registerEquipmentDrop(w,result.value);ids.push({id:result.value.id,q});}w.drop({x:14,z:12},[30,17]);w.drop({x:-14,z:12},[5,0]);return {lib,w,ids};}
function next(f){const w=f.w;w.endStage();assert.equal(w.phase,'reward');for(let n=0;w.phase==='reward'&&n<3;n++)assert.ok(w.skipReward());assert.equal(w.phase,'battle');}
function state(f,age,project=false){const w=f.w,a=structuredClone(w.starship.account),core=f.lib.selectRunData(w),loot={serial:w.starship.loot.serial,events:structuredClone(w.starship.loot.events),ground:new Map(w.starship.loot.ground),fullNotified:w.starship.loot.fullNotified};
 delete a.revision;for(const loc of Object.values(a.locations))delete loc.droppedStage;
 if(project){if(age)core.pickups=[];for(const {id,q} of f.ids)if(age>=q+1){delete a.items[id];delete a.locations[id];loot.ground.delete(id);loot.events=loot.events.filter(e=>e.item?.id!==id);}}
 const raw=JSON.stringify({core,statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot(),account:a,loot},(key,value)=>value instanceof Map?{map:[...value]}:value instanceof Set?{set:[...value]}:value);
 return raw.split(w.runId).join('<run-id>');
}
try{
 for(const endless of [false,true])for(const seed of [1,529,1207])for(const race of ['terran','zerg','protoss'])for(const start of endless?[1,31,4097]:[1,7,12]){
  const a=fixture(baseline,seed,race,start,endless),b=fixture(candidate,seed,race,start,endless);
  for(let age=0;age<=6;age++){
   if(age){next(a);next(b);}const expected=state(a,age,true),actual=state(b,age);try{assert.deepEqual(JSON.parse(actual),JSON.parse(expected));}catch(error){await fs.writeFile(root+'/failed-pair-'+variant+'.json',JSON.stringify({endless,seed,race,start,age,expected:JSON.parse(expected),actual:JSON.parse(actual)},null,2));throw error;}
   const expectedIds=b.ids.filter(({q})=>age<q+1).map(({id})=>id);assert.deepEqual(Object.keys(b.w.starship.account.items),expectedIds);assert.equal(b.w.pickups.length,age?0:2);
   rows.push({endless,seed,race,start,age,ordinal:b.w.draftWindowId,remaining:expectedIds,sha256:hash(actual)});
  }
 }
 report.pass=true;
}catch(e){report.pass=false;report.failure=String(e.stack??e);process.exitCode=1;}
await fs.writeFile(root+'/paired-state-'+variant+'-'+run+'.json',JSON.stringify(report,null,2)+'\n');await fs.copyFile(import.meta.filename,root+'/paired-state-'+run+'-runner.mjs');console.log(JSON.stringify({pass:report.pass,pairs:rows.length,failure:report.failure?.slice(0,1600)}));
