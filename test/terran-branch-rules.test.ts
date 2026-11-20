import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {inspectShopWeights} from '../src/simulation/progression/expedition-drafts';
import {pendingBuildChoice} from '../src/simulation/combat/armed-support';
import {buildCardBranch,type BuildBranch,type BuildCardId} from '../src/simulation/progression/build-progress';
import {terranShelf,TERRAN_PATHS} from '../tools/qa-terran-budget.mts';
import {writeArchive,readArchive} from '../src/persistence/archive';

const branches:BuildBranch[]=['armed','doomsday','bio'];
const starts:Record<BuildBranch,BuildCardId[]>={armed:['W01','W04','G01'],doomsday:['M-W01','M-W05','M-G01'],bio:['BIO-W01','BIO-W02','BIO-W03']};
function make(){const w=new World({race:'terran',seed:191119,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.addUnit('reaper','terran',4,0);w.addUnit('tank','terran',3,0);w.addUnit('hellion','terran',-3,0);w.addUnit('science_vessel','terran',0,-3);w.wallet={minerals:1e6,gas:1e6};w.endStage();w.rewardRound='random';w.expedition.developmentBought=true;return w;}
function buy(w:World,id:BuildCardId){const r=terranShelf(w,id);assert.ok(w.purchaseShopOffer(w.draftWindowKey,r.offerId),id);return r;}
function claim(w:World){const m=pendingBuildChoice(w)!;assert.ok(m);assert.equal(m.offers.length,3);const wallet={...w.wallet};assert.ok(w.claimBuildChoice(m.id,w.expedition.shopRevision,m.offers[0]));assert.deepEqual(w.wallet,wallet);return m;}
function copy(w:World){const archive=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));const c=make();c.restoreRun(archive.bundle.run!);return c;}
function allWeights(w:World){return inspectShopWeights({...draftContext(w),armedLegal:()=>true,doomsdayLegal:()=>true,doomsdayReady:()=>true,bioLegal:()=>true});}
const prefix:Record<BuildBranch,string>={armed:'armed.',doomsday:'doomsday.',bio:'bio.'};

test('a new run has no selected branch and no ordinary branch purple cards',()=>{
 const w=make();assert.equal(w.expedition.build!.main,null);assert.deepEqual(w.expedition.build!.counts,{});
 assert.deepEqual(allWeights(w).filter(c=>c.rarity==='purple'&&branches.some(b=>c.id.startsWith(prefix[b]))),[]);
 assert.ok(allWeights(w).some(c=>c.rarity==='purple'&&!branches.some(b=>c.id.startsWith(prefix[b]))));
});
for(const branch of branches)test(`${branch}: third effective purchase locks immediately, mandatory node survives archive`,()=>{
 const w=make();for(const id of starts[branch].slice(0,2))buy(w,id);assert.equal(w.expedition.build!.main,null);
 buy(w,starts[branch][0]);assert.equal(w.expedition.build!.counts[branch],2);
 buy(w,starts[branch][2]);assert.equal(w.expedition.build!.main,branch);
 const m=pendingBuildChoice(w)!,rev=w.expedition.shopRevision,wallet={...w.wallet};assert.equal(m.branch,branch);
 assert.equal(w.deferBuildChoice(m.id,rev),false);assert.equal(w.skipReward(),false);assert.equal(w.reroll(),false);
 const other=branches.find(b=>b!==branch)!;const r=terranShelf(w,starts[other][0]);assert.equal(w.purchaseShopOffer(w.draftWindowKey,r.offerId),false);
 assert.deepEqual(w.wallet,wallet);const c=copy(w);assert.equal(c.expedition.build!.main,branch);assert.deepEqual(pendingBuildChoice(c)!.offers,m.offers);claim(c);
 for(const id of starts[other])buy(c,id);assert.equal(c.expedition.build!.main,branch);assert.equal(pendingBuildChoice(c),undefined);assert.ok(c.expedition.build!.milestones.every(n=>n.branch===branch));
 const purples=allWeights(c).filter(x=>x.rarity==='purple'&&branches.some(b=>x.id.startsWith(prefix[b])));
 assert.ok(purples.length>0&&purples.every(x=>x.id.startsWith(prefix[branch])&&x.weight>0));
});
for(const branch of branches)test(`${branch}: every three purchases requires a node, then one free orange at twelve`,()=>{
 const w=make();for(const id of TERRAN_PATHS[branch]){buy(w,id);const m=pendingBuildChoice(w);if(!m)continue;
  assert.equal(w.skipReward(),false);assert.equal(w.deferBuildChoice(m.id,w.expedition.shopRevision),false);
  if(m.at===12){assert.ok(m.offers.every(id=>id.includes('O0')));w.wallet={minerals:0,gas:0};}
  claim(w);
 }
 assert.equal(w.expedition.build!.orangeAt,12);assert.equal(w.expedition.build!.milestones.filter(m=>m.claimed).length,4);assert.ok(w.expedition.build!.orange);assert.deepEqual(w.wallet,{minerals:0,gas:0});assert.equal(copy(w).expedition.build!.orange,w.expedition.build!.orange);
});
test('a frozen legacy purple offer cannot be purchased before or outside its branch',()=>{
 for(const branch of branches){const w=make(),before=w.captureRun();for(const id of starts[branch])buy(w,id);claim(w);
  const id=({armed:'P01',doomsday:'M-P03',bio:'BIO-P01'} as const)[branch],offer=terranShelf(w,id);
  w.restoreRun(before);w.rewards=[offer];const wallet={...w.wallet};assert.equal(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),false);assert.deepEqual(w.wallet,wallet);
  const other=branches.find(b=>b!==branch)!;for(const id of starts[other])buy(w,id);claim(w);w.rewards=[offer];const lockedWallet={...w.wallet};assert.equal(w.purchaseShopOffer(w.draftWindowKey,offer.offerId),false);assert.deepEqual(w.wallet,lockedWallet);
 }
});
test('legacy deferred milestones lock the first earned branch without rerolling its promised cards',()=>{
 const w=make();for(const id of starts.doomsday)buy(w,id);const snapshot=w.captureRun(),b=snapshot.state.expedition.build!;
 b.main=null;b.milestones[0].deferredWindow=snapshot.state.expedition.draftWindow;const promised=[...b.milestones[0].offers];b.counts.armed=3;b.milestones.push({id:'armed:3',branch:'armed',at:3,offers:['N01','N02','N03'],claimed:null});
 const c=make();c.restoreRun(snapshot);assert.equal(b.main,null);assert.equal(c.expedition.build!.main,'doomsday');assert.equal(c.expedition.build!.milestones.length,1);assert.deepEqual(pendingBuildChoice(c)!.offers,promised);assert.equal(c.expedition.build!.milestones[0].deferredWindow,undefined);assert.equal(c.skipReward(),false);assert.equal(copy(c).expedition.build!.main,'doomsday');
});
test('white branch weights move from equal thirds to one half versus one quarter each',()=>{
 const w=make(),mass=(b:BuildBranch)=>allWeights(w).filter(c=>c.rarity==='white'&&c.id.startsWith(prefix[b])).reduce((n,c)=>n+c.weight,0);
 const total=()=>branches.reduce((n,b)=>n+mass(b),0);for(const b of branches)assert.ok(Math.abs(mass(b)/total()-1/3)<1e-9);
 for(const id of starts.bio)buy(w,id);for(const b of branches)assert.ok(Math.abs(mass(b)/total()-(b==='bio'?.5:.25))<1e-9);
 assert.ok(pendingBuildChoice(w)!.offers.every(id=>buildCardBranch(id)==='bio'));
});
