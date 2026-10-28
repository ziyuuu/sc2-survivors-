"""Choose measured, large, tier-invariant normal/specular images only.
No image resize, GLB rewrite, model/animation edit, or private-source upload.
"""
import gzip, hashlib, io, json, pathlib, struct, sys
from PIL import Image
root,out,inventory=map(pathlib.Path,sys.argv[1:4]);out.mkdir(parents=True,exist_ok=True)
release=json.loads((root/'web-release.json').read_text('utf8'));manifest=json.loads((root/release['manifest']).read_text('utf8'))
index=json.loads((root/'sites-pack-index.js').read_text('utf8').removeprefix('self.SC2_PACK_INDEX=').rstrip(';\n'))
samples={};models={}
def model(row):
    if row['sha256'] in models:return models[row['sha256']]
    pack,offset,length,_,compressed=index[row['url']]
    with (root/'assets'/pack).open('rb') as f:f.seek(offset);raw=f.read(length)
    if compressed:raw=gzip.decompress(raw)
    assert len(raw)==row['bytes'] and hashlib.sha256(raw).hexdigest()==row['sha256']
    length=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+length]);binary=raw[28+length:]
    models[row['sha256']]=(j,binary);return j,binary
for measured in json.loads(inventory.read_text('utf8'))['textures']:
    id=measured['id'];image=measured.get('image')
    if image is None or measured.get('width',0)*measured.get('height',0)<512*512:continue
    row=manifest['assets'][id];tiers=[row,row.get('variants',{}).get('medium',row),row.get('variants',{}).get('low',row)]
    identities=[r.get('imageSources',[])[image] for r in tiers]
    if not all(identities) or len({i['hash'] for i in identities})!=1:continue
    current=tiers[1];j,binary=model(current)
    def source(info):
        if not info:return None
        t=j['textures'][info['index']];return t.get('source',t.get('extensions',{}).get('EXT_texture_webp',{}).get('source'))
    roles=set()
    for m in j.get('materials',[]):
        for role,info in [('normal',m.get('normalTexture')),('specular',m.get('extensions',{}).get('KHR_materials_specular',{}).get('specularColorTexture')),('color',m.get('pbrMetallicRoughness',{}).get('baseColorTexture')),('emissive',m.get('emissiveTexture'))]:
            if source(info)==image:roles.add(role)
        for layer in m.get('extras',{}).get('sc2',{}).get('layers',[]):
            if 'index' in layer and source(layer)==image:roles.add(layer['role'])
    if roles not in ({'normal'},{'specular'}):continue
    v=j['bufferViews'][j['images'][image]['bufferView']];start=v.get('byteOffset',0);raw=binary[start:start+v['byteLength']];h=hashlib.sha256(raw).hexdigest();assert h==identities[0]['hash']
    if h in samples:
        samples[h]['uses'].append({'id':id,'image':image});continue
    im=Image.open(io.BytesIO(raw)).convert('RGBA');im.save(out/(h+'.png'));(out/(h+'.webp')).write_bytes(raw)
    samples[h]={'name':h,'sourceHash':h,'width':im.width,'height':im.height,'linear':'normal' in roles,'roles':list(roles),'uses':[{'id':id,'image':image}],'sourceBytes':len(raw)}
result=list(samples.values());(out/'samples.json').write_text(json.dumps(result,indent=2),'utf8')
print(json.dumps({'images':len(result),'sourceRGBAWithMipsMB':sum(s['width']*s['height']*16/3 for s in result)/1e6,'sourceBytes':sum(s['sourceBytes'] for s in result),'unchangedDimensions':True}))
