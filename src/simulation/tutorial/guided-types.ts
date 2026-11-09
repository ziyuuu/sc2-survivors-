import {validateItem} from '../starship/inventory';
import {guidedScript} from '../../data/tutorial-script';
import {validateMapRecipe} from '../../data/campaign-map';
import type {EquipmentItem} from '../starship/types';
import type {PlacementDraft} from '../building/rules';

export interface GuidedCommand {id:string;step:string;target:string;done:boolean}
export interface GuidedBoss {id:number;born:number;point:{x:number;z:number};items:EquipmentItem[];receipt?:string;card?:number}
export interface GuidedFeedback {step:string;at:number;point?:{x:number;z:number};minerals?:number;gas?:number}
/** Versioned inside the existing account/run transaction; no separate storage key. */
export interface GuidedTutorial {
 version:2|3;step:string;phase:'waiting'|'running';serial:number;commands:GuidedCommand[];
 points:Record<string,{x:number;z:number}>;bosses:Record<string,GuidedBoss>;
 drone?:number;resources:number[];items:Record<string,string>;
 jobs:number[];freeJobs?:Record<string,number>;permit?:{producer:string;used:boolean};
 originalProduction:{id:string;enabled:boolean;outputs?:import('../../data/races').FamilyId[];families:Record<string,boolean>}[];
 editedProduction:string[];draft?:PlacementDraft;producer?:string;
 wallets:{step:string;minerals:number;gas:number}[];
 feedback?:GuidedFeedback;
 skipRestored?:boolean;worker?:number;ling?:number;initialWorkers?:number;paidAt?:number;normalMap?:import('../../data/campaign-map').CampaignMapRecipe;
}
export interface GuidedTail {version:2|3;run:string;step:'flagship'|'module'|'install';module:string;serial:number;commands:GuidedCommand[];feedback?:GuidedFeedback}

export function validateGuided(g:GuidedTutorial|undefined){
 if(g===undefined)return;
 if(![2,3].includes(g.version)||!guidedScript('protoss',g.version).some(s=>s.id===g.step)||!['waiting','running'].includes(g.phase)||!Number.isSafeInteger(g.serial)||g.serial<0||!Array.isArray(g.commands)||!Array.isArray(g.resources)||!Array.isArray(g.jobs)||!Array.isArray(g.wallets)||!Array.isArray(g.originalProduction)||!Array.isArray(g.editedProduction)||!g.points||!g.bosses||!g.items)throw Error('逐步教学状态无效');
 validateCommands(g.commands);
 validateFeedback(g.feedback);if(g.feedback&&(g.feedback.step!==g.step||g.phase!=='running'))throw Error('教学反馈步骤无效');
 for(const id of [g.worker,g.ling])if(id!==undefined&&(!Number.isSafeInteger(id)||id<0))throw Error('教学单位身份无效');
 for(const n of [g.initialWorkers,g.paidAt])if(n!==undefined&&(!Number.isFinite(n)||n<0))throw Error('教学进度参数无效');
 if(g.normalMap){validateMapRecipe(g.normalMap);if(g.normalMap.lesson)throw Error('教学返回地图无效');}
 for(const p of Object.values(g.points))if(!p||![p.x,p.z].every(Number.isFinite))throw Error('逐步教学目标无效');
 for(const b of Object.values(g.bosses))if(!Number.isSafeInteger(b.id)||!Number.isFinite(b.born)||!Array.isArray(b.items)||b.items.some(i=>!validateItem(i)||i.pollution!=='none')||new Set(b.items.map(i=>i.id)).size!==b.items.length)throw Error('逐步教学首领无效');
 if(new Set(g.resources).size!==g.resources.length||g.resources.some(id=>!Number.isSafeInteger(id))||g.jobs.some(id=>!Number.isSafeInteger(id)))throw Error('逐步教学回执无效');
 for(const entry of g.wallets)if(!entry.step||![entry.minerals,entry.gas].every(Number.isFinite))throw Error('逐步教学账本无效');
}
function validateCommands(commands:GuidedCommand[]){if(new Set(commands.map(c=>c.id)).size!==commands.length||commands.some(c=>!c.id||!c.step||!c.target||typeof c.done!=='boolean'))throw Error('逐步教学命令无效');}
function validateFeedback(f:GuidedFeedback|undefined){if(f===undefined)return;if(!f.step||!Number.isFinite(f.at)||f.at<0||f.point&&![f.point.x,f.point.z].every(Number.isFinite)||[f.minerals,f.gas].some(n=>n!==undefined&&!Number.isFinite(n)))throw Error('教学反馈无效');}
export function validateGuidedTail(t:GuidedTail|undefined){if(t===undefined)return;if(![2,3].includes(t.version)||!t.run||!t.module||!['flagship','module','install'].includes(t.step)||!Number.isSafeInteger(t.serial)||!Array.isArray(t.commands))throw Error('旗舰教学状态无效');validateCommands(t.commands);validateFeedback(t.feedback);if(t.feedback&&t.step!=='install')throw Error('旗舰反馈步骤无效');}
