"""Read the pinned MPQ archive locally. Never executes map scripts or imports opening armies."""
from pathlib import Path
import sys,json,hashlib,struct,xml.etree.ElementTree as E,base64,math,collections
sys.path.insert(0,str(Path('.cache/map-tools').resolve()))
import mpyq
lock=json.loads(Path('tools/map-lock.json').read_text());source=Path('assets/private/maps')/lock['file'];raw=source.read_bytes()
assert len(raw)==lock['bytes'] and hashlib.sha256(raw).hexdigest()==lock['sha256'],'Map source hash mismatch'
archive=mpyq.MPQArchive(str(source));root=source.with_suffix('');root.mkdir(exist_ok=True)
for name in archive.files:
 n=name.decode();p=Path(n.replace('\\','/'))
 if '..' in p.parts or p.is_absolute():raise ValueError('Unsafe archive path')
 if n.startswith(('t3','Base.SC2Data','CellAttribute')) or n in ['Objects','MapInfo','DocumentInfo','PreloadAssetDB.txt']:
  target=root/p;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(archive.read_file(name))
terrain=E.parse(root/'t3Terrain.xml').getroot();hm=terrain.find('heightMap');width,height=map(int,hm.get('dim').split());assert hm.get('scale').split()==['1.000000e+00']*3,'Unsupported non-unit map scale'
info=(root/'MapInfo').read_bytes();pos=info.index(hm.get('tileSet').encode()+b'\0')+len(hm.get('tileSet'))+1;bounds=struct.unpack_from('<4I',info,pos)
objects=E.parse(root/'Objects').getroot();starts=[[float(v) for v in n.get('Position').split(',')] for n in objects if n.get('Type')=='StartLoc'];assert len(starts)==2
origin=starts[0];vd=hm.find('vertData');bias=float(vd.get('quantizeBias'));scale=float(vd.get('quantizeScale'));data=(root/'t3HeightMap').read_bytes();assert data[:4]==b'HMAP' and len(data)==32+width*height*6
heights=[round((a+b)*scale-2*bias-8,5) for a,b,mask in struct.iter_unpack('<HHH',data[32:])]
sync=(root/'t3SyncHeightMap').read_bytes();assert sync[:4]==b'SMAP' and len(sync)==64+width*height*4
levels=[];delta=0
for i,(h,c) in enumerate(struct.iter_unpack('<HH',sync[64:])):levels.append(c);delta=max(delta,abs(h/256-8-heights[i]))
plateau_delta=max(abs(struct.unpack_from('<H',sync,64+(int(y)*width+int(x))*4)[0]/256-8-heights[int(y)*width+int(x)]) for x,y,_ in starts)
assert plateau_delta<.01,('Start plateau height mismatch',plateau_delta)
flags=(root/'t3CellFlags').read_bytes();assert flags[:4]==b'LFCT' and struct.unpack_from('<II',flags,24)==(width-1,height-1)
paint=(root/'CellAttribute_Pnp').read_bytes();assert struct.unpack_from('<I',paint)[0]==(width-1)*(height-1)*8
models={};actors={};textures={}
for layer in ['core','liberty','swarm','void']:
 for kind,target in [('modeldata',models),('actordata',actors),('terraintexdata',textures)]:
  path=Path('.cache/sc2-data')/(layer+'-'+kind+'.xml')
  if path.exists():
   for n in E.parse(path).getroot():
    if n.get('id'):
     d=target.setdefault(n.get('id'),{});d['parent']=n.get('parent',d.get('parent'));d.update({c.tag:c.get('value') for c in n if c.get('value') is not None})
for n in E.parse(root/'Base.SC2Data/GameData/TerrainTexData.xml').getroot():textures.setdefault(n.get('id'),{}).update({c.tag:c.get('value') for c in n})
files=json.loads(Path('assets/private/maps/casc-files.json').read_text(encoding='utf-8-sig'));indexed={f.split('/')[-1].lower():f for f in reversed(files) if f.startswith('mods/liberty.sc2mod/')}
placements=[];missing=[];targets=set()
for n in objects:
 if n.tag not in ['ObjectDoodad','ObjectUnit']:continue
 t=n.get('Type') or n.get('UnitType');v=int(n.get('Variation','0'));actor=actors.get(t,{});m=actor.get('Model') or t
 if t in ['MineralField750','LabMineralField750']:m=t.removesuffix('750')
 base={'type':t,'position':[float(v) for v in n.get('Position').split(',')],'rotation':float(n.get('Rotation','0')),'scale':[float(v) for v in n.get('Scale','1,1,1').split(',')],'tint':n.get('TintColor'),'unit':n.tag=='ObjectUnit'}
 if t.startswith('PathingandSightBlocker'):
  base['blockerSize']=2 if '2x2' in t else 1;placements.append(base);continue
 if t.startswith('Logo_'):continue # competitive player/league decals have no Survivors player slots
 d=models.get(m,{});stem=Path((d.get('Model') or m).replace('\\','/')).stem
 if '##' in stem:stem=m
 variants=int(d.get('VariationCount','1'))>1
 guesses=[(stem+'_'+str(v).zfill(2)+'.m3').lower(),(stem+'.m3').lower()] if variants or n.get('Variation') is not None else [(stem+'.m3').lower(),(stem+'_00.m3').lower()]
 match=next((indexed[g] for g in guesses if g in indexed),None)
 if not match:missing.append({'type':t,'model':m,'variation':v,'guesses':guesses});continue
 base.update({'model':m,'sourcePath':match,'assetId':'model.map.'+match.split('/')[-1][:-3].lower(),'modelScale':[float(v) for v in d.get('ScaleMin','1,1,1').split(',')],'footprint':actor.get('Footprint'),'pose':'dead' if '_Dead_' in t else 'idle'})
 placements.append(base);targets.add(match)
tex=[]
for n in terrain.iter('texture'):
 if not n.get('name'):continue
 d=textures[n.get('name')];tex.append({'name':n.get('name'),'index':int(n.get('i')),'diffuse':d.get('Texture'),'normal':d.get('Normalmap'),'source':d})
result={'version':1,'source':lock,'width':width,'height':height,'uvTiling':[float(v) for v in hm.get('uvtiling').split()],'bounds':bounds,'origin':origin,'start':{'x':0,'z':0},'hive':{'x':starts[1][0]-origin[0],'z':origin[1]-starts[1][1]},'heights':heights,'levels':levels,'paint':base64.b64encode(paint[4:]).decode(),'cellFlags':base64.b64encode(flags[32:]).decode(),'ramps':[n.attrib for n in terrain.iter('ramp')],'cliffSets':[n.attrib for n in terrain.iter('cliffSet')],'cliffCells':[n.attrib for n in terrain.iter('cc')],'textures':tex,'placements':placements,'missingModels':missing,'heightCrossCheckMaxDelta':delta,'startPlateauCrossCheckMaxDelta':plateau_delta,'syncHeights':[round(h/256-8,5) for h,c in struct.iter_unpack('<HH',sync[64:])]}
Path('assets/private/maps/map-extracted.json').write_text(json.dumps(result,separators=(',',':')))
Path('assets/private/maps/model-targets.json').write_text(json.dumps(sorted(targets)))
Path('assets/private/maps/missing-models.json').write_text(json.dumps(missing,indent=2))
print(json.dumps({'heightMaxDelta':delta,'placements':len(placements),'modelFiles':len(targets),'missing':sorted(set(m['type'] for m in missing)),'textures':[(t['name'],t['diffuse']) for t in tex],'bounds':bounds}))
