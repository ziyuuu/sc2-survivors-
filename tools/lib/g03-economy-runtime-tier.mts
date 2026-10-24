import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {BUILDS,createCampaignController} from '../qa-campaign-controller';
import {DEVELOPMENT} from '../../src/data/expedition-buildings';

export const ROOT='D:/星际',BASE=ROOT+'/reports/local/g03-economy-20261023';
export const BUILD_IDS={terran:'bio',zerg:'entrench',protoss:'shield'};
export const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.z-b.z);
export const round=(n:number)=>Math.round(n*1e6)/1e6;
export const stageKey=(w:any)=>w.endless?'endless:'+w.endless.round:'campaign:'+w.stage;
export const realmKey=(w:any)=>w.specialStages.active?.id??'normal';
/** Native start, with the session-identity seed paired as well as World/equipment seeds. */
export function startMeasuredCase(w:any,seed:number){
 const hex=createHash('sha256').update('g03-measurement-session:'+seed).digest('hex');
 const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32),native=globalThis.crypto.randomUUID;
 try{globalThis.crypto.randomUUID=()=>id as `${string}-${string}-${string}-${string}-${string}`;assert.ok(w.start());}finally{globalThis.crypto.randomUUID=native;}
 return id;
}
const cache=new Map<string,any>();
export async function runtime(version='current'){
 if(cache.has(version))return cache.get(version);
 const base=version==='current'?ROOT:ROOT+'/reports/local/g03-content-20261022/before';
 const imp=(file:string)=>import(pathToFileURL(base+'/src/'+file).href);
 const [world,maps,flat,inventory,attributes,equipment,catalog,special,rewards,patterns,building]=await Promise.all([
  imp('simulation/world.ts'),imp('data/campaign-map.ts'),imp('simulation/movement/flat-terrain.ts'),imp('simulation/starship/inventory.ts'),imp('simulation/starship/attributes.ts'),imp('simulation/starship/runtime.ts'),imp('simulation/starship/catalog.ts'),imp('simulation/special-stages/runtime.ts'),imp('simulation/special-stages/rewards.ts'),imp('simulation/special-stages/dodge-patterns.ts'),imp('simulation/building/rules.ts')]);
 const r={base,...world,...maps,...flat,...inventory,...attributes,...equipment,...catalog,...special,...rewards,...patterns,...building};cache.set(version,r);return r;
}
export function accountFor(r:any,race:string,quality:number,seed:number){
 const a=r.newEquipmentAccount(seed);
 if(quality)for(const slot of ['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4']){
  const g=r.grantEquipment(a,{template:quality===5?'set.orange.survivor.5':'attribute.'+quality,race,slot},'measurement-opening:'+slot,{kind:'warehouse'});assert.ok(g.ok);
  g.value.allocation=2;const keys=slot.startsWith('offense')?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];
  g.value.affixes=g.value.affixes.map((_:unknown,i:number)=>({key:keys[i],score:140}));assert.ok(r.validateItem(g.value));assert.ok(r.equip(a,race,g.value.id,slot).ok);
 }return a;
}
export async function newCase(c:any){const r=await runtime(c.version),a=accountFor(r,c.race,c.quality,c.seed),map=r.chooseCampaignMap(c.seed);const w=new r.World({race:c.race,difficulty:c.difficulty,seed:c.seed,waves:true,terrain:r.campaignTerrain(map),endlessTerrain:new r.FlatTerrain(),equipmentAccount:a});w.configureCampaign(map);return {r,a,w,map};}

