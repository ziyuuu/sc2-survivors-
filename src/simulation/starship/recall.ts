import {equipmentPresentation} from './presentation';
import type {World} from '../world';
import type {Entity,Point} from '../types';
import {equipmentValue} from './modules';
import {permanentEquipmentBody} from './eligibility';
import {equipmentRosterMember} from './members';
import {createEquipmentProjections} from './projections';
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
function eligible(w:World,u:Entity){return permanentEquipmentBody(w,u)&&equipmentRosterMember(w,u)&&u.mode!=='siege'&&u.nativeMode!=='lurker_burrowed'&&u.modeTimer<=0&&(u.nativeModeUntil??0)<=w.time&&(u.stoppedUntil??0)<=w.time&&!w.heroCasts.some(c=>c.source===u.id&&c.at>w.time);}
export function tickEquipmentRecall(w:World){const threshold=equipmentValue(w,'auto_recall');if(!threshold)return;const candidates:Entity[]=[];
 for(const u of w.allies()){const key='recall-lag:'+u.id;if(!eligible(w,u)||distance(w.anchor,u)<=threshold){w.starship.numbers.delete(key);continue;}const since=w.starship.numbers.get(key);if(since===undefined)w.starship.numbers.set(key,w.time);else if(w.time-since>=equipmentValue(w,'auto_recall',1))candidates.push(u);}
 if(!candidates.length||w.time<(w.starship.numbers.get('recall-ready')??0))return;
 const positions:Point[]=[],limit=equipmentValue(w,'auto_recall',2);for(const u of candidates){let chosen:Point|null=null;for(let ring=.5;ring<=limit&&!chosen;ring+=.5)for(let i=0;i<24&&!chosen;i++){const a=i*Math.PI/12,point={x:w.anchor.x+Math.sin(a)*ring,z:w.anchor.z+Math.cos(a)*ring},p=w.freePosition(u.unitType,point,0,.1);if(p&&distance(p,w.anchor)<=limit&&positions.every((q,j)=>candidates[j].flying!==u.flying||distance(p,q)>candidates[j].unitRadius+u.unitRadius+.12))chosen=p;}if(!chosen)return;positions.push(chosen);}
 const originals=candidates.map(u=>({x:u.x,z:u.z}));for(let i=0;i<candidates.length;i++){const u=candidates[i],point=positions[i];equipmentPresentation(w,'recall-from',u);w.visual('squad-transfer',u,point);u.x=point.x;u.z=point.z;u.prev={...point};u.velocity={x:0,z:0};equipmentPresentation(w,'recall-to',u);w.starship.numbers.delete('recall-lag:'+u.id);}
 if(equipmentValue(w,'recall_phantom'))for(let i=0;i<candidates.length;i++){const u=candidates[i];if(!u.heroId)createEquipmentProjections(w,u,1,'recall',equipmentValue(w,'recall_phantom'),equipmentValue(w,'recall_phantom',1),equipmentValue(w,'recall_phantom',1),0,originals[i]);}
 w.starship.numbers.set('recall-ready',w.time+equipmentValue(w,'auto_recall',3));w.hash.invalidatePlanes();w.changed();
}
