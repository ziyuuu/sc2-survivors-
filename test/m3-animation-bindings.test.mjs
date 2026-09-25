import test from 'node:test';
import assert from 'node:assert/strict';
import {Bone,Group,NumberKeyframeTrack,AnimationClip,PropertyBinding} from 'three';
import {normalizeBoneBindings} from '../tools/m3-animation-bindings.mjs';
test('original slash-named channels keep their bone when exported to Three bindings',()=>{
 const group=new Group(),bone=new Bone(),collision=new Bone();bone.name='Dummy_APsyblade_On/Off';collision.name='Dummy_APsyblade_On_Off';group.add(bone,collision);
 const clip=new AnimationClip('Attack',1,[new NumberKeyframeTrack(bone.name+'.scale',[0,1],[1,0])]);
 const renamed=normalizeBoneBindings([bone,collision],[clip]);assert.equal(Object.keys(renamed).length,1);
 const parsed=PropertyBinding.parseTrackName(clip.tracks[0].name);assert.equal(PropertyBinding.findNode(group,parsed.nodeName),bone);assert.equal(parsed.propertyName,'scale');
 assert.deepEqual(Array.from(clip.tracks[0].values),[1,0]);assert.notEqual(bone.name,collision.name);
});
