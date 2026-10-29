"""Decode both approved music files, measure mastering and the encoded loop seam."""
from pathlib import Path
import json
import re
import subprocess
import numpy as np

root = Path(__file__).resolve().parents[2]
folder = root / 'reports/local/bgm-integration-20261029/audio'
ffmpeg = root / 'sites/v04-compression-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
rendered = json.loads((folder / 'render-result.json').read_text(encoding='utf-8'))
results = []
for track in rendered['tracks']:
    file = root / track['file']
    decoded = subprocess.run([str(ffmpeg), '-hide_banner', '-v', 'error', '-nostdin', '-i', str(file), '-f', 'f32le', '-'], capture_output=True, check=True)
    pcm = np.frombuffer(decoded.stdout, dtype='<f4').reshape((-1, 2))
    assert len(pcm) == track['loopSamples'], (track['id'], len(pcm), track['loopSamples'])
    assert np.isfinite(pcm).all() and np.max(np.abs(pcm)) < 1
    measure = subprocess.run([str(ffmpeg), '-hide_banner', '-nostdin', '-i', str(file), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], capture_output=True, text=True, encoding='utf-8', check=True)
    loudness = json.loads(re.search(r'\{\s*"input_i".*?\}', measure.stderr, re.S).group(0))
    seam = float(np.max(np.abs(pcm[-1]-pcm[0])))
    adjacent = np.abs(np.diff(np.concatenate([pcm[-4410:], pcm[:4410]]), axis=0))
    result = {'id': track['id'], 'seconds': len(pcm)/44100, 'bytes': file.stat().st_size,
              'decodedSamples': len(pcm), 'gaplessSampleCount': True,
              'lufs': float(loudness['input_i']), 'truePeakDbTP': float(loudness['input_tp']),
              'seamStep': seam, 'boundaryNeighborP99Step': float(np.percentile(adjacent, 99)),
              'clipped': False, 'subjectiveOrDeviceAcceptance': False}
    assert result['truePeakDbTP'] < -1.5
    results.append(result)
    print(json.dumps(result))
(folder.parent / 'audio-verification.json').write_text(json.dumps(results, indent=2)+'\n', encoding='utf-8')
