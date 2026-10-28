import json,pathlib,struct,io
from PIL import Image
cfg=json.loads(pathlib.Path('dist/quality-20261028/quality-input.json').read_text('utf8'));rows={r['id']:r for r in cfg['records']};out=pathlib.Path('reports/local/quality-20261028/ktx2');out.mkdir(parents=True,exist_ok=True);samples=[]
def save(name,raw,linear=False):
 im=Image.open(io.BytesIO(raw)).convert('RGBA');im.thumbnail((512,512),Image.Resampling.LANCZOS);im.save(out/(name+'.png'));im.save(out/(name+'.webp'),'WEBP',quality=82,method=4,exact=True);samples.append({'name':name,'width':im.width,'height':im.height,'linear':linear,'webpBytes':(out/(name+'.webp')).stat().st_size})
raw=pathlib.Path(rows['model.marine']['packedFile']).read_bytes();jl=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+jl]);b=raw[28+jl:];tex=j['textures'][j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']['index']];ix=tex.get('source',tex.get('extensions',{}).get('EXT_texture_webp',{}).get('source'));v=j['bufferViews'][j['images'][ix]['bufferView']];save('marine',b[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
for name,id,linear in [('ground','terrain.char',False),('normal','terrain.char.normal',True),('alpha','p4.texture.flare',False),('team','material.team.f7d1886fd7f6fefda012',True)]:save(name,pathlib.Path(rows[id]['packedFile']).read_bytes(),linear)
(out/'samples.json').write_text(json.dumps(samples),'utf8');print(samples)
