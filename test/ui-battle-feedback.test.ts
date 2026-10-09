import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {BattleDistress} from '../src/render/scene/battle-distress';
import {minimapThreats} from '../src/ui/hud/minimap-threats';
import {purchasedEnhancements} from '../src/ui/presentation/purchased-enhancements';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {renderRepairs} from '../src/ui/hud/expedition-panel';
import {renderIntermission,IntermissionNavigation} from '../src/ui/presentation/intermission';

const world=()=>{const w=new World({waves:false,terrain:false,sandbox:true,seed:592});assert.ok(w.start());return w;};
test('purchased enhancements group identical effects/quality across discounts, exclude troop/service cards, leave receipts intact',()=>{
 const reward=(id:string,e:unknown,rarity='white',cost=50)=>({id,offerId:id+Math.random(),name:id,description:'effect',rarity,sold:true,purchaseReceipt:{minerals:cost,gas:0},expeditionEffect:e}as ExpeditionReward);
 const fire={kind:'teamCard',group:'firepower',rarity:'white'},entries=[reward('fire',fire),reward('fire',fire,'white',30),reward('fire',{...fire,rarity:'blue'},'blue'),reward('weapon',{kind:'card',effect:'weapon',family:'marine',key:'weapon.marine',amount:.03}),reward('weapon',{kind:'card',effect:'weapon',family:'marine',key:'weapon.marine',amount:.03}),reward('tactical',{kind:'support',support:'terran.ricochet'}),...['training','supply','building','resource','hero','elite'].map(kind=>reward(kind,{kind}))];
 const before=structuredClone(entries),groups=purchasedEnhancements(entries);assert.equal(groups.length,4);assert.equal(groups[0].count,2);assert.equal(groups[0].minerals,80);assert.equal(groups[1].count,1);assert.equal(groups[2].count,2);assert.equal(groups[3].card.name,'tactical');assert.deepEqual(entries,before);
 assert.equal(purchasedEnhancements([{...entries[0],mapSource:'elite'}as never,{...entries[0],sold:false}]).length,0);
});
test('real friendly combat death fades after 2.4 seconds without changing World',()=>{
 const w=world(),d=new BattleDistress();d.update(w,true,true);w.time=1;w.hit(w.allies()[0],1e9,[],1,'zerg');const before=structuredClone(w.captureRun());const f=d.update(w,true,true);assert.equal(f.casualty,true);assert.ok(f.opacity>.3);assert.equal(f.shakeX,0);assert.deepEqual(w.captureRun(),before);w.time=3.5;assert.equal(d.update(w,true,true).opacity,0);
});
test('temporary/child expiry, voluntary replacement, and enemy deaths do not signal a squad casualty',()=>{
 for(const kind of ['temporary','child','removed','enemy']){const w=world(),d=new BattleDistress();const u=kind==='enemy'?w.spawnSpecial('zergling','elite',{x:20,z:20})!:w.allies()[0];if(kind==='temporary')u.temporary=true;if(kind==='child'){u.summonOwnerId=99;u.summonKind='interceptor';}d.update(w,true,true);w.time=.2;if(kind==='removed')w.entities.delete(u.id);else w.hit(u,1e9,[],1,kind==='enemy'?'terran':'zerg');assert.equal(d.update(w,true,true).casualty,false,kind);}
});
test('a delayed render retains the remaining casualty fade instead of missing the death',()=>{
 const w=world(),d=new BattleDistress();d.update(w,true,true);w.time=1;w.hit(w.allies()[0],1e9,[],1,'zerg');w.time=2;assert.ok(d.update(w,true,true).opacity>0);w.time=4;assert.equal(d.update(w,true,true).opacity,0);
});
test('Boss arrival shakes once, increases casualty edge, and multiple bosses have a bounded intensity',()=>{
 const w=world(),d=new BattleDistress();d.update(w,true,true);w.time=.5;w.spawnSpecial('zergling','boss',{x:20,z:20});d.update(w,true,true);w.time=.6;const arrival=d.update(w,true,true);assert.ok(arrival.boss);assert.ok(Math.abs(arrival.shakeX)>0);assert.ok(arrival.opacity>.15);w.hit(w.allies()[0],1e9,[],1,'zerg');assert.ok(d.update(w,true,true).opacity>.5);w.spawnSpecial('roach','lord',{x:25,z:20});assert.ok(d.update(w,true,true).opacity<=.64);w.time=4;assert.equal(d.update(w,true,true).shakeX,0);
});
test('already present Boss on initial display does not replay its entrance; pause and settings suppress animation',()=>{
 const w=world(),d=new BattleDistress();w.spawnSpecial('zergling','boss',{x:20,z:20});assert.equal(d.update(w,true,true).shakeX,0);w.time=.1;assert.equal(d.update(w,true,true).shakeX,0);w.paused=true;assert.equal(d.update(w,true,true).opacity,0);w.time=.2;w.paused=false;assert.equal(d.update(w,true,true).shakeX,0);w.time=.3;w.spawnSpecial('roach','boss',{x:25,z:20});d.update(w,true,true);w.time=.4;assert.equal(d.update(w,false,true).shakeX,0);assert.equal(d.update(w,true,false).shakeX,0);w.phase='reward';assert.equal(d.update(w,true,true).opacity,0);
});
test('reset, rewind and fresh run never reuse old death or Boss animations',()=>{
 const w=world(),d=new BattleDistress();d.update(w,true,true);w.time=2;w.hit(w.allies()[0],1e9,[],1,'zerg');assert.equal(d.update(w,true,true).casualty,true);d.reset();assert.equal(d.update(w,true,true).casualty,false);w.time=0;assert.equal(d.update(w,true,true).casualty,false);w.runId+='-new';assert.equal(d.update(w,true,true).casualty,false);
});
test('removed enemy telegraphs remain minimap data, player scan and resolved effects are excluded',()=>{
 const w=world();w.hiveWarningPoint={x:10,z:10};w.effects.push({id:1,kind:'scan-warning',source:99,owner:'zerg',x:5,z:5,end:{x:5,z:5},radius:12,until:3});w.expedition.detectionFields.push({id:2,x:0,z:0,team:'player',radius:12,until:3},{id:3,x:10,z:10,team:'enemy',radius:12,until:3});const before=structuredClone(w.captureRun());assert.equal(minimapThreats(w).length,3);assert.deepEqual(w.captureRun(),before);w.time=4;assert.equal(minimapThreats(w).length,1);
});
test('insufficient resource labels distinguish real injuries and unavailable services without modifying quotes',()=>{
 const w=world();w.endStage();w.skipReward();w.wallet={minerals:0,gas:0};const full=renderRepairs(w);assert.doesNotMatch(full,/资源不足/);w.allies()[0].hp=1;const before=structuredClone(w.captureRun());assert.match(renderRepairs(w),/资源不足/);const html=renderIntermission(w,'',new IntermissionNavigation());if(w.rerollCost()>0)assert.match(html,/class="purchase-shortfall">资源不足/);assert.deepEqual(w.captureRun(),before);
});
