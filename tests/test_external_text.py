import copy
import json
import unittest

from test_krea_bridge import package, bridge
from importlib import import_module

external = import_module(package.__name__ + ".external_text")


class ExternalTextTests(unittest.TestCase):
    def frame(self, canvas="11", boxes=None):
        node = package.NODE_CLASS_MAPPINGS["MOSSSharedCanvas"]()
        values = {key: info[1]["default"] for key, info in node.INPUT_TYPES()["required"].items()}
        if boxes is None:
            boxes = [{"id": f"box-{i}", "slot": "blue", "x1": 10+i*200, "y1": 10, "x2": 150+i*200, "y2": 180,
                      "promptData": {"prompt": f"Manual {i}", "type": "text", "textStyle": {"mode": "individual", "color": "gold"}}} for i in range(2)]
        return node.execute(unique_id=canvas, **dict(values, layout_data=json.dumps({"boxes": boxes})))[0]

    def prompt(self, links):
        return package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(external_text=links, blue_type="text", blue_prompt="Shared old text")

    def test_external_is_literal_in_two_exports_and_preserves_all_manual_data(self):
        frame = self.frame()
        text = '  text: "こんにちは | hello"\n次の行 😀  '
        links = external.link_text(frame, text, "box-0", link_id="20")
        before = copy.deepcopy(links)
        prompt = self.prompt(links)
        self.assertEqual(prompt["ui"]["moss_external_text"][0]["text"], text)
        for text_mode in ("legacy", "literal"):
            for output_mode in ("auto", "hybrid", "caption", "layout_json"):
                result = bridge.build_from_krea(frame, prompt["result"][0], output_mode=output_mode, text_mode=text_mode)
                items = json.loads(result["moss_json"])["items"]
                self.assertEqual(items[0]["text"], text)
                self.assertEqual(items[1]["text"], "Manual 1")
                self.assertIn("gold", items[0]["caption"])
                self.assertNotIn("Shared old text", result["prompt"])
                self.assertNotIn("Manual 0", result["prompt"])
        self.assertEqual(links, before)
        self.assertEqual(json.loads(frame)["layout"]["boxes"][0]["promptData"]["prompt"], "Manual 0")

    def test_empty_replaces_text_and_unlink_restores_manual(self):
        frame = self.frame()
        wired = self.prompt(external.link_text(frame, "", "box-0"))["result"][0]
        result = bridge.build_from_krea(frame, wired, text_mode="literal")
        self.assertNotIn("Manual 0", result["prompt"])
        self.assertNotIn("Shared old text", result["prompt"])
        plain = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute()[0]
        self.assertIn("Manual 0", bridge.build_from_krea(frame, plain)["prompt"])

    def test_same_color_multiple_links_and_canvas_identity(self):
        a, b = self.frame("11"), self.frame("12")
        first = external.link_text(a, "First", "box-0", link_id="20")
        second = external.link_text(a, "Second", "box-1", first, "21")
        combined = external.link_text(b, "Other Canvas", "box-0", second, "22")
        prompt = self.prompt(combined)["result"][0]
        items_a = json.loads(bridge.build_from_krea(a, prompt)["moss_json"])["items"]
        items_b = json.loads(bridge.build_from_krea(b, prompt)["moss_json"])["items"]
        self.assertEqual([x["text"] for x in items_a], ["First", "Second"])
        self.assertEqual([x["text"] for x in items_b], ["Other Canvas", "Manual 1"])
        self.assertEqual(len(first), 1)
        # Two Prompters can independently override the same Canvas.
        other = self.prompt(external.link_text(a, "Alternative", "box-0"))["result"][0]
        self.assertIn("Alternative", bridge.build_from_krea(a, other)["prompt"])
        self.assertNotIn("Alternative", bridge.build_from_krea(a, prompt)["prompt"])

    def test_invalid_inputs_never_fall_back(self):
        frame = self.frame()
        good = external.link_text(frame, "External", "box-0")
        for text in (None, 1, [], {}):
            with self.subTest(text=text), self.assertRaises(ValueError):
                external.link_text(frame, text, "box-0")
        for target in ("", "deleted", None):
            with self.subTest(target=target), self.assertRaises(ValueError):
                external.link_text(frame, "Text", target)
        with self.assertRaisesRegex(ValueError, "only once"):
            external.link_text(frame, "Conflict", "box-0", good)
        # Standard If/Else with no OFF branch returns None: use saved manual text.
        self.assertNotIn('external_text', json.loads(self.prompt(None)[0]))
        missing = self.frame(boxes=json.loads(frame)["layout"]["boxes"][1:])
        with self.assertRaisesRegex(ValueError, "no longer exists"):
            bridge.build_from_krea(missing, self.prompt(good)["result"][0])

    def test_external_object_keeps_type_camera_and_shared_style(self):
        boxes = json.loads(self.frame())["layout"]["boxes"]
        boxes[0]["promptData"] = {"type": "character", "prompt": "Old", "angle": "Side view", "focus": "Face"}
        frame = self.frame(boxes=boxes)
        result = bridge.build_from_krea(frame, self.prompt(external.link_text(frame, "New", "box-0"))["result"][0])
        item = json.loads(result["moss_json"])["items"][0]
        self.assertEqual(item["label"], "character")
        self.assertIn("New", item["caption"])
        self.assertNotIn("Old", item["caption"])
        self.assertIn("side", item["caption"].lower())

    def test_no_individual_override_uses_shared_type_and_style(self):
        boxes = json.loads(self.frame())["layout"]["boxes"]
        del boxes[0]["promptData"]
        frame = self.frame(boxes=boxes)
        result = bridge.build_from_krea(frame, self.prompt(external.link_text(frame, "External | exact", "box-0"))["result"][0], text_style="White letters")
        item = json.loads(result["moss_json"])["items"][0]
        self.assertEqual(item["text"], "External | exact")
        self.assertEqual(item["caption"], "White letters")

    def test_optional_socket_does_not_shift_saved_widgets(self):
        inputs = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"].INPUT_TYPES()
        self.assertEqual(list(inputs["optional"])[-1], "external_text")
        self.assertEqual(inputs["optional"]["external_text"][0], "MOSS_BBOX_TEXT_LINKS")
        plain = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute()
        self.assertIsInstance(plain, tuple)
        self.assertNotIn("external_text", json.loads(plain[0]))

    def test_switch_off_none_is_exactly_the_saved_manual_source(self):
        node = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter']()
        manual = node.execute(red_prompt='Saved manual', red_type='character')
        self.assertEqual(node.execute(red_prompt='Saved manual', red_type='character', external_text=None), manual)

    def test_external_on_blank_boxes_in_all_seven_colors(self):
        for slot in ("red", "blue", "yellow", "green", "magenta", "cyan", "orange"):
            with self.subTest(slot=slot):
                boxes = [{"id": "blank", "slot": slot, "x1": 10, "y1": 10, "x2": 150, "y2": 180}]
                frame = self.frame(boxes=boxes)
                prompt = package.NODE_CLASS_MAPPINGS["MOSSSharedPrompter"]().execute(
                    external_text=external.link_text(frame, "External body", "blank"))["result"][0]
                self.assertIn("External body", bridge.build_from_krea(frame, prompt)["prompt"])


if __name__ == "__main__":
    unittest.main()
