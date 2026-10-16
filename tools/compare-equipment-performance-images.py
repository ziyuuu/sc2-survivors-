from pathlib import Path
import json
import numpy as np
from PIL import Image

root=Path('reports/local/equipment-fx-performance-20261016')
base=np.asarray(Image.open(root/'perf-baseline-r1/full.png').convert('RGB')).astype(np.int16)
rows=[]
for folder in sorted(root.glob('perf-*')):
    file=folder/'full.png'
    if not file.exists(): continue
    a=np.asarray(Image.open(file).convert('RGB')).astype(np.int16)
    d=np.abs(a-base); mask=d.max(axis=2)>0
    ys,xs=np.where(mask)
    rows.append(dict(candidate=folder.name,changedPixels=int(mask.sum()),maximumChannelDelta=int(d.max()),meanChannelDelta=float(d.mean()),pixelsOver8=int((d.max(axis=2)>8).sum()),bounds=[int(xs.min()),int(ys.min()),int(xs.max()),int(ys.max())] if len(xs) else None))
(root/'performance-image-comparison.json').write_text(json.dumps(dict(method='Exact stored fixed-fixture RGB comparison against R6. Full/medium differences are expected; no rescaling, registration or masking.',rows=rows),indent=2),encoding='utf-8')
print(json.dumps(rows,indent=2))
