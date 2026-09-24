#!/usr/bin/env python3
"""Adversarial syntax-awareness checks for check-upstream-api-policy."""
from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'check_upstream_api_policy', ROOT / 'scripts' / 'check-upstream-api-policy.py'
)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)
POLICY = json.loads((ROOT / 'research' / 'upstream-api-policy.json').read_text())


def scan_source(source: str) -> dict:
    with tempfile.TemporaryDirectory() as tmp:
        path = Path(tmp) / 'sample.ts'
        path.write_text(source)
        return MOD.scan(Path(tmp), POLICY)


class PolicySyntaxTests(unittest.TestCase):
    def test_comment_inside_reexport_list_does_not_bypass_private_symbol(self):
        src = '''
export {
  /**
   * @deprecated Use `_MatCellHarnessBase` from `@angular/material/table/testing` instead.
   */
  _MatCellHarnessBase as _MatLegacyCellHarnessBase,
} from '@angular/material/table/testing';
'''
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == '_MatCellHarnessBase' for v in result['violations']))

    def test_ordinary_comment_mentioning_banned_package_is_not_a_violation(self):
        src = '''
// Do not import MatPseudoCheckbox from @angular/material/core — it is docs-private.
export const x = 1;
'''
        result = scan_source(src)
        self.assertTrue(result['ok'], result)

    def test_renamed_docs_private_import_is_caught(self):
        src = "import {MatPseudoCheckbox as Pseudo} from '@angular/material/core';\n"
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == 'MatPseudoCheckbox' for v in result['violations']))

    def test_type_only_docs_private_import_is_caught(self):
        src = "import type {RippleTarget} from '@angular/material/core';\n"
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == 'RippleTarget' for v in result['violations']))

    def test_owned_local_symbol_is_allowed(self):
        src = "import {MatLegacyPseudoCheckbox} from '@ngx-compat/material-legacy/legacy-core';\n"
        result = scan_source(src)
        self.assertTrue(result['ok'], result)


if __name__ == '__main__':
    raise SystemExit(unittest.main())
