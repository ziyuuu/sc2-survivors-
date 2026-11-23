import assert from 'node:assert/strict';
import {ZERG_SWARM_CARDS,type ZswCardId,type ZswShort} from '../src/data/zerg-swarm';
import {SWARM_PERIODIC,type SwarmPeriodic} from '../src/data/zerg-swarm-rules';
import {heroOptions,type ShowcaseOption} from '../preview/zerg-swarm-20261120/options';
import {swarmScenario,readScene} from '../preview/zerg-swarm-20261120/scenarios';

const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
function prepare(id:ZswCardId,rank:number,extra?:Partial<ShowcaseOption>){
 const scene=swarmScenario({id,rank,hero:'kerrigan',cargo:'delivery',...extra}),w=scene.world;
 return {scene,w,read:()=>readScene(w,scene),advance(seconds:number){w.advance(seconds);return readScene(w,scene);}};
}
type Field=ReturnType<typeof prepare>;

function observe(short:ZswShort,rank:number,field:Field,base:Field){
 const t=rank-1;
 const {w,scene,read,advance}=field;
 const state=w.expedition.zergSwarm!;
 const bodies=(source:string)=>w.allies().filter(u=>u.zergSwarm?.origin===source);
 if(Object.hasOwn(SWARM_PERIODIC,short)){
  const row=SWARM_PERIODIC[short as SwarmPeriodic],seconds=(short[0]==='P'?8:5)+row.delay+.1;
  const expected={
   W02:[4,6,8],G02:[8,10,12],G03:[4,6,8],G05:[3,4,5],G06:[2,2,3],B04:[2,3,3],B05:[3,4,6],B06:[3,4,6],
   P01:[9,9,9],P02:[3,4,5],P03:[16,20,24],P04:[4,4,4],P05:[2,3,4],P06:[4,4,4],
  }[short as SwarmPeriodic][t];
  advance(seconds);
  // A baneling may already have exploded by the observation tick. Count actual releases.
  assert.equal(short==='G02'?state.landings!.filter(l=>l.source===short).length:bodies(short).length,expected);
  near(state.clocks[short].period,row.cd[t]);
  near(bodies(short)[0].zergSwarm!.baseLife,row.life[t]);
  assert.equal(base.advance(seconds).temps,0);
  if(short==='P05')assert.ok(Object.keys(state.spores).length>0);
  if(short==='P03')near(bodies(short)[0].zergSwarm!.rush!.move,[.4,.5,.6][t]);
  return;
 }
 switch(short){
  case 'W01':
   near(read().quote/base.read().quote,[.85,.75,.65][t]);
   near(read().remaining!/base.read().remaining!,[.85,.75,.65][t]);
   break;
  case 'W03':case 'N05':
   advance(3.2);
   assert.ok(w.stats.kills>=1);
   assert.equal(bodies('spore').length,short==='W03'?1:rank+1);
   assert.equal(base.advance(3.2).units.filter(u=>u.swarm?.origin==='spore').length,short==='N05'?1:0);
   break;
  case 'W04':
   advance(.9);base.advance(.9);
   near(state.clocks.W02.next,Math.max(w.entities.get(scene.leadId)!.deadAt!+.5,base.w.expedition.zergSwarm!.clocks.W02.next-rank-1));
   assert.ok(w.entities.get(scene.leadId)!.deadAt!==null);
   break;
  case 'W05':case 'W06':
   advance(6.05);
   const wave=bodies('W02');
   assert.equal(wave.length,6);
   for(const u of wave){
    if(short==='W05'){
     const birth=u.zergSwarm!.birth!;
     near(birth.attack,[.2,.3,.4][t]);near(birth.move,[.2,.3,.4][t]);near(birth.until-u.bornAt,3+rank);
    }else{
     const shell=state.shells[u.id].birth!;
     assert.ok(shell.remaining>0&&shell.remaining/u.maxHp<=[.15,.22,.3][t]+1e-6);
     near(shell.until-u.bornAt,3+rank);
    }
   }
   if(short==='W06')near(Math.max(...wave.map(u=>state.shells[u.id].birth!.remaining/u.maxHp)),[.15,.22,.3][t]);
   break;
  case 'W07':case 'W09':case 'B07':{
   const a=advance(7),b=base.advance(7);
   const factor=Math.max(...a.units.map(u=>u.directFactor));
   assert.equal(Math.max(...b.units.map(u=>u.directFactor)),1);
   if(short==='W07')near(factor,1+[.15,.22,.3][t]);
   else if(short==='W09')near(factor,1+[.2,.3,.4][t]);
   else assert.ok(factor>=1+3*[.03,.04,.05][t]);
   break;
  }
  case 'W08':
   assert.ok(advance(6.1).damage>base.advance(6.1).damage);
   assert.ok(w.visualEvents.some(e=>e.kind==='bile-impact'&&e.entityId===0));
   break;
  case 'G01':
   assert.equal(advance(5.2).delivered,rank+1);
   {
    const alternate=prepare('ZSW-G01',rank,{cargo:'overflow'});
    alternate.advance(4.1);
    assert.equal(alternate.w.allies().filter(u=>u.zergSwarm?.origin==='overflow').length,[1,2,2][t]);
   }
   break;
  case 'G04':case 'N03':{
   advance(.9);
   const expected=short==='G04'?[.4,.55,.7][t]:[.5,.6,.7][t];
   near(state.revivals[scene.leadId].health,expected);
   advance(3);
   assert.ok(w.entities.get(scene.leadId)!.hp>0);
   if(short==='N03')assert.equal(bodies('revival-split').length,rank);
   break;
  }
  case 'G07':{
   const withCard=advance(3.1),without=base.advance(3.1);
   assert.ok(withCard.marks.length>0&&withCard.damage>without.damage);
   near(state.clocks.G07.period,[14,12,10][t]);
   break;
  }
  case 'G08':case 'B09':case 'N07':{
   const units=read().units;
   for(const u of units){
    near(u.size,short==='G08'?[.9,.85,.8][t]:short==='N07'?1-.05*rank:1);
    near(u.contact,short==='B09'?[.8,.65,.5][t]:short==='N07'?1-.05*rank:1);
    assert.equal(u.passes,short==='N07'&&rank>=(u.hero?3:u.swarm?1:2));
   }
   assert.ok(units.some(u=>u.hero)&&units.some(u=>u.swarm)&&units.some(u=>!u.hero&&!u.swarm));
   break;
  }
  case 'G09':
   advance(7.6);
   assert.equal(bodies('companion').length,rank*2);
   break;
  case 'B01':
   assert.equal(read().squads.filter(s=>s.cap===6).length,rank);
   break;
  case 'B02':{
   advance(.9);
   const result=bodies('death-split');
   assert.equal(result.length,rank);
   assert.ok(result.every(u=>u.unitType==='hydralisk'));
   break;
  }
  case 'B03':
   assert.ok(advance(.55).marks.length>=2);
   assert.equal(base.advance(.55).marks.length,1);
   advance(3.35);
   assert.ok(bodies('spore').some(u=>u.unitType==='mutalisk'));
   break;
  case 'B08':
   advance(13-rank+.1);
   near(bodies('W02')[0].zergSwarm!.mature!.health,[.2,.3,.4][t]);
   near(bodies('W02')[0].zergSwarm!.mature!.damage,[.15,.25,.35][t]);
   break;
  case 'N01':
   advance(4.1);
   assert.equal(bodies('overflow').length,rank);
   assert.equal(bodies('overflow')[0].rank,7);
   break;
  case 'N02':
   advance(3.1);
   assert.equal(bodies('live-split').length,rank*2+2);
   break;
  case 'N04':
   assert.equal(read().squads.filter(s=>s.cap===6+rank).length,3);
   break;
  case 'N06':
   advance(8.1);
   assert.equal(bodies('echo:W02').length,[2,4,8][t]);
   break;
  case 'N08':
   advance(6.1);
   for(const u of bodies('W02'))near(u.zergSwarm!.expires-u.bornAt,20*(1+.25*rank));
   break;
  case 'N09':
   assert.ok(advance(11).units.some(u=>Math.abs((u.mitigation??0)-(.15+.05*rank))<1e-6));
   break;
  case 'O01':
   assert.equal(advance(.15).units.filter(u=>u.hero==='kerrigan').length,2);
   assert.equal(base.advance(.15).units.filter(u=>u.hero==='kerrigan').length,1);
   break;
  case 'O02':{
   const {squads,squadCap}=read();
   assert.equal(squadCap,6);assert.equal(squads.length,6);
   assert.equal(squads[5].cap,Math.max(...squads.slice(0,5).map(s=>s.cap)));
   break;
  }
  case 'O03':
   assert.equal(advance(6.1).tempCap,90);
   assert.equal(bodies('W02').length,12);
   assert.equal(base.advance(6.1).temps,8);
   break;
 }
}

let total=0;
const failures:string[]=[];
for(const card of ZERG_SWARM_CARDS){
 for(let rank=1;rank<=card.maxRank;rank++){
  const field=prepare(card.id,rank),base=prepare(card.id,0);
  try{
   assert.equal(field.w.expedition.zergSwarm!.ranks[card.id],rank);
   assert.equal(base.w.expedition.zergSwarm!.ranks[card.id],undefined);
   observe(card.short,rank,field,base);
  }catch(error){failures.push(`${card.id} rank ${rank}: ${String(error)}`);}
  total++;
 }
}
assert.equal(total,129);
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
for(const hero of heroOptions){
 const field=prepare('ZSW-O01',1,{hero});
 assert.equal(field.advance(.15).units.filter(u=>u.hero===hero&&u.hp>0).length,2,hero);
}
const movement=prepare('ZSW-W02',3);
movement.advance(6.15);
assert.ok(movement.w.issueMove({x:0,z:-12}));
assert.ok(movement.advance(3).anchor.z<-10);
console.log('45 cards, 129 card options, 6 hero targets, 3 overflow cases and retreat passed.');
