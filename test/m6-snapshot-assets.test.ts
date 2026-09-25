import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BattleRenderer} from '../src/render/scene/battle-renderer';
import type {RunSnapshot} from '../src/simulation/persistence/run-snapshot';

test('loading a campaign save prepares upcoming wave and paid-order models before resume',async()=>{
 const requested:string[]=[];
 const renderer={gpu:new Map(),ensureUnitVariant:async(key:string)=>{requested.push(key);return true;}};
 const snapshot={state:{stage:4,phase:'battle',battlefield:{mode:'campaign'},expedition:{familySlots:['marine'],production:{barracks:{outputs:['marauder'],enabled:{marauder:true}}},ledger:[{family:'tank',state:'training'}]},entities:new Map(),pods:[],rewards:[]}} as unknown as RunSnapshot;
 await BattleRenderer.prototype.prepareSnapshotAssets.call(renderer as BattleRenderer,snapshot);
 for(const model of ['marine','marauder','tank','zergling','roach','baneling'])assert.ok(requested.includes(model),`${model} must be ready before combat resumes`);
});

test('a missing upcoming enemy model blocks restored combat',async()=>{
 const renderer={gpu:new Map(),ensureUnitVariant:async(key:string)=>key!=='roach'};
 const snapshot={state:{stage:4,phase:'battle',battlefield:{mode:'campaign'},expedition:{familySlots:['marine'],production:{},ledger:[]},entities:new Map(),pods:[],rewards:[]}} as unknown as RunSnapshot;
 await assert.rejects(BattleRenderer.prototype.prepareSnapshotAssets.call(renderer as BattleRenderer,snapshot),/必需单位模型未就绪：roach/);
});
