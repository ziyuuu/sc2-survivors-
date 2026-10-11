"""Downscaled indexes of recorded screenshots and decoded video frames, never retouched."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('reports/local/terrain-batch4-20261011')
out = root / 'visual-review-index'
out.mkdir(exist_ok=True)
font = ImageFont.truetype('C:/Windows/Fonts/consola.ttf', 16)
pages = []


def read(file):
    return json.loads((root / file).read_text(encoding='utf-8'))


def sheet(name, entries, columns=2, cell=(720, 480)):
    image = Image.new('RGB', (columns * cell[0], ((len(entries)+columns-1)//columns)*cell[1]), '#101820')
    draw = ImageDraw.Draw(image)
    for i, entry in enumerate(entries):
        x, y = (i % columns)*cell[0], (i//columns)*cell[1]
        draw.text((x+8,y+8), entry['label'], font=font, fill='#d8e5ee')
        with Image.open(root / entry['file']) as source:
            source.thumbnail((cell[0]-12,cell[1]-36))
            image.paste(source.convert('RGB'),(x+6,y+30))
    file=out/(name+'.jpg')
    image.save(file,quality=95)
    pages.append({'file':file.relative_to(root).as_posix(),'entries':entries})


mode=sys.argv[1] if len(sys.argv)>1 else 'stage'
if mode=='stage':
    for theme in ['industrial','mar-sara','char','ice','frontier']:
        entries=[]
        for race in ['terran','zerg','protoss']:
            name=f'{theme}-density-{race}-18-stage-18-desktop'
            for side in ['before','after']:
                entries.append({'label':side+' '+race+' stage18','file':side+'-final-stage/'+name+'.png'})
        sheet(theme+'-desktop',entries)
        entries=[]
        for viewport in ['landscape','portrait','small']:
            name=f'{theme}-density-protoss-18-stage-1-{viewport}'
            for side in ['before','after']:
                entries.append({'label':side+' '+viewport+' stage1','file':side+'-final-stage/'+name+'.png'})
        sheet(theme+'-narrow',entries)
elif mode=='maps':
    r=read('after-final-maps/results.json')
    assert r['passed'] is True
    for theme in ['industrial','mar-sara','char','ice','frontier']:
        selected=[row for row in r['records'] if row['theme']==theme]
        for start in range(0,len(selected),8):
            sheet(theme+'-identities-'+str(start//8),[{'label':row['name'],'file':'after-final-maps/'+row['name']+'.png'} for row in selected[start:start+8]],cell=(640,430))
elif mode=='videos':
    r=read('gallery-review.json')
    assert r['passed'] is True and len(r['frames'])==30
    for start in range(0,30,6):
        sheet('videos-'+str(start//6),[{'label':f['source'].removeprefix('after-final-realtime/')+' / '+str(round(f['actual'],2))+'s','file':f['file']} for f in r['frames'][start:start+6]])
elif mode=='dense':
    for theme in ['industrial','mar-sara','char','ice','frontier']:
        entries=[]
        for race in ['terran','zerg','protoss']:
            for side in ['before','after']:
                entries.append({'label':side+' '+race+' dense','file':f'{side}-final-dense/{theme}-{race}-dense-combat-6.png'})
        sheet(theme+'-dense',entries)
elif mode=='edge':
    r=read('after-final-edge/results.json')
    assert r['passed'] is True
    for start in range(0,len(r['records']),3):
        entries=[]
        for row in r['records'][start:start+3]:
            for side in ['before','after']:
                entries.append({'label':side+' '+row['name'],'file':side+'-final-edge/'+row['name']+'.png'})
        sheet('edge-'+str(start//3),entries)
elif mode=='industrial':
    r=read('after-final-industrial/results.json')
    assert r['passed'] is True
    for start in range(0,len(r['records']),4):
        entries=[{'label':row['name'],'file':'after-final-industrial/'+row['name']+'.png'} for row in r['records'][start:start+4]]
        sheet('industrial-steps-'+str(start//4),entries)
elif mode=='sequence':
    for group in ['marine','baneling','immortal','zealot']:
        entries=[]
        for state in ['idle-03','move-11','attack-06']:
            for side in ['before','after']:
                name=group+'-'+state
                entries.append({'label':side+' '+name,'file':side+'-final-sequence/'+name+'.png'})
        sheet('sequence-'+group,entries)
elif mode=='char-final':
    for suite in ['stage','maps','dense']:
        report=read('after-fixed-char-'+suite+'/results.json')
        assert report['passed'] is True
        selected=report['records']
        if suite=='stage':
            selected=[r for r in selected if ('stage-18-desktop' in r['name'] and 'terrain-empty' not in r['name']) or ('density-protoss-18-stage-1-' in r['name'] and 'desktop' not in r['name'])]
        elif suite=='dense':
            selected=[r for r in selected if r['name'].endswith('dense-combat-6')]
        entries=[]
        for row in selected:
            if suite!='maps':
                entries.append({'label':'baseline '+row['name'],'file':'before-final-'+suite+'/'+row['name']+'.png'})
            entries.append({'label':'final alpha '+row['name'],'file':'after-fixed-char-'+suite+'/'+row['name']+'.png'})
        step=8 if suite=='maps' else 6
        for start in range(0,len(entries),step):
            sheet('char-final-'+suite+'-'+str(start//step),entries[start:start+step])
else:
    raise ValueError('Unknown review subset')
(out/(mode+'-index.json')).write_text(json.dumps({'method':'Original complete images downscaled only; raw images remain authoritative. No crop, retouching or fabricated frames.','pages':pages},indent=2),encoding='utf-8')
print(json.dumps({'mode':mode,'pages':len(pages),'images':sum(len(p['entries']) for p in pages)}))
