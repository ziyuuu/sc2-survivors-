import test from 'node:test';
import assert from 'node:assert/strict';
import {armedSceneKeys} from '../src/app/armed-preload-plan';
import {World} from '../src/simulation/world';
import {writeArchive,readArchive} from '../src/persistence/archive';
import {TERRAN_SIX,tickSix,interfere,tickRavenTurrets} from '../src/simulation/combat/terran-six';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {tickNativeMode,selectWeapon} from '../src/simulation/combat/expedition-combat';
import {familyLine,TREE_STEPS} from '../src/data/expedition-buildings';
import type {ExpeditionReward} from '../src/simulation/progression/expedition-drafts';
import {productionQuote,updateExpeditionProduction,releasePaidPassenger} from '../src/simulation/expedition-production';
import {TERRAN_SIX_NATIVE as N} from '../src/data/expansion-units';
import {mechanicalMember} from '../src/simulation/combat/doomsday-roster';
import {bioFormal} from '../src/simulation/combat/bio-state';

function battle(){
 const w=new World({race:'terran',seed:191119,waves:false,sandbox:true,terrain:false,obstacles:[]});assert.ok(w.start());
 w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.entities.clear();w.pods=[];w.expedition.ledger=[];
 for(const group of w.expedition.building!.groups)group.enabled=false;
 w.anchor.x=w.anchor.z=0;w.anchorStoppedFor=2;return w;
}
function copy(w:World){const arc=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()}));const c=battle();c.restoreRun(arc.bundle.run!);index(c);return c;}
function index(w:World){w.hash.rebuild([...w.entities.values(),...w.fortifications.values()]);}
function time(w:World,t:number){w.time=t;w.tick=Math.round(t*60);}
function close(a:number,b:number){assert.ok(Math.abs(a-b)<1e-6,a+' != '+b);}
function enemy(w:World,x=2,z=1){const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=3000;u.armor=0;return u;}

