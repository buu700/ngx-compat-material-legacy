# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Independent full-image derivation and real source/proposal failure controls."""
from pathlib import Path
import json,os,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]
class BrowserReferenceProposalTests(unittest.TestCase):
    def test_independent_python_token_splice_and_protected_canonical(self):
        child=subprocess.run(['python3','-B','tests/browser_reference_independent.py'],cwd=ROOT,capture_output=True,text=True,timeout=300)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);report=json.loads(child.stdout)
        packet=json.loads((ROOT/'compatibility/rc/c04-browser-reference-proposal.json').read_bytes())
        self.assertEqual(report['independent_after_sha256'],packet['after_ledger']['sha256'])
        self.assertEqual(report['independent_after_bytes'],packet['after_ledger']['bytes'])
        self.assertEqual(report['hash_scalar_replacements'],packet['metadata_reference_updates'])
        self.assertEqual(report['selected_entries'],packet['selected_entries'])
        self.assertEqual(report['unselected_entry_bytes_preserved'],1697-packet['selected_entries'])
        self.assertEqual(report['preserved_native_reference_count'],packet['preserved_native_reference_count'])
        self.assertTrue(report['canonical_ledger_unchanged']);self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
        if os.environ.get('BROWSER_REFERENCE_INDEPENDENT_REPORT'):
            with Path(os.environ['BROWSER_REFERENCE_INDEPENDENT_REPORT']).open('x')as output:output.write(json.dumps(report,indent=2)+'\n')
    def test_actual_verifier_and_exact_complete_proposal_controls(self):
        command=['node','tests/browser_reference_proposal_probe.mjs']
        if os.environ.get('BROWSER_REFERENCE_PROPOSAL_REPORT'):command.append(os.environ['BROWSER_REFERENCE_PROPOSAL_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=180)
        self.assertEqual(child.returncode,0,(child.stdout+child.stderr)[-8000:]);report=json.loads(child.stdout)
        self.assertEqual(report['result'],'pass');self.assertEqual(report['partial_updates_rejected'],report['metadata_reference_updates'])
        self.assertEqual(report['preserved_reference_mutants_rejected'],8)
        self.assertEqual(report['changed_claim_mutants_rejected'],9);self.assertEqual(report['changed_scope_mutants_rejected'],12)
        self.assertEqual(report['unknown_complete_images_rejected'],2)
        self.assertEqual(report['cold_source_mutants_rejected'],report['bound_current_paths']);self.assertEqual(report['late_source_mutants_rejected'],report['bound_current_paths'])
        self.assertTrue(report['fresh_actual_source_verifier']);self.assertTrue(report['public_snapshot_mutations_do_not_change_private_guards']);self.assertTrue(report['canonical_ledger_unchanged'])
        self.assertFalse(report['canonical_frame_admission_granted']);self.assertFalse(report['canonical_owner_integration_complete']);self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])
if __name__=='__main__':unittest.main()
