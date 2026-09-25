"""Resolve original ordinary-unit and hero model paths; never substitute missing identities."""
from pathlib import Path
import json,re,xml.etree.ElementTree as ET
ROOT=Path(__file__).resolve().parent.parent

def read_models(layers):
 nodes={}
 for layer in layers:
  filename=ROOT/f'.cache/sc2-campaign-data/{layer.removeprefix('campaign:')}-modeldata.xml' if layer.startswith('campaign:') else ROOT/f'.cache/sc2-data/{layer}-modeldata.xml'
  doc=ET.parse(filename,ET.XMLParser(target=ET.TreeBuilder(insert_pis=True)))
  for n in doc.getroot():
   if n.tag!='CModel' or not n.get('id'):continue
   old=nodes.get(n.get('id'),{'tokens':{},'parent':None,'model':None,'scale':None,'variations':0,'source':None,'required':None})
   old['parent']=n.get('parent',old['parent'])
   old['tokens'].update({k:v for k,v in n.attrib.items() if k not in ['id','parent','default']})
   for ch in n:
    if ch.tag is ET.ProcessingInstruction:
     props=dict(re.findall(r'(\w+)="([^"]*)"',ch.text or ''))
     if 'id' in props and 'value' in props:old['tokens'][props['id']]=props['value']
   if n.find('Model') is not None:old['model']=n.find('Model').get('value');old['source']=layer
   if n.find('RequiredAnims') is not None:old['required']=n.find('RequiredAnims').get('value')
   if n.find('ScaleMin') is not None:old['scale']=n.find('ScaleMin').get('value')
   if n.find('VariationCount') is not None:old['variations']=int(n.find('VariationCount').get('value','0'))
   nodes[n.get('id')]=old
 return nodes

def resolve(nodes,name):
 if name not in nodes:return None
 chain=[];current=name
 while current in nodes and current not in chain:chain.insert(0,current);current=nodes[current]['parent']
 tokens={'id':name};model=None;scale=None;variations=0;source=None;required=None
 for key in chain:
  item=nodes[key];tokens.update(item['tokens'])
  if item['model']:model=item['model'];source=item['source']
  required=item['required'] if item['required'] is not None else required
  scale=item['scale'] or scale;variations=item['variations'] or variations
 if not model:return None
 for _ in range(6):model=re.sub(r'##([^#]+)##',lambda m:tokens.get(m[1],m[0]),model)
 if '##' in model:return None
 if variations>0:model=model.removesuffix('.m3')+'_00.m3'
 model=model.replace('\\','/')
 if not model.lower().startswith('assets/units/'):return None
 return {'modelDataId':name,'assetPath':model,'name':Path(model).stem.lower(),'sourceScale':scale,'definitionLayer':source,'modelInheritance':chain,'requiredAnimations':([required.replace('\\','/')] if required else [])}

base=read_models(['core','liberty','swarm','void']);coop=read_models(['core','liberty','swarm','void','starcoop'])
ordinary={'reaper':'Reaper','thor':'Thor','viking':'VikingFighter','banshee':'Banshee','science_vessel':'ScienceVessel','queen':'Queen','lurker':'LurkerMP','mutalisk':'Mutalisk','corruptor':'Corruptor','ultralisk':'Ultralisk','zealot':'Zealot','adept':'Adept','stalker':'Stalker','sentry':'Sentry','immortal':'Immortal','colossus':'Colossus','high_templar':'HighTemplar','phoenix':'Phoenix','void_ray':'VoidRay','carrier':'Carrier','interceptor':'Interceptor','hellion.hellbat':'HellionTank','viking.assault':'VikingAssault'}
campaign=read_models(['core','liberty','swarm','void','campaign:liberty','campaign:swarm','campaign:void','starcoop'])
heroes={'kerrigan':'MutatorAmonKerrigan','zagara':'ZagaraVoidCoop','dehaka':'MutatorAmonDehaka','stukov':'InfestedStukovCoop','artanis':'MutatorAmonArtanis','zeratul':'MutatorAmonZeratul','fenix':'FenixDragoon','swann':'Swann','tosh':'Tosh','niadra':'HugeSwarmQueen','alarak':'Alarak','vorazun':'Vorazun'}
records=[];missing=[]
for prefix,names,nodes in [('model.',ordinary,base),('model.hero.',heroes,campaign)]:
 for key,name in names.items():
  resolved=resolve(nodes,name)
  if not resolved and key=='science_vessel':resolved=resolve(campaign,name)
  if resolved:
   records.append({'id':prefix+key,**resolved})
  else:missing.append({'id':prefix+key,'modelDataId':name,'reason':'No resolved combat model in inspected model data; story characters and other identities rejected'})
elites={'reaper':'Reaper_CovertOps_Collection','thor':'Thor_CovertOps_Collection','viking':'Viking_MercFighter_Collection','banshee':'Banshee_CovertsOps_Collection','science_vessel':'Hologram_Skin_ScienceVessel','zergling':'Zergling_CollectionSkin_Webby','baneling':'Baneling_Webby_Collection','roach':'Roach_CollectionSkin_Webby','ravager':'Ravager_CollectionSkin_Webby','hydralisk':'Hydralisk_Collection_Webby','queen':'Queen_CollectionSkin_Webby','lurker':'Lurker_CollectionSkin_Webby','mutalisk':'Mutalisk_CollectionSkin_Webby','corruptor':'Corruptor_CollectionSkin_Webby','ultralisk':'Ultralisk_CollectionSkin_Webby','zealot':'Zealot_Purifier_Collection','adept':'Adept_Purifier_Collection','stalker':'Stalker_Purifier_Collection','sentry':'Sentry_Purifier_Collection','immortal':'Immortal_Purifier_Collection','colossus':'Colossus_Purifier_Collection','high_templar':'HighTemplar_Purifier_Collection','phoenix':'Phoenix_Purifier_Collection','void_ray':'VoidRay_Purifier_Collection','carrier':'Carrier_Purifier_Collection'}
elite_records=[]
for key,name in elites.items():
 resolved=resolve(coop if key=='science_vessel' else base,name)
 if resolved:elite_records.append({'id':'model.elite.'+key+'.1',**resolved})
 else:missing.append({'id':'model.elite.'+key+'.1','modelDataId':name,'reason':'No resolved original elite body'})
resolved=resolve(base,'Viking_MercAssault_Collection')
if resolved:elite_records.append({'id':'model.elite.viking.1.assault',**resolved})
(ROOT/'tools/three-race-elite-models.json').write_text(json.dumps(elite_records,indent=2)+'\n',encoding='utf-8')
(ROOT/'tools/three-race-campaign-models.json').write_text(json.dumps([r for r in records if r.get('definitionLayer','').startswith('campaign:')],indent=2)+'\n',encoding='utf-8')
(ROOT/'tools/three-race-models.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
(ROOT/'reports/local').mkdir(exist_ok=True,parents=True)
(ROOT/'reports/local/three-race-model-blockers.json').write_text(json.dumps(missing,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'resolved':len(records),'missing':missing},ensure_ascii=False))



animations={a.lower():{'id':'animation.'+Path(a).stem.lower(),'assetPath':a,'name':Path(a).stem.lower()} for r in records+elite_records for a in r['requiredAnimations']}
(ROOT/'tools/three-race-animation-models.json').write_text(json.dumps(list(animations.values()),indent=2)+'\n',encoding='utf-8')
