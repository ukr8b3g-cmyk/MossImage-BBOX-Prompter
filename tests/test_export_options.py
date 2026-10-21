"""CPU checks for opt-in export modes, literal text and nonfatal diagnostics."""

import copy
import importlib.util
import json
import os
from pathlib import Path
import sys
from types import SimpleNamespace
import unittest

ROOT = Path(__file__).resolve().parents[1]


def load_package(name, root):
    spec = importlib.util.spec_from_file_location(name, root / "__init__.py", submodule_search_locations=[str(root)])
    package = importlib.util.module_from_spec(spec)
    sys.modules[name] = package
    spec.loader.exec_module(package)
    return package


package = load_package("moss_export_test", ROOT)
bridge = sys.modules[package.__name__ + ".krea_bridge"]
builder = sys.modules[package.__name__ + ".prompt_builder"]
source_spec = importlib.util.spec_from_file_location("moss_export_shared", ROOT.parent / "Krea2-BBOX-Prompter/nodes_element_framing.py")
shared = importlib.util.module_from_spec(source_spec)
sys.modules[source_spec.name] = shared
source_spec.loader.exec_module(shared)
sys.modules["nodes"] = SimpleNamespace(NODE_CLASS_MAPPINGS=shared.NODE_CLASS_MAPPINGS)


