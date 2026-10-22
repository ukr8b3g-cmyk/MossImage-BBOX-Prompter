"""Optional integration check using an installed ComfyUI torch/Pillow environment.

Run with that environment's Python; no live server, models or GPU are used.
The dependency-free preview contracts are covered by test_preview.py in CI.
"""
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
from unittest.mock import patch

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"
import torch
from PIL import Image

root = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("moss_cpu_preview", root / "__init__.py",
                                            submodule_search_locations=[str(root)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
preview = sys.modules[spec.name + ".preview"]
assert not torch.cuda.is_initialized()
framing = json.dumps({"version": "krea2_element_framing_v1", "width": 64, "height": 32,
                      "layout": {"boxes": [{"slot": "red", "x1": 4, "y1": 5, "x2": 28, "y2": 26}]}})
checks = []
with tempfile.TemporaryDirectory(prefix="moss-preview-cpu-") as directory:
    paths = SimpleNamespace(get_temp_directory=lambda: directory,
        get_save_image_path=lambda prefix, *args: (directory, prefix, 1, "", prefix))
    for channels in (1, 3, 4):
        # Values beyond [0,1] exercise preview-only clipping; includes a batch.
        images = torch.linspace(-0.25, 1.25, 2 * 32 * 64 * channels).reshape(2, 32, 64, channels)
        before = images.clone()
        with patch.dict(sys.modules, {"folder_paths": paths}):
            output = preview.MOSSBBoxPreview().preview(images, framing)
        assert output["result"][0] is images
        assert torch.equal(images, before)
        expected = before[0].mul(255).clamp(0, 255).byte().numpy()
        pil = preview.image_to_pil(images[0])
        assert pil.tobytes() == expected.tobytes()
        for descriptor in output["ui"]["moss_bbox_preview"][0]["images"]:
            with Image.open(Path(directory) / descriptor["filename"]) as saved:
                saved.load()
                assert saved.format == "WEBP" and saved.size == (64, 32)
        checks.append({"channels": channels, "batch": 2, "same_tensor": True, "unchanged_pixels": True})
assert not torch.cuda.is_initialized()
print(json.dumps({"cpu_tensor_checks": checks, "cuda_initialized": False, "temporary_files_cleaned": True}))
