import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {DOMParser} from '@xmldom/xmldom';

// This is the profile already selected by docs/DATA_SOURCES.md. Legacy multiplayer
// mods must not be layered in a second time.
export const LOCKED_LAYERS = ['core','liberty','swarm','void','voidmulti','balancemulti'];
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root,'.cache','sc2-data');
const elements = node => Array.from(node.childNodes ?? []).filter(n => n.nodeType === 1);
const attrs = node => Object.fromEntries(Array.from(node.attributes ?? []).map(a => [a.name,a.value]));
const copy = value => structuredClone(value);
function merge(target, source) {
  const incoming=attrs(source); Object.assign(target.attributes,incoming); for(const key of Object.keys(incoming)) if(!['id','index','parent','default'].includes(key)) target.children=target.children.filter(n=>n.tag!==key);
  const next = new Map();
  for (const child of elements(source)) {
    delete target.attributes[child.tagName];
    const array = child.tagName.endsWith('Array') || child.tagName === 'Unit';
    let index = child.getAttribute('index');
    if (!child.hasAttribute('index')) {
      if (array) {
        if (!next.has(child.tagName)) {
          const indices = target.children.filter(n=>n.tag===child.tagName).map(n=>Number(n.index)).filter(Number.isFinite);
          next.set(child.tagName, indices.length ? Math.max(...indices)+1 : 0);
        }
        index = String(next.get(child.tagName));
        next.set(child.tagName, Number(index)+1);
      } else index = '0';
    }
    let existing = target.children.find(n=>n.tag===child.tagName&&n.index===index);
    if (child.getAttribute('removed')==='1') {
      if (existing) target.children.splice(target.children.indexOf(existing),1);
      continue;
    }
    if (!existing) {
      existing={tag:child.tagName,index,attributes:{},children:[]};
      target.children.push(existing);
    }
    merge(existing,child);
  }
  return target;
}
export class LockedCatalog {
  constructor(directory=cache) {
    this.documents=new Map();this.memo=new Map();
    for (const kind of ['unit','weapon','effect','abil','behavior','model','validator','mover','upgrade']) {
      const nodes=[];
      for (const layer of LOCKED_LAYERS) {
        const filename=path.join(directory,`${layer}-${kind}data.xml`);
        if(!fs.existsSync(filename)) continue;
        const doc=new DOMParser().parseFromString(fs.readFileSync(filename,'utf8'),'application/xml');
        for(const node of elements(doc.documentElement)) if(node.tagName.startsWith('C')) nodes.push({node,layer});
      }
      this.documents.set(kind,nodes);
    }
  }
  exists(kind,id) {return this.documents.get(kind).some(({node})=>node.getAttribute('id')===id);}
  resolve(kind,id,stack=[]) {
    const key=`${kind}:${id}`;
    if(this.memo.has(key)) return copy(this.memo.get(key));
    if(stack.includes(key)) throw Error(`Catalog inheritance cycle ${[...stack,key].join(' -> ')}`);
    const nodes=this.documents.get(kind);
    const patches=nodes.filter(({node})=>node.getAttribute('id')===id);
    if(!patches.length) return null;
    const parent=[...patches].reverse().find(({node})=>node.hasAttribute('parent'))?.node.getAttribute('parent');
    const tag=patches[0].node.tagName;
    let result=parent?this.resolve(kind,parent,[...stack,key]):{tag,index:'0',attributes:{},children:[]};
    if(!result) throw Error(`Missing parent ${kind}:${parent}`);
    if(!parent) {
      const base='C'+kind[0].toUpperCase()+kind.slice(1);
      for(const {node} of nodes) if(node.getAttribute('default')==='1'&&!node.hasAttribute('id')&&(node.tagName===base||node.tagName===tag)) merge(result,node);
    }
    for(const {node} of patches) merge(result,node);
    result.sourceLayers=patches.map(p=>p.layer);
    this.memo.set(key,result);return copy(result);
  }
}
export function child(node,tag,index='0') {return node?.children.find(n=>n.tag===tag&&n.index===String(index));}
export function value(node,tag,index='0',fallback=null) {return (String(index)==='0'?node?.attributes[tag]:undefined)??child(node,tag,index)?.attributes.value??fallback;}
export function number(node,tag,index='0',fallback=null) {const raw=value(node,tag,index,fallback); return raw===null?null:Number(raw);}
export function indexed(node,tag) {return Object.fromEntries((node?.children??[]).filter(n=>n.tag===tag).map(n=>[n.index,n.attributes.value]));}
export const UNIT_XML_IDS={marine:'Marine',marauder:'Marauder',reaper:'Reaper',hellion:'Hellion',tank:'SiegeTank',thor:'Thor',viking:'VikingFighter',banshee:'Banshee',medivac:'Medivac',science_vessel:'ScienceVessel',zergling:'Zergling',baneling:'Baneling',roach:'Roach',ravager:'Ravager',hydralisk:'Hydralisk',queen:'Queen',lurker:'LurkerMP',mutalisk:'Mutalisk',corruptor:'Corruptor',ultralisk:'Ultralisk',zealot:'Zealot',adept:'Adept',stalker:'Stalker',sentry:'Sentry',immortal:'Immortal',colossus:'Colossus',high_templar:'HighTemplar',phoenix:'Phoenix',void_ray:'VoidRay',carrier:'Carrier'};
export function summarizeUnits(catalog=new LockedCatalog()) {
  return Object.fromEntries(Object.entries(UNIT_XML_IDS).map(([id,xmlId])=>{
    const u=catalog.resolve('unit',xmlId);if(!u)return [id,null];
    return [id,{xmlId,layers:u.sourceLayers,hp:number(u,'LifeMax'),armor:number(u,'LifeArmor','0',0),speed:number(u,'Speed'),radius:number(u,'Radius'),shields:number(u,'ShieldsMax','0',0),shieldArmor:number(u,'ShieldArmor','0',0),shieldRegen:number(u,'ShieldRegenRate','0',0),shieldDelay:number(u,'ShieldRegenDelay','0',0),lifeRegen:number(u,'LifeRegenRate','0',0),lifeDelay:number(u,'LifeRegenDelay','0',0),energy:number(u,'EnergyMax','0',0),energyStart:number(u,'EnergyStart','0',0),energyRegen:number(u,'EnergyRegenRate','0',0),creep:number(u,'SpeedMultiplierCreep','0',1),cost:indexed(u,'CostResource'),attributes:indexed(u,'Attributes'),planes:indexed(u,'PlaneArray'),weapons:u.children.filter(n=>n.tag==='WeaponArray').map(n=>n.attributes.Link).filter(Boolean),mover:value(u,'Mover')}];
  }));
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) console.log(JSON.stringify(summarizeUnits(),null,2));
