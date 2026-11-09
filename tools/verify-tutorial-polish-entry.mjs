/** Read-only checks of the actual local port used by the reviewer. */
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {tutorialDistRoot,tutorialWorkRoot} from './tutorial-candidate-paths.mjs';
const expected=JSON.parse(await fs.readFile(tutorialDistRoot+'/candidate/web-release.json','utf8')),entry='http://127.0.0.1:18913/',review=entry+'review/index.html?v='+expected.appBuildId.slice(0,12),cases=[];
const release=await fetch(entry+'web-release.json');assert.equal(release.status,200);assert.equal((await release.json()).appBuildId,expected.appBuildId);cases.push('actual port serves expected appBuildId');
assert.equal((await fetch(entry)).status,200);const page=await fetch(review),html=await page.text();assert.equal(page.status,200);assert.equal(page.headers.get('cache-control'),'no-cache');assert.equal((html.match(/<video /g)??[]).length,3);assert.ok(html.includes(expected.appBuildId.slice(0,12)));cases.push('review entry has three final-version videos, no-cache');
for(const race of ['terran','zerg','protoss']){
 const media=await fetch(entry+'review/recordings/'+race+'.mp4',{headers:{Range:'bytes=0-1023'}});assert.equal(media.status,206);assert.equal((await media.arrayBuffer()).byteLength,1024);assert.match(media.headers.get('content-range'),/^bytes 0-1023\//);
 const image=await fetch(entry+'review/recordings/'+race+'.png');assert.equal(image.status,200);assert.equal(image.headers.get('cache-control'),'no-cache');assert.ok((await image.arrayBuffer()).byteLength>1024);cases.push(race+' actual MP4 range and uncached poster');
}
assert.equal((await fetch(entry+'qa.html')).status,404);cases.push('production port does not expose diagnostic entry');
const report={passed:true,appBuildId:expected.appBuildId,entry,review,cases};await fs.writeFile(tutorialWorkRoot+'/delivery-entry.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
