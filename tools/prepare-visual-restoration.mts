import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world';
import {readArchive,writeArchive} from '../src/persistence/archive';
import {campaignTerrain,MAP_THEMES,type CampaignTheme} from '../src/data/campaign-map';
import {FAMILIES_BY_RACE,type Race} from '../src/data/races';
import {HERO_IDS_BY_RACE} from '../src/data/heroes';
const out='reports/local/visual-restoration-20261006/fixtures';await fs.mkdir(out,{recursive:true});
const rows:any[]=[];
function clean(w:World){w.entities.clear();w.heroes.clear();w.pods=[];w.expedition.ledger=[];w.expedition.zerglingPairs=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.pickups=[];w.rewardDrops=[];for(const p of Object.values(w.expedition.production))p.enabled={};}
async function save(id:string,w:World,method:string){w.paused=true;w.hash.rebuild(w.entities.values());const bundle={profile:w.permanentProfile.exportJSON(),run:w.captureRun()},raw=writeArchive(bundle);const copy=new World({race:w.expedition.race});copy.permanentProfile.importJSON(bundle.profile);copy.restoreRun(bundle.run);await fs.writeFile(`${out}/${id}.json`,raw);rows.push({id,method,sha256:createHash('sha256').update(raw).digest('hex'),map:bundle.run.map,entities:w.entities.size,barriers:[...w.entities.values()].filter(u=>u.unitType==='immortal').map(u=>({id:u.id,barrier:u.barrier??0,ready:u.barrierReady,time:w.time}))});}
for(const theme of Object.keys(MAP_THEMES) as CampaignTheme[]){
 const terrain=campaignTerrain({version:3,seed:10608,theme}),w=new World({terrain,waves:false,seed:10608});w.start();w.stage=12;terrain.setStage(12);
 const points={industrial:{x:-22,z:22},'mar-sara':{x:-26,z:-16},char:{x:-26,z:19},ice:{x:21,z:17},frontier:{x:-20,z:25}};
 const p=[points[theme],{x:18,z:25},{x:13,z:23}].find(p=>terrain.canOccupy(p,3.9))!;
 w.anchor.x=p.x;w.anchor.z=p.z;for(const e of w.entities.values()){e.x+=p.x;e.z+=p.z;e.prev={x:e.x,z:e.z};}
 for(const [i,family] of (['marine','marauder','hellion','tank'] as const).entries())w.addUnit(family,'terran',p.x+(i-1)*1.4,p.z+1.4);
 await save('map-'+theme,w,'Current stage12 geometry, fixed camera anchor and original bodies; diagnostic placement only.');
}
for(const race of ['terran','zerg','protoss'] as Race[])for(const group of [0,1]){
 const w=new World({race,seed:10608,waves:false,terrain:campaignTerrain({version:3,seed:10608,theme:'industrial'})});w.start();clean(w);w.time=10;w.tick=600;w.wallet={minerals:10000,gas:10000};const families=FAMILIES_BY_RACE[race].slice(group*5,group*5+5);w.expedition.familySlots=[...families];
 for(const [i,family] of families.entries()){w.expedition.tech['unlock.'+family]=1;const u=w.addFamilyMember(family,{x:-7+i*3.5,z:-2},3);u.prev={x:u.x,z:u.z};}
 for(const hero of HERO_IDS_BY_RACE[race].slice(group*3,group*3+3))w.acquireHero(hero);let h=0;for(const u of w.entities.values())if(u.heroId){u.x=-8+h++*8;u.z=4;u.prev={x:u.x,z:u.z};}
 await save(`units-${race}-${group}`,w,'Separated fixed-pose roster: original ranks/bodies/heroes, no native campaign provenance.');
}
const barrier=new World({race:'protoss',waves:false,seed:10608,terrain:campaignTerrain({version:3,seed:10608,theme:'industrial'})});barrier.start();clean(barrier);barrier.expedition.familySlots=['immortal'];barrier.expedition.tech['unlock.immortal']=1;const immortal=barrier.addFamilyMember('immortal',{x:0,z:0},3),target=barrier.addUnit('roach','zerg',4,0);target.hp=target.maxHp=2e6;await save('immortal-idle',barrier,'Idle snapshot before real diagnostic combat against a synthetic high-health target.');barrier.paused=false;
for(let i=0;i<600;i++){barrier.step();if((immortal.barrier??0)>0){for(let j=0;j<12;j++)barrier.step();await save('immortal-active',barrier,'Barrier activated by actual World combat step against the labeled high-health target, then 12 actual ticks reach Cover hold; no manually invented shield.');break;}}
if(!rows.some(x=>x.id==='immortal-active'))throw Error('Actual combat never activated Immortal barrier');
for(const count of [100,300]){
 const raw=await fs.readFile(out+'/units-protoss-0.json','utf8'),bundle=readArchive(raw).bundle,w=new World({race:'protoss'});w.permanentProfile.importJSON(bundle.profile);w.restoreRun(bundle.run!);let added=0;
 for(let z=-11;z<=11&&added<count;z+=1.15)for(let x=-14;x<=14&&added<count;x+=1.15){if(Math.hypot(x,z)<5||!w.terrain!.canOccupy({x,z},.5))continue;const u=w.addUnit('roach','zerg',x,z);u.hp=u.maxHp=2e6;u.moveSpeed=0;u.nextShotAt=u.specialReady=1e9;added++;}
 if(added!==count)throw Error('Insufficient diagnostic density locations');await save('density-'+count,w,'Synthetic frozen renderer density: '+count+' stationary high-health Roach targets. No FPS or natural performance acceptance.');
}
await fs.writeFile('reports/local/visual-restoration-20261006/fixtures.json',JSON.stringify({method:'Current-schema read-only render comparison fixtures. Actual barrier activation uses World.step; placements and density fixtures are explicitly diagnostic.',rows},null,2));console.log(JSON.stringify(rows.map(r=>({id:r.id,entities:r.entities,barriers:r.barriers}))));
