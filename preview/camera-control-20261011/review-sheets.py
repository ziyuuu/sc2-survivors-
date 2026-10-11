import json,sys
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path('reports/local/camera-control-20261011');out=root/'visual-review-index';out.mkdir(exist_ok=True)
mode=sys.argv[1];
if mode=='edges':
 out=root/'visual-review-edge-r10';out.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',14);pages=[]
def report(label):
 r=json.loads((root/label/'results.json').read_text(encoding='utf-8'));assert r['passed'];return r

def sheet(name,entries,columns=3,cell=(480,360),crop=False):
 im=Image.new('RGB',(columns*cell[0],((len(entries)+columns-1)//columns)*cell[1]),'#101820');d=ImageDraw.Draw(im)
 for i,e in enumerate(entries):
  x,y=(i%columns)*cell[0],(i//columns)*cell[1]
  with Image.open(root/e['file']) as original:
   src=original.convert('RGB');e['sourceSize']=list(src.size)
   if crop:
    points=e['projected'];xs=[(p[0]+1)*src.width/2 for p in points];ys=[(1-p[1])*src.height/2 for p in points];cx,cy=(min(xs)+max(xs))/2,(min(ys)+max(ys))/2;w,h=max(230,max(xs)-min(xs)+65),max(190,max(ys)-min(ys)+65);box=[max(0,round(cx-w/2)),max(0,round(cy-h/2)),min(src.width,round(cx+w/2)),min(src.height,round(cy+h/2))];e['crop']=box;e['nativeBodyPixels']=[round(max(xs)-min(xs)),round(max(ys)-min(ys))];src=src.crop(box)
   before=src.size;src.thumbnail((cell[0]-12,cell[1]-40));e['scale']=src.width/before[0];im.paste(src,(x+6,y+34))
  d.text((x+7,y+5),e['label'],font=font,fill='#d8e5ee')
 file=out/(name+'.jpg');im.save(file,quality=95);pages.append({'file':file.relative_to(root).as_posix(),'entries':entries})
def entry(label,r):return {'file':label+'/'+r['name']+'.png','label':r['name'],**({'projected':r['bodyBounds']['projected']} if r.get('bodyBounds') else {})}
if mode=='matrix':
 label='matrix-r9';r=report(label)
 for theme in ['industrial','mar-sara','char','ice','frontier','endless']:
  for view in ['desktop','portrait']:
   rows=[v for v in r['records'] if v['name'].startswith(theme+'-') and '-'+view+'-' in v['name']];assert len(rows)==9;sheet(theme+'-'+view,[entry(label,v) for v in rows])
elif mode=='identities':
 label='identities-r9';rows=report(label)['records'];assert len(rows)==138
 for start in range(0,len(rows),12):sheet('identities-'+str(start//12),[entry(label,v) for v in rows[start:start+12]],4,(360,300),True)
elif mode=='actors':
 label='actors-r8';rows=report(label)['records']
 for race in ['terran','zerg','protoss']:
  for state in ['full','damaged']:
   selected=[v for v in rows if v['name'].startswith(race+'-') and v['name'].endswith('-'+state)];sheet('actors-'+race+'-'+state,[entry(label,v) for v in selected],3,(480,720))
elif mode=='edges':
 label='edges-r10';rows=report(label)['records']
 for group in ['thor','ultralisk','carrier','colossus','yamato_battlecruiser','hots_leviathan','purifier_flagship']:
  selected=[v for v in rows if v['name'].startswith(group+'-') and '-portrait-' in v['name'] and (v['name'].endswith('center') or v['name'].endswith('right'))];sheet(group+'-edges',[entry(label,v) for v in selected],4,(360,630))
elif mode=='videos':
 r=json.loads((root/'gallery-review.json').read_text(encoding='utf-8'));assert r['passed'];assert len(r['frames'])==20
 for index,video in enumerate(r['videos']):
  frames=[v for v in r['frames'] if v['source']==video['src']];assert len(frames)==4
  sheet('video-'+str(index),[{'file':v['file'],'label':video['src'].split('/')[-1]+' @'+str(v['actual'])+'s'} for v in frames],2,(650,410))
else:raise ValueError(mode)
(out/(mode+'-index.json')).write_text(json.dumps({'method':'Actual saved screenshots, recorded scale only; identity detail crops record the exact rectangle and native body pixels. No retouching or generated pixels. Originals remain authoritative.','pages':pages},indent=2))
print(json.dumps({'mode':mode,'pages':len(pages),'images':sum(len(p['entries']) for p in pages)}))
