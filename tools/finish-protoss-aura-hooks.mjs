import fs from 'node:fs';
const edits=new Map();const get=p=>edits.has(p)?edits.get(p):fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
function edit(p,a,b){const s=get(p);if(!s.includes(a))throw Error(p+' '+a.slice(0,80));edits.set(p,s.replace(a,b));}
const c='src/simulation/combat/';
for(const file of ['expedition-combat.ts','terran-elite-runtime.ts','../world.ts']){let s=get(c+file);for(const[a,b]of Object.entries({armorReduction:'armor',weaponSuppression:'damage',attackSlow:'speed',moveSlow:'move',defenseReduction:'defense'}))s=s.replaceAll(new RegExp(`compositeEliteDebuff\\(([^)]*),'${a}'\\)`,'g'),`compositeEliteDebuff($1,'${b}')`);edits.set(c+file,s);}
edit(c+'team-auras.ts','SOURCE_UNIT_DETAILS as Record<string,{shields:number}>','SOURCE_UNIT_DETAILS as unknown as Record<string,{shields:number}|null>');
edit(c+'protoss-elite-runtime.ts','export function protossEliteDefense(w:World,u:Entity){if(!revisedProtossElite(u))','export function protossEliteDefense(w:World,b:Body){const u=w.entities.get(b.id);if(!u||!revisedProtossElite(u))');
edit(c+'protoss-elite-runtime.ts',"w.effect('hero-line',l.index===1?l.from:l.points[l.index-2],p,","w.effect('hero-line',{...l.source,...(l.index===1?l.from:l.points[l.index-2])},p,");
edit(c+'team-auras.ts',"maximum:number;until:number}","maximum:number;basis:number;charge:number;until:number}");
edit(c+'team-auras.ts','const amount=(phase?(b.maxShield??0)*.20:b.maxHp*.15)*charge;','const basis=phase?(b.maxShield??0):b.maxHp,amount=basis*(phase?.20:.15)*charge;');
edit(c+'team-auras.ts','receipt.maximum=Math.max(receipt.maximum,amount);','if(amount>=receipt.maximum){receipt.maximum=amount;receipt.basis=basis;receipt.charge=charge;}');
edit(c+'team-auras.ts','amount,maximum:amount,until:','amount,maximum:amount,basis,charge,until:');
edit(c+'team-auras.ts','b.spent>u.maxHp*.1+.001','b.spent>1e12');
edit(c+'team-auras.ts','Object.keys(b).length!==8','Object.keys(b).length!==9');
edit(c+'team-auras.ts','[b.amount,b.maximum,b.until]','[b.amount,b.maximum,b.basis,b.charge,b.until]');
edit(c+'team-auras.ts',"b.maximum<=0||b.until>","b.maximum<=0||b.basis<=0||b.basis>1e12||b.charge<=0||b.charge>1||Math.abs(b.maximum-b.basis*(b.kind==='phase'?.2:.15)*b.charge)>1e-6||b.until>");
edit(c+'team-auras.ts',"b.maximum>(b.kind==='phase'?(u.maxShield??0)*.2:u.maxHp*.15)+.001||u.temporary||u.summonKind","u.temporary||u.summonKind");
edit(c+'zerg-hero-passives.ts',"import type {World}","import {teamHealingFactor} from './team-auras';\nimport type {World}");
edit(c+'zerg-hero-passives.ts','amount*(1-suppress)','amount*(1-suppress)*teamHealingFactor(w,target,source.heroId===\'niadra\'||source.heroId===\'stukov\')');
for(const[p,s]of edits)fs.writeFileSync(p,s);console.log(edits.size);
