import {grantMechanicalPolarization} from './doomsday-growth';
import {acquireDoomsdayBlueprint,doomsdayModuleAvailable,DOOMSDAY_MODULES} from './doomsday-refits';
import {DOOMSDAY_CARDS,DOOMSDAY_CARD_BY_ID,type DoomsdayId} from '../../data/terran-doomsday';
import {availableFamily} from '../expedition-production';
import {doomsdayPurchaseLegal,recordDoomsdayPurchase,buildNodeLegal} from '../progression/build-progress';
import {formalDoomsdayMember,mechanicalMember,mechanicalRank,reconcileMechanicalSeats} from './doomsday-roster';
import {doomsdayRank,newDoomsdayState} from './doomsday-state';
import type {World} from '../world';
import type {Entity} from '../types';

/** A card enters the real shelf only after its executor and regression are connected. */
const implemented=new Set<DoomsdayId>(DOOMSDAY_CARDS.map(c=>c.id));
export function doomsdayGun(u:Entity,w?:World){return (formalDoomsdayMember(u)||!!u.doomsday?.heroArmor)&&(u.unitType==='ghost'&&!!w&&mechanicalMember(w,u)||u.unitType==='battlecruiser'||u.unitType==='liberator'&&u.nativeMode==='liberator_ag'||['marine','reaper'].includes(u.unitType)||u.unitType==='thor'&&!['JavelinMissileLaunchers','ThorHighImpactPayload'].includes(u.activeWeapon??'')||u.unitType==='viking'&&u.nativeMode==='viking_assault');}
export function doomsdayGunner(u:Entity,w?:World){return (formalDoomsdayMember(u)||!!u.doomsday?.heroArmor)&&(u.unitType==='ghost'&&!!w&&mechanicalMember(w,u)||['marine','reaper','marauder','tank','thor','viking','banshee','widow_mine','cyclone','liberator','battlecruiser'].includes(u.unitType));}
export function doomsdayRuntimeReady(w:World,id:DoomsdayId){
 return w.expedition.race==='terran'&&implemented.has(id);
}
export function doomsdayOfferLegal(w:World,id:DoomsdayId){
 if(!doomsdayRuntimeReady(w,id)||!doomsdayPurchaseLegal(w.expedition,id))return false;
 if((DOOMSDAY_MODULES as readonly string[]).includes(id)&&!doomsdayModuleAvailable(w,id))return false;
 const members=w.allies().filter(formalDoomsdayMember),family=(f:Entity['unitType'])=>members.some(u=>u.unitType===f)||availableFamily(w,f as Parameters<typeof availableFamily>[1]);
 if(id==='M-W05')return members.some(u=>doomsdayGunner(u,w))||['marine','reaper','marauder','tank','thor','viking','banshee','widow_mine','cyclone','liberator','battlecruiser'].some(f=>family(f as Entity['unitType']));
 if(id==='M-P03')return members.some(u=>u.attributes.includes('Biological'))||['marine','reaper','marauder','ghost'].some(f=>family(f as Entity['unitType']));
 if(['M-W01','M-G01','M-W08'].includes(id))return members.some(u=>doomsdayGun(u,w))||family('battlecruiser')||family('liberator')||family('marine')||family('reaper')||family('viking')||family('thor');
 if(['M-W02','M-G06'].includes(id))return family('hellion');
 if(['M-W04'].includes(id))return family('science_vessel');
 if(['M-W07','M-P05'].includes(id))return family('tank');
 if(['M-W09'].includes(id))return family('medivac')||family('science_vessel');
 if(id==='M-B07')return family('viking');if(id==='M-P06')return family('banshee');
 return members.some(u=>mechanicalMember(w,u))||['hellion','tank','thor','viking','banshee','medivac','science_vessel','widow_mine','cyclone','raven','liberator','battlecruiser'].some(f=>family(f as Entity['unitType']));
}
export function applyDoomsdayPurchase(w:World,id:DoomsdayId,offerId:string){
 const previousMain=w.expedition.build?.main;
 const previousRanks=id==='M-P03'?{...w.expedition.doomsday?.ranks}:undefined;
 if(!doomsdayOfferLegal(w,id)||!recordDoomsdayPurchase(w.expedition,id,offerId))return false;
 const locked=!previousMain&&w.expedition.build?.main==='doomsday';
 reconcileMechanicalSeats(w,locked,locked?{...w.expedition.doomsday?.ranks}:previousRanks);acquireDoomsdayBlueprint(w,id);
 if(id==='M-P03')grantMechanicalPolarization(w);
 for(const u of w.allies()){
  w.refreshStats(u);
  if(id==='M-P01'&&formalDoomsdayMember(u)&&mechanicalMember(w,u)&&mechanicalRank(w,u,id))w.visual('support-pulse',u,u,undefined,undefined,{doomsdayEffect:'refit-sweep'});
 }
 return true;
}
/** No effect can fail after the caller has validated readiness and this preflight. */
export function claimDoomsdayNode(w:World,id:DoomsdayId){
 if(!doomsdayRuntimeReady(w,id)||!buildNodeLegal(w.expedition,id))return false;
 const s=w.expedition.doomsday??=newDoomsdayState();
 if(DOOMSDAY_CARD_BY_ID[id].purchase==='orange'){
  s.ranks[id]=1;acquireDoomsdayBlueprint(w,id);
  for(const u of w.allies())w.refreshStats(u);
 }else if(doomsdayRank(s,id))s.nodeReserves[id]=(s.nodeReserves[id]??0)+1;else {s.ranks[id]=1;if(id==='M-N03')grantMechanicalPolarization(w);}
 return true;
}
