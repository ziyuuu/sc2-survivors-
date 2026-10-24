import type {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {newSupportMine} from '../src/simulation/combat/tracking-mines';
import {blocked,distance} from '../src/simulation/movement/steering';

/** Component probes remain separate from real-time renderer measurements. */
export function installB03Terrain(w:World,api:any){
 const routes=async(theme='char')=>{
  await api.reset('terrain-'+theme,{theme,stage:18});
  const terrain=w.terrain as any,start={x:0,z:0},points=terrain.connectedLocations(start,.3,.35);
  const eligible=points.filter((p:any)=>distance(start,p)>8&&distance(start,p)<35&&!terrain.walkLine(start,p,.3));
  const high=[...eligible].sort((a:any,b:any)=>Math.abs(terrain.height(b)-terrain.height(start))-Math.abs(terrain.height(a)-terrain.height(start)))[0];
  const narrow=[...eligible].sort((a:any,b:any)=>{const c=(p:any)=>{const d=terrain.definition,x=Math.floor((p.x+d.origin[0])/d.cellSize),y=Math.floor((d.origin[1]-p.z)/d.cellSize);return d.clearance[y*d.walkWidth+x];};return c(a)-c(b);})[0];
  const goals=[high,narrow,...eligible.slice(0,2)].filter(Boolean),records=[];
  for(const [index,goal]of goals.entries())for(let repeat=1;repeat<=3;repeat++){
   let p={...start},legal=true;const trace=[p],at=performance.now(),beforeRoutes=terrain.routes.size;
   for(let n=0;n<1200&&distance(p,goal)>.15;n++){const q=terrain.routeGoal(p,goal,.3,w.mapHalf),d=distance(p,q);if(d<1e-8)break;const step=Math.min(.1,d),next={x:p.x+(q.x-p.x)*step/d,z:p.z+(q.z-p.z)*step/d};if(!terrain.canStep(p,next,.3)){legal=false;break;}p=next;if(n%10===0)trace.push(p);}
   records.push({index,repeat,start,goal,reached:distance(p,goal)<=.15,legal,distanceRemaining:distance(p,goal),heightDelta:terrain.height(goal)-terrain.height(start),directAllowed:terrain.walkLine(start,goal,.3),ms:performance.now()-at,routesBefore:beforeRoutes,routesAfter:terrain.routes.size,trace});
  }
  return {theme,candidates:eligible.length,records};
 };
 const dynamic=async(withFort:boolean)=>{
  await api.reset('mine-dynamic-'+withFort,{theme:'char',stage:18});
  const mine=newSupportMine(w.nextId++,{x:0,z:0}),enemy=w.addUnit('zergling','zerg',3.6,0);enemy.hp=enemy.maxHp=500;enemy.moveSpeed=0;enemy.nextShotAt=1e9;w.expedition.support.mines=[mine];
  let fort:any=null;if(withFort){fort={id:w.nextId++,x:1.8,z:0,hp:150,maxHp:150,armor:1,unitRadius:1,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',kind:'turret_terran',nextActionAt:1e9};w.fortifications.set(fort.id,fort);}
  // Non-combat observers keep the scenario alive without killing the test target.
  for(const u of w.allies()){u.nextShotAt=1e9;u.moveSpeed=0;}
  await api.prepare();const records=[];
  const step=(label:string,ticks:number)=>{const at=performance.now(),before=enemy.hp,trace=[],start=w.time;let legal=true;for(let n=0;n<ticks;n++){const beforePoint={...mine.point};w.step();if(w.expedition.support.mines.includes(mine)){const obstacles=[...w.fortifications.values()].filter(f=>f.hp>0).map(f=>({x:f.x,z:f.z,w:f.unitRadius*2,h:f.unitRadius*2}));if(!w.terrain?.canStep(beforePoint,mine.point,.3)||blocked(mine.point,.3,obstacles))legal=false;}if(n%10===0)trace.push({time:w.time,point:{...mine.point},phase:mine.phase,target:mine.targetId,active:w.expedition.support.mines.includes(mine)});if(!w.expedition.support.mines.includes(mine))break;}records.push({label,ms:performance.now()-at,simulated:w.time-start,hpBefore:before,hpAfter:enemy.hp,legal,active:w.expedition.support.mines.includes(mine),trace});};
  step('before-destruction',360);await api.prepare();
  if(fort){w.hit(fort,1e9,[],1,'zerg',0,1);step('after-destruction',360);await api.prepare();}
  return {withFort,records,fortRemoved:fort?!w.fortifications.has(fort.id):null,enemyHp:enemy.hp};
 };
 return {routes,dynamic};
}
