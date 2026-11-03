"""Build the release workflow bundle using tracked source files only."""
from __future__ import annotations

import argparse
import hashlib
import shutil
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ["MOSS_BBOX_Canvas_V2.json"]


def package(output: Path) -> list[Path]:
    output.mkdir(parents=True, exist_ok=True)
    assets = []
    for name in WORKFLOWS:
        target = output / name
        shutil.copy2(ROOT / "examples" / name, target)
        assets.append(target)
    members = ["README.md", "README.ja.md", "LICENSE", "NOTICE.md"]
    members += ["examples/" + name for name in WORKFLOWS]
    members.append("examples/ed6c61ad22695e639fb4b5b75fd2b931.webp")
    members += sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "docs").rglob("*") if p.is_file())
    archive = output / "MOSS_BBOX_Canvas_V2.zip"
    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for name in members:
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            bundle.writestr(info, (ROOT / name).read_bytes())
    with zipfile.ZipFile(archive) as bundle:
        assert bundle.testzip() is None
        assert len(bundle.namelist()) == len(set(bundle.namelist()))
        assert set(bundle.namelist()) == set(members)
        for name in members:
            assert bundle.read(name) == (ROOT / name).read_bytes(), name
    assets.append(archive)
    sums = output / "SHA256SUMS.txt"
    sums.write_text("".join(f"{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n" for p in assets), encoding="utf-8")
    return assets + [sums]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    for asset in package(parser.parse_args().output):
        print(f"{asset.name}: {asset.stat().st_size} bytes")
