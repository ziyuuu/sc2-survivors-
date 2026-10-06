import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=new URL('./',import.meta.url),art=new URL('art-r11/',root),out=new URL('../../reports/local/ui-redesign-20261003/',root);
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const readJson=async url=>JSON.parse(await fs.readFile(url,'utf8'));
const fixtureBytes=await fs.readFile(new URL('cards-r9.json',root));
const fixture=JSON.parse(fixtureBytes),manifest=await readJson(new URL('manifest-r11.json',art)),artifact=await readJson(new URL('artifact-r11.json',out));
assert.equal(fixture.cards.length,1152);
assert.equal(Object.keys(manifest.entries).length,129);
assert.equal(manifest.missing.length,0);
const pngSizes={},generationReceipts=[],recoveredProvenance=[];
for(const [key,p] of Object.entries(manifest.plates)){
 const png=await fs.readFile(new URL(p.png,art)),webp=await fs.readFile(new URL(p.file,art));
 assert.equal(hash(png),p.pngSha256,key+' PNG');
 assert.equal(hash(webp),p.sha256,key+' WebP');
 assert.equal(png.readUInt32BE(16),p.width,key+' width');
 assert.equal(png.readUInt32BE(20),p.height,key+' height');
 const size=p.width+'×'+p.height;pngSizes[size]=(pngSizes[size]??0)+1;
 const stem=p.png.replace(/\.png$/,'');
 try{const receipt=await readJson(new URL(stem+'.generation.json',art));assert.equal(receipt.privateReferencesUploaded??receipt.privateOriginalReferencesUploaded,false,key+' private references');assert.equal(typeof receipt.prompt,'string',key+' exact prompt');generationReceipts.push(p.png);}
 catch(error){if(error.code!=='ENOENT')throw error;const receipt=await readJson(new URL(stem+'.provenance-recovered.json',art));assert.equal(receipt.privateReferencesUploaded,false);assert.equal(receipt.exactPrompt,null);assert.equal(hash(await fs.readFile(receipt.source)),hash(png));recoveredProvenance.push(p.png);}
}
for(const [key,e] of Object.entries(manifest.entries)){
 assert.equal(e.review,'agent-visually-reviewed-static-preview',key);
 assert.ok(manifest.plates[e.assetKey],key+' plate');
 assert.ok(e.bodyBounds.width>0&&e.bodyBounds.height>0,key+' body');
 assert.ok(e.bodyBounds.y>=e.sceneBounds.y+e.sceneBounds.height,key+' separate layers');
}
const eliteIds=new Set(fixture.cards.filter(c=>c.subtype==='eliteVariant').map(c=>c.sourceId));
assert.equal(eliteIds.size,90);
for(const id of eliteIds)assert.equal(manifest.entries[id]?.kind,'elite',id);
const ordinaryFamilies=Object.values(fixture.families).flat();
assert.equal(ordinaryFamilies.length,30);
for(const {id} of ordinaryFamilies)assert.equal(manifest.entries[id]?.kind,'ordinary',id);
const retainedHeroes=Object.keys(fixture.heroes).filter(id=>!manifest.entries[id]);
assert.equal(retainedHeroes.length,9);
const inappropriateCopy=fixture.cards.filter(c=>/席位|三种型号|开发|策划|占位|原型|DTO|schema|方案/.test([c.name,c.stat,c.detail,c.summary].join(' ')));
assert.equal(inappropriateCopy.length,0);
const r10=await fs.readFile(new URL('SC2-UI-Preview-r10.html',out)),r11=await fs.readFile(new URL('SC2-UI-Preview-r11.html',out));
assert.equal(hash(r10),'ae054b1d62c42be619053f0ec9b9800af496f9f5ed94ee1905b6e07650843aea');
assert.equal(hash(r11),artifact.sha256);
assert.equal(r11.length,artifact.bytes);
const report={scope:'Static art inventory and provenance checks; no game/runtime or human art acceptance',artifact:artifact.artifact,bytes:r11.length,sha256:hash(r11),preservedR10Sha256:hash(r10),fixtureSha256:hash(fixtureBytes),fixtureStates:fixture.cards.length,paintedCounts:manifest.counts,pngSizes,exactGenerationReceipts:generationReceipts.length,recoveredProvenanceWithNoExactPrompt:recoveredProvenance,retainedHeroCovers:retainedHeroes,inappropriateCopyMatches:inappropriateCopy.length,entriesWithRetainedGeometryDiagnostics:Object.entries(manifest.entries).filter(([,e])=>e.issues.length).map(([key,e])=>({key,issues:e.issues,reviewNote:e.reviewNote})),reviewer:'Codex agent',humanArtAcceptance:'OPEN'};
await fs.writeFile(new URL('verification-r11.json',out),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,entriesWithRetainedGeometryDiagnostics:report.entriesWithRetainedGeometryDiagnostics.length},null,2));
