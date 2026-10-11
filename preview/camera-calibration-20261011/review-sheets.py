"""Indexes of actual saved screenshots; crop/scale transformations are recorded."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/camera-calibration-20261011')
revision = sys.argv[2] if len(sys.argv)>2 else ''
assert revision in ['', 'r2']
out = root / ('visual-review-index'+('-'+revision if revision else ''))
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 15)
sources = json.loads((root / 'comparison-sources.json').read_text(encoding='utf-8'))
pages = []

def read(p):
    return json.loads((root / p).read_text(encoding='utf-8'))

def sheet(name, entries, columns=2, cell=(720,480), details=False):
    image=Image.new('RGB',(columns*cell[0],((len(entries)+columns-1)//columns)*cell[1]),'#101820')
    draw=ImageDraw.Draw(image)
    for i,e in enumerate(entries):
        x,y=(i%columns)*cell[0],(i//columns)*cell[1]
        with Image.open(root/e['file']) as original:
            source=original.convert('RGB')
            if details:
                points=e['projected'];xs=[(p[0]+1)*source.width/2 for p in points];ys=[(1-p[1])*source.height/2 for p in points]
                cx,cy=(min(xs)+max(xs))/2,(min(ys)+max(ys))/2
                w,h=max(300,max(xs)-min(xs)+60),max(240,max(ys)-min(ys)+60)
                box=[max(0,round(cx-w/2)),max(0,round(cy-h/2)),min(source.width,round(cx+w/2)),min(source.height,round(cy+h/2))]
                e['crop']=box;e['nativeBodyPixels']=[round(max(xs)-min(xs)),round(max(ys)-min(ys))]
                source=source.crop(box)
            before=source.size;source.thumbnail((cell[0]-12,cell[1]-48));e['displaySize']=list(source.size);e['scale']=source.width/before[0]
            image.paste(source,(x+6,y+42))
        draw.text((x+8,y+5),e['label'],font=font,fill='#d8e5ee')
        if details:draw.text((x+8,y+23),'native body '+str(e['nativeBodyPixels'])+' px',font=font,fill='#b0bec8')
    file=out/(name+'.jpg');image.save(file,quality=95);pages.append({'file':file.relative_to(root).as_posix(),'entries':entries})

mode=sys.argv[1]
if mode=='matrix':
    for theme in ['industrial','mar-sara','char','ice','frontier','endless']:
        for viewport in ['desktop','portrait','small']:
            entries=[]
            for race in ['terran','zerg','protoss']:
                for side in ['before','after']:
                    folder=sources['matrix'][side];name=f'{theme}-{race}-18-{viewport}-100'
                    entries.append({'label':side+' '+race+' '+viewport,'file':folder+'/'+name+'.png'})
            sheet(theme+'-'+viewport,entries)
elif mode=='identities':
    folder=sources['identities']['after'];report=read(folder+'/results.json');assert report['passed']
    rows=[r for r in report['records'] if r.get('bodyBounds')];assert len(rows)==138
    for start in range(0,len(rows),12):
        entries=[{'label':r['name'],'file':r.get('captureSource',folder)+'/'+r['name']+'.png','projected':r['bodyBounds']['projected']} for r in rows[start:start+12]]
        sheet('identities-'+str(start//12),entries,4,(360,320),True)
elif mode=='edges':
    folder=sources['edges']['after'];report=read(folder+'/results.json');assert report['passed']
    for group in ['thor','ultralisk','carrier','colossus','yamato_battlecruiser','kerrigan','zagara','niadra','hots_leviathan','fenix','purifier_flagship']:
        rows=[r for r in report['records'] if r['name'].startswith(group+'-') and '-portrait-' in r['name'] and (r['name'].endswith('-center') or r['name'].endswith('-right-false')) and r['zoom'] in [.7,1.6]]
        for start in range(0,len(rows),6):sheet(group+'-edges-'+str(start//6),[{'label':r['name'],'file':folder+'/'+r['name']+'.png'} for r in rows[start:start+6]],3,(480,900))
elif mode=='controls':
    folder=sources['controls'][0];report=read(folder+'/result.json');assert report['passed']
    names=[n for n in report['screens'] if n.endswith('-minimap-touch') or n.endswith('-target') or n=='endless-entered']
    for start in range(0,len(names),4):sheet('controls-'+str(start//4),[{'label':folder+' / '+n,'file':folder+'/'+n+'.png'} for n in names[start:start+4]],2,(720,900))
elif mode=='formal':
    entries=[]
    for folder in [sources['zoom'][0], sources['web'], sources['offline']]:
        report=read(folder+'/result.json');assert report['passed']
        names=[n for n in report['screens'] if n.endswith('-default') or n.endswith('-settings-160')] if folder==sources['zoom'][0] else [n for n in report['screens'] if n.endswith('-restored')]
        entries.extend({'label':folder+' / '+n,'file':folder+'/'+n+'.png'} for n in names)
    for start in range(0,len(entries),4):sheet('formal-'+str(start//4),entries[start:start+4],2,(720,900))
elif mode=='videos':
    report=read('gallery-review.json');assert report['passed'] and len(report['frames'])==30
    for start in range(0,30,6):sheet('videos-'+str(start//6),[{'label':r['source'].split('/')[-1]+' '+str(round(r['actual'],2))+'s','file':r['file']} for r in report['frames'][start:start+6]])
elif mode=='videozoom':
    report=read('video-zoom-review/results.json');assert report['passed'] and len(report['frames'])==30
    for start in range(0,30,6):sheet('videozoom-'+str(start//6),[{'label':r['source'].split('/')[-1]+' '+str(r['actual'])+'s','file':r['file']} for r in report['frames'][start:start+6]])
else:raise ValueError(mode)
(out/(mode+'-index.json')).write_text(json.dumps({'method':'Actual screenshots; full images scaled only except identity detail crops with exact rectangles, native body pixel dimensions and scale recorded. Originals remain authoritative. No retouching or synthetic frames.','pages':pages},indent=2),encoding='utf-8')
print(json.dumps({'mode':mode,'pages':len(pages),'images':sum(len(p['entries']) for p in pages)}))
