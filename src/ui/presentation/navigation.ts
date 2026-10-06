/** UI history only. It deliberately cannot access World, RNG or a wallet. */
export class MenuHistory<T>{
 private entries:{route:T;focus:string;scroll:number}[]=[];
 constructor(readonly home:T){}
 get current(){return this.entries.at(-1)?.route??this.home;}
 get depth(){return this.entries.length;}
 push(route:T,focus='',scroll=0){this.entries.push({route,focus,scroll});}
 back(){return this.entries.pop()??null;}
 reset(){this.entries=[];}
}
/** Stops the second tap landing on a newly revealed control after a purchase. */
export class PointerCommitGuard{
 private last:{x:number;y:number;until:number}|null=null;
 blocks(e:Pick<MouseEvent,'detail'|'clientX'|'clientY'>,now:number){return e.detail>1||e.detail>0&&!!this.last&&now<this.last.until&&Math.hypot(e.clientX-this.last.x,e.clientY-this.last.y)<16;}
 commit(e:Pick<MouseEvent,'detail'|'clientX'|'clientY'>,now:number){if(e.detail>0)this.last={x:e.clientX,y:e.clientY,until:now+350};}
}
