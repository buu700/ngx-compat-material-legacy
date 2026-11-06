# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Exact browser helper transitions and whole current dialog callback ownership."""
from pathlib import Path
import hashlib,json,os,subprocess,unittest
ROOT=Path(__file__).resolve().parents[1]

class BrowserReferenceSourceTests(unittest.TestCase):
    def test_reviewed_source_and_current_callback_controls(self):
        command=['node','tests/browser_reference_source_probe.mjs']
        if os.environ.get('BROWSER_REFERENCE_SOURCE_REPORT'):
            command.append(os.environ['BROWSER_REFERENCE_SOURCE_REPORT'])
        child=subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=300)
        self.assertEqual(child.returncode,0,child.stdout+child.stderr)
        report=json.loads(child.stdout)
        self.assertEqual(report['complete_source_transitions'],4)
        self.assertEqual(report['individually_reviewed_hunks'],23)
        self.assertEqual(len(report['whole_current_dialog_probe_collaborator_runs']),8)
        self.assertEqual(report['title_contract_negative_controls'],47)
        self.assertEqual(report['cold_source_faults_rejected'],report['bound_current_paths'])
        self.assertEqual(report['late_source_faults_rejected'],report['bound_current_paths'])
        packet=json.loads((ROOT/'compatibility/rc/c04-browser-reference-source-inputs.json').read_bytes())
        cohort=subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+packet['protected_ledger']['path']],cwd=ROOT)
        self.assertTrue(hashlib.sha256(cohort).hexdigest()==packet['protected_ledger']['sha256'])
        live=(ROOT/packet['protected_ledger']['path']).read_bytes()
        self.assertEqual(report['current_ledger_equals_reviewed_cohort'],live==cohort)
        self.assertEqual(report['current_physical_ledger_sha256'],hashlib.sha256(live).hexdigest())
        self.assertFalse(report['canonical_frame_admission_granted'])
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])

    def test_protected_ledger_and_browser_helpers_remain_exact(self):
        packet=json.loads((ROOT/'compatibility/rc/c04-browser-reference-source-inputs.json').read_bytes())
        for ref in [packet['protected_ledger'],*[row['after']for row in packet['transitions']]]:
            # The zone and surface successors authenticate their current bytes
            # separately; the immutable review names these Git DATA images.
            historical = {packet['protected_ledger']['path'], 'scripts/browser-required-cells.mjs',
                          'scripts/browser-surface-families.mjs', 'scripts/browser-form-families.mjs'}
            raw=(subprocess.check_output(['git','--no-replace-objects','show',packet['source_parent']+':'+ref['path']],cwd=ROOT)
                 if ref['path'] in historical else (ROOT/ref['path']).read_bytes())
            self.assertEqual(hashlib.sha256(raw).hexdigest(),ref['sha256'])
            self.assertEqual(len(raw),ref['bytes'])
        self.assertFalse(packet['canonical_frame_admission_granted'])
        self.assertFalse(packet['old_programs_executed'])

if __name__=='__main__':unittest.main()
