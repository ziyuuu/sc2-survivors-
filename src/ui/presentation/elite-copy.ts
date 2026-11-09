import {gameText} from './game-copy';

export function eliteSummary(id:string,description:string){return id==='reaper.3'?'吸收其他死神，持续强化生命、伤害、攻速与移速；死神仅留孤星，不继承技能。':gameText(description);}
