import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
const rows=[];
for(const family of ['hellion','viking','thor','lurker'] as const){
 const results=[];
 for(const automatic of [false,true]){
  const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],seed:619});w.start();w.entities.clear();w.anchor.x=w.anchor.z=0;w.anchorStoppedFor=1;
  const u=w.addUnit(family,'terran',0,0);w.expedition.tech['unlock.hellion']=1;if(!automatic)delete u.autoMode;
  for(let i=0;i<(family==='hellion'?6:1);i++){const e=w.addUnit(family==='thor'?'corruptor':family==='hellion'?'zergling':'roach','zerg',family==='hellion'?2+(i%2)*.8:4,(Math.floor(i/2)-1)*.7);e.hp=e.maxHp=10000;e.weaponDamage=0;e.stoppedUntil=100;}
  const transitions:{at:number;mode:string}[]=[];let previous=u.nativeMode??u.unitType;
  for(let tick=0;tick<720;tick++){w.step();const current=u.nativeMode??u.unitType;if(current!==previous){transitions.push({at:w.time,mode:current});previous=current;}}
  results.push({automatic,damage:[...w.entities.values()].filter(e=>e.owner==='zerg').reduce((n,e)=>n+e.maxHp-e.hp,0),transitions,mode:u.nativeMode??u.unitType});
 }
 rows.push({family,results});
}
const file=process.argv[2]??'reports/local/auto-combat-20261106/modes.json';fs.writeFileSync(file,JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));
for(const row of rows){assert.ok(row.results[1].damage>row.results[0].damage,row.family+' needs a demonstrated benefit');assert.ok(row.results[1].transitions.length>0&&row.results[1].transitions.length<=2,row.family+' mode stability');}
