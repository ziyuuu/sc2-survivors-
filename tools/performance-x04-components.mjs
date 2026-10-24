import assert from 'node:assert/strict';import path from 'node:path';
export async function measureX04Steady(page){
 if(!await page.evaluate(()=>!!window.__X04Old))await page.addScriptTag({path:path.resolve('reports/local/performance-x04-20261020/old-pod.js')});
 return page.evaluate(()=>{const a=window.__B02__,s=a.view.sourceCombatEffects,render=s.render,current=s.request,old=window.__X04Old.OldRequest.prototype.request;let args;
  s.render=function(...values){args=values;return render.apply(this,values);};try{a.view.render(0,1);}finally{s.render=render;}const state=a.snapshot(),rounds=[];
  const capture=()=>{const r=s.player.report();delete r.activeRequests;delete r.particleCache;return r;};
  try{s.request=old;render.apply(s,args);const before=capture();s.request=current;render.apply(s,args);const after=capture();if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Active source submissions changed');
   for(let i=0;i<12;i++){const row={round:i};for(const mode of i%2?['new','old']:['old','new']){s.request=mode==='old'?old:current;const start=performance.now();for(let n=0;n<4;n++)render.apply(s,args);row[mode]=(performance.now()-start)/4;}rounds.push(row);}if(a.snapshot()!==state)throw Error('Steady source comparison mutated World');return {rounds,sourceExact:true,stateExact:true,method:'Same-page actual source render arguments, alternating old/new request method; CPU only, no GPU draw or whole-frame claim.'};
  }finally{s.request=current;}
 });
}
export async function measureX04Components(page,shot,races=['terran','protoss','zerg']){
 if(!await page.evaluate(()=>!!window.__X04Old))await page.addScriptTag({path:path.resolve('reports/local/performance-x04-20261020/old-pod.js')});
 const result={pods:[],hives:[],visual:[],disposal:[],repeatedClockProbe:[]};
 for(const race of races){
  await page.evaluate(async race=>{await window.__B03__.reset('x04-'+race,{race,theme:'char',stage:18});},race);
  const timing=await page.evaluate(race=>{
   const {view:v}=window.__B02__,{THREE,PodView}=window.__X04Cold,Old=window.__X04Old.PodView,rounds=[];const template=v.podTemplates.get(race),birth=v.podBirthTemplates.get(race),death=v.podDeathTemplates.get(race);
   const snapshot=pod=>({height:pod.bodyHeight,outline:pod.bodyOutline.map(p=>p.toArray()),children:pod.root.children.map(n=>({position:n.position.toArray(),scale:n.scale.toArray()}))});
   const fresh={...template},prepareStart=performance.now();PodView.prepare(fresh,race,birth,death);const coldPrepareMs=performance.now()-prepareStart,repeatStart=performance.now();PodView.prepare(fresh,race,birth,death);const repeatPrepareMs=performance.now()-repeatStart;
   const x=new Old(template,new THREE.Scene(),race,birth,death),y=new PodView(template,new THREE.Scene(),race,birth,death),before=snapshot(x),after=snapshot(y);x.dispose();y.dispose();
   for(let i=0;i<12;i++){const row={round:i};for(const mode of i%2?['new','old']:['old','new']){const Klass=mode==='old'?Old:PodView,start=performance.now();const p=new Klass(template,new THREE.Scene(),race,birth,death);row[mode]=performance.now()-start;p.dispose();}rounds.push(row);}
   const frames=[],pod={x:0,z:0,status:'active',createdAt:0,landedAt:0,resolvedAt:null};
   for(let i=0;i<8;i++){const row={round:i};for(const mode of i%2?['new','old']:['old','new']){const Klass=mode==='old'?Old:PodView,start=performance.now(),p=new Klass(template,v.scene,race,birth,death),created=performance.now();p.update(pod,1,true,v.ground(pod));v.render(0,1);row[mode]={createMs:created-start,totalCpuMs:performance.now()-start};p.dispose();}frames.push(row);}
   return {race,before,after,rounds,frames,preparation:{coldPrepareMs,repeatPrepareMs,outlineVertices:after.outline.length,referenceTransforms:after.children.length}};
  },race);assert.deepEqual(timing.before,timing.after);result.pods.push(timing);
  await page.evaluate(race=>{const {world:w,view:v}=window.__B02__,{PodView}=window.__X04Cold;w.entities.clear();w.time=10;w.tick=600;w.visualEvents=[];w.effects=[];const p=w.spawnPod(w.expedition.familySlots[0],{x:0,z:0});w.pods=[];const args=[v.podTemplates.get(race),v.scene,race,v.podBirthTemplates.get(race),v.podDeathTemplates.get(race)];window.__X04PodPair={p,old:new window.__X04Old.PodView(...args),new:new PodView(...args)};},race);
  if(race==='terran'){const probe=await page.evaluate(()=>{const pair=window.__X04PodPair,{view:v}=window.__B02__,{PodView}=window.__X04Cold,p=pair.p;p.status='falling';p.createdAt=6;p.landedAt=12;p.resolvedAt=9.7;const steps=[];for(let i=0;i<2;i++){const row={iteration:i};for(const mode of ['old','new']){const pod=pair[mode];pod.update(p,10,true,v.ground(p));row[mode]=pod.mixer._actions.map(a=>({clip:a.getClip().name,time:a.time,paused:a.paused}));}steps.push(row);}pair.old.dispose();pair.new.dispose();const args=[v.podTemplates.get('terran'),v.scene,'terran',v.podBirthTemplates.get('terran'),v.podDeathTemplates.get('terran')];pair.old=new window.__X04Old.PodView(...args);pair.new=new PodView(...args);return steps;});for(const step of probe)assert.deepEqual(step.old,step.new);result.repeatedClockProbe.push({race,steps:probe});}
  for(const phase of ['falling','active','opening','destroyed']){
   await page.evaluate(phase=>{const {view:v}=window.__B02__,pair=window.__X04PodPair,p=pair.p;p.status=phase;p.createdAt=6;p.landedAt=12;p.resolvedAt=9.7;pair.old.update(p,10,true,v.ground(p));pair.new.update(p,10,true,v.ground(p));},phase);
   for(const mode of ['old','new']){
    await page.evaluate(mode=>{const {view:v}=window.__B02__,pair=window.__X04PodPair;pair.old.root.visible=mode==='old';pair.new.root.visible=mode==='new';v.render(0,1);},mode);
    await shot('pod-'+race+'-'+phase+'-'+mode);
   }
   result.visual.push({race,phase});
  }
  const disposal=await page.evaluate(()=>{const {view:v}=window.__B02__,sources=new Set();for(const g of [...v.podTemplates.values(),...v.podBirthTemplates.values(),...v.podDeathTemplates.values()])g.scene.traverse(n=>{if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])for(const value of Object.values(m))if(value?.isTexture)sources.add(value);});const rows=[];for(const mode of ['old','new']){const p=window.__X04PodPair[mode],owned=new Set();p.root.traverse(n=>{if(n.skeleton?.boneTexture)owned.add(n.skeleton.boneTexture);if(n.isMesh)for(const m of Array.isArray(n.material)?n.material:[n.material])for(const value of Object.values(m))if(value?.isTexture&&!sources.has(value))owned.add(value);});const row={mode,ownedTextures:owned.size,disposedTextures:0};for(const texture of owned)texture.addEventListener('dispose',()=>row.disposedTextures++);p.dispose();rows.push(row);}delete window.__X04PodPair;return rows;});for(const row of disposal)assert.equal(row.disposedTextures,row.ownedTextures);result.disposal.push({race,rows:disposal});
 }
 result.hives=await page.evaluate(()=>{
  const {view:v}=window.__B02__,{THREE}=window.__X04Cold,old=window.__X04Old.OldHive.prototype.playHiveDeath,rows=[];
  const pose=root=>{root.updateMatrixWorld(true);const meshes=[];root.traverse(n=>{if(n.isMesh)meshes.push({matrix:n.matrixWorld.toArray(),bones:n.skeleton?.bones.map(b=>b.matrixWorld.toArray())});});return meshes;};
  for(const width of [6,4.8])for(let i=0;i<12;i++){const row={width,round:i};for(const mode of i%2?['new','old']:['old','new']){const id=900000+i,start=performance.now();(mode==='old'?old:v.playHiveDeath).call(v,id,new THREE.Vector3(0,0,0),width);row[mode]=performance.now()-start;row[mode+'Pose']=pose(v.hiveDeaths.get(id).root);v.removeHiveDeath(id);}rows.push(row);}return rows;
 });for(const row of result.hives)assert.deepEqual(row.oldPose,row.newPose);return result;
}
