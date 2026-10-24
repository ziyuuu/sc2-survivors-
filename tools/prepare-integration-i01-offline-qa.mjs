import fs from 'node:fs/promises';
const root='D:/星际',base=root+'/reports/local/integration-i01-20261022',old=root+'/reports/local/fun-third-feedback-20261022';
for(const mode of ['desktop','touch']){
 let s=await fs.readFile(old+'/qa-offline-'+mode+'.mjs','utf8');
 s=s.replaceAll('C:/Users/zyuu/.codex/worktrees/mission/星际/node_modules',root+'/node_modules').replaceAll("'D:/星际/preview/fun-lab-20261022-r6/星际幸存者-趣味试玩.html'","base+'/offline-lab-r1.html'");
 s=s.replace("b=await chromium.connectOverCDP('http://127.0.0.1:9474'),p=b.contexts()[0].pages()[0]","b=await chromium.launchPersistentContext(base+'/qa-web-r1/profile',{executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,viewport:{width:1440,height:900}}),p=b.pages()[0]");
 s=s.replace("out=base+'/screens-offline-"+mode+"'","out=base+'/qa-offline-"+mode+"-r1/screens'").replace("base+'/qa-offline-"+mode+".json'","base+'/qa-offline-"+mode+"-r1/result.json'");
 await fs.writeFile(base+'/qa-offline-'+mode+'.mjs',s);
}
