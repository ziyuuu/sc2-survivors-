import fs from 'node:fs/promises';
let s=await fs.readFile('tools/qa-v01-dense-baseline-restore.mjs','utf8');
s=s.replace(",env=await browserRun",",variant=process.argv[4]??'dense-final-r1',env=await browserRun").replace("{variant:'stage-window-final-r1',","{variant,");
const hook=`
await env.context.addInitScript(()=>{
 const map=new Map();let serial=0;
 const originalLink=WebGL2RenderingContext.prototype.linkProgram,originalGet=WebGL2RenderingContext.prototype.getProgramParameter;
 WebGL2RenderingContext.prototype.linkProgram=function(program){let row=map.get(program);if(!row){row={id:++serial,linked:performance.now(),polls:0,falsePolls:0,truePolls:0,last:null};map.set(program,row);}row.linked=performance.now();return originalLink.call(this,program);};
 WebGL2RenderingContext.prototype.getProgramParameter=function(program,key){const result=originalGet.call(this,program,key);if(key===0x91b1){const row=map.get(program);if(row){row.polls++;row.last=result;row.lastAt=performance.now();if(result)row.truePolls++;else row.falsePolls++;}}return result;};
 globalThis.ShaderProbe={snapshot(){const g=document.querySelector('canvas#battle')?.getContext('webgl2');return {at:performance.now(),lost:g?.isContextLost(),programs:[...map.values()].map(x=>({...x}))};}};
});
async function measuredRestoreWait(){
 await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase)||ShaderProbe.snapshot().programs.some(p=>p.last===false&&performance.now()-p.linked>15000),null,{timeout:240000});
 const before=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.snapshot()}));report.shaderProbe={before,intervention:'None'};await save();
 if(!['ready','error'].includes(before.state.phase)){
  report.shaderProbe.intervention='One gl.flush() after at least 15 seconds of false asynchronous completion polls. Diagnostic only; no production change or formal acceptance.';
  await page.evaluate(()=>document.querySelector('canvas#battle').getContext('webgl2').flush());
  await page.waitForFunction(()=>!ShaderProbe.snapshot().programs.some(p=>p.last===false&&performance.now()-p.linked>15000),null,{timeout:5000}).catch(()=>{});
  report.shaderProbe.after=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.snapshot()}));await save();
 }
 await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:240000});report.shaderProbe.final=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.snapshot()}));await save();assert.equal((await state()).readiness.phase,'ready');
}
`;
s=s.replace('try{\n await menu();',hook+'\ntry{\n await menu();');
const wait="await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:240000});assert.equal((await state()).readiness.phase,'ready');";
if(!s.includes(wait))throw Error('Missing reload wait');s=s.replace(wait,'await measuredRestoreWait();');
await fs.writeFile('tools/qa-v01-dense-shader-probe.mjs',s,{flag:'wx'});console.log('Prepared isolated shader polling/one-flush probe; not executed.');
