import fs from 'node:fs';import path from 'node:path';
import {World} from '../src/simulation/world';
import {campaignTerrain,chooseCampaignMap} from '../src/data/campaign-map';
import {BUILDS,createCampaignController} from './qa-campaign-controller';
import {difficultyLoadout} from './difficulty-r2-loadout';
const root=process.env.SC2_INTRO_DIR??'reports/local/performance-optimization-20261016/normal-intro';fs.mkdirSync(root,{recursive:true});
fs.copyFileSync('src/data/enemy-tuning.ts',path.join(root,'enemy-tuning.ts'));
const rows=[];
for(const seed of [529,1793,8111])for(const build of BUILDS.filter(b=>['bio','entrench','shield'].includes(b.id))){
 const map=chooseCampaignMap(seed),account=difficultyLoadout(build.race,0,seed),w=new World({race:build.race,seed,difficulty:'normal',waves:true,terrain:campaignTerrain(map),equipmentAccount:account});w.configureCampaign(map);
 const controller=createCampaignController(w,build);controller.initialize();w.start();controller.configure();let steps=0,nextThink=0,nextSample=0,completed=0,peakEnemies=0,issue:string|null=null;const samples:any[]=[];
 try{while(steps<60*600&&w.phase!=='lost'&&completed<3){controller.decisions();if(w.phase==='reward'){completed=Math.max(completed,w.stage);if(completed>=3)break;controller.intermission();continue;}if(w.time>=nextThink){controller.think();nextThink=w.time+.25;}const old=w.time;w.step();steps++;if(w.time===old)throw Error('Unresolved native decision');peakEnemies=Math.max(peakEnemies,w.enemyCount());if(w.time>=nextSample||w.phase==='lost'){nextSample=w.time+10;samples.push({time:w.time,stage:w.stage,allies:w.allies().length,hp:w.allies().reduce((n,u)=>n+u.hp,0),enemies:w.enemyCount(),wallet:{...w.wallet},kills:w.stats.kills});}}
 }catch(e){issue=String(e);}
 const row={race:build.race,seed,map,phase:w.phase,stage:w.stage,completed,time:w.time,steps,peakEnemies,issue};rows.push(row);fs.writeFileSync(path.join(root,build.race+'-'+seed+'.json'),JSON.stringify({...row,method:'Native World/public controller, three complete stages, zero equipment/talents, actual terrain/economy/production, no health lock or injected income. Bot outcome, not human win rate.',samples,events:controller.events},null,2));console.log(JSON.stringify(row));fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({rows},null,2));
}
if(rows.some(r=>r.issue))process.exitCode=1;
