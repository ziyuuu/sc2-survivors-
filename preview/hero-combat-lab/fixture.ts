import type {World} from '../../src/simulation/world';
import type {HeroId} from '../../src/data/heroes';
export type DemoMode='attack'|'skill';
export function prepareFixture(world:World,hero:HeroId,rank:number,mode:DemoMode){
 world.resetRun();world.start();world.entities.clear();world.heroes.clear();world.pods=[];world.hive=null;world.expansionHives.clear();world.economicTargets.clear();world.fortifications.clear();world.pickups=[];world.rewardDrops=[];
 world.stage=13;world.stageElapsed=0;for(const plan of Object.values(world.expedition.production))plan.enabled={};
 world.acquireHero(hero);const source=world.heroEntity(hero)!;source.rank=rank;world.heroes.get(hero)!.rank=rank;world.refreshStats(source,true);source.x=-4.5;source.z=0;source.prev={x:source.x,z:source.z};source.facing=source.attackFacing=Math.PI/2;source.action='idle';source.lastShotAt=-1000;
 world.anchor.x=1;world.anchor.z=0;world.marchDirection.x=1;world.marchDirection.z=0;
 const enemy=(type:'roach'|'zergling'|'mutalisk',x:number,z:number,hp:number)=>{const e=world.addUnit(type,'zerg',x,z,1,'regular',13);e.hp=e.maxHp=hp;e.armor=0;e.facing=-Math.PI/2;e.action='idle';e.attackPeriod=10000;e.prev={x,z};return e;};
 if(mode==='attack'){
  enemy('roach',-.7,0,100000);
  for(const [i,[x,z]] of [[.3,-1.7],[.3,1.7],[2.2,-1.1],[2.2,1.1],[3.4,-2.7],[3.4,2.7],[4.3,0],[5.4,1.8]].entries())enemy(i%3?'roach':'zergling',x,z,100000);
  enemy('mutalisk',1.1,-3.6,100000);
 }else{
  const factor=1+.4*(rank-1);
  if(hero==='swann'){
   for(let i=0;i<7;i++){const a=i*2*Math.PI/7;const e=world.addUnit(i%2?'hellion':'tank','terran',-1.5+Math.cos(a)*2.3,Math.sin(a)*3.1,3);e.hp=e.maxHp*(i===6?1:.35+i*.045);e.action='idle';e.facing=Math.PI/2;e.prev={x:e.x,z:e.z};}
  }else if(hero==='raynor'||hero==='nova'){
   for(let i=0;i<5;i++)enemy(i===2&&hero==='nova'?'mutalisk':i%2?'zergling':'roach',-1.2+i*1.85,0,(i%3===1?3000:12000)*factor);enemy('roach',2.5,3,12000*factor);enemy('zergling',5.5,-3,10000*factor);
  }else if(hero==='tosh'){
   for(let i=0;i<12;i++)enemy(i%5===4?'mutalisk':i%3?'roach':'zergling',-1.2+(i%4)*2.1,-4.3+Math.floor(i/4)*3.5,(i%4===1?3000:11000)*factor);
  }else{
   enemy('roach',-.7,0,hero==='tychus'?18000*factor:5000*factor);for(let i=0;i<6;i++){const a=i*Math.PI/3;enemy(i%3===1?'zergling':'roach',.4+Math.cos(a)*1.7,Math.sin(a)*1.9,(i%3===0?2800:10000)*factor);}enemy('roach',5.5,4,12000*factor);
  }
 }
 world.paused=false;world.hash.rebuild(world.entities.values());world.changed();
 return [...world.entities.values()].filter(e=>e.heroId!==hero).map(e=>({id:e.id,hp:e.hp,maxHp:e.maxHp,owner:e.owner}));
}