/** Measurement-only accessor instrumentation: values and object identities are retained. */
export function observeEconomy(w:any){
 const initial={...w.wallet},initialDust=w.starship.account.dust,transactions=new Map<string,any>(),samples:any[]=[],events:any[]=[],drops:any[]=[],kills:any[]=[],births:any[]=[];
 const items=new Map<string,any>(),seenEquipment=new Set(Object.keys(w.starship.account.items)),hordeBodies=new Map<number,string>(),hordeSources=new Map<string,boolean>(),knownDrop=new Map<string,any>(),pendingDrop=new Map<string,any>(),seen=new Set<string>();
 const eventEnds=new WeakSet(),wallets=new WeakSet(),wrapped:any[]=[],walletTransitions:any[]=[];let scope='',deathScope='',lastRevision=-1,previousStage=stageKey(w),previousRealm=realmKey(w),lastInventory=new Map<string,string>();
 const context=()=>({stage:stageKey(w),realm:realmKey(w),time:round(w.time),elapsed:round(w.stageElapsed)});
 function trace(){return (new Error().stack??'').split('\n').filter(s=>s.includes('/src/')||s.includes('\\src\\')).slice(0,4).map(s=>s.trim().replaceAll(ROOT+'/','').replaceAll(ROOT.replaceAll('/','\\')+'\\',''));}
 function category(stack:string[],delta:number){const s=stack.join(' ');if(s.includes('bridge.ts'))return 'special-transfer';if(s.includes('dismantle'))return 'dismantle';if(s.includes('rewardWorker'))return 'escort-workers';if(s.includes('collectEquipmentResource'))return 'resource-pickup';if(s.includes('updateExpeditionProduction'))return 'production';if(s.includes('completeProject')||s.includes('purchaseProject'))return 'development';if(s.includes('equipmentPeriodicResources'))return 'equipment-periodic';if(s.includes('startEquipmentEconomy'))return 'equipment-opening';if(s.includes('equipmentStageEconomy'))return 'equipment-stage';if(s.includes('repair '))return 'repair';if(s.includes('reviveHero'))return 'hero-revival';if(s.includes('refreshOffers')||s.includes('refreshShop')||s.includes('refreshBuilding'))return 'refresh';if(s.includes('endStage'))return 'clear';if(s.includes('applyFunShop')||s.includes('purchaseFunShop'))return delta>0?'fun-shop-grant':'fun-shop-cost';if(s.includes('purchaseOffer'))return delta>0?'shop-grant':'shop-cost';if(s.includes('collectMapReinforcement')||s.includes('claimBossLoot'))return 'reward-card';if(s.includes('Refund')||s.includes('refund')||s.includes('commitFamilyReplacement'))return 'refund';return 'other';}
 function record(currency:string,delta:number){if(!delta)return;const stack=scope?[]:trace(),kind=scope||category(stack,delta),key=[stageKey(w),realmKey(w),currency,kind,delta>0?'income':'spend'].join('|');let row=transactions.get(key);if(!row){row={...context(),currency,kind,sign:delta>0?'income':'spend',amount:0,count:0,exampleStack:stack};transactions.set(key,row);}row.amount+=delta;row.count++;row.lastTime=round(w.time);}
 function attach(wallet:any){if(!wallet||wallets.has(wallet))return;wallets.add(wallet);for(const key of ['minerals','gas']){let value=wallet[key];Object.defineProperty(wallet,key,{enumerable:true,configurable:true,get:()=>value,set:(next)=>{const delta=next-value;value=next;record(key,delta);}});}}
 let wallet=w.wallet;attach(wallet);Object.defineProperty(w,'wallet',{enumerable:true,configurable:true,get:()=>wallet,set:(next)=>{walletTransitions.push({...context(),before:{...wallet},after:{...next}});wallet=next;attach(next);}});
 let a=w.starship.account;const accounts=new WeakSet();function attachDust(account:any){if(accounts.has(account))return;accounts.add(account);let dust=account.dust;Object.defineProperty(account,'dust',{enumerable:true,configurable:true,get:()=>dust,set:(next)=>{const delta=next-dust;dust=next;record('dust',delta);}});}attachDust(a);
 function wrap(name:string,f:any){const native=w[name];w[name]=function(...args:any[]){return f(native,args);};wrapped.push([name,native]);}
 wrap('updateEconomy',(native:any,args:any[])=>{const previous=scope;scope='passive';try{return native.apply(w,args);}finally{scope=previous;}});
 wrap('updateProduction',(native:any,args:any[])=>{const previous=scope;scope='production';try{return native.apply(w,args);}finally{scope=previous;}});
 wrap('commitUnitDeath',(native:any,args:any[])=>{const e=args[0],fresh=e.deadAt===null;const old=deathScope;deathScope=e.mission?.taskId?'mission:'+e.mission.taskId:e.fun?.id?'encounter:'+e.fun.id:e.encounter?.id?'encounter:'+e.encounter.id:hordeBodies.get(e.id)??e.enemyOrigin??'ordinary';if(fresh)kills.push({...context(),id:e.id,type:e.unitType,owner:e.owner,rank:e.rank,hero:e.heroId??null,elite:e.eliteId??null,tier:e.enemyTier??null,temporary:!!e.temporary,summon:e.summonKind??null,origin:deathScope,source:args[1]??null});try{return native.apply(w,args);}finally{deathScope=old;}});
 wrap('addUnit',(native:any,args:any[])=>{const u=native.apply(w,args);if(args[1]==='zerg'&&w.fieldEvents.horde){const s=new Error().stack??'';if(s.includes('hordes.ts')||s.includes('releaseReplacementGuards')){hordeBodies.set(u.id,'horde:'+w.fieldEvents.horde.kind+':'+w.fieldEvents.horde.started);const key=w.fieldEvents.horde.started+':'+w.fieldEvents.horde.kind;if(!hordeSources.has(key))hordeSources.set(key,s.includes('bait.ts'));}}if(args[1]==='zerg'&&(new Error().stack??'').includes('bait.ts')&&u.enemyTier==='elite')hordeBodies.set(u.id,'bait-elite');births.push({...context(),id:u.id,type:u.unitType,owner:u.owner,tier:u.enemyTier??null,origin:hordeBodies.get(u.id)??null});return u;});
 wrap('drop',(native:any,args:any[])=>{const before=w.pickups.length,result=native.apply(w,args);for(const p of w.pickups.slice(before))if(!knownDrop.has(realmKey(w)+':'+p.id)){const row={...context(),id:p.id,minerals:p.minerals,gas:p.gas,origin:deathScope||('kind'in args[0]?'special-resource:'+args[0].kind:'other'),collected:false,expired:false};knownDrop.set(realmKey(w)+':'+p.id,row);pendingDrop.set(realmKey(w)+':'+p.id,row);drops.push(row);}return result;});
 for(const name of ['purchaseDevelopmentOffer','purchaseShopOffer','purchaseRepair','reviveHero','reroll','equipItem','issueMove','awardPermanentResource'])if(name!=='issueMove')wrap(name,(native:any,args:any[])=>{const before={...w.wallet},beforeDust=a.dust,offer=w.rewards?.find((v:any)=>v.offerId===args[1]);const oldScope=scope;if(name==='purchaseDevelopmentOffer')scope='development';let result;try{result=native.apply(w,args);}finally{scope=oldScope;}if(result===true||result?.ok)events.push({...context(),kind:name,args:structuredClone(args),offer:offer?{id:offer.id,name:offer.name,effect:offer.expeditionEffect,minerals:offer.minerals,gas:offer.gas}:undefined,walletBefore:before,walletAfter:{...w.wallet},dustBefore:beforeDust,dustAfter:a.dust});return result;});
 function noteOnce(key:string,data:any){if(seen.has(key))return;seen.add(key);events.push({...context(),...data});}
 function inspect(){
  const accountChanged=a!==w.starship.account;if(accountChanged){a=w.starship.account;attachDust(a);lastRevision=-1;}
  const m=w.missions.active,e=w.encounters.active,x=w.encounters.expanded;
  if(m)noteOnce('mission:'+m.id,{kind:'mission-start',id:m.id,type:m.kind});if(w.missions.lastResult)noteOnce('mission-end:'+w.missions.lastResult.id,{...w.missions.lastResult,type:w.missions.lastResult.kind,kind:'mission-end'});
  if(e)noteOnce('encounter:'+e.id,{kind:'encounter-start',id:e.id,type:e.kind,bait:!!e.bait});for(const y of [x.short,x.queen])if(y)noteOnce('encounter:'+y.id,{kind:'encounter-start',id:y.id,type:y.kind,bait:!!y.bait});
  for(const [which,y] of [['base',w.encounters.last],['expanded',x.last]])if(y&&!eventEnds.has(y)){eventEnds.add(y);events.push({...context(),...y,type:y.kind,kind:'encounter-end',which});}
  const h=w.fieldEvents.horde;if(h)noteOnce('horde:'+h.started+':'+h.kind,{...h,type:h.kind,kind:'horde-start',bait:hordeSources.get(h.started+':'+h.kind)??false});
  const last=w.fieldEvents.lastHorde;if(last)noteOnce('horde-end:'+last.started+':'+last.kind,{...last,type:last.kind,kind:'horde-end'});
  const special=w.specialStages.active;if(special)noteOnce('special:'+special.id,{kind:'special-start',id:special.id,type:special.kind});
  if(w.specialStages.last&&!eventEnds.has(w.specialStages.last)){eventEnds.add(w.specialStages.last);events.push({...context(),...w.specialStages.last,type:w.specialStages.last.kind,kind:'special-end'});}
  const p=w.fieldEvents.pacing;noteOnce('pacing:'+stageKey(w)+':'+JSON.stringify([p.rolled,p.pending,p.started,p.choice,p.lastKey]),{kind:'event-pacing',rolled:p.rolled,pending:p.pending,started:p.started,choice:p.choice?{...p.choice}:null,lastKey:p.lastKey});
  if(lastRevision!==a.revision){lastRevision=a.revision;const now=new Map<string,string>();for(const [id,item] of Object.entries(a.items) as [string,any][]){const loc=a.locations[id];now.set(id,loc?.kind??'unknown');if(!seenEquipment.has(id)){seenEquipment.add(id);const receipts=Object.entries(a.receipts).filter(([,ids]:any)=>ids.includes(id)).map(([key])=>key);items.set(id,{...context(),item:structuredClone(item),sourceReceipts:receipts,initialLocation:{...loc},locations:[],collected:loc?.kind!=='ground'});}const row=items.get(id);if(row&&lastInventory.get(id)!==loc?.kind){row.locations.push({...context(),location:{...loc}});if(loc?.kind==='backpack'||loc?.kind==='equipped'||loc?.kind==='warehouse')row.collected=true;}}for(const [id,loc] of lastInventory)if(!accountChanged&&!now.has(id)&&items.has(id))items.get(id).removed={...context(),from:loc,phase:w.phase};lastInventory=now;}
  const stage=stageKey(w),realm=realmKey(w),live=new Set(w.pickups.map((p:any)=>p.id));for(const row of pendingDrop.values()){if(row.realm!==previousRealm||row.stage!==previousStage)continue;if(!live.has(row.id)&&realm===previousRealm){if(stage===previousStage){row.collected=true;row.collectedAt=round(w.time);}else {row.expired=true;row.expiredAt=round(w.time);}pendingDrop.delete(row.realm+':'+row.id);}else if(!live.has(row.id)&&previousRealm!=='normal'&&realm==='normal'){row.expired=true;row.expiredAt=round(w.time);row.reason='special-return-uncollected';pendingDrop.delete(row.realm+':'+row.id);}}previousStage=stage;previousRealm=realm;
 }
 function sample(reason='periodic'){
  inspect();const production=Object.values(w.expedition.production).flatMap((p:any)=>p?.outputs??[]),snapshot={...context(),reason,phase:w.phase,wallet:{...w.wallet},dust:a.dust,bait:structuredClone(w.funShop.bait),permanent:w.permanentProfile.raceBalance(w.expedition.race),economy:structuredClone(w.economyTotals),stats:{...w.stats},allies:w.allies().filter((u:any)=>!u.temporary&&!u.summonKind).map((u:any)=>({id:u.id,type:u.unitType,rank:u.rank,hp:round(u.hp),maxHp:round(u.maxHp),hero:u.heroId??null,elite:u.eliteId??null})),enemies:w.enemyCount(),queue:w.ambientBacklog.length,workers:w.workers,gear:Object.entries(a.equipped[w.expedition.race]).map(([slot,id]:any)=>({slot,id,quality:a.items[id]?.quality,template:a.items[id]?.template})),items:Object.values(a.locations).reduce((o:any,l:any)=>(o[l.kind]=(o[l.kind]??0)+1,o),{}),production,tech:{...w.expedition.tech},groups:structuredClone(w.expedition.building?.groups??[]),ledger:w.expedition.ledger.map((j:any)=>({id:j.id,family:j.family,state:j.state,passengers:j.passengers.map((p:any)=>({purpose:p.purpose,status:p.status,paid:p.paid}))})),special:w.specialStages.active?{kind:w.specialStages.active.kind,clock:w.specialStages.active.clock,hits:w.specialStages.active.hits}:null};samples.push(snapshot);return snapshot;
 }
 function finish(){inspect();const rows=[...transactions.values()];const sum=(currency:string)=>rows.filter(x=>x.currency===currency&&x.kind!=='special-transfer').reduce((s,x)=>s+x.amount,0);return {initialWallet:initial,initialDust,transactions:rows.map(x=>({...x,amount:round(x.amount)})),walletTransitions,samples,events,drops,kills,births,items:[...items.values()],reconciliation:{minerals:round(w.wallet.minerals-initial.minerals-sum('minerals')),gas:round(w.wallet.gas-initial.gas-sum('gas')),dust:round(a.dust-initialDust-sum('dust'))}};}
 return {inspect,sample,finish};
}

