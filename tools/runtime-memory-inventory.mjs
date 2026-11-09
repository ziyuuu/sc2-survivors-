/** Local browser diagnostics only. Values are allocations/CPU backing stores,
 * not physical GPU RAM. Never import this file into a production entry. */
export function installRuntimeMemoryTrace(){
 const contexts=[],original=HTMLCanvasElement.prototype.getContext;
 HTMLCanvasElement.prototype.getContext=function(...args){
  const gl=original.apply(this,args);if(!gl||!['webgl','webgl2','experimental-webgl'].includes(args[0])||contexts.some(c=>c.gl===gl))return gl;
  const row={gl,buffers:new Map(),renderbuffers:new Map(),programs:new Set(),bufferPeak:0,renderbufferPeak:0,compileCalls:0,compileCallMs:0,linkCalls:0,linkCallMs:0};contexts.push(row);
  const bound=new Map();let renderbuffer=null,vao=null;const elements=new Map();
  const wrap=(name,callback)=>{if(!gl[name])return;const fn=gl[name].bind(gl);gl[name]=function(...a){const start=(name==='compileShader'||name==='linkProgram')?performance.now():0,result=fn(...a);callback(a,result,start?performance.now()-start:0);return result;};};
  const total=map=>[...map.values()].reduce((n,r)=>n+r.bytes,0);
  wrap('createBuffer',(_,b)=>row.buffers.set(b,{bytes:0}));
  wrap('bindVertexArray',a=>vao=a[0]);wrap('deleteVertexArray',a=>elements.delete(a[0]));
  wrap('bindBuffer',a=>{if(a[0]===gl.ELEMENT_ARRAY_BUFFER)elements.set(vao,a[1]);else bound.set(a[0],a[1]);});
  wrap('bufferData',a=>{const b=a[0]===gl.ELEMENT_ARRAY_BUFFER?elements.get(vao):bound.get(a[0]),r=row.buffers.get(b);if(!r)return;const data=a[1];r.bytes=typeof data==='number'?data:data?.byteLength??0;if(ArrayBuffer.isView(data)&&a.length>3)r.bytes=(a[4]||data.length-(a[3]??0))*(data.BYTES_PER_ELEMENT??1);row.bufferPeak=Math.max(row.bufferPeak,total(row.buffers));});
  wrap('deleteBuffer',a=>row.buffers.delete(a[0]));
  wrap('createRenderbuffer',(_,b)=>row.renderbuffers.set(b,{bytes:0}));wrap('bindRenderbuffer',a=>renderbuffer=a[1]);wrap('deleteRenderbuffer',a=>row.renderbuffers.delete(a[0]));
  const storage=(a,multi)=>{const r=row.renderbuffers.get(renderbuffer);if(!r)return;const format=a[multi?2:1],w=a[multi?3:2],h=a[multi?4:3],samples=multi?Math.max(1,a[1]):1,bpp=format===gl.RGBA32F?16:format===gl.RGBA16F?8:format===gl.RGB8?3:format===gl.DEPTH_COMPONENT16?2:4;r.bytes=w*h*bpp*samples;r.width=w;r.height=h;r.format=format;r.samples=samples;row.renderbufferPeak=Math.max(row.renderbufferPeak,total(row.renderbuffers));};
  wrap('renderbufferStorage',a=>storage(a,false));wrap('renderbufferStorageMultisample',a=>storage(a,true));
  wrap('createProgram',(_,p)=>row.programs.add(p));wrap('deleteProgram',a=>row.programs.delete(a[0]));
  wrap('compileShader',(_a,_r,ms)=>{row.compileCalls++;row.compileCallMs+=ms;});wrap('linkProgram',(_a,_r,ms)=>{row.linkCalls++;row.linkCallMs+=ms;});
  this.addEventListener('webglcontextlost',()=>{row.buffers.clear();row.renderbuffers.clear();row.programs.clear();bound.clear();elements.clear();});
  return gl;
 };
 globalThis.__RUNTIME_MEMORY_TRACE__=()=>contexts.map(c=>({lost:c.gl.isContextLost(),buffers:c.buffers.size,bufferBytes:[...c.buffers.values()].reduce((n,r)=>n+r.bytes,0),bufferPeak:c.bufferPeak,renderbuffers:c.renderbuffers.size,renderbufferBytes:[...c.renderbuffers.values()].reduce((n,r)=>n+r.bytes,0),renderbufferPeak:c.renderbufferPeak,programs:c.programs.size,compileCalls:c.compileCalls,compileCallMs:c.compileCallMs,linkCalls:c.linkCalls,linkCallMs:c.linkCallMs}));
}

export function instrumentPreparation(){
 const app=globalThis.__QUALITY_APP__;if(!app)return false;
 const events=[];globalThis.__PREPARATION_TRACE__=events;
 const wrap=(object,key,prefix)=>{const fn=object?.[key];if(typeof fn!=='function')return;object[key]=async function(...args){const event={key:prefix+key+(typeof args[0]==='string'?':'+args[0]:''),start:performance.now(),programsBefore:app.view.renderer.info.programs?.length??0};events.push(event);try{return await fn.apply(this,args);}finally{event.end=performance.now();event.programsAfter=app.view.renderer.info.programs?.length??0;}};};
 for(const key of ['commonTask','compilePresentation','preloadTextures','warmPresentationBatches','prepareNewRunAssets','prepareCurrentAssets','prepareCampaignAssets'])wrap(app.view,key,'view.');
 wrap(app.readiness,'prepare','readiness.');return true;
}

