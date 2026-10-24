import assert from 'node:assert/strict';
export function gearFor(r:any,c:any){
 const q=c.difficulty==='easy'?2:c.difficulty==='normal'?3:c.difficulty==='hard'?4:5,entry=c.tier==='entry',polluted=c.tier==='polluted';
 const a=r.newEquipmentAccount(c.seed),slots=['offense1','offense2','offense3','offense4','defense1','defense2','defense3','defense4'];
 const spec={quality:entry?q-1:q,modules:entry?q-2:q,score:entry?140:200,kind:entry?'mixed-entry':polluted?'cleansed-polluted-orange':'offensive-graduation-candidate'};
 function add(template:string,slot:string){
  const hero={terran:'yamato_battlecruiser',zerg:'hots_leviathan',protoss:'purifier_flagship'}[c.race];
  const g=r.grantEquipment(a,{template,race:c.race,slot,...(template.includes('.hero.')?{binding:{hero}}:{}),...(polluted&&slot.match(/^(offense|defense)/)?{polluted:true}:{})},['growth-opening',c.race,c.difficulty,c.tier,c.seed,slot].join(':'),{kind:'warehouse'});assert.ok(g.ok,template);
  const t=r.equipmentTemplate(template);if(t.kind==='attribute')g.value.allocation=2;
  const keys=slot.startsWith('offense')?['attack','trueDps','range','crit','critDamage']:['defense','health','reduction','dodge','move'];
  g.value.affixes=g.value.affixes.map((_:unknown,i:number)=>({key:keys[i],score:spec.score}));assert.ok(r.validateItem(g.value),template);
  if(g.value.pollution==='uncleansed'){a.dust=10000;assert.ok(r.cleanseEquipment(a,g.value.id).ok);}assert.ok(r.equip(a,c.race,g.value.id,slot).ok);
 }
 for(const [i,slot] of slots.entries()){
  const quality=entry?spec.quality-(i===3||i===7?1:0):q;
  const template=entry?'attribute.'+quality:q===2?(i<2?'set.team.2':i<4?'set.training.2':i<6?'set.call.2':'attribute.2'):q===3?(i<2?'set.blue.training.3':'set.blue.hero.3'):q===4?(i===0?'special.double.4':i===1?'attribute.4':'set.advanced.hero.4'):(i<2?'set.orange.survivor.5':'set.orange.hero.5');
  add(template,slot);
 }
 const mq=spec.modules,mods=entry?['workers','supply','formation','suppression']:mq===5?['bounty_order','armory','weakness','yamato']:['workers','supply','moving_fire',mq===2?'wind_serpent':mq===3?'elephant':'joint'];
 for(const [i,slot] of ['gathering','logistics','control','support'].entries())add(`module.${mods[i]}.${mq}`,slot);
 if(polluted)a.dust=0; // preparation cost is not campaign income; no spare workshop funds.
 return {a,spec};
}
