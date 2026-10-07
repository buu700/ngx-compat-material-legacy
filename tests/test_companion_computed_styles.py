#!/usr/bin/env python3
"""companion-computed-styles: reviewed roster and pure rendered-case assessment.

Browser-free. The producer renders in Chromium on CI; these tests cover the
assessment it applies to the observations, the frozen matrix roster and,
when an installed peer is available, the peer derivation of that roster.
"""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "compatibility/rc/matrices/full-verify.json"
PEER_NODE_MODULES = Path(os.environ.get("CCS_PEER_NODE_MODULES") or (ROOT / "node_modules"))
HAS_PEER = (PEER_NODE_MODULES / "@angular/material/_index.scss").is_file() and (PEER_NODE_MODULES / "sass").exists()

PRELUDE = """
import * as cases from './scripts/companion-computed-cases.mjs';
import * as producer from './scripts/check-companion-computed-styles.mjs';
const input = JSON.parse(process.argv[1] || 'null');
const out = (value) => console.log(JSON.stringify(value));
"""


def node(body: str, payload=None):
    result = subprocess.run(
        ["node", "--input-type=module", "-e", PRELUDE + body, json.dumps(payload)],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


def matrix_groups(line: str = "main") -> dict:
    matrix = json.loads(MATRIX.read_text())
    row = next(item for item in matrix["checks"] if item["check_id"] == "companion-computed-styles")
    return row["acceptance"]["cases_by_line"][line]


ASSESS = """
const binding = cases.BINDINGS.find((b) => b.id === input.id);
const sentinel = cases.sentinelTable([binding])[binding.token];
const good = (v) => ({found: true, value: v, token_value: v});
const obs = {oracle: {}, candidate: {}, bridge: {}, bridge_negative: {found: true, value: sentinel.marker}, negative: {found: true, value: sentinel.marker}};
for (const s of binding.scenarios) {
  obs.oracle[s] = good(input.value);
  obs.candidate[s] = good(input.value);
  obs.bridge[s] = good(input.value);
}
const mode = input.mode;
const first = binding.scenarios[0];
if (mode === 'wrong') obs.candidate[first] = good(input.wrong);
if (mode === 'no-oracle-token') obs.oracle[first] = {found: true, value: input.value, token_value: ''};
if (mode === 'no-candidate') obs.candidate[first] = {found: false, value: null};
if (mode === 'no-oracle') delete obs.oracle[first];
if (mode === 'empty') { obs.oracle[first] = {found: true, value: '', token_value: 'x'}; obs.candidate[first] = obs.oracle[first]; }
if (mode === 'negative-ignored') obs.negative = {found: true, value: input.value};
if (mode === 'negative-missing') delete obs.negative;
out(cases.assessCase(binding, obs, mode === 'no-sentinel' ? undefined : sentinel, {peerKeyword: input.keyword || null}));
"""


class AssessCaseTests(unittest.TestCase):
    ID = "toolbar/color/toolbar/background-color"

    def assess(self, mode, keyword=None):
        return node(ASSESS, {"id": self.ID, "mode": mode, "value": "rgb(245, 245, 245)", "wrong": "rgb(33, 33, 33)",
                             "keyword": keyword})

    def test_css_wide_keyword_token_needs_no_computed_token_value_only(self):
        result = self.assess("no-oracle-token", keyword="inherit")
        self.assertEqual(result["result"], "pass", result["reasons"])
        self.assertEqual(result["peer_declared_keyword"], "inherit")
        self.assertEqual(self.assess("no-oracle-token", keyword="rgb(0, 0, 0)")["result"], "fail")
        # A keyword token still has to match and still has to consume the injected value.
        self.assertEqual(self.assess("wrong", keyword="inherit")["result"], "fail")
        self.assertEqual(self.assess("negative-ignored", keyword="inherit")["result"], "fail")

    def test_equal_consumed_value_with_consumed_negative_passes(self):
        result = self.assess("pass")
        self.assertEqual(result["result"], "pass", result["reasons"])
        self.assertTrue(all(row["match"] for row in result["scenarios"]))
        self.assertTrue(result["negative"]["sentinel_consumed"])
        self.assertTrue(result["negative"]["mismatch_detected"])

    def test_every_broken_observation_fails(self):
        needles = {
            "wrong": "!= peer",
            "no-oracle-token": "does not define",
            "no-candidate": "candidate consuming element not rendered",
            "no-oracle": "oracle consuming element not rendered",
            "empty": "is empty",
            "negative-ignored": "does not consume injected",
            "negative-missing": "negative: candidate consuming element not rendered",
            "no-sentinel": "no wrong-but-nonempty sentinel",
        }
        for mode, needle in needles.items():
            with self.subTest(mode=mode):
                result = self.assess(mode)
                self.assertEqual(result["result"], "fail")
                self.assertTrue(any(needle in reason for reason in result["reasons"]), result["reasons"])


class SentinelTests(unittest.TestCase):
    def test_sentinels_are_distinct_nonempty_and_recognised(self):
        table = node("out(cases.sentinelTable());")
        # Display tokens share one valid wrong value; every other token's value is unique.
        values = [entry["value"] for entry in table.values() if entry["kind"] != "display"]
        self.assertEqual(len(values), len(set(values)))
        for token, entry in table.items():
            self.assertTrue(token.startswith("--mat-"))
            self.assertTrue(entry["value"].strip())
        seen = node("""
const t = cases.sentinelTable();
out(Object.values(t).map((s) => [cases.sentinelSeen(s.marker, s), cases.sentinelSeen('rgb(0, 0, 0)', s)]));
""")
        self.assertTrue(all(hit and not miss for hit, miss in seen))


ORACLE = """
const scen = (light, dark) => [{scenario: 'light', oracle: light, oracle_token: 'x'}, {scenario: 'dark', oracle: dark, oracle_token: 'x'}];
const identity = {package: '@angular/material', version: '22.1.7'};
const rows = {
  moving: [{case_id: 'a', dimension: 'color', scenarios: scen('rgb(1, 1, 1)', 'rgb(2, 2, 2)'), unthemed: null}],
  static: [{case_id: 'a', dimension: 'color', scenarios: scen('rgb(1, 1, 1)', 'rgb(1, 1, 1)'), unthemed: 'rgb(1, 1, 1)'}],
  themed: [{case_id: 'a', dimension: 'color', scenarios: scen('rgb(1, 1, 1)', 'rgb(1, 1, 1)'), unthemed: 'rgb(0, 0, 0)'}],
};
out({
  moving: cases.assessOracle('toolbar', rows.moving, {identity, isolation: {peer_only: true}, applicable: ['color']}),
  static: cases.assessOracle('toolbar', rows.static, {identity, isolation: {peer_only: true}, applicable: ['color']}),
  themed: cases.assessOracle('toolbar', rows.themed, {identity, isolation: {peer_only: true}, applicable: ['color']}),
  foreign: cases.assessOracle('toolbar', rows.moving, {identity, isolation: {peer_only: false}, applicable: ['color']}),
  anonymous: cases.assessOracle('toolbar', rows.moving, {identity: null, isolation: {peer_only: true}, applicable: ['color']}),
});
"""


class SentinelInjectionTests(unittest.TestCase):
    def test_one_token_per_injection_and_color_sentinel_for_outline_color(self):
        out = node("""
const table = cases.sentinelTable();
const css = cases.sentinelCss(table, '--mat-badge-container-shape');
const outline = cases.BINDINGS.find((b) => b.id === 'datepicker/color/popup-selected-today/box-shadow');
const kw = cases.peerKeywordTokens({badge: {dimensions: {base: {declared: {
  '--mat-badge-container-size': ['unset'], '--mat-badge-container-shape': ['50%'], '--mat-badge-x': ['unset', '1px']}}}}});
out({css, outline: table[outline.token].kind, kw});
""")
        self.assertEqual(out["css"].count("--mat-"), 1)
        self.assertIn("--mat-badge-container-shape", out["css"])
        self.assertEqual(out["outline"], "color")
        self.assertEqual(out["kw"], {"--mat-badge-container-size": "unset"})


class OracleTests(unittest.TestCase):
    def test_noop_unthemed_foreign_or_anonymous_oracle_fails(self):
        result = node(ORACLE)
        self.assertEqual(result["moving"]["result"], "pass", result["moving"]["reasons"])
        self.assertEqual(result["themed"]["result"], "pass", result["themed"]["reasons"])
        self.assertEqual(result["static"]["result"], "fail")
        self.assertEqual(result["foreign"]["result"], "fail")
        self.assertEqual(result["anonymous"]["result"], "fail")


DERIVE = """
const emit = (tokens) => ({tokens, by_theme: {}});
const tokens = {};
for (const c of cases.COMPANIONS) {
  tokens[c] = {peer_source_file: `${c}/_m2-${c}.scss`, peer_source_sha256: 'ab'.repeat(32),
    dimensions: Object.fromEntries(cases.DIMENSIONS.map((d) => [d, emit([...new Set(
      cases.BINDINGS.filter((b) => b.companion === c && b.dimension === d).map((b) => b.token))])]))};
}
const res = {};
const base = cases.deriveRoster(tokens);
res.base = {groups: base.groups, unbound: base.unbound, na: base.notApplicable.map((e) => e.id)};
const extra = structuredClone(tokens);
extra.toolbar.dimensions.color.tokens.push('--mat-toolbar-new-token');
res.unbound = cases.deriveRoster(extra).unbound;
const dropped = structuredClone(tokens);
dropped.toolbar.dimensions.color.tokens = dropped.toolbar.dimensions.color.tokens.slice(1);
try { cases.deriveRoster(dropped); res.dropped = null; } catch (e) { res.dropped = String(e.message); }
const silent = structuredClone(tokens);
silent.toolbar.dimensions.color.tokens = [];
try { cases.deriveRoster(silent); res.silent = null; } catch (e) { res.silent = String(e.message); }
const missing = structuredClone(tokens);
delete missing.tree;
try { cases.deriveRoster(missing); res.missing = null; } catch (e) { res.missing = String(e.message); }
const g = base.groups;
const dims = g['thirteen-companion-dimensions'];
res.compare = {
  same: producer.compareRoster(g, structuredClone(g)),
  omitted: producer.compareRoster(g, {...g, 'thirteen-companion-dimensions': dims.slice(1)}),
  extra: producer.compareRoster(g, {...g, 'thirteen-companion-dimensions': [...dims, 'x/color/y/color']}),
  reordered: producer.compareRoster(g, {...g, 'thirteen-companion-dimensions': [dims[1], dims[0], ...dims.slice(2)]}),
};
out(res);
"""


class RosterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.derived = node(DERIVE)

    def test_matrix_main_roster_is_the_reviewed_derivation(self):
        groups = matrix_groups("main")
        self.assertIsNotNone(groups["thirteen-companion-dimensions"])
        self.assertIsNotNone(groups["independent-peer-oracle"])
        # The matrix NA set is what the installed peer emitted nothing for; given
        # that set, the rendered ids are exactly the reviewed bindings, in order.
        na = [case_id for case_id in groups["thirteen-companion-dimensions"] if case_id.endswith("/not-applicable")]
        expected = node("""
const na = new Set(input);
const ids = [];
for (const c of cases.COMPANIONS) for (const d of cases.DIMENSIONS) {
  const id = cases.notApplicableId(c, d);
  if (na.has(id)) { ids.push(id); continue; }
  for (const b of cases.BINDINGS) if (b.companion === c && b.dimension === d) ids.push(b.id);
}
out({ids, oracle: cases.COMPANIONS.map(cases.oracleCaseId)});
""", na)
        self.assertEqual(groups["thirteen-companion-dimensions"], expected["ids"])
        self.assertEqual(groups["independent-peer-oracle"], expected["oracle"])

    def test_every_companion_dimension_is_rostered_or_not_applicable(self):
        groups = matrix_groups("main")
        covered = {tuple(case_id.split("/")[:2]) for case_id in groups["thirteen-companion-dimensions"]}
        companions = node("out(cases.COMPANIONS);")
        self.assertEqual(len(companions), 13)
        for companion in companions:
            for dimension in ("base", "color", "typography", "density"):
                self.assertIn((companion, dimension), covered)

    def test_21x_groups_stay_null(self):
        for group, ids in matrix_groups("21.x").items():
            self.assertIsNone(ids, group)

    def test_derivation_rejects_unbound_dropped_silent_and_missing(self):
        self.assertEqual(self.derived["base"]["unbound"], [])
        self.assertEqual(self.derived["unbound"], ["toolbar/color: --mat-toolbar-new-token"])
        self.assertIn("does not emit", self.derived["dropped"])
        self.assertIn("bindings exist but the peer emits no token", self.derived["silent"])
        self.assertIn("missing tree", self.derived["missing"])

    def test_compare_roster_rejects_omitted_extra_and_reordered(self):
        compare = self.derived["compare"]
        self.assertEqual(compare["same"], [])
        for key in ("omitted", "extra", "reordered"):
            self.assertEqual(len(compare[key]), 1, key)

    def test_lab_renders_every_located_fixture(self):
        missing = node("""
const src = producer.labSource();
const missing = new Set();
for (const b of cases.BINDINGS) {
  for (const m of (b.locate.css || '').matchAll(/#([a-z0-9-]+)/g)) if (!src.includes(m[1])) missing.add(m[1]);
}
out([...missing]);
""")
        self.assertEqual(missing, [])

    def test_datepicker_popup_and_bottom_sheet_are_body_overlays(self):
        overlays = node("out(cases.BINDINGS.filter((b) => b.locate.overlay).map((b) => b.companion));")
        self.assertIn("bottom-sheet", overlays)
        self.assertIn("datepicker", overlays)


BODIES = """
const ids = new Set(input.ids);
const roster = {rostered: cases.BINDINGS.filter((b) => ids.has(b.id)), notApplicable: []};
const sentinels = cases.sentinelTable(roster.rostered);
const observations = {};
for (const b of roster.rostered) {
  const o = {found: true, value: 'rgb(9, 9, 9)', token_value: 'rgb(9, 9, 9)'};
  const d = {found: true, value: 'rgb(8, 8, 8)', token_value: 'rgb(8, 8, 8)'};
  const per = Object.fromEntries(b.scenarios.map((s) => [s, s === 'light' ? o : d]));
  observations[b.id] = {oracle: per, candidate: per, bridge: per, bridge_negative: {found: true, value: sentinels[b.token].marker}, negative: {found: true, value: sentinels[b.token].marker}};
}
const tokens = {toolbar: {peer_source_file: 'toolbar/_m2-toolbar.scss', peer_source_sha256: 'ab'.repeat(32),
  dimensions: Object.fromEntries(cases.DIMENSIONS.map((d) => [d, {tokens: []}]))}};
const identity = {package: '@angular/material', version: '22.1.7', package_json_sha256: 'cd'.repeat(32)};
const assessed = producer.assessAll({roster, observations, sentinels, dimensionTokens: tokens, identity, isolation: {peer_only: true, legacy_package_loaded: false}});
const bodies = producer.assertionBodies(assessed, {line: 'main', runId: 'run', invocationId: 'inv', identity,
  dimensionTokens: tokens, oracleCssSha256: 'ef'.repeat(32), candidateCssSha256: '01'.repeat(32),
  tarballSha256: '23'.repeat(32), browser: 'Chrome', isolation: {peer_only: true, legacy_package_loaded: false}});
const written = producer.writeAssertionFiles(input.dir, bodies.filter((b) => b.companion === 'toolbar'));
let duplicate = null;
try { producer.writeAssertionFiles(input.dir, bodies.slice(0, 1)); } catch (e) { duplicate = String(e.message); }
out({bodies: bodies.filter((b) => b.companion === 'toolbar'), written, duplicate});
"""


class AssertionBodyTests(unittest.TestCase):
    def test_one_assertion_file_per_case_with_identity(self):
        ids = ["toolbar/color/toolbar/background-color", "toolbar/density/toolbar-row/height"]
        with tempfile.TemporaryDirectory() as tmp:
            result = node(BODIES, {"ids": ids, "dir": tmp})
            names = sorted(path.name for path in Path(tmp).iterdir())
        self.assertIn("duplicate assertion file", result["duplicate"])
        by_id = {body["case_id"]: body for body in result["bodies"]}
        self.assertEqual(set(by_id), {*ids, "toolbar/peer-oracle"})
        self.assertEqual(names, sorted(case_id.replace("/", "__") + ".json" for case_id in by_id))
        for case_id in ids:
            body = by_id[case_id]
            self.assertEqual(body["result"], "pass", body["reasons"])
            self.assertEqual(body["group"], "thirteen-companion-dimensions")
            self.assertEqual(body["kind"], "assertion")
            self.assertEqual(body["peer_version"], "22.1.7")
            self.assertEqual(body["peer_source_file"], "toolbar/_m2-toolbar.scss")
            self.assertEqual(body["tarball_sha256"], "23" * 32)
        oracle = by_id["toolbar/peer-oracle"]
        self.assertEqual(oracle["group"], "independent-peer-oracle")
        self.assertEqual(oracle["oracle_isolation"]["peer_only"], True)


@unittest.skipUnless(HAS_PEER, "installed @angular/material peer and sass are required")
class PeerDerivationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.result = node("""
import {createRequire} from 'node:module';
const nm = input;
const sass = createRequire(nm + '/sass-loader.js')('sass');
const identity = cases.peerIdentity(nm);
const tokens = cases.peerDimensionTokens(sass, nm, identity);
const roster = cases.deriveRoster(tokens);
const oracle = cases.compilePeerOnly(sass, nm, cases.oracleScss(), 'ccs-oracle.scss', identity);
out({version: identity.version, groups: roster.groups, unbound: roster.unbound, oracle_bytes: oracle.css.length});
""", str(PEER_NODE_MODULES))

    def test_installed_peer_derives_the_matrix_roster(self):
        self.assertEqual(self.result["unbound"], [])
        self.assertEqual(self.result["groups"], matrix_groups("main"))

    def test_oracle_compiles_from_the_peer_only(self):
        self.assertGreater(self.result["oracle_bytes"], 0)


if __name__ == "__main__":
    unittest.main()
