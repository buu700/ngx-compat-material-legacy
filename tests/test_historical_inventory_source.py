"""Stale source snapshots and false historical identities must fail verify-lite."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('rc_verify_lite', ROOT / 'scripts/historical_inventory_source.py')
lite = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lite)


class HistoricalInventorySourceTests(unittest.TestCase):
    def test_actual_branch_inventory(self):
        inventory = json.loads((ROOT / 'testing/legacy-runner/historical-inventory.json').read_text())
        selection = json.loads((ROOT / 'testing/legacy-runner/historical-specs.json').read_text())
        lite.check_inventory_source_bindings(inventory, selection)
        self.assertEqual(len(inventory['rows']), 57)

    def test_stale_and_forged_inventory_claims(self):
        inventory = json.loads((ROOT / 'testing/legacy-runner/historical-inventory.json').read_text())
        selection = json.loads((ROOT / 'testing/legacy-runner/historical-specs.json').read_text())
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            reference = root / lite.HISTORICAL_REFERENCE
            reference.parent.mkdir(parents=True)
            reference.write_bytes((ROOT / lite.HISTORICAL_REFERENCE).read_bytes())
            for row in inventory['rows']:
                p = root / row['candidate']
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text('// synthetic current test source\n')
                row['candidate_sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
                row['adaptation'] = 'adapted'
            inventory['counts']['identical_to_historical'] = 0
            inventory['counts']['adapted'] = 57
            for row in inventory['shared_suite_shims']:
                p = root / row['path']
                p.parent.mkdir(parents=True, exist_ok=True)
                p.write_text('// synthetic current shim\n')
                row['sha256'] = hashlib.sha256(p.read_bytes()).hexdigest()
            lite.check_inventory_source_bindings(inventory, selection, root=root)
            mutations = {
                'stale-candidate': lambda b: b['rows'][0].update(candidate_sha256='a' * 64),
                'false-identical': lambda b: b['rows'][0].update(adaptation='identical-to-historical'),
                'changed-reference': lambda b: b['rows'][0].update(historical_sha256='a' * 64),
                'duplicate-member': lambda b: b['rows'].__setitem__(0, b['rows'][1]),
                'wrong-count': lambda b: b['counts'].update(adapted=56),
                'stale-shim': lambda b: b['shared_suite_shims'][0].update(sha256='a' * 64),
                'missing-shim': lambda b: b['shared_suite_shims'].pop(),
            }
            for label, mutate in mutations.items():
                with self.subTest(label=label):
                    bad = copy.deepcopy(inventory)
                    mutate(bad)
                    with self.assertRaises(SystemExit):
                        lite.check_inventory_source_bindings(bad, selection, root=root)
            bad_selection = copy.deepcopy(selection)
            bad_selection[0]['historical_sha256'] = 'a' * 64
            with self.assertRaises(SystemExit):
                lite.check_inventory_source_bindings(inventory, bad_selection, root=root)
            reference.write_text('forged frozen reference\n')
            with self.assertRaises(SystemExit):
                lite.check_inventory_source_bindings(inventory, selection, root=root)
