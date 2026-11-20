import {test} from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {newDoomsdayState} from '../src/simulation/combat/doomsday-state';
import {acquireDoomsdayBlueprint} from '../src/simulation/combat/doomsday-refits';
import {tickDoomsdayGiants,giantBaseline} from '../src/simulation/combat/doomsday-orange';
import {tickDoomsdaySwords} from '../src/simulation/combat/doomsday-melee';
import {tickDoomsdayNodes} from '../src/simulation/combat/doomsday-nodes';
import {tickWeaponFlights} from '../src/simulation/combat/weapon-flight';
import {clearDoomsdayBattle} from '../src/simulation/combat/doomsday-combat';
import type {DoomsdayId} from '../src/data/terran-doomsday';
import {CombatAudioRouter} from '../src/render/effects/combat-audio-router';
import {SOUND_DATA} from '../src/render/effects/audio-source-data';
import {audioPreloadBanks} from '../src/app/audio-preload-plan';
import {deathPresentation} from '../src/render/materials/death-presentation';

function make(...cards:DoomsdayId[]){const w=new World({race:'terran',seed:171101,waves:false,sandbox:true,terrain:false,obstacles:[]});w.start();w.entities.clear();w.starship.enabled=false;w.missions.enabled=w.encounters.enabled=false;w.expedition.doomsday=newDoomsdayState();for(const id of ['M-O02',...cards] as DoomsdayId[])w.expedition.doomsday.ranks[id]=1;const u=w.addUnit('thor','terran',0,0);acquireDoomsdayBlueprint(w,'M-O02');return {w,u};}
function target(w:World,x=0,z=3,air=false){const u=w.addUnit(air?'mutalisk':'roach','zerg',x,z);u.maxHp=u.hp=1e7;u.armor=0;u.attributes=[];return u;}
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-4,`${a} != ${b}`);
function step(w:World,giants=false){w.tick++;w.time=w.tick/60;giants?tickDoomsdayGiants(w):tickDoomsdaySwords(w);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);}

test('sword replaces four barrage missiles and freezes the ground fan, with one hit per target',()=>{
 const {w,u}=make(),front=target(w),left=target(w,-1,2),right=target(w,1,2),rear=target(w,0,-1),air=target(w,0,2,true),far=target(w,0,9);
 w.fire(u,front);assert.equal(w.weaponFlights.length,0);assert.equal(w.expedition.doomsday!.slashes!.length,1);assert.equal(front.hp,1e7);
 const hit=w.expedition.doomsday!.slashes![0].hitTick;u.attackFacing=Math.PI;for(let i=0;i<hit+3;i++)step(w);
 for(const t of [front,left,right])close(1e7-t.hp,u.weaponDamage);for(const t of [rear,air,far])assert.equal(t.hp,1e7);
 const hp=front.hp;tickDoomsdaySwords(w);assert.equal(front.hp,hp);
});
test('impact rechecks current range, target layer and line of fire, without firing fallback missiles',()=>{
 for(const change of ['leave','air','blocked'] as const){const {w,u}=make(),t=target(w);w.fire(u,t);if(change==='leave')t.z=9;else if(change==='air')t.flying=true;else w.hasAttackLine=()=>false;for(let i=0;i<60;i++)step(w);assert.equal(t.hp,1e7,change);assert.equal(w.weaponFlights.length,0);}
});
test('far or flying primary uses barrage and never switches the committed round to a sword',()=>{
 for(const air of [false,true]){const {w,u}=make(),t=target(w,0,air?2:8,air);w.fire(u,t);assert.equal(w.weaponFlights.length,4);assert.equal(w.expedition.doomsday!.slashes?.length??0,0);t.z=1;for(let i=0;i<60;i++)step(w);assert.ok(t.hp<1e7);assert.equal(w.expedition.doomsday!.slashes?.length??0,0);}
});
test('nine sword rounds keep exactly three cannons and one nuke and restore before impact',()=>{
 const {w,u}=make(),t=target(w),slashes=new Set<number>(),cannons=new Set<number>(),nukes=new Set<number>();let copy:World|undefined;
 for(let i=0;i<540;i++){w.tick=i;w.time=i/60;tickDoomsdayGiants(w);for(const e of w.expedition.doomsday!.slashes??[])if(!e.repeat)slashes.add(e.id);for(const e of w.expedition.doomsday!.areas??[])(e.kind==='cannon'?cannons:e.kind==='nuke'?nukes:new Set()).add(e.id);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);if(copy){copy.tick=i;copy.time=i/60;tickDoomsdayGiants(copy);tickWeaponFlights(copy,1/60);tickDoomsdayNodes(copy);}if(i===318){copy=make().w;copy.restoreRun(w.captureRun());}}
 assert.equal(slashes.size,9);assert.equal(cannons.size,3);assert.equal(nukes.size,1);assert.equal(w.weaponFlights.length,0);close(1e7-t.hp,giantBaseline('thor').dps*2.2*9);close(copy!.entities.get(t.id)!.hp,t.hp);assert.deepEqual(copy!.entities.get(u.id)!.doomsday,u.doomsday);
});
test('alternating distant and close rounds keeps one shared nine-round counter',()=>{
 const {w,u}=make(),t=target(w),swords=new Set<number>(),missiles=new Set<number>();
 for(let i=0;i<540;i++){w.tick=i;w.time=i/60;if(i%60===0)t.z=(i/60)%2?8:3;tickDoomsdayGiants(w);for(const e of w.expedition.doomsday!.slashes??[])swords.add(e.id);for(const e of w.weaponFlights)if(e.doomsdayDerived?.kind==='barrage')missiles.add(e.id);tickWeaponFlights(w,1/60);tickDoomsdayNodes(w);}
 assert.equal(swords.size,5);assert.equal(missiles.size,16);assert.equal(u.doomsday!.giant!.rounds,9);assert.equal(u.doomsday!.giant!.cannons,0);
});
test('B03 gives three 20 percent return cuts and never advances cannon count',()=>{
 const {w,u}=make('M-B03'),t=target(w);w.expedition.doomsday!.ranks['M-B03']=3;w.fire(u,t);const queue=w.expedition.doomsday!.slashes!;assert.equal(queue.length,4);assert.equal(queue.filter(e=>e.repeat).length,3);for(let i=0;i<60;i++)step(w);close(1e7-t.hp,u.weaponDamage*1.6);assert.equal(u.doomsday!.giant!.rounds,1);assert.equal(u.doomsday!.giant!.cannons,0);assert.equal(w.weaponFlights.length,0);
});
test('death cancels pending cuts and scene retirement clears their pose/settlement queue',()=>{
 const {w,u}=make('M-B03'),t=target(w);w.fire(u,t);u.hp=0;for(let i=0;i<60;i++)step(w);assert.equal(t.hp,1e7);assert.equal(w.expedition.doomsday!.slashes!.length,0);u.hp=100;u.doomsday!.giant!.nextReadyTick=0;w.fire(u,t);clearDoomsdayBattle(w);assert.equal(w.expedition.doomsday!.slashes!.length,0);
});
test('checkpoint after impact does not settle the same cut twice, including a same-step repeated tick',()=>{
 const {w,u}=make(),t=target(w);w.fire(u,t);const hit=w.expedition.doomsday!.slashes![0].hitTick;for(let i=0;i<hit;i++)step(w);const hp=t.hp,copy=make().w;copy.restoreRun(w.captureRun());tickDoomsdaySwords(copy);for(let i=0;i<20;i++)step(copy);assert.equal(copy.entities.get(t.id)!.hp,hp);
});
test('sword does not spend W05 preheat or apply gun-specific penetration; native nodes trigger once per fan',()=>{
 const {w,u}=make('M-W05','M-W01','M-G01','M-N01','M-N02'),t=target(w),side=target(w,1,2);u.doomsday!.ready=true;u.doomsday!.nanoAmmo=true;w.expedition.doomsday!.nodeReserves['M-N02']=1;w.fire(u,t);const r=u.doomsday!.round!;assert.equal(r.gun,false);assert.equal(r.penetration,0);assert.equal(r.preheated,false);assert.equal(r.damageFactor,1);assert.equal(u.doomsday!.ready,true);for(let i=0;i<30;i++)step(w);assert.equal(w.expedition.doomsday!.dots!.length,1);assert.equal(w.expedition.doomsday!.nodeReserves['M-N02'],0);assert.equal(u.doomsday!.nanoAmmo,false);assert.ok(side.hp<1e7);
});
test('giant paint scale is independent of nano armor and leaves gameplay hit/occupancy rules separate',()=>{
 const {w,u}=make('M-B01');const hit=u.unitRadius;w.refreshStats(u);close(u.doomsday!.visualScale!,2.15);close(u.movementRadius!,hit*.92);close(u.unitRadius,hit);
});

