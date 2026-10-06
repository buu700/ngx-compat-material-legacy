#!/usr/bin/env python3
"""Rendered m3-coexistence assessment and packed assertion bodies.

assessRendered is pure over computed values read from one Chromium page. The
fixtures model a correct render (each family themed only where its sheet and
scope apply) and then break one value at a time with a wrong-but-nonempty
color so that only the affected case fails.
"""
from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

_MODEL = r"""
import * as r from './scripts/m3-rendered-coexistence.mjs';
const input = JSON.parse(process.argv[1]);
const THEMED = {current: 'rgb(0, 92, 187)', legacy: 'rgb(63, 81, 181)'};
const UNTHEMED = 'rgba(0, 0, 0, 0)';
const LEAKED = 'rgb(255, 64, 129)';
function themed(config, region, family, group) {
  const sheets = r.CONFIGS[config];
  if (group === 'order') {
    if (region === 'order') {
      const order = config.startsWith('order-') ? config.slice(6) : null;
      if (!order) return false;
      return family === 'current' ? order !== 'legacy-only' : order !== 'current-only';
    }
    if (region === 'nested-outer' || region === 'nested-inner') return config === 'nested' && (family === 'current' || region === 'nested-inner');
    if (region.startsWith('overlay-')) return config === 'lazy';
    return false;
  }
  if (region === 'shared-current') return family === 'current' && sheets.includes('shared-current');
  if (region === 'shared-legacy') return family === 'legacy' && sheets.includes('shared-legacy');
  return false;
}
const values = {};
for (const config of Object.keys(r.CONFIGS)) {
  values[config] = {};
  for (const [region, hosts] of Object.entries(r.REGIONS)) {
    values[config][region] = {};
    for (const [probe, spec] of Object.entries(r.PROBES)) {
      if (!hosts[spec.family]) continue;
      if ((spec.group === 'shared') !== region.startsWith('shared-')) continue;
      let value = themed(config, region, spec.family, spec.group) ? THEMED[spec.family] : UNTHEMED;
      if (config === 'shared-current-leak' && region === 'shared-current') value = LEAKED;
      values[config][region][probe] = {found: true, values: Object.fromEntries(spec.properties.map((p) => [p, value]))};
    }
  }
}
for (const [config, region, probe, property, value] of input.breaks || []) {
  if (value === null) values[config][region][probe] = {found: false, values: {}};
  else values[config][region][probe].values[property] = value;
}
const results = r.assessRendered(values);
let bodies = null;
if (input.bodies) {
  const m3 = await import('./scripts/check-m3-inclusion-order.mjs');
  const facts = (m3p, m2p, i3, i2) => ({bytes: 10, m3_present: m3p, m2_present: m2p, m3_index: i3, m2_index: i2});
  const line = {
    line: 'main', source_kind: 'packed', tarball_sha256: input.bodies.tarball, material_version: '22.1.7', errors: [],
    orders: {
      'current-only': facts(true, false, 1, -1), 'legacy-only': facts(false, true, -1, 1),
      'current-then-legacy': facts(true, true, 1, 2), 'legacy-then-current': facts(true, true, 2, 1),
    },
    extensions: {
      errors: [],
      nested_theme_scope: {ok: true}, lazy_body_overlay: {ok: true},
      current_shared_scope: {ok: true}, legacy_shared_scope: {ok: true},
      contamination_negatives: {
        'nested-lazy-overlay': {rejected: true, rostered: false},
        'shared-style-boundary': {rejected: true, rostered: false},
      },
    },
  };
  const rendered = {browser: 'Chrome/1', versions: {material: '22.1.7'}, results};
  bodies = m3.packedRenderedBodies(line, rendered, {runId: input.bodies.run_id, invocationId: input.bodies.invocation});
}
console.log(JSON.stringify({results, bodies}));
"""


