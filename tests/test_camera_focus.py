import copy
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
import test_box_prompts as box_tests
from test_krea_bridge import package, bridge, shared_source as controls


class CameraFocusTests(unittest.TestCase):
    def test_schema_order_and_js_python_candidates(self):
        schema = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter'].INPUT_TYPES()
        names = [name for group in ('required', 'optional') for name, entry in schema[group].items() if 'default' in entry[1]]
        self.assertEqual(len(names), 38)
        self.assertEqual(names[31:], [f'{slot}_focus' for slot in bridge.SLOTS])
        module = (Path(__file__).resolve().parents[1] / 'web/camera_options.mjs').as_uri()
        values = json.loads(subprocess.check_output(['node', '--input-type=module', '-e',
            f'import {{FOCUS_OPTIONS,NEW_ANGLES}} from {json.dumps(module)};console.log(JSON.stringify([FOCUS_OPTIONS,NEW_ANGLES]));'], text=True))
        self.assertEqual(values, [list(controls.FOCUS_OPTIONS), list(controls.NEW_ANGLES)])
        self.assertEqual(len(controls.ANGLE_OPTIONS), 27)
        self.assertEqual(len(set(controls.ANGLE_OPTIONS)), 27)
        self.assertEqual(controls.ANGLE_OPTIONS.count('Dutch angle'), 1)
        self.assertNotIn('Rear view, looking back', controls.ANGLE_OPTIONS)

    def test_all_color_focuses_are_authoritative_and_unused_focus_only_does_not_create_content(self):
        framing, _ = box_tests.BoxPromptTests().payload([])
        node = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter']()
        for slot in bridge.SLOTS:
            for focus in controls.FOCUS_OPTIONS:
                stale = json.dumps({'slotValues': {slot: {'focus': 'Hands'}}})
                prompts = node.execute(**{f'{slot}_focus': focus, 'prompt_ui_data': stale})[0]
                for mode in ('auto', 'caption', 'hybrid', 'layout_json'):
                    result = bridge.build_from_krea(framing, prompts, output_mode=mode)
                    self.assertNotIn('visual emphasis', result['prompt'])
                    self.assertEqual(json.loads(result['moss_json'])['items'], [])
                prompts = node.execute(**{f'{slot}_focus': focus, f'{slot}_prompt': 'subject'})[0]
                value = json.loads(prompts)['slots'][slot]
                self.assertEqual(value.get('focus', 'Auto'), focus)
                result = bridge.build_from_krea(framing, prompts, output_mode='caption')
                if focus != 'Auto': self.assertIn(controls.FOCUS_DESC_MAP[focus], result['prompt'])

    def test_id_focus_auto_missing_inheritance_and_text_preservation(self):
        literal = '  日本語\n"exact" | keep  '
        boxes = box_tests.BoxPromptTests().boxes()[:4]
        boxes[0]['promptData'] = {'type': 'character', 'prompt': 'person', 'focus': 'Breasts'}
        boxes[1]['promptData'] = {'type': 'object', 'prompt': 'object', 'focus': 'Auto'}
        boxes[2]['promptData'] = {'type': 'text', 'prompt': literal, 'focus': 'Crotch'}
        del boxes[3]['promptData']
        framing, _ = box_tests.BoxPromptTests().payload(boxes)
        prompts = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter']().execute(red_prompt='inherited', red_focus='Hands')[0]
        before = copy.deepcopy(boxes)
        for mode in ('auto', 'caption', 'hybrid', 'layout_json'):
            items = json.loads(bridge.build_from_krea(framing, prompts, text_mode='literal', output_mode=mode)['moss_json'])['items']
            self.assertIn('breasts', items[0]['caption'])
            self.assertNotIn('visual emphasis', items[1]['caption'])
            self.assertEqual(items[2]['text'], literal)
            self.assertNotIn('crotch', items[2]['caption'])
            self.assertIn('hands', items[3]['caption'])
            self.assertTrue(all('focus' not in item for item in items))
        boxes[1]['promptData'].pop('focus')
        framing, _ = box_tests.BoxPromptTests().payload(boxes)
        items = json.loads(bridge.build_from_krea(framing, prompts)['moss_json'])['items']
        self.assertNotIn('hands', items[1]['caption'])
        self.assertEqual(before[0], boxes[0])

    def test_unknown_focus_values_fail_in_api_and_id_data(self):
        node = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter']()
        for value in (None, False, 1, '', 'hands', [], {}):
            with self.assertRaisesRegex(ValueError, 'Focus'): node.execute(red_focus=value)
            boxes = box_tests.BoxPromptTests().boxes()[:1]
            boxes[0]['promptData']['focus'] = value
            with self.assertRaisesRegex(ValueError, 'Focus'): bridge.build_from_krea(*box_tests.BoxPromptTests().payload(boxes))

    def test_empty_prompt_with_a_box_still_receives_focus(self):
        boxes = box_tests.BoxPromptTests().boxes()[:1]
        del boxes[0]['promptData']
        framing, _ = box_tests.BoxPromptTests().payload(boxes)
        prompts = package.NODE_CLASS_MAPPINGS['MOSSSharedPrompter']().execute(red_focus='Crotch')[0]
        for mode in ('auto', 'caption', 'hybrid', 'layout_json'):
            items = json.loads(bridge.build_from_krea(framing, prompts, output_mode=mode)['moss_json'])['items']
            self.assertEqual(len(items), 1)
            self.assertIn('crotch', items[0]['caption'])

    def test_new_angle_focus_diagnostic_words_do_not_become_placement_warnings(self):
        boxes = box_tests.BoxPromptTests().boxes()[:1]
        boxes[0].update(x1=32, x2=200, y1=800, y2=1000)
        boxes[0]['promptData'] = {'type': 'character', 'prompt': 'person', 'angle': 'Rear 3/4 right', 'focus': 'Upper torso'}
        result = bridge.build_from_krea(*box_tests.BoxPromptTests().payload(boxes))
        self.assertFalse(any('conflict' in warning for warning in result['warnings']))
        self.assertIn('three-quarter rear view from the right', result['prompt'])
        boxes[0]['promptData']['prompt'] = 'person on the right'
        result = bridge.build_from_krea(*box_tests.BoxPromptTests().payload(boxes))
        self.assertTrue(any('conflict' in warning for warning in result['warnings']))

    def test_old_angles_and_auto_outputs_match_the_prechange_package(self):
        baseline = os.environ.get('MOSS_FOCUS_BEFORE_ROOT')
        if not baseline: self.skipTest('Set MOSS_FOCUS_BEFORE_ROOT for release baseline comparison')
        spec = importlib.util.spec_from_file_location('moss_focus_before', Path(baseline) / '__init__.py', submodule_search_locations=[baseline])
        old = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = old
        spec.loader.exec_module(old)
        old_bridge = sys.modules[spec.name + '.krea_bridge']
        old_controls = sys.modules[spec.name + '.canvas_controls']
        self.assertEqual(controls.ANGLE_OPTIONS[:24], old_controls.ANGLE_OPTIONS)
        self.assertEqual({k: controls.ANGLE_DESC_MAP[k] for k in old_controls.ANGLE_OPTIONS}, old_controls.ANGLE_DESC_MAP)
        self.assertEqual(controls.FRAMING_OPTIONS, old_controls.FRAMING_OPTIONS)
        for angle in old_controls.ANGLE_OPTIONS:
            boxes = box_tests.BoxPromptTests().boxes()[:1]
            boxes[0]['promptData']['angle'] = angle
            framing, prompts = box_tests.BoxPromptTests().payload(boxes)
            for mode in ('auto', 'caption', 'hybrid', 'layout_json'):
                self.assertEqual(bridge.build_from_krea(framing, prompts, output_mode=mode), old_bridge.build_from_krea(framing, prompts, output_mode=mode))
