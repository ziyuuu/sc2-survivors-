"""Local-only screenshot pixel comparison for original-map shader changes."""

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path("reports/local/ground-sparse-visual-20260924")


def compare(a: Path, b: Path) -> dict:
    left = np.asarray(Image.open(a).convert("RGB"), dtype=np.int16)
    right = np.asarray(Image.open(b).convert("RGB"), dtype=np.int16)
    if left.shape != right.shape:
        raise ValueError(f"Mismatched captures: {a} {b}")
    difference = np.abs(left - right)
    pixels = np.max(difference, axis=2)
    return {
        "width": int(left.shape[1]),
        "height": int(left.shape[0]),
        "meanAbsoluteChannel": float(difference.mean()),
        "p99Channel": float(np.percentile(difference, 99)),
        "maxChannel": int(difference.max()),
        "pixelsAboveOnePercent": float(np.count_nonzero(pixels > 1) / pixels.size * 100),
    }


results = {}
for stage in (1, 6):
    prefix = f"stage{stage}"
    a = ROOT / f"{prefix}-sparse-a.png"
    b = ROOT / f"{prefix}-sparse-b.png"
    dense = ROOT / f"{prefix}-dense.png"
    results[prefix] = {
        "repeatSparse": compare(a, b),
        "sparseVsDense": compare(b, dense),
    }

(ROOT / "pixel-diff.json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps(results, ensure_ascii=False))
