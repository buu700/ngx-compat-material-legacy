#!/usr/bin/env python3
"""Adversarial syntax-awareness checks for inspect-packed-package."""
from __future__ import annotations

import importlib.util
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'inspect_packed_package', ROOT / 'scripts' / 'inspect-packed-package.py'
)
MOD = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MOD)


class ModuleEdgeTests(unittest.TestCase):
    def test_comment_only_mention_is_not_an_edge(self):
        src = "// no `@angular/animations` engine on the primary entry.\nexport const x = 1;\n"
        self.assertEqual(MOD.module_edges(src), [])

    def test_real_import_is_an_edge(self):
        src = "import {trigger} from '@angular/animations';\n"
        self.assertEqual(MOD.module_edges(src), ['@angular/animations'])

    def test_type_import_is_an_edge(self):
        src = "import type {AnimationTriggerMetadata} from '@angular/animations';\n"
        self.assertEqual(MOD.module_edges(src), ['@angular/animations'])

    def test_require_is_an_edge(self):
        src = "const m = require('@angular/platform-browser/animations');\n"
        self.assertEqual(MOD.module_edges(src), ['@angular/platform-browser/animations'])

    def test_dynamic_import_is_an_edge(self):
        src = "await import('@angular/animations');\n"
        self.assertEqual(MOD.module_edges(src), ['@angular/animations'])

    def test_block_comment_import_is_not_an_edge(self):
        src = "/* import {x} from '@angular/animations'; */\nexport const y = 1;\n"
        self.assertEqual(MOD.module_edges(src), [])


if __name__ == '__main__':
    raise SystemExit(unittest.main())
