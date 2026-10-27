"""Build the release workflow bundle using tracked source files only."""
from __future__ import annotations

import argparse
import hashlib
import shutil
import tomllib
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WORKFLOWS = ["MOSS_BBOX_Template.json", "MOSS_BBOX_Standard.json", "MOSS_BBOX_DMD.json"]


def package(output: Path) -> list[Path]:
    version = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))["project"]["version"]
    output.mkdir(parents=True, exist_ok=True)
    assets = []
    for name in WORKFLOWS:
        target = output / name
        shutil.copy2(ROOT / "examples" / name, target)
        assets.append(target)
    members = ["README.md", "README.ja.md", "LICENSE", "NOTICE.md"]
    members += ["examples/" + name for name in WORKFLOWS]
    members.append("examples/ComfyUI_00238_.webp")
    members += sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "docs").rglob("*") if p.is_file())
    archive = output / f"MOSS_BBOX_Workflows_{version}.zip"
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
