import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {armedScenario} from '../preview/armed-support-showcase-20261111/scenarios';
import {ARMED_CARD_BY_ID as C} from '../src/data/terran-armed-support';
import type {ArmedId} from '../src/simulation/progression/build-progress';
const rows=[];
for(const id of ['W01','G02','B03','B06','P02','P05','O02','O03'] as ArmedId[]){const {world:w}=armedScenario(id);w.paused=false;const landed=new Map<number,number>(),start=w.time;
 for(let i=0;i<600;i++){w.advance(.1);for(const u of w.allies())if(u.armed?.cardId===id&&!landed.has(u.armed.castId))landed.set(u.armed.castId,w.time-start);for(const f of w.fortifications.values())if(f.supportOrigin?.cardId===id&&!landed.has(f.supportOrigin.castId))landed.set(f.supportOrigin.castId,w.time-start);}
 const cd=C[id].params.cd,casts=[...landed.values()].map(t=>Number(t.toFixed(3)));assert.ok(casts.length>=2,id+' did not complete a second actual arrival');rows.push({id,cd,seconds:60,casts,phase:w.phase});console.log(JSON.stringify(rows.at(-1)));
}
await fs.writeFile('reports/local/armed-support-polish-20261111/cycles.json',JSON.stringify({scope:'Fixed-seed engineered preconditions, normal stage 4, 60 seconds of production World; no post-trigger grants or CD reset.',rows},null,2)+'\n');
