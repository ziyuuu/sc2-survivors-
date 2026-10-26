import json,sys,math,gzip
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
base=Path('reports/local/t01-20261024').resolve()
root=(base/(sys.argv[1] if len(sys.argv)>1 else 'actions-r1')).resolve()
assert base in root.parents
full=len(sys.argv)>2 and sys.argv[2]=='full'
paged=len(sys.argv)>2 and sys.argv[2]=='paged'
focus=len(sys.argv)>2 and sys.argv[2]=='focus'
out=root/('review-pages' if paged else 'review-focus' if focus else 'review-full' if full else 'review');out.mkdir(exist_ok=True)
report=json.loads((root/'report.json').read_text(encoding='utf-8'))
font=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',15)
index=[]
selected=set(map(int,sys.argv[3].split(','))) if len(sys.argv)>3 else None
for number,row in enumerate(report['rows'],1):
    if selected is not None and number not in selected:continue
    if row['status']=='running':continue
    folder=Path(report.get('evidenceRoot',root))/row['directory']
    evidence_path=folder/report.get('evidenceFile','evidence.json')
    evidence=json.loads(gzip.decompress(evidence_path.read_bytes()).decode('utf-8') if evidence_path.suffix=='.gz' else evidence_path.read_text(encoding='utf-8'))
    immediate=row['status']=='receipt-captured'
    frames=[{'file':evidence.get('readyFile','000-ready.png'),'actual':0},*evidence['frames']]
    if immediate:frames.append({'file':evidence.get('receiptFile','001-receipt.png'),'actual':evidence.get('after',{}).get('elapsed',0)})
    if focus:
        # Every captured frame remains in chronological order. This is a
        # detail aid for the established horizontal hero fixture, never a
        # substitute for full viewport inspection where an effect is clipped.
        crop=tuple(map(int,sys.argv[4].split(','))) if len(sys.argv)>4 else (450,150,1300,680)
        assert len(crop)==4 and 0<=crop[0]<crop[2]<=1440 and 0<=crop[1]<crop[3]<=900
        tile_height=round(400*(crop[3]-crop[1])/(crop[2]-crop[0]));row_height=tile_height+21
        sheet=Image.new('RGB',(2000,40+math.ceil(len(frames)/5)*row_height),'#12171e');draw=ImageDraw.Draw(sheet)
        draw.text((10,10),row['id']+' | ALL '+str(len(frames))+' FRAMES | CROP '+str(crop),font=font,fill='white')
        for i,frame in enumerate(frames):
            with Image.open(folder/frame['file']) as im:sheet.paste(im.crop(crop).resize((400,tile_height)),((i%5)*400,40+(i//5)*row_height))
            actual=frame.get('actual',frame.get('state',{}).get('elapsed',frame.get('at',0)))
            draw.text(((i%5)*400+5,40+(i//5)*row_height+tile_height+1),str(round(actual,3))+' s',font=font,fill='white')
        dest=out/(row['directory']+'.jpg');sheet.save(dest,quality=94)
        index.append({'id':row['id'],'number':number,'frames':len(frames),'crop':crop,'contact':str(dest),'original':str(folder),'visualReview':'pending'})
        continue
    if paged:
        pages=[]
        for start in range(0,len(frames),8):
            batch=frames[start:start+8]
            sheet=Image.new('RGB',(1440,40+math.ceil(len(batch)/2)*478),'#12171e');draw=ImageDraw.Draw(sheet)
            draw.text((10,10),row['id']+' | '+str(start+1)+'-'+str(start+len(batch))+'/'+str(len(frames)),font=font,fill='white')
            for i,frame in enumerate(batch):
                source=folder/frame['file']
                if not source.exists():raise FileNotFoundError(source)
                with Image.open(source) as image:
                    # Preserve the full viewport on every page so large AOE,
                    # child bodies and end-of-cycle motion are not cropped.
                    tile=image.resize((720,450));x=(i%2)*720;y=40+(i//2)*478;sheet.paste(tile,(x,y))
                    actual=frame.get('actual',frame.get('state',{}).get('elapsed',frame.get('at',0)))
                    draw.text((x+8,y+451),str(round(actual,3))+' s | '+frame['file'],font=font,fill='white')
            dest=out/(row['directory']+'-'+str(start//8+1)+'.jpg');sheet.save(dest,quality=93);pages.append(str(dest))
        index.append({'id':row['id'],'number':number,'frames':len(frames),'pages':pages,'original':str(folder),'visualReview':'pending'})
        continue
    sheet=Image.new('RGB',(1920,40+math.ceil(len(frames)/4)*445),'#12171e');draw=ImageDraw.Draw(sheet)
    draw.text((10,10),row['id'],font=font,fill='white')
    for i,frame in enumerate(frames):
        p=folder/frame['file']
        if not p.exists():continue
        with Image.open(p) as image:
            # Keep the whole central engagement; original full viewport frames
            # remain alongside this inspection contact sheet.
            tile=image.resize((480,300)) if immediate or full else image.crop((350,40,1090,690)).resize((480,422))
            x=(i%4)*480;y=40+(i//4)*445;sheet.paste(tile,(x,y))
            actual=frame.get('actual',frame.get('state',{}).get('elapsed',frame.get('at',0)))
            draw.text((x+8,y+422),str(round(actual,3))+' s',font=font,fill='white')
    dest=out/(row['directory']+'.jpg');sheet.save(dest,quality=93)
    index.append({'id':row['id'],'contact':str(dest),'original':str(folder),'visualReview':'pending'})
index_file=out/'index.json'
if selected is not None and index_file.exists():
    refreshed={item['id'] for item in index}
    previous=json.loads(index_file.read_text(encoding='utf-8'))
    index=[item for item in previous if item['id'] not in refreshed]+index
    order={row['id']:i for i,row in enumerate(report['rows'])}
    index.sort(key=lambda item:order[item['id']])
index_file.write_text(json.dumps(index,indent=2),encoding='utf-8')
print(json.dumps({'sheets':len(index),'out':str(out)}))
