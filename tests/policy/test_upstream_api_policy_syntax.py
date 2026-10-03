#!/usr/bin/env python3
"""Adversarial syntax-awareness checks for check-upstream-api-policy."""
from __future__ import annotations

import importlib.util
import io
import json
import tarfile
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

    def test_packed_tarball_private_import_is_caught(self):
        payload = b"import {MatPseudoCheckbox} from '@angular/material/core';\n"
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode='w:gz') as archive:
            info = tarfile.TarInfo('package/fesm2022/legacy-core.mjs')
            info.size = len(payload)
            archive.addfile(info, io.BytesIO(payload))
        with tempfile.TemporaryDirectory() as tmp:
            tarball = Path(tmp) / 'pkg.tgz'
            tarball.write_bytes(buf.getvalue())
            result = MOD.scan(tarball, POLICY)
        self.assertFalse(result['ok'])
        self.assertEqual(result['scanned_artifact'], 'tarball')
        self.assertTrue(any(v['value'] == 'MatPseudoCheckbox' for v in result['violations']))

    def test_namespace_member_access_is_caught(self):
        src = """
import * as material from '@angular/material/core';
export const checkbox = material.MatPseudoCheckbox;
"""
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == 'MatPseudoCheckbox' and v.get('access') == 'namespace' for v in result['violations']))

    def test_computed_namespace_access_is_caught(self):
        src = """
import * as material from '@angular/material/core';
export const checkbox = material['RippleRenderer'];
"""
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == 'RippleRenderer' for v in result['violations']))

    def test_require_alias_member_access_is_caught(self):
        src = "const material = require('@angular/material/core');\nexport const lines = material.setLines;\n"
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['value'] == 'setLines' for v in result['violations']))

    def test_commented_namespace_import_is_not_a_violation(self):
        src = """
// import * as material from '@angular/material/core';
// export const checkbox = material.MatPseudoCheckbox;
export const x = 1;
"""
        result = scan_source(src)
        self.assertTrue(result['ok'], result)

    def test_deep_private_path_is_caught(self):
        src = "import {foo} from '@angular/cdk/a11y/private/foo';\n"
        result = scan_source(src)
        self.assertFalse(result['ok'])
        self.assertTrue(any(v['rule'] == 'forbidden-module-substring' for v in result['violations']))

    def test_owned_local_symbol_is_allowed(self):
        src = "import {MatLegacyPseudoCheckbox} from '@ngx-compat/material-legacy/legacy-core';\n"
        result = scan_source(src)
        self.assertTrue(result['ok'], result)

    def test_trailing_private_segment_inheritance_deprecated_and_concealed_sass(self):
        private = scan_source("import {SharedResizeObserver} from '@angular/cdk/observers/private';\n")
        self.assertTrue(any(v['rule'] == 'forbidden-deep-internal' for v in private['violations']), private)
        inherited = scan_source(
            "import {_PrivateBase} from '@angular/cdk/a11y';\nexport class Local extends _PrivateBase {}\n"
        )
        self.assertTrue(any(v.get('access') == 'inheritance' and v['value'] == '_PrivateBase' for v in inherited['violations']), inherited)
        local = scan_source("class LocalBase {}\nexport class Owned extends LocalBase {}\n")
        self.assertTrue(local['ok'], local)
        reference = scan_source('/// <reference path="node_modules/@angular/cdk/a11y/private/index.d.ts" />\nexport const x = 1;\n')
        self.assertTrue(any(v['rule'] == 'forbidden-dts-reference' for v in reference['violations']), reference)
        policy = json.loads(json.dumps(POLICY))
        policy['forbidden_deprecated_symbols'] = ['LegacyDateAdapter']
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'use.ts').write_text("import {LegacyDateAdapter} from '@angular/material/core';\n")
            (root / 'hidden.scss').write_text("@use '@material/ripple/ripple';\n")
            result = MOD.scan(root, policy)
        rules = {v['rule'] for v in result['violations']}
        self.assertIn('forbidden-deprecated-symbol', rules)
        self.assertIn('forbidden-sass-dependency', rules)


if __name__ == '__main__':
    raise SystemExit(unittest.main())
