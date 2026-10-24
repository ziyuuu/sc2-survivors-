import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
let code=await fs.readFile('tools/qa-v01-dense-current.mjs','utf8');
const before="setPhase('cpu-diagnostic-only');await cdp.send('Profiler.enable');";
assert.equal(code.split(before).length,2);
code=code.replace(before,`setPhase('cpu-diagnostic-only');await page.evaluate(()=>{
 const v=A03.app.view,w=A03.app.world,player=v.sourceCombatEffects.player,play=player.play,render=v.render;let capture=null,next=120;window.V01RequestFrames=[];
 player.play=function(request,ground,particlesOnly){if(capture)capture.requests.push({request:structuredClone(request),particlesOnly:!!particlesOnly});return play.call(this,request,ground,particlesOnly);};
 v.render=function(...args){if(window.V01TargetTicks===600&&w.tick>=next&&next<=600)capture={tick:w.tick,time:w.time,requests:[]};const result=render.apply(this,args);if(capture){capture.camera={position:v.camera.position.toArray(),quaternion:v.camera.quaternion.toArray(),matrixWorld:v.camera.matrixWorld.toArray()};capture.source=player.report();window.V01RequestFrames.push(capture);capture=null;next+=120;}return result;};
 });await cdp.send('Profiler.enable');`);
code=code.replace("await fs.writeFile(root+'/cpu-dense.json',JSON.stringify(cpu));", "await fs.writeFile(root+'/cpu-dense.json',JSON.stringify(cpu));await fs.writeFile(root+'/current-request-frames.json',JSON.stringify(await page.evaluate(()=>V01RequestFrames)));report.requestCapture={file:'current-request-frames.json',scope:'Five sparse frame request/counter samples in the separate CPU diagnostic only; adds capture overhead, never included in unprofiled measurements.'};");
await fs.writeFile('tools/qa-v01-dense-capture.mjs',code,{flag:'wx'});
