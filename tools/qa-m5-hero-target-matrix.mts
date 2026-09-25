/** Written M0 r6 target contracts checked against actual skill casts, including static hives. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {World} from '../src/simulation/world';
import {ALL_HERO_IDS,HEROES,type HeroId} from '../src/data/heroes';
import {resolveExpeditionHeroCasts} from '../src/simulation/combat/expedition-heroes';

const out='reports/local/qa-m5-hero-target-matrix.json';
const support=new Set<HeroId>(['swann','niadra','artanis']);
const noAir=new Set<HeroId>(['zagara','dehaka','zeratul']);
const noStructure=new Set<HeroId>(['nova','zagara','dehaka','zeratul','vorazun']);
const noMechanical=new Set<HeroId>(['nova']);
const cases=['ground','air','armored','boss','structure'] as const;
const rows:unknown[]=[],issues:string[]=[];
for(const id of ALL_HERO_IDS){
 if(support.has(id))continue;
 for(const kind of cases){
  const def=HEROES[id],w=new World({race:def.race,sandbox:true,waves:false,terrain:false,obstacles:[],seed:20260925});
  assert.equal(w.start(),true);w.entities.clear();w.heroes.clear();assert.equal(w.acquireHero(id),true);
  const source=w.heroEntity(id)!;source.x=source.prev.x=0;source.z=source.prev.z=0;
  const x=Math.min(4,def.skillRange-.3);let target;
  if(kind==='structure')target=w.hive={id:w.nextId++,x,z:0,hp:1_000_000,maxHp:1_000_000,armor:0,unitRadius:1,flying:false,attributes:['Armored','Biological','Structure'],owner:'zerg'};
  else{
   target=w.addUnit(kind==='air'?'mutalisk':kind==='armored'?'thor':kind==='boss'?'roach':'zergling','zerg',x,0);
   target.hp=target.maxHp=1_000_000;target.armor=0;if(kind==='boss')target.enemyTier='boss';
  }
  w.hash.rebuild(w.entities.values());
  const expected=!(kind==='air'&&noAir.has(id)||kind==='structure'&&noStructure.has(id)||kind==='armored'&&noMechanical.has(id));
  const ready=w.heroes.get(id)!.skillReady,cast=w.castHero(id);
  if(cast!==expected)issues.push(`${id}/${kind}: cast ${cast}, expected ${expected}`);
  if(!cast&&w.heroes.get(id)!.skillReady!==ready)issues.push(`${id}/${kind}: invalid cast spent cooldown`);
  if(cast)for(let tick=0;tick<=300;tick++){w.time=tick/60;w.hash.rebuild(w.entities.values());resolveExpeditionHeroCasts(w);}
  const damage=1_000_000-target.hp,controlled=(target.stoppedUntil??0)>0||(target.moveSlowUntil??0)>0;
  const impact=w.visualEvents.some(event=>event.kind==='skill-impact'&&event.heroId===id);
  if(cast&&!(id==='vorazun'?controlled:damage>0))issues.push(`${id}/${kind}: legal cast did not benefit against target`);
  if(cast&&!impact)issues.push(`${id}/${kind}: legal cast has no impact event`);
  rows.push({id,kind,expected,cast,damage:Math.round(damage*100)/100,controlled,impact,remainingCooldown:w.heroes.get(id)!.skillReady-w.time});
 }
}
fs.mkdirSync('reports/local',{recursive:true});fs.writeFileSync(out,JSON.stringify({generatedAt:new Date().toISOString(),method:'M0 r6 hero target-layer/structure contract, manual 60Hz cast resolver; stationary high-HP fixtures, no campaign balancing',rows,issues},null,2));
console.log(JSON.stringify({rows:rows.length,issues}));if(issues.length)process.exitCode=1;
