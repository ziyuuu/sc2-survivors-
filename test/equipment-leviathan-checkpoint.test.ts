import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {newEquipmentAccount,grantEquipment,cleanseEquipment} from '../src/simulation/starship/inventory';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {activeEquipmentEffects} from '../src/simulation/starship/modules';
import {spawnAdvancedEquipmentGroup} from '../src/simulation/starship/advanced-support';

class Backend implements SaveBackend {
 slots:(string|null)[]=[null,null,null];
 async read(){return [...this.slots];}
 async commit(raw:string,expected?:string|null){assert.equal(this.slots[0],expected);readArchive(raw);this.slots=[raw,this.slots[0],this.slots[1]];}
}
function fixture(template:string){
 const w=new World({waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount()}),a=w.starship.account;
 const g=grantEquipment(a,{template,race:'terran',slot:'support',polluted:EQUIPMENT_TEMPLATES[template].pollution==='required'},'gear',{kind:'warehouse'});assert.ok(g.ok);a.dust=1e6;
 if(g.value.pollution==='uncleansed')assert.ok(cleanseEquipment(a,g.value.id).ok);assert.ok(w.equipItem(g.value.id,'support').ok);
 const backend=new Backend(),session=new RunSession(w,new SaveRepository(backend),{run:null,savedAt:0,notice:''});w.start();
 const kind=template.includes('plague')?'plague':'behemoth',effect=activeEquipmentEffects(w).find(e=>e.key===kind)!;
 const bodies=spawnAdvancedEquipmentGroup(w,effect,[{type:'hots_leviathan',rank:kind==='plague'?3:5,eliteLeviathan:kind==='behemoth'}],w.anchor,30,2,6);assert.equal(bodies.length,1);
 return {w,a,body:bodies[0],backend,session};
}
for(const template of ['module.plague.4','module.behemoth.5'])test(template+': legal nonhero support and its intermission corpse save and restore without replay',async()=>{
 const {w,body,backend,session}=fixture(template),active=w.captureRun(),target=new World({waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount()});
 assert.equal(body.heroId,undefined);assert.doesNotThrow(()=>target.restoreRun(active));assert.equal(target.entities.get(body.id)!.temporaryUntil,body.temporaryUntil);
 w.endStage();assert.equal(body.hp,0);assert.equal(await session.saveBeforeAdvance(),true);assert.equal(session.saveFailed,false);
 const loaded=readArchive(backend.slots[0]!).bundle,copy=new World({waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:loaded.equipment});
 assert.doesNotThrow(()=>copy.restoreRun(loaded.run!));assert.equal(copy.phase,'reward');assert.equal(copy.entities.get(body.id)!.hp,0);assert.equal(copy.entities.get(body.id)!.heroId,undefined);
 assert.equal(copy.starship.advancedBodies.get(body.id)!.exploded,true);assert.deepEqual(copy.starship.account.run!.locked,w.starship.account.run!.locked);assert.equal(copy.wallet.minerals,w.wallet.minerals);
});
test('nonhero air bodies require matching temporary equipment provenance before restoring any state',()=>{
 const {w,body}=fixture('module.plague.4'),good=w.captureRun(),target=new World({waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount()});target.start();const before=target.captureRun();
 for(const mutate of [(s:typeof good)=>s.starship!.runtime.advancedBodies.delete(body.id),(s:typeof good)=>s.starship!.runtime.members.delete(body.id),(s:typeof good)=>{s.starship!.runtime.members.get(body.id)!.origin='ark';},(s:typeof good)=>{s.state.entities.get(body.id)!.temporary=false;},(s:typeof good)=>{s.state.entities.get(body.id)!.unitType='yamato_battlecruiser';s.state.entities.get(body.id)!.race='terran';}]){
  const bad=structuredClone(good);mutate(bad);assert.throws(()=>target.restoreRun(bad),/续局单位无效/);assert.deepEqual(target.captureRun(),before);
  assert.throws(()=>readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:bad,equipment:bad.starship!.runtime.account})),/续局单位无效/);
 }
});
