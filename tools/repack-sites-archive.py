"""Losslessly recompress an official Sites tar.gz; no source or resource edits."""
import gzip, hashlib, json, lzma, pathlib, sys, time
source, target = map(pathlib.Path, sys.argv[1:3])
assert source.resolve() != target.resolve()
filters = [{'id': lzma.FILTER_LZMA2, 'preset': 1, 'dict_size': 512 * 1024**2,
            'mode': lzma.MODE_FAST, 'mf': lzma.MF_HC4, 'nice_len': 128, 'depth': 64}]
digest = hashlib.sha256()
total = 0
started = last = time.monotonic()
with gzip.open(source, 'rb') as original, lzma.open(target, 'wb', filters=filters) as output:
    while block := original.read(4 * 1024**2):
        digest.update(block)
        total += len(block)
        output.write(block)
        if time.monotonic() - last > 15:
            print(json.dumps({'tarBytesRead': total, 'archiveBytesWritten': target.stat().st_size}), flush=True)
            last = time.monotonic()
verified = hashlib.sha256()
with lzma.open(target, 'rb') as archive:
    while block := archive.read(4 * 1024**2):
        verified.update(block)
assert verified.digest() == digest.digest(), 'Uncompressed tar content differs'
result = {'sourceBytes': source.stat().st_size, 'outputBytes': target.stat().st_size,
          'tarBytes': total, 'tarSha256': digest.hexdigest(), 'tarIdentical': True,
          'seconds': round(time.monotonic() - started, 2)}
target.with_suffix(target.suffix + '.json').write_text(json.dumps(result, indent=2), encoding='utf8')
print(json.dumps(result), flush=True)
