#!/usr/bin/env python3
"""Companion state evidence accepts rendered differences and records absent dimensions."""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SCRIPT = """
import {assessCompanionEvidence, COMPANIONS} from './scripts/check-companion-computed-styles.mjs';
const mode = process.argv[1];
function values(light, dark, density, typography) {
  return {light, dark, density, typography};
}
const components = COMPANIONS.map((component) => {
  const tokens = {};
  if (component === 'divider') tokens.color = values('black', 'white', 'black', 'black');
  if (component === 'toolbar') {
    tokens['standard-height'] = values('64px', '64px', '56px', '64px');
    tokens['title-text-size'] = values('20px', '20px', '20px', '30px');
  }
  if (component === 'tree') tokens['node-text-size'] = values('14px', '14px', '14px', '22px');
  if (component === 'sidenav') tokens['container-width'] = values('200px', '200px', '200px', '200px');
  return {
    component,
    host_present: true,
    direction_ltr: 'ltr',
    direction_rtl: 'rtl',
    tokens,
  };
});
if (mode === 'drop') components.splice(components.findIndex((row) => row.component === 'tree'), 1);
if (mode === 'dark-same') components.find((row) => row.component === 'divider').tokens.color.dark = 'black';
if (mode === 'density-same') components.find((row) => row.component === 'toolbar').tokens['standard-height'].density = '64px';
if (mode === 'type-same') {
  components.find((row) => row.component === 'toolbar').tokens['title-text-size'].typography = '20px';
  components.find((row) => row.component === 'tree').tokens['node-text-size'].typography = '14px';
}
if (mode === 'rtl') components.forEach((row) => { row.direction_rtl = 'ltr'; });
if (mode === 'host') components.find((row) => row.component === 'badge').host_present = false;
console.log(JSON.stringify(assessCompanionEvidence(components)));
"""


def assess(mode: str) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", SCRIPT, mode],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class CompanionComputedStyleTests(unittest.TestCase):
    def test_rendered_differences_and_absent_dimensions(self):
        report = assess("pass")
        self.assertTrue(report["ok"], report["errors"])
        self.assertEqual(report["errors"], [])
        self.assertEqual(len(report["rows"]), 13)
        badge = next(row for row in report["rows"] if row["component"] == "badge")
        self.assertFalse(badge["dimensions"]["density"]["present"])
        self.assertIn("no emitted density token", badge["dimensions"]["density"]["evidence"])
        self.assertFalse(badge["dimensions"]["base"]["present"])
        sidenav = next(row for row in report["rows"] if row["component"] == "sidenav")
        self.assertTrue(sidenav["dimensions"]["base"]["present"])
        self.assertEqual(sidenav["dimensions"]["base"]["tokens"][0]["token"], "container-width")
        divider = next(row for row in report["rows"] if row["component"] == "divider")
        self.assertTrue(divider["dimensions"]["color"]["tokens"][0]["changed_dark"])
        self.assertEqual(divider["states"]["rtl"]["direction"], "rtl")

    def test_missing_companion_unchanged_theme_and_missing_host_fail(self):
        cases = {
            "drop": "missing companion tree",
            "dark-same": "dark theme did not change a color token",
            "density-same": "density theme did not change a density token",
            "type-same": "typography theme did not change a typography token",
            "rtl": "rtl direction was not rtl",
            "host": "badge: host missing",
        }
        for mode, needle in cases.items():
            report = assess(mode)
            self.assertFalse(report["ok"], mode)
            self.assertTrue(any(needle in error for error in report["errors"]), report["errors"])


if __name__ == "__main__":
    unittest.main()
