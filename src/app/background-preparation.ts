import {waitForAsset,PREPARATION_WAIT_TIMEOUT} from '../assets/preparation-wait';
export type PreparationJob={key:string;run:()=>Promise<unknown>;isReady?:()=>boolean;priority?:boolean;paced?:boolean};
type Clock=()=>number;
/** One optional task at a time. Required entrances drain that task and own the
 * same lane, including after cancellation, so old scene work cannot race a retry. */
export class BackgroundPreparation{
 private jobs:PreparationJob[]=[];private completed=new Set<string>();private failed=new Set<string>();
 private stageJobs=new Map<string,PreparationJob>();
 private window:{deadline:number;workUntil:number}|null=null;
 private lastWindow:{budgetMs:number;elapsedMs:number;completed:number;remaining:number;failed:number;reason:'ready'|'budget'|'cancelled'|'failed'}|null=null;
 private active:Promise<void>|null=null;private held=0;private required=Promise.resolve();
 private lastInput=-Infinity;private frameCost=0;private opened=false;private deadline=Infinity;
 private frameSerial=0;private sliceFrame=-1;private sliceStarted=0;
 private frameWaiters=new Set<()=>void>();
 readonly events:{key:string;start:number;end:number;ok:boolean}[]=[];
 constructor(private now:Clock=()=>performance.now(),private visible=()=>!document.hidden){}
 select(jobs:PreparationJob[]){for(const [key,job]of this.stageJobs)if(job.isReady?.()||!job.isReady&&this.completed.has(key))this.stageJobs.delete(key);this.jobs=[...new Map([...jobs,...this.stageJobs.values()].map(job=>[job.key,job])).values()];for(const job of this.jobs)if(job.isReady){if(job.isReady())this.completed.add(job.key);else this.completed.delete(job.key);}}
 input(){this.lastInput=this.now();}
 frame(milliseconds:number){this.frameCost=milliseconds;this.frameSerial++;for(const wake of this.frameWaiters)wake();}
 /** A live preparation slice starts only after yielding a display frame. Required
  * gates drain the same lane without waiting for input/slow-frame quietness. */
 async checkpoint(cancelled:()=>boolean=()=>false,priority=false,paced=false){
  for(;;){
   if(cancelled())throw Error('后台资源准备已取消');
   if(this.window){
    // Every preparation slice yields the event loop. The deadline can release
    // the entrance while an asynchronous compile/upload remains in flight.
    await new Promise<void>(resolve=>setTimeout(resolve,0));
    if(cancelled())throw Error('后台资源准备已取消');
    if(this.window&&this.now()<this.window.workUntil)return;
    if(this.window)continue;
   }
   if(paced&&this.visible()){
    // Several cheap texture/program checks can share a small post-render CPU
    // budget. A mandatory delay per check makes large original models take many
    // stages even when each individual operation costs only microseconds.
    if(this.sliceFrame!==this.frameSerial){this.sliceFrame=this.frameSerial;this.sliceStarted=this.now();}
    const budget=this.frameCost>32?1.5:3;
    if(this.held||this.now()-this.sliceStarted<budget)return;
   }
   await new Promise<void>(resolve=>{if(!paced){setTimeout(resolve,16);return;}const wake=()=>{clearTimeout(timer);this.frameWaiters.delete(wake);resolve();},timer=setTimeout(wake,16);this.frameWaiters.add(wake);});
   if(cancelled())throw Error('后台资源准备已取消');
   const urgent=this.jobs.some(job=>job.priority&&!this.completed.has(job.key)&&!this.failed.has(job.key));
   // Drain the one older file job when a chosen reward is queued. Otherwise a
   // held movement key could keep that file in front of the priority job forever.
   if(paced){if(this.held)return;continue;}
   if(this.held||this.visible()&&(priority||urgent||this.now()-this.lastInput>=250)&&(!this.opened||this.frameCost<=24))return;
  }
 }
 get pending(){return this.jobs.filter(j=>!this.completed.has(j.key)&&!this.failed.has(j.key)).length;}
 get busy(){return this.active!==null;}
 report(){return {pending:this.pending,busy:this.busy,held:this.held,completed:this.completed.size,failed:[...this.failed],opened:this.opened,stageWindow:this.lastWindow,events:this.events.slice(-120)};}
 tick(){
  if(this.active||this.held||!this.visible()||this.now()>=this.deadline)return;
  const pending=this.jobs.filter(j=>!this.completed.has(j.key)&&!this.failed.has(j.key));
  const job=pending.find(j=>j.priority)??pending[0];if(!job)return;
  if(this.opened&&this.frameCost>24&&!job.paced)return;
  if(!job.paced&&!job.priority&&this.now()-this.lastInput<250)return;
  this.start(job);
 }
 private start(job:PreparationJob){const start=this.now();
  this.active=Promise.resolve().then(job.run).then(()=>{if(job.isReady&&!job.isReady())throw Error('资源准备未完成');}).then(()=>{this.completed.add(job.key);this.events.push({key:job.key,start,end:this.now(),ok:true});},()=>{this.failed.add(job.key);this.events.push({key:job.key,start,end:this.now(),ok:false});}).finally(()=>{if(this.events.length>240)this.events.splice(0,this.events.length-240);this.active=null;});
 }
 /** Called by the required entrance after its mandatory work. Unfinished jobs
  * keep their detached state and continue on this same lane after release. */
 async prepareStage(jobs:PreparationJob[],budgetMs:number,signal?:AbortSignal){
  if(!this.held||this.window)throw Error('关间准备必须独占资源通道');
  jobs=[...new Map(jobs.map(job=>[job.key,job])).values()];
  const budget=Number.isFinite(budgetMs)?Math.max(0,Math.min(5000,budgetMs)):0,began=this.now(),keys=new Set(jobs.map(job=>job.key));
  const ready=(job:PreparationJob)=>job.isReady?job.isReady():this.completed.has(job.key);
  for(const job of jobs){if(!ready(job)){this.stageJobs.set(job.key,job);this.completed.delete(job.key);this.failed.delete(job.key);}}
  this.select(this.jobs);
  const remaining=()=>jobs.filter(job=>!ready(job));
  const window=this.window={deadline:began+budget,workUntil:began+Math.max(0,budget-Math.min(150,budget*.1))};
  let timer:ReturnType<typeof setTimeout>|undefined,wake:()=>void=()=>{};
  const aborted=new Promise<void>(resolve=>{wake=resolve;signal?.addEventListener('abort',wake,{once:true});});
  try{
   if(budget>0&&!signal?.aborted){const expired=new Promise<void>(resolve=>{timer=setTimeout(resolve,budget);});
    const work=async()=>{while(this.window===window&&this.now()<window.workUntil&&!signal?.aborted){const pending=remaining().filter(job=>!this.failed.has(job.key));if(!pending.length)return;if(!this.active){const job=pending.find(j=>j.priority)??pending[0];this.start(job);}await Promise.race([this.active!,new Promise<void>(resolve=>setTimeout(resolve,8))]);}};
    await Promise.race([work(),expired,aborted]);
   }
  }finally{if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',wake);this.window=null;
   const left=remaining().length,failed=remaining().filter(job=>this.failed.has(job.key)).length;this.lastWindow={budgetMs:budget,elapsedMs:this.now()-began,completed:jobs.length-left,remaining:left,failed,reason:signal?.aborted?'cancelled':failed===left&&failed?'failed':left?'budget':'ready'};
   for(const key of keys)if(this.completed.has(key)||this.failed.has(key))this.stageJobs.delete(key);
  }
  return this.lastWindow;
 }
 async opening(navigationElapsed:number,wait:()=>Promise<void>){
  const start=this.now(),soft=start+Math.max(0,15000-navigationElapsed);this.deadline=start+Math.max(0,20000-navigationElapsed);
  while(this.now()<soft&&(this.pending||this.active)){this.tick();await wait();}
  // Finishing an in-flight decode is optional; the menu may appear while it runs.
  this.opened=true;this.deadline=Infinity;
 }
 async enter(signal?:AbortSignal,timeoutMs=PREPARATION_WAIT_TIMEOUT){
  this.held++;
  const previous=this.required;let release!:()=>void;
  this.required=new Promise<void>(resolve=>{release=resolve;});
  const drained=previous.then(()=>this.active);
  let released=false;const leave=()=>{if(released)return;released=true;this.held--;release();};
  try{await waitForAsset(drained,'上一项资源准备',timeoutMs,signal);return leave;}
  catch(error){void drained.then(leave,leave);throw error;}
 }
 /** Manual file caching stops new optional GPU work, but never blocks required entrances. */
 async suspendOptional(signal?:AbortSignal,timeoutMs=PREPARATION_WAIT_TIMEOUT){
  this.held++;const drained=Promise.resolve(this.active);
  let released=false;const leave=()=>{if(released)return;released=true;this.held--;};
  try{await waitForAsset(drained,'后台资源准备',timeoutMs,signal);return leave;}
  catch(error){void drained.then(leave,leave);throw error;}
 }
}
