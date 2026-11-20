/** Design arithmetic only. Does not implement or claim to playtest the proposed units. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {campaign18StageConfig,campaign18Schedule,CAMPAIGN18_WEIGHTS,CAMPAIGN18_STAGES} from '../src/data/campaign18';
import {mixCampaignWaves,ambientResources} from '../src/data/mixed-waves';
import {continuousOrdinaryGrowth,campaignProgress} from '../src/data/enemy-tuning';
import {endlessRoundDuration} from '../src/data/endless';
import {rankStats} from '../src/data/ranks';
import type {Difficulty} from '../src/data/stages';

const design=JSON.parse(fs.readFileSync(fileURLToPath(new URL('../docs/project/zerg-six-design-20261120.json',import.meta.url)),'utf8'));
const difficulties:Difficulty[]=['easy','normal','hard','hell'];
type Spawn={id:string;at:number;family:string;hp:number;armor:number;damage:number;reward:number[];role:string};
const add=(a:number,b:number)=>a+b;
const count=(stage:number,d:Difficulty)=>design.families.map((_:string,i:number)=>{
 const rule=design.campaign[d],age=stage-rule.first[i];
 return age<0?0:Math.min(rule.cap[i],1+Math.floor(age*rule.growthNumerator/rule.growthDenominator));
});
const sequence=(counts:number[])=>{
 const used=counts.map(()=>0),result:number[]=[];
 while(used.some((n,i)=>n<counts[i])){
  const next=counts.map((n,i)=>i).filter(i=>used[i]<counts[i]).sort((a,b)=>used[a]/counts[a]-used[b]/counts[b]||a-b)[0];
  result.push(next);used[next]++;
 }
 return result;
};
const resources=(family:string)=>design.resources.newUnitAmbient[family]??ambientResources(family as any);
function campaign(stage:number,difficulty:Difficulty,seed:number){
 const c=campaign18StageConfig(stage,difficulty),base=campaign18Schedule(c,seed),before=JSON.stringify(base);
 const mixed=mixCampaignWaves(base.waves,stage,difficulty,seed),original:Spawn[]=[];
 const normalExpected=[0,0];let normalResourceScale={minerals:1,gas:1};
 for(const [wi,w] of mixed.entries())for(const [mi,m] of w.members!.entries()){
  const normal=m.stamp.density===1,baseDrop=resources(m.type),reward=normal?[baseDrop[0]*m.resources.minerals,baseDrop[1]*m.resources.gas]:[0,0];
  if(normal){normalResourceScale=m.resources;reward.forEach((v,i)=>normalExpected[i]+=v);}
  original.push({id:`old:${wi}:${mi}`,at:w.at+m.offset,family:m.type,hp:m.stamp.density,armor:m.stamp.density,damage:normal?1:.2,reward,role:normal?'original-primary':'experience-legacy'});
 }
 const primary=base.waves.reduce((n,w)=>n+w.types.length,0),counts=count(stage,difficulty),order=sequence(counts),additional:Spawn[]=[];
 for(const [j,i] of order.entries()){
  const family=design.families[i],drop=resources(family);
  const at=c.durationSeconds*(.32+(order.length<=1?0:.5*j/(order.length-1)));
  additional.push({id:`six:${stage}:${j}`,at,family,hp:1,armor:1,damage:1,reward:[drop[0]*normalResourceScale.minerals,drop[1]*normalResourceScale.gas],role:'six-primary'});
 }
 const chapter=Math.floor((stage-1)/3),interval=design.chaff[difficulty].beatSeconds[chapter],beats=1+Math.floor((c.durationSeconds-design.chaff.stopBeforeEnd-design.chaff.firstAt)/interval);
 const target=Math.max(Math.floor(primary*design.chaff[difficulty].chapterRatio[chapter]+.5),beats),brittle=stage>=4?Math.floor(primary*design.brittle.primaryRatio[difficulty]+.5):0,chaff:Spawn[]=[],thin:Spawn[]=[];
 const previous=new Set(CAMPAIGN18_STAGES.slice(0,stage-1).flatMap(s=>Object.entries(s.mix).filter(([,n])=>n>0).map(([f])=>f)));
 let serial=0,thinBefore=0;const thinBeats=Math.floor(beats/3);
 for(let beat=0;beat<beats;beat++){
  const at=design.chaff.firstAt+beat*interval,n=Math.floor(target*(beat+1)/beats+.5)-Math.floor(target*beat/beats+.5),packet=design.chaff[difficulty].packet;
  const thinAfter=(beat+1)%3===0?Math.floor(brittle*((beat+1)/3)/thinBeats+.5):thinBefore,extra=thinAfter-thinBefore;
  for(let j=0;j<n+extra;j++){
   const selected=design.chaff.cycle[(stage*31+serial)%20],allowed=previous.has(selected)||original.some(e=>e.role==='original-primary'&&e.family===selected&&e.at<=at),family=allowed?selected:'zergling';
   const hp=j<n?.05:design.brittle.cycleHpArmor[(thinBefore+j-n)%3];
   const spawn={id:`experience:${stage}:${serial++}`,at:at+Math.floor(j/packet)*design.chaff.packetSpacing+(j%packet)*design.chaff.memberSpacing,family,hp,armor:hp,damage:.2,reward:[0,0],role:j<n?'experience5':'experience-thin'};
   (j<n?chaff:thin).push(spawn);
  }
  thinBefore=thinAfter;
 }
 assert.equal(JSON.stringify(base),before,'append must not mutate the old schedule or reserves');
 assert.equal(original.filter(e=>e.role==='original-primary').length,primary);
 assert.equal(chaff.length,target);
 assert.equal(thin.length,brittle);
 assert.equal(additional.length,counts.reduce(add,0));
 assert.equal(new Set([...original,...additional,...chaff,...thin].map(e=>e.id)).size,original.length+additional.length+chaff.length+thin.length);
 assert.ok([...additional,...chaff,...thin].every(e=>e.at>=0&&e.at<c.durationSeconds),`new spawn outside stage ${difficulty}/${stage}`);
 for(let j=1;j<additional.length;j++)assert.ok(additional[j].at-additional[j-1].at>=.6-1e-8);
 assert.ok(chaff.every(e=>e.hp===.05&&e.damage===.2));
 const actualCost=base.waves.reduce((n,w)=>n+w.types.reduce((v,t)=>v+CAMPAIGN18_WEIGHTS[t],0),0);
 assert.equal(actualCost,base.accounting.waves,'old threat budget remains intact');
 const all=[...original,...additional,...chaff,...thin],actual=[0,0];
 for(const e of all){if(e.role.startsWith('experience'))assert.deepEqual(e.reward,[0,0]);if(e.role==='original-primary'){assert.equal(e.hp,1);assert.equal(e.damage,1);e.reward.forEach((v,i)=>actual[i]+=v);}}
 assert.deepEqual(actual,normalExpected,'experience must not dilute or compensate existing normal drops');
 // Stored, sorted plan restores byte-identically; this is not a production savegame test.
 const ordered=all.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));assert.deepEqual(JSON.parse(JSON.stringify(ordered)),ordered);
 return {primary,old:original.length,six:additional.length,chaff:chaff.length,thin:thin.length,beats,beatSeconds:interval,total:all.length,increase:(additional.length+chaff.length+thin.length)/original.length};
}

assert.equal(design.status,'design-only');assert.equal(new Set(design.families).size,6);
assert.deepEqual(design.resources.experience,[0,0]);assert.equal(design.chaff.rewardProfile,'none');
assert.equal(design.chaff.rescueNeutral,true);assert.equal(design.chaff.normalKillCredit,false);
const spec=fs.readFileSync(fileURLToPath(new URL('../docs/project/ZERG_SIX_UNITS_CODE_SPEC_20261120.md',import.meta.url)),'utf8');
// Check the human handoff table against the machine-readable quota source.
for(let stage=4;stage<=18;stage++){
 const line=spec.split(/\r?\n/).find(line=>line.startsWith(`| ${stage} |`)&&line.includes('/'));
 assert.ok(line,`missing handoff row ${stage}`);
 const cells=line.split('|').slice(2,-1).map(s=>s.trim());
 assert.deepEqual(cells,difficulties.map(d=>count(stage,d).join('/')),`handoff/config disagreement at ${stage}`);
}
for(const f of design.families)assert.ok(design.friendly[f].firstBattle>=1&&design.friendly[f].trainingSeconds>0);
const fractions=design.chaff.cycle.reduce((a:Record<string,number>,t:string)=>(a[t]=(a[t]??0)+1,a),{});
assert.deepEqual(fractions,{zergling:17,roach:2,baneling:1});
let cases=0;const ranges:Record<string,{min:number;max:number}>={},sample:unknown[]=[];
for(const d of difficulties){
 ranges[d]={min:Infinity,max:0};
 for(let stage=1;stage<=18;stage++)for(let seed=1;seed<=32;seed++){
  const result=campaign(stage,d,seed);cases++;ranges[d].min=Math.min(ranges[d].min,result.increase);ranges[d].max=Math.max(ranges[d].max,result.increase);
  if(seed===17&&[6,12,18].includes(stage))sample.push({difficulty:d,stage,...result});
 }
 for(let i=0;i<6;i++){
  const first=design.campaign[d].first[i];assert.equal(count(first,d)[i],1);if(first>1)assert.equal(count(first-1,d)[i],0);
 }
}
let rankCases=0;
for(let r=1;r<=12;r++)for(const f of design.families){
 const u=design.friendly[f],R=rankStats(r),expected=r<=5?r:r===6?6.8:9+2.2*(r-7),base=(u.damageReference??u.damage)/(u.periodReference??u.period);
 assert.ok(Math.abs((base*R.damage*R.attackSpeed)-base*expected)<1e-8,'weapon and child DPS must follow the established rank budget once');assert.ok(R.health>0&&R.armor>=0);rankCases++;
}
let endlessCases=0;
for(const d of difficulties){
 const counts=design.endless.countPerWindow[d],order=sequence(counts),times=(minute:number)=>order.map((family:number,j:number)=>({id:`${minute}:${j}`,family,at:minute*60+8+46*(j+.5)/order.length}));
 const duration=Array.from({length:36},(_,i)=>endlessRoundDuration(i+1)).reduce(add,0),full=Array.from({length:Math.ceil(duration/60)},(_,i)=>times(i)).flat().filter(x=>x.at<duration);
 const restored:typeof full=[];let from=0;
 for(let round=1;round<=36;round++){
  const to=from+endlessRoundDuration(round);
  const part=Array.from({length:Math.ceil(to/60)-Math.floor(from/60)},(_,i)=>times(Math.floor(from/60)+i)).flat().filter(x=>x.at>=from&&x.at<to);
  restored.push(...JSON.parse(JSON.stringify(part)));from=to;endlessCases++;
 }
 assert.deepEqual(restored,full,'round boundaries must not duplicate or lose new-unit quotas');assert.equal(new Set(restored.map(e=>e.id)).size,restored.length);
 assert.ok(design.caps.enemyLocust[d]+design.caps.enemyBroodling[d]<=30);
 assert.ok(design.chaff[d].alive<=180&&design.caps.newTotal[d]<=18);
 const spacing=design.endless.experienceBeatSeconds[d],beats=Array.from({length:Math.max(0,Math.ceil((duration-6)/spacing))},(_,i)=>6+i*spacing).filter(t=>t<duration);
 const beatSlices:number[]=[];let start=0;
 for(let round=1;round<=36;round++){
  const end=start+endlessRoundDuration(round),first=Math.max(0,Math.ceil((start-6)/spacing-1e-9)),last=Math.ceil((end-6)/spacing-1e-9);
  for(let i=first;i<last;i++)beatSlices.push(6+i*spacing);start=end;
 }
 assert.deepEqual(beatSlices,beats,'independent experience cadence must not restart on round changes');
}
console.log(JSON.stringify({kind:'design-arithmetic-not-gameplay',campaignCases:cases,endlessRoundCases:endlessCases,rankFormulaCases:rankCases,increaseRanges:ranges,sample},null,2));
if(process.argv.includes('--tables')){
 for(const d of difficulties){console.log(`\n${d}\n| 关卡 | 畸变体 | 吞噬者 | 感染虫 | 宿主 | 飞蛇 | 巢虫领主 |`);console.log('|---|---|---|---|---|---|---|');for(let stage=1;stage<=18;stage++)console.log(`| ${stage} | ${count(stage,d).join(' | ')} |`);}
 console.log('\nNormal stage 18, scheduled halfway, full-body base (before armor, equipment and geometry):');
 const G=continuousOrdinaryGrowth('normal',campaignProgress(18,75,150));
 for(const f of design.families){const u=design.enemyBase[f];console.log(`${f}: hp=${(u.hp*G.health).toFixed(2)} armor=${(u.armor+G.armor).toFixed(3)} hit=${(u.damage*G.damage).toFixed(2)} period=${(u.period/G.attackSpeed).toFixed(3)}`);}
}
