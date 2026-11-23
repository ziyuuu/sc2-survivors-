import {HEROES} from '../../data/heroes';
import type {Entity} from '../types';
import type {World} from '../world';
import {refreshExpeditionHero} from './expedition-heroes';
import {syncSwarmHeroProgress} from './zerg-hero-passives';

export function isSwarmHeroTwin(w:World,u:Entity){
 return w.expedition.zergSwarm?.twin?.body===u.id;
}
/** Preserve one identity while either body remains. A full loss uses native hero recovery once. */
export function noteSwarmHeroDeath(w:World,u:Entity){
 const t=w.expedition.zergSwarm?.twin;if(!t?.hero||t.hero!==u.heroId)return false;
 const record=w.heroes.get(t.hero);if(!record)return false;
 if(u.id!==record.entityId&&u.id!==t.body)return false;
 const other=u.id===record.entityId?t.body:record.entityId;
 const survivor=other==null?undefined:w.entities.get(other);
 if(!survivor?.hp){if(t.body!==undefined)record.entityId=u.id;t.body=undefined;t.next=undefined;return false;}
 record.entityId=survivor.id;t.body=u.id;t.next=w.time+60;t.energy=u.energy;return true;
}
export function tickSwarmHero(w:World){
 const t=w.expedition.zergSwarm?.twin;if(!t)return;
 const id=t.hero??=[...w.heroes.keys()][0];if(!id)return;
 const record=w.heroes.get(id);if(!record)return;
 let base=record.entityId===null?undefined:w.entities.get(record.entityId),twin=t.body===undefined?undefined:w.entities.get(t.body);
 if(twin&&twin.hp>0&&(!base||base.hp<=0)){
  const missing=base?.id??record.entityId??undefined;
  if(t.next===undefined){t.next=w.time+60;t.energy=base?.energy??0;}
  record.entityId=twin.id;t.body=missing;
  base=twin;twin=undefined;
 }
 if(!base||base.hp<=0){t.next=undefined;t.body=undefined;return;}
 if(twin?.hp){if(twin.rank!==record.rank){twin.rank=record.rank;refreshExpeditionHero(w,twin);}return;}
 if(t.body!==undefined&&t.next===undefined){t.next=w.time+60;t.energy=twin?.energy??0;}
 if(t.next!==undefined&&w.time<t.next)return;
 const data=HEROES[id],point=w.freePosition(data.baseFamily,base,1,6);if(!point)return;
 const u=w.addUnit(data.baseFamily,'terran',point.x,point.z,record.rank);
 u.heroId=id;u.modelKey=data.model;u.slot=10000+u.id;u.swarmHeroTwin=true;
 t.body=u.id;syncSwarmHeroProgress(w,u);refreshExpeditionHero(w,u,true);
 if(t.next!==undefined){u.hp=u.maxHp*.5;u.energy=Math.min(t.energy??0,u.maxEnergy);}
 t.body=u.id;t.next=undefined;w.visual('hero-revive',u);
}
