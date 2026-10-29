import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {draftContext} from '../src/simulation/expedition-economy';
import {newEquipmentAccount,grantEquipment} from '../src/simulation/starship/inventory';
import {quickEquipPlan} from '../src/simulation/starship/quick-equip';
import {ATTRIBUTE_SLOTS,type EquipmentAccount,type EquipmentSlot,type ItemLocation} from '../src/simulation/starship/types';
import {equipmentAvailability} from '../src/ui/starship/equipment-availability';
import {createWorldStarshipHost} from '../src/ui/starship/world-host';
import {StarshipController,type ShipCommand} from '../src/ui/starship/controller';
import {drawExpeditionReinforcements,inspectShopWeights,canTakeExpeditionOffer,EXPEDITION_CARD_DEFINITIONS} from '../src/simulation/progression/expedition-drafts';
import {teamCardKey,CARD_RARITIES} from '../src/simulation/progression/team-cards';
import {beginSpecialStage} from '../src/simulation/special-stages/runtime';
import {RunSession} from '../src/app/run-session';
import {SaveRepository,type SaveBackend} from '../src/persistence/save-repository';

const make=()=>new World({seed:529,waves:false,sandbox:true,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)});
function gear(a:EquipmentAccount,slot:EquipmentSlot,template='attribute.2',polluted=false,location?:ItemLocation){const r=grantEquipment(a,{template,race:'terran',slot,polluted},'fixture:'+a.serial,location??(a.run&&!a.run.ended?{kind:'backpack',run:a.run.id}:{kind:'warehouse'}));assert.ok(r.ok);return r.value;}
function controller(w:World){const host=createWorldStarshipHost(w,{resolveImage:k=>k}),c=new StarshipController(host);let n=0;const envelope=(command:ShipCommand)=>({id:'command:'+(++n),revision:w.starship.account.revision,managementRevision:host.management.revision,command});return {host,c,envelope,run:(command:ShipCommand)=>c.execute(envelope(command))};}
function shop(){const w=make();w.start();w.endStage();w.skipReward();return w;}

test('quick equip applies only higher-quality ordinary run gear and preserves every protected slot',()=>{
 const w=make(),a=w.starship.account,old=gear(a,'offense1','attribute.2'),set=gear(a,'offense2','set.orange.elite.4'),locked=gear(a,'offense3','attribute.1');
 for(const i of [old,set,locked])assert.ok(w.equipItem(i.id,i.slot).ok);
 w.start();const f=controller(w);f.host.management.locked.add(locked.id);
 const equal=gear(a,'offense1','attribute.2'),high=gear(a,'offense1','attribute.3'),setCandidate=gear(a,'offense2','attribute.4'),blocked=gear(a,'offense3','attribute.4'),tainted=gear(a,'offense4','attribute.4',true),good=gear(a,'defense1','attribute.2'),fav=gear(a,'defense2','attribute.4'),system=gear(a,'defense3','attribute.4');
 f.host.management.favorites.add(fav.id);a.run!.locked.add(system.id);
 assert.equal(f.run({type:'autoEquip'}).ok,false);w.paused=true;assert.equal(f.run({type:'autoEquip'}).ok,false);w.endStage();
 const unit=w.allies()[0];unit.hp=unit.maxHp*.4;const ratio=unit.hp/unit.maxHp,revision=a.revision,rng=a.rng,worldRng=w.snapshotData().rngState,command=f.envelope({type:'autoEquip'});
 assert.deepEqual(f.c.previewAutoEquip().map(i=>i.id),[high.id,good.id]);assert.ok(f.c.execute(command).ok);
 assert.equal(a.revision,revision+1);assert.equal(a.rng,rng);assert.equal(w.snapshotData().rngState,worldRng);assert.ok(Math.abs(unit.hp/unit.maxHp-ratio)<1e-9);assert.equal(w.starship.account,a);
 assert.equal(a.equipped.terran.offense1,high.id);assert.equal(a.equipped.terran.offense2,set.id);assert.equal(a.equipped.terran.offense3,locked.id);assert.equal(a.equipped.terran.defense1,good.id);
 for(const i of [equal,old,setCandidate,blocked,tainted,fav,system])assert.equal(a.locations[i.id].kind,'backpack');
 assert.ok(f.c.execute(command).ok);assert.equal(a.revision,revision+1);assert.equal(f.run({type:'autoEquip'}).ok,false);f.host.dispose!();
});

