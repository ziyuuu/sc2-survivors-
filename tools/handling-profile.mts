import {World} from '../src/simulation/world';
import {locomote,distance} from '../src/simulation/movement/steering';
import fs from 'node:fs';
const out=process.argv[2]??'reports/local/handling-before.json';
const arrivals=[];
for(const type of ['marine','hellion','tank'] as const)for(const length of [.3,3,12])for(const facing of [0,Math.PI/2,Math.PI]){
 const w=new World({sandbox:true,waves:false,initial:[type],obstacles:[]}),u=w.allies()[0],goal={x:0,z:length};u.facing=facing;
 let elapsed=0;while(elapsed<20&&(distance(u,goal)>.13||Math.hypot(u.velocity.x,u.velocity.z)>.1)){locomote(u,goal,u.moveSpeed,{x:0,z:0},1/60,[]);elapsed+=1/60;}
 arrivals.push({type,distance:length,facing,seconds:elapsed,walk:u.distanceWalked,remaining:distance(u,goal)});
}
const encounters=[];
for(const type of ['marine','hellion','tank'] as const)for(const count of [1,6]){
 const w=new World({sandbox:true,waves:false,initial:[type],obstacles:[]});w.start();const u=w.allies()[0];u.facing=Math.PI/2;u.attackFacing=Math.PI/2;w.anchor={x:8,z:0,facing:Math.PI/2};
 const targets=Array.from({length:count},(_,i)=>{const e=w.addUnit('zergling','zerg',8+i*.6,0);e.hp=e.maxHp=10000;return e;});
 let first=null;for(let i=0;i<600;i++){w.time+=1/60;w.anchorStoppedFor+=1/60;w.hash.rebuild(w.entities.values());w.updateUnit(u,1/60);if(first===null&&w.stats.shots)first=w.time;}
 encounters.push({type,count,firstShot:first,shots:w.stats.shots,damage:targets.reduce((n,e)=>n+e.maxHp-e.hp,0),walk:u.distanceWalked});
}
fs.mkdirSync('reports/local',{recursive:true});fs.writeFileSync(out,JSON.stringify({at:new Date().toISOString(),method:'Isolated arrival and approach-to-fire fixtures, stationary nonretaliating high-HP targets. Not a campaign or difficulty proof.',arrivals,encounters},null,2));console.log(JSON.stringify({out,encounters,vehicleThreeMetres:arrivals.filter(r=>r.type!=='marine'&&r.distance===3)}));
