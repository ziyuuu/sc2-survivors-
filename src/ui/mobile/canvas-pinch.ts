/** Only pointers whose down event began on the battlefield participate. */
export class CanvasPinch{
 private points=new Map<number,{x:number;y:number}>();private blocked=false;private startDistance=0;private startZoom=1;
 constructor(private getZoom:()=>number,private setZoom:(value:number)=>void){}
 get active(){return this.blocked;}
 down(id:number,x:number,y:number){
  this.points.set(id,{x,y});
  if(this.points.size===2&&!this.blocked){this.blocked=true;this.startDistance=this.distance();this.startZoom=this.getZoom();}
  else if(this.points.size>2)this.startDistance=0;
  return this.blocked;
 }
 move(id:number,x:number,y:number){if(!this.points.has(id))return;this.points.set(id,{x,y});if(this.blocked&&this.points.size===2&&this.startDistance>0)this.setZoom(this.startZoom*this.distance()/this.startDistance);}
 up(id:number){const suppressed=this.blocked;this.points.delete(id);if(this.points.size<2)this.startDistance=0;if(!this.points.size)this.blocked=false;return suppressed;}
 cancel(){if(this.points.size)this.blocked=true;this.startDistance=0;}
 clear(){this.points.clear();this.blocked=false;this.startDistance=0;}
 private distance(){const [a,b]=this.points.values();return a&&b?Math.hypot(a.x-b.x,a.y-b.y):0;}
}
