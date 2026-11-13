import {armedOrderSeconds} from '../../src/simulation/combat/armed-procs';
/** Prepare trigger state only. Fixed steps, shots, deliveries and retirements are production code. */
import {World} from '../../src/simulation/world';
import {FlatTerrain} from '../../src/simulation/movement/flat-terrain';
import {ARMED_CARD_BY_ID} from '../../src/data/terran-armed-support';
import {LEGACY_ARMED,type ArmedId} from '../../src/simulation/progression/build-progress';
import {armedStageKey} from '../../src/simulation/combat/armed-support';
const pairs:Partial<Record<ArmedId,ArmedId[]>>={N01:['W04'],N02:['W01','G02'],N03:['B03'],N04:['B02'],N05:['P01'],N06:['W01','W04'],N07:['G02','B01'],N08:['B02','G04'],N09:['W02','P05']};
export function armedScenario(id:ArmedId,withNode=true,seed=id==='W03'?2:['O03','N09'].includes(id)?1:id==='O01'?8:id==='G03'?3:id==='G01'?32:id==='N06'?11:id==='N03'?1111011:1111045){
 const w=new World({race:'terran',seed,waves:false,terrain:new FlatTerrain(),obstacles:[]});w.start();w.missions.enabled=w.encounters.enabled=false;w.starship.enabled=false;for(let i=0;i<3;i++){w.endStage();for(let round=0;round<2&&w.phase==='reward';round++)w.skipReward();}w.wallet={minerals:10000,gas:10000};w.expedition.ledger=[];w.pods=[];
 for(const g of w.expedition.building!.groups)g.enabled=false;
 const a=w.expedition.support.armed!,cards=[...(pairs[id]??[]),...(!id.startsWith('N')||withNode?[id]:[])];
 for(const card of cards){a.ranks[card]=1;const alias=LEGACY_ARMED[card as keyof typeof LEGACY_ARMED];if(alias){if(alias in w.expedition.support.levels)w.expedition.support.levels[alias as keyof typeof w.expedition.support.levels]=1;else w.expedition.support.unique.levels[alias]=1;}}
 for(let i=0;i<4;i++)w.addFamilyMember('marine',{x:(i-1.5)*1.1,z:-1});
 if(['W02','B05','N09'].includes(id)){const u=w.allies().at(-1)!;w.expireUnit(u);}
 if(id==='W06')for(const [i,u]of w.allies().entries()){u.x=(i-2)*1.3;u.z=(i%2)*1.8;u.hp=Math.max(1,u.maxHp-50);}
 if(id==='G09'){const u=w.addUnit('hellion','terran',0,0);u.hp=u.maxHp*.2;}
 if(id==='G03'){const u=w.allies().at(-1)!;u.rank=4;w.refreshStats(u,true);w.hit(u,1e6,[],1,'zerg');}
 const columns=['P01','N05','O01'].includes(id)?4:2;for(let row=0;row<3;row++)for(let col=0;col<columns;col++)w.addUnit(row===2?'hydralisk':row===1?'zergling':'roach','zerg',(col-(columns-1)/2)*1.25,(['P05','N09'].includes(id)?3.5:['B02','N04','N08'].includes(id)?2.5:id==='W09'?4:id==='G02'?10:7)+row*1.4,1,'regular',1);
 if(['G05','G07','G08'].includes(id))for(const u of w.entities.values())if(u.owner==='zerg'){u.hp=u.maxHp*=40;}
 if(id==='N04'){const e=w.addUnit('roach','zerg',3.375,2.5);e.hp=e.maxHp=10000;e.moveSpeed=1;}
 if(id==='N07')for(const u of w.entities.values())if(u.owner==='zerg'){u.hp=u.maxHp*=20;}
 for(const e of w.entities.values())if(e.owner==='zerg'){e.hp=e.maxHp=Math.max(30000,e.hp);e.weaponDamage=0;}
 if(id==='N09')w.allies()[0].hp*=.5;
 if(id==='W01')for(const e of w.entities.values())if(e.owner==='zerg')e.moveSpeed=0;
 if(id==='W08'){let i=0;for(const e of w.entities.values())if(e.owner==='zerg'){e.cloaked=true;e.moveSpeed=0;e.hp=e.maxHp=10000;e.weaponDamage=.6;e.z=1.2+Math.floor(i++/2)*1.8;}}
 if(id==='G05'){const e=w.addUnit('zergling','zerg',-4,2.5);e.hp=e.maxHp=30000;e.weaponDamage=2;}
 if(id==='W09'){w.anchor.z=2;a.rear={point:{x:0,z:2},threat:{x:0,z:8}};w.issueMove({x:0,z:-4});}
 if(id==='O03'){for(const u of [...w.entities.values()])if(u.owner==='zerg')w.entities.delete(u.id);for(const u of w.allies()){u.rank=5;w.refreshStats(u,true);u.z=-3;}const e=w.addUnit('hydralisk','zerg',0,5);e.hp=e.maxHp=30000;e.weaponDamage=200;e.attackPeriod=.45;w.tick=119;w.time=119/60;w.stageElapsed=w.time;e.hp=e.maxHp=1e6;w.expedition.familySlots.push('thor');for(const x of [-5,5])w.addFamilyMember('thor',{x,z:-4},5);e.stoppedUntil=w.time+2;a.hold={point:{x:0,z:0},sinceTick:0,stageKey:armedStageKey(w)};}
 if(id==='O01'){a.counter={losses:Array.from({length:9},(_,i)=>({entityId:10000+i,generation:0,family:'marine',rank:1,tick:0})),invulnerableUntil:0};const u=w.allies().at(-1)!;u.hp=1;u.x=0;u.z=4;const e=w.addUnit('roach','zerg',0,5);e.weaponDamage=100;e.attackRange=4;e.attackPeriod=.5;e.windup=.2;e.pendingTarget=u.id;e.attackTarget=u.id;}
 if(id==='N07'||id==='N02'){const fid=w.nextId++,castId=a.nextCast++;w.fortifications.set(fid,{id:fid,x:-4,z:1.5,hp:1200,maxHp:1200,armor:2,unitRadius:1.6,flying:false,attributes:['Armored','Mechanical','Structure'],owner:'terran',race:'terran',team:'player',kind:'bunker',nextActionAt:0,supportUntil:ARMED_CARD_BY_ID.G02.params.lifetime,supportRank:1,supportOrigin:{cardId:'G02',castId,slot:0,landTick:0}});w.expedition.support.unique.bunkerReady=ARMED_CARD_BY_ID.G02.params.cd;}
 if(cards.includes('G01')){const s=w.expedition.support;s.stageReceipt=armedStageKey(w);s.minePending=0;s.mines=[];}
 if(cards.includes('B07'))w.expedition.support.unique.missilesReady=0;
 if(id==='B06'||id==='O02'){for(let i=0;i<3;i++)w.addUnit('mutalisk','zerg',(i-1)*2,8+i,1,'regular',1);}
 if(id==='W03')for(const u of w.allies().slice(-2))w.expireUnit(u);
 if(id==='W03')for(const [index,seconds]of [10,armedOrderSeconds(w,10)].entries())w.expedition.ledger.push({id:100+index,family:'marine',line:'barracks',facilityIds:[],remaining:seconds,state:'training',podId:null,passengers:[{paid:{minerals:50,gas:0},status:'waiting',entityId:null,purpose:'body'}]});
 if(!['O01','O03','W08'].includes(id))for(const e of w.entities.values())if(e.owner==='zerg'){e.hp=e.maxHp=Math.max(e.maxHp,30000);e.weaponDamage=0;}
 if(['P02','O02'].includes(id))for(const e of w.entities.values())if(e.owner==='zerg')e.hp=e.maxHp=1e6;
 w.nextJob=id==='W03'?102:w.nextJob;w.paused=true;
 return {world:w,card:ARMED_CARD_BY_ID[id],cards,snapshot:w.captureRun()};
}
