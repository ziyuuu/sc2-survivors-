/** Screen resolution alone adapts. Units, clocks and required effect layers are
 * untouched. Delayed GPU results keep CPU-bound frames from driving resolution. */
export class AdaptiveResolution {
 readonly scales=[1,.9,.8,.75] as const;private level=0;private average=0;private last=0;private hotSince=0;private coolSince=0;private settledAt=0;
 samples=0;changes=0;get scale(){return this.scales[this.level];}
 reset(){this.level=0;this.average=0;this.last=0;this.hotSince=0;this.coolSince=0;this.settledAt=0;this.samples=0;this.changes=0;}
 suspend(){this.average=0;this.last=0;this.hotSince=0;this.coolSince=0;this.samples=0;}
 sample(gpuMs:number,now:number){
  if(!Number.isFinite(gpuMs)||gpuMs<=0||gpuMs>2000)return false;
  if(this.last&&now-this.last>1500)this.suspend();this.last=now;this.samples++;
  this.average=this.average?this.average*.85+gpuMs*.15:gpuMs;
  if(this.samples<12||now-this.settledAt<2000)return false;
  if(this.average>18){this.coolSince=0;this.hotSince||=now;if(now-this.hotSince>=1500&&this.level<this.scales.length-1){this.level++;this.changed(now);return true;}}
  else if(this.average<11.5){this.hotSince=0;this.coolSince||=now;if(now-this.coolSince>=8000&&this.level>0){this.level--;this.changed(now);return true;}}
  else {this.hotSince=0;this.coolSince=0;}return false;
 }
 private changed(now:number){this.changes++;this.settledAt=now;this.hotSince=0;this.coolSince=0;this.average=0;this.samples=0;}
 report(){return {scale:this.scale,gpuMs:this.average,samples:this.samples,changes:this.changes,minScale:.75,maxScale:1};}
}
type TimerExtension={TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number};
export class AdaptiveGpuTimer {
 private extension:TimerExtension|null;private pending:WebGLQuery[]=[];private active:WebGLQuery|null=null;
 constructor(private gl:WebGL2RenderingContext){this.extension=gl.getExtension('EXT_disjoint_timer_query_webgl2');}
 get supported(){return !!this.extension;}
 begin(onSample:(ms:number)=>void,onDisjoint:()=>void){
  const gl=this.gl,ext=this.extension;if(!ext||gl.isContextLost())return;
  if(gl.getParameter(ext.GPU_DISJOINT_EXT)){this.clear();onDisjoint();return;}
  // Read in submission order and never wait synchronously for a GPU result.
  while(this.pending.length&&gl.getQueryParameter(this.pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=this.pending.shift()!;onSample(gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6);gl.deleteQuery(q);}
  if(this.pending.length>=8||gl.getQuery(ext.TIME_ELAPSED_EXT,gl.CURRENT_QUERY))return;
  this.active=gl.createQuery();if(this.active)gl.beginQuery(ext.TIME_ELAPSED_EXT,this.active);
 }
 end(){if(this.active){this.gl.endQuery(this.extension!.TIME_ELAPSED_EXT);this.pending.push(this.active);this.active=null;}}
 clear(){if(this.active&&!this.gl.isContextLost()){this.gl.endQuery(this.extension!.TIME_ELAPSED_EXT);this.gl.deleteQuery(this.active);}this.active=null;for(const q of this.pending)this.gl.deleteQuery(q);this.pending.length=0;}
 restore(){this.clear();this.extension=this.gl.getExtension('EXT_disjoint_timer_query_webgl2');}
}
