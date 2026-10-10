import * as THREE from 'three';
import {RadialTerrain,type CampaignTheme} from '../../data/campaign-map';
import type {TerrainQuery} from '../../data/map-definition';

export interface SceneLightingProfile {sky:number;ground:number;ambient:number;key:number;intensity:number}
/** Approved five-map candidates; camera, fog and the fixed HDR/output chain stay with BattleRenderer. */
export const SCENE_LIGHTING:Readonly<Record<CampaignTheme,SceneLightingProfile>>={
 industrial:{sky:0xc0d2df,ground:0x38454d,ambient:1.6,key:0xf5e7d5,intensity:1.8},
 'mar-sara':{sky:0xdccbb5,ground:0x5c4633,ambient:1.65,key:0xffe0b6,intensity:1.85},
 char:{sky:0x9caabc,ground:0x332321,ambient:1.55,key:0xffd4b6,intensity:1.55},
 ice:{sky:0xc8ddeb,ground:0x758d9c,ambient:1.25,key:0xffefd9,intensity:1.5},
 frontier:{sky:0xc8d1cf,ground:0x51483e,ambient:1.55,key:0xf9dfb8,intensity:1.8},
};
export const terrainLightingTheme=(terrain:TerrainQuery|undefined):CampaignTheme=>terrain instanceof RadialTerrain?terrain.recipe.theme:'char';
export class SceneLighting {
 readonly ambient=new THREE.HemisphereLight();readonly key=new THREE.DirectionalLight();private theme?:CampaignTheme;
 constructor(scene:THREE.Scene){this.ambient.name='map-hemisphere';this.key.name='map-key';this.key.position.set(-15,25,10);scene.add(this.ambient,this.key,this.key.target);}
 bind(terrain:TerrainQuery|undefined){const theme=terrainLightingTheme(terrain);if(this.theme===theme)return;const p=SCENE_LIGHTING[theme];this.ambient.color.set(p.sky);this.ambient.groundColor.set(p.ground);this.ambient.intensity=p.ambient;this.key.color.set(p.key);this.key.intensity=p.intensity;this.theme=theme;}
 report(){return {theme:this.theme,profile:this.theme?SCENE_LIGHTING[this.theme]:undefined,keyDirection:[-15,25,10],keyLights:1};}
}
