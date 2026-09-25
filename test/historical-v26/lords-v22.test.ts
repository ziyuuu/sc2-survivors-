import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {STAGES,stageConfig,stageSchedule} from '../src/data/stages';
import {BOSSES} from '../src/data/enemies';

test('one random lord appears from stage seven onward, separate from fixed Boss events and wave budgets',()=>{
 for(const stage of STAGES){const cfg=stageConfig(stage.id,'normal'),schedule=stageSchedule(cfg,8672),lords=schedule.specials.filter(e=>e.tier==='lord'),bosses=schedule.specials.filter(e=>e.tier==='boss');
  assert.equal(lords.length,stage.id>=7?1:0);assert.equal(bosses.length,BOSSES[stage.id]?1:0);
  if(lords.length)assert.ok(lords[0].at>0&&lords[0].at<cfg.durationSeconds);
 }
});

test('a stage-twelve lord has one trait, fixed level V, and a distinct reward',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();w.stage=12;const lord=w.spawnSpecial('hydralisk','lord',{x:12,z:0})!;
 assert.equal(lord.enemyLevel,5);assert.ok(lord.lordTrait);assert.match(lord.enemyName!,/V阶领主/);
 assert.equal(lord.maxHp,BOSSES[9].hp*.9*2);const before=w.rewardDrops.length;w.hit(lord,1e9);assert.equal(w.rewardDrops.length,before+1);w.hit(lord,1e9);assert.equal(w.rewardDrops.length,before+1);
});

test('a lord warning skill adds one maximum-HP hit across overlapping bile points',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();w.stage=12;const marine=w.allies()[0],lord=w.spawnSpecial('ravager','lord',{x:4,z:0})!;marine.hp=marine.maxHp=500;
 w.hash.rebuild(w.entities.values());w.enemySpecials.casts.push({id:1,source:lord.id,tier:'lord',kind:'bile',origin:{x:4,z:0},point:{x:0,z:0},points:[{x:0,z:0},{x:0,z:0}],angle:0,at:0,damage:60,count:2,range:9,radius:1,level:5,percent:.1});
 w.enemySpecials.update(1/60);assert.equal(marine.hp,390);
});

test('killing a carapace lord removes its armor aura on the next simulation update',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],initial:['marine']});w.start();w.stage=12;const lord=w.spawnSpecial('roach','lord',{x:3,z:0})!,ling=w.addUnit('zergling','zerg',5,0);lord.lordTrait='carapace';w.hash.rebuild(w.entities.values());(w as any).updateAuras();assert.equal(w.auraArmor.get(ling.id),3);
 w.hit(lord,1e9);w.hash.rebuild(w.entities.values());(w as any).updateAuras();assert.equal(w.auraArmor.get(ling.id),undefined);
});
