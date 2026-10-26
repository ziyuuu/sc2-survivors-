"""Deduplicate current generated prototype data against the verified asset map."""
import base64, hashlib, json, pathlib, re
root=pathlib.Path('.cache/t01-gallery-20261025/prototype-export')
manifest=json.loads(pathlib.Path('reports/local/t01-20261024/web/asset-manifest.json').read_text(encoding='utf8'))['assets']
by_hash={v['sha256']:k for k,v in manifest.items()}
cache={}
def replace(match):
    value=match.group(0)
    if value in cache: return cache[value]
    try:
        key=by_hash.get(hashlib.sha256(base64.b64decode(value.split(',',1)[1])).hexdigest())
        result='t01-asset:'+key if key else value
    except Exception: result=value
    cache[value]=result
    return result
decoder=json.JSONDecoder(); buffer=''; count=0
with (root/'templates.json').open(encoding='utf8') as source,(root/'templates.compact.json').open('w',encoding='utf8') as target:
    target.write('[')
    while True:
        chunk=source.read(1024*1024)
        buffer+=chunk
        while True:
            buffer=buffer.lstrip(' \r\n\t,[')
            if not buffer or buffer.startswith(']'): break
            try: row,end=decoder.raw_decode(buffer)
            except json.JSONDecodeError: break
            buffer=buffer[end:]
            row['html']=re.sub(r'data:[\w.+/-]+;base64,[A-Za-z0-9+/=]+',replace,row['html'])
            row['assets']=sorted(set(re.findall(r't01-asset:([\w.:-]+)',row['html'])))
            if count: target.write(',')
            json.dump(row,target,ensure_ascii=False,separators=(',',':'));count+=1
        if not chunk: break
    target.write(']')
assert buffer.strip() in ('',']'), 'Unconsumed input'
(root/'templates.compact.json').replace(root/'templates.json')
print(json.dumps({'templates':count,'bytes':(root/'templates.json').stat().st_size,'assetDataDeduplicated':sum(v.startswith('t01-asset:') for v in cache.values())}))
