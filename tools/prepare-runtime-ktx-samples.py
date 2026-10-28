"""Extract actual medium-tier pixels for GPU-compression comparisons, without resizing."""
import gzip, hashlib, io, json, pathlib, struct, sys
from PIL import Image
root=pathlib.Path(sys.argv[1]);out=pathlib.Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
release=json.loads((root/'web-release.json').read_text('utf8'));manifest=json.loads((root/release['manifest']).read_text('utf8'))
index=json.loads((root/'sites-pack-index.js').read_text('utf8').removeprefix('self.SC2_PACK_INDEX=').rstrip(';\n'))
samples=[]
for name,id,image,linear in [('hellbat-normal','model.hellion.hellbat',1,True),('hellbat-specular','model.hellion.hellbat',2,False),('thor-normal','model.thor',1,True),('marine-color','model.marine',0,False),('ground','terrain.char',None,False),('effect','combat-fx.texture.933d2812729ce227617f2327',None,False)]:
    row=manifest['assets'][id];row=row.get('variants',{}).get('medium',row)
    namepack,offset,length,mime,compressed=index[row['url']]
    with (root/'assets'/namepack).open('rb') as f:f.seek(offset);data=f.read(length)
    if compressed:data=gzip.decompress(data)
    assert len(data)==row['bytes'] and hashlib.sha256(data).hexdigest()==row['sha256']
    if image is not None:
        size=struct.unpack_from('<I',data,12)[0];j=json.loads(data[20:20+size]);v=j['bufferViews'][j['images'][image]['bufferView']];start=28+size+v.get('byteOffset',0);data=data[start:start+v['byteLength']]
    (out/(name+'.webp')).write_bytes(data)
    im=Image.open(io.BytesIO(data)).convert('RGBA');im.save(out/(name+'.png'))
    samples.append({'name':name,'id':id,'image':image,'linear':linear,'width':im.width,'height':im.height,'webpBytes':len(data),'sourceHash':hashlib.sha256(data).hexdigest()})
(out/'samples.json').write_text(json.dumps(samples,indent=2),'utf8');print(json.dumps(samples))
