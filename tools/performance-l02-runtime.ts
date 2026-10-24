import {BattleRenderer} from '../src/render/scene/battle-renderer';
import {EmbeddedAssetStore} from '../src/assets/offline-pack';
import {AssetReadinessCoordinator} from '../src/app/asset-readiness';
import {AudioEffects} from '../src/render/effects/audio';
import {BackgroundPreparation} from '../src/app/background-preparation';
import {AnimatedBatch} from '../src/render/units/animated-batch';
// Diagnostics only. Identical wrappers in both builds; timings overlap and are not additive.
const state:any={loadedAt:performance.now(),spans:[],phases:[],app:null};
(window as any).L02=state;
for(const [proto,method,label,async]of [
 [BattleRenderer.prototype,'compilePresentation','shaderWait',true],
 [BattleRenderer.prototype,'preloadTextures','textureUploadSubmit',false],
 [BattleRenderer.prototype,'warmPresentationBatches','HDRWarm',true],
 [BattleRenderer.prototype,'finishProgramWarmup','firstUseValidation',true],
 [BattleRenderer.prototype,'prepareCampaignAssets','mapPreparation',true],
 [BattleRenderer.prototype,'load','commonModels',true],
 [EmbeddedAssetStore.prototype,'prepare','embeddedDecode',true],
 [AudioEffects.prototype,'preload','audioPreparation',true],
 [AssetReadinessCoordinator.prototype,'prepare','requiredEntrance',true],
 [BackgroundPreparation.prototype,'enter','laneWait',true],
 [AnimatedBatch,'create','poseAndBatch',true],
] as const){
 const p=proto as any,original=p[method];if(!original)throw Error('Missing measurement method '+method);
 p[method]=async?async function(...args:any[]){const start=performance.now();let ok=false;try{const result=await original.apply(this,args);ok=true;return result;}finally{state.spans.push({label,start,ms:performance.now()-start,ok});}}:function(...args:any[]){const start=performance.now();try{return original.apply(this,args);}finally{state.spans.push({label,start,ms:performance.now()-start,ok:true});}};
}
const update=(AssetReadinessCoordinator.prototype as any).update;
(AssetReadinessCoordinator.prototype as any).update=function(...args:any[]){const result=update.apply(this,args);if(state.phases.at(-1)?.phase!==this.state.phase)state.phases.push({at:performance.now(),...this.state});return result;};
