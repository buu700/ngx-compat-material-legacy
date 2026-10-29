# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Preserved owner code and explicit source/cohort/admission boundaries."""
from pathlib import Path
import json,os,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class CheckerReferenceOwnerTests(unittest.TestCase):
 def test_original_owner_and_source_assertions_reader_guards_and_scope_boundaries(self):
  command=['node','tests/checker_reference_owner_probe.mjs','--source']
  if os.environ.get('CHECKER_OWNER_SOURCE_REPORT'):command.append(os.environ['CHECKER_OWNER_SOURCE_REPORT'])
  child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-9000:]);r=json.loads(child.stdout)
  self.assertTrue(r['actual_owner_byte_identical']);self.assertGreater(r['original_owner_top_level_statements'],40)
  self.assertEqual(len(r['source_preservation']),3);self.assertTrue(all(row['old_assertions_preserved']>5 for row in r['source_preservation']))
  self.assertGreater(r['cold_current_tool_mutants_rejected'],10);self.assertGreater(r['late_all_source_mutants_rejected'],100)
  self.assertTrue(r['unknown_frame_not_translated']);self.assertTrue(r['source_context_grants_no_canonical_admission']);self.assertTrue(r['strict_original_source_API_retained'])
  self.assertTrue(r['canonical_ledger_unchanged']);self.assertFalse(r['current_native_packed_or_floor_or_g11_credit']);self.assertFalse(r['actual_complete_owner_or_retained_roster_executed'])
 def test_actual_prepare_epoch_current_raw_reads_and_preserved_stage_population(self):
  child=subprocess.run(['node','tests/checker_reference_owner_probe.mjs','--runtime'],cwd=ROOT,capture_output=True,text=True,timeout=1800)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-9000:]);r=json.loads(child.stdout)
  self.assertTrue(r['actual_prepare_and_epoch_called']);self.assertEqual(r['source_admissions'],88 if r['line']=='21.x'else 13)
  self.assertEqual(r['checker_metadata_entries'],5 if r['line']=='21.x'else 13);self.assertEqual(r['preserved_inventory_metadata_entries'],19 if r['line']=='21.x'else 20)
  self.assertEqual(r['public_current_paths'],r['current_context_bound_sources']-1);self.assertEqual(r['actual_epoch_late_controls_rejected'],11)
  self.assertEqual(r['public_historical_projection_paths'],['compatibility/f10/disposition-ledger/ledger.json']);self.assertFalse(r['full_retained_roster_executed']);self.assertFalse(r['current_native_packed_or_floor_or_g11_credit'])
