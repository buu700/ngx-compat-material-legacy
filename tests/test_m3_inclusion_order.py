#!/usr/bin/env python3
"""The inclusion-order compiler emits M3 and M2 markers in the requested order."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
M3 = "--mat-app-background-color"
M2 = ".mat-raised-button"


def assess(css_by_order):
    script = """
import {orderFacts, lineErrors} from './scripts/check-m3-inclusion-order.mjs';
const css = JSON.parse(process.argv[1]);
const compiled = Object.fromEntries(
  Object.entries(css).map(([name, text]) => [name, orderFacts(text)]),
);
console.log(JSON.stringify({compiled, errors: lineErrors('main', compiled)}));
"""
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script, json.dumps(css_by_order)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


def workspace_compiler_ready() -> bool:
    script = (
        "import {createRequire} from 'node:module';"
        "const req = createRequire(process.cwd() + '/package.json');"
        "req('sass'); req('@angular/material/package.json');"
    )
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    return result.returncode == 0


class M3InclusionOrderTests(unittest.TestCase):
    def test_marker_rule_accepts_distinct_orders(self):
        report = assess({
            "current-only": f"{M3}: #fff;",
            "legacy-only": f"{M2} {{ color: blue; }}",
            "current-then-legacy": f"{M3}: #fff; {M2} {{ color: blue; }}",
            "legacy-then-current": f"{M2} {{ color: blue; }} {M3}: #fff;",
        })
        self.assertEqual(report["errors"], [])
        current = report["compiled"]["current-then-legacy"]
        legacy = report["compiled"]["legacy-then-current"]
        self.assertLess(current["m3_index"], current["m2_index"])
        self.assertLess(legacy["m2_index"], legacy["m3_index"])
        self.assertFalse(report["compiled"]["current-only"]["m2_present"])
        self.assertFalse(report["compiled"]["legacy-only"]["m3_present"])

    def test_marker_rule_rejects_crossed_or_shared_markers(self):
        shared = assess({
            "current-only": f"{M3}: #fff; {M2} {{ color: blue; }}",
            "legacy-only": f"{M2} {{ color: blue; }} {M3}: #fff;",
            "current-then-legacy": f"{M2} {{ color: blue; }} {M3}: #fff;",
            "legacy-then-current": f"{M3}: #fff; {M2} {{ color: blue; }}",
        })
        self.assertIn("main: current theme marker is not distinct", shared["errors"])
        self.assertIn("main: legacy theme marker is not distinct", shared["errors"])
        self.assertIn("main: current-then-legacy did not emit M3 before M2", shared["errors"])
        self.assertIn("main: legacy-then-current did not emit M2 before M3", shared["errors"])

    @unittest.skipUnless(
        workspace_compiler_ready(),
        "workspace sass and @angular/material are not installed",
    )
    def test_workspace_compiles_both_orders(self):
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "m3-inclusion-order.json"
            result = subprocess.run(
                ["node", "scripts/check-m3-inclusion-order.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            self.assertEqual(report["result"], "pass")
            self.assertEqual(report["coverage"], "slice")
            self.assertEqual(report["g07_claim"], "not-passed")
            line = report["lines"][0]
            self.assertEqual(line["line"], "main")
            current = line["orders"]["current-then-legacy"]
            legacy = line["orders"]["legacy-then-current"]
            self.assertLess(current["m3_index"], current["m2_index"])
            self.assertLess(legacy["m2_index"], legacy["m3_index"])
            self.assertFalse(line["orders"]["current-only"]["m2_present"])
            self.assertFalse(line["orders"]["legacy-only"]["m3_present"])


if __name__ == "__main__":
    unittest.main()