/** Visible-projectile constant-velocity avoidance; no future cue/pattern/RNG inspection. */
export function dodgeTarget(w:any,horizon=1.5,vision=8){
 const a=w.specialStages.active,anchor=w.anchor,speed=Math.min(...a.participants.map((id:number)=>w.entities.get(id)?.moveSpeed??3));
 let best={x:anchor.x,z:anchor.z},score=-Infinity;
 for(let i=-1;i<16;i++){const dir=i<0?{x:0,z:0}:{x:Math.sin(i*Math.PI/8),z:Math.cos(i*Math.PI/8)},p={x:Math.max(-15.5,Math.min(15.5,anchor.x+dir.x*speed*horizon)),z:Math.max(-15.5,Math.min(15.5,anchor.z+dir.z*speed*horizon))};let clearance=10;
  for(const b of a.barrage){if(b.hit||distance(b,anchor)>vision)continue;for(let n=1;n<=6;n++){const t=horizon*n/6,ux=anchor.x+(p.x-anchor.x)*n/6,uz=anchor.z+(p.z-anchor.z)*n/6;clearance=Math.min(clearance,Math.hypot(ux-(b.x+b.vx*t),uz-(b.z+b.vz*t)));}}
  const value=Math.min(clearance,4)-.01*distance(p,{x:0,z:4})-.03*distance(p,anchor);if(value>score){score=value;best=p;}
 }return best;
}