test('sword audio uses actual cuts and contacts once, and restore/pause never replay old windups',()=>{
 const {w,u}=make(),t=target(w),router=new CombatAudioRouter();w.paused=false;w.anchor={x:0,z:0};router.resumeAt(w);
 const preload=audioPreloadBanks('terran',1,w.entities.values(),true).combat;
 assert.ok(preload.includes(SOUND_DATA.weapons.zealot.attack!));assert.ok(preload.includes(SOUND_DATA.weapons.zealot.impact!));
 w.fire(u,t);let cues=router.update(w).cues.map(c=>c.bank);assert.ok(cues.includes(SOUND_DATA.weapons.zealot.attack!));assert.ok(!cues.includes('melee:Thor_HandGunAttackLaunch'));
 assert.equal(router.update(w).cues.length,0);const resumed=new CombatAudioRouter();resumed.resumeAt(w);assert.ok(!resumed.update(w).cues.some(c=>c.bank===SOUND_DATA.weapons.zealot.attack));
 const hit=w.expedition.doomsday!.slashes![0].hitTick;while(w.tick<hit)step(w);cues=router.update(w).cues.map(c=>c.bank);assert.equal(cues.filter(c=>c===SOUND_DATA.weapons.zealot.impact).length,1);assert.equal(router.update(w).cues.length,0);
 while(w.tick<61)step(w);w.fire(u,t);w.paused=true;router.update(w);w.paused=false;assert.ok(!router.update(w).cues.some(c=>c.bank===SOUND_DATA.weapons.zealot.attack));
});

test('death retains giant paint and nano/phase material after its entity is reclaimed',()=>{
 const {w,u}=make('M-B01','M-B04');w.refreshStats(u);const rng=w.captureRun().state.rngState,next=w.nextId;u.hp=0;w.visual('death',u);const event=w.visualEvents.at(-1)!;w.entities.delete(u.id);
 const corpse=deathPresentation(event);assert.deepEqual(corpse?.refit,[1,1,1,0]);close(corpse!.scale,2.15);assert.equal(w.nextId,next);assert.equal(w.captureRun().state.rngState,rng);
});
