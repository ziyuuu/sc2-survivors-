import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source='C:/Users/zyuu/.codex/visualizations/2026/10/03/01a0ff75-6cfc-7be0-b2f6-92489157b232/sc2-ui-r3';
const output=fileURLToPath(new URL('../../reports/local/ui-redesign-20261003/revision-3/',import.meta.url));
const sourceShot=/^(cover-|hero-|flow-zagara-|(?:landscape|portrait|phone-landscape)-(?:race|difficulty|confirm|loading|heroes)\.jpg$)/;
const extraShot=/^(offline-|auto-|home-compact-).*\.jpg$/;
function jpegSize(bytes){
 let offset=2;
 while(offset<bytes.length){
  if(bytes[offset++]!==255)continue;
  while(bytes[offset]===255)offset++;
  const marker=bytes[offset++];
  if(marker===217||marker===218)break;
  if(marker===216||marker===1)continue;
  const length=bytes.readUInt16BE(offset);
  if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker))return{width:bytes.readUInt16BE(offset+5),height:bytes.readUInt16BE(offset+3)};
  offset+=length;
 }
 throw new Error('JPEG dimensions unavailable');
}
await fs.mkdir(output,{recursive:true});
const screenshots=[];
for(const name of (await fs.readdir(source)).filter(n=>n.endsWith('.jpg')&&(sourceShot.test(n)||extraShot.test(n))).sort()){
 const bytes=await fs.readFile(path.join(source,name));
 await fs.copyFile(path.join(source,name),path.join(output,name));
 screenshots.push({name,kind:sourceShot.test(name)?'source-gui-check':name.startsWith('offline-')?'offline-gui-check':name.startsWith('home-compact-')?'targeted-layout-check':'dynamic-observation',...jpegSize(bytes),bytes:bytes.length,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
}
const sourceChecks=screenshots.filter(s=>s.kind==='source-gui-check');
if(sourceChecks.length!==64)throw new Error('Expected 64 saved GUI check screenshots');
const offline=JSON.parse(await fs.readFile(path.join(source,'offline-checks.json'),'utf8'));
const consoleErrors=JSON.parse(await fs.readFile(path.join(source,'console-errors.json'),'utf8'));
const compactHome=JSON.parse(await fs.readFile(path.join(source,'compact-home-check.json'),'utf8'));
if(!compactHome.passed)throw new Error('Compact home layout check incomplete');
if(offline.length!==9||consoleErrors.source.length||consoleErrors.offline.length)throw new Error('Final browser checks incomplete');
for(const name of ['offline-checks.json','console-errors.json','compact-home-check.json'])await fs.copyFile(path.join(source,name),path.join(output,name));
const report={
 date:'2026-10-03',scope:'Independent static UI design proposal. No runtime balance/schema/save changes and no M4/M5/M6/M7/human/physical-device acceptance.',
 browser:'Codex In-app Browser',sourceUrl:'http://127.0.0.1:4180/preview/ui-20261003/index.html',offlineUrl:'http://127.0.0.1:4180/reports/local/ui-redesign-20261003/SC2-UI-Preview-r3.html',
 generation:{mode:'built-in image_gen',count:9,textOnly:true,privateReferencesUploaded:false,originalPngDimensions:{width:1672,height:941},prompts:'preview/ui-20261003/covers/prompts-r3.json'},
 actualCommands:['node --check preview/ui-20261003/app.mjs','node --check preview/ui-20261003/build-static.mjs','node --check preview/ui-20261003/serve-preview.mjs','node preview/ui-20261003/build-static.mjs SC2-UI-Preview-r3.html'],
 sourceChecks:{count:64,result:'passed in actual GUI calls',viewports:[{width:1440,height:900},{width:390,height:844},{width:844,height:390}],coverage:{covers:27,relatedPages:15,heroPortraits:18,manualFlowNodes:4},criteria:['Expected visible page, race and cover','Visible images complete with nonzero naturalWidth','Main-menu and cover controls remain within the frame'],metadata:'Screenshot index reconstructed from retained captures after a later UI-tool batch timeout. The 64 per-view DOM assertions passed in their actual GUI calls; their transient full DOM objects are not retained.'},
 manualFlow:{result:'passed',steps:['Zerg cover','Enter on Zagara cover button','New game','Hard difficulty','Deployment','Talent edit and return to deployment','Loading complete','Enter battle'],coverPreserved:'zerg-zagara',screenshots:['flow-zagara-keyboard.jpg','flow-zagara-deploy.jpg','flow-zagara-talent-return.jpg','flow-zagara-battle.jpg']},
 automaticCover:{result:'observed',naturalTimeElapsedMs:408573,before:{cover:'zerg-zagara',auto:true,motion:true,focus:'虫族封面'},after:{cover:'zerg-dehaka',auto:true,motion:true,focus:'虫族封面'},computedStyle:{crossfadeDuration:'1.25s',activeAnimation:'cover-breathe',activeOpacity:'1',previousOpacity:'0'},screenshot:'auto-cover-observed.jpg'},
 automaticFlow:{result:'completed',observedElapsedMs:410096,start:{page:'home',button:'停止播放',running:true},end:{page:'endless',button:'播放流程',running:false},screenshot:'auto-flow-completed.jpg'},
 offlineChecks:offline,compactHomeCheck:{...compactHome,screenshot:'home-compact-1280x720.jpg',artifact:'Final rebuilt offline HTML after compact home spacing adjustment'},consoleErrors,screenshots,
 remainingLimits:['Static sample values and UI feedback only','No physical phone/gamepad test','No game performance, balance or human acceptance claim']
};
await fs.writeFile(path.join(output,'verification-r3.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({sourceChecks:sourceChecks.length,offlineChecks:offline.length,savedScreenshots:screenshots.length,consoleErrors:0,report:path.join(output,'verification-r3.json'),screenshotDimensions:[...new Set(screenshots.map(s=>`${s.width}x${s.height}`))]},null,2));
