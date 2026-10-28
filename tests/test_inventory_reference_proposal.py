# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Inventory proposals preserve all judgments and reject incomplete metadata successors."""
from pathlib import Path
import json,subprocess,sys,unittest
ROOT=Path(__file__).resolve().parents[1]
class InventoryReferenceProposalTests(unittest.TestCase):
 def test_fresh_real_producer_and_all_metadata_source_corruption_controls(self):
  child=subprocess.run(['node','tests/inventory_reference_proposal_probe.mjs'],cwd=ROOT,capture_output=True,text=True,timeout=120)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r=json.loads(child.stdout);n=20 if r['line']=='main'else 19
  self.assertEqual(r['metadata_reference_updates'],n);self.assertEqual(r['unselected_entries_preserved'],1697-n)
  self.assertEqual(r['partial_after_images_rejected'],n);self.assertEqual(r['historical_rebinding_mutants_rejected'],20)
  self.assertEqual(r['extra_claim_judgment_or_scope_mutants_rejected'],8)
  self.assertEqual(r['cold_source_mutants_rejected'],r['bound_sources']);self.assertEqual(r['late_source_mutants_rejected'],r['bound_sources'])
  self.assertTrue(r['canonical_ledger_unchanged']);self.assertFalse(r['canonical_owner_integration_complete']);self.assertFalse(r['actual_native_packed_browser_floor_or_full_audit_qualified'])
 def test_independent_python_byte_token_derivation_matches_whole_after_image(self):
  child=subprocess.run([sys.executable,'tests/inventory_reference_independent.py'],cwd=ROOT,capture_output=True,text=True,timeout=30)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r=json.loads(child.stdout);n=20 if r['line']=='main'else 19
  self.assertEqual(r['hash_scalar_replacements'],n);self.assertEqual(r['unselected_entry_bytes_preserved'],1697-n)
  self.assertTrue(r['canonical_ledger_unchanged']);self.assertFalse(r['canonical_owner_integration_complete']);self.assertFalse(r['actual_native_packed_browser_floor_or_full_audit_qualified'])
