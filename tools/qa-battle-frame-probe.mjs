// QA-only. Bound the retained timeline to the slowest intervals of each stage.
export function observeBattleFrames(){
 const view=this,w=view.world,stages={},windows={},spans=[];
 function wrap(object,key,label){
  if(!object||typeof object[key]!=='function')return;
  const original=object[key];
  object[key]=function(...args){
   const start=performance.now();
   try{return original.apply(this,args);}
   finally{
    const end=performance.now();
    if(end-start>=1)spans.push({label,start,end});
   }
  };
 }
 wrap(view,'prepareRosterAssets','roster');wrap(view,'render','view.render');
 wrap(view.renderer,'render','three.render');wrap(w,'step','fixedStep');
 const draw=view.renderer.renderBufferDirect;
 view.renderer.renderBufferDirect=function(camera,scene,geometry,material,object,group){
  if(w.stage<15||w.stage>17)return draw.call(this,camera,scene,geometry,material,object,group);
  const start=performance.now();
  try{return draw.call(this,camera,scene,geometry,material,object,group);}
  finally{
   const end=performance.now();
   if(end-start>12){
    const parents=[];for(let node=object;node&&parents.length<6;node=node.parent)parents.push(node.name||node.type);
    const props=this.properties.get(material),prog=props.currentProgram;
    spans.push({label:'draw '+parents.join('/')+' '+material.name+' '+material.type,start,end,program:prog?.cacheKey});
   }
  }
 };
 wrap(w,'changed','world.changed');
 for(const key of ['fx','sourceCombatEffects','specialVisuals','funVisuals','contact','sceneShadows','refraction']){
  wrap(view[key],'update',key+'.update');wrap(view[key],'render',key+'.render');
 }
 let prevTime=performance.now(),prevEnd=prevTime,prevStage,prevAge=0,prior=[];
 function frame(now){
  const end=performance.now(),stage=w.phase==='battle'&&!view.entryPreparation&&!w.paused&&!w.requiresPlayerDecision?(w.endless?'endless':w.stage):undefined;
  const dt=now-prevTime;
  if(stage!==undefined&&stage===prevStage){
   const sample=stages[stage]??={count:0,over100:0,longest:[],hist:{}};
   sample.count++;if(dt>=100)sample.over100++;
   const bucket=Math.round(dt/5)*5;sample.hist[bucket]=(sample.hist[bucket]??0)+1;
   function keep(list){
    if(list.length===5&&list.at(-1).ms>=dt)return;
    list.push({ms:dt,stage,age:w.stageElapsed,prevAge,start:prevTime,stop:now,prevEnd,end,step:w.tick,
     special:w.specialStages.active?.kind,entities:w.entities.size,pending:view.assetsPending,spans:[...prior,...spans]});
    list.sort((a,b)=>b.ms-a.ms);list.splice(5);
   }
   keep(sample.longest);
   if(stage===17&&w.stageElapsed<=4)keep(windows.open17??=[]);
  }
  prevStage=stage;prevAge=w.stageElapsed;prevTime=now;prevEnd=end;prior=spans.splice(0);
  requestAnimationFrame(frame);
 }
 requestAnimationFrame(frame);
 window.qaBattleFrames=()=>({stages,windows});
}
