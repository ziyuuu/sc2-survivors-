import fs from 'node:fs/promises';
import {Vector3} from 'three';
import {World} from '../../src/simulation/world';
import {newEquipmentAccount} from '../../src/simulation/starship/inventory';
import {CombatAudioRouter,weaponSoundKey,deathSoundKey} from '../../src/render/effects/combat-audio-router';
import {SOUND_DATA} from '../../src/render/effects/audio-source-data';
import {installRuntime} from './runtime';
import {DYNAMIC_CASES} from './catalogue';
const all=process.argv.includes('--all'),focus=process.argv.find(a=>a.startsWith('--match='))?.slice(8),pattern=focus?new RegExp(focus):null;
const selected=DYNAMIC_CASES.filter(c=>!c.applicability&&['actor','enemy','card-effect'].includes(c.runner)&&
 (c.runner==='card-effect'?/support\./.test(c.id):['attack','death','skill','heal','stim','auto-ability','ability'].includes(c.action??''))&&
 (c.runner==='enemy'?(all||c.fixture?.enemy?.level===1):c.runner==='card-effect'||c.rank===1||c.actor?.startsWith('hero.')&&[3,5].includes(c.rank??0))&&(!pattern||pattern.test(c.id)));
const rows:any[]=[],failures:any[]=[],noop=()=>{};
for(const [i,c]of selected.entries()){
 const w=new World({seed:529,sandbox:true,waves:false,terrain:false,obstacles:[],equipmentAccount:newEquipmentAccount(529)}),router=new CombatAudioRouter(),played=new Map<string,number>(),channelSet=new Set<string>();
 const audio={reset(){router.reset();played.clear();channelSet.clear();},update(){const frame=router.update(w);for(const cue of frame.cues)played.set(cue.bank,(played.get(cue.bank)??0)+1);for(const ch of frame.channels){channelSet.add(ch.bank);if(ch.start)channelSet.add(ch.start);}},report:()=>({played:Object.fromEntries(played),channels:[...channelSet]})};
 const view={initialAssetsLoaded:true,cameraController:{pose:noop},camera:{position:new Vector3(),updateMatrixWorld:noop},gpu:new Map(),resetRun:noop,resetCameraZoom:noop,setCameraMode:noop,render:noop,prepareRosterAssets:noop,battleBackgroundJobs:()=>[],assetsPending:0,report:()=>({assetsPending:0,map:'no-render',errors:[]})};
 const runtime=installRuntime({world:w,view,hud:{audio,inputReset:noop,update:noop},readiness:{cancel:noop,prepare:async()=>true},driver:{reset:noop},session:{memoryOnly:true}} as any);
 try{
  await runtime.prepare(c);audio.update();runtime.trigger();audio.update();await runtime.advanceTo(c.seconds??8);audio.update();
  const snapshot=runtime.snapshot(),u=snapshot.initial?.actor as any,expected:string[]=[];let reason='';
  if(c.action==='death'&&u)expected.push(...(u.unitType==='science_vessel'&&u.eliteId?SOUND_DATA.special.hologramDeath:SOUND_DATA.deaths[deathSoundKey(u)])??[]);
  else if(c.runner==='enemy'&&c.action==='skill'){const k=c.fixture?.enemy?.skill;if(!c.fixture?.enemy?.interruption){if(k==='bile')expected.push(SOUND_DATA.special.bile[0],SOUND_DATA.special.bile[1]);else if(k==='heal')expected.push(SOUND_DATA.special.queenHeal[0]);else{const p=SOUND_DATA.weapons[k==='spikes'?'lurker':k==='cone'?'roach':c.family!];if(p)expected.push(...[p.attack,p.impact].filter(Boolean) as string[]);}}}
  else if(c.action==='skill'&&u?.heroId){const s=SOUND_DATA.skills[u.heroId];expected.push(...[s.launch,u.heroId==='niadra'?undefined:s.loop].filter(Boolean) as string[]);}
  else if(c.action==='ability')expected.push(SOUND_DATA.special[c.family==='banshee'?'cloak':'blink'][0]);
  else if(c.action==='stim')expected.push(SOUND_DATA.special[c.family==='marauder'?'stimMarauder':'stimMarine'][0]);
  else if(c.action==='auto-ability'){
   if(c.family==='queen')expected.push(SOUND_DATA.special.queenHeal[0]);
   else if(c.actor==='elite.sentry.2')expected.push(SOUND_DATA.skills.vorazun.launch!);
   else if(c.actor==='elite.high_templar.2')expected.push(...SOUND_DATA.special.feedback);
   else if(c.family==='sentry')expected.push(SOUND_DATA.special.guardian[1]);
   else if(c.family==='high_templar')expected.push(...SOUND_DATA.special.storm);
  }
  else if(c.action==='heal')expected.push(SOUND_DATA.special[c.family==='science_vessel'?'repair':'medivac'][c.family==='science_vessel'?0:1]);
  else if(c.action==='attack'&&u){const source=w.entities.get(u.id)??u,key=weaponSoundKey({...source,targetFlying:c.target==='air'}),p=SOUND_DATA.weapons[key];if(p)expected.push(...[p.attack,p.impact,p.channel?.[1]].filter(Boolean) as string[]);else if(c.family==='carrier'||u.heroId==='purifier_flagship')expected.push(SOUND_DATA.weapons.interceptor.attack!);else reason='No weapon profile '+key;}
  else if(c.runner==='card-effect'){
   const k=c.id.match(/support\.([^.]+)\.([^:]+)/)!,race=k[1],kind=k[2],own=race==='terran'?'marine':race==='zerg'?'zergling':'zealot';
   const bank=kind==='mines'?SOUND_DATA.special[race==='terran'?'mine':race==='zerg'?'bombardZerg':'bombardProtoss'][0]:['strategic','bombardment'].includes(kind)?SOUND_DATA.special[race==='terran'?kind==='strategic'?'nuke':'bombardTerran':race==='zerg'?'bombardZerg':'bombardProtoss'][race==='terran'&&kind==='strategic'?2:0]:kind==='prism'?SOUND_DATA.weapons['void-ray'].channel![1]:kind==='overdrive'?SOUND_DATA.special.stimMarine[0]:['evolve','consume'].includes(kind)?SOUND_DATA.special.queenHeal[0]:kind==='parasite'?SOUND_DATA.special.bombardZerg[0]:kind==='bunker'?SOUND_DATA.weapons['building:bunker'].attack:kind==='missiles'?SOUND_DATA.weapons['hero-missile'].impact:kind==='counter'?SOUND_DATA.special.shieldHit[0]:SOUND_DATA.weapons[kind==='mutation'?(race==='zerg'?'hydralisk':race==='protoss'?'stalker':'marine'):own].attack;
   if(bank)expected.push(bank);else reason='Missing explicit support effect expectation';
  }
  const heard=new Set([...played.keys(),...channelSet]);if(expected.length&&!expected.every(id=>heard.has(id)))reason='Expected actual source/ability sound absent';
  if(['attack','death','skill','stim','heal'].includes(c.action??'')&&!expected.length&&!c.fixture?.enemy?.interruption)reason||='Missing explicit expected route';
  const row={id:c.id,action:c.action,runner:c.runner,expected,played:Object.fromEntries(played),channels:[...channelSet],elapsed:snapshot.elapsed,shots:snapshot.actor?.shots,events:[...new Set((snapshot.events as any[]).map(e=>e.kind))],reason};rows.push(row);if(reason)failures.push(row);
 }catch(error){failures.push({id:c.id,error:String(error)});}
 if((i+1)%50===0||i===selected.length-1)console.log(JSON.stringify({done:i+1,total:selected.length,failed:failures.length}));
}
const output='.cache/t01-audio/audit'+(focus?'-focused':'')+'.json';await fs.writeFile(output,JSON.stringify({scope:'Actual native fixtures, sound routing only; no visual or human listening claim',selected:selected.length,rows,failures},null,2));console.log(JSON.stringify({output,cases:rows.length,failures:failures.map(f=>({id:f.id,reason:f.reason,error:f.error}))}));if(failures.length)process.exitCode=1;
