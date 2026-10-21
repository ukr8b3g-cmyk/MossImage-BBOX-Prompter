import importlib.util
import json
import shutil
import subprocess
import tempfile
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("moss_bridge_test", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
bridge = sys.modules[spec.name + ".krea_bridge"]
shared_source = sys.modules[package.__name__ + ".canvas_controls"]


class KreaBridgeTests(unittest.TestCase):
    def test_canvas_rejects_invalid_nonempty_layout_data(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        values = {key: entry[1]["default"] for key, entry in canvas.INPUT_TYPES()["required"].items()}
        invalid = ('{"boxes": [', '[]', 'null', '"layout"', 'false', '123',
                   '{"boxes": null}', '{"boxes": {}}', '{"boxes": "invalid"}')
        for layout_data in invalid:
            with self.subTest(layout_data=layout_data), self.assertRaisesRegex(ValueError, "layout_data"):
                canvas.execute(**dict(values, layout_data=layout_data))

    def test_canvas_preserves_intentional_empty_layouts_and_scene_only_export(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        values = {key: entry[1]["default"] for key, entry in canvas.INPUT_TYPES()["required"].items()}
        prompts = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(scene="A simple poster.")[0]
        for layout_data in (None, "", " \n\t ", "{}", '{"boxes": []}'):
            with self.subTest(layout_data=layout_data):
                framing = canvas.execute(**dict(values, layout_data=layout_data))[0]
                expected = {} if layout_data == "{}" else {"boxes": []}
                self.assertEqual(json.loads(framing)["layout"], expected)
                result = bridge.build_from_krea(framing, prompts, output_mode="auto")
                self.assertEqual(result["prompt"], "A simple poster.")
                self.assertEqual(result["warnings"], [])

    def test_canvas_keeps_camera_and_preset_fallbacks(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        values = {key: entry[1]["default"] for key, entry in canvas.INPUT_TYPES()["required"].items()}
        values.update(layout_data='{"boxes": [], "saved_key": "keep"}', camera_data="{",
                      camera_set_data="[]", canvas_preset_data="null")
        result = json.loads(canvas.execute(**values)[0])
        self.assertEqual(result["layout"], {"boxes": [], "saved_key": "keep"})
        self.assertEqual(result["camera"], {})
        self.assertEqual(result["camera_set_data"], {"sets": [], "selected": ""})
        self.assertEqual(result["canvas_preset_data"], {"sets": [], "selected": ""})

    def test_standalone_without_registered_krea_nodes(self):
        with patch.dict(sys.modules, {"nodes": SimpleNamespace(NODE_CLASS_MAPPINGS={})}):
            canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
            values = {key: entry[1]["default"] for key, entry in canvas.INPUT_TYPES()["required"].items()}
            self.assertEqual(json.loads(canvas.execute(**values)[0])["width"], 896)
            framing, prompts = self.inputs()
            self.assertEqual(len(package.NODE_CLASS_MAPPINGS["MOSSFromKrea2"]().build(framing, prompts)), 4)
            self.assertEqual(sys.modules["nodes"].NODE_CLASS_MAPPINGS, {})
        self.assertFalse(any(name.startswith("moss_test_shared_source") for name in sys.modules))

    def test_clean_package_executes_both_workflows_without_krea_installation(self):
        script = """
import importlib.util, json, sys
from pathlib import Path
root = Path(sys.argv[1])
spec = importlib.util.spec_from_file_location('standalone_moss', root / '__init__.py', submodule_search_locations=[str(root)])
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)
assert 'nodes' not in sys.modules
for path in sorted((root / 'examples').glob('MOSS_BBOX_*.json')):
    workflow = json.loads(path.read_text(encoding='utf-8'))
    ui = {n['type']: n for n in workflow['nodes']}
    inputs = []
    for kind in ('MOSSSharedCanvas', 'MOSSSharedPrompter'):
        cls = module.NODE_CLASS_MAPPINGS[kind]
        args = dict(zip(cls.INPUT_TYPES()['required'], ui[kind]['widgets_values']))
        inputs.append(cls().execute(**args)[0])
    result = module.NODE_CLASS_MAPPINGS['MOSSFromKrea2']().build(*inputs, **ui['MOSSFromKrea2']['widgets_values_named'])
    items = json.loads(result[3])['items']
    assert [item['label'] for item in items] == ['character', 'object', 'text']
    assert items[2]['text'] == 'MOSS Café'
assert not any('nodes_element_framing' in name for name in sys.modules)
print('standalone: both workflows passed')
"""
        with tempfile.TemporaryDirectory(prefix='moss-standalone-') as folder:
            root = Path(folder).resolve()
            self.assertEqual(root.parent, Path(tempfile.gettempdir()).resolve())
            for name in ('__init__.py', 'nodes.py', 'prompt_builder.py', 'krea_bridge.py', 'canvas_controls.py'):
                shutil.copyfile(ROOT / name, root / name)
            (root / 'examples').mkdir()
            for name in ('MOSS_BBOX_Standard.json', 'MOSS_BBOX_DMD.json'):
                shutil.copyfile(ROOT / 'examples' / name, root / 'examples' / name)
            result = subprocess.run([sys.executable, '-I', '-B', '-c', script, str(root)],
                                    cwd=root, capture_output=True, encoding='utf-8')
            self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
            self.assertIn('standalone: both workflows passed', result.stdout)

    def test_moss_names_and_defaults_preserve_shared_backend_contracts(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        prompter = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]()
        inputs = canvas.INPUT_TYPES()["required"]
        self.assertEqual(inputs["width"][1]["default"], 896)
        self.assertEqual(inputs["height"][1]["default"], 1184)
        self.assertEqual(inputs["preset"][1]["default"], "Custom")
        self.assertEqual(shared_source.CanvasControls.INPUT_TYPES()["required"]["width"][1]["default"], 1024)
        shared_inputs = shared_source.PromptControls.INPUT_TYPES()["required"]
        moss_inputs = prompter.INPUT_TYPES()["required"]
        for name, value in shared_inputs.items():
            if name.endswith("_type"):
                self.assertEqual(moss_inputs[name], (["character", "object", "text", "obj"], {"default": "object"}))
                self.assertEqual(value, (["obj", "text"], {"default": "obj"}))
            else:
                self.assertEqual(moss_inputs[name], value)
        for name in ("MOSSSharedCanvas", "MOSSSharedPrompter", "MOSSFromKrea2"):
            self.assertNotIn("Krea2", package.NODE_DISPLAY_NAME_MAPPINGS[name])
        canvas_values = {name: data[1]["default"] for name, data in inputs.items()}
        prompt_values = {name: data[1]["default"] for name, data in prompter.INPUT_TYPES()["required"].items()}
        self.assertEqual(canvas.execute(**canvas_values), shared_source.CanvasControls().execute(**canvas_values))
        expected = json.loads(shared_source.PromptControls().execute(**prompt_values)[0])
        for slot in expected["slots"].values():
            slot["type"] = "object"
        self.assertEqual(json.loads(prompter.execute(**prompt_values)[0]), expected)

    def test_explicit_three_types_survive_prompt_and_export_roundtrip(self):
        framing, _ = self.inputs()
        canvas = json.loads(framing)
        canvas["layout"]["boxes"].insert(2, {"id": "object", "slot": "blue", "x1": 520, "y1": 700, "x2": 864, "y2": 1120})
        prompter = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]()
        data = prompter.execute(scene="A poster 日本語", red_type="character", red_prompt='text: a woman in a "red dress"',
                                blue_type="object", blue_prompt='"A ceramic vase"', yellow_type="text",
                                yellow_prompt="MOSS Café\n春 | Elegant white lettering.")[0]
        saved = json.dumps(json.loads(data), ensure_ascii=False)
        slots = json.loads(saved)["slots"]
        self.assertEqual([slots[color]["type"] for color in ("red", "blue", "yellow")], ["character", "object", "text"])
        result = bridge.build_from_krea(json.dumps(canvas), saved)
        items = json.loads(result["moss_json"])["items"]
        self.assertEqual([item["label"] for item in items], ["character", "character", "object", "text"])
        self.assertEqual(items[0]["caption"], 'text: a woman in a "red dress"')
        self.assertEqual(items[2]["caption"], '"A ceramic vase"')
        self.assertNotIn("text", items[0])
        self.assertNotIn("text", items[2])
        self.assertEqual(items[3]["text"], "MOSS Café\n春")
        self.assertEqual(items[0]["bbox"], [-572, -438, 509, -147])

    def test_legacy_obj_alias_and_invalid_type_are_explicit(self):
        prompter = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]()
        data = json.loads(prompter.execute(red_type="obj", red_prompt="a vase")[0])
        self.assertEqual(data["slots"]["red"]["type"], "object")
        with self.assertRaisesRegex(ValueError, "MOSS Type"):
            prompter.execute(red_type="person")
        framing, prompts = self.inputs()
        data = json.loads(prompts)
        data["slots"]["red"]["type"] = "person"
        with self.assertRaisesRegex(ValueError, "MOSS Type"):
            bridge.build_from_krea(framing, json.dumps(data))

    def inputs(self):
        krea = shared_source
        boxes = [{"id": "first", "slot": "red", "x1": 10.2, "y1": 20.8, "x2": 300.1, "y2": 1100.9999999999},
                 {"id": "second", "slot": "red", "x1": 350, "y1": 200, "x2": 600, "y2": 1100},
                 {"id": "title", "slot": "yellow", "x1": 64, "y1": 48, "x2": 832, "y2": 208}]
        framing = krea.CanvasControls().execute(896, 1184, "Custom", json.dumps({"boxes": boxes}),
                                                          '{"iso":"200","focal_length":"50mm"}', "Thirds")[0]
        prompts = krea.PromptControls().execute(
            '  Japanese cafe 日本語 {keep|原文} 😀  ', 'warm lighting', 'a woman', '',
            'MOSS Café | Elegant white lettering.', '', '', yellow_type="text", red_framing="Full body",
            red_angle="Eye level")[0]
        return framing, prompts

    def test_real_krea_nodes_to_official_moss_schema(self):
        framing, prompts = self.inputs()
        output = package.NODE_CLASS_MAPPINGS["MOSSFromKrea2"]().build(framing, prompts)
        result = json.loads(output[3])
        self.assertEqual(output[1:3], (896, 1184))
        self.assertEqual(result["bbox_coord_space"], "abs_centralized")
        self.assertEqual(result["bbox_format"], "yxyx")
        self.assertEqual(result["items"][0]["bbox"], [-572, -438, 509, -147])
        self.assertEqual(result["items"][0]["caption"], result["items"][1]["caption"])
        self.assertIn("full-body view", result["items"][0]["caption"])
        self.assertIn("eye-level", result["items"][0]["caption"])
        self.assertEqual(result["items"][2]["text"], "MOSS Café")
        self.assertEqual(result["items"][2]["caption"], "Elegant white lettering.")
        self.assertIn("日本語 {keep|原文} 😀", output[0])
        self.assertIn("Camera settings: ISO 200, focal length 50mm.", result["summary"]["caption"])

    def test_empty_fields_do_not_restore_previous_text_or_skip_boxes(self):
        framing, prompts = self.inputs()
        data = json.loads(prompts)
        data["scene"] = data["background"] = ""
        for slot in data["slots"].values():
            slot.update(prompt="", framing="Auto", angle="Auto", type="obj")
        result = bridge.build_from_krea(framing, json.dumps(data))
        layout = json.loads(result["moss_json"])
        self.assertEqual(len(layout["items"]), 3)
        self.assertTrue(all(item["caption"] == "" for item in layout["items"]))
        self.assertNotIn("a woman", result["prompt"])

    def test_reject_export_json_instead_of_canvas_data(self):
        framing, prompts = self.inputs()
        with self.assertRaisesRegex(ValueError, "Canvas"):
            bridge.build_from_krea('{"aspect_ratio":"3:4"}', prompts)
        data = json.loads(framing)
        data["width"] = 897
        with self.assertRaisesRegex(ValueError, "multiple of 16"):
            bridge.build_from_krea(json.dumps(data), prompts)

    def test_position_hints_are_derived_without_mutating_input(self):
        framing, prompts = self.inputs()
        off = bridge.build_from_krea(framing, prompts)
        on = bridge.build_from_krea(framing, prompts, True)
        self.assertNotIn("Position from current box", off["prompt"])
        self.assertIn("Position from current box", on["prompt"])
        self.assertEqual(off["moss_json"], on["moss_json"])
        self.assertEqual((framing, prompts), self.inputs())


if __name__ == "__main__":
    unittest.main()
