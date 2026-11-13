import fs from 'node:fs/promises';
import {ARMED_CARDS} from '../src/data/terran-armed-support';
import {armedScenario} from '../preview/armed-support-showcase-20261111/scenarios';
import {observeWorld} from '../src/simulation/observation';
const results=[];
for(const c of ARMED_CARDS)for(const node of c.id.startsWith('N')?[false,true]:[true]){
 const {world:w}=armedScenario(c.id,node);const bySource:Record<string,number>={};observeWorld(w,(s,k,n)=>{const key=s+':'+k;bySource[key]=(bySource[key]??0)+n;});w.paused=false;
 let maxTemporary=0,maxFormal=0,maxRoots=0,elite=false,shield=false,beam=false;const links=new Set<string>(),widths=new Set<number>();
 for(let i=0;i<240;i++){w.advance(.05);const a=w.expedition.support.armed!;maxTemporary=Math.max(maxTemporary,w.allies().filter(u=>u.temporary).length);maxFormal=Math.max(maxFormal,w.allies().filter(u=>!u.temporary).length);maxRoots=Math.max(maxRoots,Object.values(a.unitStatus).filter(s=>s.root&&s.root.untilTick>w.tick).length);elite ||=w.allies().some(u=>!!u.eliteId);shield ||=Object.values(a.unitStatus).some(s=>!!s.cardShields?.length);beam ||=w.visualEvents.some(e=>e.supportVisual==='planetary-beam');for(const l of a.nodes?.links??[])links.add(l.node);for(const f of a.fields)if(f.cardId==='G04')widths.add(f.width!);}
 const a=w.expedition.support.armed!;results.push({id:c.id,node,tick:w.tick,phase:w.phase,ready:a.readyTick,maxTemporary,maxFormal,maxRoots,elite,shield,beam,links:[...links],batches:a.nodes?.batches,oilWidths:[...widths],bySource,counter:a.counter?.activation?.finished,ammo:w.expedition.support.ammo,orders:w.expedition.ledger.map(j=>({remaining:j.remaining,state:j.state}))});
}
await fs.writeFile('reports/local/armed-support-feedback-20261111/scene-state.json',JSON.stringify(results,null,2));for(const r of results)console.log(JSON.stringify(r));
