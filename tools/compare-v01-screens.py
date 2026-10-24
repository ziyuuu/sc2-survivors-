import json,sys
from pathlib import Path
from PIL import Image,ImageChops
import numpy as np
base=Path('reports/local/v01-20261024');a,b=sys.argv[1:3];rows=[]
for name in ['cycle0-ready','cycle0-stage1-end','cycle0-stage2-end','cycle0-stage3-end']:
    left=Image.open(base/a/(name+'.png')).convert('RGB');right=Image.open(base/b/(name+'.png')).convert('RGB')
    if left.size!=right.size: raise ValueError('size mismatch')
    diff=np.abs(np.asarray(left,dtype=np.int16)-np.asarray(right,dtype=np.int16));changed=np.any(diff>0,axis=2)
    rows.append(dict(name=name,size=left.size,pixels=int(changed.sum()),max=int(diff.max()),mean=float(diff.mean()),bbox=ImageChops.difference(left,right).getbbox()))
out=dict(before=a,after=b,scope='Full screenshots including asynchronous UI and wall-time presentation; a difference alone is not a visual regression.',rows=rows)
(base/b/'screens-comparison.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf8');print(json.dumps(out,ensure_ascii=False))
