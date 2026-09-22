import type {AnimationClip} from 'three';
export function mapAnimations(clips:AnimationClip[],profile?:string){
 const find=(r:RegExp)=>clips.find(c=>r.test(c.name));
 const unsieging=find(/un[\s_-]*(?:siege|deploy)/i);
 const sieging=clips.find(c=>/siege|deploy/i.test(c.name)&&!/^.*un[\s_-]*(?:siege|deploy)/i.test(c.name));
 const mapped={skill:find(/^spell$/i)??find(/^spell/i),idle:find(/^(stand|idle)$/i)??find(/stand|idle/i),move:find(/^run$/i)??find(/^walk$/i)??find(/run/i)??find(/walk|move/i),attack:find(/^attack$/i)??find(/attack|fire/i),dead:find(/^death$/i)??find(/death|dead/i),spawn:find(/^(birth|spawn)$/i)??find(/birth|spawn/i),sieging:sieging??find(/^morph start$/i),unsieging:unsieging??find(/^morph end$/i),heal:find(/^stand work$/i)??find(/heal|spell|channel/i),hit:find(/^(hit|hurt|wound|flinch)(\s|$)/i)};
 // MutatorAmonNova ActorCreation explicitly applies animation group A (canister rifle).
 if(profile==='hero.nova'){mapped.idle=find(/^stand a$/i);mapped.move=find(/^walk a$/i);mapped.attack=find(/^attack a$/i);mapped.dead=find(/^death a$/i);mapped.skill=find(/^spell e a$/i);}
 return mapped;
}
