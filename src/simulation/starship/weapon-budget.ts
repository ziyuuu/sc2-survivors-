import type {World} from '../world';
import type {Entity,Body} from '../types';

/** Counts native delivery lanes, before percentage-derived splash/bounces and equipment copies. */
export function equipmentNativeWeaponBudget(w:World,u:Entity,target:Body,hits:number){let packets=Math.max(1,hits),weight=packets;const id=u.eliteId;
 if(!id||u.heroId||u.summonKind)return {packets,weight};
 const terran=u.eliteCombat,zerg=u.zergEliteCombat,protoss=u.protossEliteCombat;
 if(id==='reaper.1'){packets=6;weight=6;}
 if(id==='marauder.3'){packets=3;weight=3*.65;}
 if(id==='reaper.2'){const cycles=!terran||terran.lastFire<0||w.time-terran.lastFire>=2?1:terran.cycles+1;if(cycles<=10)weight*=3;}
 if(id==='viking.1'&&u.nativeMode!=='viking_assault'){const stacks=!terran||terran.lastFire<0||w.time-terran.lastFire>=2||terran.target!==target.id?0:terran.stacks;if(!stacks){packets+=2;weight+=1.5;}weight*=1+.35*stacks;}
 if(zerg||['zergling','baneling','roach','ravager','hydralisk','lurker','queen','mutalisk','corruptor','ultralisk'].includes(u.unitType)){
  const cycle=(zerg?.cycles??0)+1;let factor=id==='zergling.2'&&cycle%3===0?4:id==='queen.3'?2:1;
  if(['roach','ravager','hydralisk','queen','mutalisk','corruptor'].includes(u.unitType))packets=weight=1;
  if(id==='roach.2'){const stacks=zerg?.target===target.id?zerg.stacks:0;factor=stacks===5?4:1+.3*(stacks+1);}
  if(id==='lurker.3'&&(zerg?.opening??0)>0)factor=4;
  if(u.unitType==='baneling')factor*=id==='baneling.1'?3:id==='baneling.2'?2:1.8;
  if(id==='hydralisk.1'){packets=5;weight=3.5;}
  if(id==='mutalisk.2'){packets=3;weight=3;}
  if(id==='lurker.1'){packets=3;weight=3;}
  if(id==='lurker.2'&&cycle%4===0)factor*=5;
  if(id==='ultralisk.1'&&cycle%3===0)factor*=3;
  weight*=factor;
 }
 if(protoss||['zealot','adept','stalker','sentry','immortal','colossus','phoenix','void_ray','carrier','high_templar'].includes(u.unitType)){
  const cycle=(protoss?.cycles??0)+1;let factor=id==='zealot.2'&&(protoss?.boostUntil??0)>w.time?3:1;
  if((protoss?.opening??0)>0&&(['zealot.3','stalker.2','phoenix.3'].includes(id)||id==='adept.2'&&protoss?.openingTarget===target.id)||id==='adept.2'&&!protoss?.episode&&w.time-(protoss?.lastFire??-100)>=2||id==='phoenix.3'&&!protoss?.episode&&(protoss?.charge??0)>0)factor*=3;
  if(id==='immortal.1'&&protoss?.chargedStrike)factor*=1.5;
  if(id==='stalker.1'&&cycle%4===0){packets=3;weight=3.6;}
  if(id==='phoenix.1'){packets=6;weight=6;}
  if(id==='void_ray.2')weight*=1.5;
  weight*=factor;
 }
 return {packets,weight};
}
