import importlib.util
import json
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
source_spec = importlib.util.spec_from_file_location("moss_test_shared_source", ROOT.parent / "Krea2-BBOX-Prompter" / "nodes_element_framing.py")
shared_source = importlib.util.module_from_spec(source_spec)
sys.modules[source_spec.name] = shared_source
source_spec.loader.exec_module(shared_source)
sys.modules["nodes"] = SimpleNamespace(NODE_CLASS_MAPPINGS=shared_source.NODE_CLASS_MAPPINGS)


class KreaBridgeTests(unittest.TestCase):
    def test_reuse_registered_module_without_duplicate_import(self):
        modules = set(sys.modules)
        for _ in range(10):
            self.assertIs(bridge.krea_helpers(), shared_source)
        self.assertEqual(set(sys.modules), modules)
        with patch.dict(sys.modules, {"nodes": SimpleNamespace(NODE_CLASS_MAPPINGS={})}):
            with self.assertRaisesRegex(RuntimeError, "shared UI"):
                bridge.krea_helpers()

    def test_moss_names_and_defaults_preserve_shared_backend_contracts(self):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        prompter = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]()
        inputs = canvas.INPUT_TYPES()["required"]
        self.assertEqual(inputs["width"][1]["default"], 896)
        self.assertEqual(inputs["height"][1]["default"], 1184)
        self.assertEqual(inputs["preset"][1]["default"], "Custom")
        self.assertEqual(shared_source.Krea2ElementFramingV1Canvas.INPUT_TYPES()["required"]["width"][1]["default"], 1024)
        shared_inputs = shared_source.Krea2ElementFramingV1Prompt.INPUT_TYPES()["required"]
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
        self.assertEqual(canvas.execute(**canvas_values), shared_source.Krea2ElementFramingV1Canvas().execute(**canvas_values))
        expected = json.loads(shared_source.Krea2ElementFramingV1Prompt().execute(**prompt_values)[0])
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
        krea = bridge.krea_helpers()
        boxes = [{"id": "first", "slot": "red", "x1": 10.2, "y1": 20.8, "x2": 300.1, "y2": 1100.9999999999},
                 {"id": "second", "slot": "red", "x1": 350, "y1": 200, "x2": 600, "y2": 1100},
                 {"id": "title", "slot": "yellow", "x1": 64, "y1": 48, "x2": 832, "y2": 208}]
        framing = krea.Krea2ElementFramingV1Canvas().execute(896, 1184, "Custom", json.dumps({"boxes": boxes}),
                                                          '{"iso":"200","focal_length":"50mm"}', "Thirds")[0]
        prompts = krea.Krea2ElementFramingV1Prompt().execute(
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
