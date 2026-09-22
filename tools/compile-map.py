"""Build deterministic walk/opening grids from the original map; retains exact horizontal scale."""
from pathlib import Path
import json,math,base64,collections,heapq,re
m=json.loads(Path('assets/private/maps/map-extracted.json').read_text());W,H=m['width'],m['height'];w,h=(W-1)*2,(H-1)*2;step=.5;N=w*h
paint=base64.b64decode(m['paint']);heights=m['heights'];ox,oy,_=m['origin'];xmin,ymin,xmax,ymax=m['bounds']
def height(x,y):
 x=max(0,min(W-1.0001,x));y=max(0,min(H-1.0001,y));ix,iy=int(x),int(y);fx,fy=x-ix,y-iy;i=iy*W+ix
 return (heights[i]*(1-fx)+heights[i+1]*fx)*(1-fy)+(heights[i+W]*(1-fx)+heights[i+W+1]*fx)*fy
walk=bytearray(N)
for y in range(h):
 for x in range(w):
  px,py=(x+.5)*step,(y+.5)*step
  if not (xmin+.3<px<xmax-.3 and ymin+.3<py<ymax-.3):continue
  # Pnp contains two painted passability bits per half-unit quadrant; bit 0 disables ground.
  quadrant=(x%2)+(y%2)*2
  if (paint[(y//2)*(W-1)+x//2]>>(quadrant*2))&1:continue
  center=height(px,py)
  if max(abs(height(px+dx*.4,py+dy*.4)-center) for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)])>.47:continue
  walk[y*w+x]=1
# Explicit original pathing blockers plus static resource/building footprints. Decorative nonblocking actors stay decorative.
for p in m['placements']:
 size=p.get('blockerSize');foot=p.get('footprint') or '';match=re.search(r'(\d+)x(\d+)',foot)
 if size:sx=sy=float(size)
 elif match:sx,sy=map(float,match.groups())
 elif p.get('unit'):
  sx,sy=(2,1) if 'Mineral' in p['type'] else (3,3) if 'Geyser' in p['type'] else (4,4)
 else:continue
 x,y,_=p['position'];scale=p.get('scale',[1,1,1]);sx*=scale[0];sy*=scale[1];a=p.get('rotation',0);c,s=math.cos(a),math.sin(a);extent=max(sx,sy)
 for gy in range(max(0,int((y-extent)*2)),min(h,int((y+extent)*2)+1)):
  for gx in range(max(0,int((x-extent)*2)),min(w,int((x+extent)*2)+1)):
   dx,dy=(gx+.5)*step-x,(gy+.5)*step-y
   if abs(c*dx+s*dy)<sx/2 and abs(-s*dx+c*dy)<sy/2:walk[gy*w+gx]=0
# Chamfer clearance, conservative near diagonal blockers; no O(N²) body scanning.
clearance=[999.0 if v else 0.0 for v in walk]
for sweep in [range(N),range(N-1,-1,-1)]:
 forward=sweep.start==0
 for i in sweep:
  x,y=i%w,i//w
  for dx,dy,cost in ([(-1,0,.5),(0,-1,.5),(-1,-1,.7071),(1,-1,.7071)] if forward else [(1,0,.5),(0,1,.5),(1,1,.7071),(-1,1,.7071)]):
   nx,ny=x+dx,y+dy
   if 0<=nx<w and 0<=ny<h:clearance[i]=min(clearance[i],clearance[ny*w+nx]+cost)
# One connected mother region, geodesic opening retains every old cell and complete ramps.
start=min((i for i,v in enumerate(walk) if v and clearance[i]>1.5),key=lambda i:math.hypot((i%w+.5)*step-ox,(i//w+.5)*step-oy));dist={start:0.0};heap=[(0.0,start)]
while heap:
 cost,i=heapq.heappop(heap)
 if cost!=dist[i]:continue
 x,y=i%w,i//w
 for dx,dy,c in [(1,0,.5),(-1,0,.5),(0,1,.5),(0,-1,.5),(1,1,.7071),(1,-1,.7071),(-1,1,.7071),(-1,-1,.7071)]:
  nx,ny=x+dx,y+dy;j=ny*w+nx
  if not(0<=nx<w and 0<=ny<h and walk[j]):continue
  if dx and dy and not(walk[y*w+nx] and walk[ny*w+x]):continue
  n=cost+c
  if n<dist.get(j,math.inf):dist[j]=n;heapq.heappush(heap,(n,j))
ordered=sorted(dist,key=lambda i:(dist[i],i));opening=[0]*N;ratios=[(n/112)**2 for n in [28,36,44,52,60,68,76,84,92,100,104,112]]
for j,i in enumerate(ordered):opening[i]=next(k+1 for k,f in enumerate(ratios) if (j+1)/len(ordered)<=f)
# Any intersecting ramp opens as a whole including approach pads. Opening earlier never locks an old route.
for ramp in m['ramps']:
 nums=[float(v) for v in re.findall(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?',ramp['mid'])];ux,uy,rx,ry,cx,cy,rw,rh=nums;cells=[]
 for gy in range(max(0,int((cy-8)*2)),min(h,int((cy+8)*2)+1)):
  for gx in range(max(0,int((cx-8)*2)),min(w,int((cx+8)*2)+1)):
   dx,dy=(gx+.5)*step-cx,(gy+.5)*step-cy;i=gy*w+gx
   if opening[i] and abs(dx*rx+dy*ry)<rw/2+.75 and abs(dx*ux+dy*uy)<rh/2+2:cells.append(i)
 if cells:
  first=min(opening[i] for i in cells)
  for i in cells:opening[i]=min(opening[i],first)
# Mark nonwalkable surface cells by nearest reachable cell so locked cliff art shares the same stage reveal.
reveal=opening.copy();queue=collections.deque(i for i in ordered)
while queue:
 i=queue.popleft();x,y=i%w,i//w
 for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
  nx,ny=x+dx,y+dy;j=ny*w+nx
  if 0<=nx<w and 0<=ny<h and not reveal[j]:reveal[j]=reveal[i];queue.append(j)
m.update({'cellSize':step,'walkWidth':w,'walkHeight':h,'walk':list(walk),'clearance':[round(v,3) for v in clearance],'opening':opening,'reveal':reveal,'stageAreas':[sum(v and v<=s for v in opening)*.25 for s in range(1,13)]})
for k in ['paint','cellFlags','textures','missingModels','cliffCells']:m.pop(k,None)
Path('assets/private/maps/map-runtime.json').write_text(json.dumps(m,separators=(',',':')))
Path('reports/local/map-extraction.json').write_text(json.dumps({'source':m['source'],'placements':len(m['placements']),'cliffInstances':len(m.get('cliffs',[])),'bounds':m['bounds'],'start':m['origin'],'hive':m['hive'],'connectedCells':len(ordered),'stageAreas':m['stageAreas'],'startClearance':clearance[start],'startHeight':height(ox,oy),'startPlateauDelta':m['startPlateauCrossCheckMaxDelta'],'globalSyncDifference':m['heightCrossCheckMaxDelta'],'note':'The original sync grid includes cliff welding. Global render/sync deltas are retained, not asserted away. Runtime uses shared rendered floor heights; original-client pathing comparison is separate.'},indent=2))
assert len(ordered)>5000,'Mother map is not sufficiently connected'
assert all(a<b for a,b in zip(m['stageAreas'],m['stageAreas'][1:])),'Openings do not grow'
print(json.dumps({'connected':len(ordered),'stageAreas':m['stageAreas'],'startHeight':height(ox,oy),'startClearance':clearance[start]}))
