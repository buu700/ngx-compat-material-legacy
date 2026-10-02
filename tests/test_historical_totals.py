#!/usr/bin/env python3
"""Artifact historical totals are explained from the shipped runner, not relabeled."""
from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "compatibility/rc/reports/historical-totals-explanation.json"
INVENTORY = ROOT / "testing/legacy-runner/historical-inventory.json"


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload) + "\n")


def family_report(executed: int, historical_path: str, discovery: int = 1, probe: int = 1) -> dict:
    component = executed - discovery - probe
    return {
        "subject_mode": "artifact",
        "artifact_sha256": "a" * 64,
        "totals": {"executed": executed, "passed": executed, "failed": 0, "skipped": 0},
        "by_suite": [
            {"description_path": "Component", "executed": component, "passed": component, "failed": 0},
            {"description_path": "legacy-runner discovery", "executed": discovery, "passed": discovery, "failed": 0},
            {"description_path": "legacy-runner deliberate fail probe", "executed": probe, "passed": probe, "failed": 0},
        ],
        "mapped_specs": [{"historical_path": historical_path}],
        "package_root": "/tmp/should-not-be-copied",
    }


class HistoricalTotalsTests(unittest.TestCase):
    def explain(self, root: Path, workspace_executed: int | None = None) -> dict:
        reports = root / "reports"
        reports.mkdir()
        write_json(reports / "legacy-button-20261002T215120Z.json", family_report(
            10, "src/material/legacy-button/button.spec.ts"))
        card = family_report(6, "src/material/legacy-card/card.spec.ts")
        if workspace_executed is not None:
            card["totals"]["executed"] = 6
            card["totals"]["passed"] = 6
        write_json(reports / "legacy-card-20261002T215123Z.json", card)
        write_json(root / "run.json", {
            "run_id": "fixture-run",
            "source": {"clean": False},
            "artifacts": [{"id": "library", "path": "library.tgz", "sha256": "a" * 64}],
        })
        inventory = root / "inventory.json"
        write_json(inventory, {
            "denominator": 2,
            "rows": [
                {"historical_path": "src/material/legacy-button/button.spec.ts"},
                {"historical_path": "src/material/legacy-card/card.spec.ts"},
            ],
        })
        workspace = root / "workspace"
        workspace.mkdir()
        button_executed = 10
        card_executed = 6 if workspace_executed is None else workspace_executed
        write_json(workspace / "legacy-button.json", {"totals": {"executed": button_executed}})
        write_json(workspace / "legacy-card.json", {"totals": {"executed": card_executed}})
        out = root / "explanation.json"
        result = subprocess.run(
            [
                "node", "scripts/explain-historical-totals.mjs",
                "--run", str(root / "run.json"),
                "--out", str(out),
                "--inventory", str(inventory),
                "--workspace", str(workspace),
                "--prior-label", "tip-ci-all-22-families-2153-pass-artifact-bound",
            ],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)
        return json.loads(out.read_text())

    def test_runner_rows_and_prior_label_stay_distinct(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = self.explain(Path(tmp))
        self.assertEqual(report["executed"], 16)
        self.assertEqual(report["runner_discovery"], 2)
        self.assertEqual(report["runner_deliberate_fail_probe"], 2)
        self.assertEqual(report["executed_without_runner_rows"], 12)
        self.assertEqual(report["mapped_specs"], 2)
        self.assertEqual(report["inventory_denominator"], 2)
        self.assertTrue(report["mapped_specs_match_inventory"])
        self.assertTrue(report["family_totals_match_workspace_reports"])
        self.assertEqual(report["prior_label_count"], 2153)
        self.assertNotEqual(report["prior_label_count"], report["executed"])
        self.assertNotEqual(report["prior_label_count"], report["executed_without_runner_rows"])
        self.assertEqual([row["executed"] for row in report["family_totals"]], [10, 6])
        text = json.dumps(report)
        self.assertNotIn("/tmp/", text)
        self.assertNotIn("/home/", text)
        self.assertIn("not rewritten", report["explanation"])

    def test_workspace_drift_is_reported(self):
        with tempfile.TemporaryDirectory() as tmp:
            report = self.explain(Path(tmp), workspace_executed=9)
        self.assertFalse(report["family_totals_match_workspace_reports"])
        self.assertEqual(report["family_totals"][0]["executed"] + report["family_totals"][1]["executed"], 16)

    def test_committed_explanation_matches_inventory_and_main_tarball(self):
        report = json.loads(REPORT.read_text())
        inventory = json.loads(INVENTORY.read_text())
        browser = json.loads((ROOT / "compatibility/rc/reports/browser-matrix-required.json").read_text())
        main_sha = next(item["tarball_sha256"] for item in browser["artifacts"] if item["line"] == "main")
        self.assertEqual(report["artifact_sha256"], main_sha)
        self.assertTrue(report["artifact_sha_matches_reports"])
        self.assertEqual(report["report_artifact_sha256"], [main_sha])
        self.assertEqual(report["inventory_denominator"], inventory["denominator"])
        self.assertEqual(report["mapped_specs"], inventory["denominator"])
        self.assertTrue(report["mapped_specs_match_inventory"])
        self.assertEqual(report["families"], 22)
        self.assertEqual(report["failed"], 0)
        self.assertEqual(report["executed"], sum(row["executed"] for row in report["family_totals"]))
        self.assertEqual(
            report["executed_without_runner_rows"],
            report["executed"] - report["runner_discovery"] - report["runner_deliberate_fail_probe"],
        )
        self.assertEqual(report["runner_discovery"], 22)
        self.assertEqual(report["runner_deliberate_fail_probe"], 22)
        self.assertNotEqual(report["prior_label_count"], report["executed"])
        self.assertNotEqual(report["prior_label_count"], report["executed_without_runner_rows"])
        self.assertTrue(report["family_totals_match_workspace_reports"])
        text = REPORT.read_text()
        self.assertNotIn("/home/", text)
        self.assertNotIn("/tmp/", text)


if __name__ == "__main__":
    unittest.main()
