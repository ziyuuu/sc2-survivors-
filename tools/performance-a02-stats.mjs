export function stats(){
 return {active:false,rows:{},capacities:{},
  record(name,ms){const r=this.rows[name]??(this.rows[name]={calls:0,totalMs:0,maxMs:0});r.calls++;r.totalMs+=ms;r.maxMs=Math.max(r.maxMs,ms);},
  measure(name,fn){const at=performance.now();try{return fn();}finally{const ms=performance.now()-at,r=this.rows[name]??(this.rows[name]={calls:0,totalMs:0,maxMs:0});r.calls++;r.totalMs+=ms;r.maxMs=Math.max(r.maxMs,ms);}},
  capacity(name,submitted,dropped,peak,capacity){const r=this.capacities[name]??(this.capacities[name]={calls:0,submitted:0,dropped:0,peak:0,capacity});r.calls++;r.submitted+=submitted;r.dropped+=dropped;r.peak=Math.max(r.peak,peak);r.capacity=capacity;},
  start(){this.rows={};this.capacities={};this.active=true;},
  stop(){this.active=false;return structuredClone({rows:this.rows,capacities:this.capacities});},
 };
}
