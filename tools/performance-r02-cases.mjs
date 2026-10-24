import {make,snapshot as worldSnapshot} from './performance-s01-s02-cases.mjs';
export function snapshot(lib,w){return {...worldSnapshot(lib,w),loot:{...w.starship.loot,ground:[...w.starship.loot.ground],landing:undefined,events:w.starship.loot.events.map(e=>({...e,terrain:!!e.terrain}))},pickupPositions:w.pickups};}
export function setup(lib,{n=18,near=true,pack=0,warehouse=0,resource=0,talent=0,gear=false,wall=false}={}){
 const w=make(lib,'terran',529);w.anchor={x:0,z:0};w.addUnit('marine','terran',0,-3);lib.setDiagnosticHealthLock(w,true);
 w.starship.enabled=true;const a=w.starship.account;let serial=0;
 const grant=(q,loc,slot='offense1')=>{const r=lib.grantEquipment(a,{template:q===5?'set.orange.hero.5':'attribute.'+q,race:'terran',slot,binding:q===5?{hero:'raynor'}:undefined},'r02:'+serial++,loc);if(!r.ok)throw Error(r.error);if(loc.kind==='ground')lib.registerEquipmentDrop(w,r.value);return r.value;};
 for(let i=0;i<pack;i++)grant(1,{kind:'backpack',run:a.run.id});
 for(let i=0;i<warehouse;i++)grant(i%4+1,{kind:'warehouse'});
 for(let i=0;i<n;i++){const angle=i*2.399963,r=near?1.5:8+Math.sqrt(i)*.5;grant(i%5+1,{kind:'ground',run:a.run.id,x:Math.sin(angle)*r,z:Math.cos(angle)*r});}
 if(wall)w.obstacles=[{x:.75,z:0,w:.1,h:4}];
 w.runConfig.frozenTalents.levels=Object.fromEntries(lib.MVP_TALENTS.filter(t=>t.race==='terran'&&['battlefield_cleaner','recycle'].includes(t.semanticId)).map(t=>[t.id,t.semanticId==='recycle'?2:talent]));if(w.talent('battlefield_cleaner')!==talent)throw Error('Inactive talent fixture');
 if(gear){for(const [id,slot]of [[gear==='radius'?'module.pickup.4':'module.double_pickup.4','gathering']]){const r=lib.grantEquipment(a,{template:id,race:'terran',slot},'gear:'+id,{kind:'warehouse'});if(!r.ok)throw Error(r.error);a.equipped.terran[slot]=r.value.id;a.locations[r.value.id]={kind:'equipped',race:'terran',slot};a.revision++;}}
 for(let i=0;i<resource;i++){const angle=i*2.399963,r=near?(i%3===0?.25:i%3===1?3:8):18+i%5;w.pickups.push({id:w.nextId++,x:Math.sin(angle)*r,z:Math.cos(angle)*r,minerals:5,gas:i<Math.round(resource*75/181)?3:0});}
 return {w,call:()=>lib.collectNearbyEquipment(w),step:()=>w.step()};
}
export function labels(n,seed=529,width=1440,height=900){
 let s=seed;const random=()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296;};
 return Array.from({length:n},(_,i)=>({id:'gear-'+i,x:random()*width,y:random()*height,width:145+Math.floor(random()*66),quality:i%5+1,distance:random()*20,name:'组件'+i}));
}
