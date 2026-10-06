"""Keep the authenticated historical date helper; packed consumers exercise its public contract."""
import hashlib
import json
from pathlib import Path
import unittest
ROOT=Path(__file__).resolve().parents[1]
PIN='9764348262387bc4d76f3c1724620074288167e8d2b13ebd5e109bab23f8e797'
class NativeDateContractTests(unittest.TestCase):
    def test_original_algorithm_and_constructor_are_preserved(self):
        reference=ROOT/'reference/material-16.2.14/datetime/native-date-adapter.ts'
        data=reference.read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(),PIN)
        provenance=json.loads(reference.with_name('source-provenance.json').read_text())
        self.assertEqual(provenance['sha256'],PIN)
        self.assertEqual(provenance['commit'],'df60e733c60e572ba538f6ad0ceff3e63e527b53')
        expected=data.decode().replace('Copyright Google LLC All Rights Reserved.','Copyright Google LLC All Rights Reserved.\n * Copyright (c) 2026 Ryan Lester.').replace("from './date-adapter'", "from '@angular/material/core'").replace('class NativeDateAdapter','class LegacyNativeDateAdapter')
        candidate=ROOT/'projects/ngx-material-legacy/legacy-core/internal/datetime/native-date-adapter.ts'
        self.assertEqual(candidate.read_text(),expected)
        facade=(ROOT/'projects/ngx-material-legacy/legacy-core/public-api.ts').read_text()
        self.assertIn("export {LegacyNativeDateAdapter} from './internal/datetime/native-date-adapter';",facade)
        self.assertNotIn('NativeDateAdapter as LegacyNativeDateAdapter',facade)
