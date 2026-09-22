import fs from 'node:fs';
import {World} from '../src/simulation/world.ts';
import {MapTerrain} from '../src/simulation/movement/map-terrain.ts';
import {distance} from '../src/simulation/movement/steering.ts';
const d=JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8'));
const audit=JSON.parse(fs.readFileSync('reports/local/map-navigation-current.json','utf8'));
const results:any[]=[];
for(const stage of [1,3,6,9,12]){
 const w=new World({terrain:new MapTerrain(d),waves:false,initial:['marine','hellion','tank','medivac']});w.start();w.stage=stage;w.prepareStage();w.buildings.clear();w.eventPlan=[];w.stageElapsed=-10000;w.hive=null;
 const bounds=audit.stages.find((s:any)=>s.stage===stage).scans.find((s:any)=>s.radius===.9).extremes;
 const far=bounds.reduce((a:any,b:any)=>distance(b,d.start)>distance(a,d.start)?b:a);
 for(const target of [far,d.start]){const start={...w.anchor},before=w.time,accepted=w.issueMove(target);let tick=0,maxStep=0,invalid=0;for(;tick<240*60;tick++){const old=w.allies().map(u=>({id:u.id,x:u.x,z:u.z}));w.step();for(const p of old){const u=w.entities.get(p.id)!;maxStep=Math.max(maxStep,distance(p,u));if(!u.flying&&!w.terrain!.canOccupy(u,u.unitRadius))invalid++;}if(w.order?.kind==='move'&&w.order.arrived&&w.allies().every(u=>distance(u,w.moveGoal(u))<1.6))break;}
 const units=w.allies().map(u=>({type:u.unitType,x:u.x,z:u.z,slotError:distance(u,w.moveGoal(u)),anchorDistance:distance(u,w.anchor)}));results.push({stage,start,target,accepted,seconds:w.time-before,arrived:w.order?.kind==='move'&&w.order.arrived,units,maxStep,invalid});console.log(JSON.stringify(results.at(-1)));}
}
const w=new World({terrain:new MapTerrain(d),waves:false,initial:[]});w.start();w.stage=12;w.prepareStage();w.stageElapsed=-10000;w.buildings.clear();w.eventPlan=[];w.hive=null;
let cliff:any=null;
for(let i=0;i<d.walk.length&&!cliff;i++){
 const a={x:(i%d.walkWidth+.5)*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(i/d.walkWidth)+.5)*d.cellSize};
 if(!w.terrain!.canOccupy(a,.375))continue;
 for(const [x,z]of [[4,0],[-4,0],[0,4],[0,-4]]){const b={x:a.x+x,z:a.z+z};if(w.terrain!.canOccupy(b,.5)&&w.terrain!.height(a)-w.terrain!.height(b)>1.8&&!w.terrain!.walkLine(a,b,0)){cliff={high:a,low:b};break;}}
}
if(!cliff)throw Error('No original high/low cliff fixture');
const marine=w.addUnit('marine','terran',cliff.high.x,cliff.high.z),roach=w.addUnit('roach','zerg',cliff.low.x,cliff.low.z);marine.moveSpeed=0;roach.moveSpeed=roach.weaponDamage=0;roach.hp=roach.maxHp=10000;w.anchor={...cliff.high,facing:0};
for(let i=0;i<120;i++)w.step();const highGround={...cliff,damage:10000-roach.hp,highY:w.terrain!.height(cliff.high),lowY:w.terrain!.height(cliff.low)};
fs.writeFileSync('reports/local/map-squad-current.json',JSON.stringify({at:new Date().toISOString(),method:'Unopposed four-type squad using actual World.issueMove and all fixed-step movement, contacts and formations. High/low fixture also uses original map heights and real weapon damage. No route is a campaign playthrough or balance gate.',results,highGround},null,2));
if(results.some(r=>!r.accepted||!r.arrived||r.invalid||r.units.some((u:any)=>u.slotError>=1.6))||highGround.damage<=0)process.exitCode=1;
console.log('Original high ground',highGround);
