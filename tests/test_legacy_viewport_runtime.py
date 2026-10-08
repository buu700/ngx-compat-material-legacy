"""Owned legacy viewport behavior comes from untouched tagged execution."""
from pathlib import Path
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1]


def runtime_available():
    return subprocess.run(['node', '-e', "require.resolve('@angular/compiler');require.resolve('typescript')"],
        cwd=ROOT, capture_output=True).returncode == 0


class LegacyViewportRuntimeTests(unittest.TestCase):
    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; source viewport diagnostic not executed')
    def test_tagged_cache_geometry_event_timing_and_lifetime(self):
        result = subprocess.run(['node', 'tests/legacy_viewport_runtime_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])

    @unittest.skipUnless(runtime_available(), 'Angular/TypeScript unavailable; source viewport type diagnostic not executed')
    def test_actual_helper_and_original_minimum_supplied_instance_compatibility(self):
        result = subprocess.run(['node', 'tests/legacy_viewport_type_probe.mjs'], cwd=ROOT,
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, (result.stderr or result.stdout)[-7000:])
