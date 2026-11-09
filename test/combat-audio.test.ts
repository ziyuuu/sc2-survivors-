import test from 'node:test';
import assert from 'node:assert/strict';
import {World} from '../src/simulation/world';
import {SOUND_DATA,SoundVariation} from '../src/render/effects/audio-source-data';
import {CombatAudioRouter,weaponSoundKey,deathSoundKey} from '../src/render/effects/combat-audio-router';
import {StimPresentation} from '../src/render/effects/stim-presentation';
import {NativeSoundPlayer} from '../src/render/effects/native-sound-player';
import {AudioEffects} from '../src/render/effects/audio';
import {SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {registerZergRevival,tickZergRevival} from '../src/simulation/combat/zerg-hero-revival';
import {FlatTerrain} from '../src/simulation/movement/flat-terrain';
import {makeMissionBody} from '../src/simulation/missions/runtime';

function world(){const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[]});w.start();w.entities.clear();w.visualEvents=[];w.time=1;w.anchor={x:0,z:0};return w;}
function fakeContext(){
 const param=()=>({value:1,setValueAtTime(v:number){this.value=v;},linearRampToValueAtTime(v:number){this.value=v;},cancelScheduledValues(){}});
 const c={state:'running',currentTime:0,createGain:()=>({gain:param(),connect(n:unknown){return n;},disconnect(){}}),createBufferSource:()=>({buffer:null,loop:false,playbackRate:param(),onended:null as (()=>void)|null,connect(n:unknown){return n;},disconnect(){},start(){},stop(){this.onended?.();}})};
 return c as unknown as AudioContext;
}
test('dialogue voices are globally exclusive and pause releases the speaking slot',()=>{
 const context=fakeContext(),buffers=new Map<string,AudioBuffer>();for(const b of Object.values(SOUND_DATA.banks))for(const s of b.samples)buffers.set(s.asset,{} as AudioBuffer);
 const player=new NativeSoundPlayer(()=>context,()=>context.createGain(),buffers),cue=(bank:string)=>({bank,priority:2,group:'dialogue' as const});
 assert.ok(player.play(cue('melee:Marine_What')));assert.equal(player.play(cue('melee:SiegeTank_What')),undefined);assert.equal(player.voices.size,1);
 player.reset();assert.equal(player.voices.size,0);assert.ok(player.play(cue('melee:SiegeTank_What')));
});
test('all audio routes resolve to original banks, with distinct hero ability feedback',()=>{
 assert.equal(Object.keys(SOUND_DATA.skills).length,18);const banks=new Set(Object.keys(SOUND_DATA.banks));
 for(const [key,r]of Object.entries(SOUND_DATA.weapons)){assert.ok(r.attack||r.impact||r.channel,key);for(const id of [r.attack,r.impact,r.powered,...r.channel??[],...Object.values(r.surfaces)])if(id)assert.ok(banks.has(id),key+':'+id);}
 for(const [hero,s]of Object.entries(SOUND_DATA.skills))for(const [kind,id]of Object.entries(s))if(kind!=='note'){assert.ok(banks.has(id),hero+':'+kind);assert.notEqual(id,SOUND_DATA.weapons['hero:'+hero]?.attack);}
 for(const rows of [SOUND_DATA.deaths,SOUND_DATA.special])for(const [key,ids]of Object.entries(rows))for(const id of ids)assert.ok(banks.has(id),key+':'+id);
 for(const b of Object.values(SOUND_DATA.banks))assert.ok(b.samples.length&&b.samples.every(s=>/^sc2\.source\.[a-f0-9]{24}$/.test(s.asset)),b.id);
});
test('forms, target types and hero carrier children select their actual weapon identity',()=>{
 for(const [u,key]of [[{unitType:'hellion',nativeMode:'hellbat'},'hellbat'],[{unitType:'tank',mode:'siege'},'tank-siege'],[{unitType:'thor',activeWeapon:'LanceMissileLaunchers'},'thor-high-impact'],[{unitType:'thor',activeWeapon:'JavelinMissileLaunchers'},'thor-air'],[{unitType:'viking',nativeMode:'viking_assault'},'viking-assault'],[{unitType:'queen',activeWeapon:'Talons'},'queen-melee'],[{unitType:'hydralisk',targetFlying:true},'hydralisk-air'],[{heroId:'yamato_battlecruiser',targetFlying:true},'hero:yamato_battlecruiser-air'],[{heroId:'purifier_flagship',summonKind:'interceptor',rewardSourceKind:'hero'},'interceptor']] as const)assert.equal(weaponSoundKey(u as any),key);
 assert.equal(deathSoundKey({heroId:'purifier_flagship',summonKind:'interceptor'}),'interceptor');
});
test('one missile impact owns HP and shield receipts even after the shooter dies',()=>{
 const w=world(),u=w.addUnit('marauder','terran',0,0,1),target=w.addUnit('zergling','zerg',0,3,1),r=new CombatAudioRouter();r.update(w);
 w.visual('shield-hit',target,target,undefined,undefined,{hitSourceId:u.id,weaponHit:true,targetSurface:'shield'});w.visual('hit',target,target,undefined,undefined,{hitSourceId:u.id,weaponHit:true,targetSurface:'shield'});
 w.visual('projectile-impact',u,target,undefined,undefined,{targetSurface:'shield'});w.entities.delete(u.id);
 assert.deepEqual(r.update(w).cues.map(c=>c.bank),[SOUND_DATA.special.shieldHit[0]]);assert.equal(r.update(w).cues.length,0);
});
test('hero attack packets own auxiliary missile launch and posthumous impact',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0,1);u.heroId='tychus';const r=new CombatAudioRouter();r.update(w);
 const p={id:100,kind:'missile',source:structuredClone(u),hero:'tychus',target:99} as any;
 w.visual('attack',u);w.heroAttackEvents.push({kind:'launch',packet:p,at:w.time,p:{x:0,y:0,z:0}});assert.deepEqual(r.update(w).cues.map(c=>c.bank),[SOUND_DATA.weapons['hero-missile'].attack]);
 w.entities.delete(u.id);w.time+=.1;w.heroAttackEvents.push({kind:'impact',packet:p,at:w.time,p:{x:0,y:0,z:3}});assert.deepEqual(r.update(w).cues.map(c=>c.bank),[SOUND_DATA.weapons['hero-missile'].impact]);assert.equal(r.update(w).cues.length,0);
});
test('stim starts and naturally ends once, but death and restore never fabricate a start or ending',()=>{
 const w=world(),u=w.addUnit('marine','terran',0,0,1),s=new StimPresentation();s.resumeAt(w);u.stimUntil=12;
 assert.deepEqual(s.update(w).map(c=>c.kind),['start']);assert.equal(s.update(w).length,0);w.time=12;assert.deepEqual(s.update(w).map(c=>c.kind),['end']);
 u.stimUntil=23;assert.equal(s.update(w)[0].kind,'start');u.hp=0;w.time=23;assert.equal(s.update(w).length,0);u.hp=45;u.stimUntil=34;s.resumeAt(w);assert.equal(s.update(w).length,0);
 assert.ok(SOURCE_EFFECTS.StimpackStartImpact);assert.ok(SOURCE_EFFECTS.StimpackEndImpact);
});
test('shuffle obeys the original minimum variation using a separate RNG',()=>{
 const b=SOUND_DATA.banks['melee:Marine_AttackLaunch'],v=new SoundVariation(),out=Array.from({length:90},()=>v.sample('marine',b).asset);for(let i=0;i<out.length-8;i++)assert.equal(new Set(out.slice(i,i+9)).size,9);
});
test('native bank caps bound voices; skills replace ordinary attacks at the host limit',()=>{
 const c=fakeContext(),buffers=new Map(Object.values(SOUND_DATA.banks).flatMap(b=>b.samples.map(s=>[s.asset,{} as AudioBuffer] as const))),player=new NativeSoundPlayer(()=>c,()=>({}) as AudioNode,buffers);
 for(let i=0;i<20;i++)player.play({bank:'melee:Marine_AttackLaunch',priority:1});assert.equal(player.voices.size,6);
 player.reset();for(const key of Object.keys(SOUND_DATA.banks)){player.play({bank:key,priority:1});if(player.voices.size===48)break;}assert.equal(player.voices.size,48);
 assert.ok(player.play({bank:SOUND_DATA.skills.nova.launch!,priority:4}));assert.equal(player.voices.size,48);assert.ok([...player.voices].some(v=>v.priority===4));player.reset();assert.equal(player.voices.size,0);
});
test('beam and heal channels persist once, stop on pause, and never give a queen the medivac sound',()=>{
 const w=world(),u=w.addUnit('void_ray','terran',0,0,1),t=w.addUnit('roach','zerg',0,5,1),q=w.addUnit('queen','terran',2,0,1),m=w.addUnit('medivac','terran',-2,0,1);
 u.attackTarget=t.id;u.shotSequence=1;u.lastShotAt=w.time;u.shotInterval=.5;q.healTarget=m.healTarget=t.id;
 const a=new AudioEffects(),plays:string[]=[];a.playBank=cue=>{plays.push(cue.bank);return {bank:cue.bank,ended:false,stop(){this.ended=true;}} as any;};
 a.update(w);for(let i=0;i<6;i++){w.time+=.05;a.update(w);}assert.equal(plays.filter(p=>p===SOUND_DATA.weapons['void-ray'].channel![1]).length,1);assert.equal(plays.filter(p=>p===SOUND_DATA.special.medivac[1]).length,1);
 w.paused=true;a.update(w);assert.equal(a.report().activeChannels.length,0);w.paused=false;u.hp=0;m.hp=0;assert.equal(a.report().activeHealers,0);
});
test('restore consumes old receipts; pause consumes events without replaying them on resume',()=>{
 const w=world(),r=new CombatAudioRouter(),u=w.addUnit('marine','terran',0,0,1);w.visual('death',u);r.resumeAt(w);assert.equal(r.update(w).cues.length,0);
 w.time+=.1;w.visual('attack',u);assert.ok(r.update(w).cues.length);w.paused=true;w.visual('attack',u);assert.equal(r.update(w).cues.length,0);w.paused=false;assert.equal(r.update(w).cues.length,0);
});

