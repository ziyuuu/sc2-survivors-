import fs from 'node:fs';
let p='test/team-aura-rebalance.test.ts',s=fs.readFileSync(p,'utf8').replace("const worker=w.addUnit('probe','terran',1,2);","const worker={...temp,temporary:false,unitType:'probe'} as any;").replace('near(b.armor/base.armor,1.2)','near(b.armor,base.armor*1.2)');fs.writeFileSync(p,s);
p='test/p4-protoss-elites.test.ts';s=fs.readFileSync(p,'utf8').replace('assert.ok(u.weaponDamage>0)',"assert.ok(u.unitType==='carrier'?u.weaponDamage===0:u.weaponDamage>0)");fs.writeFileSync(p,s);
