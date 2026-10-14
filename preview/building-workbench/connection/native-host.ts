import {World} from '../../../src/simulation/world';
import {productionQuote, updateExpeditionProduction, receiptNeeded, releasePaidPassenger} from '../../../src/simulation/expedition-production';
import {LINE_SKILLS} from '../../../src/data/expedition-buildings';
import type {FamilyId, Race} from '../../../src/data/races';
import type {DeliveryLedger} from '../../../src/simulation/expedition-state';
import {syncBuildingViews} from '../../../src/simulation/building/expedition';
import {grantFacility, linesFor, type BuildingState} from './rules';

/** Explicitly isolated host. Never attach this adapter to the live World or call World.step here. */
export class NativeBuildingSandbox {
 readonly state:BuildingState;
 readonly world:World;
 readonly orderGroups=new Map<number,string>();
 constructor(race:Race,scene:'opening'|'developed'|'prerequisite'|'poor'='opening') {
  this.world=new World({race,seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});
  this.state=this.world.expedition.building!;this.state.stage=1;this.state.window=1;this.state.phase='building';this.state.baseRefreshUsed=false;this.state.wallet=scene==='poor'?{minerals:20,gas:0}:{minerals:850,gas:400};
  const nativeTalent=this.world.talent.bind(this.world);
  this.world.talent=id=>id in this.state.talents?this.state.talents[id as keyof typeof this.state.talents]:nativeTalent(id);
  this.world.start();this.world.wallet=this.state.wallet;
  const s=this.state;
  if(scene==='developed'){
   s.stage=9;
   const unlocks:Record<Race,FamilyId[]>={terran:['marine','reaper','hellion','tank','medivac','science_vessel'],protoss:['zealot','adept','stalker','sentry','immortal','phoenix','void_ray'],zerg:['zergling','baneling','roach','queen','hydralisk','ravager','mutalisk']};
   for(const f of unlocks[race])s.tech['unlock.'+f]=1;
   if(race==='zerg'){
    for(let i=0;i<4;i++)grantFacility(s,'hatchery');
    s.groups[0].outputs=['zergling','baneling'];s.groups[1].directions=['ground','air'];s.groups[1].outputs=['hydralisk','mutalisk'];
    s.groups[2].outputs=['roach','queen'];s.groups[3].directions=['ground'];s.groups[3].outputs=['ravager'];s.groups[4].directions=['air'];s.groups[4].outputs=['mutalisk'];s.groups[4].enabled=false;
   } else {
    for(const line of linesFor(race).slice(1))grantFacility(s,line as 'factory'|'starport'|'robotics'|'stargate');
    s.groups[0].outputs=race==='terran'?['marine','reaper']:['stalker','sentry'];
    if(race==='protoss')grantFacility(s,'crystal')!.outputs=['zealot','adept'];
   }
  }
  if(scene==='prerequisite'){
   s.direction=linesFor(race)[2];
   if(race==='protoss'){s.groups=[];delete s.tech.gateway;}
  }
  this.sync();
 }
 sync() {
  const {state:s,world:w}=this;
  w.wallet=s.wallet;w.stage=Math.min(18,s.stage+1);w.phase='battle';w.expedition.tech=s.tech;
  syncBuildingViews(w.expedition,s);
  w.economyTotals.purchases={...s.spent.construction};w.economyTotals.rerolls=s.spent.refresh;
  for(const skills of Object.values(LINE_SKILLS))for(const [id] of skills)if(s.tech[id])w.upgrades.set(id,s.tech[id]);
  for(const unit of w.allies())w.refreshStats(unit);
 }
 quote(f:FamilyId){this.sync();return productionQuote(this.world,f);}
 /** Progress every existing paid order once, then let the native scheduler start each independent group. */
 tick(seconds:number,automatic=true) {
  if(!Number.isFinite(seconds)||seconds<0||seconds>3600)throw new RangeError('Invalid sandbox duration');
  this.sync();const w=this.world;w.time+=seconds;
  updateExpeditionProduction(w,seconds,automatic);
  for(const j of w.expedition.ledger)if(j.producerId)this.orderGroups.set(j.id,j.producerId);
  return this.orders();
 }
 /** Test-only carrier arrival; payment, capacity, pair handling and release use original game functions. */
 deliverReady() {
  const w=this.world;let released=0;
  for(const j of w.expedition.ledger){
   const pod=w.pods.find(p=>p.id===j.podId);if(j.state!=='risk'||!pod)continue;
   pod.status='opening';pod.guardianIds.clear();
   for(let i=0;i<pod.passengers.length;i++){
    if(pod.passengers[i].status!=='waiting')continue;
    const position=w.freePosition(pod.unitType,pod,1.8,4.5);if(!position||receiptNeeded(w,pod,i))break;
    if(releasePaidPassenger(w,pod,i,position))released++;
   }
  }
  return released;
 }
 orders():readonly DeliveryLedger[]{return this.world.expedition.ledger;}
}
