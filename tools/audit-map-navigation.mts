import fs from 'node:fs';
import {MapTerrain} from '../src/simulation/movement/map-terrain.ts';
import {World} from '../src/simulation/world.ts';
import {distance,locomote,steerGoal} from '../src/simulation/movement/steering.ts';
import type {MapDefinition} from '../src/data/map-definition.ts';
import type {Point} from '../src/simulation/types.ts';
const d:MapDefinition=JSON.parse(fs.readFileSync('assets/private/maps/map-runtime.json','utf8'));
const out=process.env.SC2_MAP_AUDIT_OUT??'reports/local/map-navigation-current.json';
const t=new MapTerrain(d),W=d.walkWidth,H=d.walkHeight,center=(i:number)=>({x:(i%W+.5)*d.cellSize-d.origin[0],z:d.origin[1]-(Math.floor(i/W)+.5)*d.cellSize});
const index=(p:Point)=>Math.floor((d.origin[1]-p.z)/d.cellSize)*W+Math.floor((p.x+d.origin[0])/d.cellSize);
const started=Date.now();
const report:any={at:new Date().toISOString(),source:d.source,method:'Real imported half-unit grid; radius-aware component and boundary audit, followed by fixed 60 Hz vehicle locomotion. Isolated navigation diagnostics without enemies/economy, not a balance or victory test.',stages:[],ramps:[],edgeRoutes:[]};
const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
function scan(radius:number){const valid=Uint8Array.from(d.walk,(_,i)=>t.canOccupy(center(i),radius)?1:0),seen=new Uint8Array(valid.length),q=[index(d.start)];seen[q[0]]=1;let boundary=0,allBoundary=0;const extremes=Array.from({length:8},()=>({score:-Infinity,i:q[0]}));
 for(let n=0;n<q.length;n++){const i=q[n],x=i%W,y=Math.floor(i/W),p=center(i);for(let k=0;k<8;k++){const score=p.x*Math.sin(k*Math.PI/4)+p.z*Math.cos(k*Math.PI/4);if(score>extremes[k].score)extremes[k]={score,i};}
  for(const [dx,dy]of dirs){const nx=x+dx,ny=y+dy,j=ny*W+nx;if(nx<0||ny<0||nx>=W||ny>=H||seen[j]||!valid[j]||dx&&dy&&(!valid[y*W+nx]||!valid[ny*W+x])||!t.canStep(p,center(j),radius))continue;seen[j]=1;q.push(j);}}
 for(let i=0;i<valid.length;i++)if(valid[i]&&dirs.slice(0,4).some(([dx,dy])=>!valid[i+dx+dy*W])){allBoundary++;if(seen[i])boundary++;}
 return {radius,valid:valid.reduce((a,b)=>a+b,0),reachable:q.length,boundary,allBoundary,extremes:extremes.map(v=>center(v.i)),unreachable:valid.reduce((n,v,i)=>n+(v&&!seen[i]?1:0),0)};
}
const fixture=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine','hellion','tank']});fixture.start();
function nearest(p:Point,r:number){let best:Point|null=null,delta=Infinity;for(let z=-4;z<=4;z+=.25)for(let x=-4;x<=4;x+=.25){const q={x:p.x+x,z:p.z+z},dd=distance(p,q);if(dd<delta&&t.canOccupy(q,r)){best=q;delta=dd;}}return best;}
function walk(type:'marine'|'hellion'|'tank',a:Point,b:Point,limit=140,headingOffset=0){const u=fixture.allies().find(u=>u.unitType===type)!;Object.assign(u,a,{facing:Math.atan2(b.x-a.x,b.z-a.z)+headingOffset,velocity:{x:0,z:0},distanceWalked:0});let maxStep=0,last={...a},still=0,escaped=0,tick=0,cached={...a};for(;tick<limit*60&&distance(u,b)>.3;tick++){const before={x:u.x,z:u.z};if(tick%9===0||distance(u,cached)<.7)cached=steerGoal(u,b,u.unitRadius,[],t,200);locomote(u,cached,u.moveSpeed,{x:0,z:0},1/60,[],200,t);maxStep=Math.max(maxStep,distance(u,before));if(!t.canOccupy(u,u.unitRadius))escaped++;if(tick%60===59){still=distance(u,last)<.04?still+1:0;last={x:u.x,z:u.z};if(still>=4)break;}}return {type,start:a,end:b,reached:distance(u,b)<=.3,seconds:+(tick/60).toFixed(2),travel:+u.distanceWalked.toFixed(2),remaining:+distance(u,b).toFixed(3),stopped:{x:u.x,z:u.z},maxStep,escaped};}
for(let stage=process.env.SC2_MAP_AUDIT_RAMPS_ONLY?13:Number(process.env.SC2_MAP_AUDIT_STAGE??1);stage<=Number(process.env.SC2_MAP_AUDIT_STAGE??12);stage++){t.setStage(stage);const scans=[.375,.625,.875,.9].map(scan);report.stages.push({stage,area:d.stageAreas[stage-1],scans});console.log('Stage',stage,scans.map(s=>`${s.radius}: ${s.reachable}/${s.valid}`).join(' | '));if(!process.env.SC2_MAP_AUDIT_GRID_ONLY)for(const type of ['marine','hellion','tank'] as const){const s=scans[['marine','hellion','tank'].indexOf(type)];for(const target of s.extremes){const r=walk(type,d.start,target);report.edgeRoutes.push({stage,...r});if(!r.reached)console.log('Edge failure',stage,type,JSON.stringify({target,at:r.stopped,remaining:r.remaining}));}}}
t.setStage(12);
for(let i=0;i<d.ramps.length;i++){
 const v=d.ramps[i].mid.match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g)!.map(Number),[ux,uy,rx,ry,cx,cy,width,length]=v;
 for(const type of ['marine','hellion','tank'] as const){const radius=fixture.allies().find(u=>u.unitType===type)!.unitRadius;
  for(const side of process.env.SC2_MAP_AUDIT_SHOULDERS?[-1,0,1]:[0]){
   const across=side*Math.max(.25,width/2-radius);
   const ends=[-1,1].map(sign=>nearest({x:cx+ux*sign*(length/2+2)+rx*across*sign-d.origin[0],z:d.origin[1]-(cy+uy*sign*(length/2+2)+ry*across*sign)},radius));
   if(ends.some(p=>!p)){report.ramps.push({ramp:i,type,side,missingEndpoint:true});continue;}
   for(const reverse of [false,true]){const [a,b]=reverse?[ends[1]!,ends[0]!]:[ends[0]!,ends[1]!];report.ramps.push({ramp:i,width,side,reverse,...walk(type,a,b,60,side*Math.PI/2)});}
  }
 }
}

report.elapsedSeconds=(Date.now()-started)/1000;report.summary={edgeTests:report.edgeRoutes.length,edgeFailures:report.edgeRoutes.filter((r:any)=>!r.reached).length,rampTests:report.ramps.length,rampFailures:report.ramps.filter((r:any)=>!r.reached).length};fs.mkdirSync('reports/local',{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report.summary));

if(report.summary.edgeFailures||report.summary.rampFailures||report.edgeRoutes.some((r:any)=>r.escaped)||report.ramps.some((r:any)=>r.escaped))process.exitCode=1;
