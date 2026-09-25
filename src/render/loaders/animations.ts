import type {AnimationClip} from 'three';
export function mapAnimations(clips:AnimationClip[],profile?:string){
 const find=(r:RegExp)=>clips.find(c=>r.test(c.name));
 const unsieging=find(/un[\s_-]*(?:siege|deploy)/i);
 const sieging=clips.find(c=>/siege|deploy/i.test(c.name)&&!/^.*un[\s_-]*(?:siege|deploy)/i.test(c.name));
 const mapped={burrow:find(/^burrow$/i),unburrow:find(/^unburrow$/i),burrowIdle:find(/^stand burrow$/i)??find(/^burrow stand$/i)??find(/^burrow$/i),burrowAttack:find(/^attack burrow$/i),highImpactMorph:find(/^morph$/i),highImpactUnmorph:find(/^morph end$/i),highImpactIdle:find(/^morph stand$/i),highImpactAttack:find(/^spell d$/i),attackLeft:find(/^attack left$/i),attackRight:find(/^attack right$/i),ready:find(/^stand ready$/i),skill:find(/^spell$/i)??find(/^spell/i),idle:find(/^(stand|idle)$/i)??find(/stand|idle/i),move:find(/^run$/i)??find(/^walk$/i)??find(/run/i)??find(/walk|move/i),attack:find(/^attack$/i)??find(/attack|fire/i),dead:find(/^death$/i)??find(/death|dead/i),spawn:find(/^(birth|spawn)$/i)??find(/birth|spawn/i),sieging:sieging??find(/^morph start$/i),unsieging:unsieging??find(/^morph end$/i),heal:find(/^stand work$/i)??find(/heal|spell|channel/i),hit:find(/^(hit|hurt|wound|flinch)(\s|$)/i)};
 // MutatorAmonNova ActorCreation explicitly applies animation group A (canister rifle).
 if(profile==='hero.nova'){mapped.idle=find(/^stand a$/i);mapped.move=find(/^walk a$/i);mapped.attack=find(/^attack a$/i);mapped.dead=find(/^death a$/i);mapped.skill=find(/^spell e a$/i);}
 // Large SC ships (and several aircraft) fire through weapon attachments without
 // a dedicated Attack clip. Their Stand clip still carries the original mount.
 mapped.attack??=mapped.idle;
 // When a source body has no Spell sequence, use its original Attack action for
 // the cast windup. Ships with no Attack action keep their original Stand pose.
 mapped.skill??=mapped.attack??mapped.idle;
 return mapped;
}

/** SC2 Marauder Actor increments WeaponNext: 1 selects Right, 0 selects Left. */
export function attackAction(unitType:string|null,sequence=0){return unitType==='marauder'?(sequence%2?'attackRight':'attackLeft'):'attack';}
export function weaponAttachmentNames(clipName:string){
 const side=/left/i.test(clipName)?'Left':/right/i.test(clipName)?'Right':null;
 // GLTFLoader sanitizes whitespace in node names for PropertyBinding.
 // Several original SC bodies expose only side/bottom references; the Banshee's
 // missile pod is an original named node rather than a Ref_Weapon attachment.
 return [...(side?['Ref_Weapon '+side]:[]),'Ref_Weapon','Ref_Weapon 01','Ref_Weapon Right','Ref_Weapon Left','Ref_Weapon Bottom','Banshee_Pod1'].flatMap(name=>[name,name.replace(/\s/g,'_')]);
}
