"""Producer regressions for the in-run current-peer M2 bridge token oracle."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / "compatibility/rc/matrices/full-verify.json"
HAS_PEER = (ROOT / "node_modules/@angular/material/_index.scss").is_file() and (ROOT / "node_modules/sass").exists()


def node_json(script: str, payload) -> dict:
    result = subprocess.run(
        ["node", "--input-type=module", "-e", script, json.dumps(payload)],
        cwd=ROOT, text=True, capture_output=True, check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


def roster():
    matrix = json.loads(MATRIX.read_text())
    row = next(item for item in matrix["checks"] if item["check_id"] == "companion-bridge-tokens")
    return row["acceptance"]["cases_by_line"]["main"]["compiled-override-tokens"]


class PureComparisonTests(unittest.TestCase):
    SCRIPT = """
import {compareTokens} from './scripts/companion-bridge-peer-oracle.mjs';
const input = JSON.parse(process.argv[1]);
console.log(JSON.stringify(compareTokens(input)));
"""

    def compare(self, peer, candidate, sources=None):
        token = "--mat-toolbar-container-background-color"
        sources = {token: {"file": "toolbar/_m2-toolbar.scss", "sha256": "a" * 64}} if sources is None else sources
        return node_json(self.SCRIPT, {"caseIds": [token], "peer": {"contract": peer},
                                       "candidate": {"contract": candidate}, "sources": sources})[0]

    def test_equal_value_passes(self):
        decls = {":root": {"--mat-toolbar-container-background-color": "white"}}
        self.assertEqual(self.compare(decls, decls)["result"], "pass")

    def test_wrong_but_nonempty_value_fails(self):
        case = self.compare({":root": {"--mat-toolbar-container-background-color": "white"}},
                            {":root": {"--mat-toolbar-container-background-color": "whitesmoke"}})
        self.assertEqual(case["result"], "fail")
        self.assertEqual(case["expected_peer"], "white")
        self.assertEqual(case["candidate"], "whitesmoke")

    def test_missing_token_missing_peer_or_source_fails(self):
        token = "--mat-toolbar-container-background-color"
        self.assertEqual(self.compare({":root": {token: "white"}}, {":root": {}})["result"], "fail")
        self.assertEqual(self.compare({":root": {}}, {":root": {token: "white"}})["result"], "fail")
        self.assertEqual(self.compare({":root": {token: "white"}}, {":root": {token: "white"}}, sources={})["result"], "fail")

    def test_variant_declarations_must_match_both_ways(self):
        token = "--mat-toolbar-container-background-color"
        peer = {":root": {token: "white"}, ".mat-toolbar.mat-accent": {token: "#ff4081"}}
        self.assertEqual(self.compare(peer, dict(peer))["result"], "pass")
        wrong = {":root": {token: "white"}, ".mat-toolbar.mat-accent": {token: "#3f51b5"}}
        self.assertEqual(self.compare(peer, wrong)["result"], "fail")
        self.assertEqual(self.compare(peer, {":root": {token: "white"}})["result"], "fail")
        extra = {**peer, ".mat-toolbar.mat-warn": {token: "#f44336"}}
        self.assertEqual(self.compare(peer, extra)["result"], "fail")


@unittest.skipUnless(HAS_PEER, "installed @angular/material peer and sass are required")
class InRunPeerOracleTests(unittest.TestCase):
    SCRIPT = """
import {readFileSync, readdirSync} from 'node:fs';
import {compileCandidate, runPeerOracle, writeAssertions} from './scripts/companion-bridge-peer-oracle.mjs';
const {dir, wrongToken} = JSON.parse(process.argv[1]);
const root = process.cwd();
const real = runPeerOracle(root);
writeAssertions(dir, real, {runId: 'run-x', invocationId: 'inv-y'});
const files = readdirSync(dir).sort();
const sample = JSON.parse(readFileSync(`${dir}/${files[0]}`, 'utf8'));
const wrong = runPeerOracle(root, {candidateOverride: (scenario) => compileCandidate(root, scenario)
  .replace(new RegExp(`(${wrongToken}:\\\\s*)[^;]+;`), '$1whitesmoke;')});
console.log(JSON.stringify({
  ids: real.caseIds,
  failed: real.cases.filter((c) => c.result !== 'pass').map((c) => c.case_id),
  unexpected: real.unexpected,
  identity: real.identity,
  files: files.length,
  sample,
  noSource: real.cases.filter((c) => !c.peer_source_file).map((c) => c.case_id),
  wrongFailed: wrong.cases.filter((c) => c.result !== 'pass').map((c) => c.case_id),
  wrongCase: wrong.cases.find((c) => c.case_id === wrongToken),
}));
"""

    @classmethod
    def setUpClass(cls):
        cls.temp = tempfile.TemporaryDirectory(prefix="bridge-oracle-test-")
        cls.out = node_json(cls.SCRIPT, {"dir": cls.temp.name, "wrongToken": "--mat-toolbar-container-background-color"})

    @classmethod
    def tearDownClass(cls):
        cls.temp.cleanup()

    def test_roster_is_exactly_the_asserted_tokens(self):
        self.assertEqual(self.out["ids"], roster())
        self.assertEqual(len(self.out["ids"]), 161)

    def test_every_rostered_token_equals_the_current_peer(self):
        self.assertEqual(self.out["failed"], [])
        self.assertEqual(self.out["unexpected"], [])
        self.assertEqual(self.out["noSource"], [])
        package = json.loads((ROOT / "package.json").read_text())
        self.assertEqual(self.out["identity"]["version"], package["devDependencies"]["@angular/material"])

    def test_one_assertion_per_case_records_peer_version_and_source(self):
        self.assertEqual(self.out["files"], 161)
        sample = self.out["sample"]
        self.assertEqual(sample["kind"], "assertion")
        self.assertEqual(sample["result"], "pass")
        self.assertEqual(sample["run_id"], "run-x")
        self.assertEqual(sample["invocation_id"], "inv-y")
        self.assertEqual(sample["peer_package"], "@angular/material")
        self.assertEqual(sample["peer_version"], self.out["identity"]["version"])
        component = sample["component"]
        self.assertEqual(sample["peer_source_file"], f"{component}/_m2-{component}.scss")
        self.assertEqual(sample["candidate"], sample["expected_peer"])

    def test_deliberately_wrong_token_fails_only_its_case(self):
        self.assertEqual(self.out["wrongFailed"], ["--mat-toolbar-container-background-color"])
        case = self.out["wrongCase"]
        self.assertEqual(case["result"], "fail")
        self.assertEqual(case["candidate"], "whitesmoke")
        self.assertEqual(case["expected_peer"], "white")


if __name__ == "__main__":
    unittest.main()
