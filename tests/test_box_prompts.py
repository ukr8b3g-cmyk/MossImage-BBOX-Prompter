import json
import unittest
from test_krea_bridge import bridge, package


class BoxPromptTests(unittest.TestCase):
    def payload(self, boxes):
        canvas = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        values = {key: entry[1]["default"] for key, entry in canvas.INPUT_TYPES()["required"].items()}
        values["layout_data"] = json.dumps({"boxes": boxes})
        framing = canvas.execute(**values)[0]
        prompts = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(red_prompt="Old red", red_type="object")[0]
        return framing, prompts

    def boxes(self):
        return [{"id": f"id-{i}", "slot": "red", "x1": 32 + i * 80, "y1": 32,
                 "x2": 80 + i * 80, "y2": 160,
                 "promptData": {"type": "object", "prompt": f"Independent item {i}"}} for i in range(9)]

    def test_nine_same_color_boxes_keep_independent_contents_in_all_modes(self):
        args = self.payload(self.boxes())
        for mode in ("auto", "layout_json", "caption", "hybrid"):
            result = bridge.build_from_krea(*args, output_mode=mode, text_mode="literal")
            for i in range(9):
                self.assertIn(f"Independent item {i}", result["prompt"])
            items = json.loads(result["moss_json"])["items"]
            self.assertEqual(len(items), 9)
            self.assertEqual([b["caption"] for b in items], [f"Independent item {i}" for i in range(9)])

    def test_literal_text_and_styles_are_per_id_not_per_color(self):
        boxes = self.boxes()
        literal = '  A | "日本語"\nB  '
        boxes[7]["promptData"] = {"type": "text", "prompt": literal,
                                  "textStyle": {"mode": "individual", "font": "serif", "color": "red"}}
        boxes[8]["promptData"] = {"type": "character", "prompt": "Second person", "framing": "Full body"}
        result = bridge.build_from_krea(*self.payload(boxes), text_mode="literal", output_mode="auto")
        items = json.loads(result["moss_json"])["items"]
        self.assertEqual(items[7]["text"], literal)
        self.assertIn("serif", items[7]["caption"])
        self.assertEqual(items[8]["label"], "character")
        self.assertNotIn("text", items[8])

    def test_remove_override_restores_color_defaults_and_wire_retains_ids(self):
        boxes = self.boxes()
        del boxes[8]["promptData"]
        framing, prompts = self.payload(boxes)
        self.assertEqual(json.loads(framing)["layout"]["boxes"], boxes)
        items = json.loads(bridge.build_from_krea(framing, prompts)["moss_json"])["items"]
        self.assertEqual(items[8]["caption"], "Old red")
        self.assertEqual(items[7]["caption"], "Independent item 7")

    def test_invalid_override_fails_instead_of_falling_back(self):
        for value in (None, [], {"prompt": 1}, {"prompt": "ok", "type": "invalid"}):
            boxes = self.boxes()
            boxes[0]["promptData"] = value
            with self.assertRaises(ValueError):
                bridge.build_from_krea(*self.payload(boxes))

    def test_text_legacy_and_shared_style(self):
        boxes = self.boxes()
        boxes[0]["promptData"] = {"type": "text", "prompt": "Words | gold lettering"}
        items = json.loads(bridge.build_from_krea(*self.payload(boxes), text_mode="legacy")["moss_json"])["items"]
        self.assertEqual(items[0]["text"], "Words")
        self.assertIn("gold", items[0]["caption"])
        items = json.loads(bridge.build_from_krea(*self.payload(boxes), text_mode="literal", text_style="Shared style")["moss_json"])["items"]
        self.assertEqual(items[0]["caption"], "Shared style")
        self.assertEqual(items[0]["text"], "Words | gold lettering")
