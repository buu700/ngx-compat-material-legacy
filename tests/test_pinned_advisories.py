#!/usr/bin/env python3
"""Pinned advisory records keep the query cutoff and do not treat an unknown query as clean."""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts" / "check-pinned-advisories.mjs"
REPORT = ROOT / "compatibility" / "rc" / "reports" / "pinned-dependency-advisories.json"
PEERS = ROOT / "compatibility" / "peers-22.proposed.json"


def run(report: Path, *extra: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(CHECKER), "--report", str(report), "--peers", str(PEERS),
         "--now", "2026-10-03T18:00:00Z", *extra],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )


class PinnedAdvisoryTests(unittest.TestCase):
    def test_recorded_query_names_cutoff_and_every_pin(self) -> None:
        result = run(REPORT)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        summary = json.loads(result.stdout)
        report = json.loads(REPORT.read_text())
        peers = json.loads(PEERS.read_text())
        self.assertEqual(summary["result"], "queried")
        self.assertEqual(summary["g11_claim"], "not-passed")
        self.assertEqual(summary["security_clearance"], "not-passed")
        self.assertEqual(summary["http_status"], 200)
        self.assertTrue(report["cutoff"])
        self.assertEqual(report["endpoint"], "https://api.osv.dev/v1/querybatch")
        recorded = {f"{row['name']}@{row['version']}" for row in report["packages"]}
        for name, version in peers["exact_packages"].items():
            self.assertIn(f"{name}@{version}", recorded)

    def test_unknown_query_is_not_clean(self) -> None:
        report = json.loads(REPORT.read_text())
        report["result"] = "unknown"
        report.pop("packages", None)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "unknown.json"
            path.write_text(json.dumps(report))
            result = run(path)
        self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("unknown", result.stderr)
        summary = json.loads(result.stdout)
        self.assertFalse(summary["ok"])
        self.assertEqual(summary["result"], "unknown")


    def test_non_200_stale_future_and_unresolved_findings_are_not_clean(self) -> None:
        base = json.loads(REPORT.read_text())
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            failed = json.loads(json.dumps(base))
            failed["http_status"] = 500
            path = directory / "http.json"
            path.write_text(json.dumps(failed))
            result = run(path)
            self.assertNotEqual(result.returncode, 0, result.stdout + result.stderr)
            summary = json.loads(result.stdout)
            self.assertFalse(summary["ok"])
            self.assertEqual(summary["result"], "unknown")
            self.assertIn("unknown", result.stderr)

            stale = json.loads(json.dumps(base))
            stale["cutoff"] = "2020-01-01T00:00:00Z"
            stale_path = directory / "stale.json"
            stale_path.write_text(json.dumps(stale))
            stale_result = run(stale_path)
            self.assertNotEqual(stale_result.returncode, 0)
            self.assertEqual(json.loads(stale_result.stdout)["result"], "unknown")
            self.assertIn("stale", stale_result.stderr)

            future = json.loads(json.dumps(base))
            future["cutoff"] = "2099-01-01T00:00:00Z"
            future_path = directory / "future.json"
            future_path.write_text(json.dumps(future))
            future_result = run(future_path)
            self.assertNotEqual(future_result.returncode, 0)
            self.assertEqual(json.loads(future_result.stdout)["result"], "unknown")
            self.assertIn("future", future_result.stderr)

            finding = json.loads(json.dumps(base))
            finding["packages"][0]["vulns"] = [{"id": "GHSA-test"}]
            finding_path = directory / "finding.json"
            finding_path.write_text(json.dumps(finding))
            finding_result = run(finding_path)
            self.assertNotEqual(finding_result.returncode, 0)
            finding_summary = json.loads(finding_result.stdout)
            self.assertFalse(finding_summary["ok"])
            self.assertEqual(finding_summary["result"], "blocked")
            self.assertEqual(finding_summary["security_clearance"], "not-passed")
            self.assertIn("unresolved", finding_result.stderr)


if __name__ == "__main__":
    unittest.main()
