"""The genuine current table must retain historical viewport independence."""
from pathlib import Path
import json
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
class TableVirtualContextTests(unittest.TestCase):
    def test_owned_constructor_and_two_injection_counterexamples(self):
        for mode in ('owned', 'unmasked', 'view-provider'):
            with self.subTest(mode=mode):
                result = subprocess.run(['node', 'tests/table_virtual_context_probe.mjs', mode],
                                        cwd=ROOT, capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
                row = json.loads(result.stdout.strip().splitlines()[-1])
                self.assertEqual(row['direct']['public_fixedLayout'], mode == 'unmasked')
                self.assertEqual(row['direct']['later_injector_viewport_preserved'], mode != 'view-provider')
                self.assertEqual(row['nested']['public_fixedLayout'], False)

    def test_full_and_partial_aot_factories_and_strict_unknown_input_rejection(self):
        result = subprocess.run(['node', 'tests/table_virtual_context_aot_probe.mjs'],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stdout + result.stderr)[-7000:])
        row = json.loads(result.stdout.strip().splitlines()[-1])
        self.assertEqual(row['compilations'], 3)
        self.assertEqual([f['mode'] for f in row['factories']], ['full', 'partial'])
        self.assertTrue(all(f['compiled_component_factory_executed'] and
                            f['inherited_inputs'] == 5 for f in row['factories']))
