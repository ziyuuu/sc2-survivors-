import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {spawnAdvancedEquipmentGroup} from '../src/simulation/starship/advanced-support';

test('behemoth elite Leviathan uses its native weapons and tentacles through expiry without entering a foreign enemy skill',()=>{
 const w=new World({difficulty:'hell',seed:530,waves:false,terrain:new FlatTerrain(),initial:[],obstacles:[]});
 w.start();w.entities.clear();w.pods=[];w.expedition.ledger=[];
 const [u]=spawnAdvancedEquipmentGroup(w,{key:'behemoth',source:'test:behemoth',items:[],values:[]},[{type:'hots_leviathan',rank:5,eliteLeviathan:true}],{x:0,z:0},30,2,6);
 assert.ok(u);assert.equal(u.enemyTier,'elite');const support=w.starship.advancedBodies.get(u.id)!;
 const target=w.addUnit('mutalisk','zerg',u.x+3,u.z,1);target.hp=target.maxHp=1e7;target.moveSpeed=0;target.weaponDamage=0;
 w.hash.rebuild([...w.entities.values()]);const hp=target.hp;
 for(let i=0;i<181;i++)w.step();
 assert.ok(target.hp<hp-1440,'native attacks and the independent tentacle cycle must still deal damage');
 assert.equal(w.enemySpecials.casts.some(c=>c.source===u.id),false,'no ravager bile fallback for a Leviathan');
 for(let i=181;i<1920;i++)w.step();
 assert.ok(!w.entities.has(u.id)||u.hp<=0,'temporary support expires through its native lifecycle');assert.equal(support.exploded,true,'expiry keeps the approved support explosion');
});
