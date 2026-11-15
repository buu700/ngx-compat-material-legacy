"""Source-review admission and exact metadata transition checks."""
import json
import subprocess
import unittest


class FrameworkDecorators2e270(unittest.TestCase):
    def run_probe(self, name):
        result = subprocess.run(['node', 'tests/' + name + '.mjs'], check=True, capture_output=True, text=True)
        return json.loads(result.stdout)

    def test_roles_and_metadata(self):
        result = self.run_probe('framework_decorators_2e270_roles_probe')
        self.assertEqual((result['cases'], result['unchanged'], result['mutations']), (60, 60, 3))

    def test_minimum(self):
        result = self.run_probe('framework_class_5628_minimum_probe')
        self.assertEqual((result['version'], result['members'], len(result['mutations'])), ('22.1.7', 27, 4))

    def test_exact_rows_and_admission(self):
        result = self.run_probe('framework_decorators_2e270_admission_probe')
        self.assertEqual((result['selected'], result['unchanged'], result['held']), (42, 1694, 18))
        self.assertTrue(result['structural_output_only'])
