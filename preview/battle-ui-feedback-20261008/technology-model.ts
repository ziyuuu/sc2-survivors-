import type {World} from '../../src/simulation/world';
import {PRODUCTION_LINES,LINE_SKILLS,familyUnlock,lineSystem,type ProductionLineId} from '../../src/data/expedition-buildings';
import {SC2_UNITS} from '../../src/data/sc2-units';

/** Read-only projection of current unlock flags; availability and purchases stay in World. */
export function lineTechnology(w:World,line:ProductionLineId){
 const tech=w.expedition.tech;
 return {
  families:PRODUCTION_LINES[line].families.map(family=>({id:familyUnlock(family),family,name:SC2_UNITS[family].zh,image:'unit.'+family,unlocked:!!tech[familyUnlock(family)]})),
  skills:(LINE_SKILLS[line]??[]).map(([id,name,family])=>({id,name,family,image:'unit.'+family,unlocked:!!tech[id]})),
  system:{id:lineSystem(line),name:PRODUCTION_LINES[line].name+'攻防系统',unlocked:!!tech[lineSystem(line)]},
 };
}
