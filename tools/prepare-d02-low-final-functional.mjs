import fs from 'node:fs';
const f='tools/qa-performance-d02-low-functional.mjs';let s=fs.readFileSync(f,'utf8');const begin=s.indexOf(' await context.addInitScript('),end=s.indexOf(' for(const selector',begin);if(begin<0||end<0)throw Error('settings block');s=s.slice(0,begin)+" if(process.argv[4]!=='fresh'){\n"+s.slice(begin,end)+" }else{setPhase('fresh-default');await menu();assert.equal((await settings()).preset,'full');}\n"+s.slice(end);
s=s.replace("source:999999,tier:'boss'","source:[...w.entities.values()].find(u=>u.hp>0&&u.owner==='zerg')?.id??w.addUnit('roach','zerg',origin.x,origin.z,1).id,tier:'boss'");
// A paired fixed-step simulation check does not use a save/load path.
s=s.replace("async steps(n){",`async fixedRun(preset,n){v.setCombatPreset(preset);w.paused=false;for(let i=0;i<n;i++){w.step();draw();}w.paused=true;draw();return {state:JSON.stringify({run:A03.selectRunData(w),statuses:w.statuses.snapshot(),specials:w.enemySpecials.snapshot()},(key,value)=>['runId','notice','noticeUntil'].includes(key)?undefined:value instanceof Map?{map:[...value]}:value instanceof Set?{set:[...value]}:value),heroEvents:w.heroAttackEvents.length,calls:{...effectCalls},time:w.time,tick:w.tick};},
   async steps(n){`);
const pos=s.indexOf(" setPhase('native-danger-footprints');");if(pos<0)throw Error('pair insert');s=s.slice(0,pos)+`
 for(const [index,[race,ids]] of groups.entries()){
  setPhase('hero-fixed-pair-'+index);await page.evaluate(([race,ids])=>D02Functional.heroScene(race,ids),[race,ids]);const full=await page.evaluate(()=>D02Functional.fixedRun('full',180));
  await page.evaluate(([race,ids])=>D02Functional.heroScene(race,ids),[race,ids]);const low=await page.evaluate(()=>D02Functional.fixedRun('low',180));assert.equal(low.state,full.state,'native state under low: '+ids);assert.equal(low.heroEvents,0);const before=low.state;const restored=await page.evaluate(()=>D02Functional.preset('full'));report.checks.push({kind:'hero-fixed-pair',race,ids,ticks:180,full:{...full,state:undefined},low:{...low,state:undefined},stateSha256:hash(before),restoredPreset:restored.preset});await save();
 }
`+s.slice(pos);
fs.writeFileSync(f,s);
