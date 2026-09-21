import type {World} from '../src/simulation/world';
import {distance,steerGoal} from '../src/simulation/movement/steering';
import {eligibleReward} from '../src/simulation/progression/rewards';
/** Analysis controller only. Sends ordinary input/card choices; never changes HP, money, spawns or clocks. */
export class PlayPolicy {
 nextThink=0;target:{x:number;z:number}|null=null;choices:string[]=[];
 constructor(public style:'careful'|'wasteful'|'idle'='careful'){}
 choose(w:World){if(this.style==='idle'){w.skipReward();return;}
  if(this.style==='wasteful'){while(w.reroll()){}w.skipReward();return;}
  const priority=['build.starport','build.factory','tech.shield','tech.infernal','tech.infantry','tech.vehicle','tech.medivac','tech.siege','tech.discount','economy.gas','economy.minerals','economy.salvage','train.medivac','train.tank','train.hellion','train.marine','tech.stim','economy.supply'];
  const affordable=()=>w.rewards.filter(r=>eligibleReward(w,r)).sort((a,b)=>priority.indexOf(a.id)-priority.indexOf(b.id));
  let choices=affordable();const desired=w.stage>=2&&!w.buildings.has('starport')?'build.starport':w.stage>=2&&!w.buildings.has('factory')?'build.factory':null;let rolls=0;while(desired&&!choices.some(r=>r.id===desired)&&w.wallet.minerals>210&&w.wallet.gas>=100&&rolls++<3){w.reroll();choices=affordable();}
  if(choices[0]){this.choices.push(choices[0].id);w.choose(choices[0].id);}else{this.choices.push('skip');w.skipReward();}
 }
 update(w:World){if(w.phase==='reward'){this.choose(w);return;}if(w.time<this.nextThink||w.phase!=='battle')return;this.nextThink=w.time+.12;
  if(this.style==='idle'){w.input={x:0,z:0};return;}
  const allies=w.allies(),fighters=allies.filter(u=>u.unitType!=='medivac');if(!fighters.length)return;
  const center={x:fighters.reduce((s,u)=>s+u.x,0)/fighters.length,z:fighters.reduce((s,u)=>s+u.z,0)/fighters.length};
  const enemies=[...w.entities.values()].filter(u=>u.owner==='zerg'&&u.hp>0),nearest=enemies.sort((a,b)=>distance(a,center)-distance(b,center))[0];
  let goal:{x:number;z:number}|undefined,stop=.35;
  const pods=w.pods.filter(p=>['falling','active','opening'].includes(p.status)).sort((a,b)=>(distance(a,center)-(a.unitType==='medivac'&&!allies.some(u=>u.unitType==='medivac')?25:0))-(distance(b,center)-(b.unitType==='medivac'&&!allies.some(u=>u.unitType==='medivac')?25:0)));
  const eggs=[...w.economicTargets.values()].filter(e=>e.kind==='egg'&&e.status==='active').sort((a,b)=>a.expiresAt!-b.expiresAt!);
  if(eggs[0]&&distance(center,eggs[0])<Math.max(8,(eggs[0].expiresAt!-w.time-3)*2.5)){goal=eggs[0];stop=2;}
  else if(pods[0]){goal=pods[0];stop=2;}
  else if(w.stage===12&&w.hive&&w.hive.hp>0){goal=w.hive;stop=6;}
  else {goal=[...w.economicTargets.values()].filter(e=>e.kind==='drone'&&e.status==='active').sort((a,b)=>distance(a,center)-distance(b,center))[0];stop=2;if(!goal){goal=w.pickups.sort((a,b)=>distance(a,w.anchor)-distance(b,w.anchor))[0];stop=.7;}}
  if(nearest){const d=distance(nearest,center),danger=enemies.filter(e=>distance(e,center)<4.5).length;
   if(d<4.3&&(fighters.length<3||danger>fighters.length*3||nearest.unitType==='baneling')){const dx=center.x-nearest.x,dz=center.z-nearest.z,n=Math.hypot(dx,dz)||1;goal={x:center.x+dx/n*5,z:center.z+dz/n*5};stop=.2;}
   else if(d<6.2){goal=undefined;}
  }
  if(allies.some(u=>u.unitType==='medivac')&&fighters.some(u=>u.hp/u.maxHp<.65)&&(!nearest||distance(nearest,center)>8))goal=undefined;
  const bile=w.effects.find(f=>f.kind==='bile'&&f.until-w.time<1.2&&distance(f.end,center)<f.radius+2);if(bile){const dx=center.x-bile.end.x||1,dz=center.z-bile.end.z,n=Math.hypot(dx,dz);goal={x:center.x+dx/n*5,z:center.z+dz/n*5};stop=.2;w.dash();}
  if(!goal||distance(w.anchor,goal)<stop||w.maxStretch>12&&(!nearest||distance(nearest,center)>6)){w.input={x:0,z:0};return;}
  goal={x:Math.max(-w.mapHalf+1.2,Math.min(w.mapHalf-1.2,goal.x)),z:Math.max(-w.mapHalf+1.2,Math.min(w.mapHalf-1.2,goal.z))};
  const routed=steerGoal(w.anchor,goal,.8,w.obstacles),dx=routed.x-w.anchor.x,dz=routed.z-w.anchor.z,n=Math.hypot(dx,dz);w.input=n>.2?{x:dx/n,z:dz/n}:{x:0,z:0};
 }
}
