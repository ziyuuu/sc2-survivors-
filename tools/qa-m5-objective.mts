/** M5 engineering audit. Controlled fixtures are evidence for rules/assets, not natural play or visual approval. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world';
import {ELITES,ELITE_TEMPLATES,type EliteId} from '../src/data/elites';
import {ALL_HERO_IDS,HEROES,type HeroId} from '../src/data/heroes';
import {ALL_FAMILIES,familyRace,type Race} from '../src/data/races';
import {RUNTIME_ASSETS} from '../src/assets/runtime.generated';
import {unitData} from '../src/simulation/combat/expedition-combat';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';
import {tickWeaponAreas} from '../src/simulation/combat/weapon-patterns';
import {readArchive,writeArchive} from '../src/persistence/archive';

const out='reports/local/qa-m5-objective';fs.mkdirSync(out,{recursive:true});
const pack=JSON.parse(fs.readFileSync('assets/private/m3-pack.json','utf8')) as {manifest:Array<{id:string;source?:string;sourcePath?:string;sourceSha256?:string;sha256?:string;animations?:string[];bones?:number}>};
const packed=new Map(pack.manifest.map(item=>[item.id,item]));
const assets=new Map(RUNTIME_ASSETS.map(item=>[item.id,item]));
const report={at:new Date().toISOString(),method:'Controlled World fixtures and original-asset manifest; no combat grants in natural runs, no human visual approval',approvedCatalogVariants:0,elites:[] as unknown[],heroes:[] as unknown[],airSources:[] as unknown[],issues:[] as string[]};
const rounded=(n:number)=>Math.round(n*10000)/10000;
const setup=(race:Race)=>{const w=new World({race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:20260925});assert.equal(w.start(),true);w.entities.clear();w.heroes.clear();return w;};
function model(id:string){
 const asset=assets.get(id),entry=packed.get(id);assert.ok(asset&&asset.status==='available',`${id}: runtime asset`);
 assert.ok(entry&&entry.sha256&&entry.sourceSha256&&entry.animations?.length&&entry.bones,`${id}: packed source/animation`);
 const file=path.join('public',asset.url);assert.ok(fs.statSync(file).size>100,`${id}: GLB file`);
 return {runtime:asset.url,source:entry.sourcePath??entry.source,sourceSha256:entry.sourceSha256,derivedSha256:entry.sha256,clips:entry.animations!.length,hasDeathClip:entry.animations!.some(name=>/death|die/i.test(name)),bones:entry.bones};
}
const elites=Object.values(ELITES).sort((a,b)=>a.id.localeCompare(b.id));
assert.equal(elites.length,90);
for(const family of ALL_FAMILIES)assert.deepEqual(elites.filter(item=>item.family===family).map(item=>item.id).sort(),[1,2,3].map(n=>`${family}.${n}`).sort(),`${family}: three variants`);
const approvedCatalog=fs.readFileSync('docs/MVP10_ELITE_CATALOG.md','utf8');
let checkedNew=0;
for(const row of approvedCatalog.split(/\r?\n/)){
 const match=row.match(/^\| `([a-z_]+\.[23])`[^|]*\| (quick|heavy|guard|mobile|support) \| ([^|]+) \|$/);
 if(!match)continue;
 const [,id,template,description]=match,definition=ELITES[id as EliteId];
 assert.ok(definition,`${id}: approved catalog definition`);
 assert.equal(definition.template,template,`${id}: approved elite template`);
 const multiplicative=description.match(/×(\d+(?:\.\d+)?)/),percent=description.match(/＋(\d+(?:\.\d+)?)%/),flat=description.match(/＋(\d+(?:\.\d+)?)(?![%\d])/);
 const expected=multiplicative?Number(multiplicative[1]):percent?1+Number(percent[1])/100:flat?Number(flat[1]):NaN;
 assert.ok(Number.isFinite(expected),`${id}: approved effect amount was not readable`);
 assert.ok(Math.abs((definition.effect?.amount??NaN)-expected)<1e-8,`${id}: approved effect amount ${expected}, runtime ${definition.effect?.amount}`);
 checkedNew++;
}
assert.equal(checkedNew,50,'all newly approved variants checked against the written catalog');
report.approvedCatalogVariants=checkedNew;
for(const def of elites){
 const race=familyRace(def.family),w=setup(race),asset=model('model.'+def.model);
 const ordinary=w.addUnit(def.family,'terran',-4,0,5),elite=w.addUnit(def.family,'terran',0,0,1),elite5=w.addUnit(def.family,'terran',-8,0,5);
 elite.eliteId=def.id as EliteId;elite.modelKey=def.model;w.refreshStats(elite,true);
 elite5.eliteId=def.id as EliteId;elite5.modelKey=def.model;w.refreshStats(elite5,true);
 if(def.family==='lurker'){elite.nativeMode=elite5.nativeMode='lurker_burrowed';w.refreshStats(elite);w.refreshStats(elite5);}
 const template=ELITE_TEMPLATES[def.template],hasWeapon=unitData(elite).targetType!=='none'&&def.family!=='carrier';
 const output=ordinary.weaponDamage>0&&hasWeapon?elite.weaponDamage/elite.attackPeriod/(ordinary.weaponDamage/ordinary.attackPeriod):null;
 const output5=ordinary.weaponDamage>0&&hasWeapon?elite5.weaponDamage/elite5.attackPeriod/(ordinary.weaponDamage/ordinary.attackPeriod):null;
 const healing=['medivac','science_vessel'].includes(def.family)?elite.healRate/ordinary.healRate:null;
 if(output!==null)assert.ok(output+1e-8>=template.output,`${def.id}: Rank1/ordinary Rank5 output ${output} < ${template.output}`);
 if(output5!==null)assert.ok(output5+1e-8>=output!,`${def.id}: Rank5 elite output declined below Rank1`);
 if(healing!==null)assert.ok(healing+1e-8>=1.75,`${def.id}: support recovery ${healing}`);
 let attackObserved=false,damageObserved=false;
 if(hasWeapon){
  const targetType=unitData(elite).targetType==='air'?'mutalisk':'roach';
  const distance=Math.max(.5,Math.min(2,elite.attackRange+.5));
  const enemy=w.addUnit(targetType,'zerg',distance,0);enemy.hp=enemy.maxHp=100000;enemy.armor=0;enemy.weaponDamage=0;
  w.hash.rebuild(w.entities.values());
  if(w.canFireAt(elite,enemy)){const before=enemy.hp,shots=w.stats.shots;w.fire(elite,enemy);attackObserved=w.stats.shots===shots+1&&w.visualEvents.some(event=>event.kind==='attack'&&event.eliteId===def.id);for(let tick=0;tick<=90;tick++){w.time=tick/60;tickWeaponAreas(w);}damageObserved=enemy.hp<before;}
 }
 const encoded=writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()});
 const saved=readArchive(encoded).bundle.run!;
 assert.ok([...saved.state.entities.values()].some(unit=>unit.eliteId===def.id),`${def.id}: current save identity`);
 const deathAsset=assets.has('model.'+def.model+'.death');
 w.hit(elite,elite.hp+elite.shield+elite.armor+1000,[],1,'zerg');
 const deathObserved=elite.hp<=0&&w.visualEvents.some(event=>event.kind==='death'&&event.eliteId===def.id);
 report.elites.push({id:def.id,race,family:def.family,template:def.template,effect:def.effect??null,asset,rank1ToOrdinaryRank5Output:output===null?null:rounded(output),rank5ToOrdinaryRank5Output:output5===null?null:rounded(output5),supportRecoveryRatio:healing===null?null:rounded(healing),attackObserved,damageObserved,deathObserved,deathAnimationSource:asset.hasDeathClip?'own_clip':deathAsset?'separate_model':'procedural_fallback'});
 if(hasWeapon&&!attackObserved)report.issues.push(`${def.id}: controlled target did not produce a verified shot`);
 if(attackObserved&&!damageObserved)report.issues.push(`${def.id}: controlled shot did not damage target`);
 if(!deathObserved)report.issues.push(`${def.id}: death transaction or visual event missing`);
}
assert.equal(report.elites.length,90);
for(const id of ALL_HERO_IDS){
 const def=HEROES[id],asset=model('model.'+def.model),portrait=assets.get('hero.'+id);
 assert.ok(portrait?.status==='available',`${id}: portrait`);
 for(const rank of [1,3,5]){
  const w=setup(def.race);for(let n=0;n<rank;n++)assert.equal(w.acquireHero(id),true,`${id}: recruit/upgrade`);
  const source=w.heroEntity(id)!;source.x=source.prev.x=0;source.z=source.prev.z=0;
  let target=w.addUnit('roach','zerg',Math.min(4,Math.max(1,def.skillRange-1)),0);
  target.hp=target.maxHp=100000;target.armor=0;target.weaponDamage=0;
  let patient:typeof source|undefined;
  if(id==='swann'||id==='niadra'||id==='artanis'){
   patient=w.addUnit(id==='swann'?'thor':id==='niadra'?'ultralisk':'zealot','terran',2,0);
   if(id==='artanis')patient.shield=Math.max(0,(patient.maxShield??0)-250);
   else patient.hp-=250;
  }
  w.hash.rebuild(w.entities.values());
  const before={hp:target.hp,health:patient?.hp??0,shield:patient?.shield??0};
  assert.equal(w.castHero(id),true,`${id}: rank ${rank} legal cast`);
  for(let tick=1;tick<=300;tick++){w.time=tick/60;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}
  const damage=before.hp-target.hp,healed=(patient?.hp??0)-before.health,shields=(patient?.shield??0)-before.shield;
  const controlled=(target.stoppedUntil??0)>0||(target.moveSlowUntil??0)>0;
  const benefited=id==='swann'||id==='niadra'?healed>0:id==='artanis'?shields>0:id==='vorazun'?controlled:damage>0;
  const impactEvent=w.visualEvents.some(event=>event.kind==='skill-impact'&&event.heroId===id);
  if(!benefited)report.issues.push(`${id}: rank ${rank} skill had no expected effect in controlled target`);
  if(!['swann','niadra','artanis'].includes(id)&&!impactEvent)report.issues.push(`${id}: rank ${rank} has an effect but no matching impact event`);
  const saved=readArchive(writeArchive({profile:w.permanentProfile.exportJSON(),run:w.captureRun()})).bundle.run!;
  assert.equal(saved.state.heroes.get(id)?.rank,rank,`${id}: current save hero rank`);
  report.heroes.push({id,rank,race:def.race,asset,portrait:portrait.url,target:def.target,damage:rounded(damage),healed:rounded(healed),shields:rounded(shields),controlled,impactEvent,visualEvents:w.visualEvents.filter(event=>event.heroId===id).map(event=>({kind:event.kind,castId:event.castId})),benefited});
 }
}
assert.equal(report.heroes.length,54);
const air=JSON.parse(fs.readFileSync('tools/m4-air-dependencies.json','utf8')) as Array<{id:string;sourcePath:string;installFile:string;sha256:string;version:string;verifiedCascBuild:boolean}>;
for(const id of ['model.hero.yamato_battlecruiser','model.hero.hots_leviathan']){
 const entry=air.find(item=>item.id===id);assert.ok(entry?.verifiedCascBuild&&entry.version==='5.0.16.97563');
 const actual=createHash('sha256').update(fs.readFileSync(entry.installFile)).digest('hex');assert.equal(actual,entry.sha256,`${id}: locked source hash`);
 report.airSources.push({id,sourcePath:entry.sourcePath,version:entry.version,sha256:actual});
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({eliteRows:report.elites.length,heroRankRows:report.heroes.length,airSources:report.airSources.length,issues:report.issues}));
if(report.issues.length)process.exitCode=1;