test('quick equip never replaces equal-quality gear, special gear or a rewarded source; full backpack can swap',()=>{
 const w=make(),a=w.starship.account,old=gear(a,'offense1','attribute.3');assert.ok(w.equipItem(old.id,old.slot).ok);w.start();
 const equal=gear(a,'offense1','attribute.3'),upgrade=gear(a,'offense2','attribute.4');for(let i=2;i<64;i++)gear(a,'offense1','attribute.1');w.endStage();
 assert.deepEqual(quickEquipPlan(a,'terran').map(i=>i.id),[upgrade.id]);assert.ok(w.autoEquipItems(new Set()).ok);assert.equal(a.equipped.terran.offense1,old.id);assert.equal(a.locations[equal.id].kind,'backpack');
 const frozen=structuredClone(a);assert.equal(w.autoEquipItems(new Set(),a.revision-1).ok,false);assert.deepEqual(a,frozen);
});

test('outside quick equip uses warehouse gear, keeps protected/equal/special pieces and survives account restoration',()=>{
 const w=make(),a=w.starship.account,old=gear(a,'offense1','attribute.1'),set=gear(a,'offense2','set.orange.elite.4');
 w.equipItem(old.id,old.slot);w.equipItem(set.id,set.slot);
 const high=gear(a,'offense1','attribute.3'),equal=gear(a,'offense1','attribute.1'),blocked=gear(a,'offense2','attribute.4'),fav=gear(a,'defense1','attribute.4'),tainted=gear(a,'defense2','attribute.4',true);
 const f=controller(w);f.host.management.favorites.add(fav.id);const before=a.revision,rng=a.rng;
 assert.deepEqual(f.c.previewAutoEquip().map(i=>i.id),[high.id]);const command=f.envelope({type:'autoEquip'});assert.ok(f.c.execute(command).ok);assert.ok(f.c.execute(command).ok);
 assert.equal(a.revision,before+1);assert.equal(a.rng,rng);assert.equal(a.equipped.terran.offense1,high.id);assert.equal(a.equipped.terran.offense2,set.id);
 for(const item of [old,equal,blocked,fav,tainted])assert.equal(a.locations[item.id].kind,'warehouse');
 const restored=new World({equipmentAccount:structuredClone(a)});assert.equal(restored.starship.account.equipped.terran.offense1,high.id);
 f.host.dispose!();
});

test('equipment status reflects real legality before opening details and keeps effect activation separate',()=>{
 const w=make(),a=w.starship.account,ordinary=gear(a,'offense1'),set=gear(a,'offense2','set.orange.elite.4'),tainted=gear(a,'defense1','attribute.3',true);
 assert.equal(equipmentAvailability(a,'terran','outside',ordinary).label,'可装备');assert.equal(equipmentAvailability(a,'terran','outside',tainted).label,'需清洗');
 w.start();const bag=gear(a,'offense1'),bagSet=gear(a,'offense2','set.orange.elite.4');
 assert.equal(equipmentAvailability(a,'terran','battle',bag).label,'关间更换');assert.equal(equipmentAvailability(a,'terran','intermission',bag).ok,true);
 assert.equal(equipmentAvailability(a,'terran','intermission',bagSet).label,'局外更换');assert.equal(equipmentAvailability(a,'zerg','intermission',bag).label,'种族不符');
 assert.equal(equipmentAvailability(a,'terran','intermission',ordinary).ok,false);assert.equal(equipmentAvailability(a,'terran','intermission',set).ok,false);
 a.run!.locked.add(bag.id);assert.equal(equipmentAvailability(a,'terran','intermission',bag).label,'来源锁定');
});

test('bulk confirmation never consumes equipped, locked, favorite or source-locked items',()=>{
 const w=make(),a=w.starship.account,old=gear(a,'offense1');w.equipItem(old.id,old.slot);w.start();const f=controller(w),items=Array.from({length:40},(_,n)=>gear(a,ATTRIBUTE_SLOTS[n%8]));
 f.host.management.locked.add(items[0].id);f.host.management.favorites.add(items[1].id);a.run!.locked.add(items[2].id);w.endStage();const ids=[old.id,...items.map(i=>i.id)];
 const p=f.c.preview(ids,'dismantle');assert.equal(p.ids.length,37);assert.equal(p.skipped.length,4);const dust=a.dust,command=f.envelope({type:'dismantle',ids});assert.ok(f.c.execute(command).ok);assert.equal(a.dust,dust+p.dust);assert.ok(f.c.execute(command).ok);assert.equal(a.dust,dust+p.dust);for(const id of [old.id,...items.slice(0,3).map(i=>i.id)])assert.ok(a.items[id]);f.host.dispose!();
});

test('special battle and loot screen cannot extract; normal first intermission can',()=>{
 const w=make();w.setDifficulty('hard');w.start();w.stage=4;w.prepareStage();assert.ok(beginSpecialStage(w,'resources','fixture'));w.phase='reward';assert.equal(w.canExtractEquipment,false);assert.equal(w.extractEquipment(),false);
 const normal=make();normal.start();normal.endStage();assert.ok(normal.extractEquipment());assert.equal(normal.phase,'finished');
});