export function economyController(w:any,r:any,race:string,options:{preserveSets?:boolean}={}){
 const build=BUILDS.find(b=>b.id===BUILD_IDS[race as keyof typeof BUILD_IDS])!;
 const base=createCampaignController(w,build),events:any[]=[];let lastMove=-100,lastSpecial='',crossIndex=0,clearUntil=0;let progress:any=null;
 const lines=race==='terran'?['barracks','starport']:race==='zerg'?['zerg.evolution','zerg.basic']:['robotics','gateway'];
 const core=race==='terran'?['unlock.reaper','unlock.marauder','factory','starport','unlock.science_vessel','unlock.viking','stim','shield']:race==='zerg'?['unlock.roach','unlock.queen','hatchery','evolve-zerg.evolution','unlock.ravager','unlock.lurker','hydra_range']:['unlock.adept','unlock.stalker','unlock.sentry','robotics','unlock.immortal','unlock.colossus','colossus_range'];
 const development=[...core.map(id=>({id,level:id==='hatchery'?2:1})),...lines.flatMap(line=>[{id:'system.'+line,level:1},...Array.from({length:3},(_,i)=>[{id:'research.'+line+'.weapon',level:i+1},{id:'research.'+line+'.defense',level:i+1}]).flat()])];
 function completed(d:any){if(d.id.startsWith('evolve-'))return w.expedition.building?.groups.some((g:any)=>g.directions.includes(d.id.endsWith('.air')?'air':'ground'));return (w.expedition.tech[d.id]??0)>=d.level;}
 function nextDevelopment(){return development.find(d=>!completed(d));}
 function setTarget(){w.setDevelopmentTarget(nextDevelopment()?.id??null);}
 const record=(kind:string,data:any)=>events.push({stage:stageKey(w),time:round(w.time),kind,data});
 const move=(p:any)=>{if(w.time-lastMove<.2||w.order&&distance(w.order.point,p)<.75)return;const ok=w.issueMove({x:p.x,z:p.z});if(ok){lastMove=w.time;record('move',{x:round(p.x),z:round(p.z)});}return ok;};
 const hold=()=>{if(w.order)w.cancelOrder();};
 function approach(target:any,range=0){
  if(w.time<clearUntil){hold();return;}
  const d=distance(w.anchor,target),fighters=w.allies().filter((u:any)=>u.weaponDamage>0&&!u.summonKind);
  if(d<=range+.4){hold();return;}
  if(!progress||progress.id!==target.id||d<progress.distance-.5)progress={id:target.id,distance:d,at:w.time};
  if(w.time-progress.at>=1.5&&fighters.some((u:any)=>[...w.entities.values()].some((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran')&&w.canFireAt(u,e,0)))){clearUntil=w.time+1;progress.at=clearUntil;hold();return;}
  const rr=Math.max(0,range-.2);move({x:target.x+(w.anchor.x-target.x)/(d||1)*rr,z:target.z+(w.anchor.z-target.z)/(d||1)*rr});
 }
 function inventory(){
  const a=w.starship.account;for(const slot of ['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4']){
   const old=a.items[a.equipped[race][slot]];if(options.preserveSets&&old&&r.equipmentTemplate(old.template)?.kind==='set')continue;const score=(i:any)=>i?i.quality*10000+Object.values(r.itemValues(i)).reduce((s:number,v:any)=>s+Number(v),0):0;
   const next=Object.values(a.items).filter((i:any)=>i.race===race&&i.slot===slot&&i.pollution!=='uncleansed'&&a.locations[i.id]?.kind==='backpack'&&['attribute','special'].includes(r.equipmentTemplate(i.template)?.kind)).sort((a:any,b:any)=>score(b)-score(a))[0] as any;
   if(next&&score(next)>score(old)){const result=w.equipItem(next.id,slot);record('equip',{id:next.id,quality:next.quality,result});}
  }
  const pack=Object.values(a.items).filter((i:any)=>a.locations[i.id]?.kind==='backpack') as any[];if(pack.length>48){const discard=pack.filter(i=>i.pollution!=='uncleansed'&&!a.run.locked.has(i.id)).sort((a,b)=>a.quality-b.quality).slice(0,pack.length-48);if(discard.length){const result=r.dismantleEquipment(a,discard.map(i=>i.id),a.revision,'intermission');record('dismantle',{ids:discard.map(i=>i.id),result});}}
 }
 function decisions(){
  if(w.expedition.pendingShopSupply){const pending=w.expedition.pendingShopSupply,old=w.expedition.familySlots.find((f:string)=>!build.families.includes(f as any));if(old)w.confirmShopSupply(old);else w.cancelShopSupply();record('supply-resolution',{old:old??null,pending});}
  base.decisions();
  if(w.specialStages.active?.phase==='loading'){assert.ok(r.markSpecialReady(w));record('headless-special-ready',w.specialStages.active.kind);}
  if(w.specialStages.active?.phase==='loot'){
   const a=w.starship.account;for(let i=0;i<8&&Object.values(a.locations).filter((l:any)=>l.kind==='backpack').length>60;i++){const item=Object.values(a.items).filter((v:any)=>a.locations[v.id]?.kind==='backpack'&&!a.run.locked.has(v.id)).sort((a:any,b:any)=>a.quality-b.quality)[0] as any;if(!item)break;record('discard-for-loot',{id:item.id,result:r.discardEquipment(a,item.id)});}
   r.collectSpecialRewards(w);assert.ok(r.quitSpecialStage(w),'Completed special return refused');
  }
 }
 function configure(){
  base.configure();
  if(race==='zerg'&&(w.phase==='menu'||w.phase==='reward')){
   const b=w.expedition.building;
   for(const g of b.groups){const pool=build.families.filter((f:any)=>r.canProduce(b,g,f)),count=(f:any)=>w.familyUnits(f).length+w.expedition.ledger.filter((j:any)=>j.family===f).reduce((n:number,j:any)=>n+j.passengers.filter((p:any)=>p.status==='waiting').length,0);
    const choices=pool.sort((a:any,b:any)=>count(a)-count(b)||build.families.indexOf(a)-build.families.indexOf(b)).slice(0,2);
    if(!choices.length&&r.canProduce(b,g,'zergling'))choices.push('zergling');
    assert.ok(w.setBuildingGroupOutputs(g.id,choices));
   }
  }
 }
 function intermission(){
  inventory();const s=w.expedition,reserve={minerals:race==='protoss'?100:50,gas:25};
  for(const id of w.heroes.keys())if(w.canReviveHero(id))record('revive',{id,ok:w.reviveHero(id)});
  const damaged=w.allies().filter((u:any)=>u.hp<u.maxHp*.95).map((u:any)=>u.id),quote=w.previewRepair(damaged);if(quote&&quote.minerals<=w.wallet.minerals-reserve.minerals&&quote.gas<=w.wallet.gas-reserve.gas)record('repair',{quote,ok:w.purchaseRepair(quote.id)});
  const desired=nextDevelopment();if(w.rewardRound==='building'){
   const definition=DEVELOPMENT.find(d=>d.id===desired?.id);if(definition?.line)assert.ok(w.setDevelopmentDirection(definition.line));
   const shelf=w.rewards.map((v:any)=>({id:v.id,effect:v.expeditionEffect,minerals:v.minerals,gas:v.gas,eligible:w.canChooseReward(v)}));record('development-shelf',{desired,wallet:{...w.wallet},offers:shelf});
   const offer=w.rewards.find((v:any)=>v.expeditionEffect.kind==='development'&&v.expeditionEffect.definitionId===desired?.id);
   if(offer&&offer.minerals<=w.wallet.minerals-reserve.minerals&&offer.gas<=w.wallet.gas-reserve.gas){const target=definition?.kind==='evolution'?w.expedition.building.groups.filter((g:any)=>g.kind==='hatchery'&&!g.directions.includes(definition.direction)).at(-1)?.ids[0]:undefined;const ok=w.purchaseDevelopmentOffer(w.draftWindowKey,offer.offerId,s.shopRevision,target);record('development',{desired,target,ok});assert.ok(ok,'Eligible native development purchase refused');}
   if(w.rewardRound==='building')assert.ok(w.skipDevelopment());
  }
  record('shelf',{wallet:{...w.wallet},round:w.rewardRound,offers:w.rewards.map((v:any)=>({id:v.id,effect:v.expeditionEffect,minerals:v.minerals,gas:v.gas,affordable:w.canChooseReward(v)}))});
  const score=(v:any)=>v.expeditionEffect.kind==='resource'?120:v.expeditionEffect.kind==='hero'?100:v.expeditionEffect.kind==='elite'?90:v.expeditionEffect.kind==='card'&&v.expeditionEffect.effect==='cultivation'?80:50;
  for(const card of [...w.rewards].sort((a:any,b:any)=>score(b)-score(a))){if(!w.canChooseReward(card)||card.expeditionEffect.kind!=='resource'&&(card.minerals>w.wallet.minerals-reserve.minerals||card.gas>w.wallet.gas-reserve.gas))continue;const variant=card.expeditionEffect.kind==='elite'?w.eliteVariants(card.expeditionEffect.family)[0]?.id:undefined;if(w.purchaseShopOffer(w.draftWindowKey,card.offerId,s.shopRevision,variant))record('shop',card.id);decisions();}
  setTarget();configure();assert.ok(w.finishIntermission());
 }
 function think(){
  const special=w.specialStages.active;if(special){if(special.kind==='dodge'){move(dodgeTarget(w));return;}if(special.id!==lastSpecial){lastSpecial=special.id;crossIndex=0;}
   if(special.kind==='resources'){const target=[...special.resources.values()].filter((b:any)=>b.hp>0).sort((a:any,b:any)=>distance(a,w.anchor)-distance(b,w.anchor))[0] as any;if(target){const fighters=w.allies().filter((u:any)=>u.weaponDamage>0);if(fighters.some((u:any)=>w.canFireAt(u,target,0)))hold();else approach(target,Math.max(1,Math.min(...fighters.map((u:any)=>u.attackRange))-.5));}else base.think();return;}
   if(special.kind==='crossing'){const way=[{x:-12,z:42},{x:-12,z:20},{x:0,z:20},{x:0,z:10},{x:-12,z:10},{x:-12,z:-10},{x:0,z:-10},{x:0,z:-20},{x:-12,z:-20},{x:-12,z:-42},{x:0,z:-42},{x:0,z:-50}];while(crossIndex<way.length-1&&distance(w.anchor,way[crossIndex])<1)crossIndex++;if(crossIndex===way.length-1){move(way[crossIndex]);return;}approach({...way[crossIndex],id:1000000+crossIndex},0);return;}
   base.think();return;
  }
  base.configure();const allies=w.allies().filter((u:any)=>!u.temporary&&!u.summonKind),enemies=[...w.entities.values()].filter((e:any)=>e.owner==='zerg'&&e.hp>0&&w.visibleTo(e,'terran'));
  const urgent=[...w.expansionHives.values()].filter((x:any)=>x.hp>0).sort((a:any,b:any)=>distance(a,w.anchor)-distance(b,w.anchor))[0] as any;
  if(urgent&&(w.difficulty==='hell'||w.endless||distance(urgent,w.anchor)<20)){const fighters=allies.filter((u:any)=>u.weaponDamage>0);if(fighters.some((u:any)=>w.canFireAt(u,urgent,0)))hold();else approach(urgent,Math.max(.4,Math.min(...fighters.map((u:any)=>u.attackRange))-.4));return;}
  if(w.stage===18&&!w.endless&&(w.hive?.hp>0||!w.campaign18Runtime?.finalBossKilled)){base.think();return;}
  const danger=enemies.some((e:any)=>distance(e,w.anchor)<5),m=w.missions.active;
  if(m){const bodies=m.bodyIds.map((id:number)=>w.missions.bodies.get(id)).filter((b:any)=>b&&b.hp>0&&!b.resolved&&b.role!=='base');const target=bodies.sort((a:any,b:any)=>distance(a,w.anchor)-distance(b,w.anchor))[0];if(target){const range=m.kind==='repair'?4:m.kind==='escort'?2:m.kind==='rescue'?2:m.kind==='intel'||m.kind==='fleet'?1:Math.max(.5,Math.min(...allies.filter((u:any)=>u.weaponDamage>0).map((u:any)=>u.attackRange))-.4);if(!danger||m.kind==='repair'||m.kind==='escort'){if(target.owner==='zerg'&&allies.some((u:any)=>w.canFireAt(u,target,0)))hold();else approach(target,range);return;}}}
  if(!danger){const portal=w.specialStages.portal;if(portal){approach({...portal.point,id:-2},0);return;}
   const ground=Object.entries(w.starship.account.locations).filter(([,l]:any)=>l.kind==='ground'&&l.run===w.starship.account.run?.id).map(([id,l]:any)=>({id,x:l.x,z:l.z})).filter((p:any)=>Number.isFinite(p.x)&&distance(p,w.anchor)<16).sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];if(ground){approach(ground,.3);return;}
   const event=w.encounters.active??w.encounters.expanded.short;if(event){const u=event.subject?w.entities.get(event.subject):event.actors?.map((id:number)=>w.entities.get(id)).find((u:any)=>u?.hp>0),p=u??event.point;if(p){if(u?.owner==='zerg'&&allies.some((a:any)=>w.canFireAt(a,u,0)))hold();else approach({...p,id:u?.id??-3},u?.owner==='zerg'?1:2);return;}}
  }
  base.think();
 }
 return {events,base,initialize:()=>{setTarget();configure();},configure,decisions,intermission,think};
}

export function comparableState(w:any){return {stage:w.stage,time:w.time,tick:w.tick,phase:w.phase,rng:w.rngState,wallet:{...w.wallet},economy:w.economyTotals,stats:w.stats,entities:[...w.entities.values()].map((u:any)=>({id:u.id,type:u.unitType,hp:u.hp,x:u.x,z:u.z,rank:u.rank,shield:u.shield})),items:w.starship.account.items,locations:w.starship.account.locations,equipmentRng:w.starship.account.rng,workers:w.workers,funShop:w.funShop,fieldEvents:w.fieldEvents,missions:w.missions.active?{kind:w.missions.active.kind,age:w.missions.active.age}:null};}
