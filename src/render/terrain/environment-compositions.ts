import type {CampaignTheme} from '../../data/campaign-landscape';

/** The three accepted scenery groups per theme, shared by the sample and full-map layout. */
export type SceneryItem=readonly [asset:string,x:number,z:number,width:number,angle?:number];
export const ENVIRONMENT_COMPOSITIONS:Record<CampaignTheme,readonly (readonly SceneryItem[])[]>={
 industrial:[
  [['crate_00',-.25,.2,1.25,0],['crate_01',.5,-.35,.68,.18],['barrels_00',-.55,-.55,.43,0]],
  [['compoundsewers_exhaustpipes_02',0,0,3.3,Math.PI/2],['barrels_01',-1.35,.75,.65,0],['halfstructureplates_01',.8,-1.15,1.1,.4],['crate_02',1.25,.6,.6,0]],
  [['cargotruck_00',0,0,4.8,Math.PI/2],['crate_01',-1.5,1.5,.95,0],['barrels_00',1.4,-1.5,.8,0],['pipescorner_01',1.8,1.05,1.2,.8]],
 ],
 'mar-sara':[
  [['brambles_01',-.2,0,1.2,.2],['rock_00',.55,.4,.55,0],['marsaracactus_00',.3,-.55,.55,0]],
  [['purificationdesert_medium_rock_group_00',0,0,3.5,.3],['marsaracactus_01',1.2,1.2,.7,.3],['brambles_00',-1.2,.9,1.0,1]],
  [['marsaratreedead_02',0,0,2.2,.2],['marsaracactus_01',1.0,.8,.7,0],['brambles_01',-1.15,-.4,1.0,0],['rock_00',.7,-1.2,.8,.2]],
 ],
 char:[
  [['rocklarge_00',0,0,1.75,.4],['rock_00',.65,.45,.6,0]],
  [['redstonerockspiresnobase_02',-.3,0,3.8,.4],['rocklarge_00',1.15,1.15,1.3,0],['rock_01',-1.3,1.1,.85,0]],
  [['vespenegeyser_ex2_low',0,0,3.8,.4],['rocklarge_00',1.25,-1.25,1.6,0],['rock_01',-1.4,1.5,1.1,0]],
 ],
 ice:[
  [['dom_crate_00',-.2,0,1.3,.18],['barrels_00',.55,-.45,.5,.4],['rock_01',-.55,.6,.6,0]],
  [['compoundsewers_exhaustpipes_00',0,0,3.5,Math.PI/2],['dom_crate_01',1.2,1.1,.8,0],['rock_00',-1.2,1.25,1.0,.7],['barrels_00',-1.2,-1.2,.6,0]],
  [['rocklarge_01',-.5,.1,4.1,.2],['rocklarge_07',1.45,1.2,1.8,1.2],['rock_01',.9,-1.7,1.2,0]],
 ],
 frontier:[
  [['crystalslow_00',-.2,0,3.0,.2],['rock_00',1.1,-.7,1.1,0],['mineralcart_01',-1.1,1.0,1.2,.7]],
  [['jarbanminor_cranepart_06',-.5,0,3.6,.4],['mineralcart_01',1.5,1.05,1.1,.2],['dom_crate_01',-1.3,1.5,.8,0],['crystalslow_01',.9,-1.4,1.1,.2]],
  [['jarbanminor_miningbot_broken_00',-.35,0,3.1,.3],['barrels_00',.95,1.0,.6,0],['rock_00',1.1,-.9,.85,0]],
 ],
};
export const COMPOSITION_REFERENCE_RADII:Record<CampaignTheme,readonly number[]>={industrial:[1.35,2.6,3.5],'mar-sara':[1.4,2.7,2.5],char:[1.4,2.8,3.2],ice:[1.35,2.8,3.5],frontier:[2.6,3.5,2.5]};

const additionalModels:Record<CampaignTheme,readonly string[]>={
 industrial:['rock_00','cliffmade13_bbbc_00','halfstructureplates_01','compoundsewers_exhaustpipes_00','supplytanks'],
 'mar-sara':['rock_00','cliffnatural0ex1_bbbc_00','purificationdesert_large_rock_00','redstonerockspiresnobase_01'],
 char:['rock_00','rocklarge_00'],ice:['rock_00','rocklarge_01','rocklarge_07'],frontier:['rock_00','rocklarge_00','crystalslow_00','rocklarge_06'],
};
export const fullEnvironmentModelIds=(theme:CampaignTheme)=>[...new Set([...ENVIRONMENT_COMPOSITIONS[theme].flatMap(items=>items.map(item=>item[0])),...additionalModels[theme]])].map(name=>'model.map.'+name);
