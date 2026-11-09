import type {CampaignMapRecipe} from '../../data/campaign-map';
import {validateMapRecipe} from '../../data/campaign-map';
import type {Difficulty} from '../../data/stages';
import type {Race} from '../../data/races';
import type {EquipmentItem} from '../starship/types';
import {validateItem} from '../starship/inventory';
import {validateGuided,validateGuidedTail,type GuidedTutorial,type GuidedTail} from './guided-types';
export type TutorialStatus='eligible'|'invited'|'active'|'skipped'|'completed'|'closed';
/** Account intent wins over a preceding combat checkpoint. Missing means existing player. */
export interface TutorialDeparture {race:Race;difficulty:Difficulty;preset:0|1|2;hero:string|null;map?:CampaignMapRecipe;accepted:boolean}
export interface TutorialAccount {status:TutorialStatus;run?:string;race?:Race;module?:string;version?:2|3;departure?:TutorialDeparture;tail?:GuidedTail}
export interface TutorialRun {
 run:string;origin:{x:number;z:number};goal:{x:number;z:number};moved:boolean;
 drone?:{id:number;stage:number;pickups:number[];collected:number[]};resources:boolean;
 rescued:boolean;operations:boolean;development:boolean;supply:boolean;
 firstItem?:string;attribute?:string;attributeEquipped:boolean;module?:string;
 boss?:{receipt:string;enemy:number;born:number;items:EquipmentItem[]};
 guided?:GuidedTutorial;
}
export function validateTutorialAccount(t:TutorialAccount|undefined){
 if(t===undefined)return;
 if(!t||!['eligible','invited','active','skipped','completed','closed'].includes(t.status)||t.run!==undefined&&(typeof t.run!=='string'||!t.run)||t.race!==undefined&&!['terran','zerg','protoss'].includes(t.race)||t.module!==undefined&&typeof t.module!=='string'||['invited','active'].includes(t.status)&&(!t.run||!t.race))throw Error('教学账户状态无效');
 if(t.version!==undefined&&![2,3].includes(t.version))throw Error('教学版本无效');validateGuidedTail(t.tail);if(t.departure&&(!['terran','zerg','protoss'].includes(t.departure.race)||!['easy','normal','hard','hell'].includes(t.departure.difficulty)||![0,1,2].includes(t.departure.preset)||typeof t.departure.accepted!=='boolean'))throw Error('教学出发配置无效');
 if(t.departure){if(t.version!==3||!['invited','active'].includes(t.status)||t.departure.hero!==null&&typeof t.departure.hero!=='string'||t.departure.accepted!==(t.status==='active'))throw Error('教学出发意图无效');if(t.departure.map){validateMapRecipe(t.departure.map);if(t.departure.map.lesson)throw Error('正式地图无效');}}
}
export function validateTutorialRun(t:TutorialRun|undefined,run:string|null){
 if(t===undefined)return;
 if(!t||t.run!==run||![t.origin?.x,t.origin?.z,t.goal?.x,t.goal?.z].every(Number.isFinite)||!['moved','resources','rescued','operations','development','supply','attributeEquipped'].every(k=>typeof t[k as keyof TutorialRun]==='boolean'))throw Error('教学出征状态无效');
 for(const id of [t.firstItem,t.attribute,t.module])if(id!==undefined&&typeof id!=='string')throw Error('教学物品身份无效');
 if(t.drone&&(!Number.isSafeInteger(t.drone.id)||!Number.isInteger(t.drone.stage)||![t.drone.pickups,t.drone.collected].every(a=>Array.isArray(a)&&new Set(a).size===a.length&&a.every(Number.isSafeInteger))||t.drone.collected.some(id=>!t.drone!.pickups.includes(id))))throw Error('教学工蜂回执无效');
 if(t.boss&&(!t.boss.receipt||!Number.isSafeInteger(t.boss.enemy)||!Number.isFinite(t.boss.born)||![2,3].includes(t.boss.items?.length)||new Set(t.boss.items.map(i=>i.id)).size!==t.boss.items.length||t.boss.items.some(i=>!validateItem(i)||i.pollution!=='none')||t.boss.items[0].template!=='attribute.1'||t.boss.items[1].template!=='module.logistics.1'))throw Error('教学首领计划无效');
 validateGuided(t.guided);
}
