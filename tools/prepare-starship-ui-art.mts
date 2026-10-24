import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';import {createHash} from 'node:crypto';
import {EQUIPMENT_TEMPLATES} from '../src/simulation/starship/catalog';
import {validBinding} from '../src/simulation/starship/eligibility';
const root=process.cwd(),out=path.join(root,'preview/starship-ui-flow-20261015-r18'),report=path.join(root,'reports/local/starship-ui-flow-20261015-r18');
fs.mkdirSync(path.join(out,'assets'),{recursive:true});fs.mkdirSync(report,{recursive:true});
const json=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const script=(p:string)=>{const c:any={};vm.runInNewContext(fs.readFileSync(p,'utf8'),c);return Object.values(c)[0] as any;};
const catalog=json('docs/project/starship-ui-names-20261014/catalog.json'),old=script('preview/starship-ui-20261015-r12/art-gallery-data-r12.js'),modules=script('preview/starship-orange-20261015-r15/data.js'),sets=script('preview/starship-orange-sets-20261015-r17/data.js');
const quality:any={white:1,green:2,blue:3,purple:4,orange:5};
const slots:any={collection:'gathering',operation:'logistics',logistics:'logistics',control:'control',support:'support',weapon_research:'offense1',weapon_production:'offense2',ammo_research:'offense3',ammo_production:'offense4',armor_research:'defense1',armor_production:'defense2',power_research:'defense3',power_production:'defense4'};
const alias:any={'训练有素进阶':'训练有素','团队协作进阶':'团队协作','最佳选择进阶':'最佳选择','英雄':'普通英雄','军衔':'士兵','宝可梦捕获':'训犬大师','大和扫射':'大和扫射信标','巨兽突入':'巨兽突入信标','时光回溯':'时光回溯装置','军备总动员':'满编军备库','吞星之口':'吞星引擎'};
const directions:any={terran:['barracks','factory','starport'],zerg:['zerg.basic','zerg.evolution','zerg.air'],protoss:['gateway','robotics','stargate']};
const imageByRecord=new Map<string,string>(),assets:any[]=[];
function add(key:string,file:string,race:string,theme:string,detail?:string){const target=key.replaceAll('/','--');const dest=path.join(out,'assets',target+path.extname(file));if(fs.existsSync(file)){fs.copyFileSync(file,dest);assets.push({key,race,theme,file:'assets/'+path.basename(dest),sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex'),source:path.relative(root,file).replaceAll('\\','/')});if(detail&&fs.existsSync(detail)){const d=path.join(out,'assets',target+'-detail'+path.extname(detail));fs.copyFileSync(detail,d);assets.at(-1).detail='assets/'+path.basename(d);}}}
for(const a of old.assets){add(a.artKey,path.join('preview/starship-ui-20261015-r12/assets',a.runtimeFilename),a.race,a.theme);for(const id of a.recordIds)imageByRecord.set(id,a.artKey);}
for(const [data,dir] of [[modules,'starship-orange-20261015-r15'],[sets,'starship-orange-sets-20261015-r17']] as const){const p=json('preview/'+dir+'/provenance.json');for(const j of data.jobs){const record=p.records.find((r:any)=>r.id===j.id),key=dir.includes('sets')?'orange-set/'+j.id:'orange-module/'+j.id;add(key,record.runtime,j.race,j.theme,record.detail);for(const r of j.records)imageByRecord.set(r.id,key);}}
const rows:any[]=[],excluded:any[]=[],missing=new Set<string>(),templates=Object.values(EQUIPMENT_TEMPLATES);
for(const r of catalog.records){const q=quality[r.quality],slot=slots[r.slot],binding=r.binding?{[r.binding.kind]:r.binding.id}:{},kind=r.kind==='attribute_special'?'special':r.kind;
 if(binding.direction)binding.direction=directions[r.race][Number(binding.direction.split('_')[1])-1];
 let t;if(kind==='attribute')t=EQUIPMENT_TEMPLATES['attribute.'+q];
 else{const name=alias[r.effectKey]??r.effectKey;let possible=templates.filter(t=>t.quality===q&&t.kind===kind&&t.name===name);
  if(kind==='set'){const prefix=r.lineage==='green'?'set.':r.lineage==='independent_blue'?'set.blue.':r.lineage.startsWith('orange')?'set.orange.':r.lineage==='special_purple'?'set.special.':'set.advanced.';possible=possible.filter(t=>t.id.startsWith(prefix));}
  t=possible.length===1?possible[0]:undefined;
 }
 if(!t){missing.add(r.kind+' | '+r.effectKey+' | '+q+' | '+r.lineage);continue;}
 if(!slot||!t.slots.includes(slot)||!validBinding(t,r.race,binding)||r.pollutionOrigin&&t.pollution==='never'||!r.pollutionOrigin&&t.pollution==='required'){excluded.push({id:r.id,reason:'production-ineligible',template:t.id});continue;}
 let art=imageByRecord.get(r.id);if(t.setFamily?.startsWith('orange.')&&t.binding==='hero')art='hero/'+binding.hero+'/'+(slot.startsWith('offense')?'attack':slot==='defense1'||slot==='defense2'?'defense':'move');
 if(!art){missing.add('art '+r.id);continue;}
 rows.push({id:r.id,template:t.id,race:r.race,quality:q,slot,binding,polluted:r.pollutionOrigin,name:r.baseName,names:r.displayNamesByPurification,setName:r.setName,art});
}
const names={rows,assets};fs.writeFileSync('src/ui/starship/catalog-data.json',JSON.stringify(names));
fs.writeFileSync(path.join(report,'mapping-audit.json'),JSON.stringify({sourceRecords:catalog.records.length,rows:rows.length,existingArt:assets.length,excluded,unmapped:[...missing],unmappedTemplates:templates.filter(t=>!rows.some(r=>r.template===t.id)).map(t=>({id:t.id,name:t.name}))},null,2));
console.log(JSON.stringify({rows:rows.length,assets:assets.length,excluded:excluded.length,unmapped:[...missing],unmappedTemplates:templates.filter(t=>!rows.some(r=>r.template===t.id)).map(t=>({id:t.id,name:t.name}))}));
