import type {CampaignTheme} from '../../data/campaign-landscape';

export interface GroundLayer {source:string;meters:number;roughness:number;normal:number;metalness:number;tint:readonly [number,number,number];macro:number}
export interface MapVisualFeatures {ground:boolean;bases:boolean;atmosphere:boolean}
export interface MapVisualProfile {
 layers:readonly GroundLayer[];baseLayer:number;baseStrength:number;coating:string;coatingStrength:number;
 atmosphere:{source:string;count:number;size:number;opacity:number;color:number;rise:number};features:MapVisualFeatures;
}
const layer=(source:string,meters:number,roughness:number,normal:number,tint:readonly [number,number,number]=[1,1,1],metalness=0,macro=.22):GroundLayer=>({source,meters,roughness,normal,tint,metalness,macro});
// PBR and coverage values are display adaptations, not inferred SC2 source parameters.
// Ground alpha is deliberately unused: no undocumented height-channel interpretation.
export const MAP_VISUAL_PROFILES:Record<CampaignTheme,MapVisualProfile>={
 industrial:{layers:[layer('dark-rock',7.8,.95,.54,[.96,1,1.02]),layer('panels',6,.70,.62,[.91,.98,1],.18,0),layer('cracked',4.8,.97,.35,[.75,.85,.95])],baseLayer:2,baseStrength:.48,coating:'cracked',coatingStrength:.17,atmosphere:{source:'smoke',count:24,size:1.9,opacity:.10,color:0xb1b4b3,rise:.22},features:{ground:true,bases:true,atmosphere:true}},
 'mar-sara':{layers:[layer('sand',9,.94,.55,[.36,.24,.13]),layer('cracked',8,.96,.68,[.95,.8,.66]),layer('rock',10,.91,.72,[.96,.92,.89])],baseLayer:2,baseStrength:.53,coating:'sand',coatingStrength:.29,atmosphere:{source:'dust',count:32,size:2.3,opacity:.085,color:0xc2aa84,rise:.035},features:{ground:true,bases:true,atmosphere:true}},
 char:{layers:[layer('char-soil',10,.96,.68,[1.55,1.55,1.6],0,.3),layer('char-rock',12,.89,.75,[1.2,1.22,1.25],0,.58),layer('char-cracked',9,.94,.72,[1.55,1.55,1.6],0,.35)],baseLayer:0,baseStrength:.6,coating:'char-soil',coatingStrength:.16,atmosphere:{source:'ash',count:42,size:.35,opacity:.18,color:0xb4ada5,rise:.11},features:{ground:true,bases:true,atmosphere:true}},
 ice:{layers:[layer('snow',9,.95,.44,[.98,1,1]),layer('ice',10,.38,.6,[.94,.98,1]),layer('ice-rock',9,.89,.7,[.96,.98,1]),layer('plates',6,.71,.48,[.9,.96,1],.12,0)],baseLayer:0,baseStrength:.72,coating:'snow',coatingStrength:.88,atmosphere:{source:'snow-fleck',count:60,size:.46,opacity:.36,color:0xeaf5ff,rise:-.35},features:{ground:true,bases:true,atmosphere:true}},
 frontier:{layers:[layer('dark-rock',9,.94,.61,[1.05,1,.91]),layer('cracked',8,.94,.53,[.94,.91,.86]),layer('plates',6,.73,.58,[.86,.9,.9],.16,0)],baseLayer:1,baseStrength:.63,coating:'cracked',coatingStrength:.26,atmosphere:{source:'dust',count:28,size:1.7,opacity:.075,color:0xb7ac92,rise:.055},features:{ground:true,bases:true,atmosphere:true}},
};
export function environmentAssetIds(theme:CampaignTheme){const p=MAP_VISUAL_PROFILES[theme];return [...new Set([...p.layers.flatMap(l=>[l.source,l.source+'-normal']),p.coating,p.atmosphere.source])].map(id=>'terrain.visual.'+id);}
