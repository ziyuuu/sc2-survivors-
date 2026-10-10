export function stats(values:readonly number[]){
 const sorted=[...values].sort((a,b)=>a-b),count=sorted.length;
 const q=(p:number)=>count?sorted[Math.min(count-1,Math.floor(count*p))]:null;
 return {count,mean:count?sorted.reduce((a,b)=>a+b,0)/count:null,p50:q(.5),p95:q(.95),p99:q(.99),max:sorted.at(-1)??null,over20Percent:count?100*sorted.filter(x=>x>20).length/count:null};
}
export type ValidityInput={seconds:number;targetSeconds:number;frames:number[];visibility:string[];focused:boolean[];contextLost:boolean;errors:number;gpuSupported:boolean;gpuDisjoint:number;gpuSamples:number;pendingAssets:number;live:boolean;unchanged:boolean;phaseComplete:boolean;cpuWork:number[];frameOffsets?:number[];longTasks?:{at:number;ms:number}[]};
/** Timing validity and speed are separate. A slow, fully accounted frame is still evidence. */
export function validity(v:ValidityInput){
 const reasons:string[]=[],gpuReasons:string[]=[];
 if(v.seconds<v.targetSeconds*.98)reasons.push('window-too-short');
 if(v.visibility.some(x=>x!=='visible')||!v.visibility.length)reasons.push('not-continuously-visible');
 if(v.focused.some(x=>!x)||!v.focused.length)reasons.push('not-continuously-focused');
 if(v.contextLost)reasons.push('context-loss');
 if(v.errors)reasons.push('runtime-errors');
 if(v.pendingAssets)reasons.push('pending-assets');
 if(!v.live&&!v.unchanged)reasons.push('frozen-world-changed');
 if(v.live&&!v.phaseComplete)reasons.push('battle-ended-during-sample');
 const frame=stats(v.frames),cpu=stats(v.cpuWork),fps=v.frames.length/v.seconds;
 if(v.frames.length<30||fps<5){
  // Do not blame simulation for low-frequency callbacks without CPU/GPU evidence.
  reasons.push('low-sample-count-requires-attribution');
 }
 if((frame.mean??0)>100&&fps<15&&(cpu.mean??0)<(frame.mean??1)*.5)reasons.push('unexplained-callback-gap');
 const unexplainedGaps=v.frames.flatMap((gap,i)=>{
  if(gap<250)return [];
  const work=Math.max(v.cpuWork[i]??0,v.cpuWork[i+1]??0),end=v.frameOffsets?.[i];
  const longTaskAccounted=end!==undefined&&(v.longTasks??[]).some(t=>Math.max(0,Math.min(end,t.at+t.ms)-Math.max(end-gap,t.at))>=gap*.5);
  return work>=gap*.5||longTaskAccounted?[]:[{index:i,ms:gap,cpuWork:work}];
 });
 if(unexplainedGaps.length)reasons.push('unexplained-long-callback-gap');
 if(!v.gpuSupported)gpuReasons.push('timer-query-unavailable');
 if(v.gpuDisjoint)gpuReasons.push('gpu-disjoint');
 if(v.gpuSupported&&v.gpuSamples<Math.max(20,v.frames.length*.5))gpuReasons.push('insufficient-gpu-samples');
 return {timingValid:reasons.length===0,gpuValid:reasons.length===0&&gpuReasons.length===0,reasons,gpuReasons,unexplainedGaps,fps,performancePass:null,naturalAcceptance:false};
}
