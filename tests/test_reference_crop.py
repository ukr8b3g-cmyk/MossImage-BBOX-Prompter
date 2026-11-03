import importlib.util
import json
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('reference_crop', Path(__file__).parents[1] / 'reference_crop.py')
crop = importlib.util.module_from_spec(spec)
spec.loader.exec_module(crop)


class ReferenceCropTests(unittest.TestCase):
    def test_analysis_auto_uses_first_stored_box_and_never_replaces_explicit_ids(self):
        f=self.frame()
        f['layout']['boxes'].insert(0,dict(id='blue-first',slot='blue'))
        self.assertEqual(crop.analysis_target(f,''),'blue-first')
        self.assertEqual(crop.analysis_target(json.dumps(f),''),'blue-first')
        self.assertEqual(crop.analysis_target(f,'target'),'target')
        self.assertEqual(crop.analysis_target(f,'deleted'),'deleted')
        f['layout']['boxes'].pop(0)
        self.assertEqual(crop.analysis_target(f,''),'target')
        f['layout']['boxes'].clear()
        with self.assertRaisesRegex(ValueError,'Auto target: no box'):crop.analysis_target(f,'')

    def frame(self, box=None, width=100, height=100):
        return dict(version='krea2_element_framing_v1', width=width, height=height,
                    layout={'boxes': [dict(id='target', x1=0, y1=0, x2=100, y2=100, **(box or {}))]})

    def test_contain_padding_and_reverse(self):
        frame = self.frame()
        self.assertEqual(crop.crop_bounds(frame, 'target', 200, 100), (0, 0, 200, 100))
        frame['layout']['boxes'][0].update(x1=75, x2=25, y1=60, y2=40)
        self.assertEqual(crop.crop_bounds(frame, 'target', 200, 100), (50, 30, 150, 70))

    def test_duplicate_missing_and_empty_ids(self):
        f = self.frame()
        for key in ['', 'missing', None]:
            with self.assertRaises(ValueError): crop.crop_bounds(f, key, 100, 100)
        f['layout']['boxes'] *= 2
        with self.assertRaises(ValueError): crop.crop_bounds(f, 'target', 100, 100)

    def test_padding_zero_area_invalid_numbers(self):
        for patch in [dict(y1=0,y2=20), dict(x1=5,x2=5), dict(x1=True), dict(x1=float('nan')), dict(y2=float('inf'))]:
            f=self.frame()
            f['layout']['boxes'][0].update(patch)
            with self.assertRaises(ValueError): crop.crop_bounds(f, 'target', 200, 100)

    def test_bad_frame_and_size(self):
        for f in [{}, [], None, {'version': 'wrong'}, self.frame(width=0), self.frame(height=True)]:
            with self.assertRaises(ValueError): crop.crop_bounds(f,'target',100,100)

    def test_json_and_rounded_intersection(self):
        f=self.frame()
        f['layout']['boxes'][0].update(x1=10.1,y1=20.2,x2=30.1,y2=40.1)
        self.assertEqual(crop.crop_bounds(json.dumps(f),'target',100,100),(10,20,31,41))


if __name__=='__main__': unittest.main()
