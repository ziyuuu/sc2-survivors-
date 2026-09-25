import type {FamilyId,Race} from './races';
export type ProductionLineId='barracks'|'factory'|'starport'|'zerg.basic'|'zerg.evolution'|'zerg.air'|'gateway'|'robotics'|'stargate';
export interface DevelopmentDefinition {id:string;name:string;race:Race;kind:'facility'|'technology'|'research';minerals:number;gas:number;requires:string[];afterStage:number;families:FamilyId[];line?:ProductionLineId;maxLevel:number;}
export const PRODUCTION_LINES:Record<ProductionLineId,{race:Race;name:string;families:FamilyId[]}>= {
 barracks:{race:'terran',name:'兵营',families:['marine','marauder','reaper']},factory:{race:'terran',name:'重工厂',families:['hellion','tank','thor']},starport:{race:'terran',name:'星港',families:['medivac','viking','banshee','science_vessel']},
 'zerg.basic':{race:'zerg',name:'基础虫群',families:['zergling','baneling','roach','queen']},'zerg.evolution':{race:'zerg',name:'地面进化',families:['ravager','hydralisk','lurker','ultralisk']},'zerg.air':{race:'zerg',name:'飞行虫群',families:['mutalisk','corruptor']},
 gateway:{race:'protoss',name:'传送门',families:['zealot','adept','stalker','sentry','high_templar']},robotics:{race:'protoss',name:'机械台',families:['immortal','colossus']},stargate:{race:'protoss',name:'星门',families:['phoenix','void_ray','carrier']},
};
export const FAMILY_REQUIREMENTS:Record<FamilyId,string[]>={
 marine:['barracks'],reaper:['barracks'],marauder:['barracks_lab'],hellion:['factory'],tank:['factory_lab'],thor:['factory_lab','armory'],medivac:['starport'],viking:['starport'],banshee:['starport_lab'],science_vessel:['science_facility'],
 zergling:['pool'],baneling:['baneling_nest'],roach:['roach_warren'],queen:['pool'],ravager:['roach_warren','lair'],hydralisk:['hydralisk_den'],lurker:['lurker_den'],ultralisk:['ultralisk_cavern'],mutalisk:['spire'],corruptor:['spire'],
 zealot:['gateway'],adept:['cybernetics_core'],stalker:['cybernetics_core'],sentry:['cybernetics_core'],high_templar:['templar_archives'],immortal:['robotics'],colossus:['robotics_bay'],phoenix:['stargate'],void_ray:['stargate'],carrier:['fleet_beacon'],
};
export const HEAVY_FAMILIES:FamilyId[]=['thor','ultralisk','carrier'];
export const DEVELOPMENT:DevelopmentDefinition[]=[];
function add(race:Race,id:string,name:string,kind:DevelopmentDefinition['kind'],minerals:number,gas:number,requires:string[]=[],line?:ProductionLineId,afterStage=0){DEVELOPMENT.push({race,id,name,kind,minerals,gas,requires,line,afterStage,maxLevel:kind==='facility'?5:1,families:Object.entries(FAMILY_REQUIREMENTS).filter(([,requirements])=>requirements.includes(id)).map(([id])=>id as FamilyId)});}
add('terran','barracks','兵营','facility',150,0,[],'barracks');
add('terran','factory','重工厂','facility',150,100,['barracks'],'factory');
add('terran','starport','星港','facility',150,100,['factory'],'starport');
add('terran','barracks_lab','兵营实验室','technology',50,25,['barracks']);
add('terran','factory_lab','工厂实验室','technology',50,25,['factory']);
add('terran','starport_lab','星港实验室','technology',50,25,['starport']);
add('terran','engineering_bay','工程站','technology',100,50,['barracks']);
add('terran','armory','军械库','technology',150,100,['factory']);
add('terran','science_facility','科学设施','technology',200,150,['starport']);
add('zerg','hatchery','孵化场','facility',150,0,[],'zerg.basic');
add('zerg','pool','血池','technology',100,50,['hatchery']);
add('zerg','roach_warren','蟑螂温室','technology',100,50,['pool']);
add('zerg','baneling_nest','爆虫巢','technology',100,50,['pool']);
add('zerg','evolution_chamber','进化腔','technology',100,50,['pool']);
add('zerg','lair','升级巢穴','technology',150,100,['pool']);
add('zerg','hydralisk_den','刺蛇巢','technology',150,100,['lair']);
add('zerg','lurker_den','潜伏者巢','technology',150,100,['hydralisk_den']);
add('zerg','spire','尖塔','technology',150,100,['lair']);
add('zerg','hive','升级蜂巢','technology',200,150,['lair']);
add('zerg','ultralisk_cavern','雷兽窟','technology',200,150,['hive']);
add('protoss','gateway','传送门','facility',150,0,[],'gateway');
add('protoss','cybernetics_core','控制核心','technology',100,50,['gateway']);
add('protoss','forge','锻炉','technology',100,50,['gateway']);
add('protoss','robotics','机械台','facility',150,100,['cybernetics_core'],'robotics');
add('protoss','stargate','星门','facility',150,100,['cybernetics_core'],'stargate');
add('protoss','robotics_bay','机械研究设施','technology',150,100,['robotics']);
add('protoss','twilight_council','暮光议会','technology',150,100,['cybernetics_core']);
add('protoss','templar_archives','圣堂文库','technology',150,100,['twilight_council']);
add('protoss','fleet_beacon','舰队航标','technology',200,150,['stargate']);
for(const [race,id,name,req] of [
 ['terran','stim','兴奋剂','barracks_lab'],['terran','shield','战斗盾','barracks_lab'],['terran','infernal','燃烧强化','factory_lab'],['terran','cloak','隐形装置','starport_lab'],['terran','support_efficiency','医修效率','science_facility'],
 ['zerg','ling_speed','代谢加速','pool'],['zerg','bane_speed','离心钩','baneling_nest'],['zerg','roach_speed','胶质重组','roach_warren'],['zerg','hydra_range','沟槽脊刺','hydralisk_den'],['zerg','lurker_deploy','适应爪','lurker_den'],
 ['protoss','charge','冲锋','twilight_council'],['protoss','blink','闪烁','twilight_council'],['protoss','glaives','共鸣战刃','twilight_council'],['protoss','storm','灵能风暴','templar_archives'],['protoss','colossus_range','热能射线','robotics_bay'],
] as const)add(race,id,name,'research',125,75,[req]);
for(const [race,id,name,req,families] of [
 ['terran','infantry','生化武器','engineering_bay',['marine','marauder','reaper']],['terran','infantry_armor','生化防护','engineering_bay',['marine','marauder','reaper']],
 ['terran','vehicle','机械武器','armory',['hellion','tank','thor']],['terran','vehicle_armor','机械装甲','armory',['hellion','tank','thor']],['terran','air_weapon','航空武器','armory',['viking','banshee']],['terran','air_armor','航空装甲','armory',['viking','banshee','medivac','science_vessel']],
 ['zerg','melee','近战攻击','evolution_chamber',['zergling','baneling','ultralisk']],['zerg','missile','远程攻击','evolution_chamber',['roach','ravager','hydralisk','lurker','queen']],['zerg','carapace','地面甲壳','evolution_chamber',['zergling','baneling','roach','ravager','hydralisk','lurker','queen','ultralisk']],['zerg','flyer_weapon','飞行攻击','spire',['mutalisk','corruptor']],['zerg','flyer_armor','飞行甲壳','spire',['mutalisk','corruptor']],
 ['protoss','ground_weapon','地面武器','forge',['zealot','adept','stalker','sentry','immortal','colossus','high_templar']],['protoss','ground_armor','地面护甲','forge',['zealot','adept','stalker','sentry','immortal','colossus','high_templar']],['protoss','shields','护盾','forge',['zealot','adept','stalker','sentry','immortal','colossus','high_templar','phoenix','void_ray','carrier']],['protoss','air_weapon','航空武器','cybernetics_core',['phoenix','void_ray','carrier']],['protoss','air_armor','航空装甲','cybernetics_core',['phoenix','void_ray','carrier']],
] as const){add(race,`${race}.${id}`,name,'research',125,50,[req]);const entry=DEVELOPMENT.at(-1)!;entry.maxLevel=3;entry.families=[...families];}
export function familyLine(family:FamilyId){return (Object.entries(PRODUCTION_LINES).find(([,line])=>line.families.includes(family))!)[0] as ProductionLineId;}
export function developmentPrice(d:DevelopmentDefinition,level:number){return d.maxLevel===3?{minerals:125+75*level,gas:50+50*level}:{minerals:d.minerals,gas:d.gas};}
