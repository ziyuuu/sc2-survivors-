import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import type {RunSnapshot} from '../src/simulation/persistence/run-snapshot';

function world(){const w=new World({race:'terran',seed:42,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();return w;}
function rejectWithoutMutation(change:(run:RunSnapshot)=>void){
 const w=world(),before={time:w.time,tick:w.tick,revision:w.revision,minerals:w.wallet.minerals,runId:w.runId};
 const candidate=structuredClone(w.captureRun());change(candidate);
 assert.throws(()=>w.restoreRun(candidate));
 assert.deepEqual({time:w.time,tick:w.tick,revision:w.revision,minerals:w.wallet.minerals,runId:w.runId},before);
}

test('load rejects malformed M2 transfer, delayed support and rarity receipts before touching the active run',()=>{
 rejectWithoutMutation(run=>{run.state.talentTransferPlan={origin:{x:0,z:0},direction:{x:0,z:1},target:{x:0,z:Number.NaN},mapHash:'none',stage:1,endlessRound:0,readyAt:2,participants:[{id:1,generation:0}]};});
 rejectWithoutMutation(run=>{run.state.talentSupportImpacts=[{id:3,race:'terran',at:Number.POSITIVE_INFINITY,point:{x:0,z:0},direction:{x:0,z:1},packet:0}];});
 rejectWithoutMutation(run=>{run.state.rewardDrops.push({id:123,x:0,z:0,reward:{id:'test',offerId:'test',sold:false,name:'test',description:'',icon:'',rarity:'purple',kind:'economy',value:'',minerals:0,gas:0,baseMinerals:0,baseGas:0,discount:0},talentLoot:{rarity:'purple',receipt:'unissued'}});});
});
