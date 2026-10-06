import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const qaRoot='C:/Users/zyuu/.codex/visualizations/2026/10/03/01a0ff75-6cfc-7be0-b2f6-92489157b232/sc2-ui-r6';
const out=path.resolve('reports/local/ui-redesign-20261003/revision-6');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const artifact=await read(path.resolve(out,'../artifact-r6.json')),previous=await read(path.resolve(out,'../artifact-r5.json'));
const bytes=await fs.readFile(artifact.artifact),hash=createHash('sha256').update(bytes).digest('hex');
if(hash!==artifact.sha256||bytes.length!==artifact.bytes)throw new Error('Final artifact does not match manifest');
const records=await read(path.join(qaRoot,'layout-r6.json')),before=await read(path.join(qaRoot,'before-metrics.json'));
const latest=new Map(records.map(r=>[r.tag,r]));
const bad=[...latest.values()].filter(r=>['issues','covered','missing','small'].some(k=>r[k]?.length)||r.rowCount!==(r.folded?0:2)||r.playfieldText!=='');
const area=before.map(b=>{
 const key=`terran-${b.viewport.width}x${b.viewport.height}-open`,r=latest.get(key);
 const beforeArea=b.map.width*b.map.height,afterArea=r.map.width*r.map.height;
 return {viewport:b.viewport,beforeMap:b.map,afterMap:r.map,extraHeight:r.map.height-b.map.height,extraAreaPercent:(afterArea/beforeArea-1)*100,beforeConsoleHeight:b.console.height,afterConsoleHeight:r.console.height};
});
const previousHtml=await fs.readFile(previous.artifact,'utf8'),oldCopy=JSON.parse(previousHtml.match(/window\.__UI_TALENT_COPY__=([\s\S]*?);<\/script>/)[1]),currentCopy=await read('preview/ui-20261003/talent-copy-r5.json');
const unchanged={covers:JSON.stringify(previous.paintedCovers)===JSON.stringify(artifact.paintedCovers),maps:JSON.stringify(previous.mapCompositions)===JSON.stringify(artifact.mapCompositions),talentFixture:previous.talentFixtureSha256===artifact.talentFixtureSha256,displayCopy:JSON.stringify(oldCopy)===JSON.stringify(currentCopy),displayCopySha256:createHash('sha256').update(await fs.readFile('preview/ui-20261003/talent-copy-r5.json')).digest('hex'),runtimeChanged:false};
const report={date:'2026-10-05',scope:'Static UI preview R6 only',artifact:{path:artifact.artifact,bytes:bytes.length,sha256:hash},unchanged,
 commands:['node --check preview/ui-20261003/app.mjs','node --check preview/ui-20261003/build-static.mjs','node preview/ui-20261003/build-static.mjs','python preview/ui-20261003/review-screens-r6.py','node preview/ui-20261003/summarize-r6.mjs','git status --short -uno'],
 layout:{recorded:records.length,states:latest.size,races:3,sizes:['1280x900','844x390','667x375','390x844','360x640'],foldStates:2,issues:bad},area,
 interactions:await read(path.join(qaRoot,'interactions-r6.json')),console:await read(path.join(qaRoot,'console-r6.json')),
 screenshots:{root:qaRoot,contactSheets:['review-1280x900.jpg','review-844x390.jpg','review-667x375.jpg','review-390x844.jpg','review-360x640.jpg'],final:['final-battle-desktop.png','final-battle-portrait.png','comparison-portrait-r6.png','final-r6-overview.png']},
 limits:['One 30-second browser batch timed out after saving 19 states; the remaining folded Zerg portrait state and Protoss states were completed in smaller batches.','The motion toolbar is hidden on portrait; a no-visible-match click was followed by desktop viewport selection and the actual visible control.','R6 changes only the battle border/console/pagination. The full 17-page audit belongs to R5; no claim it was repeated here.','Measurements and still captures use motion off; final preview keeps motion enabled. Main battle controls met 44px in these views; the retained unit-detail close button is compact.','The increased area is the DOM map display rectangle, not a measured live-game camera field or runtime performance claim.','No offline-disconnected, real device, gameplay regression, balance, performance, M4/M5/M6/M7 or human visual acceptance is claimed. No cleanup, push or cloud deployment occurred.']};
await fs.writeFile(path.join(out,'verification-r6.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({sha256:hash,bytes:bytes.length,states:latest.size,issues:bad.length,unchanged,area:area.map(r=>({viewport:r.viewport,heightGain:r.extraHeight,areaGainPercent:r.extraAreaPercent}))}));
