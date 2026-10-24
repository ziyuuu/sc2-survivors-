import test from 'node:test';import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {recordMutation,tickShopSupport} from '../src/simulation/combat/shop-support';
import {observeWorld} from '../src/simulation/observation';
import {grantEquipment,newEquipmentAccount} from '../src/simulation/starship/inventory';
import {ATTRIBUTE_SLOTS,isOffensiveSlot} from '../src/simulation/starship/types';
const make=(race:'terran'|'zerg'|'protoss',gear=false)=>{const w=new World({race,seed:102202,terrain:false,obstacles:[],waves:false,sandbox:true,...(gear?{equipmentAccount:newEquipmentAccount(102202)}:{})});if(gear)for(const slot of ATTRIBUTE_SLOTS){const r=grantEquipment(w.starship.account,{template:'attribute.3',race,slot},slot,{kind:'warehouse'});assert.ok(r.ok);r.value.allocation=2;r.value.affixes=(isOffensiveSlot(slot)?['attack','trueDps','range']:['defense','health','reduction']).map(key=>({key,score:200})) as typeof r.value.affixes;assert.ok(w.equipItem(r.value.id,slot).ok);}assert.ok(w.start());w.entities.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.missions.enabled=w.encounters.enabled=false;for(const p of Object.values(w.expedition.production))p.enabled={};return w;};
const enemy=(w:World)=>{const e=w.addUnit('roach','zerg',0,2);e.hp=e.maxHp=1e7;e.armor=e.weaponDamage=e.moveSpeed=0;e.stoppedUntil=1e9;return e;};
test('G02 rapid mutation refresh retains due ticks, three-layer cap and per-attacker isolation',()=>{
 const w=make('terran'),u=w.addUnit('marine','terran',0,0),v=w.addUnit('marine','terran',1,0),e=enemy(w);w.expedition.support.levels.mutation=1;let damage=0;observeWorld(w,(s,k,n)=>{if(s==='terran.mutation'&&k==='damage')damage+=n;});
 for(let n=0;n<=20;n++){w.time=n/10;recordMutation(w,u,e,100);tickShopSupport(w);assert.ok(w.expedition.support.burns.filter(b=>b.source===u.id).length<=3);}
 assert.ok(damage>=40,'rapid fire must not postpone every first tick');recordMutation(w,v,e,200);assert.equal(w.expedition.support.burns.filter(b=>b.source===v.id).length,1);assert.equal(w.expedition.support.burns.length,4);
 const frozen=structuredClone(w.expedition.support.burns),hp=e.hp;w.paused=true;w.time=3;tickShopSupport(w);assert.deepEqual(w.expedition.support.burns,frozen);assert.equal(e.hp,hp);w.paused=false;w.time=5;tickShopSupport(w);assert.equal(w.expedition.support.burns.length,0);
});
for(const race of ['terran','zerg','protoss'] as const)test(`G02 equipped ${race} native sustained fire continues mutation damage`,()=>{
 const w=make(race,true),u=w.addUnit(race==='terran'?'marine':race==='zerg'?'hydralisk':'stalker','terran',0,0,5),e=enemy(w);w.expedition.support.levels.mutation=1;let damage=0;observeWorld(w,(s,k,n)=>{if(s===race+'.mutation'&&k==='damage')damage+=n;});w.hash.rebuild(w.entities.values());for(let n=0;n<600;n++)w.step();assert.ok(e.hp>0&&u.hp>0);assert.ok(damage>0);assert.ok(w.expedition.support.burns.length<=3);
});
