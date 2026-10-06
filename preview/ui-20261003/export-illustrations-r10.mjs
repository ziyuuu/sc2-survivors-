import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {unitPainting,UNIT_PAINTINGS,ELITE_PAINTINGS,HERO_PAINTINGS} from './unit-illustrations-r10.mjs';
const root=new URL('./',import.meta.url),out=new URL('illustrations-r10/',root);
const fixture=JSON.parse(await fs.readFile(new URL('cards-r9.json',root),'utf8'));
const families=fixture.cards.filter(c=>c.group==='development'&&c.subtype==='unlock');
const elites=fixture.cards.filter(c=>c.subtype==='eliteVariant'&&c.rarity==='purple');
const heroes=fixture.cards.filter(c=>c.group==='hero'&&c.rank===1&&HERO_PAINTINGS[c.heroId]);
assert.equal(families.length,30);assert.equal(elites.length,90);assert.equal(heroes.length,9);
assert.deepEqual(new Set(families.map(c=>c.families[0])),new Set(Object.keys(UNIT_PAINTINGS)));
assert.deepEqual(new Set(elites.map(c=>c.sourceId)),new Set(Object.keys(ELITE_PAINTINGS)));
const records=[];
for(const [kind,list] of [['units',families],['elites',elites],['heroes',heroes]]){
 await fs.mkdir(new URL(kind+'/',out),{recursive:true});
 for(const c of list){
  const id=kind==='units'?c.families[0]:kind==='elites'?c.sourceId:c.heroId;
  const bodies=c.families[0]==='zergling'?2:1;
  const svg=unitPainting(c,bodies).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" ');
  assert(svg);assert.equal([...svg.matchAll(/data-unit-scale="1"/g)].length,bodies);
  const file=kind+'/'+id+'.svg';await fs.writeFile(new URL(file,out),svg);
  records.push({file,sourceId:c.sourceId,name:c.name,race:c.race,bodies,bytes:Buffer.byteLength(svg),sha256:crypto.createHash('sha256').update(svg).digest('hex')});
 }
}
for(const c of fixture.cards){
 if(c.subtype==='eliteVariant')assert(ELITE_PAINTINGS[c.sourceId]);
 if(c.families[0])assert(unitPainting(c),'Missing '+c.id);
 if(c.group==='supply'){
  const count=c.count*(c.families[0]==='zergling'?2:1),svg=unitPainting(c,count);
  assert.equal([...svg.matchAll(/data-unit-scale="1"/g)].length,count);
  assert(!svg.match(/transform="scale\(/),'Cohort must not shrink '+c.id);
 }
}
const previous=JSON.parse(await fs.readFile(new URL('../../reports/local/ui-redesign-20261003/artifact-r9.json',root),'utf8'));
const currentSources=fixture.sources;
assert.deepEqual(currentSources,previous.cardSources,'Runtime data changed during static work');
const report={revision:10,sourceDate:'2026-10-05',method:'Locally authored vector illustration drafts, not model renders or authentic Blizzard paintings. 30 family bodies, 90 explicit current elite emphases, nine additional hero drawings; nine previously accepted painted hero covers are reused. Current source mechanics, prices and gameplay are unchanged. No remote generation or source-asset upload. All supplied bodies have constant per-member scale; quantity changes only translation and depth order.',counts:{ordinaryFamilies:families.length,eliteIllustrations:elites.length,additionalHeroIllustrations:heroes.length,files:records.length,presentationStates:fixture.cards.length},checks:{sourceCoverage:true,currentEliteIdentityCoverage:true,allFamilyCardArtPresent:true,allSupplyCountsAtFixedScale:true,sourceFingerprintsMatchR9:true},files:records};
await fs.writeFile(new URL('manifest-r10.json',out),JSON.stringify(report,null,2));
console.log(JSON.stringify({counts:report.counts,checks:report.checks},null,2));
