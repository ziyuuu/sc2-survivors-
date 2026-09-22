"""Compare locally saved frames; no image contents leave this machine."""
import json, os
from pathlib import Path
from PIL import Image, ImageChops, ImageStat
out=Path(os.environ.get('SC2_CULL_OUT','reports/local/qa-v14-culling'))
r=json.loads((out/'REPORT.json').read_text(encoding='utf-8'))
failed=[]
for row in r['cases']:
 a=Image.open(out/(row['name']+'-culled.png')).convert('RGB')
 b=Image.open(out/(row['name']+'-all.png')).convert('RGB')
 diff=ImageChops.difference(a,b)
 hist=diff.histogram()
 maximum=max(i%256 for i,n in enumerate(hist) if n)
 stats=ImageStat.Stat(diff)
 row['comparison']={'maxChannelDifference':maximum,'meanChannelDifference':stats.mean,'exactlyIdentical':maximum==0}
 if maximum>1:failed.append(row['name'])
r['pixelComparison']={'cases':len(r['cases']),'failed':failed,'tolerancePerChannel':1,'method':'Pillow local RGB absolute difference. No masks, resized inputs or ignored regions.'}
(out/'REPORT.json').write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(r['pixelComparison']))
raise SystemExit(bool(failed))
