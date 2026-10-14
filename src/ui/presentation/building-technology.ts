// Shared icon presentation for the review's technology and build-tree tabs.
import {assetUrl} from '../../assets/manifest';
import {LINE_SKILLS,PRODUCTION_LINES,type ProductionLineId} from '../../data/expedition-buildings';
import type {FamilyId,Race} from '../../data/races';
import {esc,glyph,image} from './reference-primitives';
import {SC2_UNITS} from '../../data/sc2-units';
const familyName=(f:FamilyId)=>SC2_UNITS[f].zh;

export interface TechnologyView {
 race:Race;stage:number;unlocked:ReadonlySet<FamilyId>;completed:ReadonlySet<string>;
 hasFacility:(line:ProductionLineId)=>boolean;
 canResearch?:(id:string)=>boolean;
}
const SKILL_ICONS:Record<string,string>={stim:'tech.stim',shield:'tech.shield',infernal:'tech.infernal',support_efficiency:'tech.heal'};
export function facilityIcon(id:string,race:Race,label:string){
 return assetUrl('building.'+id)?image('building.'+id,label):`<span class="wb-facility-icon" role="img" aria-label="${esc(label)}" style="background-image:url('${assetUrl('ui.intermission.objects-'+race)}')"></span>`;
}
const state=(text:string,ready=false,complete=false)=>`<span class="wb-tech-state ${ready?'ready':''}">${glyph(complete?'check':ready?'info':'hex')}${esc(text)}</span>`;
export const itemHeading=(name:string,status:string)=>`<div class="wb-item-heading"><strong>${esc(name)}</strong>${status}</div>`;
function skillCard([id,name,family]:readonly [string,string,FamilyId],view:TechnologyView){
 const complete=view.completed.has(id),ready=complete||(view.canResearch?.(id)??view.unlocked.has(family)),icon=SKILL_ICONS[id];
 return `<article class="wb-skill-card ${ready?'available':''}" data-skill="${id}"><div class="wb-skill-icon wb-ui-icon">${image(icon??'unit.'+family,name)}${icon?'':`<span class="wb-skill-mark">${glyph('gear')}</span>`}</div><div class="wb-skill-body">${itemHeading(name,state(complete?'已研究':ready?'可研究':'未解锁',ready,complete))}<div class="wb-tech-requirement"><span class="wb-requirement-icon wb-ui-icon">${image('unit.'+family)}</span><span>需要${esc(familyName(family))}</span></div></div></article>`;
}
function equipmentIcon(line:ProductionLineId,kind:'weapon'|'defense',race:Race){
 const lines=Object.entries(PRODUCTION_LINES).filter(([,d])=>d.race===race).map(([id])=>id),row=lines.indexOf(line);
 return `<span class="wb-equipment-icon" role="img" aria-label="${PRODUCTION_LINES[line].name}${kind==='weapon'?'武器':'防护'}" style="background-image:url('${assetUrl('ui.intermission.line-equipment-'+race)}');background-position:${kind==='weapon'?0:100}% ${row*50}%"></span>`;
}
function researchTrack(line:ProductionLineId,kind:'weapon'|'defense',view:TechnologyView){
 const system=view.completed.has('system.'+line),name=kind==='weapon'?'武器':'防护',id=`research.${line}.${kind}`;
 return `<ol class="wb-research-track" aria-label="${name}研究路线">${[1,2,3].map(level=>{
  const complete=view.completed.has(id+'.'+level),stage=level===2?6:level===3?12:0,previous=level===1||view.completed.has(id+'.'+(level-1)),ready=complete||system&&previous&&view.stage>=stage&&(view.canResearch?.(id)??true);
  const label=complete?'已研究':!system?'需要攻防系统':!previous?'需要'+(level-1)+'级':view.stage<stage?'阶段未到':'可研究';
  return `<li class="wb-research-node ${ready?'available':''}" data-research="${id}.${level}" data-required-stage="${stage}" title="${name}${level}级${stage?' · 发展阶段至少'+stage:''} · ${label}"><div class="wb-level-art wb-ui-icon">${equipmentIcon(line,kind,view.race)}</div>${itemHeading(`${name} ${level}级`,state(complete?'已研究':ready?'可研究':'未解锁',ready,complete))}</li>`;
 }).join('')}</ol>`;
}
export function lineTechnology(line:ProductionLineId,view:TechnologyView){
 const skills=LINE_SKILLS[line]??[],system=view.completed.has('system.'+line),owns=view.hasFacility(line);
 return `<div class="wb-line-technology"><h3>专属科技</h3>${skills.length?`<div class="wb-skill-grid">${skills.map(s=>skillCard(s,view)).join('')}</div>`:`<div class="wb-tech-empty">${glyph('gear')}<span>暂无专属科技</span></div>`}<h3>攻防研究</h3><div class="wb-research-grid"><article class="wb-system-card" data-system="${line}" title="${PRODUCTION_LINES[line].name}设施"><div class="wb-system-icon wb-ui-icon">${glyph('gear')}</div><div class="wb-system-body">${itemHeading('攻防系统',state(system?'已研究':owns?'未研究':'未解锁',system||owns,system))}</div><span class="wb-system-branch" aria-hidden="true">${glyph('next')}</span></article><div class="wb-research-paths">${researchTrack(line,'weapon',view)}${researchTrack(line,'defense',view)}</div></div></div>`;
}