test('Niadra audio follows a real registered revival window, revival, and expiration',()=>{
 const w=world(),u=w.addUnit('queen','terran',0,0,1),ally=w.addUnit('roach','terran',2,0,1);u.heroId='niadra';w.expedition.familySlots=['roach'];const r=new CombatAudioRouter();r.update(w);
 assert.ok(registerZergRevival(w,u,101,1));assert.equal(r.update(w).channels[0].bank,SOUND_DATA.skills.niadra.loop);
 w.hit(ally,100000,[],1,'zerg');w.time+=1.01;tickZergRevival(w);assert.ok(w.entities.get(ally.id)!.hp>0);assert.ok(r.update(w).cues.some(c=>c.bank===SOUND_DATA.skills.niadra.revive));
 w.time+=20;tickZergRevival(w);assert.equal(r.update(w).channels.length,0);
});

test('native endless fort shots, repair and destroyed building have independent audio routes',()=>{
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],endlessTerrain:new FlatTerrain()});w.start();w.stage=18;w.prepareStage();w.hive!.hp=0;w.phase='won';assert.ok(w.chooseCampaignExit('endless'));w.skipReward();w.skipReward();const plan=w.previewEndlessTransition()!,token=`${plan.requestId}:${plan.expectedRevision}:${plan.mapHash}`;assert.ok(w.registerEndlessReadyToken(token));assert.ok(w.commitEndlessTransition(plan.requestId,plan.expectedRevision,token));
 const r=new CombatAudioRouter();r.resumeAt(w);const forts=[...w.fortifications.values()],station=forts.find(f=>f.kind==='repair')!,bunker=forts.find(f=>f.kind==='bunker')!;bunker.x=station.x+3;bunker.z=station.z;const enemy=w.addUnit('zergling','zerg',bunker.x+2,bunker.z);enemy.moveSpeed=0;enemy.weaponDamage=0;w.updateUnit=()=>{};
 w.advance(.1);assert.ok(r.update(w).cues.some(c=>c.bank===SOUND_DATA.weapons['building:bunker'].attack));w.hit(bunker,50,[],1,'zerg');w.advance(.15);assert.ok(r.update(w).channels.some(c=>c.bank===SOUND_DATA.special.repair[0]),JSON.stringify({time:w.time,paused:w.paused,decision:w.requiresPlayerDecision,station,bunker,effects:w.effects}));
 w.hit(bunker,10000,[],1,'zerg');assert.ok(r.update(w).cues.some(c=>c.bank===SOUND_DATA.deaths['building:terran'][0]));assert.equal(w.fortifications.has(bunker.id),false);
});