class ExportOptionsTests(unittest.TestCase):
    def inputs(self, wording='A | B', label="text"):
        framing = json.dumps({"version": "krea2_element_framing_v1", "width": 896, "height": 1184,
                              "layout": {"boxes": [{"slot": "red", "x1": 16.2, "y1": 32.8, "x2": 800.1, "y2": 200.2}]}})
        prompts = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(
            scene="A minimalist poster", red_type=label, red_prompt=wording)[0]
        return framing, prompts

    def test_literal_text_survives_spaces_quotes_pipes_prefix_and_unicode(self):
        exact = '  text: "A | B"\n日本語 😀\n\nlast line  '
        framing, prompts = self.inputs(exact)
        saved = json.loads(prompts)
        self.assertEqual(saved["slots"]["red"]["literal_text"], exact)
        self.assertEqual(saved["slots"]["red"]["prompt"], exact.strip())
        result = bridge.build_from_krea(framing, json.dumps(saved), output_mode="layout_json",
                                        text_mode="literal", text_style="Thin white serif letters, no outline.")
        item = json.loads(result["prompt"])["items"][0]
        self.assertEqual(item["text"], exact)
        self.assertEqual(item["caption"], "Thin white serif letters, no outline.")
        self.assertNotIn("\n", result["prompt"])
        self.assertEqual(result["prompt"], result["moss_json"])

    def test_literal_fallback_for_previous_prompt_data_and_intentional_blank(self):
        framing, prompts = self.inputs('"A | B"')
        data = json.loads(prompts)
        del data["slots"]["red"]["literal_text"]
        result = bridge.build_from_krea(framing, json.dumps(data), text_mode="literal")
        self.assertEqual(json.loads(result["moss_json"])["items"][0]["text"], '"A | B"')
        data["slots"]["red"]["literal_text"] = ""
        empty = bridge.build_from_krea(framing, json.dumps(data), text_mode="literal")
        self.assertEqual(json.loads(empty["moss_json"])["items"][0]["text"], "")
        self.assertTrue(any("empty" in warning for warning in empty["warnings"]))

    def test_tags_triggers_and_japanese_dialogue_keep_exact_content(self):
        scene = 'best quality, @example_artist, example_series, STYLE_TRIGGER_v2\nA two-speaker manga scene.'
        subject = '1girl, CHARACTER_TRIGGER, cross-legged, hands resting on her knees'
        dialogue = '「こんにちは」\n次の列、です。'
        literal_slash = r'Keep literal \n characters'
        style = 'Vertical Japanese dialogue: glyphs top-to-bottom, columns right-to-left.'
        framing, _ = self.inputs()
        data = json.loads(framing)
        data["layout"]["boxes"] = [dict(data["layout"]["boxes"][0], slot=slot) for slot in ("red", "blue", "yellow")]
        prompts = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(
            scene=scene, red_type="character", red_prompt=subject,
            blue_type="text", blue_prompt=dialogue, yellow_type="text", yellow_prompt=literal_slash)[0]
        result = bridge.build_from_krea(json.dumps(data), prompts, output_mode="layout_json", text_mode="literal", text_style=style)
        layout = json.loads(result["prompt"])
        self.assertEqual(layout["summary"]["caption"], scene)
        self.assertEqual(layout["items"][0]["caption"], subject)
        self.assertEqual(layout["items"][1]["text"], dialogue)
        self.assertEqual(layout["items"][2]["text"], literal_slash)
        self.assertEqual(layout["items"][1]["caption"], style)
        self.assertNotIn("\n", result["prompt"])
        self.assertEqual(set(layout), {"summary", "items", "bbox_coord_space", "bbox_format"})

    def test_legacy_parser_and_nontext_types_remain_unchanged(self):
        framing, prompts = self.inputs('"A | B"')
        old = bridge.build_from_krea(framing, prompts)
        item = json.loads(old["moss_json"])["items"][0]
        self.assertEqual((item["text"], item["caption"]), ("A", "B"))
        for label in ("character", "object"):
            framing, prompts = self.inputs('text: "A | B"', label)
            output = bridge.build_from_krea(framing, prompts, text_mode="literal")
            item = json.loads(output["moss_json"])["items"][0]
            self.assertEqual(item["label"], label)
            self.assertEqual(item["caption"], 'text: "A | B"')
            self.assertNotIn("text", item)

    def test_modes_select_same_geometry_and_keep_socket_contract(self):
        framing, prompts = self.inputs("MOSS | White letters")
        exporter = package.NODE_CLASS_MAPPINGS["MOSSFromKrea2"]()
        original = exporter.build(framing, prompts)
        self.assertEqual(len(original), 4)
        for mode in builder.OUTPUT_MODES:
            output = exporter.build(framing, prompts, output_mode=mode)
            self.assertEqual(output[1:], original[1:])
            if mode in ("auto", "layout_json"):
                self.assertEqual(output[0], original[3])
            elif mode == "caption":
                self.assertIn('"MOSS"', output[0])
                self.assertNotIn("Object (box", output[0])
                self.assertNotIn("red):", output[0])
                self.assertNotIn("bbox_coord_space", output[0])
        inputs = exporter.INPUT_TYPES()
        self.assertEqual(list(inputs["required"]), ["framing_data", "prompt_ui_data", "auto_position_hint"])
        self.assertEqual(list(inputs["optional"]), ["output_mode", "text_mode", "text_style"])
        self.assertEqual(inputs["optional"]["output_mode"][1]["default"], "hybrid")
        self.assertEqual(inputs["optional"]["text_mode"][1]["default"], "legacy")

    def test_auto_without_boxes_is_plain_caption_including_unboxed_content(self):
        framing, prompts = self.inputs("MOSS | White letters")
        data = json.loads(framing)
        data["layout"]["boxes"] = []
        result = bridge.build_from_krea(json.dumps(data), prompts, output_mode="auto")
        self.assertEqual(result["prompt"], 'A minimalist poster\n\nWhite letters\n"MOSS"')
        self.assertNotIn("bbox", result["prompt"])
        self.assertEqual(json.loads(result["moss_json"])["items"], [])
        self.assertTrue(any("no box" in warning for warning in result["warnings"]))
        blank = builder.default_state()
        self.assertEqual(builder.build_prompt(blank, "auto")["prompt"], "")

    def test_layout_warns_when_unboxed_description_cannot_be_exported(self):
        state = builder.default_state()
        state["slots"]["blue"] = "Do not discard this description"
        result = builder.build_prompt(state, "layout_json")
        self.assertTrue(any("Layout JSON omits" in warning for warning in result["warnings"]))
        self.assertIn(state["slots"]["blue"], builder.build_prompt(state, "caption")["prompt"])

    def test_geometry_diagnostics_preserve_coordinates_and_inputs(self):
        framing, prompts = self.inputs()
        data = json.loads(framing)
        data["layout"]["boxes"] = [
            {"slot": "red", "x1": -8, "y1": 0, "x2": 900, "y2": 1184},
            {"slot": "red", "x1": 10, "y1": 10, "x2": 10, "y2": 100},
            {"slot": "red", "x1": 0, "y1": 0, "x2": 1e-11, "y2": 100},
        ]
        before = copy.deepcopy(data)
        result = bridge.build_from_krea(json.dumps(data), prompts)
        items = json.loads(result["moss_json"])["items"]
        self.assertEqual(items[0]["bbox"], [-592, -456, 592, 452])
        self.assertEqual(len(items), 3)
        self.assertTrue(any("outside" in warning for warning in result["warnings"]))
        self.assertTrue(any("zero-area" in warning for warning in result["warnings"]))
        self.assertTrue(any("export precision" in warning for warning in result["warnings"]))
        self.assertEqual(data, before)
        exporter = package.NODE_CLASS_MAPPINGS["MOSSFromKrea2"]()
        with self.assertLogs(package.__name__ + ".nodes", level="WARNING") as messages:
            actual = exporter.build(json.dumps(data), prompts)
        self.assertEqual(actual[0], result["prompt"])
        self.assertTrue(any("outside" in message for message in messages.output))

    def test_invalid_new_modes_fail_explicitly(self):
        framing, prompts = self.inputs()
        for values in ({"output_mode": "unknown"}, {"text_mode": "unknown"}, {"text_style": None}):
            with self.subTest(values=values), self.assertRaises(ValueError):
                bridge.build_from_krea(framing, prompts, **values)

    @unittest.skipUnless(os.environ.get("MOSS_BEFORE_ROOT"), "Set MOSS_BEFORE_ROOT to a pre-change snapshot")
    def test_saved_workflows_match_pre_change_outputs_byte_for_byte(self):
        previous = load_package("moss_export_before", Path(os.environ["MOSS_BEFORE_ROOT"]))
        for path in sorted((ROOT / "examples").glob("*.json")):
            workflow = json.loads(path.read_text(encoding="utf-8"))
            if "nodes" not in workflow:
                outputs = [sys.modules[implementation.__name__ + ".prompt_builder"].build_prompt(workflow)
                           for implementation in (previous, package)]
                with self.subTest(state=path.name):
                    for key in ("prompt", "moss_json", "width", "height"):
                        self.assertEqual(outputs[1][key], outputs[0][key])
                continue
            ui = {node["type"]: node for node in workflow["nodes"]}
            outputs = []
            for implementation in (previous, package):
                mapping = implementation.NODE_CLASS_MAPPINGS
                if "MOSSFromKrea2" in ui:
                    node_types = ("MOSSSharedCanvas", "MOSSSharedPrompter") if "MOSSSharedCanvas" in ui else (
                        "Krea2ElementFramingV1Canvas", "Krea2ElementFramingV1Prompt")
                    values = []
                    for node_type in node_types:
                        cls = mapping[node_type] if node_type in mapping else shared.NODE_CLASS_MAPPINGS[node_type]
                        node = cls()
                        arguments = dict(zip(node.INPUT_TYPES()["required"], ui[node_type]["widgets_values"]))
                        values.append(node.execute(**arguments)[0])
                    outputs.append(mapping["MOSSFromKrea2"]().build(*values, ui["MOSSFromKrea2"]["widgets_values"][0]))
                elif "MOSSBBoxCanvasPrompt" in ui:
                    outputs.append(mapping["MOSSBBoxCanvasPrompt"]().build(ui["MOSSBBoxCanvasPrompt"]["widgets_values"][0]))
                else:
                    canvas = mapping["MOSSBBoxCanvas"]().build(ui["MOSSBBoxCanvas"]["widgets_values"][0])
                    outputs.append(mapping["MOSSBBoxPrompter"]().build(canvas[0], ui["MOSSBBoxPrompter"]["widgets_values"][0]))
            with self.subTest(workflow=path.name):
                self.assertEqual(outputs[1], outputs[0])


if __name__ == "__main__":
    unittest.main(verbosity=2)
