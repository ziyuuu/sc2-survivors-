import type {AnimationClip} from 'three';
import type {Entity} from '../../simulation/types';
import {SC2_UNITS} from '../../data/sc2-units';
import {animationProfile} from './animation-profiles';
export function mapAnimations(clips:AnimationClip[],profile?:string){
 const find=(r:RegExp)=>clips.find(c=>r.test(c.name));
 const unsieging=find(/un[\s_-]*(?:siege|deploy)/i);
 const sieging=clips.find(c=>/siege|deploy/i.test(c.name)&&!/^.*un[\s_-]*(?:siege|deploy)/i.test(c.name));
 const mapped={burrow:find(/^burrow$/i),unburrow:find(/^unburrow$/i),burrowIdle:find(/^stand burrow$/i)??find(/^burrow stand$/i)??find(/^burrow$/i),burrowAttack:find(/^attack burrow$/i),highImpactMorph:find(/^morph$/i),highImpactUnmorph:find(/^morph end$/i),highImpactIdle:find(/^morph stand$/i),highImpactAttack:find(/^spell d$/i),attackLeft:find(/^attack left$/i),attackRight:find(/^attack right$/i),ready:find(/^stand ready$/i),skill:find(/^spell$/i)??find(/^spell/i),idle:find(/^(stand|idle)$/i)??find(/stand|idle/i),move:find(/^run$/i)??find(/^walk$/i)??find(/run/i)??find(/walk|move/i),attack:find(/^attack$/i)??find(/attack|fire/i),dead:find(/^death$/i)??find(/death|dead/i),spawn:find(/^(birth|spawn)$/i)??find(/birth|spawn/i),sieging:sieging??find(/^morph start$/i),unsieging:unsieging??find(/^morph end$/i),heal:find(/^stand work$/i)??find(/heal|spell|channel/i),hit:find(/^(hit|hurt|wound|flinch)(\s|$)/i)};
 const selected=animationProfile(profile),named=(names?:string[])=>names?.map(name=>clips.find(c=>c.name.toLowerCase()===name.toLowerCase())).find(Boolean);
 const extra={attackChannel:named(selected?.attackChannel),attackEnd:named(selected?.attackEnd)};
 if(selected){mapped.idle=named(selected.idle);mapped.move=named(selected.move);mapped.attack=named(selected.attack);mapped.skill=named(selected.skill);mapped.ready=named(selected.ready);}
 // MutatorAmonNova ActorCreation explicitly applies animation group A (canister rifle).
 if(profile==='hero.nova'){mapped.idle=find(/^stand a$/i);mapped.move=find(/^walk a$/i);mapped.attack=find(/^attack a$/i);mapped.dead=find(/^death a$/i);mapped.skill=find(/^spell e a$/i);}
 // Large SC ships (and several aircraft) fire through weapon attachments without
 // a dedicated Attack clip. Their Stand clip still carries the original mount.
 if(!selected)mapped.attack??=mapped.idle;
 // When a source body has no Spell sequence, use its original Attack action for
 // the cast windup. Ships with no Attack action keep their original Stand pose.
 mapped.skill??=mapped.attack??mapped.idle;
 return {...mapped,...extra};
}

export type AttackPlaybackState={channelSince?:number;lastShotAt?:number;shotSequence?:number;suppressedThroughShot?:number};
type ShootingUnit=Pick<Entity,'unitType'|'action'|'hp'|'lastShotAt'|'shotSequence'|'shotInterval'|'windup'|'modeTimer'> & Partial<Pick<Entity,'heroId'|'summonKind'|'nativeModeUntil'|'recoveryUntil'|'nativeMode'|'lastSkillAt'>>;
export type AttackPresentation={action:keyof ReturnType<typeof mapAnimations>;seconds:number;once:boolean;overlay:boolean};
/** Presentation only. Shot timestamps survive an idle/move overwrite and save/load.
 * No events are emitted here, and no simulation field is changed. */
