import type {World} from '../../simulation/world';
import type {Entity} from '../../simulation/types';

const permanentAlly=(u:Entity)=>u.owner==='terran'&&!u.temporary&&!u.summonKind&&u.summonOwnerId===undefined&&!u.attributes.includes('Structure');
const boss=(u:Entity)=>u.owner==='zerg'&&u.hp>0&&(u.enemyTier==='boss'||u.enemyTier==='lord');
export interface DistressFrame {opacity:number;boss:boolean;casualty:boolean;shakeX:number;shakeZ:number}
const quiet=():DistressFrame=>({opacity:0,boss:false,casualty:false,shakeX:0,shakeZ:0});
/** Read-only observer. Animation clocks use battle time and never enter run snapshots. */
export class BattleDistress {
 private run='';private lastTime=-1;private lastSerial=0;private initialized=false;
 private bosses=new Set<number>();private allies=new Set<number>();
 private casualtyAt=-Infinity;private bossAt=-Infinity;
 frame:DistressFrame=quiet();
 reset(){this.initialized=false;this.bosses.clear();this.allies.clear();this.casualtyAt=this.bossAt=-Infinity;this.lastSerial=0;this.lastTime=-1;this.frame=quiet();}
 update(w:World,motion:boolean,shake:boolean):DistressFrame{
  if(this.run!==w.runId||w.time<this.lastTime){this.reset();this.run=w.runId??'';}
  const active=w.phase==='battle'&&!w.paused&&!w.requiresPlayerDecision;
  const first=!this.initialized;this.initialized=true;this.lastTime=w.time;
  const currentBosses=new Set<number>(),currentAllies=new Set<number>();
  for(const u of w.entities.values()){if(boss(u))currentBosses.add(u.id);if(u.hp>0&&permanentAlly(u))currentAllies.add(u.id);}
  if(active&&!first){
   for(const id of currentBosses)if(!this.bosses.has(id)){this.bossAt=w.time;break;}
   for(const event of w.visualEvents)if(event.serial>this.lastSerial&&event.kind==='death'){
    const u=w.entities.get(event.entityId);
    if(u?permanentAlly(u):this.allies.has(event.entityId))this.casualtyAt=event.time;
   }
  }
  for(const event of w.visualEvents)this.lastSerial=Math.max(this.lastSerial,event.serial);
  this.bosses=currentBosses;this.allies=currentAllies;
  if(!active){this.casualtyAt=this.bossAt=-Infinity;return this.frame=quiet();}
  const present=currentBosses.size>0,age=w.time-this.casualtyAt,bossAge=w.time-this.bossAt;
  const casualty=Math.max(0,1-age/2.4),edge=present?(motion?.18+.025*Math.sin(w.time*2.2):.18):0;
  const amplitude=motion&&shake&&present&&bossAge<.85?.24*Math.pow(1-bossAge/.85,2):0;
  return this.frame={opacity:Math.min(.64,edge+casualty*(present?.46:.37)),boss:present,casualty:casualty>0,shakeX:amplitude?amplitude*Math.sin(bossAge*63):0,shakeZ:amplitude?amplitude*.6*Math.sin(bossAge*47):0};
 }
}
