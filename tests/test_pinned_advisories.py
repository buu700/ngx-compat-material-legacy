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


def run(report: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["node", str(CHECKER), "--report", str(report), "--peers", str(PEERS)],
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


if __name__ == "__main__":
    unittest.main()
