"""Read-only measurements of saved browser screenshots, not visual acceptance.

Requires Pillow. Excludes controls; JPEG output and anti-aliasing prevent claims
of native linear/HDR radiometry. Never rewrites or retouches source images.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path(sys.argv[1] if len(sys.argv) > 1 else "reports/local/visual-repair-research-20261008")
pairs = [
    ("03-protoss-current-A", "04-protoss-current-no-bloom", "bloom", (794, 260, 890, 350)),
    ("03-protoss-current-A", "05-protoss-current-B", "material", (794, 260, 890, 350)),
    ("03-protoss-current-A", "06-protoss-full-mesh", "protoss-full-mesh", (0, 56, 1280, 672)),
    ("07-terran-A", "08-terran-full-mesh", "terran-full-mesh", (0, 56, 1280, 672)),
    ("11-ice-A", "12-ice-flat-normal", "ice-normal", (0, 56, 1280, 672)),
    ("11-ice-A", "13-ice-shadow", "ice-shadow", (0, 56, 1280, 672)),
    ("13-ice-shadow", "14-ice-lighting", "ice-lighting", (0, 56, 1280, 672)),
    ("26-protoss-death-12-A", "27-protoss-death-12-no-bloom", "death-bloom", (375, 240, 485, 365)),
    ("26-protoss-death-12-A", "29-protoss-death-zealot-hidden", "death-source", (375, 240, 485, 365)),
    ("27-protoss-death-12-no-bloom", "30-protoss-death-direct-output", "output-path", (0, 56, 1280, 672)),
]

def stats(im):
    r, g, b = im.split()
    minimum = ImageChops.darker(ImageChops.darker(r, g), b)
    hist = minimum.histogram()
    return {"nearWhitePixels": sum(hist[240:]), "nearWhiteFraction": sum(hist[240:]) / (im.width * im.height), "meanRGB": ImageStat.Stat(im).mean}

rows = []
for before, after, name, roi in pairs:
    first = Image.open(root / (before + ".jpg")).convert("RGB")
    second = Image.open(root / (after + ".jpg")).convert("RGB")
    assert first.size == second.size == (1280, 720)
    left = json.loads((root / (before + ".json")).read_text(encoding="utf-8"))
    right = json.loads((root / (after + ".json")).read_text(encoding="utf-8"))
    assert left["state"] == right["state"] and left["scene"] == right["scene"]
    a, b = first.crop(roi), second.crop(roi)
    rows.append({"case": name, "before": before, "after": after, "scene": left["scene"], "state": left["state"], "roi": roi, "beforeStats": stats(a), "afterStats": stats(b), "meanAbsoluteByteDifference": sum(ImageStat.Stat(ImageChops.difference(a, b)).mean) / 3})

result = {"method": "Same frozen state and 1280x720 browser images. Near-white means all encoded JPEG RGB channels >=240 inside the stated ROI; a diagnostic proxy, not an exposure or quality gate.", "rows": rows}
(root / "image-metrics.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
print(json.dumps([{ "case": r["case"], "whiteBefore": r["beforeStats"]["nearWhitePixels"], "whiteAfter": r["afterStats"]["nearWhitePixels"], "meanDifference": r["meanAbsoluteByteDifference"]} for r in rows], ensure_ascii=False))
