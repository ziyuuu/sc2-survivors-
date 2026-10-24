/** Disposable UI results only; active game state and resources never use this cache. */
export class RecentCache<V> extends Map<string,V> {
 private weights=new Map<string,number>();
 private retainedBytes=0;
 constructor(private limit:number,private byteLimit:number,private weight:(key:string,value:V)=>number){super();}
 get byteSize(){return this.retainedBytes;}
 override get(key:string){const value=super.get(key);if(super.has(key)){super.delete(key);super.set(key,value!);}return value;}
 override set(key:string,value:V){
  this.delete(key);const bytes=this.weight(key,value);
  if(bytes>this.byteLimit)return this;
  super.set(key,value);this.weights.set(key,bytes);this.retainedBytes+=bytes;
  while(this.size>this.limit||this.retainedBytes>this.byteLimit)this.delete(this.keys().next().value!);
  return this;
 }
 override delete(key:string){const removed=super.delete(key);if(removed){this.retainedBytes-=this.weights.get(key)!;this.weights.delete(key);}return removed;}
 override clear(){super.clear();this.weights.clear();this.retainedBytes=0;}
}
