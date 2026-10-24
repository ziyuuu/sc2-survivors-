import fs from 'node:fs/promises';
let code=await fs.readFile('reports/local/v01-20261024/loading.mjs','utf8');
code=code.replace("const report={run,variant", "let cpuCdp;const report={run,variant");
code=code.replace("report.system=await bc.send('SystemInfo.getInfo');", "report.system=await bc.send('SystemInfo.getInfo');cpuCdp=await context.newCDPSession(page);await cpuCdp.send('Profiler.enable');await cpuCdp.send('Profiler.setSamplingInterval',{interval:1000});");
code=code.replace("await shot(`cycle${cycle}-ready`);", "await shot(`cycle${cycle}-ready`);await cpuCdp.send('Profiler.start');");
code=code.replace('row.stages.push(result);', "row.stages.push(result);const cpu=await cpuCdp.send('Profiler.stop');await fs.writeFile(root+'/cpu-stage'+stage+'.json',JSON.stringify(cpu));if(stage<stageLimit)await cpuCdp.send('Profiler.start');");
code=code.replace("Single visible page, serial measurement.", "Single visible page, serial measurement. CDP CPU sampling enabled; diagnostic trace, not a formal FPS comparison.");
await fs.writeFile('reports/local/v01-20261024/loading-profile.mjs',code);
