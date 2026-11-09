import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {drawExpeditionReinforcements,type ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {effectiveReaperGrowth} from '../src/simulation/combat/terran-elite-runtime';
import {newEquipmentAccount,grantEquipment,canEquip} from '../src/simulation/starship/inventory';
import {quickEquipPlan} from '../src/simulation/starship/quick-equip';
import type {EquipmentSlot} from '../src/simulation/starship/types';
import {StarshipController} from '../src/ui/starship/controller';
import {createWorldStarshipHost} from '../src/ui/starship/world-host';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';

const make=()=>new World({seed:529,race:'terran',difficulty:'normal',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
function shop(rank=1){const w=make();w.start();w.entities.clear();w.heroes.clear();w.expedition.familySlots=['reaper'];w.stage=7;for(let n=0;n<rank;n++)assert.ok(w.acquireElite('reaper.3'));w.wallet={minerals:100000,gas:100000};w.endStage();w.skipReward();assert.equal(w.rewardRound,'random');return w;}
function offer(w:World,rarity:'purple'|'orange'){
 for(let n=0;n<500;n++){w.rewards=drawExpeditionReinforcements(draftContext(w),true);const r=w.rewards.find(r=>r.rarity===rarity&&(r as ExpeditionReward).expeditionEffect.kind==='elite');if(r)return r as ExpeditionReward;}
 throw Error('Expected finite native elite quote');
}
function state(w:World){const h=w.eliteOwned('reaper.3');return {wallet:{...w.wallet},growth:h?effectiveReaperGrowth(w,h):null,hunter:h?.id,rank:h?.rank,receipts:structuredClone(w.terranElites.absorptions),bodies:w.allies().filter(u=>u.unitType==='reaper').map(u=>({id:u.id,rank:u.rank,elite:u.eliteId})),purchases:{...w.economyTotals.purchases}};}
for(const rank of [1,5])for(const rarity of ['purple','orange'] as const)for(const variant of ['reaper.1','reaper.2'] as const)test(`paid ${rarity} ${variant} feeds rank-${rank} hunter once, at the quoted rank, across restore`,()=>{
 const w=shop(rank),r=offer(w,rarity),before=state(w);assert.ok(w.choose(r.offerId,variant));const after=state(w),receipt=after.receipts.at(-1)!;
 assert.equal(receipt.elite,variant);assert.equal(receipt.rank,rarity==='orange'?5:1);assert.equal(after.receipts.length,before.receipts.length+1);assert.equal(after.growth,receipt.contribution*2);
 assert.deepEqual(after.wallet,{minerals:before.wallet.minerals-r.minerals,gas:before.wallet.gas-r.gas});assert.deepEqual(r.purchaseReceipt,{minerals:r.minerals,gas:r.gas,freeSource:null});assert.ok(r.sold);assert.deepEqual(after.bodies,[{id:before.hunter,rank,elite:'reaper.3'}]);
 assert.equal(w.choose(r.offerId,variant),false);assert.deepEqual(state(w),after);
 const copy=make();copy.restoreRun(w.captureRun());assert.deepEqual(state(copy),after);assert.equal(copy.choose(r.offerId,variant),false);assert.deepEqual(state(copy),after);
});
test('insufficient funds do not grant absorption, and native orange acquisition without hunter still yields rank V',()=>{
 const w=shop(),r=offer(w,'orange');w.wallet={minerals:0,gas:0};const before=state(w);assert.equal(w.choose(r.offerId,'reaper.1'),false);assert.deepEqual(state(w),before);assert.equal(r.sold,false);
 w.entities.delete(w.eliteOwned('reaper.3')!.id);w.wallet={minerals:10000,gas:10000};assert.ok(w.choose(r.offerId,'reaper.1'));assert.equal(w.eliteOwned('reaper.1')!.rank,5);assert.equal(w.terranElites.absorptions.length,0);
});
test('orange purchase upgrades an existing elite and full-family replacement receives rank V only after confirmation',()=>{
 const w=shop(),h=w.eliteOwned('reaper.3')!;w.entities.delete(h.id);assert.ok(w.acquireElite('reaper.1'));let r=offer(w,'orange');assert.ok(w.choose(r.offerId,'reaper.1'));assert.equal(w.eliteOwned('reaper.1')!.rank,5);
 const full=shop();full.entities.clear();for(let n=0;n<full.familyMemberCap('reaper');n++)full.addUnit('reaper','terran',n,0);r=offer(full,'orange');const before={...full.wallet},target=full.eliteCandidates('reaper.1')[0];assert.ok(target);
 assert.ok(full.choose(r.offerId,'reaper.1'));assert.ok(full.expedition.pendingShopElite);assert.deepEqual(full.wallet,before);assert.ok(full.cancelShopElite());assert.equal(full.eliteOwned('reaper.1'),undefined);assert.deepEqual(full.wallet,before);
 assert.ok(full.choose(r.offerId,'reaper.1'));assert.ok(full.confirmShopElite(target.id));assert.equal(full.eliteOwned('reaper.1')!.rank,5);assert.equal(full.confirmShopElite(target.id),false);assert.equal(full.wallet.minerals,before.minerals-r.minerals);
});

function gear(w:World,template:string,slot:EquipmentSlot='offense1',polluted=false){const a=w.starship.account,r=grantEquipment(a,{template,race:'terran',slot,polluted},'fixture:'+a.serial,a.run?{kind:'backpack',run:a.run.id}:{kind:'warehouse'});assert.ok(r.ok);return r.value;}
for(const phase of ['outside','intermission'])test(`quick equip ${phase} replaces legal functional gear, keeps equal gear and explicit protections`,()=>{
 const w=make(),a=w.starship.account,old=gear(w,'special.doom.3'),set=gear(w,'set.training.2','offense2'),locked=gear(w,'attribute.1','offense3'),equal=gear(w,'attribute.3','defense1');
 for(const i of [old,set,locked,equal])assert.ok(w.equipItem(i.id,i.slot).ok);if(phase==='intermission'){w.start();w.endStage();}
 const high=gear(w,'attribute.4'),setHigh=gear(w,'attribute.4','offense2'),lockedHigh=gear(w,'attribute.4','offense3'),same=gear(w,'attribute.3','defense1'),tainted=gear(w,'attribute.4','defense2',true),fav=gear(w,'attribute.4','defense3');
 const host=createWorldStarshipHost(w,{resolveImage:()=>''}),c=new StarshipController(host);host.management.locked.add(locked.id);host.management.favorites.add(fav.id);
 const expected=phase==='outside'?[high.id,setHigh.id]:[high.id];assert.deepEqual(c.previewAutoEquip().map(i=>i.id),expected);assert.equal(canEquip(a,'terran',setHigh.id,setHigh.slot).ok,phase==='outside');
 const revision=a.revision,rng=a.rng,count=Object.keys(a.items).length,envelope={id:'auto',revision,managementRevision:host.management.revision,command:{type:'autoEquip' as const}};
 assert.ok(c.execute(envelope).ok);assert.equal(a.revision,revision+1);assert.equal(a.rng,rng);assert.equal(Object.keys(a.items).length,count);assert.equal(a.equipped.terran.offense1,high.id);assert.equal(a.equipped.terran.offense2,phase==='outside'?setHigh.id:set.id);assert.equal(a.locations[old.id].kind,phase==='outside'?'warehouse':'backpack');
 for(const i of [lockedHigh,same,tainted,fav])assert.notEqual(a.locations[i.id].kind,'equipped');assert.ok(c.execute(envelope).ok);assert.equal(a.revision,revision+1);host.dispose!();
});
test('quick equip respects source-locked functional gear, warehouse/run ownership and battle gate',()=>{
 const w=make(),a=w.starship.account,old=gear(w,'special.doom.3');w.equipItem(old.id,old.slot);w.start();gear(w,'attribute.4');a.run!.locked.add(old.id);w.endStage();assert.deepEqual(quickEquipPlan(a,'terran'),[]);a.run!.locked.clear();assert.equal(quickEquipPlan(a,'terran').length,1);w.phase='battle';assert.equal(w.autoEquipItems(new Set()).ok,false);
});
class Backend implements SaveBackend {slots:(string|null)[]=[null,null,null];fail=false;async read(){return [...this.slots];}async commit(raw:string,expected?:string|null){if(this.fail)throw Error('quota');if(expected!==undefined&&expected!==this.slots[0])throw Error('conflict');this.slots=[raw,this.slots[0],this.slots[1]];}}
test('paid absorption and functional replacement persist together; failed save leaves old archive and retries once',async()=>{
 const w=shop(),r=offer(w,'orange'),a=w.starship.account,old=gear(w,'special.doom.3');assert.ok(w.equipItem(old.id,old.slot).ok);const high=gear(w,'attribute.4');
 const backend=new Backend(),s=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});await s.saveNow();const previous=[...backend.slots];backend.fail=true;
 assert.ok(w.choose(r.offerId,'reaper.2'));assert.ok(w.autoEquipItems(new Set()).ok);const after=state(w);assert.equal(await s.saveBeforeAdvance(),false);assert.deepEqual(backend.slots,previous);backend.fail=false;assert.ok(await s.saveBeforeAdvance());
 const repo=new SaveRepository(backend),load=await repo.load();assert.ok(load.bundle?.run);const bundle=load.bundle,restored=new World({seed:529,race:'terran',difficulty:'normal',waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:structuredClone(bundle.equipment!)});assert.ok(restored.permanentProfile.importJSON(bundle.profile));const session=new RunSession(restored,repo,{run:bundle.run,savedAt:load.savedAt,notice:load.notice,management:bundle.management});assert.ok(session.resume(),session.message);assert.deepEqual(state(restored),after);assert.equal(restored.starship.account.equipped.terran.offense1,high.id);assert.equal(restored.starship.account.locations[old.id].kind,'backpack');assert.equal(restored.choose(r.offerId,'reaper.2'),false);
});
