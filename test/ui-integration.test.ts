import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import {PointerCommitGuard} from '../src/ui/presentation/navigation';
import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {ALL_FAMILIES,familyRace} from '../src/data/races';
import {ELITES} from '../src/data/elites';
import {HEROES,type HeroId} from '../src/data/heroes';
import {acquireExpeditionHero} from '../src/simulation/combat/expedition-heroes';
import {renderUnitInspector,inspectorStats,type UnitSeat} from '../src/ui/presentation/unit-inspector';
import {catalogue,renderIntermission,IntermissionNavigation} from '../src/ui/presentation/intermission';
import {encodeGraph} from '../src/persistence/graph-codec';
import {createHash} from 'node:crypto';
const snapshot=(w:World)=>createHash('sha256').update(JSON.stringify(encodeGraph({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}))).digest('hex');

test('formal inspection renders all 690 body/rank combinations without mutating the complete archive',()=>{
 let count=0;
 for(const rank of [1,2,3,4,5])for(const id of [...ALL_FAMILIES,...Object.keys(ELITES),...Object.keys(HEROES)]){
  const hero=HEROES[id as HeroId],elite=ELITES[id as keyof typeof ELITES],family=elite?.family??(hero?.baseFamily??id) as typeof ALL_FAMILIES[number];
  const w=new World({race:hero?.race??familyRace(family),sandbox:true,waves:false,terrain:false,obstacles:[],seed:10608});w.start();w.entities.clear();
  let u;if(hero){for(let i=0;i<rank;i++)assert.ok(acquireExpeditionHero(w,id as HeroId,()=>true));u=w.heroEntity(id as HeroId)!;}else{u=w.addUnit(family,'terran',0,0,rank);if(elite){u.eliteId=elite.id;w.refreshStats(u,true);}}
  u.hp=Math.max(1,u.maxHp*.43);if(u.maxShield)u.shield=u.maxShield*.37;if(u.maxEnergy)u.energy=u.maxEnergy*.29;
  const seat:UnitSeat={key:id,unit:u,bodies:[u],name:hero?.name??elite?.name??id,image:'',hero:hero?id as HeroId:undefined,family:hero?undefined:family};
  const before=snapshot(w),stats=inspectorStats(w,u);assert.equal(stats.damage,u.weaponDamage);assert.equal(stats.armor,u.armor);
  for(const tab of ['stats','abilities','army'] as const){const html=renderUnitInspector(w,seat,[seat],tab,new Set(['active','passive','native','elite','weapon']));assert.ok(html.includes('inspector-content'));assert.ok(!/NaN|undefined|Infinity/.test(html),id+':'+rank+':'+tab);}
  assert.equal(snapshot(w),before,id+':'+rank);count++;
 }
 assert.equal(count,690);
});

test('catalogue and multi-level intermission navigation are read-only for all races',()=>{
 for(const race of ['terran','zerg','protoss'] as const){
  const w=new World({race,sandbox:true,waves:false,terrain:false});w.start();const before=snapshot(w),nav=new IntermissionNavigation();
  nav.sync(w);
  for(const filter of ['ordinary','elite','hero','development','support','training'] as const){nav.filter=filter;const items=catalogue(w,filter);assert.ok(items.length);if(filter==='ordinary')assert.equal(items.length,10);if(filter==='elite')assert.equal(items.length,30);if(filter==='hero')assert.equal(items.length,6);
   nav.push({page:'catalog'});assert.equal(nav.current.page,'root');for(const item of items){nav.push({page:'catalog-detail',id:item.id});assert.equal(nav.current.page,'root');}assert.doesNotMatch(renderIntermission(w,'',nav),/data-page="catalog"/);
  }
  assert.equal(snapshot(w),before);
 }
});

test('defeated, regenerating and twin inspection states are distinct and read-only',()=>{
 const w=new World({race:'zerg',sandbox:true,waves:false,terrain:false});w.start();
 const a=w.addUnit('zergling','terran',0,0,1),b=w.addUnit('zergling','terran',1,0,1);a.hp=3;b.hp=7;
 const twin:UnitSeat={key:'pair',family:'zergling',unit:a,bodies:[a,b],name:'跳虫',image:''};
 const dead:UnitSeat={key:'hero',hero:'dehaka',bodies:[],name:'德哈卡',image:'',defeated:true};
 const regrow:UnitSeat={key:'regrow',family:'baneling',bodies:[],name:'爆虫',image:'',regrowAt:w.tick+300};
 const before=snapshot(w);
 assert.match(renderUnitInspector(w,twin,[twin],'stats',new Set()),/跳虫 ②/);
 assert.match(renderUnitInspector(w,dead,[dead],'stats',new Set()),/英雄已阵亡/);
 assert.match(renderUnitInspector(w,regrow,[regrow],'stats',new Set()),/重生/);
 assert.equal(snapshot(w),before);
});


test('successful purchase guard prevents mouse and touch click-through without blocking other controls or keyboard',()=>{
 const guard=new PointerCommitGuard(),tap={detail:1,clientX:100,clientY:200};
 assert.equal(guard.blocks(tap,0),false);guard.commit(tap,0);
 assert.equal(guard.blocks({...tap,detail:2},20),true);
 assert.equal(guard.blocks({...tap,clientX:103},100),true);
 assert.equal(guard.blocks({...tap,detail:0},100),false);
 assert.equal(guard.blocks({...tap,clientX:300},100),false);
 assert.equal(guard.blocks(tap,351),false);
});

test('live inspection leaves same-archive, same-tick, same-command combat identical for each race at a fixed BattleView',()=>{
 const polygon=[{x:-40,z:-40},{x:40,z:-40},{x:40,z:40},{x:-40,z:40}],view={ground:polygon,air:polygon,occludedGround:[],occludedAir:[]};
 for(const [race,hero] of [['terran','tosh'],['zerg','kerrigan'],['protoss','fenix']] as const){
  const baseline=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10608});baseline.start();assert.ok(baseline.acquireHero(hero));
  const enemy=baseline.addUnit('roach','zerg',8,2);enemy.maxHp=enemy.hp=1e7;enemy.nextShotAt=1e9;enemy.moveSpeed=0;baseline.hash.rebuild(baseline.entities.values());
  const archive=baseline.captureRun(),inspected=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:10608,permanentProfile:PermanentProfile.parseJSON(baseline.permanentProfile.exportJSON())!});baseline.restoreRun(archive);inspected.restoreRun(archive);baseline.paused=inspected.paused=false;assert.equal(snapshot(inspected),snapshot(baseline),race+':initial');
  for(let tick=0;tick<180;tick++){
   for(const w of [baseline,inspected])w.input={x:tick<60?.2:0,z:tick>=60&&tick<120?.2:0};
   if(tick%60===0)assert.equal(inspected.castHero(hero,view),baseline.castHero(hero,view));
   baseline.step();inspected.step();
   if(tick%6===0){const seats:UnitSeat[]=inspected.allies().map(u=>({key:String(u.id),unit:u,bodies:[u],hero:u.heroId,family:u.heroId?undefined:u.unitType as UnitSeat['family'],name:u.heroId??u.unitType,image:''}));for(const seat of seats)for(const tab of ['stats','abilities','army'] as const)renderUnitInspector(inspected,seat,seats,tab,new Set(['active','passive','weapon']));}
   if(tick%30===0)assert.equal(snapshot(inspected),snapshot(baseline),race+':'+tick);
  }
  assert.equal(snapshot(inspected),snapshot(baseline),race);
 }
});
