import type {boot} from '../src/app/bootstrap';
import {installPerformanceS07} from './performance-s07-runtime';
import {chooseCampaignMap} from '../src/data/campaign-map';
/** Diagnostic GPU markers; never imported by the ordinary game entry. */
export function installPerformanceR01(app:Awaited<ReturnType<typeof boot>>){
 installPerformanceS07(app);const a=(window as any).__B02__,b=(window as any).__B03__,v:any=app.view,w=app.world,renderer=v.renderer,gl=renderer.getContext() as WebGL2RenderingContext,ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
 const frame=()=>new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));let selected='',context='',pending:any[]=[],values:any[]=[],frameNumber=0,disjoint=0,querying=false,draws:any[]=[];
 const span=(label:string,run:()=>any)=>{
  if(selected!==label)return run();if(querying)throw Error('Nested GPU query '+label);if(!ext)throw Error('GPU timer unavailable');
  const q=gl.createQuery()!;querying=true;gl.beginQuery(ext.TIME_ELAPSED_EXT,q);
  try{return run();}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);querying=false;pending.push({q,label,frame:frameNumber});}
 };
 const wrap=(obj:any,key:string,label:string,ctx=label)=>{const native=obj[key];obj[key]=function(...args:any[]){const before=context;context=ctx;try{return span(label,()=>native.apply(this,args));}finally{context=before;}};};
 wrap(v.contact,'render','contact');wrap(v.contact.quad,'render','contact-ao','contact-ao');
 const nativeRender=renderer.render;renderer.render=function(...args:any[]){return context==='contact'?span('contact-depth',()=>nativeRender.apply(this,args)):nativeRender.apply(this,args);};
 const shadow=renderer.shadowMap.render;renderer.shadowMap.render=function(...args:any[]){if(context!=='beauty')return shadow.apply(this,args);const before=context;context='shadow';try{return span('shadow',()=>shadow.apply(this,args));}finally{context=before;}};
 for(const [i,label]of ['beauty','refraction','bloom','output'].entries())wrap(v.heroComposer.passes[i],'render',label);
 const direct=renderer.renderBufferDirect;renderer.renderBufferDirect=function(...args:any[]){
  const material=args[3],object=args[4];if(selected&&frameNumber===0)draws.push({frame:frameNumber,context,name:object.name,material:material.name,transparent:material.transparent,count:object.count??1});
  if(context==='beauty'&&(selected==='opaque'||selected==='transparent'))return span(material.transparent?'transparent':'opaque',()=>direct.apply(this,args));
  return context==='beauty'&&material.name.startsWith('original-ground:')?span('ground',()=>direct.apply(this,args)):direct.apply(this,args);
 };
 const poll=()=>{if(!ext)return;if(gl.getParameter(ext.GPU_DISJOINT_EXT)){disjoint++;for(const p of pending)gl.deleteQuery(p.q);pending=[];return;}
  pending=pending.filter(p=>{if(!gl.getQueryParameter(p.q,gl.QUERY_RESULT_AVAILABLE))return true;values.push({label:p.label,frame:p.frame,ms:gl.getQueryParameter(p.q,gl.QUERY_RESULT)/1e6});gl.deleteQuery(p.q);return false;});
 };
 const settle=()=>{v.cameraController.update({x:w.anchor.x,y:v.ground(w.anchor),z:w.anchor.z},100,false);v.render(0,1);app.hud.update();};
 const setup=async(name:string,theme='char',ticks=120)=>{
  a.freeze();await v.prepareCampaignAssets({...chooseCampaignMap(529),theme});await b.reset('r01-'+name,{theme});
  if(name==='quiet'){w.entities.clear();w.hash.rebuild(w.entities.values());}
  else if(name==='dense')await (window as any).__S07__.setup('dense');
  else{w.resetRun();w.configureCampaign({...chooseCampaignMap(529),theme:theme as any});await a.fixtures.setup(name);}
  const id=w.runId;w.runId='00000000-0000-4000-8000-000000000529';if(w.starship.account.run)w.starship.account.run.id=w.runId;
  if(w.expedition.support.stageReceipt?.startsWith(id+':'))w.expedition.support.stageReceipt=w.runId+w.expedition.support.stageReceipt.slice(id!.length);
  await a.prepare();if(name!=='quiet'&&ticks)await a.fast({ticks,renderEvery:30});settle();
  return {name,theme,ticks,...a.checkpoint()};
 };
 const measure=async(stage:string,frames=24,warmup=8)=>{
  if(!ext)throw Error('GPU timer unavailable');a.freeze();const snapshot=a.snapshot();settle();const native=v.render;v.render=()=>{};
  pending=[];values=[];draws=[];disjoint=0;const cpu:number[]=[];let out:any;
  try{
   selected='';for(let i=0;i<warmup;i++){native.call(v,0,1);await frame();}
   selected=stage;for(frameNumber=0;frameNumber<frames;frameNumber++){const at=performance.now();span('total',()=>native.call(v,0,1));cpu.push(performance.now()-at);gl.flush();await frame();poll();}
   selected='';const deadline=performance.now()+10000;while(pending.length&&performance.now()<deadline){await frame();poll();}
   const sums=Array.from({length:frames},(_,i)=>values.filter(x=>x.frame===i).reduce((n,x)=>n+x.ms,0));out={stage,frames,warmup,values,gpuMs:sums,cpuMs:cpu,disjoint,pending:pending.length,draws,checkpoint:a.checkpoint(),snapshotExact:snapshot===a.snapshot()};
  }finally{selected='';for(const p of pending)gl.deleteQuery(p.q);pending=[];v.render=native;}
  if(!out.snapshotExact||out.pending||out.disjoint)throw Error('Invalid GPU measurement: '+JSON.stringify({snapshotExact:out.snapshotExact,pending:out.pending,disjoint:out.disjoint}));return out;
 };
 (window as any).__R01__={setup,measure,settle};
}