export function selectAttackPresentation(unit:ShootingUnit,time:number,actions:ReturnType<typeof mapAnimations>,state:AttackPlaybackState={}):AttackPresentation|null{
 const priority=unit.hp<=0||['dead','spawn','skill','sieging','unsieging','heal'].includes(unit.action)||!!unit.nativeModeUntil||unit.modeTimer>0||(unit.recoveryUntil??0)>time;
 if(priority){delete state.channelSince;state.lastShotAt=unit.lastShotAt;state.shotSequence=unit.shotSequence;state.suppressedThroughShot=unit.shotSequence??0;return null;}
 if(unit.unitType==='carrier'&&!unit.heroId&&!unit.summonKind)return null;
 const overlay=!unit.heroId&&(unit.unitType==='marine'||unit.unitType==='marauder');
 const action=attackAction(unit.unitType,unit.shotSequence),clip=actions[action];
 if(!clip||clip===actions.idle)return null;
 const rate=1.4,marker=Math.min(clip.duration,SC2_UNITS[unit.unitType].damagePoint*rate);
 const age=time-unit.lastShotAt;
 const gap=Math.max(.16,unit.shotInterval*1.5),channel=(unit.unitType==='void_ray'||unit.unitType==='colossus')&&!unit.heroId&&!!actions.attackChannel;
 if(unit.windup>0&&unit.action==='attack'&&!(channel&&(unit.shotSequence??0)>0&&age<=gap))return {action:actions.ready?'ready':action,seconds:Math.max(0,marker-unit.windup*rate),once:true,overlay};
 if(!(unit.shotSequence??0)||age<0||(unit.shotSequence??0)<=(state.suppressedThroughShot??-1))return null;
 // Skills and burrowing invalidate earlier recovery without replaying it afterward.
 if((unit.lastSkillAt??-Infinity)>unit.lastShotAt)return null;
 if(channel){
  if(state.shotSequence!==unit.shotSequence){const ticks=Math.max(1,(unit.shotSequence??0)-(state.shotSequence??0)),restoring=state.lastShotAt===undefined&&(unit.shotSequence??0)>1;if(state.channelSince===undefined||unit.lastShotAt-(state.lastShotAt??-Infinity)>Math.max(gap,ticks*unit.shotInterval+.05))state.channelSince=unit.lastShotAt-(restoring?clip.duration/rate:0);state.shotSequence=unit.shotSequence;state.lastShotAt=unit.lastShotAt;}
  const channelAge=Math.max(0,time-(state.channelSince??unit.lastShotAt))*rate;
  if(age<=gap)return channelAge<clip.duration?{action,seconds:channelAge,once:true,overlay:false}:{action:'attackChannel',seconds:channelAge-clip.duration,once:false,overlay:false};
  const end=(age-gap)*rate;
  return actions.attackEnd&&end<actions.attackEnd.duration?{action:'attackEnd',seconds:end,once:true,overlay:false}:null;
 }
 const seconds=marker+age*rate,window=Math.min((clip.duration-marker)/rate,Math.max(.12,unit.shotInterval*.9));
 return age<window?{action:unit.nativeMode==='lurker_burrowed'&&actions.burrowAttack?'burrowAttack':action,seconds,once:true,overlay}:null;
}

/** SC2 Marauder Actor increments WeaponNext: 1 selects Right, 0 selects Left. */
export function attackAction(unitType:string|null,sequence=0){return unitType==='marauder'?(sequence%2?'attackRight':'attackLeft'):'attack';}
export function weaponAttachmentNames(clipName:string,profile?:string,mountSide?:string){
 // Verified original B97563 nodes: BC 01/04 are opposed upper batteries,
 // 09 is the bow. Leviathan 02..05 are four distinct lateral mouths.
 const exact=profile==='hero.yamato_battlecruiser'?(mountSide==='Left'?'01':mountSide==='Right'?'04':/^Spell/i.test(clipName)?'09':'01'):profile==='hero.hots_leviathan'?(mountSide??'01'):null;
 if(exact)return ['Ref_Weapon_'+exact,'Ref_Weapon '+exact];
 if(mountSide)return ['Ref_Weapon '+mountSide,'Ref_Weapon_'+mountSide];
 const side=/left/i.test(clipName)?'Left':/right/i.test(clipName)?'Right':null;
 // GLTFLoader sanitizes whitespace in node names for PropertyBinding.
 // Several original SC bodies expose only side/bottom references; the Banshee's
 // missile pod is an original named node rather than a Ref_Weapon attachment.
 return [...(side?['Ref_Weapon '+side]:[]),'Ref_Weapon','Ref_Weapon 01','Ref_Weapon Right','Ref_Weapon Left','Ref_Weapon Bottom','Banshee_Pod1'].flatMap(name=>[name,name.replace(/\s/g,'_')]);
}
