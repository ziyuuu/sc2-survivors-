import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

const qaRoot='C:/Users/zyuu/.codex/visualizations/2026/10/03/01a0ff75-6cfc-7be0-b2f6-92489157b232/sc2-ui-r5';
const out=path.resolve('reports/local/ui-redesign-20261003/revision-5');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const artifact=await read(path.resolve(out,'../artifact-r5.json'));
const bytes=await fs.readFile(artifact.artifact);
const hash=createHash('sha256').update(bytes).digest('hex');
if(hash!==artifact.sha256||bytes.length!==artifact.bytes)throw new Error('Final artifact does not match its manifest');
const pages=await read(path.join(qaRoot,'layout-records.json'));
const targets=await read(path.join(qaRoot,'target-records.json'));
const interactions=await read(path.join(qaRoot,'interactions-r5.json'));
const final=await read(path.join(qaRoot,'final-artifact-check.json'));
const autoplay=await read(path.join(qaRoot,'autoplay-r5.json'));
const latest=new Map(pages.map(r=>[`${r.viewport.width}x${r.viewport.height}:${r.requested}`,r]));
const hasIssues=r=>['issues','covered','missing','forbidden','textOverflow'].some(k=>r[k]?.length);
const integrity=await read(path.join(out,'integrity-r5.json'));
integrity.currentArtifact={bytes:bytes.length,sha256:hash};
await fs.writeFile(path.join(out,'integrity-r5.json'),JSON.stringify(integrity,null,2)+'\n');
const report={
  date:'2026-10-05',scope:'Independent static SC2 UI prototype only',
  artifact:{path:artifact.artifact,bytes:bytes.length,sha256:hash},
  sourcesUnchanged:integrity,
  commands:[
    'node --check preview/ui-20261003/app.mjs',
    'node --check preview/ui-20261003/build-static.mjs',
    'node --check preview/ui-20261003/prepare-talent-copy-r5.mjs',
    'node --check preview/ui-20261003/revise-ui-r5.mjs',
    'node --check preview/ui-20261003/serve-preview.mjs',
    'node preview/ui-20261003/prepare-talent-copy-r5.mjs',
    'node preview/ui-20261003/build-static.mjs',
    'python preview/ui-20261003/review-screens-r5.py',
    'node preview/ui-20261003/summarize-r5.mjs',
    'git status --short -uno'
  ],
  pageLayout:{attempts:pages.length,latestStates:latest.size,sizes:['1280x900','844x390','667x375','390x844','360x640'],routes:17,latestIssues:[...latest.values()].filter(hasIssues)},
  talents:{states:targets.length,races:3,lines:4,sizes:['390x844','360x640','667x375'],issues:targets.filter(hasIssues)},
  visualReview:{beforeScreens:['before-talents-desktop.png','before-shop.png','before-battle-portrait.png'],reviewedSheets:['review-1280x900.jpg','review-844x390.jpg','review-667x375.jpg','review-390x844.jpg','review-360x640.jpg','review-talents-390x844.jpg','review-talents-360x640.jpg','review-talents-667x375.jpg','comparison-talents.jpg'],finalScreens:['final-talents-races-desktop.png','final-talents-paths-desktop.png','final-talents-tree-desktop.png','final-battle-portrait.png','final-battle-folded-portrait.png'],root:qaRoot},
  interactions,finalArtifactDOM:final,autoplay,
  attemptsAndLimits:[
    'Earlier desktop endless info control overflowed; position was fixed and affected layouts were rechecked. Original record retained.',
    'Two 30-second browser batches timed out; partial records were retained, later batches completed all intended states.',
    'A read-only DOM function string returned undefined until wrapped as an IIFE; it was not counted as a layout pass.',
    'An early fold measurement occurred mid-transition; settled motion-off measurement is the fold evidence.',
    'One expanded battle screenshot was captured before the viewport screenshot settled. The final image was recaptured and visually checked.',
    'Hero data import through tsx hit esbuild spawn EPERM. Source files were read directly for the three already-approved displayed cooldowns. This was not a runtime test failure.',
    'The contact-sheet script initially used production instead of the actual soldiers filename; corrected and all 36 tree screenshots reviewed.',
    'A semantic checkbox locator did not match the DOM button for the motion toolbar; its observed DOM ID was used successfully.',
    'Earlier full layout screenshots precede the final autoplay/dropdown-only patch. Final artifact DOM and critical interactions were checked afterward.',
    'Controls in scrollable content may require scrolling. Some secondary controls remain compact; this is not a full accessibility certification.',
    'All browser checks ran through localhost. No disconnected-browser, real phone/gamepad, runtime regression, natural balance or performance acceptance was performed.',
    'User human visual acceptance and existing M4/M5/M6/M7/source-clip gaps remain open. No tracked runtime files changed, no cleanup/push/deployment occurred.'
  ]
};
await fs.writeFile(path.join(out,'verification-r5.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({bytes:bytes.length,sha256:hash,pageStates:latest.size,pageIssues:report.pageLayout.latestIssues.length,treeStates:targets.length,treeIssues:report.talents.issues.length,report:path.join(out,'verification-r5.json')}));
