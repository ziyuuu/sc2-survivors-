import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {newEquipmentAccount} from '../src/simulation/starship/inventory';
import {spawnFunEncounter,tickExpandedEncounters,requestFunAttack} from '../src/simulation/encounters/expanded';
import {CORRUPT,corruptSiteBodies} from '../src/simulation/encounters/corrupted-protoss';
import {distance} from '../src/simulation/movement/steering';
import {flushEncounterRewards} from '../src/simulation/encounters/runtime';
import {beginSpecialStage,finishSpecialStage} from '../src/simulation/special-stages/runtime';
import {MAP_THEMES,campaignTerrain,type CampaignTheme} from '../src/data/campaign-map';
import {validateEncounterState} from '../src/simulation/encounters/state';

function world(){const w=new World({difficulty:'hard',seed:529,sandbox:true,waves:false,terrain:new FlatTerrain(),obstacles:[],equipmentAccount:newEquipmentAccount()});assert.ok(w.start());w.stage=6;w.prepareStage();w.pods=[];w.encounters.enabled=false;w.missions.enabled=false;return w;}
function spawn(w=world()){assert.ok(spawnFunEncounter(w,'corruptedProtoss',{x:22,z:0}));return {w,m:w.encounters.expanded.short!};}
function ticks(w:World,n=1){for(let i=0;i<n;i++){w.tick++;w.time=w.tick/60;tickExpandedEncounters(w);flushEncounterRewards(w);}}
function kill(w:World,ids:number[]){for(const id of ids){const u=w.entities.get(id)!;w.hit(u,1e10,[],1,'terran',0,1);}}

