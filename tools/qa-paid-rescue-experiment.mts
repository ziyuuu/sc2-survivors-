import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {MapTerrain} from '../src/simulation/movement/map-terrain';
import {BUILDS,observe,createCampaignController} from './qa-campaign-controller';

const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const round=(n:number)=>Math.round(n*100)/100;
/** Isolated experiment: original controller remains frozen for browser QA. */
function run(buildId:string,seed:number,rescue:boolean){
 const build=BUILDS.find(b=>b.id===buildId)!,definition=JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8'));
 const w=new World({race:build.race,seed,difficulty:'normal',terrain:new MapTerrain(definition),obstacles:[],waves:true});
 const c=createCampaignController(w,build),deliveries=new Map<number,any>(),actions:unknown[]=[],deaths:unknown[]=[];
 let nextThink=0,lastMove=-100,damageTaken=0,peakBodies=0,issue:string|null=null,steps=0;
 w.setDevelopmentTarget(build.actions[0]);w.start();c.configure();
 function rescueThink(){
  const {allies,enemies}=observe(w),paid=w.pods.filter(p=>p.jobId!==undefined&&p.passengers.some(p=>p.status==='waiting')&&['active','opening','falling'].includes(p.status)).sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor)||a.id-b.id)[0];
  if(!paid||w.effects.some(e=>e.kind==='bile'&&e.owner==='zerg'&&distance(e.end,w.anchor)<e.radius+1.5)){c.think();return;}
  c.configure();
  // Visible enemies around the delivery threaten its safety bubble. No guardian IDs or hidden enemy state enter this policy.
  const blockers=enemies.filter(e=>distance(e,paid)<=7+e.unitRadius).sort((a,b)=>distance(a,paid)-distance(b,paid)||a.id-b.id);
  const target=blockers[0];
  // Fire when it helps clear this delivery or prevents immediate contact damage; distant shootable enemies no longer pin the anchor.
  const urgent=enemies.find(e=>allies.some(u=>distance(e,u)<2+e.unitRadius+u.unitRadius));
  if((target&&distance(w.anchor,paid)<8&&allies.some(u=>w.canFireAt(u,target,0)))||(urgent&&allies.some(u=>w.canFireAt(u,urgent,0)))){if(w.order)w.cancelOrder();return;}
  const goal=target??paid;if(w.time-lastMove<.8||w.order&&distance(w.order.point,goal)<.75)return;
  w.setFamilyMode('tank','tank');w.setFamilyMode('lurker','lurker');
  if(w.issueMove({x:goal.x,z:goal.z})){lastMove=w.time;actions.push({time:round(w.time),delivery:paid.id,target:target?.id??null,anchorDistance:round(distance(w.anchor,paid))});}
 }
 try{while(w.phase!=='lost'&&w.phase!=='won'&&steps<144000){
  c.decisions();if(w.phase==='reward'){c.intermission();continue;}
  if(w.time>=nextThink){nextThink=w.time+.25;if(rescue)rescueThink();else c.think();}
  const before=w.allies().map(u=>({id:u.id,family:u.unitType,hp:u.hp,health:u.hp+(u.shield??0)})),time=w.time;w.step();steps++;if(w.time===time)throw Error('Paused unresolved decision');
  for(const b of before){const u=w.entities.get(b.id);damageTaken+=Math.max(0,b.health-Math.max(0,u?.hp??0)-(u?.shield??0));if((u?.hp??0)<=0)deaths.push({time:round(w.time),stage:w.stage,id:b.id,family:b.family});}
  peakBodies=Math.max(peakBodies,w.allies().length);
  for(const p of w.pods.filter(p=>p.jobId!==undefined)){let d=deliveries.get(p.id);if(!d){d={id:p.id,job:p.jobId,family:p.unitType,created:round(p.createdAt),landed:round(p.landedAt),releases:[],passengers:p.passengers.length};deliveries.set(p.id,d);}p.passengers.forEach((q,i)=>{if(q.status!=='waiting'&&!d.releases.some((r:any)=>r.passenger===i))d.releases.push({passenger:i,status:q.status,time:round(w.time),delay:round(w.time-p.landedAt)});});d.status=p.status;d.waiting=p.passengers.filter(q=>q.status==='waiting').length;d.pendingDelay=d.waiting?round(w.time-p.landedAt):null;d.lastVisibleBlockers=observe(w).enemies.filter(e=>distance(e,p)<=6+e.unitRadius).map(e=>({id:e.id,family:e.unitType,hp:round(e.hp),distance:round(distance(e,p))}));d.anchorDistance=round(distance(w.anchor,p));}
 }}catch(e){issue=String(e);}
 return {build:buildId,seed,policy:rescue?'paid-rescue':'baseline',stage:w.stage,completed:c.completed,time:round(w.time),phase:w.phase,issue,damageTaken:round(damageTaken),peakBodies,deaths,deliveries:[...deliveries.values()],wallet:w.wallet,workers:w.workers,events:c.events,actions};
}
const results=[];
for(const [build,seed] of [['bio',271],['swarm',7],['shield',271]] as const)for(const rescue of [false,true]){const r=run(build,seed,rescue);results.push(r);console.log(JSON.stringify({build,seed,policy:r.policy,completed:r.completed,time:r.time,damageTaken:r.damageTaken,released:r.deliveries.reduce((n,d)=>n+d.releases.filter((p:any)=>p.status!=='lost').length,0),peakBodies:r.peakBodies,issue:r.issue}));}
fs.mkdirSync('reports/local/paid-rescue-experiment',{recursive:true});fs.writeFileSync('reports/local/paid-rescue-experiment/results.json',JSON.stringify({method:'Controlled same-seed same-economy actual World run; one tactical rescue policy difference; no runtime gameplay edits.',results},null,2));
