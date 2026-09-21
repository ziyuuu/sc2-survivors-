"""Original cliff variants: absolute corner levels, original rotation and cliff material family."""
from pathlib import Path
import json,math,collections
p=Path('assets/private/maps/map-extracted.json');m=json.loads(p.read_text());W,H=m['width'],m['height'];files=json.loads(Path('assets/private/maps/casc-files.json').read_text(encoding='utf-8-sig'));indexed={f.split('/')[-1].lower():f for f in reversed(files) if f.startswith('mods/liberty.sc2mod/')}
families={0:('CliffMade13',-12,'labcliff1_material'),1:('CliffNatural0Ex1',-8,'marsaraex2_cliff0_material'),2:('CliffMade0Ex1',-8,'marsaraex2_cliff1_material')};cliffs=[];missing=[];targets=set(json.loads(Path('assets/private/maps/model-targets.json').read_text()));fallbacks=[]
for cell in m['cliffCells']:
 i=int(cell['i']);x=(i%((W-1)//2))*2;y=(i//((W-1)//2))*2
 if x+2>=W or y+2>=H:continue
 code=''.join(chr(65+m['levels'][cy*W+cx]) for cx,cy in [(x,y),(x+2,y),(x+2,y+2),(x,y+2)])
 if len(set(code))==1:continue
 family,base,material=families[int(cell['cid'])];variant=int(cell['cvar']);found=None
 for v in dict.fromkeys([variant,0]):
  for r in range(4):
   name=(family+'_'+code[r:]+code[:r]+'_'+str(v).zfill(2)+'.m3').lower()
   if name in indexed:found=(indexed[name],r,v);break
  if found:break
 if not found:missing.append({'cell':i,'pattern':code,'family':family,'variant':variant});continue
 path,r,actual=found;targets.add(path)
 lowest=min(ord(c)-65 for c in code);base=base if lowest==0 else (lowest-1)*2
 if actual!=variant:fallbacks.append({'cell':i,'requested':variant,'used':actual,'pattern':code})
 cliffs.append({'type':family,'assetId':'model.map.'+path.split('/')[-1][:-3].lower(),'sourcePath':path,'position':[x+1,y+1,base+8],'rotation':r*math.pi/2,'scale':[1,1,1],'unit':False,'cell':i,'pattern':code,'variant':actual})
for family,base,material in families.values():targets.add(indexed[material+'.m3'])
m['cliffs']=cliffs;m['cliffVariantFallbacks']=fallbacks;m['missingCliffs']=missing;p.write_text(json.dumps(m,separators=(',',':')))
Path('assets/private/maps/model-targets.json').write_text(json.dumps(sorted(targets)))
models=sorted({(p['assetId'],p['assetId'].removeprefix('model.map.')) for p in m['placements']+cliffs if p.get('assetId')})
Path('tools/map-models.json').write_text(json.dumps(models,indent=2)+'\n')
print(json.dumps({'cliffs':len(cliffs),'models':len(models),'missing':missing,'originalVariantFallbacks':len(fallbacks)}))
if missing:raise SystemExit(1)
