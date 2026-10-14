import * as THREE from 'three';
import type {RadialTerrain} from '../../data/campaign-map';
import {createCampaignMap,type CampaignMapPresentation} from './campaign-map';
import {makeEnvironmentFullPlan} from './environment-full-plan';
import {prepareEnvironmentSampleModel,decorateEnvironmentSampleInstances} from './environment-sample-materials';
import {createEnvironmentSampleShore} from './environment-sample-shores';

/** The formal renderer uses the same accepted material, grounding and shore implementations. */
export function fullEnvironmentPresentation(terrain:RadialTerrain):CampaignMapPresentation {
 const plan=makeEnvironmentFullPlan(terrain);
 return {...plan,sceneryHeight:['ice','char','frontier'].includes(terrain.recipe.theme)?(x,z)=>terrain.height({x,z}):plan.groundHeight,softenPads:true,prepareModel:prepareEnvironmentSampleModel,decorateInstances:decorateEnvironmentSampleInstances,
  decorate:async(root,t,resources,ground)=>{
   const shores:Awaited<ReturnType<typeof createEnvironmentSampleShore>>[]=[];for(const [i,boundary] of plan.boundaries.entries())shores.push(await createEnvironmentSampleShore(root,t,{...plan,boundary,sites:i===0?plan.sites:[]},resources,ground));
   return {update:frame=>{for(const shore of shores)shore.update(frame)},report:()=>({version:1,layout:'full-map',protection:plan.protection,groups:plan.protection.nativeBlockers,surfaces:plan.sites.length,boundaries:shores.map(shore=>shore.report()),collisionChanges:false})};
  },
 };
}
export const createFullEnvironmentMap=(scene:THREE.Scene,terrain:RadialTerrain)=>createCampaignMap(scene,terrain,fullEnvironmentPresentation(terrain));
