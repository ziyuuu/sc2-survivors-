import {runtimeBudget} from './graphics-profile';
/** Separate lanes; queued work keeps its deduplication identity until completed. */
export class PreparationLane {
 private active=0;private waiting:(()=>void)[]=[];peak=0;completed=0;milliseconds=0;
 constructor(private limit:()=>number){}
 async run<T>(work:()=>Promise<T>):Promise<T>{
  await new Promise<void>(resolve=>{const enter=()=>{this.active++;this.peak=Math.max(this.peak,this.active);resolve();};if(this.active<this.limit())enter();else this.waiting.push(enter);});
  const start=performance.now();try{return await work();}finally{this.completed++;this.milliseconds+=performance.now()-start;this.active--;this.waiting.shift()?.();}
 }
 report(){return {active:this.active,queued:this.waiting.length,peak:this.peak,completed:this.completed,milliseconds:this.milliseconds};}
}
export const imageDecodeLane=new PreparationLane(()=>runtimeBudget().decode);
export const modelDecodeLane=new PreparationLane(()=>runtimeBudget().decode);
export const audioDecodeLane=new PreparationLane(()=>runtimeBudget().audio);