def render(breaks=(), bodies=None) -> dict:
    payload = {"breaks": list(breaks), "bodies": bodies}
    result = subprocess.run(
        ["node", "--input-type=module", "-e", _MODEL, json.dumps(payload)],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


ALL_CASES = [
    "current-only", "legacy-only", "current-then-legacy", "legacy-then-current",
    "nested-theme-scope", "lazy-body-overlay", "current-shared-scope", "legacy-shared-scope",
]
WRONG = "rgb(1, 2, 3)"


def failing(results: dict) -> list[str]:
    return sorted(case for case, item in results.items() if item["result"] != "pass")


class AssessRenderedTests(unittest.TestCase):
    def test_correct_render_passes_every_rostered_case(self):
        results = render()["results"]
        self.assertEqual(sorted(results), sorted(ALL_CASES))
        self.assertEqual(failing(results), [])
        for item in results.values():
            self.assertTrue(item["checks"])
            self.assertTrue(any(check["expect"] == "equal" for check in item["checks"]))
        negative = results["current-shared-scope"]["contamination_negative"]
        self.assertTrue(negative["detected"])
        self.assertFalse(negative["rostered"])

    def test_wrong_but_nonempty_value_fails_only_its_case(self):
        cases = {
            "legacy-then-current": ("order-legacy-then-current", "order", "cur-button", "background-color"),
            "current-then-legacy": ("order-current-then-legacy", "order", "leg-checkbox", "background-color"),
            "nested-theme-scope": ("nested", "nested-inner", "cur-toggle", "background-color"),
            "lazy-body-overlay": ("lazy", "overlay-m2", "leg-button", "color"),
            "legacy-shared-scope": ("shared-both", "shared-legacy", "leg-focus", "border-top-color"),
        }
        for case, (config, region, probe, prop) in cases.items():
            with self.subTest(case=case):
                self.assertEqual(failing(render([[config, region, probe, prop, WRONG]])["results"]), [case])

    def test_overlay_theme_leaking_into_the_tree_fails(self):
        results = render([["lazy", "plain", "cur-button", "background-color", WRONG]])["results"]
        self.assertEqual(failing(results), ["lazy-body-overlay"])

    def test_missing_probe_fails(self):
        results = render([["nested", "nested-outer", "cur-checkbox", "background-color", None]])["results"]
        self.assertEqual(failing(results), ["nested-theme-scope"])
        self.assertTrue(any("not rendered" in reason for reason in results["nested-theme-scope"]["reasons"]))

    def test_unthemed_current_only_fails(self):
        breaks = [["order-current-only", "order", probe, prop, "rgba(0, 0, 0, 0)"]
                  for probe, props in (("cur-button", ("background-color", "color")),
                                       ("cur-checkbox", ("background-color", "border-top-color")),
                                       ("cur-toggle", ("background-color",)))
                  for prop in props]
        self.assertIn("current-only", failing(render(breaks)["results"]))

    def test_undetected_contamination_fails_current_shared_scope(self):
        breaks = [["shared-current-leak", "shared-current", probe, prop, "rgb(0, 92, 187)"]
                  for probe, props in (("cur-pseudo", ("background-color", "width")),
                                       ("cur-ripple", ("position", "border-top-left-radius", "background-color")),
                                       ("cur-focus", ("display", "border-top-color", "border-top-width", "border-top-style")))
                  for prop in props]
        results = render(breaks)["results"]
        self.assertEqual(failing(results), ["current-shared-scope"])
        self.assertFalse(results["current-shared-scope"]["contamination_negative"]["detected"])


class PackedBodyTests(unittest.TestCase):
    IDENTITY = {"tarball": "cd" * 32, "run_id": "run-1", "invocation": "inv-1"}

    def test_bodies_are_packed_rendered_and_bound_to_the_run(self):
        bodies = render(bodies=self.IDENTITY)["bodies"]
        self.assertEqual(sorted(bodies), sorted(ALL_CASES))
        for case, body in bodies.items():
            self.assertEqual(body["case_id"], case)
            self.assertEqual(body["source_kind"], "packed")
            self.assertEqual(body["tarball_sha256"], self.IDENTITY["tarball"])
            self.assertEqual(body["run_id"], "run-1")
            self.assertEqual(body["invocation_id"], "inv-1")
            self.assertEqual(body["peer_version"], "22.1.7")
            self.assertEqual(body["rendered"]["result"], "pass")
            self.assertTrue(body["packed_compile"])

    def test_failed_render_case_gets_no_body(self):
        bodies = render([["nested", "nested-inner", "leg-button", "color", WRONG]], bodies=self.IDENTITY)["bodies"]
        self.assertEqual(sorted(bodies), sorted(set(ALL_CASES) - {"nested-theme-scope"}))


if __name__ == "__main__":
    unittest.main()
