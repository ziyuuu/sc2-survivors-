import fs from 'node:fs/promises';
let s=await fs.readFile('tools/qa-v01-dense-shader-probe.mjs','utf8');
s=s.replace("import assert from 'node:assert/strict';","import assert from 'node:assert/strict';import {createHash} from 'node:crypto';");
const start=s.indexOf('await env.context.addInitScript'),end=s.indexOf('\ntry{\n await menu();',start);if(start<0||end<0)throw Error('Missing probe anchors');
const hook=`await env.context.addInitScript(()=>{
 const programs=new Map(),shaders=new Map(),sources=[],indices=new Map();let serial=0;
 const proto=WebGL2RenderingContext.prototype,source=proto.shaderSource,attach=proto.attachShader,link=proto.linkProgram,get=proto.getProgramParameter;
 proto.shaderSource=function(shader,text){let id=indices.get(text);if(id===undefined){id=sources.length;indices.set(text,id);sources.push(text);}shaders.set(shader,id);return source.call(this,shader,text);};
 proto.attachShader=function(program,shader){let row=programs.get(program);if(!row){row={id:++serial,sources:[],linked:0,polls:0,last:null};programs.set(program,row);}row.sources.push(shaders.get(shader));return attach.call(this,program,shader);};
 proto.linkProgram=function(program){const row=programs.get(program);if(row)row.linked=performance.now();return link.call(this,program);};
 proto.getProgramParameter=function(program,key){const value=get.call(this,program,key);if(key===0x91b1){const row=programs.get(program);if(row){row.polls++;row.last=value;row.lastAt=performance.now();}}return value;};
 globalThis.ShaderProbe={status(){return {at:performance.now(),programs:[...programs.values()].map(x=>({...x}))};},snapshot(){return {at:performance.now(),lost:document.querySelector('canvas#battle')?.getContext('webgl2')?.isContextLost(),programs:[...programs.values()].map(x=>({...x})),sources};}};
});
async function measuredRestoreWait(){
 await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase)||(__SC2_REPORT__().readiness.phase==='gpu'&&__SC2_REPORT__().readiness.total===1&&ShaderProbe.status().programs.some(p=>p.last===false&&performance.now()-p.linked>2000)),null,{timeout:240000});
 const catalog=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.snapshot()}));await fs.writeFile(root+'/shader-source-catalog.json',JSON.stringify(catalog));
 const hashes=catalog.probe.sources.map(text=>createHash('sha256').update(text).digest('hex'));
 report.shaderCatalog={state:catalog.state,at:catalog.probe.at,lost:catalog.probe.lost,sourceCount:hashes.length,programs:catalog.probe.programs.map(p=>({...p,sourceHashes:p.sources.map(id=>hashes[id])})),file:root+'/shader-source-catalog.json'};await save();
 await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:240000});
 report.restoreFirstAttempt=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.status()}));await save();
 if(report.restoreFirstAttempt.state.phase==='error'){
  await shot('restore-first-failure');await click('[data-action=flow-retry]');await page.waitForFunction(()=>['ready','error'].includes(__SC2_REPORT__().readiness.phase),null,{timeout:300000});report.restoreRetry=await page.evaluate(()=>({state:__SC2_REPORT__().readiness,probe:ShaderProbe.status()}));await save();
 }
 assert.equal((await state()).readiness.phase,'ready');
}
`;
s=s.slice(0,start)+hook+s.slice(end);
s=s.replace('Uninstrumented final production entry.','Shader source identity and native retry diagnostic; GL calls are observed without flushing or changing completion. Not uninstrumented timing acceptance.');
await fs.writeFile('tools/qa-v01-dense-shader-catalog.mjs',s,{flag:'wx'});console.log('Prepared shader source/polling identity and native error retry diagnostic.');
