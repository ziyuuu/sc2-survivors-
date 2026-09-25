import test from 'node:test';
import assert from 'node:assert/strict';
import {MVP_TALENTS,allocationCost,allocationPoints,validateTalentAllocation,TALENT_BY_ID} from '../src/data/mvp-talents';
import {PermanentProfile} from '../src/simulation/progression/permanent-profile';
import type {Race} from '../src/data/races';
import {World} from '../src/simulation/world';
import {writeArchive,readArchive} from '../src/persistence/archive';

const races=['terran','zerg','protoss'] as const;
const prefix:Record<Race,string>={terran:'T',zerg:'Z',protoss:'P'};
function build(race:Race,parts:Record<'R'|'S'|'A'|'M',number|Record<number,number>>){
 const levels:Record<string,number>={};
 for(const [line,limit] of Object.entries(parts) as ['R'|'S'|'A'|'M',number|Record<number,number>][])for(let n=1;n<=(line==='M'?7:16);n++){
  const id=`${prefix[race]}-${line}${String(n).padStart(2,'0')}`,node=TALENT_BY_ID.get(id)!;
  const rank=typeof limit==='number'?(n<=limit?node.maxRank:0):limit[n]??0;
  if(rank)levels[id]=rank;
 }
 return levels;
}

test('approved M2 data has 165 definitions and exact per-line level and resource totals',()=>{
 assert.equal(MVP_TALENTS.length,165);assert.equal(new Set(MVP_TALENTS.map(n=>n.id)).size,165);
 for(const race of races){
  assert.equal(MVP_TALENTS.filter(n=>n.race===race).length,55);
  for(const line of ['resources','soldiers','army','micro'] as const){const nodes=MVP_TALENTS.filter(n=>n.race===race&&n.line===line);
   assert.equal(nodes.length,line==='micro'?7:16);
   assert.equal(nodes.reduce((n,node)=>n+node.maxRank,0),line==='micro'?17:41);
   assert.equal(nodes.reduce((n,node)=>n+node.maxRank*node.resourceCost,0),line==='micro'?64:59);
  }
 }
});
test('all four approved 80-point builds are legal for all three races',()=>{
 for(const race of races){
  const builds=[
   [build(race,{R:16,S:{...Object.fromEntries(Array.from({length:13},(_,i)=>[i+1,TALENT_BY_ID.get(`${prefix[race]}-S${String(i+1).padStart(2,'0')}`)!.maxRank])),14:2,15:1},A:0,M:0}),110],
   [build(race,{R:0,S:16,A:{...Object.fromEntries(Array.from({length:14},(_,i)=>[i+1,TALENT_BY_ID.get(`${prefix[race]}-A${String(i+1).padStart(2,'0')}`)!.maxRank])),16:1},M:0}),112],
   [build(race,{R:10,S:10,A:{...Object.fromEntries(Array.from({length:10},(_,i)=>[i+1,TALENT_BY_ID.get(`${prefix[race]}-A${String(i+1).padStart(2,'0')}`)!.maxRank])),9:1},M:0}),97],
   [build(race,{R:16,S:{...Object.fromEntries(Array.from({length:7},(_,i)=>[i+1,3])),8:1},A:0,M:7}),146]
  ] as const;
  for(const [levels,cost] of builds){assert.equal(validateTalentAllocation(race,levels),null);assert.equal(allocationPoints(levels),80);assert.equal(allocationCost(levels),cost);}
 }
});
test('each race keeps its own level and wallet; refunds, revisions and prices remain atomic',()=>{
 const profile=new PermanentProfile(200),levels=build('terran',{R:16,S:0,A:0,M:0});
 const first=profile.previewTalentAllocation('terran',0,levels)!;
 assert.equal(first.allocated,41);assert.equal(first.cost,59);assert.equal(profile.commitTalentAllocation(first,first.expectedRevision),true);
 assert.equal(profile.balance,141);assert.equal(profile.playerLevel,41);
 assert.equal(profile.commitTalentAllocation(first,first.expectedRevision),false);
 assert.equal(profile.savePresetBlueprint('zerg',1,build('zerg',{R:16,S:0,A:0,M:7})),true);
 assert.equal(profile.activatePreset('zerg',1),false,'Terran resources cannot pay for Zerg');
 assert.equal(profile.raceBalance('terran'),141);assert.equal(profile.levelFor('terran'),41);
 assert.equal(profile.award('zerg:fixture',200,'zerg'),true);
 const snapshot=profile.exportJSON();assert.equal(profile.activatePreset('zerg',1),true);assert.equal(profile.balance,77);
 assert.equal(profile.raceBalance('terran'),141);assert.equal(profile.levelFor('terran'),41);
 assert.equal(profile.respec('micro'),true);assert.equal(profile.balance,141);
 assert.equal(profile.respec('all'),true);assert.equal(profile.balance,200);assert.equal(profile.playerLevel,0);
 assert.equal(profile.activatePreset('terran',0),true);assert.equal(profile.balance,141);assert.equal(profile.playerLevel,41);
 const restored=PermanentProfile.parseJSON(snapshot)!;assert.equal(restored.balance,141);assert.equal(restored.playerLevel,41);
 const scarce=new PermanentProfile(50);assert.equal(scarce.savePresetBlueprint('terran',1,levels),true);const before=scarce.exportJSON();assert.equal(scarce.activatePreset('terran',1),false);assert.equal(scarce.exportJSON(),before);
});
test('nonzero talents freeze into one race run and survive a save without changing difficulty',()=>{
 const profile=new PermanentProfile(),levels=build('zerg',{R:16,S:0,A:0,M:0});
 assert.equal(profile.award('zerg:seed',59,'zerg'),true);
 const quote=profile.previewTalentAllocation('zerg',0,levels)!;assert.equal(profile.commitTalentAllocation(quote,quote.expectedRevision),true);
 const world=new World({race:'zerg',difficulty:'hell',permanentProfile:profile,terrain:false,waves:false,sandbox:true});assert.equal(world.start('kerrigan'),true);assert.deepEqual([...world.heroes.keys()],['kerrigan']);
 assert.equal(world.runConfig?.frozenTalents.allocated,41);assert.equal(world.runConfig?.frozenTalents.investment,59);
 const raw=writeArchive({profile:profile.exportJSON(),run:world.captureRun()}),parsed=readArchive(raw);
 const restored=new World({race:'terran',difficulty:'easy',terrain:false,waves:false,sandbox:true});restored.restoreRun(parsed.bundle.run!);
 assert.equal(restored.runConfig?.race,'zerg');assert.equal(restored.difficulty,'hell');assert.equal(restored.paused,true);
 assert.equal(restored.talent('hero_support'),1);
});
