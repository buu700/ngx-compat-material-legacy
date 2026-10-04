#!/usr/bin/env python3
"""Advertised library engines/peers are compared to lock and installed versions."""
from __future__ import annotations

import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def workspace_packages_ready() -> bool:
    """True when every advertised peer is installed.

    verify-lite does not install node_modules and does not execute the checker.
    Full verify installs peers, then always runs the checker. A missing peer
    must still fail that run, so this skip stays in the test.
    """
    manifest = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())
    peers = manifest.get("peerDependencies")
    if not isinstance(peers, dict) or not peers:
        return False
    for name in peers:
        package_json = ROOT.joinpath("node_modules", *str(name).split("/"), "package.json")
        if not package_json.is_file():
            return False
    return True


def node_eval(script: str, payload: dict | None = None) -> dict:
    args = ["node", "--input-type=module", "-e", script]
    if payload is not None:
        args.append(json.dumps(payload))
    result = subprocess.run(
        args,
        cwd=ROOT,
        text=True,
        capture_output=True,
        check=False,
    )
    if result.returncode != 0:
        raise AssertionError(result.stderr or result.stdout)
    return json.loads(result.stdout)


class ConsumerFloorsTests(unittest.TestCase):
    def test_satisfies_advertised_node_and_peer_ranges(self):
        report = node_eval(
            """
import {satisfies} from './scripts/check-consumer-floors.mjs';
const cases = JSON.parse(process.argv[1]);
console.log(JSON.stringify(Object.fromEntries(
  Object.entries(cases).map(([name, [version, range]]) => [name, satisfies(version, range)]),
)));
""",
            {
                "node_ok": ["24.21.0", "^22.22.3 || ^24.15.0 || ^26.0.0"],
                "node_box": ["20.19.2", "^22.22.3 || ^24.15.0 || ^26.0.0"],
                "angular_ok": ["22.1.7", "^22.1.7"],
                "angular_low": ["22.0.0", "^22.1.7"],
                "rxjs_ok": ["7.8.2", "^6.5.3 || ^7.4.0"],
                "rxjs_old": ["6.5.3", "^6.5.3 || ^7.4.0"],
                "rxjs_bad": ["6.4.0", "^6.5.3 || ^7.4.0"],
            },
        )
        self.assertTrue(report["node_ok"])
        self.assertFalse(report["node_box"])
        self.assertTrue(report["angular_ok"])
        self.assertFalse(report["angular_low"])
        self.assertTrue(report["rxjs_ok"])
        self.assertTrue(report["rxjs_old"])
        self.assertFalse(report["rxjs_bad"])

    def test_evaluate_requires_real_range_match(self):
        report = node_eval(
            """
import {evaluateFloors} from './scripts/check-consumer-floors.mjs';
const floors = [
  {kind: 'engines', name: 'node', range: '^22.22.3 || ^24.15.0 || ^26.0.0', case_id: 'engines-node'},
  {kind: 'peer', name: '@angular/core', range: '^22.1.7', case_id: 'peer-@angular/core'},
];
const ok = evaluateFloors({
  floors,
  lockVersions: {'@angular/core': '22.1.7'},
  nodeLockVersion: '24.21.0',
  installed: {node: '24.21.0', '@angular/core': '22.1.7'},
});
const bad = evaluateFloors({
  floors,
  lockVersions: {'@angular/core': '22.1.7'},
  nodeLockVersion: '20.19.2',
  installed: {node: '20.19.2', '@angular/core': '22.0.0'},
});
console.log(JSON.stringify({
  ok_errors: ok.errors,
  ok_results: ok.comparisons.map(item => item.result),
  bad_errors: bad.errors,
  bad_results: bad.comparisons.map(item => [item.case_id, item.result, item.range_satisfied]),
}));
"""
        )
        self.assertEqual(report["ok_errors"], [])
        self.assertEqual(report["ok_results"], ["pass", "pass"])
        self.assertTrue(report["bad_errors"])
        self.assertEqual(report["bad_results"][0][1], "fail")
        self.assertEqual(report["bad_results"][1][1], "fail")
        self.assertFalse(report["bad_results"][0][2])
        self.assertFalse(report["bad_results"][1][2])

    def test_main_roster_is_only_public_engines_peers(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "consumer-floors")
        self.assertFalse(row["implemented"])
        manifest = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())
        expected = node_eval(
            """
import {collectDeclaredFloors, publicEnginesPeersIds} from './scripts/check-consumer-floors.mjs';
const floors = collectDeclaredFloors(JSON.parse(process.argv[1]));
console.log(JSON.stringify(publicEnginesPeersIds(floors)));
""",
            manifest,
        )
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["public-engines-peers"], expected)
        self.assertIsNone(main["cli-runtime"])
        self.assertIsNone(main["line-isolation"])
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            self.assertIsNone(ids, group)

    @unittest.skipUnless(
        workspace_packages_ready(),
        "workspace node_modules is missing installed peer packages",
    )
    def test_workspace_compares_declared_floors(self):
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            out = tmp_path / "consumer-floors.json"
            invocation = "workspacefloors"
            assertion_dir = tmp_path / "evidence" / "consumer-floors" / invocation
            assertion_dir.mkdir(parents=True)
            env = os.environ.copy()
            env.update({
                "RC_CHECK_ID": "consumer-floors",
                "RC_RUN_ID": "workspace-floors",
                "RC_INVOCATION_ID": invocation,
                "RC_EVIDENCE_BINDING": json.dumps({"source_line": "main"}),
                "RC_ASSERTION_OUTPUT_DIR": str(assertion_dir),
            })
            result = subprocess.run(
                ["node", "scripts/check-consumer-floors.mjs", "--out", str(out)],
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
            self.assertEqual(report["g12_claim"], "not-passed")
            self.assertFalse(report["process_node_used_for_floor"])
            self.assertTrue(report["comparisons"])
            for comparison in report["comparisons"]:
                self.assertEqual(comparison["result"], "pass")
                self.assertTrue(comparison["range_satisfied"])
                self.assertTrue(comparison["lock_matches_installed"])
                self.assertIsInstance(comparison["declared_range"], str)
                self.assertIsInstance(comparison["lock_version"], str)
                self.assertIsInstance(comparison["installed_version"], str)
            names = sorted(path.name for path in assertion_dir.iterdir())
            self.assertEqual(len(names), len(report["case_ids"]))
            for case_id in report["case_ids"]:
                body = json.loads((assertion_dir / f"{case_id.replace('/', '__')}.json").read_text())
                self.assertEqual(body["case_id"], case_id)
                self.assertEqual(body["result"], "pass")
                self.assertEqual(body["kind"], "assertion")
                self.assertEqual(body["g12_claim"], "not-passed")
                self.assertTrue(body["range_satisfied"])
                self.assertIsNone(body["not_executed"]["cli-runtime"])
                self.assertIsNone(body["not_executed"]["line-isolation"])
                self.assertIsNone(body["not_executed"]["21.x"])


if __name__ == "__main__":
    unittest.main()