test('sold-out white products remove their own weight without increasing the remaining resource weight',()=>{
 const w=shop(),ctx=draftContext(w),before=inspectShopWeights(ctx);w.expedition.cardTotals[teamCardKey('firepower','white')]=3;w.expedition.cardTotals[teamCardKey('defense','white')]=3;const after=inspectShopWeights(draftContext(w));
 for(const row of after)assert.equal(row.weight,before.find(b=>b.id===row.id)!.weight,row.id);
 assert.ok(!after.some(c=>['team.firepower.white','team.defense.white'].includes(c.id)));
 const share=(rows:typeof before)=>rows.filter(c=>c.rarity==='blue'||c.rarity==='purple').reduce((n,c)=>n+c.weight,0)/rows.reduce((n,c)=>n+c.weight,0);
 assert.ok(share(after)>share(before));
});

test('fresh shop shelves filter exhausted and ineffective products and keep unaffordable legal offers',()=>{
 const w=shop();w.wallet={minerals:0,gas:0};w.funShop.levels={gland:1,eye:1,nydus:1,tavern:3,bait:3,dice:5,pandora:1};w.expedition.support.levels={mines:3,bombardment:3,mutation:3};
 for(const group of ['firepower','defense'] as const)w.expedition.cardTotals[teamCardKey(group,'white')]=3;
 for(const f of w.expedition.familySlots)for(const [kind,d]of Object.entries(EXPEDITION_CARD_DEFINITIONS))w.expedition.cardTotals[kind+'.'+f]=d.cap;
 for(let n=0;n<30;n++){const ctx=draftContext(w),offers=drawExpeditionReinforcements(ctx,true);assert.equal(offers.length,3);assert.equal(new Set(offers.map(o=>o.id)).size,3);assert.ok(offers.every(o=>canTakeExpeditionOffer(ctx,o)));assert.ok(offers.every(o=>o.expeditionEffect.kind!=='funShop'));assert.ok(offers.filter(o=>o.expeditionEffect.kind==='resource').length<=1);assert.ok(offers.some(o=>o.minerals+o.gas>0));}
});

test('when all strengthenings are exhausted, three distinct existing resource goods remain available',()=>{
 const w=shop(),ctx=draftContext(w);ctx.funShop=undefined;ctx.heroes=[];ctx.elites=[];ctx.supplyLegal=()=>false;ctx.supportLegal=()=>false;ctx.training=()=>null;ctx.familyInfo=()=>({alive:0,canAttack:false,canSupport:false,usesEnergy:false,cultivationCapacity:0,canProduce:false});for(const group of ['firepower','defense'] as const)for(const rarity of CARD_RARITIES)ctx.state.cardTotals[teamCardKey(group,rarity)]=3;
 const offers=drawExpeditionReinforcements(ctx,true);assert.equal(offers.length,3);assert.ok(offers.every(o=>o.expeditionEffect.kind==='resource'));assert.equal(new Set(offers.map(o=>o.id)).size,3);
});

class Backend implements SaveBackend {slots:(string|null)[]=[null,null,null];fail=false;writes=0;async read(){return [...this.slots];}async commit(raw:string){if(this.fail)throw Error('quota');this.slots=[raw,this.slots[0],this.slots[1]];this.writes++;}}
test('one automatic exchange saves atomically; failure preserves the old archive, retry and first-stage extraction reload once',async()=>{
 const w=make(),a=w.starship.account,b=new Backend(),s=new RunSession(w,new SaveRepository(b),{run:null,savedAt:0,notice:''});w.start();const one=gear(a,'offense1','attribute.3'),two=gear(a,'defense1','attribute.3');w.endStage();await s.saveNow();const old=b.slots[0],writes=b.writes;b.fail=true;
 const f=controller(w);assert.ok(f.run({type:'autoEquip'}).ok);assert.equal(await s.saveBeforeAdvance(),false);assert.equal(b.slots[0],old);assert.equal(b.writes,writes);b.fail=false;assert.ok(await s.saveBeforeAdvance());assert.equal(b.writes,writes+1);
 const loaded=await new SaveRepository(b).load();assert.ok(loaded.bundle);assert.equal(loaded.bundle.equipment!.equipped.terran.offense1,one.id);assert.equal(loaded.bundle.equipment!.equipped.terran.defense1,two.id);
 assert.ok(w.extractEquipment());await s.saveNow();const terminal=await new SaveRepository(b).load();assert.ok(terminal.bundle!.equipment!.run!.ended);assert.equal(w.extractEquipment(),false);f.host.dispose!();
});
