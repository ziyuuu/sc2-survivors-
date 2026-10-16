import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newEquipmentAccount,grantEquipment,beginEquipmentRun,collectEquipment,discardEquipment,craftEquipment,acquiredCraftRecipes,equipmentRecipeKey,settleEquipment,beginEliteReroll,finishEquipmentReroll,DISMANTLE_VALUES} from '../src/simulation/starship/inventory';
import {StarshipController,type ShipCommand} from '../src/ui/starship/controller';
import {createWorldStarshipHost} from '../src/ui/starship/world-host';
import {createMemoryStarshipHost} from '../src/ui/starship/memory-host';
import type {StarshipHost} from '../src/ui/starship/host';
let serial=0;
const run=(h:StarshipHost,command:ShipCommand)=>new StarshipController(h).execute({id:'field-'+(++serial),revision:h.account().revision,managementRevision:h.management.revision,command});
test('only actually acquired recipe identities unlock crafting; ground sighting and failed pickup do not',()=>{
 const a=newEquipmentAccount();a.dust=10000;assert.equal(craftEquipment(a,{quality:3,race:'terran',receipt:'unknown'}).ok,false);assert.equal(a.dust,10000);
 beginEquipmentRun(a,'terran','discovery');const spec={template:'set.advanced.elite.3',race:'terran' as const,slot:'offense1' as const,binding:{elite:'marine.1' as const}},ground=grantEquipment(a,spec,'ground',{kind:'ground',run:'discovery'});assert.ok(ground.ok);assert.equal(acquiredCraftRecipes(a,'terran').length,0);
 for(let n=0;n<64;n++)assert.ok(grantEquipment(a,{template:'attribute.1',race:'terran',slot:'defense1'},'fill-'+n,{kind:'backpack',run:'discovery'}).ok);
 assert.equal(collectEquipment(a,ground.value.id).ok,false);assert.equal(acquiredCraftRecipes(a,'terran',3).length,0);
 const first=Object.keys(a.items).find(id=>a.locations[id].kind==='backpack')!;discardEquipment(a,first);assert.ok(collectEquipment(a,ground.value.id).ok);assert.ok(discardEquipment(a,ground.value.id).ok);settleEquipment(a,'success');
 const key=equipmentRecipeKey({...spec,binding:spec.binding});assert.ok(a.acquired[key]);assert.equal(acquiredCraftRecipes(a,'protoss',3).length,0);
 for(let n=0;n<20;n++){const result=craftEquipment(a,{quality:3,race:'terran',receipt:'known-'+n});assert.ok(result.ok);assert.equal(equipmentRecipeKey(result.value),key);}
 const before=structuredClone(a);for(const target of [{slot:'offense2' as const,binding:spec.binding},{slot:'offense1' as const,binding:{elite:'marine.2' as const}},{slot:'offense1' as const,binding:{elite:'marine.1' as const,extra:true}}])assert.equal(craftEquipment(a,{quality:3,race:'terran',setTemplate:spec.template,...target,receipt:'bad-'+target.slot+target.binding.elite}).ok,false);assert.deepEqual(a,before);
});
test('acquisition remains after failed expedition and paid binding changes; drop-only corruption stays uncraftable',()=>{
 const a=newEquipmentAccount();a.dust=10000;beginEquipmentRun(a,'terran','loss');const polluted=grantEquipment(a,{template:'set.orange.corrupted_hero.5',race:'terran',slot:'offense1',binding:{hero:'raynor'},polluted:true},'corrupted',{kind:'backpack',run:'loss'});assert.ok(polluted.ok);const key=equipmentRecipeKey(polluted.value);settleEquipment(a,'failure');assert.ok(a.acquired[key]);assert.equal(a.items[polluted.value.id],undefined);assert.equal(acquiredCraftRecipes(a,'terran',5).length,0);
 const elite=grantEquipment(a,{template:'set.advanced.elite.3',race:'terran',slot:'offense1',binding:{elite:'marine.1'}},'elite',{kind:'warehouse'});assert.ok(elite.ok);const old=equipmentRecipeKey(elite.value);assert.ok(beginEliteReroll(a,[elite.value.id]).ok);assert.ok(finishEquipmentReroll(a,a.modification!.id,0).ok);assert.ok(a.acquired[old]);assert.ok(a.acquired[equipmentRecipeKey(elite.value)]);
});
for(const mode of ['world','memory'] as const)test(mode+' field commands preserve identity, phase, dust and protections',()=>{
 const a=newEquipmentAccount(),w=mode==='world'?new World({seed:529,waves:false,terrain:false,obstacles:[],sandbox:true,equipmentAccount:a}):undefined,m=mode==='memory'?createMemoryStarshipHost(a,{resolveImage:k=>k}):undefined,h=w?createWorldStarshipHost(w,{resolveImage:k=>k}):m!.host;
 assert.ok(run(h,{type:'begin'}).ok);const made=grantEquipment(a,{template:'attribute.3',race:'terran',slot:'offense1'},'bag',{kind:'backpack',run:a.run!.id});assert.ok(made.ok);const i=made.value,before=structuredClone(i),dust=a.dust,rng=a.rng,release=h.acquireWindow();
 assert.equal(run(h,{type:'equip',id:i.id,slot:i.slot}).ok,false);assert.equal(run(h,{type:'dismantle',ids:[i.id]}).ok,false);assert.equal(h.dismantle([i.id],a.revision).ok,false);h.management.locked.add(i.id);assert.equal(run(h,{type:'drop',ids:[i.id]}).ok,false);h.management.locked.delete(i.id);
 assert.ok(run(h,{type:'drop',ids:[i.id]}).ok);assert.deepEqual(a.items[i.id],before);assert.equal(a.locations[i.id].kind,'ground');assert.equal(a.dust,dust);assert.equal(a.rng,rng);if(w){assert.equal(w.starship.loot.events.at(-1)?.kind,'drop');assert.equal(w.starship.loot.events.at(-1)?.item?.id,i.id);}
 assert.equal(h.pickup(i.id).ok,false);assert.ok(run(h,{type:'discard',ids:[i.id]}).ok);assert.equal(a.items[i.id],undefined);assert.equal(a.dust,dust);assert.ok(a.acquired[equipmentRecipeKey(i)]);
 const items=Array.from({length:5},(_,n)=>{const r=grantEquipment(a,{template:'attribute.3',race:'terran',slot:'defense1',polluted:n===4},'salvage-'+n,{kind:'backpack',run:a.run!.id});assert.ok(r.ok);return r.value;});h.management.locked.add(items[1].id);h.management.favorites.add(items[2].id);a.run!.locked.add(items[3].id);if(w)w.endStage();else m!.endStage();
 const c=new StarshipController(h),ids=items.map(i=>i.id),p=c.preview(ids,'dismantle');assert.deepEqual(p.ids,[items[0].id]);assert.equal(p.skipped.length,4);assert.equal(p.dust,20);const env={id:'dismantle-once',revision:a.revision,managementRevision:h.management.revision,command:{type:'dismantle',ids} as ShipCommand},first=c.execute(env);assert.ok(first.ok);assert.deepEqual(c.execute(env),first);assert.equal(a.dust,dust+DISMANTLE_VALUES[3]);assert.ok(items.slice(1).every(i=>a.items[i.id]));release();h.dispose?.();
});
test('native drop can be picked up again once, with original identity and paired events',()=>{
 const a=newEquipmentAccount(),w=new World({seed:529,waves:false,terrain:false,obstacles:[],sandbox:true,equipmentAccount:a}),h=createWorldStarshipHost(w,{resolveImage:k=>k});w.start();const r=grantEquipment(a,{template:'attribute.2',race:'terran',slot:'offense1'},'one',{kind:'backpack',run:a.run!.id});assert.ok(r.ok);const original=structuredClone(r.value);assert.ok(h.drop(r.value.id,a.revision).ok);const loc=a.locations[r.value.id];assert.ok(loc.kind==='ground');w.anchor.x=loc.x!;w.anchor.z=loc.z!;assert.ok(h.pickup(r.value.id).ok);assert.equal(h.pickup(r.value.id).ok,false);assert.deepEqual(a.items[r.value.id],original);assert.deepEqual(w.starship.loot.events.map(e=>e.kind),['drop','pickup']);h.dispose?.();
});
