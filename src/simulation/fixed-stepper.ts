/** Fixed rules with bounded catch-up work. Debt is retained, never skipped.
 * An overloaded device can fall behind wall time, but cannot starve input/render
 * for seconds or silently remove attacks/production ticks to inflate FPS. */
export class FixedStepper {
 accumulator=0;lastSteps=0;
 constructor(readonly dt:number,readonly step:()=>boolean,readonly now:()=>number=()=>performance.now(),readonly budgetMs=8,readonly maxSteps=8){}
 reset(){this.accumulator=0;this.lastSteps=0;}
 advance(elapsed:number){this.accumulator+=Math.max(0,elapsed);this.lastSteps=0;const started=this.now();
  while(this.accumulator+1e-10>=this.dt&&this.lastSteps<this.maxSteps){if(this.lastSteps>0&&this.now()-started>=this.budgetMs)break;this.accumulator=Math.max(0,this.accumulator-this.dt);this.lastSteps++;if(!this.step()){this.reset();break;}}
  return Math.min(1,this.accumulator/this.dt);
 }
}
