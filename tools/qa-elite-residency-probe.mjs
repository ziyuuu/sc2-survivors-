// Installed by CDP on the measured renderer, equally for the sealed and candidate builds.
export function observeEliteRenderer(){
 const view=this,w=view.world,seen=new Set(view.gpu.keys()),jobs=[],pending=new Map(),gaps=[],drawn=new Map();
 const stageFrames=new Map(),marauderEvents=[],targetWindows={};
 let previous=performance.now(),previousBattle;
 function frame(now){
  const battle=w.phase==='battle'&&!view.entryPreparation&&!w.paused&&!w.requiresPlayerDecision?(w.endless?'endless':w.stage):undefined;
  if(battle!==undefined&&previousBattle===battle){
   const sample=stageFrames.get(battle)??{frames:0,maxMs:0};
   sample.frames++;sample.maxMs=Math.max(sample.maxMs,now-previous);stageFrames.set(battle,sample);
   if((battle===17&&w.stageElapsed<=4)||(battle===18&&w.stageElapsed>=50&&w.stageElapsed<=54)){
    const window=targetWindows[battle]??={frames:0,maxMs:0};window.frames++;window.maxMs=Math.max(window.maxMs,now-previous);
   }
  }
  previousBattle=battle;
  gaps.push([previous,now,w.stage,w.phase,view.entryPreparation]);
  previous=now;
  for(const [key,batch] of view.gpu){
   if(!key.startsWith('elite.')||!batch.allMeshes.some(mesh=>mesh.visible&&mesh.count>0))continue;
   const stage=w.endless?'endless':w.stage;
   if(!drawn.has(stage))drawn.set(stage,new Set());
   drawn.get(stage).add(key);
  }
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 const target='elite.marauder.3';
 function trace(action){
  marauderEvents.push({action,stage:w.stage,elapsed:w.stageElapsed,phase:w.phase,required:view.retainedRequired.has(target),
   bodies:[...w.entities.values()].filter(u=>u.eliteId==='marauder.3').map(u=>({id:u.id,team:u.team,temporary:u.temporaryKind,identity:u.eliteId,armed:u.armed?.cardId,equipment:w.starship.members.get(u.id)?.origin})),
   offers:w.rewards.filter(r=>r.value==='marauder.3').map(r=>({id:r.id,sold:r.sold})),
   callers:new Error().stack?.split('\n').slice(2,7)});
 }
 const retire=view.retireOptional;
 view.retireOptional=function(key){if(key===target)trace('retire');return retire.call(this,key);};
 const refresh=w.refreshStats,identified=new WeakSet();
 w.refreshStats=function(u,...args){
  if(u.eliteId==='marauder.3'&&!identified.has(u)){identified.add(u);trace('body');}
  return refresh.call(this,u,...args);
 };
 for(const method of ['ensureUnitVariant','streamUnitVariant']){
  const original=view[method];
  view[method]=function(key,...args){
   if(!key.startsWith('elite.')||view.gpu.has(key)||pending.has(key))return original.call(this,key,...args);
   if(key===target)trace(method);
   const event={key,method,start:performance.now(),stage:w.stage,phase:w.phase,gate:view.entryPreparation,reload:seen.has(key)};
   pending.set(key,event);
   const promise=original.call(this,key,...args);
   promise.then(ok=>{event.end=performance.now();event.ok=ok;if(ok)seen.add(key);jobs.push(event);pending.delete(key);},()=>{pending.delete(key);});
   return promise;
  };
 }
 window.qaEliteOwners=()=>{
  const keys=[],owners=new Map();
  function owner(texture,key){if(!texture?.isTexture)return;const src=texture.source;if(!owners.has(src))owners.set(src,new Set());owners.get(src).add(key);}
  for(const [key,batch] of view.gpu){
   for(const mesh of batch.allMeshes)for(const material of [].concat(mesh.material))for(const val of Object.values(material))owner(val,key);
   for(const surface of batch.materialSurfaces??[]){
    for(const tex of Object.values(surface.prepared.textures))owner(tex,key);
    owner(surface.prepared.teamTexture,key);
   }
   if(!key.startsWith('elite.'))continue;
   keys.push({key,instances:batch.count,required:view.retainedRequired.has(key)||view.retainedRequired.has(key.replace(/\.death$/,'')),
    corpse:[...view.corpses.values()].some(c=>c.type===key||c.type+'.death'===key),
    usedThisStage:drawn.get(w.endless?'endless':w.stage)?.has(key)??false});
  }
  return {keys,owners};
 };
 window.qaEliteTiming=()=>{
  const timing=(begin,end,phase)=>{
   const values=gaps.filter(([a,b,,p,gate])=>b>begin&&a<end&&(!phase||p===phase&&!gate)).map(([a,b])=>b-a).sort((a,b)=>a-b);
   return {frames:values.length,p95:values[Math.max(0,Math.ceil(values.length*.95)-1)]??null,max:values.at(-1)??null,over50:values.filter(x=>x>50).length,over100:values.filter(x=>x>100).length};
  };
  return {stageFrames:Object.fromEntries(stageFrames),targetWindows,marauderEvents,jobs:jobs.map(j=>{
   const first=gaps.find(([,b,,phase,gate])=>b>=j.end&&phase==='battle'&&!gate);
   return {...j,duration:j.end-j.start,interval:timing(j.start,j.end),firstBattle:first?timing(first[0],first[0]+1000,'battle'):null};
  }),stages:[...drawn].map(([stage,keys])=>({stage,drawn:[...keys]})),ordinaryBattle:gaps.length?timing(gaps[0][0],previous,'battle'):null};
 };
}

// A separate, disposable player session. Render the installed release batches
// through their normal colour shader with a fixed camera, pose and lighting.
export async function checkElitePixels(){
 const view=this,renderer=view.renderer,gl=renderer.getContext(),result={};
 const scene=new view.scene.constructor(),camera=view.camera.clone();
 scene.background=view.scene.background?.isColor?view.scene.background.clone():null;
 scene.environment=view.scene.environment;scene.environmentIntensity=view.scene.environmentIntensity;
 for(const light of view.scene.children.filter(node=>node.isLight))scene.add(light.clone());
 const cameraPosition=camera.position;cameraPosition.set(3,2.7,4);camera.lookAt(0,.75,0);
 camera.fov=35;camera.aspect=1;camera.near=.01;camera.far=100;camera.updateProjectionMatrix();
 renderer.setRenderTarget(null);renderer.setSize(256,256,false);renderer.setPixelRatio(1);
 async function pixels(){
  renderer.render(scene,camera);
  const data=new Uint8Array(256*256*4);gl.readPixels(0,0,256,256,gl.RGBA,gl.UNSIGNED_BYTE,data);
  const sha=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(sha)].map(b=>b.toString(16).padStart(2,'0')).join('');
 }
 // All mutable render state belongs to this disposable QA session.
 view.world.paused=true;
 for(const [key,type] of [['elite.marine.2','marine'],['elite.marauder.3','marauder']]){
  if(!await view.ensureUnitVariant(key,type,true))throw Error('Missing model '+key);
  for(const suffix of ['','.death']){
   const batch=view.gpu.get(key+suffix);if(!batch)throw Error('Missing original form '+key+suffix);
   const meshes=batch.meshes;
   for(const mesh of meshes)scene.add(mesh);
   for(const [pose,time] of (suffix?[['dead',.125],['dead',.45]]:[['idle',.3],['attack',.15]])){
    renderer.setSize(256,256,false);batch.begin();batch.add(0,0,0,.25,pose,time,!!suffix);batch.end();
    const hash=await pixels();for(const mesh of meshes)mesh.visible=false;
    const empty=await pixels();if(hash===empty)throw Error('Empty pixel fixture '+key+suffix+' '+pose);
    result[[key+suffix,pose,time].join('/')]=hash;
   }
   for(const mesh of meshes)scene.remove(mesh);
  }
 }
 return result;
}
