import {racePreloadModels} from './race-preload';
import {openingPreloadModels} from './battle-preload-plan';
import {ALL_FAMILIES,isAirHeroType,type CombatUnitType} from '../data/races';
import {ELITES,type EliteId} from '../data/elites';
import {ELITE_VISUAL_PROFILES} from '../data/elite-visual-profiles';
import {HEROES,type HeroId} from '../data/heroes';
import {displayLoadModelKey} from '../render/materials/elite-visual';
import type {RunSnapshot} from '../simulation/persistence/run-snapshot';
import {equipmentAccountModels} from '../simulation/starship/asset-plan';
import {selectEquipmentEffects} from '../simulation/starship/selection';
import {equippedItems} from '../simulation/starship/inventory';

const families=new Set<string>(ALL_FAMILIES);
const eliteModels=new Map(Object.entries(ELITE_VISUAL_PROFILES).flatMap(([id,p])=>[p.model,...Object.values(p.forms)].map(key=>[key,id as EliteId] as const)));
// The flagship shares its asset with an elite Carrier; only its explicit hero
// identity asks for the differently normalized hero batch.
const heroModels=new Map(Object.entries(HEROES).filter(([,h])=>!eliteModels.has(h.model)).map(([id,h])=>[h.model,id as HeroId]));

export function snapshotEquipmentEffects(snapshot:RunSnapshot){
 const gear=snapshot.starship?.runtime;
 return gear?.enabled?selectEquipmentEffects(equippedItems(gear.account,snapshot.config.race)):[];
}

/** Keep ordinary production/enemy/encounter closure, then only saved special
 * identities and equipped future deliveries. Never roll RNG or mutate a save. */
export function snapshotIdentityModels(snapshot:RunSnapshot){
 const models=racePreloadModels(snapshot.config.race,false);
 for(const entry of openingPreloadModels(snapshot.config.race,snapshot.config.frozenTalents.levels))models.set(...entry);
 const add=(key:string,type:CombatUnitType)=>{
  if(!isAirHeroType(type))models.set(type,type);
  models.set(displayLoadModelKey(key,type),type);
 };
 const identity=(value:string)=>{
  if(families.has(value))models.set(value,value as CombatUnitType);
  const elite=Object.hasOwn(ELITES,value)?value as EliteId:eliteModels.get(value);
  if(elite){const data=ELITES[elite],visual=ELITE_VISUAL_PROFILES[elite];add(visual.model,data.family);for(const form of Object.values(visual.forms))add(form,data.family);}
  const hero=Object.hasOwn(HEROES,value)?value as HeroId:value==='hero.purifier_flagship'?'purifier_flagship':heroModels.get(value);
  if(hero){const data=HEROES[hero];add(data.model,data.baseFamily);}
 };
 const seen=new WeakSet<object>();
 const visit=(value:unknown):void=>{
  if(typeof value==='string'){identity(value);return;}
  if(!value||typeof value!=='object'||seen.has(value))return;seen.add(value);
  if(value instanceof Map)for(const [key,child]of value){visit(key);visit(child);}
  else if(value instanceof Set)for(const child of value)visit(child);
  else if(!ArrayBuffer.isView(value))for(const child of Object.values(value))visit(child);
 };
 visit(snapshot.state);
 const gear=snapshot.starship?.runtime;
 if(gear?.enabled){
  // Warehouse bindings do not participate in this run. Pending casts, copies,
  // orders and weak receipts do, including bodies whose source has died.
  const {account,...runtime}=gear;visit(runtime);visit(snapshot.starship?.weak);
  visit(snapshotEquipmentEffects(snapshot));
  for(const model of equipmentAccountModels(account,snapshot.config.race)){add(model.key,model.type);identity(model.key);}
 }
 return models;
}

/** Required variants can change native mode or launch interceptors immediately. */
export function completeSnapshotModelForms(models:Map<string,CombatUnitType>){
 for(const [key,type]of [...models]){
  if(type==='hellion')models.set('hellion.hellbat','hellion');
  if(type==='viking')models.set('viking.assault','viking');
  if(type==='carrier'||type==='purifier_flagship')models.set('interceptor','marine');
  const elite=eliteModels.get(key);
  if(elite)for(const form of Object.values(ELITE_VISUAL_PROFILES[elite].forms))models.set(form,ELITES[elite].family);
 }
}
