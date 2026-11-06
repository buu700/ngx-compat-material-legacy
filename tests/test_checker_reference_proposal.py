# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent full-image derivation and genuine current source controls."""
from pathlib import Path
import hashlib,json,os,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class CheckerReferenceProposalTests(unittest.TestCase):
 def test_independent_python_full_image_and_protected_canonical(self):
  child=subprocess.run(['python3','-B','tests/checker_reference_independent.py'],cwd=ROOT,capture_output=True,text=True,timeout=180)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-7000:]);r=json.loads(child.stdout)
  packet=json.loads((ROOT/'compatibility/rc/c04-checker-reference-proposal.json').read_bytes())
  self.assertEqual(r['independent_after_sha256'],packet['after_ledger']['sha256']);self.assertEqual(r['independent_after_bytes'],packet['after_ledger']['bytes'])
  self.assertEqual(r['hash_scalar_replacements'],13 if r['line']=='main'else 5);self.assertEqual(r['already_current_checker_references_preserved'],7 if r['line']=='main'else 14)
  self.assertEqual(r['unselected_entry_bytes_preserved'],1697-r['hash_scalar_replacements']);self.assertTrue(r['canonical_ledger_unchanged'])
  self.assertFalse(r['canonical_owner_integration_complete']);self.assertFalse(r['actual_native_packed_browser_floor_or_full_audit_qualified'])
  if os.environ.get('CHECKER_REFERENCE_INDEPENDENT_REPORT'):
   with Path(os.environ['CHECKER_REFERENCE_INDEPENDENT_REPORT']).open('x')as out:out.write(json.dumps(r,indent=2)+'\n')
 def test_actual_source_verifier_and_complete_proposal_corruption_controls(self):
  command=['node','tests/checker_reference_proposal_probe.mjs']
  if os.environ.get('CHECKER_REFERENCE_PROPOSAL_REPORT'):command.append(os.environ['CHECKER_REFERENCE_PROPOSAL_REPORT'])
  child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
  self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);r=json.loads(child.stdout)
  self.assertEqual(r['result'],'pass');self.assertEqual(r['partial_updates_rejected'],r['metadata_reference_updates'])
  self.assertEqual(r['preserved_reference_mutants_rejected'],r['already_current_checker_references_preserved'])
  self.assertEqual(r['changed_claim_mutants_rejected'],8);self.assertEqual(r['changed_scope_mutants_rejected'],11)
  self.assertEqual(r['cold_source_mutants_rejected'],r['bound_current_paths']);self.assertEqual(r['late_source_mutants_rejected'],r['bound_current_paths'])
  self.assertTrue(r['fresh_actual_source_verifier']);self.assertTrue(r['public_snapshot_mutations_do_not_change_private_guards']);self.assertTrue(r['canonical_ledger_unchanged'])
  self.assertFalse(r['canonical_owner_integration_complete']);self.assertFalse(r['actual_native_packed_browser_floor_or_full_audit_qualified'])
