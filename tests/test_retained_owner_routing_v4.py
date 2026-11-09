# Copyright Google LLC All Rights Reserved. Copyright (c) 2026 Ryan Lester. MIT.
"""Both source owners authenticate the same retained owner continuation."""
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest

ROOT=Path(__file__).resolve().parents[1]


class RetainedOwnerRoutingV4Tests(unittest.TestCase):
    def test_paired_owner_replays_and_physical_guards(self):
        with TemporaryDirectory(prefix='retained-owner-routing-v4-') as temporary:
            paths=[Path(temporary)/'javascript.json',Path(temporary)/'python.json']
            commands=[['node','tests/retained_owner_routing_v4_probe.mjs',str(paths[0])],
                      [sys.executable,'tests/retained_owner_routing_v4_probe.py',str(paths[1])]]
            with ThreadPoolExecutor(max_workers=2) as pool:
                children=list(pool.map(lambda command:subprocess.run(command,cwd=ROOT,capture_output=True,text=True,timeout=900),commands))
            for child in children:self.assertEqual(child.returncode,0,child.stdout+child.stderr)
            rows=[json.loads(path.read_text()) for path in paths]
            for row in rows:
                self.assertEqual((len(row['bound']),len(row['transitions'])),(534,112))
                self.assertEqual((row['cold_rejections'],row['late_rejections'],row['recoveries']),(17,17,17))
                self.assertEqual(row['owner_images_preserved'],6)
                self.assertEqual(row['wrapper_images_preserved'],4)
                self.assertFalse(row['historical_programs_executed']);self.assertFalse(row['artifact_or_audit_admission_granted'])
            self.assertEqual(rows[0]['transitions'],rows[1]['transitions'])
            own={'scripts/current-sass-tool-references.mjs','scripts/current_sass_tool_references.py',
                 'scripts/current-tool-matrix-source.mjs','scripts/current_tool_matrix_source.py'}
            shared=[{ref['path']:ref for ref in row['bound'] if ref['path'] not in own}for row in rows]
            self.assertEqual(len(shared[0]),532);self.assertEqual(shared[0],shared[1])
