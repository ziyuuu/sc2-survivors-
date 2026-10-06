import {World} from '../../src/simulation/world';
import {ELITES} from '../../src/data/elites';
import type {ProtossEliteId} from '../../src/data/protoss-elites';
import {tickWeaponFlights} from '../../src/simulation/combat/weapon-flight';
import {tickProtossEliteState} from '../../src/simulation/combat/protoss-elite-runtime';
export function protossFixture(){const w=new World({race:'protoss',sandbox:true,waves:false,terrain:false,obstacles:[],seed:10577});w.start();w.entities.clear();w.heroes.clear();w.pods=[];w.hive=null;w.expansionHives.clear();w.economicTargets.clear();w.fortifications.clear();w.wallet.minerals=0;for(const p of Object.values(w.expedition.production))p.enabled={};w.expedition.tech.storm=1;return w;}
export function protossElite(w:World,id:ProtossEliteId,rank=1,x=0,z=0){const u=w.addUnit(ELITES[id].family,'terran',x,z,rank);u.eliteId=id;u.modelKey=ELITES[id].model;w.refreshStats(u,true);return u;}
export function target(w:World,x=3,z=0,air=false){const e=w.addUnit(air?'mutalisk':'roach','zerg',x,z);e.hp=e.maxHp=1e8;e.armor=e.shield=0;e.attributes=[];e.weaponDamage=0;e.stoppedUntil=e.nextShotAt=e.specialReady=1e9;return e;}
export function settle(w:World,seconds=.6){for(let i=0;i<Math.ceil(seconds*60);i++){w.time+=1/60;w.hash.rebuild(w.entities.values());tickWeaponFlights(w,1/60);tickProtossEliteState(w);}}
