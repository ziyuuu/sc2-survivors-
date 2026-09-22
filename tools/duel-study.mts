import fs from 'node:fs/promises';import {World} from '../src/simulation/world';import {PlayPolicy} from './play-policy';
const rows=[];
for(const marines of [1,2,5])for(const lings of [1,2,4,8,12])for(const hp of [18,35])for(const flank of [false,true])for(const style of ['hold','kite']){
 const w=new World({sandbox:true,waves:false,obstacles:[],initial:Array(marines).fill('marine')});w.start();for(const u of w.allies()){u.facing=Math.PI/2;u.x=0;u.z=(u.slot-(marines-1)/2)*1.4;u.prev={x:u.x,z:u.z};}
 for(let i=0;i<lings;i++){const e=w.addUnit('zergling','zerg',flank?i%3-1:9+Math.floor(i/3),flank?9+Math.floor(i/3):i%3-1);e.maxHp=e.hp=hp;}
 const p=new PlayPolicy();while(w.phase==='battle'&&w.time<35&&w.enemyCount()){if(style==='kite')p.update(w);w.step();}
 rows.push({marines,lings,hp,flank,style,win:w.enemyCount()===0,hpLost:marines*45-w.allies().reduce((s,u)=>s+u.hp,0),seconds:w.time});
}await fs.writeFile('reports/local/v4-duels.json',JSON.stringify(rows,null,2));console.log(rows.filter(r=>r.hp===35&&!r.flank&&r.style==='hold'));
