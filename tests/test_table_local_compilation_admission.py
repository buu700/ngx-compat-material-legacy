# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Actual source contract and independently reconstructed finite proposals."""
import json
import os
from pathlib import Path
import subprocess
import unittest

from current_sass_canonical_test_scope import current_canonical_test_frame
from table_local_compilation_canonical_ledger_patch import derive_table_local_compilation_successor, digest

ROOT = Path(__file__).resolve().parents[1]
PREFIX = 'compatibility/rc/21x-table-local-compilation-admission-'


class TableLocalCompilationAdmissionTest(unittest.TestCase):
    def test_current_source_contract_rejects_metadata_and_source_faults(self):
        child = subprocess.run(
            ['node', 'tests/table_local_compilation_admission_probe.mjs',
             os.environ.get('TABLE_LOCAL_COMPILATION_ADMISSION_REPORT', ''), 'contract'],
            cwd=ROOT, capture_output=True, text=True, timeout=120,
        )
        self.assertEqual(child.returncode, 0, (child.stdout + child.stderr)[-8000:])
        report = json.loads(child.stdout)
        self.assertEqual(report['result'], 'pass')
        self.assertEqual(report['metadata_rejections'], 20)
        self.assertEqual(report['cold_source_rejections'], 14)
        self.assertEqual(report['late_source_rejections'], 14)
        self.assertEqual(report['unselected_entries_preserved'], 1696)
        self.assertFalse(report['full_owner_integration_qualified'])
        self.assertFalse(report['actual_native_packed_browser_floor_or_full_audit_qualified'])

    def test_independent_exact_entry_scalars_and_registry_projection(self):
        projected = derive_table_local_compilation_successor(ROOT)
        packet = json.loads((ROOT / (PREFIX + 'canonical-proposal.json')).read_bytes())
        self.assertEqual(projected['unselected_entries_preserved'], 1696)
        self.assertEqual(projected['entry']['final_disposition'], 'do-not-adopt')
        frame = current_canonical_test_frame(ROOT)
        actual_ledger = digest(frame['comparison'](packet['before']['path'], (ROOT / packet['before']['path']).read_bytes()))
        actual_registry = digest(frame['comparison'](packet['registry_before']['path'], (ROOT / packet['registry_before']['path']).read_bytes()))
        self.assertIn(actual_ledger, [packet['before']['sha256'], packet['after']['sha256']])
        self.assertIn(actual_registry, [packet['registry_before']['sha256'], packet['registry_after']['sha256']])
        if actual_ledger == packet['after']['sha256']:
            self.assertEqual(actual_registry, packet['registry_after']['sha256'])
        frame['assert_current']()


if __name__ == '__main__':
    unittest.main()
