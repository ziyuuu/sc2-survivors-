import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {DOMParser} from '@xmldom/xmldom';
const clock=1.4,lock=JSON.parse(fs.readFileSync('tools/sc2-casc-lock.json','utf8').replace(/^\uFEFF/,''));
const paths={unit:'.cache/sc2-campaign-data/liberty-unitdata.xml',ability:'.cache/sc2-campaign-data/liberty-abildata.xml',effect:'.cache/sc2-campaign-data/liberty-effectdata.xml',train:'.cache/sc2-campaign-data/libertystory-abildata.xml'};
const docs=Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,new DOMParser().parseFromString(fs.readFileSync(p,'utf8'),'application/xml')]));
const find=(doc,tag,id)=>Array.from(doc.getElementsByTagName(tag)).find(n=>n.getAttribute('id')===id);
const direct=(node,tag,index)=>Array.from(node.childNodes).find(n=>n.nodeType===1&&n.nodeName===tag&&(index===undefined||n.getAttribute('index')===index));
const val=(node,tag,index)=>{const n=direct(node,tag,index);if(!n)throw Error('Missing SCI source '+tag);return Number(n.getAttribute('value'));};
const u=find(docs.unit,'CUnit','ScienceVessel'),a=find(docs.ability,'CAbilEffectTarget','NanoRepair'),heal=find(docs.effect,'CEffectCreateHealer','NanoRepair'),train=direct(find(docs.train,'CAbilTrain','StarportTrain'),'InfoArray','Train7');
if(direct(train,'Unit').getAttribute('value')!=='ScienceVessel')throw Error('Invalid SCI training source');
const cost={mineralCost:val(u,'CostResource','Minerals'),gasCost:val(u,'CostResource','Vespene')},productionTime=Number(train.getAttribute('Time'))/clock;
const data={name:'Science Vessel',zh:'科技球',maxHp:val(u,'LifeMax'),armor:val(u,'LifeArmor'),movementSpeed:val(u,'Speed')*clock,attackDamage:0,attacks:0,attackPeriod:1,attackRange:0,targetType:'none',splash:[],bonusDamage:[],attributes:['Light','Mechanical'],productionTime,...cost,unitRadius:val(u,'Radius'),flying:true,damagePoint:0,maxShields:0,shieldArmor:0,shieldRegenPerSecond:0,shieldRegenDelay:0,hpRegenPerSecond:0,hpRegenDelay:0,maxEnergy:val(u,'EnergyMax'),startEnergy:val(u,'EnergyStart'),energyRegenPerSecond:val(u,'EnergyRegenRate')*clock,creepSpeedMultiplier:1,targetPlanes:['air'],movementClass:'flying',sourceUnitId:'ScienceVessel',primaryWeapon:null};
const source={profile:'Liberty campaign + LibertyStory production; no StarCoop modifiers',version:lock.version,buildConfig:lock.buildConfig,clock:'Normal durations / 1.4; rates * 1.4',files:Object.fromEntries(Object.entries(paths).map(([k,p])=>[k,{file:p,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}]))};
let output="/** Generated from an explicitly separate original campaign profile, not the 5.0.15 multiplayer table. */\nimport type {ExpansionUnitData,SourceProductionRecipe} from './expansion-units';\n";
output+='export const SCIENCE_VESSEL_SOURCE='+JSON.stringify(source,null,2)+' as const;\n';
output+='export const CAMPAIGN_SCIENCE_VESSEL:ExpansionUnitData='+JSON.stringify(data,null,2)+';\n';
output+='export const CAMPAIGN_SCIENCE_VESSEL_RECIPE:SourceProductionRecipe='+JSON.stringify({abilityId:'StarportTrain',entryId:'Train7',baseFamily:null,...cost,productionTime,baseSeconds:productionTime,morphSeconds:0,batchBodyCount:1},null,2)+';\n';
output+='export const SCIENCE_VESSEL_REPAIR='+JSON.stringify({sourceAbilityId:'NanoRepair',sourceEffectId:'NanoRepair',range:val(a,'Range'),hpPerSecond:val(heal,'RechargeVitalRate')*clock,energyPerHp:val(heal,'DrainVitalCostFactor')},null,2)+' as const;\n';
output+=`/** USER_CONFIRMED adaptation: only repair is inherited. Biology is repaired at 1/3 output, with energy charged per actual restored HP; passive Detector11 and Irradiate are excluded. */
export const SCIENCE_VESSEL_ADAPTATION={mechanicalRecoveryMultiplier:1,biologicalRecoveryMultiplier:1/3,excludeSelf:true,excludeStructures:true,passiveDetector:false,irradiate:false} as const;
`;
const dest='src/data/campaign-science-vessel.ts';if(process.argv.includes('--check')){if(fs.readFileSync(dest,'utf8')!==output)throw Error('Campaign SCI source differs');console.log('Campaign SCI source matches');}else{fs.writeFileSync(dest,output);console.log('Generated separate campaign SCI profile '+lock.version);}
