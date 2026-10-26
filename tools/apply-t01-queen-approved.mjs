import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
async function edit(file,changes){let s=await fs.readFile(file,'utf8');for(const [from,to]of changes){assert.equal(s.split(from).length-1,1,file+': '+from.slice(0,70));s=s.replace(from,to);}await fs.writeFile(file,s);}
await edit('src/simulation/types.ts',[[`specialReady?:number;lastSkillAt?:number;`,`specialReady?:number;corrosiveBileReady?:number;lastSkillAt?:number;`]]);
await edit('src/simulation/world.ts',[
 [`this.statuses.apply(target.id,id,kind,value*strength,duration,this.time);`,`return this.statuses.apply(target.id,id,kind,value*strength,duration,this.time);`],
 [`this.statuses.tick(this.time);`,`this.statuses.tick(this.time,(status,amount,owner)=>{const target=this.entities.get(status.target);if(target&&target.hp>0&&!target.heldBy&&(funRelation(this,this.entities.get(status.source),target,owner,status.source)??target.owner!==owner))this.hit(target,amount,[],1,owner,0,1,status.source);});`]
]);
await edit('src/simulation/combat/enemy-specials.ts',[
 [`export interface EnemyCast extends PacketOwner {visual?`,`export interface EnemyCast extends PacketOwner {corruptionDot?:number;visual?`],
 [`private addCast(u:Entity,c:EnemyCast,target:Body){c.visual=`,`private addCast(u:Entity,c:EnemyCast,target:Body){if(u.unitType==='queen'&&c.kind==='bile'){c.damage=0;c.percent=0;c.corruptionDot=u.weaponDamage*.1*this.w.enemyDamageFactor(u);}c.visual=`],
 [` private newBoss(u:Entity){`,` private queenBile(u:Entity){
  const w=this.w;if(u.windup>0||w.time<(u.corrosiveBileReady??0))return;
  const range=10,target=w.findTarget(u,range);if(!target||w.edgeDistance(u,target)>range||!this.clear(u,target))return;
  const angle=Math.atan2(target.x-u.x,target.z-u.z),point={x:target.x,z:target.z},count=3;
  const points=Array.from({length:count},(_,i)=>i===0?point:{x:point.x+Math.sin(angle+(i-1)*Math.PI*2/(count-1))*2.2,z:point.z+Math.cos(angle+(i-1)*Math.PI*2/(count-1))*2.2}).filter(p=>this.clear(u,p)&&(!w.terrain||w.terrain.canOccupy(p,0)));
  this.addCast(u,{id:++this.serial,source:u.id,tier:u.enemyTier!,kind:'bile',origin:{x:u.x,z:u.z},point,points,angle,at:w.time+2.5,damage:0,count,range,radius:1,level:u.enemyLevel??1,percent:0},target);u.corrosiveBileReady=w.time+10;u.lastSkillAt=w.time;
 }
 private newBoss(u:Entity){`],
 [`if(u.enemyTier==='boss'||u.enemyTier==='lord'){const handled=this.newBoss(u);`,`if(u.enemyTier==='boss'||u.enemyTier==='lord'){if(u.unitType==='queen')this.queenBile(u);const handled=this.newBoss(u);`],
 [`if(target&&target.hp>0&&c.level>=2)w.applyStatus(target,c.source,'corruption',[0,.2,.3,.35,.4][c.level-1],4);`,`if(target&&target.hp>0&&(c.level>=2||c.corruptionDot!==undefined)){const status=w.applyStatus(target,c.source,'corruption',[.2,.2,.3,.35,.4][c.level-1],4);if(c.corruptionDot!==undefined)status.periodic={damage:c.corruptionDot,owner:c.credit?.owner??'zerg',nextTick:w.time+1,interval:1};}`]
]);
console.log('Applied approved queen corrosion and periodic damage scope.');
