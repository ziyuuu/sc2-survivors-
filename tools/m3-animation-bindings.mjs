/** Preserve original animation channels whose bone names contain Three binding separators. */
export function normalizeBoneBindings(bones,clips){
 const renamed=new Map(),used=new Set(bones.map(b=>b.name));
 for(const [index,bone] of bones.entries()){
  if(!/[.\[\]\/:]/.test(bone.name))continue;
  const original=bone.name;let name=original.replace(/[.\[\]\/:]/g,'_');
  if(used.has(name))name+='__'+index;
  used.add(name);renamed.set(original,name);bone.name=name;
 }
 for(const clip of clips)for(const track of clip.tracks){const split=track.name.lastIndexOf('.'),name=track.name.slice(0,split);if(renamed.has(name))track.name=renamed.get(name)+track.name.slice(split);}
 return Object.fromEntries(renamed);
}
