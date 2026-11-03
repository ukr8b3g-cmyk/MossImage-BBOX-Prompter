import importlib
import json
import sys
import types
import unittest
from unittest.mock import patch

from test_krea_bridge import package


class AnalysisSafetyTests(unittest.TestCase):
    def setUp(self):
        latest = types.ModuleType('comfy_api.latest')
        latest.io = types.SimpleNamespace(ComfyNode=object, NodeOutput=lambda *args: types.SimpleNamespace(result=args))
        self.calls = []
        core = types.ModuleType('comfy_extras.nodes_textgen')
        def generate(**kwargs):
            self.calls.append(kwargs)
            return types.SimpleNamespace(result=('New appearance', ''))
        core.TextGenerate = types.SimpleNamespace(execute=generate)
        context = patch.dict(sys.modules, {'comfy_api': types.ModuleType('comfy_api'),
            'comfy_api.latest': latest, 'comfy_extras': types.ModuleType('comfy_extras'),
            'comfy_extras.nodes_textgen': core})
        context.start()
        self.addCleanup(context.stop)
        self.module = importlib.import_module(package.__name__ + '.image_analysis')
        self.node = self.module.MOSSBBoxImageAnalysis
        self.node.hidden = types.SimpleNamespace(unique_id='30', prompt={})
        crop = patch.object(self.module, 'crop_image', return_value='CPU crop stand-in')
        self.crop = crop.start()
        self.addCleanup(crop.stop)
        self.box = dict(id='a', slot='red', x1=0, y1=0, x2=64, y2=64)

    def run_node(self, kind='character'):
        frame = json.dumps(dict(version='krea2_element_framing_v1', moss_canvas_id='10',
                                width=100, height=100, layout={'boxes': [self.box]}))
        return self.node.execute(clip=object(), framing_data=frame, image=object(), target='a', kind=kind)

    def shared(self, value, through_switch=True):
        prompt = {'30': {'class_type': 'MOSSBBoxImageAnalysis', 'inputs': {}}}
        link = ['30', 0]
        if through_switch:
            prompt['40'] = {'class_type': 'ComfySwitchNode', 'inputs': {'switch': True, 'on_true': link}}
            link = ['40', 0]
        prompt['20'] = {'class_type': 'MOSSSharedPrompter', 'inputs': {'external_text': link, 'red_type': value}}
        self.node.hidden.prompt = prompt

    def assert_stops_before_generation(self):
        with self.assertRaisesRegex(ValueError, 'cannot replace a Text box'):
            self.run_node()
        self.crop.assert_not_called()
        self.assertEqual(self.calls, [])

    def test_individual_text_is_rejected_before_crop_or_model_call(self):
        self.box['promptData'] = {'type': 'text', 'prompt': 'Hello! 日本語 (12:30)'}
        before = json.dumps(self.box)
        self.assert_stops_before_generation()
        self.assertEqual(json.dumps(self.box), before)

    def test_inherited_text_is_resolved_from_the_actual_queued_switch_and_prompter(self):
        self.shared('text')
        self.assert_stops_before_generation()

    def test_inherited_text_direct_connection_is_rejected(self):
        self.shared('text', through_switch=False)
        self.assert_stops_before_generation()

    def test_text_cannot_hide_behind_a_previous_text_link(self):
        self.shared('text')
        self.node.hidden.prompt['50'] = {'class_type': 'MOSSBBoxTextLink', 'inputs': {'previous': ['40', 0]}}
        self.node.hidden.prompt['20']['inputs']['external_text'] = ['50', 0]
        self.assert_stops_before_generation()

    def test_all_actual_consumers_are_checked_for_shared_text(self):
        self.shared('character')
        self.node.hidden.prompt['21'] = {'class_type': 'MOSSSharedPrompter', 'inputs': {'external_text': ['40', 0], 'red_type': 'text'}}
        self.assert_stops_before_generation()

    def test_individual_character_overrides_a_shared_text_type(self):
        self.shared('text')
        self.box['promptData'] = {'type': 'character', 'prompt': 'Saved appearance'}
        self.assertEqual(self.run_node().result[0][0]['text'], 'New appearance')
        self.assertEqual(len(self.calls), 1)

    def test_character_object_and_legacy_obj_continue_to_work(self):
        for value in ['character', 'object', 'obj']:
            with self.subTest(type=value):
                self.shared(value)
                self.assertEqual(self.run_node().result[0][0]['text'], 'New appearance')
        self.assertEqual(len(self.calls), 3)

    def test_omitted_individual_type_uses_the_existing_object_default(self):
        self.shared('text')
        self.box['promptData'] = {'prompt': 'Legacy prompt without Type'}
        self.assertEqual(self.run_node().result[0][0]['text'], 'New appearance')

    def test_invalid_explicit_type_is_not_silently_changed(self):
        self.box['promptData'] = {'prompt': 'Saved', 'type': ''}
        with self.assertRaisesRegex(ValueError, 'MOSS Type'):
            self.run_node()
        self.assertEqual(self.calls, [])

    def test_shared_type_participates_in_native_cache_fingerprinting(self):
        self.shared('character')
        before = self.node.fingerprint_inputs()
        self.node.hidden.prompt['20']['inputs']['red_type'] = 'text'
        self.assertNotEqual(self.node.fingerprint_inputs(), before)
        current = self.node.fingerprint_inputs()
        self.node.hidden.prompt['20']['inputs']['red_prompt'] = 'Different manual text'
        self.assertEqual(self.node.fingerprint_inputs(), current)


if __name__ == '__main__':
    unittest.main()
