# @license Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester.
"""Authenticated main/21 dispatch keeps historical probe names and fails closed."""
import hashlib
import importlib
import json
from pathlib import Path
import subprocess
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch
ROOT = Path(__file__).resolve().parents[1]
NAMES = ('source', 'review', 'types', 'input', 'harness')
REPORTS = {
 'source': {'selected':7,'complete_owned_source_graph':91,'input_corruptions_rejected':10,'late_changes_rejected':2,'canonical_ledgers_unchanged':True,'source_closures_prepared':0,'product_changes':0},
 'review': {'prepared_individual_reviews':7,'input_corruptions_rejected':10,'late_changes_rejected':2,'canonical_ledgers_unchanged':True},
 'types': {'owned_sources':91,'diagnostics':0,'negative_type_controls':10,'public_input_extension_points':3,'public_placeholder_contract_checked':True,'source_closures':0},
 'input': {'cases':14,'source_files':91,'behavior_faults_rejected':4,'source_closures':0},
 'harness': {'cases':30,'source_files':91,'behavior_faults_rejected':6,'source_closures':0},
}
class MaterialRemainingRoute(unittest.TestCase):
 def test_pinned_capture_and_21_probe_dispatch(self):
  current = (ROOT/'compatibility/rc/material-remaining-caller-prior.json').read_bytes()
  historical = subprocess.check_output(['git','--no-replace-objects','show','204d1f95eb0edfc8ac6da45dc2aee66fbea89de6:compatibility/rc/material-remaining-caller-prior.json'],cwd=ROOT)
  self.assertEqual(hashlib.sha256(historical).hexdigest(),'838ef6fba77dc90eedb7ef4c4c3e6cba70831379ef8914a53b78b88cabca44b5')
  with tempfile.TemporaryDirectory(prefix='material-route-') as directory:
   temp=Path(directory);dest=temp/'compatibility/rc/material-remaining-caller-prior.json';dest.parent.mkdir(parents=True)
   for name in NAMES:
    m=importlib.import_module('tests.test_material_remaining_caller_'+name)
    with patch.object(m,'ROOT',temp):
     dest.write_bytes(current);self.assertTrue(m.current_epoch());dest.write_bytes(historical);self.assertFalse(m.current_epoch());dest.write_bytes(historical+b'\n')
     with self.assertRaises(AssertionError):m.current_epoch()
    report=REPORTS[name];klass=next(getattr(m,x) for x in dir(m) if x.startswith('MaterialRemainingCaller') and isinstance(getattr(m,x),type))
    with patch.object(m,'current_epoch',return_value=False),patch.object(m.subprocess,'run',return_value=SimpleNamespace(returncode=0,stdout=json.dumps(report),stderr='')) as run:
     test=next(x for x in dir(klass) if x.startswith('test_'));getattr(klass(test),test)();expected='type' if name=='types' else name
     self.assertIn('tests/material_remaining_caller_'+expected+'_probe.mjs',run.call_args.args[0])
if __name__=='__main__':unittest.main()
