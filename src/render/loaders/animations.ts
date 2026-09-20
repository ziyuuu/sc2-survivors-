import type {AnimationClip} from 'three';
export function mapAnimations(clips:AnimationClip[]){
 const find=(r:RegExp)=>clips.find(c=>r.test(c.name));
 const unsieging=find(/un[\s_-]*(?:siege|deploy)/i);
 const sieging=clips.find(c=>/siege|deploy/i.test(c.name)&&!/^.*un[\s_-]*(?:siege|deploy)/i.test(c.name));
 return {idle:find(/stand|idle/i),move:find(/run/i)??find(/walk|move/i),attack:find(/attack|fire/i),dead:find(/death|dead/i),spawn:find(/birth|spawn/i),sieging,unsieging,heal:find(/heal|spell|channel/i)};
}
