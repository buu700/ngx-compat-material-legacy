# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by the MIT license in LICENSE.
"""Real current C04/tool fixture, archived report models; no Sass execution."""
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from test_current_sass_source import ROOT,NODE,candidate_fixture
from test_current_sass_tool_references import current_tool_fixture

REPORTS=(
    ('compatibility/rc/21x-c04-theming-inspection-source-review.json','55d2533ffe204f9e589cc82fd78d66dd286d31f89769573d71cbb1d8425687d2',133530),
    ('compatibility/rc/21x-c04-inspection-compatibility-source-review.json','852cf937178ada91b0c604d349cf214cd810266af6118122c19e0dd534c55118',135386),
    ('compatibility/rc/21x-c04-control-m3-theme-source-review.json','69df54b7474b863fc9e1db8f1017217d7289072f4272d20f57ea21391df51fd6',1852529),
    ('compatibility/rc/21x-c04-remaining-unthemable-source-review.json.gz','c25b0a59e7bbe5e63eebc3068a84eb010e9e558d021770de22b81d669380e31b',1824722),
    ('compatibility/rc/21x-c04-modern-control-base-measurement-21x.json','4e99b606b4bcbf162f00edf8b8dcd7d4ff58a16760ec34d8d674a0b8720c124f',109842),
)
HELPERS=(
    'scripts/sass-spinner-snack-c04-source.mjs','scripts/current-sass-inspection-scope.mjs',
    'scripts/measure-sass-inspection-scope.mjs','scripts/current-sass-legacy-retention-css.mjs',
    'compatibility/rc/current-sass-legacy-retention-reference-v1.json',
    'compatibility/rc/ordinary-card-c04-successor-model-v1.mjs','compatibility/rc/ordinary-card-c04-successor-inputs-v1.json',
    'compatibility/rc/ordinary-card-public-bridge-model-v1.mjs','compatibility/rc/ordinary-card-public-bridge-model-v2.mjs',
    'compatibility/rc/ordinary-card-public-bridge-original-cases-v1.json',
    'compatibility/rc/ordinary-checkbox-button-legacy-composition-model-v1.mjs',
    'compatibility/rc/ordinary-checkbox-button-expectation-model-v1.mjs',
    'compatibility/rc/ordinary-checkbox-button-legacy-composition-cases-v1.json',
    'compatibility/rc/ordinary-checkbox-button-legacy-composition-known-before-v1.json',
)


class CurrentC04ToolIntegrationTests(unittest.TestCase):
    def test_real_current_tool_c04_and_exact_archived_successors(self):
        with tempfile.TemporaryDirectory(prefix='ngx-current-sass-c04-tools-') as directory:
            root=Path(directory);line=candidate_fixture(root);self.assertEqual(current_tool_fixture(root),line)
            for path in HELPERS:
                destination=root/path;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes((ROOT/path).read_bytes())
            if line=='21.x':
                for path,sha256,size in REPORTS:
                    raw=(ROOT/path).read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),sha256);self.assertEqual(len(raw),size)
                    destination=root/path;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(raw)
            child=subprocess.run([NODE,str(ROOT/'tests/current_sass_c04_tool_integration_probe.mjs'),str(root)],
                cwd=ROOT,text=True,capture_output=True,timeout=120)
            self.assertEqual(child.returncode,0,child.stderr[-12000:]);report=json.loads(child.stdout)
            self.assertEqual(report['line'],line);self.assertEqual(len(report['product_refs']),6)
            self.assertEqual(report['compiler_calls'],0);self.assertFalse(report['old_physical_constructor_executed'])
            self.assertFalse(report['current_product_projection_used']);self.assertFalse(report['artifact_or_audit_admission_granted'])
            if line=='21.x':
                self.assertEqual(report['authenticated_C04_report_count'],4)
                self.assertEqual(report['unchanged_public_retention_rows'],9);self.assertEqual(report['unchanged_direct_retention_rows'],3)
                for path,sha256,size in REPORTS:
                    raw=(ROOT/path).read_bytes();self.assertEqual(hashlib.sha256(raw).hexdigest(),sha256);self.assertEqual(len(raw),size)
            else:self.assertEqual(report['authenticated_C04_report_count'],0)
            export=os.environ.get('CURRENT_SASS_C04_TOOL_RECEIPT')
            if export:
                destination=ROOT/export
                self.assertEqual(destination.parent,ROOT/'compatibility/rc')
                self.assertTrue(destination.name.startswith('current-sass-c04-tool-integration-controls-') and destination.suffix=='.json')
                self.assertFalse(destination.exists());destination.write_text(json.dumps(report,indent=2)+'\n')


if __name__=='__main__':unittest.main()
