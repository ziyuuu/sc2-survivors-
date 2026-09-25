"""Read-only comparison of WebP lossless encoder effort on runtime GLB images."""
import argparse
import glob
import hashlib
import io
import json
import os
import struct
import time
import zlib

from PIL import Image


def images_from_glb(path):
    data = open(path, "rb").read()
    if data[:4] != b"glTF" or struct.unpack_from("<II", data, 4) != (2, len(data)):
        return
    json_length = struct.unpack_from("<I", data, 12)[0]
    doc = json.loads(data[20:20 + json_length])
    binary_start = 20 + json_length + 8
    for image in doc.get("images", []):
        if image.get("mimeType") != "image/png":
            continue
        view = doc["bufferViews"][image["bufferView"]]
        offset = binary_start + view.get("byteOffset", 0)
        yield data[offset:offset + view["byteLength"]]


parser = argparse.ArgumentParser()
parser.add_argument("--limit", type=int, default=12)
args = parser.parse_args()
if not 1 <= args.limit <= 100:
    raise ValueError("limit must be 1..100")
runtime = json.load(open("reports/local/runtime-assets.json", encoding="utf8"))
model_ids = {item["id"] for item in runtime if item["kind"] == "model"}
seen = set()
candidates = []
for path in glob.glob("public/assets/animated/*.glb"):
    model_id = "model." + os.path.basename(path)[len("model."):-len(".glb")]
    if model_id not in model_ids:
        continue
    for png in images_from_glb(path):
        digest = hashlib.sha256(png).hexdigest()
        if digest not in seen:
            seen.add(digest)
            candidates.append((len(png), digest, png))
candidates.sort(reverse=True)
rows = []
started = time.monotonic()
for size, digest, png in candidates[:args.limit]:
    image = Image.open(io.BytesIO(png)).convert("RGBA")
    outputs = {}
    for method in (4, 6):
        encoded = io.BytesIO()
        image.save(encoded, format="WEBP", lossless=True, method=method, exact=True)
        webp = encoded.getvalue()
        if Image.open(io.BytesIO(webp)).convert("RGBA").tobytes() != image.tobytes():
            raise ValueError("Pixel mismatch " + digest)
        outputs[method] = {"bytes": len(webp), "gzipBytes": len(zlib.compress(webp, 9))}
    rows.append({"sha256": digest, "pngBytes": size, "method4": outputs[4], "method6": outputs[6]})
    print(json.dumps({"completed": len(rows), "total": args.limit, "sha256": digest[:12], **outputs}), flush=True)
summary = {
    "sampleImages": len(rows),
    "availableUniqueImages": len(candidates),
    "method4GzipBytes": sum(row["method4"]["gzipBytes"] for row in rows),
    "method6GzipBytes": sum(row["method6"]["gzipBytes"] for row in rows),
    "elapsedSeconds": round(time.monotonic() - started, 1),
    "rows": rows,
}
print(json.dumps(summary), flush=True)
