import fs from 'node:fs';
import {World} from '../src/simulation/world.ts';
import {MapTerrain} from '../src/simulation/movement/map-terrain.ts';
import {distance,steerGoal} from '../src/simulation/movement/steering.ts';
const d=JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8')),results:any[]=[];
const t=new MapTerrain(d);t.setStage(12);
function safe(x:number,z:number,r:number){let point:any=null,best=Infinity;for(let dx=-6;dx<=6;dx+=.5)for(let dz=-6;dz<=6;dz+=.5){const p={x:x+dx,z:z+dz};if(Math.hypot(dx,dz)<best&&t.canOccupy(p,r)){best=Math.hypot(dx,dz);point=p;}}if(!point)throw Error('No safe ramp approach');return point;}
for(let ramp=Number(process.env.SC2_RAMP??1)-1;ramp<Number(process.env.SC2_RAMP??d.ramps.length);ramp++)for(const sign of [-1,1]){
 const [ux,uy,rx,ry,cx,cy,width,length]=d.ramps[ramp].mid.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g).map(Number);
 const center={x:cx-d.origin[0],z:d.origin[1]-cy},dir={x:ux*sign,z:-uy*sign},start=safe(center.x-dir.x*7,center.z-dir.z*7,.9),goal=safe(center.x+dir.x*15,center.z+dir.z*15,.9);
 const w=new World({terrain:t,waves:false,initial:[]});w.start();w.stage=12;w.prepareStage();w.stageElapsed=-10000;w.buildings.clear();w.eventPlan=[];w.hive=null;w.anchor={...start,facing:Math.atan2(dir.x,dir.z)};
 for(const type of ['marine','marauder','hellion','tank','medivac'] as const)for(let n=0;n<5;n++){const u=w.addUnit(type,'terran',start.x,start.z),p=safe(start.x+rx*(n-2)*1.9-dir.x*(['marine','marauder','hellion','tank','medivac'].indexOf(type)*2),start.z-ry*(n-2)*1.9-dir.z*(['marine','marauder','hellion','tank','medivac'].indexOf(type)*2),u.unitRadius);Object.assign(u,p,{prev:{...p},facing:Math.atan2(dir.x,dir.z)});}
 const accepted=w.issueMove(goal);let ticks=0,maxStep=0,invalid=0;
 for(;ticks<90*60;ticks++){const old=w.allies().map(u=>({id:u.id,x:u.x,z:u.z}));w.step();for(const p of old){const u=w.entities.get(p.id)!;maxStep=Math.max(maxStep,distance(u,p));if(!u.flying&&!t.canOccupy(u,u.unitRadius))invalid++;}if(w.order?.kind==='move'&&w.order.arrived&&w.allies().filter(u=>!u.flying).every(u=>distance(u,w.moveGoal(u))<3))break;}
 const behind=w.allies().filter(u=>!u.flying&&distance(u,w.moveGoal(u))>=3).map(u=>({type:u.unitType,x:u.x,z:u.z,slot:w.moveGoal(u),distance:distance(u,w.moveGoal(u)),velocity:u.velocity,route:steerGoal(u,w.moveGoal(u),u.unitRadius,[],t,200),separation:w.separation(u),height:t.height(u)}));
 const row={ramp:ramp+1,width,sign,start,goal,accepted,seconds:ticks/60,settled:!behind.length,maxStep,invalid,behind,units:w.allies().map(u=>({id:u.id,type:u.unitType,x:u.x,z:u.z,slot:w.moveGoal(u),velocity:u.velocity,height:t.height(u)}))};results.push(row);console.log(JSON.stringify(row));
}
const summary={cases:results.length,failed:results.filter(r=>!r.accepted||!r.settled||r.invalid).length};fs.writeFileSync(process.env.SC2_CROWD_OUT??'reports/local/map-crowding-current.json',JSON.stringify({at:new Date().toISOString(),method:'Five of each Terran type, 25 entities, real fixed-step World with collision and formation. Both directions at every original ramp, no combat or balance validation. The anchor stops 15 units beyond the ramp. Rear formation slots can legitimately remain before the ramp; only ground units still over 3 units from their own slot after 90 seconds count as unsettled. Starting positions are explicit diagnostic fixtures.',summary,results},null,2));if(summary.failed)process.exitCode=1;
