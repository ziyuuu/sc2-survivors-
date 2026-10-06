import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {World} from '../src/simulation/world';
import {prepareFixture} from '../preview/hero-combat-lab/fixture';
import {AttackSimulation} from '../preview/hero-combat-lab/attack-simulation';
import type {HeroId} from '../src/data/heroes';
import {ATTACK_DEMO_TUNING as T} from '../preview/hero-combat-lab/tuning';

const checks:unknown[]=[];
const ids:HeroId[]=['raynor','tychus','nova','swann','tosh','yamato_battlecruiser'];
const advance=(w:World,s:AttackSimulation,seconds:number)=>{for(let i=0;i<Math.ceil(seconds*60);i++){w.time+=1/60;w.tick++;s.step(1/60);s.takeEvents();}};
function fixture(hero:HeroId,rank:number){const w=new World({race:'terran',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10526});prepareFixture(w,hero,rank,'attack');const s=new AttackSimulation(w);s.reset(1/60);return {w,s};}
for(const hero of ids)for(const rank of [1,3,5]){
 const {w,s}=fixture(hero,rank);advance(w,s,1/60);assert.equal(s.stats.salvos,1);assert.equal(w.stats.damage,0,'Launch must not deal instantaneous damage');
 const first=s.packets.find(p=>p.kind==='main')!,root=first.damage*first.hits,opening=first.source.heroOpening?3:1;
 const missileHero=hero==='tychus'||hero==='yamato_battlecruiser';
 if(missileHero){while(s.stats.salvos<5)advance(w,s,1/60);}
 s.stopFiring();advance(w,s,5.5);assert.equal(s.packets.length,0);assert.equal(s.dots.length,0);assert.equal(s.report().reservedSalvos,0);assert.equal(w.heroCasts.length,0);
 const a=s.audit;
 if(rank===1){assert.equal(s.stats.sideHits+s.stats.missileHits+s.stats.bounceHits+s.stats.dotTicks+s.stats.splashHits,0);}
 else if(hero==='raynor'){
  const sides=a.filter(a=>a.kind==='side');assert.equal(sides.length,rank===5?2:1);assert.equal(new Set(sides.map(a=>a.target)).size,sides.length);for(const a of sides){assert.ok(Math.abs(a.damage/root-.3)<1e-9);assert.ok(Math.abs(a.hpLoss-a.damage)<1e-6);assert.notEqual(a.target,a.primaryTarget);}
 }else if(hero==='nova'){
  const dots=a.filter(a=>a.kind==='dot'),targets=[...new Set(dots.map(a=>a.target))];assert.ok(targets.length>=2,'DOT must affect other enemies along the aimed line');assert.equal(dots.length,targets.length*(rank===5?4:3));for(const a of dots){assert.ok(Math.abs(a.damage/(root*opening)-(rank===5?.3:.2))<1e-9);assert.ok(Math.abs(a.hpLoss-a.damage)<1e-6);}for(const id of targets){const ticks=dots.filter(a=>a.target===id);for(let i=1;i<ticks.length;i++)assert.ok(Math.abs(ticks[i].at-ticks[i-1].at-1)<1e-7);}assert.ok([...w.entities.values()].filter(e=>e.owner==='zerg'&&!targets.includes(e.id)).every(e=>e.hp===e.maxHp),'Off-line enemies must not receive DOT');
 }else if(missileHero){
  const missiles=a.filter(a=>a.kind==='missile');assert.equal(s.stats.missileProcs,1);assert.equal(missiles.length,rank===5?3:1);assert.equal(new Set(missiles.map(a=>a.target)).size,missiles.length);for(const a of missiles){assert.notEqual(a.target,a.primaryTarget);assert.equal(a.salvo,5);assert.ok(Math.abs(a.damage/root-1.5)<1e-9);}
 }else if(hero==='swann'){
  assert.equal(s.stats.bounceHits,rank===5?6:2);assert.equal(new Set(a.map(a=>a.target)).size,a.length);for(const a of s.audit.filter(a=>a.kind==='bounce')){assert.ok(a.hop>=1&&a.hop<=2);assert.ok(Math.abs(a.damage/root-Math.pow(.6,a.hop))<1e-9);assert.ok(a.parent!==null);}
  assert.equal(a.filter(a=>a.hop===1).length,rank===5?2:1);assert.equal(a.filter(a=>a.hop===2).length,rank===5?4:1);
 }else if(hero==='tosh'){
  const splash=a.filter(a=>a.kind==='splash');assert.ok(splash.length>=2);for(const a of splash){assert.notEqual(a.target,a.primaryTarget);assert.ok(Math.abs(a.damage/root-(rank===5?.6:.35))<1e-9);}checks.push({hero,rank,radius:rank===5?2.8:1.8,fireworkSparks:rank===5?36:18});
 }
 assert.ok(w.stats.damage>0);checks.push({hero,rank,stats:s.stats,damage:w.stats.damage,mainPacketDamage:root,audit:a});
}
// A fired rank-III bullet keeps its original damage and tier after a later live-source change.
{
 const {w,s}=fixture('raynor',3);advance(w,s,1/60);s.stopFiring();const packet=s.packets[0];const live=w.heroEntity('raynor')!;live.rank=5;live.weaponDamage=100000;advance(w,s,1);assert.equal(s.stats.sideHits,1);assert.equal(s.audit.find(a=>a.kind==='side')!.damage,packet.damage*.3);checks.push({frozenFlight:true});
}
// Dead/lost targets cannot receive a late projectile or a later DOT tick.
{
 const {w,s}=fixture('nova',5);advance(w,s,.3);s.stopFiring();const target=w.entities.get(s.dots[0].target)!;target.hp=0;advance(w,s,5);assert.equal(s.audit.filter(a=>a.kind==='dot'&&a.target===target.id).length,0);assert.ok(s.stats.dotTicks>0,'Living enemies further along the line keep their own DOT');assert.equal(s.dots.length,0);checks.push({deadTargetCancelsOwnDot:true,otherLineTargetStillTicked:true});
}
// Earlier enemies are affected when the projectile passes them, not when the whole line finishes.
{
 const {w,s}=fixture('nova',3);advance(w,s,1/60);s.stopFiring();assert.equal(s.lines.length,1);const hits=s.lines[0].targets;assert.ok(hits.length>=2);assert.ok(hits[0].arrive<hits[hits.length-1].arrive);advance(w,s,.22);assert.ok(s.dots.some(d=>d.target===hits[0].id));assert.ok(!s.dots.some(d=>d.target===hits[hits.length-1].id));advance(w,s,.3);assert.ok(s.dots.some(d=>d.target===hits[hits.length-1].id));checks.push({novaLineTravel:true,lineTargets:hits.map(h=>h.id)});
}
// Verify exactly the recovered first-version Swann code, independent of other skill revisions.
const first=await fs.readFile('.cache/hero-skill-lab/first-version-skill-effects.ts','utf8'),now=await fs.readFile('preview/hero-combat-lab/skill-effects.ts','utf8');
function block(code:string,start:string){const at=code.indexOf(start);assert.ok(at>=0,start);let depth=0,opened=false;for(let i=at;i<code.length;i++){if(code[i]==='{'){opened=true;depth++;}else if(code[i]==='}'&&opened&&--depth===0)return code.slice(at,i+1);}throw Error('Unclosed block '+start);}
const selectors=["if(c.hero==='swann'&&age<5)","if(e.hero==='swann')",'private ring('];const sourceIdentity=[];
for(const selector of selectors){const before=block(first,selector),after=block(now,selector);assert.equal(after,before);sourceIdentity.push({selector,sha256:createHash('sha256').update(after).digest('hex')});}
const shieldLine=(code:string)=>code.split('\n').find(l=>l.includes("const material=key==='shield'"))!.trim();assert.equal(shieldLine(now),shieldLine(first));
const geometryLine=(code:string)=>code.split('\n').find(l=>l.includes('const geometries:Record'))!.trim();assert.equal(geometryLine(now),geometryLine(first));
checks.push({swannExactFirstSource:true,sourceIdentity,shieldShaderSha256:createHash('sha256').update(shieldLine(now)).digest('hex'),geometrySha256:createHash('sha256').update(geometryLine(now)).digest('hex')});
const approved=await fs.readFile('src/render/effects/hero-basic-effects.ts','utf8'),restored=await fs.readFile('preview/hero-combat-lab/approved-gun-effects.ts','utf8');
const approvedMethods=[];for(const method of ['constructor(','private sprite(','private ribbon(','private smoke(','private sparks(','event(']){const expected=block(approved,method),actual=block(restored,method);assert.equal(actual,expected,'Approved base method changed: '+method);approvedMethods.push({method,sha256:createHash('sha256').update(actual).digest('hex')});}
for(const marker of ['const width=id===','const length=id==='])assert.equal(restored.split('\n').find(l=>l.includes(marker))?.trim(),approved.split('\n').find(l=>l.includes(marker))?.trim());
checks.push({allSixApprovedGunMethods:true,approvedMethods});
await fs.mkdir('reports/local/hero-combat-lab',{recursive:true});await fs.writeFile('reports/local/hero-combat-lab/rules.json',JSON.stringify({passed:true,tuning:T,checks,scope:'Independent demonstration rules and first-source identity; not game integration, human approval or game balance acceptance.'},null,2));
console.log(JSON.stringify({passed:true,checks:checks.length,attackCases:18,swannExactFirstSource:true,allSixApprovedGunMethods:true,raynorSidesTargetOthers:true,novaLineDot:true}));
