import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/performance-d03-20261021',analysis=JSON.parse(await fs.readFile(root+'/visual-review/analysis.json','utf8'));
assert.equal(analysis.images,40);assert.equal(analysis.contacts.length,8);
const direct=['full-stage-1','full-stage-7','viewport-390','endless-round-1','endless-round-2'];
const result={...analysis,status:'reviewed',reviewedAt:new Date().toISOString(),method:'All 40 screenshots inspected in 8 contact sheets; 5 clear-playfield original PNGs also inspected at native size.',directlyInspected:direct.map(n=>root+'/visual-r1/'+n+'.png'),observations:[
 'Full preset stages 1–7 show five, five, four, three, two, one and zero surviving qualities. Uncollected resource models disappear on entering stage 2. Expired equipment models, beams and labels do not remain.',
 'Medium/full retain their existing item decoration; low keeps item models and labels without decorative beams. No production rendering code changed in D03.',
 'Full backpack displays the existing full-bag message with ground equipment; after expiration and freeing one slot, the remaining green item is collected and the backpack returns to 64.',
 '1440×900 and 980×700 show the remaining four items. At 390×844 the four ground items are present; the purple label is outside the narrow visible area beside the existing right HUD, so this is not a claim that every label is fully readable or that the mobile layout was redesigned.',
 'Campaign victory and committed endless rounds 1/2 are visible; all five qualities survive entry, white is absent in round 2. Entry frames capture the existing newly registered drop presentation, not a settled-animation pixel comparison.',
 'Functional-r1 pause-overlay/blur screenshots are retained as captured. Visual-r1 closes the real pause overlay while the simulation driver stays frozen; no CSS removal or image retouching. Functional recovery state checks remain in functional-r1.'
],limitations:['No pixel-equality claim, human playability assessment, physical touch/gamepad test, natural campaign, long-run stress or FPS acceptance.']};
result.contacts=await Promise.all(analysis.contacts.map(async file=>({file,sha256:createHash('sha256').update(await fs.readFile(file)).digest('hex')})));
await fs.writeFile(root+'/visual-review.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({status:result.status,images:result.images,contacts:result.contacts.length,direct:direct.length}));
