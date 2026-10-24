import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';let code=await fs.readFile(base+'/spike-os-memory-sentinel.mjs','utf8');
function replace(before,after){assert.equal(code.split(before).length,2,'Expected one anchor: '+before.slice(0,100));code=code.replace(before,after);}
replace('timer,memoryMonitor,memoryMonitorExit;', 'timer,memoryMonitor,memoryMonitorExit,monitorPrefix;');
replace("await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase),null,{timeout:600000});", "await page.waitForFunction(()=>['ready','error'].includes(A03.app.readiness.state.phase)||A03.app.hud.flowError,null,{timeout:180000});");
replace("state:A03.app.readiness.state,assets:A03.httpAssetStatus()", "state:A03.app.readiness.state,flowError:A03.app.hud.flowError,assets:A03.httpAssetStatus()");
replace("report.pageTimeOrigin=await page.evaluate(()=>performance.timeOrigin);report.monitoredProcesses=(await bc.send('SystemInfo.getProcessInfo')).processInfo;", "report.pageTimeOrigin=await page.evaluate(()=>performance.timeOrigin);report.monitoredProcesses=(await bc.send('SystemInfo.getProcessInfo')).processInfo;row.pageTimeOrigin=report.pageTimeOrigin;row.monitoredProcesses=report.monitoredProcesses;monitorPrefix=root+'/cycle'+cycle+'-process-memory';");
for(const ext of ['jsonl','stop','ready','stdout.log','stderr.log'])code=code.replaceAll("root+'/process-memory."+ext+"'", "monitorPrefix+'."+ext+"'");
replace('report.memoryMonitorExitCode=code;resolve(code);', 'row.memoryMonitorExitCode=code;resolve(code);');
const anchor="if(stageLimit>=3&&variant!=='baseline')assert.ok(row.preloadDeadline.passed,'Complete original startup batch is not ready by the requested stage deadline');";
const addition=[
"if(memoryMonitor){await fs.writeFile(monitorPrefix+'.stop','stop');await Promise.race([memoryMonitorExit,new Promise(resolve=>setTimeout(resolve,5000))]);if(memoryMonitor.exitCode===null){memoryMonitor.kill();throw Error('Process memory observer did not stop');}assert.equal(row.memoryMonitorExitCode,0);memoryMonitor=null;}",
"if(cycle<cycles-1){",
"row.extraction=await page.evaluate(()=>{const a=A03.app,w=a.world;const before={phase:w.phase,stage:w.stage,canExtract:w.canExtractEquipment};if(w.stage!==3||!w.canExtractEquipment)throw Error('Repeat diagnostic requires the native stage-three withdrawal');const accepted=w.extractEquipment();a.hud.update();return {before,accepted,after:{phase:w.phase,ended:w.starship.account.run?.ended}};});",
"assert.equal(row.extraction.accepted,true);assert.equal(row.extraction.after.phase,'finished');assert.equal(row.extraction.after.ended,true);",
"await page.waitForFunction(()=>!A03.app.session.busy&&!A03.app.session.scheduled,null,{timeout:30000});",
"row.extraction.save=await page.evaluate(()=>({failed:A03.app.session.saveFailed,canResume:A03.app.session.canResume,report:A03.app.session.report()}));assert.equal(row.extraction.save.failed,false);assert.equal(row.extraction.save.canResume,false);",
"await fs.writeFile(root+'/cycle'+cycle+'-extracted-archive.json',await page.evaluate(()=>A03.app.session.exportJSON()));await shot('cycle'+cycle+'-extracted');",
"}"
].join('\n');
replace(anchor,anchor+'\n'+addition);
code=code.replace('Complete 60-second stages 1–3','Complete 60-second stages 1–3; native legal withdrawal and successful terminal save before each repeated new run');
await fs.writeFile(base+'/spike-repeat-r1.mjs',code,{flag:'wx'});
await fs.writeFile(base+'/spike-kernel-r3-disposition.json',JSON.stringify({status:'first-cycle-recorded-second-cycle-harness-failed',productionErrorObserved:false,firstCycle:'Three native stages and checkpoints were recorded, no frame interval exceeded 300 ms.',secondCycle:'The harness reloaded an unfinished checkpoint, then attempted a new run. RunSession.prepareNewRun correctly rejects this (src/app/run-session.ts:92). Readiness remained idle; the script failed to detect hud.flowError and kept waiting.',correction:'The earlier commentary and stop reason described a missing confirmation. The precise cause is the native unfinished-run guard, not a confirmation modal or a stalled loader.',action:'Stopped the named capture and only its diagnostic Chrome process. Kept the full failure and trace. Corrected repeat harness now withdraws at stage three, waits for terminal save, and records flow errors immediately.',scope:'No game source, save rule, UI or candidate adoption changed.'},null,2)+'\n',{flag:'wx'});
console.log('Prepared ordinary-permission repeat diagnostic with native withdrawal and per-cycle process observers; not started.');
