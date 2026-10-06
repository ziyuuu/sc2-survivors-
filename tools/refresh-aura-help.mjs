import fs from 'node:fs';
const rules=JSON.parse(fs.readFileSync('docs/project/TEAM_AURA_REBALANCE_VALUES_20261005.json','utf8'));
const design=fs.readFileSync('src/data/team-auras.ts','utf8');
const hero=JSON.parse(design.match(/export const HERO_TEAM_AURAS=(\{[\s\S]*?\}) as const;/)[1]);
const help=JSON.parse(design.match(/export const TEAM_AURA_HELP=(\{[\s\S]*?\}) as const;/)[1]);
const path='src/data/hero-upgrades.ts';let s=fs.readFileSync(path,'utf8');
for(const[id,r]of Object.entries(hero)){const pattern=new RegExp(' '+id+':\\{[^\\n]+\\},');const old=s.match(pattern);if(!old)throw Error(id);const entry={name:r.effectName,kind:r.kind,radius:r.radius,...r.stats};s=s.replace(pattern,' '+id+':'+JSON.stringify(entry)+',');const description=new RegExp("\\b"+id+":'[^']*'");s=s.replace(description,id+':'+JSON.stringify(r.effectName+'：'+help[id]));}
fs.writeFileSync(path,s);