test('mission worker, hive and egg death snapshots retain audio identity after task cleanup',()=>{
 const w=world(),r=new CombatAudioRouter(),m={id:'audio-test',bodyIds:[]} as any;r.update(w);
 for(const [role,model,key]of [['worker','scv','scv'],['worker','drone','drone'],['worker','probe','probe'],['hive','hive','building:zerg'],['egg','egg','egg']] as const){
  const b=makeMissionBody(w,m,role,{x:2,z:2},10,model,role==='worker'?'terran':'zerg',.5);w.visual('death',b);w.missions.bodies.delete(b.id);assert.deepEqual(r.update(w).cues.map(c=>c.bank),SOUND_DATA.deaths[key]);assert.equal(r.update(w).cues.length,0);
 }
});


test('late decoded cues do not replay after reset, and looping voices wait for a live channel',async()=>{
 const c=fakeContext(),buffers=new Map<string,AudioBuffer>(),p=new NativeSoundPlayer(()=>c,()=>c.createGain(),buffers);
 const pending:{id:string;resolve:()=>void}[]=[];p.ensureAsset=id=>new Promise<void>(resolve=>pending.push({id,resolve:()=>{buffers.set(id,{} as AudioBuffer);resolve();}}));
 const cue={bank:'melee:Marine_AttackLaunch',priority:1};p.play(cue);assert.equal(p.voices.size,0);p.reset();pending.splice(0).forEach(x=>x.resolve());await new Promise(r=>setTimeout(r,0));assert.equal(p.voices.size,0);
 buffers.clear();p.play(cue,true);const before=pending.length;p.play(cue,true);assert.equal(pending.length,before);pending.splice(0).forEach(x=>x.resolve());await new Promise(r=>setTimeout(r,0));assert.equal(p.voices.size,0);assert.ok(p.play(cue,true));assert.equal(p.voices.size,1);p.reset();
});
