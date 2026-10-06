import fs from 'node:fs/promises';
const root=new URL('art-r11/',import.meta.url);
const m=JSON.parse(await fs.readFile(new URL('manifest-r11.json',root),'utf8'));
const notes=JSON.parse(await fs.readFile(new URL('visual-review-notes-r11.json',root),'utf8'));
const fixture=JSON.parse(await fs.readFile(new URL('cards-r9.json',import.meta.url),'utf8'));
const allowed=new Map(Object.values(notes.families).map(([file,note])=>[file,note]));
for(const [file,note] of Object.entries(notes.singles))allowed.set(file,note);
const plates={},entries={};
for(const [key,p] of Object.entries(m.plates)){
 const note=allowed.get(p.png);if(!note)throw new Error('No explicit visual review for '+p.png);
 plates[key]={file:p.png,pngSha256:p.pngSha256,webpSha256:p.sha256,status:'agent-visually-reviewed-static-preview',note};
}
for(const [key,e] of Object.entries(m.entries)){
 const source=fixture.cards.find(c=>c.sourceId===key&&c.subtype==='eliteVariant'&&c.rarity==='purple');
 entries[key]={plate:e.assetKey,sourceEffect:source?.stat??null,retainedGeometryDiagnostics:e.issues,review:plates[e.assetKey].note};
}
await fs.writeFile(new URL('reviews-r11.json',root),JSON.stringify({reviewer:notes.reviewer,scope:notes.scope,plates,entries,diagnosticPolicy:notes.diagnosticPolicy,superseded:notes.superseded},null,2)+'\n');
console.log(JSON.stringify({explicitlyReviewedPlates:Object.keys(plates).length,identities:Object.keys(entries).length,userArtAcceptance:'OPEN'}));
