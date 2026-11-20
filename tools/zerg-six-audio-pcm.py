"""Convert a pinned original bank sample to browser PCM without editing it."""
import io
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / ".cache" / "audio-python"))
import numpy as np
import soundfile as sf

audio, rate = sf.read(sys.argv[1], dtype="int16", always_2d=True)
if not len(audio) or rate < 8000:
    raise ValueError("Invalid original sound")
output = io.BytesIO()
sf.write(output, audio, rate, subtype="PCM_16", format="WAV")
output.seek(0)
decoded, decoded_rate = sf.read(output, dtype="int16", always_2d=True)
if decoded_rate != rate or not np.array_equal(audio, decoded):
    raise ValueError("PCM round-trip changed samples")
sys.stdout.buffer.write(output.getvalue())
