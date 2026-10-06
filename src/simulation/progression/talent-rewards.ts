import type {Difficulty} from '../../data/stages';
/** Permanent rewards use the same current campaign and endless rules for all races. */
export function talentPointsForStage(difficulty:Difficulty,stage:number){return difficulty==='hell'?1:stage%3===0?(difficulty==='hard'?2:1):0;}
export function talentPointsForEndlessMinute(difficulty:Difficulty){return difficulty==='hard'||difficulty==='hell'?2:1;}
