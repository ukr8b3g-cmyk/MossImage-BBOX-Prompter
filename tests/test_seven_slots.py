"""Seven-color MOSS contracts; the original five groups keep their saved input order."""

import copy
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("moss_seven_test", ROOT / "__init__.py", submodule_search_locations=[str(ROOT)])
package = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = package
spec.loader.exec_module(package)
builder = sys.modules[spec.name + ".prompt_builder"]
preview = sys.modules[spec.name + ".preview"]
controls = sys.modules[spec.name + ".canvas_controls"]
OLD_SLOTS = ("red", "blue", "yellow", "green", "magenta")
ALL_SLOTS = (*OLD_SLOTS, "cyan", "orange")
PROMPTER = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]
EXPORT = package.NODE_CLASS_MAPPINGS["MOSSFromKrea2"]


def framing(slots=ALL_SLOTS):
    return json.dumps({"version": "krea2_element_framing_v1", "width": 896, "height": 1184,
        "layout": {"boxes": [{"id": slot, "slot": slot, "x1": i * 32, "y1": 0,
                               "x2": i * 32 + 16, "y2": 32} for i, slot in enumerate(slots)]}})


class SevenSlotTests(unittest.TestCase):
    def test_original_23_inputs_are_unchanged_and_extra_widgets_append_as_optional(self):
        schema = PROMPTER.INPUT_TYPES()
        expected = ("scene", "background", *(f"{s}_prompt" for s in OLD_SLOTS),
                    *(f"{s}_type" for s in OLD_SLOTS), "prompt_ui_data",
                    *(f"{s}_framing" for s in OLD_SLOTS), *(f"{s}_angle" for s in OLD_SLOTS))
        self.assertEqual(tuple(schema["required"]), expected)
        self.assertEqual(tuple(schema["optional"]), tuple(f"{s}_{key}" for s in ("cyan", "orange")
                                                         for key in ("prompt", "type", "framing", "angle")))
        for slot in ("cyan", "orange"):
            self.assertEqual(schema["optional"][f"{slot}_prompt"][1]["default"], "")
            self.assertFalse(schema["optional"][f"{slot}_prompt"][1]["dynamicPrompts"])
            self.assertEqual(schema["optional"][f"{slot}_type"][0], ["character", "object", "text", "obj"])
            self.assertEqual(schema["optional"][f"{slot}_type"][1]["default"], "object")
        self.assertEqual(controls.REGIONS, OLD_SLOTS)
        self.assertEqual(tuple(controls.PromptControls.INPUT_TYPES()["required"]), expected)

    def test_unused_new_cards_preserve_the_five_slot_wire_payload(self):
        values = {name: info[1]["default"] for name, info in PROMPTER.INPUT_TYPES()["required"].items()}
        before = json.loads(controls.PromptControls().execute(**values)[0])
        for slot in before["slots"].values():
            slot["type"] = "object"
        self.assertEqual(json.loads(PROMPTER().execute(**values)[0]), before)
        self.assertEqual(PROMPTER().execute(**values), PROMPTER().execute(**values, cyan_prompt="", orange_prompt=""))

    def test_seven_colors_export_exact_text_and_individual_style(self):
        exact = '  "Orange | 日本語"\nsecond line  '
        values = {f"{slot}_prompt": slot + " object" for slot in ALL_SLOTS}
        style = {"mode": "individual", "font": "serif", "weight": "bold", "color": "#ff9500", "extra": "thin outline"}
        values.update(orange_prompt=exact, orange_type="text", cyan_type="character",
                      cyan_framing="Full body", cyan_angle="Front view",
                      prompt_ui_data=json.dumps({"slotValues": {"orange": {"textStyle": style}}}))
        prompts = PROMPTER().execute(scene="Poster", **values)[0]
        for mode in ("hybrid", "caption", "layout_json", "auto"):
            output = EXPORT().build(framing(), prompts, output_mode=mode, text_mode="literal", text_style="shared")
            data = json.loads(output[3])
            self.assertEqual(len(data["items"]), 7)
            self.assertEqual([x["label"] for x in data["items"]], ["object"] * 5 + ["character", "text"])
            self.assertEqual(data["items"][6]["text"], exact)
            self.assertEqual(data["items"][6]["caption"], "serif lettering, bold weight, lettering color: #ff9500, thin outline")
            self.assertIn("cyan object", data["items"][5]["caption"])
            self.assertIn("full-body", data["items"][5]["caption"])
            self.assertIn("front view", data["items"][5]["caption"])
            self.assertEqual(data["items"][6]["bbox"], [-592, -256, -560, -240])

    def test_literal_and_legacy_text_both_support_extra_cards(self):
        for slot in ("cyan", "orange"):
            with self.subTest(slot=slot):
                data = PROMPTER().execute(**{f"{slot}_type": "text", f"{slot}_prompt": "Title | white serif"})[0]
                literal = json.loads(EXPORT().build(framing((slot,)), data, text_mode="literal", text_style="shared")[3])
                legacy = json.loads(EXPORT().build(framing((slot,)), data, text_mode="legacy")[3])
                self.assertEqual(literal["items"][0]["text"], "Title | white serif")
                self.assertEqual(literal["items"][0]["caption"], "shared")
                self.assertEqual(legacy["items"][0]["text"], "Title")
                self.assertEqual(legacy["items"][0]["caption"], "white serif")

    def test_missing_extra_prompt_data_remains_valid_and_clear_is_not_stale(self):
        empty = PROMPTER().execute()[0]
        self.assertNotIn("cyan", json.loads(empty)["slots"])
        with self.assertLogs("moss_seven_test.nodes", level="WARNING"):
            output = json.loads(EXPORT().build(framing(("cyan", "orange")), empty)[3])
        self.assertEqual([x["caption"] for x in output["items"]], ["", ""])
        styled = PROMPTER().execute(cyan_prompt="A vase", orange_prompt="A lamp")[0]
        self.assertIn("cyan", json.loads(styled)["slots"])
        self.assertEqual(PROMPTER().execute(cyan_prompt="", orange_prompt="")[0], empty)

    def test_extra_cards_do_not_leak_into_unrelated_five_color_output(self):
        values = {f"{slot}_prompt": f"An object for {slot}" for slot in OLD_SLOTS}
        prompts = PROMPTER().execute(**values)[0]
        defaults = {key: value[1]["default"] for key, value in PROMPTER.INPUT_TYPES()["optional"].items()}
        for mode in ("hybrid", "caption", "layout_json", "auto"):
            self.assertEqual(EXPORT().build(framing(OLD_SLOTS), prompts, output_mode=mode),
                             EXPORT().build(framing(OLD_SLOTS), PROMPTER().execute(**values, **defaults)[0], output_mode=mode))

    def test_legacy_state_and_preview_accept_seven_slots_without_modifying_input(self):
        state = builder.default_state()
        self.assertEqual(tuple(state["slots"]), ALL_SLOTS)
        old = copy.deepcopy(state)
        del old["slots"]["cyan"]
        del old["slots"]["orange"]
        old_copy = copy.deepcopy(old)
        self.assertEqual(builder.parse_state(old), state)
        self.assertEqual(old, old_copy)
        payload = framing()
        layout = preview.preview_layout(payload)
        self.assertEqual(tuple(box["slot"] for box in layout["boxes"]), ALL_SLOTS)
        self.assertEqual(json.loads(payload)["layout"]["boxes"][6]["id"], "orange")


if __name__ == "__main__":
    unittest.main()
