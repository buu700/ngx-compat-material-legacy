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

    def test_main_roster_matches_executed_cli_and_line(self):
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "consumer-floors")
        self.assertTrue(row["implemented"])
        manifest = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())
        expected = node_eval(
            """
import {collectDeclaredFloors, publicEnginesPeersIds} from './scripts/check-consumer-floors.mjs';
const floors = collectDeclaredFloors(JSON.parse(process.argv[1]));
console.log(JSON.stringify(publicEnginesPeersIds(floors)));
""",
            manifest,
        )
        executed = node_eval(
            """
import {executeCliRuntime, executeLineIsolation, passingCaseIds} from './scripts/check-consumer-floors.mjs';
const cli = executeCliRuntime();
const line = executeLineIsolation();
console.log(JSON.stringify({
  cli,
  line,
  cli_ids: passingCaseIds(cli.cases),
  line_ids: passingCaseIds(line.cases),
}));
"""
        )
        main = row["acceptance"]["cases_by_line"]["main"]
        self.assertEqual(main["public-engines-peers"], expected)
        self.assertEqual(main["cli-runtime"], executed["cli_ids"])
        self.assertEqual(main["line-isolation"], executed["line_ids"])
        self.assertEqual(executed["cli_ids"], ["current-runtime-satisfies", "below-floor-rejected"])
        self.assertEqual(executed["line_ids"], ["checkout-22-maps-to-main", "requested-21x-rejected"])
        current = next(item for item in executed["cli"]["cases"] if item["case_id"] == "current-runtime-satisfies")
        below = next(item for item in executed["cli"]["cases"] if item["case_id"] == "below-floor-rejected")
        self.assertEqual(current["result"], "pass")
        self.assertEqual(current["cli_exit_code"], 0)
        self.assertEqual(current["files_scanned"], 1)
        self.assertEqual(current["cli_distribution"], "bundled-cli")
        self.assertEqual(current["engines_range"], ">=18.0.0")
        self.assertTrue(current["range_satisfied"])
        self.assertTrue(str(current["node_version"]).startswith("v"))
        self.assertFalse(current["node_18_executed"])
        self.assertFalse(str(current["node_version"]).startswith("v18."))
        self.assertEqual(below["result"], "pass")
        self.assertEqual(below["probed_version"], "17.0.0")
        self.assertFalse(below["range_satisfied"])
        self.assertFalse(below["runtime_executed"])
        self.assertFalse(executed["cli"]["node_18_executed"])
        mapped = next(item for item in executed["line"]["cases"] if item["case_id"] == "checkout-22-maps-to-main")
        rejected = next(item for item in executed["line"]["cases"] if item["case_id"] == "requested-21x-rejected")
        self.assertEqual(mapped["result"], "pass")
        self.assertEqual(mapped["library_version"], "22.0.0-rc.0")
        self.assertEqual(mapped["mapped_line"], "main")
        self.assertEqual(rejected["result"], "pass")
        self.assertEqual(rejected["requested_line"], "21.x")
        self.assertEqual(rejected["checkout_line"], "main")
        self.assertTrue(rejected["rejected"])
        self.assertEqual(rejected["exit_code"], 2)
        self.assertIn("--line does not match this checkout library version", rejected["verifier_message"])
        self.assertFalse(executed["line"]["copied_21x_manifest"])
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            if group in ("library-runtime", "cli-runtime-floors"):
                self.assertTrue(ids, group)
            else:
                self.assertIsNone(ids, group)

    def test_synthetic_version_is_not_a_21x_run(self):
        import importlib.util
        from contextlib import redirect_stderr
        from io import StringIO

        spec = importlib.util.spec_from_file_location("rc_verify_line_test", ROOT / "scripts/rc-verify.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        self.assertEqual(module.source_line_for_library_version("22.0.0-rc.0"), "main")
        # A synthetic 21 version maps in the function, but this checkout did not run it.
        self.assertEqual(module.source_line_for_library_version("21.0.0"), "21.x")
        with self.assertRaises(module.EvidenceError):
            module.source_line_for_library_version("99.0.0")
        stderr = StringIO()
        with redirect_stderr(stderr):
            with self.assertRaises(SystemExit) as caught:
                module.require_line_matches_checkout("21.x", "main")
        self.assertEqual(caught.exception.code, 2)
        self.assertIn("--line does not match this checkout library version", stderr.getvalue())
        matrix = json.loads((ROOT / "compatibility/rc/matrices/full-verify.json").read_text())
        row = next(item for item in matrix["checks"] if item["check_id"] == "consumer-floors")
        self.assertNotIn("99.0.0", row["acceptance"]["cases_by_line"]["main"]["line-isolation"])
        self.assertNotIn("21.0.0", row["acceptance"]["cases_by_line"]["main"]["line-isolation"])
        for group, ids in row["acceptance"]["cases_by_line"]["21.x"].items():
            if group in ("library-runtime", "cli-runtime-floors"):
                self.assertTrue(ids, group)
            else:
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
            self.assertTrue(report["process_node_used_for_cli_runtime"])
            self.assertFalse(report["node_18_executed"])
            self.assertEqual(report["cli_runtime"]["case_ids"], ["current-runtime-satisfies", "below-floor-rejected"])
            self.assertEqual(report["line_isolation"]["case_ids"], ["checkout-22-maps-to-main", "requested-21x-rejected"])
            self.assertFalse(report["line_isolation"]["copied_21x_manifest"])
            for group, ids in report["cases_by_line_21x"].items():
                self.assertIsNone(ids, group)
            self.assertTrue(report["comparisons"])
            for comparison in report["comparisons"]:
                self.assertEqual(comparison["result"], "pass")
                self.assertTrue(comparison["range_satisfied"])
                self.assertTrue(comparison["lock_matches_installed"])
                self.assertIsInstance(comparison["declared_range"], str)
                self.assertIsInstance(comparison["lock_version"], str)
                self.assertIsInstance(comparison["installed_version"], str)
            executed_ids = [
                *report["case_ids"],
                *report["cli_runtime"]["case_ids"],
                *report["line_isolation"]["case_ids"],
            ]
            names = sorted(path.name for path in assertion_dir.iterdir())
            self.assertEqual(names, sorted(f"{case_id.replace('/', '__')}.json" for case_id in executed_ids))
            for case_id in report["case_ids"]:
                body = json.loads((assertion_dir / f"{case_id.replace('/', '__')}.json").read_text())
                self.assertEqual(body["case_id"], case_id)
                self.assertEqual(body["result"], "pass")
                self.assertEqual(body["kind"], "assertion")
                self.assertEqual(body["g12_claim"], "not-passed")
                self.assertTrue(body["range_satisfied"])
                self.assertNotIn("cli-runtime", body["not_executed"])
                self.assertNotIn("line-isolation", body["not_executed"])
                self.assertIsNone(body["not_executed"]["21.x"])
            current = json.loads((assertion_dir / "current-runtime-satisfies.json").read_text())
            self.assertEqual(current["cli_exit_code"], 0)
            self.assertEqual(current["node_version"], report["process_node"])
            self.assertFalse(current["node_18_executed"])
            self.assertFalse(current["separate_node_18_floor_case"])
            self.assertIsNone(current["not_executed"]["21.x"])
            below = json.loads((assertion_dir / "below-floor-rejected.json").read_text())
            self.assertEqual(below["probed_version"], "17.0.0")
            self.assertFalse(below["range_satisfied"])
            self.assertFalse(below["runtime_executed"])
            self.assertFalse(below["separate_node_18_floor_case"])
            mapped = json.loads((assertion_dir / "checkout-22-maps-to-main.json").read_text())
            self.assertEqual(mapped["library_version"], "22.0.0-rc.0")
            self.assertEqual(mapped["mapped_line"], "main")
            self.assertFalse(mapped["copied_21x_manifest"])
            rejected = json.loads((assertion_dir / "requested-21x-rejected.json").read_text())
            self.assertEqual(rejected["exit_code"], 2)
            self.assertTrue(rejected["rejected"])
            self.assertIn("--line does not match this checkout library version", rejected["verifier_message"])
            self.assertIsNone(rejected["not_executed"]["21.x"])


if __name__ == "__main__":
    unittest.main()
