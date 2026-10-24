import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const base='reports/local/v01-20261024';let code=await fs.readFile(base+'/entry-comparison.mjs','utf8');
function replace(from,to){assert.ok(code.includes(from),from);code=code.replace(from,to);}
replace("report.entryMode=entryMode;", "report.comparison='Production per-stage preparation, optional work capped by remaining 5000 ms entrance budget; original required readiness unchanged.';report.entryMode=entryMode;");
replace("  },{gear,cycle,trace,race});", `
   window.V01StageEntries=[];let preparing=null;
   const prepare=a.readiness.prepare.bind(a.readiness),onReady=a.readiness.onReady;
   a.readiness.onReady=function(...args){if(preparing){preparing.beforeReady=D04Run.state();preparing.readyAt=performance.now();preparing.background=__SC2_REPORT__().background;preparing.worldUnchanged=preparing.before===preparing.beforeReady;}return onReady.apply(this,args);};
   a.readiness.prepare=async function(kind,request){
    if(kind!=='reinforcement'||w.phase!=='reward')return prepare(kind,request);
    const item={kind,request,before:D04Run.state(),stage:w.stage,began:performance.now()};preparing=item;V01StageEntries.push(item);
    try{return await prepare(kind,request);}finally{item.ended=performance.now();item.elapsedMs=item.ended-item.began;item.readyMs=item.readyAt-item.began;item.state=a.readiness.state;preparing=null;}
   };
  },{gear,cycle,trace,race});`);
replace("row.longTasks=await page.evaluate(()=>D04Frames.longTasks);", `row.stageEntries=await page.evaluate(()=>V01StageEntries);for(const e of row.stageEntries){assert.equal(e.worldUnchanged,true,'Preparation changed World');if(variant.startsWith('stage-window'))assert.ok(e.background.stageWindow.elapsedMs<=5000.5,'Optional stage window exceeded 5 seconds');}
  row.ground=await page.evaluate(async()=>{const root=A03.app.view.scene.getObjectByName('endless-traversable-ground');if(!root)return null;const sha=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',value))).map(n=>n.toString(16).padStart(2,'0')).join('');const shader={uniforms:{},fragmentShader:'#include <common>\\n#include <map_fragment>\\n#include <normal_fragment_maps>\\n#include <roughnessmap_fragment>\\n#include <metalnessmap_fragment>\\n#include <emissivemap_fragment>'};root.material.onBeforeCompile(shader,A03.app.view.renderer);return {weights:await sha(shader.uniforms.visualField.value.image.data),detail:await sha(shader.uniforms.visualDetail.value.image.data),position:await sha(root.geometry.attributes.position.array),normal:await sha(root.geometry.attributes.normal.array),uv:await sha(root.geometry.attributes.uv.array),shader:await sha(new TextEncoder().encode(shader.fragmentShader))};});
  row.longTasks=await page.evaluate(()=>D04Frames.longTasks);`);
replace("report.scope+=' Isolated entry comparison:","report.historicalHarnessNote=' Isolated entry comparison:");
await fs.writeFile(base+'/stage-comparison.mjs',code,{flag:'wx'});console.log('Prepared frozen paired runner with per-stage time, native state and ground hashes.');
