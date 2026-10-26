import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {installRuntime} from './runtime';
import {DYNAMIC_CASES} from './catalogue';

const output=process.argv[2]??'reports/local/t01-20261024/mechanics-20261025/attack-damage-r1.json';
const selected=DYNAMIC_CASES.filter(c=>c.runner==='actor'&&c.action==='attack'&&!c.applicability);
const report:any={scope:'Every applicable friendly attack entry in the delivered T01 catalogue, using its actual prepare/trigger/fixed-step simulation. Only rendering/readiness/HUD are disabled. Each assertion requires an actual native hit with positive HP or shield loss; no visual-event or weapon-selection proxy. This does not prove visual alignment or all passive mechanics.',rows:[],failures:[],sources:[]};
const noop=()=>{};
for(const [index,c]of selected.entries()){
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
 const app={world:w,view:{initialAssetsLoaded:true,resetRun:noop,resetCameraZoom:noop,setCameraMode:noop,render:noop,prepareRosterAssets:noop,assetsPending:0,report:()=>({assetsPending:0,map:'headless-no-rendering',errors:[]})},hud:{inputReset:noop,update:noop},readiness:{cancel:noop,prepare:async()=>true},driver:{reset:noop},session:{memoryOnly:true}};
 const runtime=installRuntime(app as any),hits:any[]=[];let hitCount=0;
 try{
  await runtime.prepare(c);const initial=runtime.snapshot();assert.ok(initial.actor);assert.ok(initial.target);const originalHit=w.hit.bind(w);
  w.hit=((...args:Parameters<World['hit']>)=>{
   const target=args[0],life=target.hp,shield=(target as any).shield??0;originalHit(...args);
   const lifeLost=Math.max(0,life-target.hp),shieldLost=Math.max(0,shield-((target as any).shield??0));
   if(target.owner==='zerg'&&args[4]==='terran'&&(lifeLost>0||shieldLost>0)){hitCount++;if(hits.length<6)hits.push({time:w.time,target:target.id,source:args[7]??null,raw:args[1],lifeBefore:life,lifeAfter:target.hp,shieldBefore:shield,shieldAfter:(target as any).shield??0,lifeLost,shieldLost});}
  }) as World['hit'];
  runtime.trigger();await runtime.advanceTo(c.seconds??8);const final=runtime.snapshot();
  assert.ok(hitCount>0,'No actual positive native HP/shield hit in the full listed attack cycle');
  report.rows.push({id:c.id,actor:c.actor,rank:c.rank,mode:c.fixture?.mode??c.family,target:c.target,seconds:final.elapsed,hitCount,hits,shots:final.actor?.shots,children:final.actor?.children,finalActorHp:final.actor?.hp,events:[...new Set((final.events as any[]).map(e=>e.kind))]});
 }catch(e){report.failures.push({id:c.id,error:String(e),hitCount,hits,snapshot:runtime.snapshot()});}
 if((index+1)%100===0||index===selected.length-1)console.log(JSON.stringify({done:index+1,total:selected.length,failed:report.failures.length}));
}
for(const file of ['tools/t01/runtime.ts','tools/t01/catalogue.ts','tools/t01/actor-branches.ts','tools/t01/audit-attack-damage.ts','src/simulation/world.ts','src/simulation/combat/expedition-combat.ts'])report.sources.push({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')});
await fs.writeFile(output,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({file:output,passed:report.rows.length,failed:report.failures.map((f:any)=>({id:f.id,error:f.error}))}));if(report.failures.length)process.exitCode=1;
