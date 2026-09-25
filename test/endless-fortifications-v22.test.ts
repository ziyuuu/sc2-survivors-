import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';

const endless=()=>{const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],endlessTerrain:new FlatTerrain()});w.start();w.stage=18;w.prepareStage();assert.ok(w.hive);w.hive.hp=0;w.phase='won';assert.ok(w.chooseCampaignExit('endless'));assert.ok(w.skipReward());assert.ok(w.skipReward());const plan=w.previewEndlessTransition()!;assert.ok(plan);const token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));return w;};

test('endless deploys attackable bunkers and a repair station on the new field',()=>{
 const w=endless(),forts=[...w.fortifications.values()];assert.equal(forts.filter(f=>f.kind==='bunker').length,4);assert.equal(forts.filter(f=>f.kind==='repair').length,1);
 for(const f of forts){assert.ok(w.terrain?.canOccupy(f,f.unitRadius));assert.ok(Math.hypot(f.x-w.anchor.x,f.z-w.anchor.z)<14);assert.equal(w.body(f.id),f);}
 const station=forts.find(f=>f.kind==='repair')!,bunker=forts.filter(f=>f.kind==='bunker').sort((a,b)=>Math.hypot(a.x-station.x,a.z-station.z)-Math.hypot(b.x-station.x,b.z-station.z))[0],enemy=w.addUnit('zergling','zerg',bunker.x+2,bunker.z);enemy.moveSpeed=0;enemy.weaponDamage=0;w.updateUnit=()=>{};
 const before=enemy.hp;w.advance(.1);assert.ok(enemy.hp<before,'bunker fires autonomously');
 const health=bunker.hp;w.hit(bunker,50,[],1,'zerg');assert.ok(bunker.hp<health);w.advance(.3);assert.ok(bunker.hp>health-50,'repair station restores a damaged bunker');
 w.hit(bunker,10000,[],1,'zerg');assert.equal(w.fortifications.has(bunker.id),false);assert.equal(w.body(bunker.id),undefined);
});
