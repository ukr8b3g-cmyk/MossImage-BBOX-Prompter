"""Preview contracts and actual WebP file checks, without torch/ComfyUI imports."""
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("moss_preview_test", ROOT / "__init__.py",
                                            submodule_search_locations=[str(ROOT)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
preview = sys.modules[spec.name + ".preview"]


class Batch(list):
    shape = (2, 32, 64, 3)


class PreviewTests(unittest.TestCase):
    def framing(self, boxes=None):
        return json.dumps({"version": "krea2_element_framing_v1", "width": 896, "height": 1184,
                           "layout": {"boxes": boxes if boxes is not None else [
                               {"slot": "red", "x1": 64.5, "y1": 240, "x2": 520, "y2": 1120}]}})

    def test_registration_is_additive_and_uses_existing_canvas_socket(self):
        self.assertEqual(set(package.NODE_CLASS_MAPPINGS), {
            "MOSSSharedCanvas", "MOSSSharedPrompter", "MOSSFromKrea2", "MOSSBBoxCanvasPrompt",
            "MOSSBBoxCanvas", "MOSSBBoxPrompter", "MOSSBBoxPreview"})
        cls = package.NODE_CLASS_MAPPINGS["MOSSBBoxPreview"]
        inputs = cls.INPUT_TYPES()["required"]
        self.assertEqual(list(inputs), ["images", "framing_data"])
        self.assertEqual(inputs["framing_data"][:1],
                         package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"].RETURN_TYPES)
        self.assertEqual(inputs["images"][0], "IMAGE")
        for spec in inputs.values():
            self.assertEqual(set(spec[1]), {"tooltip"})
            self.assertTrue(spec[1]["tooltip"])
        self.assertEqual(cls.RETURN_TYPES, ("IMAGE",))
        self.assertTrue(cls.OUTPUT_NODE)

    def test_both_existing_workflows_supply_unchanged_coordinates(self):
        for path in (ROOT / "examples").glob("MOSS_BBOX_*.json"):
            workflow = json.loads(path.read_text(encoding="utf-8"))
            node = next(n for n in workflow["nodes"] if n["type"] == "MOSSSharedCanvas")
            cls = package.NODE_CLASS_MAPPINGS[node["type"]]
            values = dict(zip(cls.INPUT_TYPES()["required"], node["widgets_values"]))
            framing = cls().execute(**values)[0]
            result = preview.preview_layout(framing)
            expected = json.loads(framing)
            self.assertEqual((result["width"], result["height"]), (896, 1184))
            for source, box in zip(expected["layout"]["boxes"], result["boxes"]):
                self.assertEqual({k: box[k] for k in ("slot", "x1", "y1", "x2", "y2")},
                                 {k: source[k] for k in ("slot", "x1", "y1", "x2", "y2")})

    def test_empty_and_reversed_fractional_boxes_are_preserved(self):
        self.assertEqual(preview.preview_layout(self.framing([]))["boxes"], [])
        box = {"slot": "blue", "x1": 340.25, "y1": 800, "x2": 20.5, "y2": 40}
        result = preview.preview_layout(self.framing([box]))["boxes"][0]
        self.assertEqual({k: result[k] for k in box}, box)

    def test_invalid_layouts_are_rejected_not_shown_as_empty(self):
        for data in ('{"boxes": [', '[]', 'null', '{}'):
            with self.subTest(data=data), self.assertRaises(ValueError):
                preview.preview_layout(data)
        base = json.loads(self.framing())
        for layout in (None, [], {"boxes": None}, {"boxes": [None]}):
            with self.subTest(layout=layout), self.assertRaises(ValueError):
                preview.preview_layout(json.dumps({**base, "layout": layout}))
        for field, value in (("x1", float("nan")), ("y1", float("inf")), ("x2", "20"),
                             ("y2", True), ("slot", "unknown")):
            box = dict(base["layout"]["boxes"][0], **{field: value})
            with self.subTest(field=field), self.assertRaises(ValueError):
                preview.preview_layout(self.framing([box]))

    def test_webp_batch_passthrough_and_unique_files(self):
        batch = Batch([object(), object()])
        with tempfile.TemporaryDirectory() as directory:
            paths = SimpleNamespace(get_temp_directory=lambda: directory,
                get_save_image_path=lambda prefix, *args: (directory, prefix, 1, "", prefix))
            with patch.dict(sys.modules, {"folder_paths": paths}), patch.object(
                    preview, "image_to_pil", side_effect=lambda _: Image.new("RGB", (64, 32), "white")):
                results = [preview.MOSSBBoxPreview().preview(batch, self.framing()) for _ in range(2)]
            for result in results:
                self.assertIs(result["result"][0], batch)
                self.assertNotIn("images", result["ui"])
                payload = result["ui"]["moss_bbox_preview"][0]
                self.assertEqual(payload["image_size"], [64, 32])
                self.assertEqual(len(payload["images"]), 2)
                for image in payload["images"]:
                    self.assertEqual(image["type"], "temp")
                    with Image.open(Path(directory) / image["filename"]) as saved:
                        self.assertEqual(saved.format, "WEBP")
                        self.assertEqual(saved.size, (64, 32))
                        # Plain white preview has no rasterized colored boxes.
                        self.assertEqual(saved.convert("RGB").getextrema(), ((255, 255),) * 3)
            self.assertEqual(len(list(Path(directory).glob("*.webp"))), 4)

    def test_thumbnail_does_not_resize_output(self):
        batch = Batch([object()])
        batch.shape = (1, 2400, 4800, 3)
        with tempfile.TemporaryDirectory() as directory:
            paths = SimpleNamespace(get_temp_directory=lambda: directory,
                get_save_image_path=lambda prefix, *args: (directory, prefix, 1, "", prefix))
            with patch.dict(sys.modules, {"folder_paths": paths}), patch.object(
                    preview, "image_to_pil", return_value=Image.new("RGB", (4800, 2400))):
                result = preview.MOSSBBoxPreview().preview(batch, self.framing())
            self.assertIs(result["result"][0], batch)
            payload = result["ui"]["moss_bbox_preview"][0]
            self.assertEqual(payload["image_size"], [4800, 2400])
            with Image.open(Path(directory) / payload["images"][0]["filename"]) as image:
                self.assertEqual(image.size, (2048, 1024))

    def test_invalid_image_shape_creates_no_files(self):
        paths = SimpleNamespace()
        for shape in ((0, 32, 64, 3), (1, 32, 64), (1, 32, 64, 2), (1, 0, 64, 3)):
            batch = Batch()
            batch.shape = shape
            with self.subTest(shape=shape), patch.dict(sys.modules, {"folder_paths": paths}):
                with self.assertRaisesRegex(ValueError, "MOSS preview"):
                    preview.MOSSBBoxPreview().preview(batch, self.framing())


if __name__ == "__main__":
    unittest.main()
