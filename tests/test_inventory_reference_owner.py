# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""All original owner checks survive terminal inventory metadata integration."""
from pathlib import Path
import json,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class InventoryReferenceOwnerTests(unittest.TestCase):
 def test_original_owner_statements_and_metadata_context_controls(self):
  child=subprocess.run(['node','tests/inventory_reference_owner_probe.mjs','--source'],cwd=ROOT,capture_output=True,text=True,timeout=120)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r=json.loads(child.stdout)
  self.assertGreater(r['original_top_level_statements_preserved'],40)
  self.assertGreater(r['original_owner_functions_preserved'],10)
  self.assertEqual(r['added_public_wrappers'],3 if r['line']=='21.x'else 2);self.assertEqual(r['added_imports'],1)
  self.assertEqual(r['late_source_mutants_rejected'],r['cold_source_mutants_rejected']+1)
  self.assertTrue(r['unknown_frame_not_translated']);self.assertTrue(r['canonical_ledger_unchanged'])
  self.assertFalse(r['actual_owner_compiler_native_or_full_product_execution'])
  self.assertEqual(r['fresh_current_workflow_tests'],14)
  self.assertEqual(r['title_metadata_controls_rejected'],17 if r['line']=='21.x'else 0)
 def test_actual_current_prepare_epoch_and_public_raw_reader_contract(self):
  child=subprocess.run(['node','tests/inventory_reference_owner_probe.mjs','--runtime'],cwd=ROOT,capture_output=True,text=True,timeout=1800)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);r=json.loads(child.stdout)
  self.assertEqual(r['mode'],'actual-composite-owner');self.assertTrue(r['actual_prepare_and_epoch_called'])
  self.assertEqual(r['source_admissions'],88 if r['line']=='21.x'else 13)
  self.assertEqual(r['metadata_entries'],19 if r['line']=='21.x'else 20)
  self.assertGreaterEqual(r['current_context_bound_sources'],95)
  self.assertEqual(r['public_current_paths'],r['current_context_bound_sources']-1)
  self.assertEqual(r['fresh_current_workflow_tests'],14);self.assertEqual(r['actual_epoch_late_controls_rejected'],13 if r['line']=='21.x'else 11)
  self.assertEqual(r['public_historical_projection_paths'],['compatibility/f10/disposition-ledger/ledger.json'])
  self.assertFalse(r['current_native_packed_or_floor_or_g11_credit']);self.assertFalse(r['full_retained_roster_executed'])
