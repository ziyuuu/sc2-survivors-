import {test} from 'node:test';
import assert from 'node:assert/strict';
import {TALENTS,TOTAL_TALENT_COST} from '../src/data/talents';
import {TalentProfile,talentPointsForStage,talentPointsForEndlessMinute} from '../src/simulation/progression/talent-profile';
import {World} from '../src/simulation/world';

test('four seven-tier talent lines are purchasable for exactly 258 permanent points',()=>{
 assert.equal(TOTAL_TALENT_COST,258);for(const line of ['resources','soldiers','army','micro'])assert.deepEqual(new Set(TALENTS.filter(n=>n.line===line).map(n=>n.tier)),new Set([1,2,3,4,5,6,7]));
 const profile=new TalentProfile();assert.ok(profile.award('fixture',TOTAL_TALENT_COST));let bought=0;
 for(let pass=0;pass<20;pass++){let changed=false;for(const node of TALENTS)while(profile.canBuy(node.id)){assert.ok(profile.buy(node.id));bought++;changed=true;}if(!changed)break;}
 assert.equal(bought,TALENTS.reduce((n,t)=>n+t.max,0));assert.equal(profile.spent,TOTAL_TALENT_COST);assert.equal(profile.balance,0);
 assert.ok(profile.respec());assert.equal(profile.spent,0);assert.equal(profile.balance,TOTAL_TALENT_COST);
});

test('stage and endless receipts give the selected difficulty only its confirmed points once',()=>{
 for(const difficulty of ['easy','normal','hard','hell'] as const){const stageTotal=Array.from({length:12},(_,i)=>talentPointsForStage(difficulty,i+1)).reduce((a,b)=>a+b,0);
  assert.equal(stageTotal,difficulty==='hell'?12:difficulty==='hard'?8:4);assert.equal(talentPointsForEndlessMinute(difficulty),difficulty==='easy'||difficulty==='normal'?1:2);
 }
 const profile=new TalentProfile(),w=new World({sandbox:true,waves:false,terrain:false,obstacles:[],talentProfile:profile,difficulty:'hard'});w.start();w.stage=3;w.prepareStage();w.endStage();assert.equal(profile.balance,2);w.endStage();assert.equal(profile.balance,2);
 assert.equal(profile.award(w.runId+':stage:3',2),false);assert.equal(profile.balance,2);
});

test('profile validates imported snapshots and recovers an earlier local backup',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const profile=new TalentProfile(storage);profile.award('a',10);const backup=profile.exportJSON();profile.award('b',3);const current=profile.exportJSON();assert.equal(profile.balance,13);
 const imported=new TalentProfile();assert.ok(imported.importJSON(current));assert.equal(imported.balance,13);assert.equal(imported.importJSON(current.replace('"balance": 13','"balance": 99')),false);
 data.set('sc2-survivors-talents-v1','{broken');data.set('sc2-survivors-talents-v1-backup',backup);const recovered=new TalentProfile(storage);
 assert.equal(recovered.balance,10);assert.match(recovered.recoveryNotice,/备份/);
});
