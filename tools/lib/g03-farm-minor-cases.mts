import assert from 'node:assert/strict';
/** Same legal intermediate-tier templates and affix scores as the previous tier audit. */
export function farmMinorGear(r:any,c:any){
 assert(['farm','minor'].includes(c.tier));assert(['hard','hell'].includes(c.difficulty));
 const q=c.difficulty==='hard'?3:4,minor=c.tier==='minor';
 const spec={difficulty:c.difficulty,tier:c.tier,kind:'attribute',qs:minor?[q+1,q+1,q+1,q,q+1,q+1,q+1,q]:[q+1,q,q,q,q+1,q,q,q],mq:minor?q+1:q,score:minor?180:160};
 const a=r.newEquipmentAccount(c.seed),id=[c.race,c.difficulty,c.tier,c.seed].join('-');
 const add=(template:string,slot:string)=>{const g=r.grantEquipment(a,{template,race:c.race,slot},id+':'+slot,{kind:'warehouse'});assert.ok(g.ok);if(r.equipmentTemplate(template).kind==='attribute')g.value.allocation=2;
  const keys=slot.startsWith('offense')?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];
  g.value.affixes=g.value.affixes.map((_:unknown,i:number)=>({key:keys[i],score:spec.score}));assert.ok(r.validateItem(g.value));assert.ok(r.equip(a,c.race,g.value.id,slot).ok);
 };
 for(const [i,slot] of ['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'].entries())add(spec.qs[i]===5?'set.orange.survivor.5':'attribute.'+spec.qs[i],slot);
 const mods=spec.mq===5?['bounty_order','armory','weakness','yamato']:['workers','supply','formation','suppression'];
 for(const [i,slot] of ['gathering','logistics','control','support'].entries())add('module.'+mods[i]+'.'+spec.mq,slot);
 return {a,spec};
}
