import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const file='test/g01-card-equipment.test.ts';let s=await fs.readFile(file,'utf8');
const changes=[['f=1+equipmentTotals(w).attack','f=(1+equipmentTotals(w).attack)*1.48',4],['({strategic:3000,mines:120,bombardment:180})','({strategic:6000,mines:120,bombardment:180})',1],['close(e.maxHp-e.hp,3000*f)','close(e.maxHp-e.hp,6000*f)',1],['*2*(1+t.attack))','*2*(1+t.attack)*1.48)',1],['close(e.hp,e.maxHp-3600)','close(e.hp,e.maxHp-10656)',1],['.detail,/3600/)','.detail,/10656/)',1],['use real global attack once','use approved global attack and ordinary-DPS growth once',1]];
for(const [from,to,n] of changes){assert.equal(s.split(from).length-1,n,from);s=s.replaceAll(from,to);}await fs.writeFile(file,s);
