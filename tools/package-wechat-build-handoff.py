"""Package only the files needed to rebuild the WeChat preflight and stage CDN assets.

This is deliberately not an archive of original SC sources, duplicate web
builds, local QA recordings, dependencies or development caches.
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "SC2-WeChat-Build-Handoff.zip"
TEMP = OUTPUT.with_suffix(".zip.part")
DIRS = ("src", "dist/web/assets", "dist/wechat-preflight")
FILES = (
    "package.json", "package-lock.json", "tsconfig.json", "vite.config.ts",
    "tools/build-wechat-assets.mjs", "tools/build-wechat-preflight.mjs",
    "tools/package-wechat-build-handoff.py",
    "test/wechat-platform.test.ts", "public/assets/map/kairos.json",
    "reports/local/asset-reachability.json", "reports/local/runtime-assets.json",
    "docs/project/WECHAT_WORKBUDDY_HANDOFF.md",
    "docs/project/WECHAT_MINIGAME_ADAPTATION.md",
)


def selected() -> list[Path]:
    items = {ROOT / name for name in FILES}
    for name in DIRS:
        folder = ROOT / name
        if not folder.is_dir():
            raise FileNotFoundError(name)
        for base, dirs, names in os.walk(folder):
            dirs[:] = sorted(d for d in dirs if d not in {"__pycache__", ".cache"})
            for part in names:
                file = Path(base) / part
                if file.suffix not in {".pyc", ".tmp", ".part"} and file.is_file():
                    items.add(file)
    for file in items:
        if not file.is_file() or file.is_symlink():
            raise RuntimeError(f"Missing or nonportable build input: {file}")
    return sorted(items, key=lambda file: file.relative_to(ROOT).as_posix())


def main() -> None:
    files = selected()
    manifest = []
    if TEMP.exists():
        TEMP.unlink()
    with zipfile.ZipFile(TEMP, "w", allowZip64=True, compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for index, file in enumerate(files, 1):
            relative = file.relative_to(ROOT).as_posix()
            sha = hashlib.sha256()
            size = 0
            with file.open("rb") as source, archive.open(relative, "w", force_zip64=True) as target:
                while chunk := source.read(1024 * 1024):
                    sha.update(chunk)
                    target.write(chunk)
                    size += len(chunk)
            manifest.append({"path": relative, "bytes": size, "sha256": sha.hexdigest()})
            if index % 150 == 0 or index == len(files):
                print(f"Packed {index}/{len(files)} build files", flush=True)
        archive.writestr("BUILD_HANDOFF_MANIFEST.json", json.dumps({
            "schema": 1, "purpose": "wechat-build-and-cdn-handoff",
            "wechatPlayable": False, "files": manifest,
        }, ensure_ascii=False, separators=(",", ":")))
    with zipfile.ZipFile(TEMP) as archive:
        failed = archive.testzip()
        if failed:
            raise RuntimeError(f"ZIP CRC failure: {failed}")
        if len(archive.namelist()) != len(files) + 1:
            raise RuntimeError("ZIP file count mismatch")
    os.replace(TEMP, OUTPUT)
    digest = hashlib.sha256()
    with OUTPUT.open("rb") as source:
        while chunk := source.read(1024 * 1024):
            digest.update(chunk)
    print(f"ZIP: {OUTPUT}")
    print(f"FILES: {len(files)}")
    print(f"BYTES: {OUTPUT.stat().st_size}")
    print(f"SHA256: {digest.hexdigest()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Handoff packaging failed: {error}", file=sys.stderr)
        raise
