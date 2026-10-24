import fs from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const base='reports/local/v01-20261024',original=await fs.readFile(base+'/loading.mjs','utf8'),sha=s=>createHash('sha256').update(s).digest('hex');let code=original;
function replace(a,b){assert.equal(code.split(a).length,2,a.slice(0,100));code=code.replace(a,b);}
replace("import fs from 'node:fs/promises';", "import os from 'node:os';import fs from 'node:fs/promises';");
replace("const race=process.env.SC2_D04_RACE??'terran';", "const entryMode=process.env.V01_ENTRY_MODE??'staged';assert.ok(['staged','foreground'].includes(entryMode));const race=process.env.SC2_D04_RACE??'terran';");
replace("const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));", "report.entryMode=entryMode;report.machine={cpu:os.cpus()[0]?.model,totalBytes:os.totalmem(),freeBytes:os.freemem()};report.scope+=' Isolated entry comparison: identical current diagnostic bundle, only foreground mode pauses at native tick zero and finishes the original battleBackgroundJobs before releasing simulation. Jobs use cooperative zero-delay checkpoints. This is workload/timing isolation, not a production UI implementation or authorization to adopt it. Fresh profiles do not clear OS file/shader caches.';const save=()=>fs.writeFile(root+'/report.json',JSON.stringify(report,null,2));");
replace("report.progress.push({phase,at:new Date().toISOString(),...p});", "report.progress.push({work:phase,at:new Date().toISOString(),freeBytes:os.freemem(),...p});");
replace("await shot(`cycle${cycle}-ready`);await page.locator('[data-action=flow-continue]:visible').click();", `await shot(\`cycle\${cycle}-ready\`);
  if(entryMode==='foreground')await page.evaluate(()=>{
   const a=A03.app,w=a.world,v=a.view;window.V01EntryJobs=v.battleBackgroundJobs.bind(v);v.battleBackgroundJobs=()=>[];
   const start=w.start;w.start=function(...args){const result=start.apply(this,args);if(result)w.paused=true;return result;};
  });
  await page.locator('[data-action=flow-continue]:visible').click();
  if(entryMode==='foreground'){
   phase=\`cycle\${cycle}-foreground-preparation\`;
   await page.waitForFunction(()=>!A03.app.readiness.state.kind&&!__SC2_REPORT__().background.busy,null,{timeout:180000});
   row.foreground=await page.evaluate(async()=>{
    const a=A03.app,w=a.world,v=a.view;if(w.tick!==0||w.time!==0||!w.paused)throw Error('Entry isolation missed native tick zero');
    const initial=D04Run.state(),started=performance.now(),before=v.completePreloadStatus(),jobs=V01EntryJobs(async cancelled=>{if(cancelled())throw Error('Entry preparation cancelled');await new Promise(resolve=>setTimeout(resolve,0));}),rows=[];
    for(const job of jobs){if(job.isReady?.())continue;const at=performance.now();await job.run();if(job.isReady&&!job.isReady())throw Error('Entry job incomplete: '+job.key);rows.push({key:job.key,ms:performance.now()-at});}
    await v.waitForPendingAssets();const final=D04Run.state();return {ms:performance.now()-started,before,after:v.completePreloadStatus(),initial,final,worldUnchanged:initial===final,tick:w.tick,time:w.time,pending:v.assetsPending,errors:v.modelErrors,models:[...v.gpu.keys()],jobs:rows};
   });
   await save();assert.equal(row.foreground.worldUnchanged,true,'Preparation changes World');assert.equal(row.foreground.after.complete,true);assert.equal(row.foreground.pending,0);assert.equal(row.foreground.errors.length,0);
   row.combatReadyMs=Date.now()-startAt;await shot(\`cycle\${cycle}-prepared\`);
   await page.evaluate(()=>{const a=A03.app;a.view.battleBackgroundJobs=V01EntryJobs;a.driver.reset();a.world.paused=false;a.hud.update();});
  }else row.combatReadyMs=Date.now()-startAt;`);
await fs.writeFile(base+'/entry-comparison.mjs',code);
const plan={authorized:'User explicitly allowed isolated comparison and will decide separately on production adoption.',baselineRunnerSha256:sha(original),comparisonRunnerSha256:sha(code),productionVariant:'r3',race:'terran',gear:0,seed:529,stages:3,cyclesPerProcess:1,trace:true,resolution:[1440,900],dpr:1,quality:'native/full/complete',runs:[['entry-staged-a1','staged'],['entry-foreground-b1','foreground'],['entry-foreground-b2','foreground'],['entry-staged-a2','staged'],['entry-staged-a3','staged'],['entry-foreground-b3','foreground']].map(([run,mode],i)=>({order:i+1,run,mode})),acceptance:{world:'Every native initial/final and 18 sampled states match within and between modes; before/after foreground preparation exactly equal with tick/time zero.',correctness:'Automatic intermission saves and archive parsing; pending/skipped battle frames zero; original reward preparation deadline holds.',performance:'Report three fresh-profile repetitions per mode, order counterbalanced, all frame thresholds and extrema retained; no result guarantees 60 FPS or dense-scene improvement.',scope:'Only timing of original startup-batch preparation in a diagnostic harness. No source, UI, quality, gameplay, archive format, Current or release edits.'}};
await fs.writeFile(base+'/entry-comparison-plan.json',JSON.stringify(plan,null,2)+'\n');console.log(JSON.stringify({runner:base+'/entry-comparison.mjs',sha256:sha(code),runs:plan.runs}));
