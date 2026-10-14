import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {preparedAnimationSampling} from './7a-animation-transform.mjs';
const root='reports/local/7a-20261013/',out=root+'animation-integration-r2';
await fs.mkdir(out);
const files=['src/render/units/animated-batch.ts','src/render/scene/battle-renderer.ts','src/app/asset-readiness.ts'],before={};
for(const file of files){before[file]=await fs.readFile(file,'utf8');if(before[file]!==await fs.readFile(root+'baseline/source/'+file,'utf8'))throw Error('Source changed outside this candidate: '+file);}
let helper=await fs.readFile('tools/7a-sampled-poses.ts','utf8');
helper=helper.replaceAll('../src/render/loaders/','../loaders/').replace('../src/render/units/body-outline','./body-outline');
helper=helper.replace('if(step.done){check();return step.value;}','if(step.done){check();control.progress?.(step.value.totalFrames,step.value.totalFrames);return step.value;}');
let batch=preparedAnimationSampling(before[files[0]],'./sampled-poses');
batch=batch.replace('type PosePreparation}','type PosePreparation,type PosePreparationControl}');
batch=batch.replace('referenceBodyHeight?:number){\n  const began=performance.now(),data=await preparePoseDataAsync([gltf,height,normalization,unitScale,profile,referenceBodyHeight]);traceConstructor(\'animation.sample-async\',profile??gltf.scene.name,began);','referenceBodyHeight?:number,control:PosePreparationControl={}){\n  const data=await preparePoseDataAsync([gltf,height,normalization,unitScale,profile,referenceBodyHeight],control);');
batch=batch.replace('){const __7aStart=performance.now();','){').replace('traceConstructor("animation.prepare",profile??gltf.scene.name,__7aStart);','');
batch=batch.replace("import {bodyOutline} from './body-outline';",'').replace("import {sc2BodyBounds,sc2ModelScale} from '../loaders/sc2-materials';",'').replace('{mapAnimations,weaponAttachmentNames}','{mapAnimations}').replace('const FPS=24,CAPACITY=1024;','const CAPACITY=1024;');
if(batch.includes('traceConstructor')||batch.includes('__7a')||!batch.includes('control:PosePreparationControl'))throw Error('Production sampler transform incomplete');
let view=before[files[1]];
view="import type {PosePreparationControl} from '../units/sampled-poses';\n"+view;
view=view.replace(' private variantLoads=',` preparationControl?:PosePreparationControl;
 private createAnimatedBatch(gltf:GLTF,scene:THREE.Scene,height:number,normalization?:THREE.Matrix4,unitScale=1,profile?:string,referenceBodyHeight?:number){const epoch=this.contextEpoch,control=this.preparationControl;return AnimatedBatch.create(gltf,scene,height,normalization,unitScale,profile,referenceBodyHeight,{...control,cancelled:()=>this.contextEpoch!==epoch||!!control?.cancelled?.()});}
 private variantLoads=`);
view=view.replace('this.prepareUnit(type,gltf);','await this.prepareUnit(type,gltf);').replace('private prepareUnit(','private async prepareUnit(');
view=view.replaceAll('new AnimatedBatch(','await this.createAnimatedBatch(');
if(view.includes('new AnimatedBatch(')||!view.includes('preparationControl?:'))throw Error('Renderer transform incomplete');
let readiness=before[files[2]];
readiness=readiness.replace('this.view.entryPreparation=true;','this.view.entryPreparation=true;\n   this.view.preparationControl={cancelled:()=>generation!==this.generation};');
readiness=readiness.replace('this.view.entryPreparation=false;release?.();','this.view.preparationControl=undefined;this.view.entryPreparation=false;release?.();');
const changes={[files[0]]:batch,[files[1]]:view,[files[2]]:readiness,'src/render/units/sampled-poses.ts':helper},sha=text=>createHash('sha256').update(text).digest('hex'),record=[];
for(const [file,text]of Object.entries(changes)){if(before[file])await fs.writeFile(out+'/'+file.replaceAll('/','__')+'.before',before[file]);await fs.writeFile(file,text);record.push({file,before:before[file]?sha(before[file]):null,after:sha(text)});}
await fs.writeFile(out+'/changes.json',JSON.stringify({at:new Date().toISOString(),status:'Candidate integrated for verification, not a released artifact',changes:record},null,2));console.log(JSON.stringify(record));
