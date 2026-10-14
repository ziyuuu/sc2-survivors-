import * as THREE from 'three';
import type {RadialTerrain} from '../../data/campaign-map';
import {createCampaignMap,type CampaignMapPresentation} from './campaign-map';
import {makeEnvironmentSamplePlan} from './environment-sample-plan';
import {prepareEnvironmentSampleModel,decorateEnvironmentSampleInstances} from './environment-sample-materials';
import {createEnvironmentSampleShore} from './environment-sample-shores';

/** Both the review scene and a later approved campaign integration import this renderer. */
export function environmentSamplePresentation(terrain:RadialTerrain):CampaignMapPresentation{
 const plan=makeEnvironmentSamplePlan(terrain);
 return {...plan,sceneryHeight:plan.boundary.lowered?(x,z)=>terrain.height({x,z}):plan.groundHeight,softenPads:true,prepareModel:prepareEnvironmentSampleModel,decorateInstances:decorateEnvironmentSampleInstances,decorate:(root,t,resources,ground)=>createEnvironmentSampleShore(root,t,plan,resources,ground)};
}
export const createEnvironmentSample=(scene:THREE.Scene,terrain:RadialTerrain)=>createCampaignMap(scene,terrain,environmentSamplePresentation(terrain));
