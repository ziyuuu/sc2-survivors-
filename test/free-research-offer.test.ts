import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {encodeGraph,decodeGraph} from '../src/persistence/graph-codec';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,type EquipmentSlot} from '../src/simulation/starship/types';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionDevelopment,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';

const options={race:'zerg' as const,seed:529,sandbox:true,waves:false,terrain:false as const,obstacles:[]};
function world(){return new World({...options,equipmentAccount:newEquipmentAccount(529)});}
function equip(w:World,template:string,slot:EquipmentSlot){const r=grantEquipment(w.starship.account,{template,race:'zerg',slot},'feedback:'+slot,{kind:'warehouse'});assert.ok(r.ok);assert.ok(w.equipItem(r.value.id,slot).ok);}
function extraChoice(w:World){for(const slot of ATTRIBUTE_SLOTS.slice(0,4))equip(w,'set.advanced.choice.4',slot);}
function freeResearch(w:World){equip(w,'module.contract.4','logistics');}
function open(w:World,target:string){assert.ok(w.setDevelopmentTarget(target));assert.ok(w.start());w.wallet={minerals:100000,gas:100000};w.endStage();}
function roundtrip(w:World){const copy=world();copy.restoreRun(decodeGraph(JSON.parse(JSON.stringify(encodeGraph(w.captureRun())))) as ReturnType<World['captureRun']>);return copy;}
const receipt=(w:World)=>({wallet:{...w.wallet},rng:w.rngState,nextId:w.nextId,refresh:w.expedition.refreshCount,free:w.expedition.freeRefresh.building});
const card=(w:World,id:string)=>w.rewards.find(r=>r.value===id) as ExpeditionReward|undefined;

test('free Queen unlock removes only invalid retained cards and preserves survivor identity and quote',()=>{
 const w=world();extraChoice(w);freeResearch(w);open(w,'unlock.queen');
 const queen=card(w,'unlock.queen')!,hatch=card(w,'hatchery')!;assert.ok(queen&&hatch);
 const survivors=structuredClone(w.rewards.filter(r=>r!==queen&&r!==hatch));assert.equal(survivors.length,1);
 assert.ok(w.choose(hatch.offerId));assert.equal(w.rewardRound,'building');assert.equal(w.expedition.tech['unlock.queen'],1);
 assert.deepEqual(w.rewards,survivors);const before=receipt(w);
 const ctx=draftContext(w);ctx.random=()=>{throw Error('pruning must not reroll');};ctx.nextOfferId=()=>{throw Error('pruning must not replace survivors');};
 assert.deepEqual(drawExpeditionDevelopment(ctx),survivors);assert.deepEqual(receipt(w),before);
 assert.equal(w.choose(queen.offerId),false);assert.deepEqual(receipt(w),before);
 const copy=roundtrip(w);assert.deepEqual(copy.rewards,survivors);assert.deepEqual(receipt(copy),before);
});
