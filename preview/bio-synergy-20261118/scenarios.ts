import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {BIO_BY_ID,type BioId} from '../../src/data/terran-bio';
import {newBioState} from '../../src/simulation/combat/bio-state';
import {bioBody} from '../../src/simulation/combat/bio-runtime';
import type {UnitType} from '../../src/data/sc2-units';

const pairs:Partial<Record<BioId,BioId[]>>={
 'BIO-W08':['BIO-W02'],'BIO-N01':['BIO-G03','BIO-B02'],'BIO-N02':['BIO-W02'],
 'BIO-N03':['BIO-W01'],'BIO-N05':['BIO-W03'],'BIO-N07':['BIO-B03'],'BIO-N08':['BIO-B04'],
 'BIO-O01':['BIO-W02','BIO-P01'],'BIO-O03':['BIO-G05'],'BIO-G08':['BIO-W04']
};
export function bioScenario(id:BioId,variant=1){
 // This seed hatches the first eligible kill while the next target is still across the field.
 const seed=id==='BIO-B01'?2947536104:181145;
 const w=new World({race:'terran',seed,waves:false,terrain:new FlatTerrain(),obstacles:[]});
 w.start();w.entities.clear();w.expedition.ledger=[];w.pods=[];w.missions.enabled=w.encounters.enabled=false;
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.expedition.bio=newBioState();const state=w.expedition.bio;
 for(const key of pairs[id]??[])state.ranks[key]=1;
 if(variant)state.ranks[id]=1;if(variant===2&&id.startsWith('BIO-N'))state.nodeReserves[id]=1;
 w.anchor={x:0,z:0,facing:0};const ally=(type:UnitType,x:number,z:number)=>w.addUnit(type,'terran',x,z,3);
 const foe=(x:number,z:number)=>{const u=w.addUnit('roach','zerg',x,z);u.moveSpeed=0;u.weaponDamage=4;u.hp=u.maxHp=5000;u.weaponCooldown=.35;return u;};
 const main=ally(id==='BIO-G05'?'reaper':'marine',0,0),wing=ally('marauder',1,0),e=foe(0,3.7);foe(-1.2,4.1);foe(1.3,4.5);
 main.hp*=.75;wing.hp*=.65;
 if(['BIO-B04','BIO-N08'].includes(id)){const machine=ally('tank',-.7,-.4);machine.hp*=.6;bioBody(machine).cloudAt=.4;}
 if(id==='BIO-N08'){wing.x=.9;wing.z=2.6;}
 if(['BIO-G01','BIO-B03','BIO-N02','BIO-N03','BIO-N07'].includes(id)){main.hp=1;e.weaponDamage=60;e.z=1.1;}
 if(id==='BIO-N07')e.attackPeriod=7;
 if(['BIO-G06','BIO-G09','BIO-N01','BIO-P04'].includes(id)){e.hp=id==='BIO-G09'?35:1;for(let i=0;i<3;i++)foe(i-2,4).hp=12;}
 if(id==='BIO-B06'||id==='BIO-P06'){main.hp=.34*main.maxHp;e.weaponDamage=1;}
 if(id==='BIO-W09'||id==='BIO-N09'){e.weaponDamage=main.maxHp*.16;e.z=1.6;}
 if(id==='BIO-B08'||id==='BIO-N05'){ally('medivac',-1,-.6);main.hp*=.6;if(id==='BIO-B08')bioBody(main).healFraction=.19;else bioBody(main).pulseFraction=.29;}
 if(id==='BIO-P02'){bioBody(main).surviveTime=19;bioBody(main).lastCombat=0;}
 if(id==='BIO-B07'){ally('medivac',-1,-.4);main.hp=main.maxHp*.35;w.applyStatus(main,e,'bleed',.3,6);}
 if(id==='BIO-B01'){
  e.hp=1;e.x=-2;e.z=1;
  let i=0;
  for(const enemy of w.entities.values())if(enemy.owner==='zerg'&&enemy.id!==e.id){
   enemy.x=5+i++*2;enemy.z=2;
  }
 }
 if(id==='BIO-G08'||id==='BIO-W04'){w.upgrades.set('stim',1);w.expedition.tech.stim=1;}
 if(id==='BIO-G02')bioBody(main).rounds=2;if(id==='BIO-G07')bioBody(main).rounds=4;
 if(id==='BIO-O01')w.acquireHero('raynor');
 if(id==='BIO-O03'){ally('marine',-1,.2);const hunter=ally('reaper',-.5,-1.2);hunter.eliteId='reaper.3';hunter.modelKey='elite.reaper.3';ally('reaper',.5,-1.2);}
 w.hash.rebuild([...w.entities.values()]);w.paused=false;return {world:w,card:BIO_BY_ID[id],variant};
}
export function startBioScene(w:World,id:BioId){
 w.paused=false;if(!w.tick){if(id==='BIO-G04')w.castDetection();if(id==='BIO-W04'||id==='BIO-G08')w.stim();}
}
