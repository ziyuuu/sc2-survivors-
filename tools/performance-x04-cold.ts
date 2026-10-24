// Diagnostic entry only; installed before startGame to include source preparation.
import {SourceEffectPlayer,SOURCE_EFFECTS} from '../src/render/effects/source/player';
import {PodView} from '../src/render/units/pod-view';
import * as THREE from 'three';
import {sourceLife} from '../src/render/effects/source/timeline';
import * as depthBindings from '../src/render/materials/posed-depth';
import * as pylonBindings from '../src/render/units/pylon-birth-materials';
const data={start:performance.now(),load:[] as unknown[],prepare:[] as unknown[],clones:[] as unknown[]};
const proto=SourceEffectPlayer.prototype as any;
for(const method of ['load','prepareMeshes']){const original=proto[method];proto[method]=async function(...args:any[]){const start=performance.now();try{return await original.apply(this,args);}finally{(method==='load'?data.load:data.prepare).push({ms:performance.now()-start,ready:this.ready,resources:this.resources.size,at:start});}};}
const make=proto.makeMesh;proto.makeMesh=function(resource:any,...args:any[]){const start=performance.now();try{return make.call(this,resource,...args);}finally{data.clones.push({model:resource.definition.id,ms:performance.now()-start});}};
(window as any).__X04Cold={data,PodView,THREE,SOURCE_EFFECTS,sourceLife,depthBindings,pylonBindings};
