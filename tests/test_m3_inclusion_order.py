#!/usr/bin/env python3
"""The inclusion-order compiler emits M3 and M2 markers in the requested order.

Nested, lazy overlay, and shared-style checks compare structural markers and
compiled selectors. Contamination fixtures are rejected and are not rostered.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
M3 = "--mat-app-background-color"
M2 = ".mat-raised-button"
PSEUDO = "--mat-pseudo-checkbox-full-selected-icon-color"


def node_json(script: str, payload) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script, json.dumps(payload)],
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


def assess(css_by_order):
    script = """
import {orderFacts, lineErrors} from './scripts/check-m3-inclusion-order.mjs';
const css = JSON.parse(process.argv[1]);
const compiled = Object.fromEntries(
  Object.entries(css).map(([name, text]) => [name, orderFacts(text)]),
);
console.log(JSON.stringify({compiled, errors: lineErrors('main', compiled)}));
"""
    return node_json(script, css_by_order)


def scope_errors(payload):
    script = """
import {
  nestedThemeScopeErrors,
  lazyBodyOverlayErrors,
  sharedStyleBoundaryErrors,
  NESTED_LAZY_OVERLAY_IDS,
  SHARED_STYLE_BOUNDARY_IDS,
  INCLUSION_ORDER_IDS,
} from './scripts/check-m3-inclusion-order.mjs';
const payload = JSON.parse(process.argv[1]);
console.log(JSON.stringify({
  nested: nestedThemeScopeErrors(payload.nested),
  lazy: lazyBodyOverlayErrors(payload.initial, payload.lazy),
  shared: sharedStyleBoundaryErrors(payload.current, payload.legacy),
  ids: {
    inclusion: INCLUSION_ORDER_IDS,
    nested: NESTED_LAZY_OVERLAY_IDS,
    shared: SHARED_STYLE_BOUNDARY_IDS,
  },
}));
"""
    return node_json(script, payload)


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


NESTED_GOOD = f"""
.app-nested {{ {M3}: initial; }}
.app-nested .legacy-nested {M2} {{ position: relative; }}
"""
NESTED_SHARED = """
.mat-mdc-raised-button .mat-focus-indicator,
.mat-raised-button .mat-focus-indicator { position: relative; }
@media (forced-colors: active) {
  .mat-mdc-raised-button,
  .mat-raised-button { --mat-focus-indicator-display: initial; }
}
"""
LAZY_INITIAL = f".app-nested {{ {M3}: initial; }}"
LAZY_GOOD = f"""
body .cdk-overlay-container .lazy-m3-overlay {{ {M3}: initial; }}
body .cdk-overlay-container .lazy-m2-overlay {M2} {{ position: relative; }}
"""
CURRENT_GOOD = f"""
.current-shared-scope .mat-ripple {{ position: relative; }}
.current-shared-scope .mat-ripple-element {{ position: absolute; }}
.current-shared-scope .mat-focus-indicator {{ position: relative; }}
.current-shared-scope {{ {PSEUDO}: initial; }}
"""
LEGACY_GOOD = """
.legacy-shared-scope .mat-ripple { position: relative; }
.legacy-shared-scope .mat-focus-indicator { position: relative; }
.legacy-shared-scope .mat-pseudo-checkbox { position: relative; }
.legacy-shared-scope .mat-mdc-focus-indicator { position: relative; }
"""
LEGACY_LEAK = """
.mat-ripple { position: relative; }
.mat-mdc-focus-indicator { position: relative; }
"""


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

    def test_scope_rules_reject_contamination_and_renamed_orders(self):
        good = scope_errors({
            "nested": NESTED_GOOD,
            "initial": LAZY_INITIAL,
            "lazy": LAZY_GOOD,
            "current": CURRENT_GOOD,
            "legacy": LEGACY_GOOD,
        })
        self.assertEqual(good["nested"], [])
        self.assertEqual(good["lazy"], [])
        self.assertEqual(good["shared"], [])
        renamed = scope_errors({
            "nested": f".order {{ {M3}: initial; }} .order {M2} {{ position: relative; }}",
            "initial": LAZY_INITIAL,
            "lazy": f"body .cdk-overlay-container {M2} {{ position: relative; }}",
            "current": CURRENT_GOOD,
            "legacy": LEGACY_GOOD + LEGACY_LEAK,
        })
        self.assertTrue(any("outer nested scope" in error for error in renamed["nested"]))
        self.assertTrue(any("escaped the nested legacy scope" in error for error in renamed["nested"]))
        self.assertTrue(any("body overlay scope" in error for error in renamed["lazy"]))
        self.assertTrue(any(".mat-mdc-focus-indicator" in error and "not confined" in error for error in renamed["shared"]))
        contaminated = scope_errors({
            "nested": NESTED_GOOD + NESTED_SHARED,
            "initial": LAZY_INITIAL,
            "lazy": LAZY_GOOD,
            "current": CURRENT_GOOD,
            "legacy": LEGACY_GOOD,
        })
        self.assertTrue(any("shared selector would restyle a current M3 control" in error for error in contaminated["nested"]))
        self.assertTrue(any(".mat-mdc-raised-button" in error for error in contaminated["nested"]))

    def test_main_roster_matches_executed_case_ids(self):
        ids = scope_errors({
            "nested": NESTED_GOOD,
            "initial": LAZY_INITIAL,
            "lazy": LAZY_GOOD,
            "current": CURRENT_GOOD,
            "legacy": LEGACY_GOOD,
        })["ids"]
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "m3-coexistence")
        self.assertFalse(row["implemented"])
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["inclusion-order"], ids["inclusion"])
        self.assertEqual(main["nested-lazy-overlay"], ids["nested"])
        self.assertEqual(main["shared-style-boundary"], ids["shared"])
        for group, case_ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(case_ids, group)

    @unittest.skipUnless(
        workspace_compiler_ready(),
        "workspace sass and @angular/material are not installed",
    )
    def test_workspace_compiles_orders_and_extended_scopes(self):
        stale_tarball = "a26c38f4c19de66f7332d1e066f65b641a443bb67ccea0d69226c8e41cd7afb2"
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "m3-inclusion-order.json"
            invocation = "workspaceorder"
            assertion_dir = tmp_path / "evidence" / "m3-coexistence" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "m3-coexistence",
                "RC_RUN_ID": "workspace-fresh",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-m3-inclusion-order.mjs", "--out", str(out)],
                cwd=ROOT,
                text=True,
                capture_output=True,
                check=False,
                env=env,
            )
            self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
            report = json.loads(out.read_text())
            self.assertEqual(report["result"], "pass")
            self.assertEqual(report["coverage"], "slice")
            self.assertFalse(report["implemented"])
            self.assertEqual(report["g07_claim"], "not-passed")
            self.assertIsNone(report["executed_case_ids"]["21.x"])
            line = report["lines"][0]
            self.assertEqual(line["line"], "main")
            current = line["orders"]["current-then-legacy"]
            legacy = line["orders"]["legacy-then-current"]
            self.assertLess(current["m3_index"], current["m2_index"])
            self.assertLess(legacy["m2_index"], legacy["m3_index"])
            self.assertFalse(line["orders"]["current-only"]["m2_present"])
            self.assertFalse(line["orders"]["legacy-only"]["m3_present"])
            self.assertNotEqual(report["coverage"], "complete")
            self.assertNotIn(stale_tarball, out.read_text())
            negatives = line["extensions"]["contamination_negatives"]
            self.assertTrue(any("shared selector would restyle a current M3 control" in error for error in negatives["nested-lazy-overlay"]["errors"]))
            self.assertFalse(negatives["nested-lazy-overlay"]["rostered"])
            self.assertTrue(any(".mat-mdc-focus-indicator" in error and "not confined" in error for error in negatives["shared-style-boundary"]["errors"]))
            self.assertFalse(negatives["shared-style-boundary"]["rostered"])
            nested = line["extensions"]["nested_theme_scope"]
            self.assertEqual(nested["m3_selectors"], [".app-nested"])
            self.assertTrue(nested["m2_confined_to_legacy_scope"])
            self.assertIn(".app-nested .legacy-nested", nested["m2_selector_example"])
            lazy = line["extensions"]["lazy_body_overlay"]
            self.assertEqual(lazy["lazy_m3_selectors"], ["body .cdk-overlay-container .lazy-m3-overlay"])
            self.assertIn("body .cdk-overlay-container .lazy-m2-overlay", lazy["m2_selector_example"])
            self.assertFalse(lazy["initial_m2_present"])
            self.assertGreater(lazy["m2_index"], lazy["initial_bytes"])
            current_scope = line["extensions"]["current_shared_scope"]
            self.assertEqual(current_scope["selectors"][".mat-ripple"]["example"], ".current-shared-scope .mat-ripple")
            self.assertEqual(current_scope["selectors"][".mat-mdc-focus-indicator"]["count"], 0)
            self.assertTrue(current_scope["m3_pseudo_marker_present"])
            legacy_scope = line["extensions"]["legacy_shared_scope"]
            self.assertTrue(legacy_scope["selectors"][".mat-mdc-focus-indicator"]["confined_to_scope"])
            self.assertTrue(legacy_scope["selectors"][".mat-pseudo-checkbox"]["confined_to_scope"])
            self.assertFalse(legacy_scope["m3_pseudo_marker_present"])
            names = sorted(path.name for path in assertion_dir.iterdir())
            self.assertEqual(
                names,
                [
                    "current-only.json",
                    "current-shared-scope.json",
                    "current-then-legacy.json",
                    "lazy-body-overlay.json",
                    "legacy-only.json",
                    "legacy-shared-scope.json",
                    "legacy-then-current.json",
                    "nested-theme-scope.json",
                ],
            )
            for name in names:
                body = json.loads((assertion_dir / name).read_text())
                self.assertEqual(body["case_id"], name.removesuffix(".json"))
                self.assertEqual(body["result"], "pass")
                self.assertEqual(body["kind"], "assertion")
                self.assertEqual(body["source_kind"], "workspace")
                self.assertEqual(body["g07_claim"], "not-passed")
                self.assertIsNone(body["not_executed"]["21.x"])
                self.assertNotIn("nested-lazy-overlay", body["not_executed"])
                self.assertNotIn(stale_tarball, (assertion_dir / name).read_text())
            order_name = "current-then-legacy.json"
            order_body = json.loads((assertion_dir / order_name).read_text())
            order = line["orders"][order_body["case_id"]]
            self.assertEqual(order_body["bytes"], order["bytes"])
            self.assertEqual(order_body["m3_index"], order["m3_index"])
            self.assertEqual(order_body["m2_index"], order["m2_index"])
            nested_body = json.loads((assertion_dir / "nested-theme-scope.json").read_text())
            self.assertEqual(nested_body["group"], "nested-lazy-overlay")
            self.assertEqual(nested_body["m3_selectors"], nested["m3_selectors"])
            shared_body = json.loads((assertion_dir / "legacy-shared-scope.json").read_text())
            self.assertEqual(shared_body["group"], "shared-style-boundary")
            self.assertEqual(
                shared_body["selectors"][".mat-mdc-focus-indicator"]["example"],
                legacy_scope["selectors"][".mat-mdc-focus-indicator"]["example"],
            )


if __name__ == "__main__":
    unittest.main()
