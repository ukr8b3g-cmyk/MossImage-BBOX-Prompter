import ast
import copy
import importlib.util
import json
import math
import os
from pathlib import Path
import random
import re
import subprocess
import sys
import tempfile
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("moss_bbox_test_package", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
builder = sys.modules[spec.name + ".prompt_builder"]


def box(**values):
    return {"id": "one", "slot": "red", "label": "object", "text": "", "x1": 0, "y1": 0, "x2": 896, "y2": 1184, **values}


def sample():
    state = builder.default_state()
    state["prompt"] = '  日本語のカフェ\n"<tag>" & \\ {a|b} 😀  '
    state["slots"]["red"] = ' 原文\nwith "quotes",\\ and\ttabs '
    state["slots"]["blue"] = "white lettering"
    state["boxes"] = [box(x1=10.2, y1=20.8, x2=300.1, y2=1100.9999999999, label="character"),
                      box(id="two", x1=400.9, y1=25.1, x2=800.8, y2=1100.7),
                      box(id="three", slot="blue", label="text", text='描画文字 "MOSS"\n二行目', x1=45, y1=1120, x2=850, y2=1184)]
    return state


class BuilderTests(unittest.TestCase):
    def test_split_nodes_match_legacy_output_and_keep_separate_ownership(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSBBoxCanvas"]()
        prompter = package.NODE_CLASS_MAPPINGS["MOSSBBoxPrompter"]()
        state = sample()
        canvas_state = copy.deepcopy(state)
        canvas_state["prompt"] = "stale text in canvas must not be used"
        canvas_state["slots"]["red"] = "stale canvas caption"
        prompt_state = copy.deepcopy(state)
        prompt_state["width"] = 1024
        prompt_state["height"] = 1024
        prompt_state["boxes"] = []
        canvas_result = canvas.build(json.dumps(canvas_state))
        result = prompter.build(canvas_result[0], json.dumps(prompt_state))
        expected = package.NODE_CLASS_MAPPINGS["MOSSBBoxCanvasPrompt"]().build(json.dumps(state))
        self.assertEqual(result, expected)
        self.assertEqual(canvas_result[1:], (896, 1184))
        prompt_state["prompt"] = ""
        prompt_state["slots"]["red"] = ""
        cleared = json.loads(prompter.build(canvas_result[0], json.dumps(prompt_state))[3])
        self.assertEqual(cleared["summary"]["caption"], "")
        self.assertEqual(cleared["items"][0]["caption"], "")
        self.assertEqual(canvas_state["prompt"], "stale text in canvas must not be used")

    def test_default_portrait_and_registration_without_gpu(self):
        node = package.NODE_CLASS_MAPPINGS["MOSSBBoxCanvasPrompt"]()
        state = json.loads(node.INPUT_TYPES()["required"]["moss_state"][1]["default"])
        result = node.build(json.dumps(state))
        self.assertEqual(result[1:3], (896, 1184))
        self.assertEqual(node.RETURN_TYPES, ("STRING", "INT", "INT", "STRING"))
        self.assertNotIn("torch", sys.modules)
        self.assertNotIn("server", sys.modules)

    def test_schema_exact_and_shared_color(self):
        state = sample()
        result = builder.build_prompt(state)
        layout = json.loads(result["moss_json"])
        self.assertEqual(set(layout), {"summary", "items", "bbox_coord_space", "bbox_format"})
        self.assertEqual(layout["summary"], {"caption": state["prompt"]})
        self.assertEqual(layout["items"][0]["caption"], state["slots"]["red"])
        self.assertEqual(layout["items"][1]["caption"], state["slots"]["red"])
        self.assertEqual(set(layout["items"][0]), {"label", "caption", "bbox"})
        self.assertEqual(set(layout["items"][2]), {"label", "caption", "text", "bbox"})
        self.assertEqual(layout["items"][2]["text"], state["boxes"][2]["text"])
        self.assertTrue(result["natural"].startswith(state["prompt"]))
        self.assertTrue(result["prompt"].endswith(result["moss_json"]))
        self.assertIn(state["slots"]["red"], result["natural"])
        self.assertIn(state["boxes"][2]["text"], result["natural"])
        self.assertEqual(layout["bbox_coord_space"], "abs_centralized")
        self.assertEqual(layout["bbox_format"], "yxyx")

    def test_pixel_edges_fractional_reversed_and_roundoff(self):
        self.assertEqual(builder.pixel_bbox(box(), 896, 1184), [-592, -448, 592, 448])
        self.assertEqual(builder.pixel_bbox(box(x1=896, y1=1184, x2=0, y2=0), 896, 1184), [-592, -448, 592, 448])
        self.assertEqual(builder.pixel_bbox(box(x1=10.2, y1=20.8, x2=100.1, y2=200.01), 896, 1184), [-572, -438, -391, -347])
        self.assertEqual(builder.pixel_bbox(box(x1=64-1e-10, y1=64-1e-10, x2=128+1e-10, y2=128+1e-10), 896, 1184), [-528, -384, -464, -320])
        self.assertEqual(builder.pixel_bbox(box(x1=64-1e-8, y1=64-1e-8, x2=128+1e-8, y2=128+1e-8), 896, 1184), [-529, -385, -463, -319])
        self.assertEqual(builder.pixel_bbox(box(x1=0, y1=0, x2=897, y2=1185), 897, 1185), [-592, -448, 593, 449])

    def test_no_thousand_integer_quantization(self):
        # 1.1 px survives: integer 0..1000 roundtrip would move the right edge to 1 px.
        b = box(x1=0, y1=0, x2=1.1, y2=1.1)
        self.assertEqual(builder.pixel_bbox(b, 896, 1184), [-592, -448, -590, -446])

    def test_save_restore_blank_duplicate_and_stale_derived(self):
        state = sample()
        state["boxes"][0]["position_hint"] = "OLD POSITION MUST NOT SURVIVE"
        original = copy.deepcopy(state)
        result = builder.build_prompt(state)
        self.assertEqual(state, original)
        restored = builder.parse_state(json.dumps(state, ensure_ascii=False))
        self.assertEqual(builder.build_prompt(restored), result)
        self.assertNotIn("position_hint", restored["boxes"][0])
        duplicate = copy.deepcopy(restored)
        duplicate["slots"]["red"] = "changed"
        self.assertNotEqual(duplicate["slots"], restored["slots"])
        restored["prompt"] = ""
        restored["slots"] = {slot: "" for slot in builder.SLOTS}
        restored["boxes"] = []
        self.assertEqual(builder.parse_state(json.dumps(restored)), restored)
        empty = builder.build_prompt(restored)
        self.assertEqual(json.loads(empty["moss_json"])["items"], [])
        self.assertEqual(empty["natural"], "")

    def test_empty_box_text_and_unboxed_caption_preserved(self):
        state = builder.default_state()
        state["boxes"] = [box(x2=0, y2=0), box(id="text", slot="blue", label="text")]
        state["slots"]["magenta"] = "Unused original caption"
        result = builder.build_prompt(state)
        self.assertEqual(len(json.loads(result["moss_json"])["items"]), 2)
        self.assertEqual(json.loads(result["moss_json"])["items"][1]["text"], "")
        self.assertIn("Unused original caption", result["natural"])
        self.assertEqual(len(result["warnings"]), 4)

    def test_auto_position_always_current_and_manual_kept(self):
        state = builder.default_state()
        state["settings"]["auto_position"] = True
        state["prompt"] = "on the left / 左側"
        state["boxes"] = [box(x1=700, y1=100, x2=896, y2=300)]
        result = builder.build_prompt(state)
        self.assertIn("upper-right area", result["natural"])
        self.assertTrue(result["warnings"])
        state["boxes"][0].update(x1=0, x2=180, y1=900, y2=1100)
        moved = builder.build_prompt(state)
        self.assertIn("lower-left area", moved["natural"])
        self.assertNotIn("upper-right area", moved["natural"])
        self.assertEqual(json.loads(moved["moss_json"])["summary"]["caption"], state["prompt"])

    def test_invalid_state_explicit_error(self):
        cases = [{}, {"schema_version": "krea2"}, {**builder.default_state(), "width": 0}, {**builder.default_state(), "height": 1185},
                 {**builder.default_state(), "boxes": [box(x1=float("nan"))]},
                 {**builder.default_state(), "boxes": [box(), box()]},
                 {**builder.default_state(), "slots": {"red": None}}]
        for state in cases:
            with self.subTest(state=state), self.assertRaises(ValueError): builder.parse_state(state)

    def test_official_execute_matches_without_grid_quantization(self):
        comfy_root = os.environ.get("COMFYUI_ROOT")
        if not comfy_root: self.skipTest("Set COMFYUI_ROOT to compare installed official MOSS execute")
        tree = ast.parse((Path(comfy_root) / "comfy_extras/nodes_moss_image.py").read_text(encoding="utf-8"))
        cls = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "MOSSImageLayoutPrompt")
        scope = {"io": SimpleNamespace(ComfyNode=object, NodeOutput=lambda *values: values), "math": math, "json": json, "re": re}
        exec(compile(ast.Module(body=[cls], type_ignores=[]), "official_moss_class", "exec"), scope)
        rng = random.Random(8961184)
        for width, height in [(896, 1184), (1024, 1024), (1536, 896), (897, 1185), (16, 16)]:
            for _ in range(100):
                x0, x1 = sorted([rng.random() * width, rng.random() * width])
                y0, y1 = sorted([rng.random() * height, rng.random() * height])
                b = box(x1=x0, x2=x1, y1=y0, y2=y1)
                element = {"bbox": [y0 * 1000 / height, x0 * 1000 / width, y1 * 1000 / height, x1 * 1000 / width], "desc": "original", "type": "obj"}
                result = scope["MOSSImageLayoutPrompt"].execute("original", [element], width, height)[0]
                self.assertEqual(json.loads(result)["items"][0]["bbox"], builder.pixel_bbox(b, width, height))

    def test_js_python_parity(self):
        rng = random.Random(123)
        corpus = [builder.default_state(), sample()]
        for _ in range(180):
            state = sample()
            state["width"], state["height"] = rng.choice([(896, 1184), (1024, 1024), (1792, 592), (1536, 896)])
            state["settings"]["auto_position"] = rng.choice([True, False])
            for b in state["boxes"]:
                for key in ("x1", "x2"): b[key] = rng.random() * state["width"]
                for key in ("y1", "y2"): b[key] = rng.random() * state["height"]
            corpus.append(state)
        for delta in [-1e-8, -1e-10, 0, 1e-10, 1e-8]:
            state = builder.default_state()
            state["boxes"] = [box(x1=64+delta, y1=64+delta, x2=128+delta, y2=128+delta)]
            corpus.append(state)
        script = "import{buildPrompt}from'./web/state.mjs';let data='';for await(const c of process.stdin)data+=c;process.stdout.write(JSON.stringify(JSON.parse(data).map(buildPrompt)));"
        result = subprocess.run(["node", "--input-type=module", "-e", script], cwd=ROOT, input=json.dumps(corpus, ensure_ascii=False), encoding="utf-8", capture_output=True, check=True)
        javascript = json.loads(result.stdout)
        for state, js in zip(corpus, javascript):
            py = builder.build_prompt(state)
            self.assertEqual(json.loads(js["moss_json"]), json.loads(py["moss_json"]))
            self.assertEqual(js["prompt"], py["prompt"])
            self.assertEqual(js["warnings"], py["warnings"])

    def test_sample_links_and_portrait_state(self):
        workflow = json.loads((ROOT / "examples/moss_bbox_hybrid_896x1184.json").read_text(encoding="utf-8"))
        nodes = {node["id"]: node for node in workflow["nodes"]}
        moss = next(node for node in nodes.values() if node["type"] == "MOSSBBoxCanvasPrompt")
        latent = next(node for node in nodes.values() if node["type"] == "EmptyFlux2LatentImage")
        state = builder.parse_state(moss["widgets_values"][0])
        self.assertEqual((state["width"], state["height"]), (896, 1184))
        self.assertEqual(latent["widgets_values"][:2], [896, 1184])
        for link_id, origin, slot, target, input_index, kind in workflow["links"]:
            self.assertIn(link_id, nodes[origin]["outputs"][slot]["links"])
            self.assertEqual(nodes[target]["inputs"][input_index]["link"], link_id)
        width_link = next(link for link in workflow["links"] if link[1:3] == [moss["id"], 1])
        height_link = next(link for link in workflow["links"] if link[1:3] == [moss["id"], 2])
        self.assertEqual(width_link[3:5], [latent["id"], 0])
        self.assertEqual(height_link[3:5], [latent["id"], 1])

    def test_png_webp_metadata_roundtrip_cpu(self):
        from PIL import Image, PngImagePlugin
        workflow = json.loads((ROOT / "examples/moss_bbox_hybrid_896x1184.json").read_text(encoding="utf-8"))
        text = json.dumps(workflow, ensure_ascii=False)
        with tempfile.TemporaryDirectory() as temp:
            png = Path(temp) / "workflow.png"
            info = PngImagePlugin.PngInfo(); info.add_text("workflow", text)
            Image.new("RGB", (16, 16)).save(png, pnginfo=info)
            restored_png = json.loads(Image.open(png).info["workflow"])
            webp = Path(temp) / "workflow.webp"
            exif = Image.Exif(); exif[0x010F] = "workflow:" + json.dumps(workflow)
            Image.new("RGB", (16, 16)).save(webp, exif=exif, lossless=True)
            restored_webp = json.loads(Image.open(webp).getexif()[0x010F].split(":", 1)[1])
        for restored in [restored_png, restored_webp]:
            node = next(node for node in restored["nodes"] if node["type"] == "MOSSBBoxCanvasPrompt")
            state = builder.parse_state(node["widgets_values"][0])
            self.assertEqual((state["width"], state["height"]), (896, 1184))
            self.assertEqual(builder.build_prompt(state), builder.build_prompt(json.loads(next(node for node in workflow["nodes"] if node["type"] == "MOSSBBoxCanvasPrompt")["widgets_values"][0])))


if __name__ == "__main__":
    unittest.main(verbosity=2)
