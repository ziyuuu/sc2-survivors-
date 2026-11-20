import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {campaignTerrain,type CampaignTheme} from '../../src/data/campaign-map';
import {DOOMSDAY_CARD_BY_ID,type DoomsdayId} from '../../src/data/terran-doomsday';
import {newDoomsdayState} from '../../src/simulation/combat/doomsday-state';
import {acquireDoomsdayBlueprint} from '../../src/simulation/combat/doomsday-refits';
import {grantMechanicalPolarization} from '../../src/simulation/combat/doomsday-growth';
import {doomsdayCombat} from '../../src/simulation/combat/doomsday-combat';
import type {UnitType} from '../../src/data/sc2-units';
import type {HeroId} from '../../src/data/heroes';
import {COMPARISONS,prepareComparison,type ComparisonId} from './comparisons';

export const NODE_PAIRS:Partial<Record<DoomsdayId,DoomsdayId[]>>={
 'M-N01':['M-G02','M-G04'],'M-N02':['M-B01','M-W03'],'M-N03':[],
 'M-N04':['M-W05','M-W01'],'M-N05':['M-W01','M-G01'],'M-N06':['M-W03','M-B03'],
 'M-N07':['M-G06','M-B02'],'M-N08':['M-B07','M-P06','M-B09'],'M-N09':['M-P06','M-B05'],
};
/** Fixtures prepare only initial actors, purchases and trigger prerequisites. All later steps are the production World. */
export type ShowcaseOptions={stack?:boolean;theme?:CampaignTheme;group?:ComparisonId;stage?:number};
export function doomsdayScenario(id:DoomsdayId,variant:0|1|2=1,boss=false,driver?:HeroId,options:ShowcaseOptions={}){
 const w=new World({race:'terran',seed:171145,waves:false,terrain:options.theme?campaignTerrain({version:3,seed:171145,theme:options.theme}):new FlatTerrain(),obstacles:[]});w.start();
 w.missions.enabled=w.encounters.enabled=false;w.starship.enabled=false;w.entities.clear();w.expedition.ledger=[];w.pods=[];w.wallet={minerals:10000,gas:10000};
 for(const g of w.expedition.building!.groups)g.enabled=false;
 w.expedition.doomsday=newDoomsdayState();const s=w.expedition.doomsday;
 if(options.group){
  const setup=prepareComparison(w,options.group,options.stage??0);
  return {world:w,card:DOOMSDAY_CARD_BY_ID[COMPARISONS[options.group].card],...setup,variant,boss,snapshot:w.captureRun()};
 }
 const cards=[...new Set([...(NODE_PAIRS[id]??[]),...(variant?[id]:[]),...(options.stack?['M-B01','M-B04','M-N01','M-N02','M-G02','M-G04'] as DoomsdayId[]:[])])];for(const card of cards)s.ranks[card]=1;
 if(variant===2&&id.startsWith('M-N'))s.nodeReserves[id]=1;
 const ally=(type:UnitType,x=0,z=0,rank=3)=>{const u=w.addUnit(type,'terran',x,z,rank);return u;};
 const foe=(x=0,z=4,air=false)=>{const u=w.addUnit(air?'mutalisk':'roach','zerg',x,z);u.hp=u.maxHp=100000;u.armor=0;u.moveSpeed=0;u.weaponDamage=0;u.attackPeriod=30;u.weaponCooldown=30;return u;};
 const type:UnitType=id==='M-W01'||id==='M-W05'||id==='M-G01'||id==='M-W08'||id==='M-P03'||id==='M-N04'||id==='M-N05'?'marine':id==='M-W02'||id==='M-G06'?'hellion':id==='M-B07'||id==='M-N08'?'viking':id==='M-P06'||id==='M-N09'?'banshee':id==='M-O02'||id==='M-B08'?'thor':'tank';
 const main=ally(type,0,0,5),enemy=foe();
 const extra=foe(1.8,4.8),rear=foe(0,6),side=foe(3.5,1.5);foe(-1.8,5.5);
 if(['M-W03','M-W07','M-B02','M-P05','M-N06','M-N07','M-O03'].includes(id)){main.desiredMode='siege';if(id!=='M-W07')main.mode='siege';enemy.z=7;extra.z=7;extra.x=1.65;rear.z=8.8;side.z=5.2;side.x=0;w.refreshStats(main);}
 if(id==='M-W04'||id==='M-W09'){main.hp*=.35;const medic=ally('science_vessel',1,0);medic.energy=id==='M-W09'?15.1:100;}
 if(id==='M-G04'||id==='M-N01'){main.hp*=.5;ally('marine',-1,0);ally('marine',1,0);}
 if(['M-W05','M-N04'].includes(id)){for(let i=1;i<(id==='M-N04'?4:1);i++)ally('marine',(i-1.5)*1.1,-.7);for(const u of w.allies()){const c=doomsdayCombat(u);c.walked=3;c.settled=5;u.weaponCooldown=.15;}}
 if(id==='M-N05'){ally('marine',-1.3,0);enemy.x=0;enemy.z=3;rear.x=.45;rear.z=4;extra.x=.8;extra.z=4.8;}
 if(id==='M-G06'){ally('hellion',-2,0,1);enemy.x=0;enemy.z=3;}
 if(id==='M-N07'){const h=ally('hellion',0,3.5,5);h.weaponCooldown=0;main.weaponCooldown=.35;}
 if(id==='M-N08'){ally('banshee',1,0);ally('tank',-1,0);foe(0,4,true);}
 // Large boss hit circles otherwise put the calibration target inside siege minimum range.
 if(boss&&id==='M-N07')side.z=6.8;
 if(boss&&id==='M-N08'){
  // Keep one shared ground mark and two distinct native followers for the reserve comparison.
  ally('banshee',-1,0);
  for(const [i,u] of [...w.entities.values()].filter(u=>u.owner==='zerg'&&!u.flying&&u!==enemy).entries()){u.x=-8-i*2;u.z=12;}
 }
 if(id==='M-B07')foe(-1,4,true);
 if(id==='M-O02'&&variant===2){enemy.z=2.4;extra.x=1;extra.z=2.7;side.x=-1;side.z=2.7;}
 if(id==='M-O02'&&variant!==2){
  // Leave visible flight distance beyond the large rig's forward cannon mounts.
  enemy.x=.8;enemy.z=8.6;extra.z=9.6;rear.z=10.5;side.x=-2.8;side.z=9.3;
  for(const u of w.entities.values())if(u.owner==='zerg'&&u.z<8)u.z=10.2;
 }
 if(id==='M-N03')ally('marine',-1,0,3);
 if(id==='M-P01'){main.rank=5;main.hp*=.7;}
 if(id==='M-B01')main.hp*=.7;
 if(id==='M-G01'||id==='M-N02')for(const u of w.entities.values())if(u.owner==='zerg')u.armor=10;
 if(id==='M-W02'){enemy.z=3;extra.x=.158+extra.unitRadius;extra.z=5;side.x=3;side.z=9;rear.x=-3;rear.z=8;}
 if(id==='M-B02'){for(const u of w.entities.values())if(u.owner==='zerg'&&u!==enemy&&u!==extra)u.z+=8;extra.x=1.36+extra.unitRadius*.25;extra.z=7;}
 if(id==='M-N02'){side.x=0;side.z=4;enemy.x=1;enemy.z=4.3;extra.x=-1;extra.z=4.3;}
 if(id==='M-G09')main.facing=0;
 if(id==='M-G07'){enemy.cloaked=true;enemy.z=3.7;}
 if(id==='M-B05'){s.ranks['M-B03']=3;enemy.hp=1;main.weaponCooldown=0;}
 if(id==='M-B09')side.x=4;
 if(id==='M-G03'||id==='M-B04'){for(const e of w.entities.values())if(e.owner==='zerg')e.z=25;w.issueMove({x:0,z:10});}
 if(id==='M-B04'){
  // The same flank gun fires in both variants while the tank follows its move order.
  enemy.x=-4;enemy.z=3;enemy.weaponDamage=10;enemy.weaponCooldown=0;enemy.attackRange=8;enemy.attackPeriod=2.4;
  enemy.windup=.05;enemy.pendingTarget=main.id;enemy.attackTarget=main.id;
 }
 if(['M-W06','M-W08','M-G02','M-G05','M-G08','M-G09','M-B06','M-P04'].includes(id)){
  enemy.weaponDamage=10;enemy.weaponCooldown=0;enemy.attackRange=8;enemy.attackPeriod=id==='M-P04'?.5:30;enemy.windup=.05;enemy.pendingTarget=main.id;enemy.attackTarget=main.id;
  if(id==='M-P04'){enemy.weaponDamage=main.maxHp*.25;enemy.attackPeriod=30;ally('science_vessel',-1,-1);}
  if(id==='M-G05'){main.hp=main.maxHp*.36;enemy.weaponDamage=main.maxHp*.08;ally('tank',0,-2);}
  if(id==='M-G08'){main.hp=1;const wounded=ally('tank',-1,0);wounded.hp*=.5;w.anchor.x=w.anchor.z=0;}
  if(id==='M-W08')ally('tank',0,1.5);
  if(id==='M-W06'){const decoy=ally('tank',1,0);enemy.unitType='tank';enemy.mode=enemy.desiredMode='siege';w.refreshStats(enemy);enemy.weaponDamage=30;enemy.pendingTarget=decoy.id;enemy.attackTarget=decoy.id;enemy.z=5;}
 }
 if(id==='M-B08'){enemy.z=1.7;side.x=-1.7;side.z=0;}
 if(id==='M-O01'){w.entities.delete(main.id);const drivers=driver?[driver]:['raynor','tychus','nova'] as const;for(const [i,hero]of drivers.entries()){w.acquireHero(hero);const u=w.heroEntity(hero);if(u){u.x=(i-(drivers.length-1)/2)*3.5;u.z=0;u.hp*=.8;u.specialReady=0;}}const patient=ally('tank',-1,-2);patient.hp*=.6;}
 for(const card of cards)acquireDoomsdayBlueprint(w,card);
 for(const u of w.allies())w.refreshStats(u);
 if(cards.includes('M-N03'))grantMechanicalPolarization(w);
 if(id==='M-N03'){const pod=w.spawnPod('tank',{x:-4,z:-4},901,1);pod.status='opening';pod.resolvedAt=0;pod.nextExitAt=0;pod.guardTypes=[];pod.guardianIds.clear();w.expedition.ledger.push({id:901,family:'tank',line:'factory',facilityIds:[],remaining:0,state:'risk',podId:pod.id,passengers:[{purpose:'body',paid:{minerals:100,gas:0},status:'waiting',entityId:null}]});w.nextJob=902;}
 for(const u of w.entities.values()){u.prev={x:u.x,z:u.z};if(u.owner==='zerg'&&boss){u.enemyTier='boss';u.unitRadius=1.6;u.hp=u.maxHp=1000000;}}
 w.hash.rebuild(w.entities.values());w.paused=true;
 return {world:w,card:DOOMSDAY_CARD_BY_ID[id],cards,variant,boss,snapshot:w.captureRun(),mainId:main.id};
}
