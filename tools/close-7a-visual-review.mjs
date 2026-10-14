import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='reports/local/7a-20261013',read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const pixel=await read(root+'/pixel-comparison.json'),pairedReview=await read(root+'/review-paired-selection.json');
assert.equal(pixel.pixelPairs,24);assert.equal(pixel.rgbExact,24);assert.equal(pairedReview.status,'REVIEWED');
const selections={paired:pairedReview};for(const name of ['resources','web','offline','missing','background']){
 const r=await read(root+'/review-'+name+'-selection.json');assert.equal(r.status,'REVIEWED',name);selections[name]=r;
}
const paths=new Set(pixel.metrics.flatMap(r=>r.screens));
for(const r of Object.values(selections))for(const page of r.pages??[])for(const row of page.records??[])paths.add(row.file);
const files=[];for(const path of paths){const bytes=await fs.readFile(path);files.push({path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}
const report={passed:true,at:new Date().toISOString(),method:'Model inspection of the explicitly recorded contact sheets and selected original captures, plus exact full-image RGB comparison for the 24 native replay pairs. Passing means this bounded review is complete.',selections,files,pairedStates:40,pairedImages:24,rgbExactPairs:24,findings:['The sampled animation poses, mounts, materials, native effects and shadows remain consistent with the frozen baseline.','Kerrigan and Colossus combat captures retain the same upper-edge crop; Char remains dark under the retained lighting. These are unchanged sample limits, not fixes by 7A.'],naturalGameplayVisualAcceptance:false,allFramesReviewed:false,originalClientParityClaim:false,humanAcceptance:false};
await fs.writeFile(root+'/visual-review.json',JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({passed:true,images:files.length,groups:Object.keys(selections)}));
