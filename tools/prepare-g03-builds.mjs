import fs from 'node:fs/promises';
const old='D:/星际/reports/local/g02-balance-20261022',base='D:/星际/reports/local/g03-content-20261022';
for(const name of ['build-web.mjs','assemble-offline.mjs','verify-offline.mts','serve.mjs','qa-production.mjs']){
 let s=await fs.readFile(old+'/'+name,'utf8');s=s.replaceAll('g02-balance-20261022','g03-content-20261022').replaceAll('G02','G03').replaceAll('4487','4488').replaceAll('approved balance including nuclear reinforcement','difficulty content and entry gates');
 if(name==='assemble-offline.mjs')s=s.replace("??'lab'","??'game'");
 if(name==='qa-production.mjs')s=s.replace("assert.ok(copy.includes('999'));", "assert.ok(copy.includes('999'));assert.ok(copy.includes('趣味内容'));assert.ok(copy.includes('所有难度均可获得全部'));if(difficulty==='easy')assert.ok(copy.includes('资源关与毒爆弹幕'));if(difficulty==='normal')assert.ok(copy.includes('增加横穿虫群关'));if(difficulty==='hard'||difficulty==='hell')assert.ok(copy.includes('全部任务、特殊遭遇'));");
 await fs.writeFile(base+'/'+name,s);
}
