import {BIO_BY_ID,type BioId} from '../../data/terran-bio';
import {reconcileBio} from './bio-life';
import {bioFormal} from './bio-state';
import {level,fleshMachine} from './bio-runtime';
import {availableFamily} from '../expedition-production';
import {addBuildProgress,buildNodeLegal,ordinaryBuildCardAllowed} from '../progression/build-progress';
import {bioRank,newBioState} from './bio-state';
import type {World} from '../world';
export function bioOfferLegal(w:World,id:BioId){
 const c=BIO_BY_ID[id],s=w.expedition;
 if(s.race!=='terran'||!ordinaryBuildCardAllowed(s,id)||bioRank(s,id)>=c.maxRank)return false;
 if(id==='BIO-W04'||id==='BIO-G08')return !!s.tech.stim;
 if(id==='BIO-W08')return (['BIO-W02','BIO-G09','BIO-P05','BIO-B04'] as const).some(k=>bioRank(s,k));
 if(id==='BIO-W01'||id==='BIO-G03')return availableFamily(w,'marine')||w.allies().some(u=>u.unitType==='marine'&&!u.temporary);
 if(id==='BIO-G05')return availableFamily(w,'reaper')||w.allies().some(u=>u.unitType==='reaper'&&!u.temporary);
 return true;
}
export function bioTriggerReady(w:World,id:BioId){
 if(w.expedition.race!=='terran')return false;
 const allies=w.allies(),formal=allies.filter(bioFormal),has=(...cards:BioId[])=>cards.some(c=>level(w,c));
 switch(id){
 case 'BIO-N01':return !!formal.length&&has('BIO-B02','BIO-G03');
 case 'BIO-N02':return !!formal.length&&has('BIO-W02','BIO-G09','BIO-P05','BIO-B04');
 case 'BIO-N03':return has('BIO-W01','BIO-G05','BIO-B01','BIO-B03','BIO-B05');
 case 'BIO-N04':return formal.some(u=>u.weaponDamage>0);
 case 'BIO-N05':return has('BIO-W03','BIO-G06','BIO-G08','BIO-P03','BIO-P04','BIO-P06')||allies.some(u=>!u.temporary&&['medivac','science_vessel'].includes(u.unitType));
 case 'BIO-N06':return allies.filter(u=>(bioFormal(u)||u.bio?.role==='twin')&&u.weaponDamage>0).length>=2;
 case 'BIO-N07':return !!formal.length&&has('BIO-B03');
 case 'BIO-N08':return allies.some(fleshMachine)&&has('BIO-B04');
 case 'BIO-N09':return formal.length>=2;
 default:return true;
 }
}
export function applyBioPurchase(w:World,id:BioId,offerId:string){
 if(!bioOfferLegal(w,id))return false;
 const a=w.expedition.bio??=newBioState(),c=BIO_BY_ID[id];
 if(a.purchases.some(r=>r.offerId===offerId))return false;
 const rank=bioRank(w.expedition,id)+1,progress=c.purchase==='white-rank'&&rank>1?0:1;
 a.ranks[id]=rank;a.purchases.push({offerId,cardId:id,rank,progress});addBuildProgress(w.expedition,'bio',progress);for(const u of w.allies())w.refreshStats(u);
 return true;
}
export function claimBioNode(w:World,id:BioId){
 if(!buildNodeLegal(w.expedition,id))return false;
 const a=w.expedition.bio??=newBioState();
 if(a.ranks[id])a.nodeReserves[id]=(a.nodeReserves[id]??0)+1;
 else a.ranks[id]=1;
 reconcileBio(w);for(const u of w.allies())w.refreshStats(u);
 return true;
}