test('R4 corrupt gateway occupies its full native footprint; initial 13 zealots and 7 stalkers are legal',()=>{
 const {w,m}=spawn(),units=m.actors.map(id=>w.entities.get(id)!);assert.equal(units.length,20);assert.equal(units.filter(u=>u.unitType==='zealot').length,13);assert.equal(units.filter(u=>u.unitType==='stalker').length,7);
 assert.equal(m.corrupt!.spawned,20);assert.equal(corruptSiteBodies(w)[0].model,'gateway');assert.equal(m.corrupt!.site.unitRadius,3.4);
 for(const u of units)assert.ok(distance(u,m.point)>=u.unitRadius+CORRUPT.siteRadius);
 const site=m.corrupt!.site;assert.equal(w.targetAllowed(w.allies()[0],site),false);w.hit(site,1e9,[],1,'terran');assert.equal(site.hp,1);
});
test('R4 exactly 10 survivors do not trigger; 9 start a full five seconds, with cumulative 40 and no refill thereafter',()=>{
 const {w,m}=spawn();kill(w,m.actors.slice(0,10));ticks(w,600);assert.equal(m.corrupt!.reinforceAt,undefined);assert.equal(m.corrupt!.spawned,20);
 kill(w,m.actors.slice(0,1));ticks(w);assert.equal(m.corrupt!.reinforceAt,m.clock+300);ticks(w,299);assert.equal(m.actors.length,9);ticks(w);assert.equal(m.actors.length,20);assert.equal(m.corrupt!.spawned,31);
 kill(w,m.actors.slice(0,11));ticks(w,301);assert.equal(m.actors.length,18);assert.equal(m.corrupt!.spawned,40);kill(w,m.actors.slice(0,9));ticks(w,1200);assert.equal(m.actors.length,9);assert.equal(m.corrupt!.spawned,40);
});
test('R4 a wipe on the reinforcement deadline wins first and pays the completion only once',()=>{
 const {w,m}=spawn();kill(w,m.actors.slice(0,11));ticks(w);const end=m.corrupt!.reinforceAt!;ticks(w,end-m.clock-1);kill(w,m.actors);ticks(w);
 assert.equal(w.encounters.expanded.short,null);assert.equal(m.corrupt!.spawned,20);assert.equal(corruptSiteBodies(w).length,0);const drops=Object.keys(w.starship.account.items);assert.equal(drops.length,m.plans[0].items.length);ticks(w,600);assert.deepEqual(Object.keys(w.starship.account.items),drops);
});
test('R4 blocked reinforcement positions produce no bodies and do not consume the remaining lifetime budget',()=>{
 const {w,m}=spawn();kill(w,m.actors.slice(0,11));ticks(w);const terrain=w.terrain!,can=terrain.canOccupy;terrain.canOccupy=()=>false;ticks(w,300);assert.equal(m.actors.length,9);assert.equal(m.corrupt!.spawned,20);terrain.canOccupy=can;
});
test('R4 full native idle simulation patrols beside the building without chasing or auto-provoking the player',()=>{
 const {w,m}=spawn(),starts=new Map(m.actors.map(id=>[id,{...w.entities.get(id)!}]));let moving=0,max=0,min=100;
 for(let n=0;n<600;n++){w.step();for(const id of m.actors){const u=w.entities.get(id)!;max=Math.max(max,distance(u,m.point));min=Math.min(min,distance(u,m.point)-u.unitRadius);if(u.action==='move')moving++;}}
 assert.equal(m.attackRequested,undefined);assert.ok(moving>1000);assert.ok(max<7,'patrol radius '+max);assert.ok(min>=CORRUPT.siteRadius-.03,'footprint '+min);assert.ok(m.actors.some(id=>distance(w.entities.get(id)!,starts.get(id)!)>1));
});
test('R4 native guard weapons engage nearby ordinary bugs while the distant player remains neutral',()=>{
 const {w,m}=spawn(),s=m.actors.map(id=>w.entities.get(id)!).find(u=>u.unitType==='stalker')!,e=w.addUnit('roach','zerg',s.x+2,s.z);e.hp=e.maxHp=100000;e.moveSpeed=0;e.weaponDamage=0;
 const hp=w.allies()[0].hp;w.advance(3);assert.ok(e.hp<100000);assert.equal(w.allies()[0].hp,hp);assert.equal(m.attackRequested,undefined);assert.ok(m.actors.some(id=>(w.entities.get(id)?.shotSequence??0)>0));
});
test('R4 native move into eight metres provokes, retreat ends at the site leash without resetting wounds',()=>{
 const {w,m}=spawn();const hit=w.hit.bind(w);w.hit=(target,...args)=>{if(target.owner!=='terran')return hit(target,...args);};w.issueMove({x:15,z:0});
 for(let n=0;n<1200&&!m.attackRequested;n++)w.step();assert.equal(m.attackRequested,true);
 const wounded=w.entities.get(m.actors[0])!;wounded.hp=wounded.maxHp*.5;const hp=wounded.hp;w.issueMove({x:-20,z:0});let max=0;
 for(let n=0;n<2100;n++){w.step();for(const id of m.actors)max=Math.max(max,distance(w.entities.get(id)!,m.point));}
 assert.ok(w.anchor.x< -18);assert.ok(max<=CORRUPT.leash+.5,'chase radius '+max);assert.ok(m.actors.every(id=>distance(w.entities.get(id)!,m.point)<7));assert.equal(wounded.hp,hp);
});
test('R4 explicit attack activates guards and special-scene freezing preserves the entire site transaction',()=>{
 const {w,m}=spawn();assert.ok(requestFunAttack(w,'corruptedProtoss'));assert.equal(m.attackRequested,true);kill(w,m.actors.slice(0,11));ticks(w);const before=structuredClone(m);
 assert.ok(beginSpecialStage(w,'resources','fixture'));w.advance(10);assert.ok(finishSpecialStage(w,'timeout'));assert.deepEqual(w.encounters.expanded.short,before);validateEncounterState(w.encounters,w.entities);
});
for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[])test(`R4 ${theme}: native building footprint and 20 patrol bodies fit the actual map`,()=>{
 const w=new World({difficulty:'hard',seed:529,terrain:campaignTerrain({version:3,seed:529,theme}),waves:false,equipmentAccount:newEquipmentAccount()});assert.ok(w.start());w.stage=6;w.prepareStage();w.encounters.enabled=false;w.missions.enabled=false;w.pods=[];for(const [id,u] of w.entities)if(u.owner==='zerg')w.entities.delete(id);
 assert.ok(spawnFunEncounter(w,'corruptedProtoss'));const m=w.encounters.expanded.short!,site=m.corrupt!.site;assert.ok(w.terrain!.canOccupy(site,site.unitRadius));w.advance(3);
 for(const id of m.actors){const u=w.entities.get(id)!;assert.ok(w.terrain!.canOccupy(u,u.unitRadius));assert.ok(distance(u,site)>=site.unitRadius+u.unitRadius-.04);assert.ok(distance(u,site)<7);}
});
