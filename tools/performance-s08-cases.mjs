import {make,elite,enemies,snapshot} from './performance-s01-s02-cases.mjs';
export {make,elite,enemies,snapshot};
export function hero(lib,w,id){const h=lib.HEROES[id],u=w.addUnit(h.baseFamily,'terran',0,0);u.heroId=id;u.rank=3;w.heroes.set(id,{id,rank:3,entityId:u.id,skillReady:0,revivePaid:false,awaitingSpawn:false});lib.refreshExpeditionHero(w,u,true);return u;}
export function patients(w,n,seed=529){const a=[];for(let i=0;i<n;i++){const u=w.addUnit(['marine','stalker','roach','tank'][i%4],'terran',((i*13+seed)%17-8)*.4,((i*7+seed)%19-9)*.4);u.hp=u.maxHp*(.1+((i*37+seed)%80)/100);u.shield=(u.maxShield??0)*(i%9)/10;u.stoppedUntil=u.nextShotAt=1e9;a.push(u);}return a;}
export function setup(lib,name,n=100,seed=529,variant='wounded'){
 const w=make(lib,'terran',seed);let source,targets,call;w.time=3;w.tick=180;
 if(name.startsWith('medical-')){
  const id=name.slice(8);source=id.includes('.')?elite(lib,w,id):w.addUnit(id,'terran',0,0);targets=patients(w,n,seed);source.energy=100;source.healTarget=targets.at(-1)?.id??null;
  call=()=>lib.healExpedition(w,source,1/60)?.id;
 }else if(['swann','niadra','artanis','purifier_flagship'].includes(name)){
  source=hero(lib,w,name);targets=patients(w,n,seed);
  const tick=name==='swann'?lib.tickTerranHero:name==='niadra'?lib.tickZergHero:lib.tickProtossHero;call=()=>tick(w,source,1/60);
 }else if(name==='guardian'){
  source=elite(lib,w,'sentry.1');targets=patients(w,n,seed);w.protossElites.fields=[{id:w.nextId++,source:lib.cloneCombatSource(w,source),point:{x:0,z:0},radius:9,kind:'guardian',amount:100,period:1,next:3,until:10}];call=()=>lib.tickProtossEliteState(w);
 }else if(name.startsWith('auras-')){
  const id=name.slice(6);if(id==='queen')source=elite(lib,w,'queen.1');if(id==='niadra')source=hero(lib,w,'niadra');targets=patients(w,n,seed);call=()=>lib.tickTeamAuras(w,1/60);
 }else if(name.startsWith('pools-')){
  source=hero(lib,w,'stukov');targets=patients(w,n,seed);
  if(name!=='pools-empty')for(let i=0;i<3;i++)w.zergHeroes.pools.push({id:w.nextId++,source:source.id,rank:i+1,point:{x:i-1,z:0},until:10,next:name==='pools-due'?3:4});call=()=>lib.tickZergHeroState(w);
 }else if(name.startsWith('support-')){
  source=name==='support-hellion'?elite(lib,w,'hellion.3'):w.addUnit('marine','terran',0,0);targets=enemies(w,n,seed);
  if(name==='support-hellion')source.bornAt=-30;
  if(name==='support-barrier')w.eliteSupport.barriers.push({source:source.id,target:source.id,amount:10,until:3.01,cap:.5});
  if(name==='support-fire')w.eliteSupport.fires.push({id:w.nextId++,source:source.id,point:{x:0,z:0},damage:10,next:3,until:5});
  call=()=>lib.tickEliteSupport(w);
 }else if(name==='weapon'){
  source=w.addUnit('marine','terran',0,0);targets=patients(w,n,seed);call=()=>{let result;for(const u of [source,...targets])result=lib.expeditionWeaponBonuses(w,u);return result;};
 }else throw Error(name);
 if(variant==='full')for(const p of targets){p.hp=p.maxHp;p.shield=p.maxShield??0;}
 if(variant==='zero-energy'&&source)source.energy=0;
 if(variant==='reverse')w.entities=new Map([...w.entities].reverse());
 if(variant==='ties')for(const p of targets){p.hp=p.maxHp*.5;p.shield=(p.maxShield??0)*.5;}
 if(variant==='mixed')for(let i=0;i<targets.length;i++){const p=targets[i];if(i%7===0)p.hp=0;else if(i%7===1)p.owner='zerg';else if(i%7===2)p.temporary=true;else if(i%7===3)p.summonKind='interceptor';else if(i%7===4)p.x=90;}
 w.hash.rebuild(w.entities.values());const observed=[];lib.observeWorld(w,(...args)=>observed.push(args));return {w,source,targets,call,observed};
}
