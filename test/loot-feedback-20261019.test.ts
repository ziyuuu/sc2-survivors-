import test from 'node:test';
import assert from 'node:assert/strict';
import {continuousSpecialProfile} from '../src/data/enemy-tuning';
import {SC2_UNITS} from '../src/data/sc2-units';
import {World} from '../src/simulation/world';
import {campaign18Schedule,campaign18StageConfig} from '../src/data/campaign18';
import {incomeFactor} from '../src/data/stages';
import {ECONOMY} from '../src/data/economy';
import {EQUIPMENT_LOOT_STYLE} from '../src/render/units/equipment-loot-style';

test('campaign random elites vary by seed, start after the opening and conserve threat in all difficulties',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){let seen=0,absent=0;const types=new Set(),times=new Set();
  for(let seed=1;seed<=100;seed++)for(let stage=1;stage<=18;stage++){
   const config=campaign18StageConfig(stage,difficulty),plan=campaign18Schedule(config,seed*7919),elites=plan.specials.filter(e=>e.tier==='elite');
   assert.ok(elites.length<=1);if(stage<=3)assert.equal(elites.length,0);else{seen+=elites.length;absent+=Number(!elites.length);}
   for(const elite of elites){types.add(elite.type);times.add(elite.at);assert.ok(config.mix[elite.type]>0);assert.ok(elite.at>=config.durationSeconds*.35&&elite.at<config.durationSeconds*.75);}
   const a=plan.accounting;assert.equal(a.unspent,0);assert.equal(a.budget,a.waves+a.specials+a.mainHive+a.expansionHive);
  }assert.ok(seen>200&&absent>50,difficulty);assert.ok(types.size>3);assert.ok(times.size>50);
 }
});
test('gas pickup contents increase by 50 percent while minerals keep their exact amount in every difficulty',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){const w=new World({difficulty,sandbox:true,waves:false,terrain:false});w.start();w.pickups=[];
  for(const amount of [[30,15],[4,2],[3,0]] as const)w.drop({x:5,z:0},amount);
  const f=incomeFactor(difficulty)*ECONOMY.dropMultiplier;
  assert.deepEqual(w.pickups.map(p=>[p.minerals,p.gas]),[[30*f,15*f*1.5],[4*f,2*f*1.5],[3*f,0]]);
 }
});
test('all five equipment qualities have a same-color ground glow and vertical beam, including pure white',()=>{
 assert.equal(EQUIPMENT_LOOT_STYLE[1].color,0xffffff);
 for(const style of Object.values(EQUIPMENT_LOOT_STYLE)){assert.ok(style.beam>0);assert.ok(style.glow>0);}
 assert.ok(EQUIPMENT_LOOT_STYLE[5].beam>EQUIPMENT_LOOT_STYLE[1].beam);
});
test('an elite Ultralisk in stage eighteen cannot replace the final Boss kill identity',()=>{
 const w=new World({sandbox:true,waves:false,terrain:false,seed:529});w.start();w.stage=18;w.prepareStage();
 const boss=(w as any).spawnCampaignSpecial({at:45,type:'ultralisk',tier:'boss',role:'boss',budget:10});assert.ok(boss);
 const elite=(w as any).spawnCampaignSpecial({at:80,type:'ultralisk',tier:'elite',role:'captain',budget:10});assert.ok(elite);
 assert.equal(w.campaign18Runtime!.finalBossId,boss.id);w.hit(elite,1e9,[],1,'terran');assert.equal(w.campaign18Runtime!.finalBossKilled,false);
 w.hit(boss,1e9,[],1,'terran');assert.equal(w.campaign18Runtime!.finalBossKilled,true);
});

test('all elite species remain below same-progress Boss health, weapon DPS and skill damage in campaign and endless',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const)for(const type of ['queen','lurker','mutalisk','corruptor','ultralisk','zergling','roach','hydralisk','ravager'] as const)for(const stage of [4,9,18])for(const endlessSeconds of [undefined,0,360,720]){
 const d=SC2_UNITS[type],stamp={stage,progress:stage/18,density:1 as const,endlessSeconds},base={hp:d.maxHp,damage:d.attackDamage,period:d.attackPeriod,armor:d.armor},elite=continuousSpecialProfile(difficulty,type,'elite',stamp,base),boss=continuousSpecialProfile(difficulty,type,'boss',stamp,base);
 assert.ok(elite.hp<=boss.hp*.3+1e-8);assert.ok(elite.damage/elite.period<=boss.damage/boss.period*.6+1e-8);assert.ok(elite.skillDamage<=boss.skillDamage*.6+1e-8);assert.ok(elite.armor<=boss.armor);
 }
});
