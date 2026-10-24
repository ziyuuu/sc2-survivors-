/** Coalesce presentation requests only within one synchronous simulation advance.
 * World listeners and purchase observations still run for every notification.
 * The final refresh runs before rendering, including when advance throws.
 */
export class RefreshBatch {
 private depth=0;
 private pending=false;
 constructor(private refresh:()=>void){}
 request(){if(this.depth)this.pending=true;else this.refresh();}
 run<T>(action:()=>T):T {
  this.depth++;
  try{return action();}
  finally{if(--this.depth===0&&this.pending){this.pending=false;this.refresh();}}
 }
}
