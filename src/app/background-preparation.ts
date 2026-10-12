export type PreparationJob={key:string;run:()=>Promise<unknown>;isReady?:()=>boolean};
type Clock=()=>number;
/** One optional task at a time. Required entrances drain that task and own the
 * same lane, including after cancellation, so old scene work cannot race a retry. */
export class BackgroundPreparation{
 private jobs:PreparationJob[]=[];private completed=new Set<string>();private failed=new Set<string>();
 private active:Promise<void>|null=null;private held=0;private required=Promise.resolve();
 private lastInput=-Infinity;private frameCost=0;private opened=false;private deadline=Infinity;
 readonly events:{key:string;start:number;end:number;ok:boolean}[]=[];
 constructor(private now:Clock=()=>performance.now(),private visible=()=>!document.hidden){}
 select(jobs:PreparationJob[]){this.jobs=[...new Map(jobs.map(job=>[job.key,job])).values()];for(const job of this.jobs)if(job.isReady&&!job.isReady())this.completed.delete(job.key);}
 input(){this.lastInput=this.now();}
 frame(milliseconds:number){this.frameCost=milliseconds;}
 get pending(){return this.jobs.filter(j=>!this.completed.has(j.key)&&!this.failed.has(j.key)).length;}
 get busy(){return this.active!==null;}
 report(){return {pending:this.pending,busy:this.busy,held:this.held,completed:this.completed.size,failed:[...this.failed],opened:this.opened,events:this.events.slice(-120)};}
 tick(){
  if(this.active||this.held||!this.visible()||this.now()>=this.deadline||this.now()-this.lastInput<250||this.opened&&this.frameCost>24)return;
  const job=this.jobs.find(j=>!this.completed.has(j.key)&&!this.failed.has(j.key));if(!job)return;
  const start=this.now();
  this.active=Promise.resolve().then(job.run).then(()=>{this.completed.add(job.key);this.events.push({key:job.key,start,end:this.now(),ok:true});},()=>{this.failed.add(job.key);this.events.push({key:job.key,start,end:this.now(),ok:false});}).finally(()=>{if(this.events.length>240)this.events.splice(0,this.events.length-240);this.active=null;});
 }
 async opening(navigationElapsed:number,wait:()=>Promise<void>){
  const start=this.now(),soft=start+Math.max(0,15000-navigationElapsed);this.deadline=start+Math.max(0,20000-navigationElapsed);
  while(this.now()<soft&&(this.pending||this.active)){this.tick();await wait();}
  // Finishing an in-flight decode is optional; the menu may appear while it runs.
  this.opened=true;this.deadline=Infinity;
 }
 async enter(){
  this.held++;
  const previous=this.required;let release!:()=>void;
  this.required=new Promise<void>(resolve=>{release=resolve;});
  await previous;await this.active;
  let released=false;return ()=>{if(released)return;released=true;this.held--;release();};
 }
}
