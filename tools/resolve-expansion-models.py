"""Resolve original CModel inheritance before importing local SC2 bytes."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET
root=Path(__file__).resolve().parent.parent
nodes={}
for layer in ['core','liberty','swarm','void']:
 tree=ET.parse(root/f'.cache/sc2-data/{layer}-modeldata.xml',ET.XMLParser(target=ET.TreeBuilder(insert_pis=True)))
 for n in tree.getroot():
  if n.tag!='CModel' or not n.get('id'):continue
  old=nodes.get(n.attrib['id'],{'tokens':{},'parent':None,'model':None,'scale':None,'variations':0})
  old['parent']=n.get('parent',old['parent'])
  old['tokens'].update({k:v for k,v in n.attrib.items() if k not in ['id','parent','default']})
  for c in n:
   if c.tag is ET.ProcessingInstruction:
    props=dict(re.findall(r'(\w+)="([^"]*)"',c.text or ''))
    if 'id' in props and 'value' in props:old['tokens'][props['id']]=props['value']
  if n.find('Model') is not None:old['model']=n.find('Model').get('value')
  if n.find('VariationCount') is not None:old['variations']=int(n.find('VariationCount').get('value','0'))
  if n.find('ScaleMin') is not None:old['scale']=n.find('ScaleMin').get('value')
  nodes[n.attrib['id']]=old

def resolve(name):
 chain=[];n=name
 while n in nodes and n not in chain:chain.insert(0,n);n=nodes[n]['parent']
 tokens={'id':nodes[name]['parent'] if name in ['SiegeTank_CovertOps_Morph','SiegeTank_Commando_Morph'] else name};model=None;scale=None;variations=0
 for n in chain:
  d=nodes[n];tokens.update(d['tokens']);model=d['model'] or model;scale=d['scale'] or scale;variations=d['variations'] or variations
 assert model,(name,chain)
 for _ in range(5):model=re.sub(r'##([^#]+)##',lambda m:tokens.get(m[1],m[0]),model)
 assert '##' not in model,(name,model,tokens)
 if variations>0:model=model.removesuffix('.m3')+'_00.m3'
 return model.replace('\\','/'),scale
models=[('model.marauder','Marauder'),('model.hydralisk','Hydralisk'),('model.marauder.death','MarauderDeath'),('model.hydralisk.death','HydraliskDeath')]
variants={'marine':['Marine_CovertOps_Collection','Marine_Merc_Collection','Marine_Junker_Collection'],'marauder':['Marauder_CovertOps_Collection','Marauder_Merc_Collection','Marauder_Junker_Collection'],'hellion':['Hellion_CovertOps_Collection','Hellion_Merc_Collection','Hellion_Junker_Collection'],'tank':['SiegeTank_CovertOps_Collection_Tank','SiegeTank_Junker_Collection_Tank','Tank_Commando_Collection'],'medivac':['Medivac_CovertOps_Collection','Medivac_Merc_Collection','Medivac_Junker_Collection']}
for family,names in variants.items():
 for i,n in enumerate(names):
  key=f'model.elite.{family}.{i+1}';models.append((key,n))
  candidates=[n+'_Death',n.replace('_Tank','')+'_Death',n.replace('Tank_Commando','SiegeTank_Commando')+'_Death']
  for candidate in candidates:
   if candidate in nodes:models.append((key+'.death',candidate));break
  if family=='tank':
   base=['SiegeTank_CovertOps','SiegeTank_Junker','SiegeTank_Commando'][i]
   models.extend([(key+'.siege',base+'_Collection'),(key+'.morph',base+'_Morph')])
records=[]
for key,name in models:
 path,scale=resolve(name);records.append({'id':key,'modelDataId':name,'assetPath':path,'name':path.split('/')[-1].removesuffix('.m3').lower(),'sourceScale':scale})
for key,name,path in [('raynor','MutatorAmonRaynor','MarineRaynorHEV_Ex3'),('tychus','MutatorAmonTychus','MarineTychus'),('nova','MutatorAmonNova','Nova_COOP')]:records.append({'id':'model.hero.'+key,'modelDataId':name,'assetPath':f'Assets/Units/Terran/{path}/{path}.m3','name':path.lower(),'sourceScale':{'raynor':'1.950000,1.950000,1.950000','tychus':'1.800000,1.800000,1.800000','nova':'1.000000,1.000000,1.000000'}[key],'definition':'mods/starcoop/starcoop.sc2mod/base.sc2data/gamedata/modeldata.xml'})
(root/'tools/expansion-models.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print('Resolved',len(records),'original model definitions')