test('six formal families keep native clocks, five mechanical qualifications and the formal ghost identity across an archive',()=>{
 const w=battle();for(const f of TERRAN_SIX){const u=w.addUnit(f,'terran',0,0);
  assert.equal(w.productionCost(f).minerals,0);assert.equal(productionQuote(w,f,'rankTraining').gas,0);
  assert.equal(mechanicalMember(w,u),f!=='ghost');assert.equal(bioFormal(u),f==='ghost');
 }
 const c=copy(w);assert.deepEqual(c.allies().map(u=>u.unitType).sort(),[...TERRAN_SIX].sort());
});
test('a field-earned or newly unlocked raven prepares its native turret before its first automatic deployment',()=>{
 const w=battle();assert.equal(armedSceneKeys(w.expedition).has('fort.turret_terran'),false);
 w.expedition.tech['unlock.raven']=1;assert.ok(armedSceneKeys(w.expedition).has('fort.turret_terran'));
 delete w.expedition.tech['unlock.raven'];w.expedition.familySlots.push('raven');assert.ok(armedSceneKeys(w.expedition).has('fort.turret_terran'));
});
test('all six real projects unlock at zero resources and carry one free replacement through a mid-training checkpoint',()=>{
 for(const f of TERRAN_SIX){
  const w=battle(),line=familyLine(f) as 'barracks'|'factory'|'starport';w.stage=12;
  if(line!=='barracks')assert.ok(w.grantFacility(line));
  const steps=TREE_STEPS[line],at=steps.findIndex(group=>group.includes(f));w.expedition.tech['unlock.'+steps[at-1][0]]=1;
  w.expedition.developmentTarget='unlock.'+f;w.endStage();w.wallet={minerals:0,gas:0};
  assert.ok(w.setDevelopmentDirection(line));const offer=w.rewards.map(r=>r as ExpeditionReward).find(r=>r.expeditionEffect.kind==='development'&&r.expeditionEffect.definitionId==='unlock.'+f);assert.ok(offer,f);
  assert.ok(w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId,w.expedition.shopRevision));
  assert.deepEqual(w.wallet,{minerals:0,gas:0});assert.ok(w.isFamilyAvailable(f));
  assert.ok(w.setBuildingGroupOutputs(line,[f]));assert.ok(w.setBuildingGroupEnabled(line,true));
  w.expedition.familySlots=['marine',f];const old=w.addUnit(f,'terran',0,0);
  while(w.phase==='reward')w.skipReward();
  w.hit(old,99999,[],1,'zerg',0,1,undefined,true);assert.ok(old.hp<=0);
  updateExpeditionProduction(w,0);const job=w.expedition.ledger.find(j=>j.family===f);assert.ok(job,f);
  assert.deepEqual(job.passengers[0].paid,{minerals:0,gas:0});assert.equal(job.passengers[0].purpose,'body');
  updateExpeditionProduction(w,job.remaining/2,false);
  const c=copy(w),saved=c.expedition.ledger.find(j=>j.id===job.id)!;assert.equal(saved.remaining,job.remaining);
  updateExpeditionProduction(c,saved.remaining+1,false);const pod=c.pods.find(p=>p.id===saved.podId);assert.ok(pod);
  releasePaidPassenger(c,pod,0,c.anchor);const count=c.familyBodies(f).filter(u=>u.hp>0).length;assert.equal(count,1);
  releasePaidPassenger(c,pod,0,c.anchor);assert.equal(c.familyBodies(f).filter(u=>u.hp>0).length,1);
  assert.deepEqual(c.economyTotals.production,{minerals:0,gas:0});
 }
});
test('two ghosts distribute their first rifle marks and jam real independent queen clocks once per cast cycle',()=>{
 const w=battle(),a=w.addUnit('ghost','terran',0,0),b=w.addUnit('ghost','terran',0,-1),q=w.addUnit('queen','zerg',2,0),other=enemy(w);
 w.addUnit('marine','terran',0,1);q.enemyTier='boss';q.specialReady=0;q.corrosiveBileReady=10;q.hp=q.maxHp=5000;index(w);tickSix(w,a);tickSix(w,b);
 assert.equal(w.weaponFlights.length,2);assert.equal(new Set(w.weaponFlights.map(f=>f.target)).size,2);
 close(q.specialReady,1.2);close(q.corrosiveBileReady,11.5);assert.equal(interfere(w,q),false);
 const c=copy(w),cq=c.entities.get(q.id)!;assert.equal(interfere(c,cq),false);
 tickWeaponFlights(c,1);assert.ok((cq.six?.weakUntil??0)>0);assert.ok(c.entities.get(other.id)!.six?.weakUntil);
 const hp=cq.hp;c.hit(cq,100,[],1,'terran',0,1,a.id);close(hp-cq.hp,115);
 const second=cq.hp;c.hit(cq,100,[],1,'terran',0,1,a.id,false,false,0,false,false,false,{dot:true});close(second-cq.hp,100);
 time(c,12);c.enemySpecials.act(cq,1/60);const casts=c.enemySpecials.snapshot().casts.length;
 assert.ok(casts>0);assert.ok(interfere(c,cq));assert.equal(c.enemySpecials.snapshot().casts.length,casts);
});
test('mine fires one ordinary missile, survives the splash and keeps reload across a march, death of shooter and restore',()=>{
 const w=battle(),u=w.addUnit('widow_mine','terran',0,0),e=enemy(w),near=enemy(w,2.1,1.05);
 index(w);assert.equal(w.canFireAt(u,e),false);tickSix(w,u);tickNativeMode(w,u);time(w,N.mine.deploy+.01);tickNativeMode(w,u);assert.ok(w.canFireAt(u,e));
 u.shotInterval=u.attackPeriod;w.fire(u,e);assert.equal(w.weaponFlights.length,1);const reload=u.nextShotAt;assert.ok(reload-w.time>28);
 w.input.x=1;tickSix(w,u);tickNativeMode(w,u);assert.equal(u.desiredNativeMode,'widow_mine');close(u.nextShotAt,reload);
 const c=copy(w);c.entities.delete(u.id);const hp=c.entities.get(e.id)!.hp,splash=c.entities.get(near.id)!.hp;tickWeaponFlights(c,1);assert.ok(c.entities.get(e.id)!.hp<hp);assert.ok(c.entities.get(near.id)!.hp<splash);assert.equal(c.weaponFlights.length,0);
});
test('cyclone preserves lock during movement and releases it on loss of vision',()=>{
 const w=battle(),u=w.addUnit('cyclone','terran',0,0),e=enemy(w),other=enemy(w,1,0);e.enemyTier='boss';index(w);tickSix(w,u);assert.equal(u.six?.lock,e.id);
 w.input.x=1;e.x=9;time(w,.2);index(w);tickSix(w,u);assert.equal(u.six?.lock,e.id);assert.ok(w.canFireAt(u,e));
 e.cloaked=true;time(w,.4);tickSix(w,u);assert.equal(u.six?.lock,undefined);time(w,.5+N.cyclone.cooldown);tickSix(w,u);assert.equal(u.six?.lock,other.id);
});
test('liberator has mutually exclusive weapons, a fixed ground zone and hysteresis; restoring preserves its pool and timer',()=>{
 const w=battle(),u=w.addUnit('liberator','terran',0,0),a=enemy(w,3,0),b=enemy(w,3.5,.2),air=w.addUnit('mutalisk','zerg',2,1);
 index(w);assert.ok(w.targetAllowed(u,air));assert.equal(w.targetAllowed(u,a),false);tickSix(w,u);tickNativeMode(w,u);assert.ok(u.nativeModeUntil);
 u.hp-=11;u.nextShotAt=12;const c=copy(w),v=c.entities.get(u.id)!;time(c,N.liberator.deploy+.01);tickNativeMode(c,v);
 assert.equal(v.nativeMode,'liberator_ag');assert.equal(v.hp,u.hp);close(v.nextShotAt,12);assert.equal(c.targetAllowed(v,c.entities.get(air.id)!),false);assert.ok(c.targetAllowed(v,c.entities.get(a.id)!));
 c.entities.get(a.id)!.x=c.entities.get(b.id)!.x=23;index(c);c.input.z=1;tickSix(c,v);assert.equal(v.desiredNativeMode,'liberator');tickNativeMode(c,v);assert.equal(c.canFireAt(v,c.entities.get(a.id)!),false);
});
test('raven spends energy only on useful targets, independently expires its turret and never gives it a family seat',()=>{
 const w=battle(),r=w.addUnit('raven','terran',0,0);r.energy=200;index(w);tickSix(w,r);assert.equal(r.energy,200);
 const a=enemy(w,3,0),b=enemy(w,4,0);a.armor=b.armor=5;b.cloaked=true;time(w,.2);index(w);assert.ok(w.visibleTo(b,'terran'));tickSix(w,r);assert.equal(r.energy,125);tickWeaponFlights(w,1);close(w.effectiveArmor(a),2);
 time(w,.4);tickSix(w,r);assert.equal(w.fortifications.size,1);assert.equal(r.energy,75);const c=copy(w),f=[...c.fortifications.values()][0];c.entities.delete(r.id);const hp=c.entities.get(a.id)!.hp;tickRavenTurrets(c);assert.ok(c.entities.get(a.id)!.hp<hp);time(c,f.ravenUntil!+.01);tickRavenTurrets(c);assert.equal(c.fortifications.size,0);
});
test('two liberators cover independent ground clusters and release both zones when the line retreats',()=>{
 const w=battle(),a=w.addUnit('liberator','terran',0,0),b=w.addUnit('liberator','terran',0,.1);
 for(const x of [-5,5])for(const z of [0,.2])enemy(w,x,z);
 index(w);tickSix(w,a);tickSix(w,b);assert.ok(a.six?.zone&&b.six?.zone);assert.ok(Math.abs(a.six.zone.x-b.six.zone.x)>N.liberator.radius);
 w.input.x=1;time(w,.3);tickSix(w,a);tickSix(w,b);assert.equal(a.six.zone,undefined);assert.equal(b.six.zone,undefined);
});
test('ordinary cruisers coordinate Yamato reservations, maintain air batteries and do not resurrect lost health during transfer',()=>{
 const w=battle(),a=w.addUnit('battlecruiser','terran',0,0),b=w.addUnit('battlecruiser','terran',0,-1),e=enemy(w);e.enemyTier='boss';e.hp=245;const air=w.addUnit('mutalisk','zerg',1,3);
 index(w);selectWeapon(w,a,air);assert.equal(a.activeWeapon,'ATALaserBattery');tickSix(w,a);tickSix(w,b);assert.equal(a.six?.yamato?.target,e.id);assert.equal(b.six?.yamato,undefined);
 const c=copy(w),u=c.entities.get(a.id)!;time(c,N.cruiser.charge+.1);tickSix(c,u);assert.equal(c.weaponFlights.filter(f=>f.sixSkill==='yamato').length,1);
 u.x=23;u.hp=100;index(c);time(c,3);tickSix(c,u);assert.ok(u.six?.jump);const cp=copy(c),cr=cp.entities.get(u.id)!;time(cp,4.2);tickSix(cp,cr);assert.ok(cr.x<15);assert.equal(cr.hp,100);assert.equal(cp.weaponFlights.length,1);assert.ok(cr.six!.yamatoReady!>50);
});