export function captureRuntimeMemoryInventory(){
 const app=globalThis.__QUALITY_APP__;if(!app)return null;const v=app.view,renderer=v.renderer;
 const buffers=new Map(),images=new Map(),textures=new Set(),geometries=new Set();let visited=0;
 const record=(map,key,bytes,owner,kind)=>{let row=map.get(key);if(!row){row={bytes,owners:new Set(),kinds:new Set()};map.set(key,row);}row.owners.add(owner);row.kinds.add(kind);};
 const roots=[['scene',v.scene],['unitBatches',v.batches],['unitGpu',v.gpu],['sourceEffects',v.sourceCombatEffects?.player],['podTemplates',[v.podTemplates,v.podBirthTemplates,v.podDeathTemplates]],['buildingTemplates',[v.hiveTemplate,v.hiveDeathTemplate,v.fortTemplates,v.fortDeathTemplates,v.missionTemplates,v.missionDeathTemplates]],['heroEffects',[v.confirmedHeroes,v.zergHeroes,v.protossHeroes,v.terranEliteEffects,v.zergEliteEffects,v.protossEliteEffects]],['otherEffects',[v.fx,v.nonHeroEffects,v.eliteSupportEffects,v.funVisuals,v.specialVisuals,v.encounterVisuals]],['background',v.stageWarm]];
 const rootScene=v.scene,effectScene=v.effectScene;
 for(const [owner,root]of roots){const seen=new WeakSet();
  const visit=(value,key='root')=>{
   if(!value||typeof value!=='object'||seen.has(value))return;
   if(value===renderer||value===v||value===app.world||key!=='root'&&(value===rootScene||value===effectScene))return;
   seen.add(value);visited++;if(visited>1200000)throw Error('Inventory graph limit exceeded');
   if(ArrayBuffer.isView(value)){record(buffers,value.buffer,value.buffer.byteLength,owner,key);return;}
   if(value instanceof ArrayBuffer){record(buffers,value,value.byteLength,owner,key);return;}
   if(typeof Node!=='undefined'&&value instanceof Node){if(value instanceof HTMLImageElement)record(images,value,(value.naturalWidth||value.width)*(value.naturalHeight||value.height)*4,owner,'decodedImageEstimate');return;}
   if(typeof ImageBitmap!=='undefined'&&value instanceof ImageBitmap){record(images,value,value.width*value.height*4,owner,'decodedImageEstimate');return;}
   if(value.isTexture){textures.add(value);visit(value.source,'textureSource');for(const mip of value.mipmaps??[])visit(mip,'compressedMip');return;}
   if(value.isBufferGeometry)geometries.add(value);
   if(value instanceof Map){for(const [k,item]of value){visit(k,'mapKey');visit(item,key);}return;}
   if(value instanceof Set){for(const item of value)visit(item,key);return;}
   for(const [name,item]of Object.entries(value)){if(['parent','domElement','canvas','manager','renderer','camera','world','fx','_listeners','loadingManager'].includes(name))continue;visit(item,key==='compressedMip'?key:name);}
  };visit(root);
 }
 const summarize=map=>({uniqueCount:map.size,uniqueBytes:[...map.values()].reduce((n,r)=>n+r.bytes,0),byOwners:Object.entries([...map.values()].reduce((rows,r)=>{const key=[...r.owners].sort().join('+');rows[key]=(rows[key]??0)+r.bytes;return rows;},{})).sort((a,b)=>b[1]-a[1]),largest:[...map.values()].sort((a,b)=>b.bytes-a.bytes).slice(0,20).map(r=>({bytes:r.bytes,owners:[...r.owners],kinds:[...r.kinds]}))});
 const targets=[],addTarget=(name,rt)=>{if(!rt)return;const p=renderer.properties.get(rt),tp=renderer.properties.get(rt.texture),depth=rt.depthTexture&&renderer.properties.get(rt.depthTexture);targets.push({name,width:rt.width,height:rt.height,textureType:rt.texture.type,depthBuffer:rt.depthBuffer,textureAllocated:!!tp.__webglTexture,framebufferAllocated:!!p.__webglFramebuffer,depthTextureAllocated:!!depth?.__webglTexture});};
 addTarget('contact.depth',v.contact?.depthTarget);addTarget('contact.ambient',v.contact?.target);addTarget('refraction',v.refraction?.field);addTarget('composer.read',v.heroComposer?.readBuffer);addTarget('composer.write',v.heroComposer?.writeBuffer);
 for(const pass of v.heroComposer?.passes??[]){if(!pass.renderTargetBright)continue;addTarget('bloom.bright',pass.renderTargetBright);pass.renderTargetsHorizontal.forEach((t,i)=>addTarget('bloom.horizontal.'+i,t));pass.renderTargetsVertical.forEach((t,i)=>addTarget('bloom.vertical.'+i,t));}
 return {note:'CPU buffer backings deduplicated by identity, grouped by all reachable owners; image values are decoded RGBA estimates. Private WeakMap/Promise holdings and driver overhead are not fully enumerable. Do not sum with process memory or GL estimates.',visited,cpuBuffers:summarize(buffers),decodedImages:summarize(images),textureWrappers:textures.size,geometries:geometries.size,models:[...v.gpu.keys()],effectModels:[...(v.sourceCombatEffects?.player?.resources?.keys()??[])],effects:v.sourceCombatEffects?.report(),targets,glAux:globalThis.__RUNTIME_MEMORY_TRACE__?.(),programs:renderer.info.programs?.length,trace:globalThis.__PREPARATION_TRACE__??[]};
}
