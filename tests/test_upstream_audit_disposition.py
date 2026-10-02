#!/usr/bin/env python3
"""The shipped disposition checker rejects a missing seed row, a duplicate SHA, and a security hunk labeled docs-only."""

from __future__ import annotations

import json
import subprocess
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts" / "check-upstream-audit-disposition.mjs"
SEED = ROOT / "compatibility" / "f10" / "upstream-sha-risk-bootstrap.json"
LEDGER = ROOT / "compatibility" / "f10" / "disposition-ledger" / "ledger.json"


def run_checker(seed: Path, ledger: Path, report: Path, patches: Path | None = None) -> subprocess.CompletedProcess[str]:
    command = [
        "node", str(CHECKER),
        "--seed", str(seed),
        "--ledger", str(ledger),
        "--report", str(report),
    ]
    if patches is not None:
        command.extend(["--patches", str(patches)])
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True)


class UpstreamAuditDispositionTests(unittest.TestCase):
    def test_intact_ledger_covers_every_seed_sha(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "report.json"
            result = run_checker(SEED, LEDGER, report)
            combined = result.stdout + result.stderr
            self.assertEqual(result.returncode, 0, combined)
            summary = json.loads(result.stdout)
            self.assertTrue(summary["ok"])
            self.assertEqual(summary["seed_rows"], 1697)
            self.assertEqual(summary["ledger_rows"], 1697)
            self.assertEqual(summary["missing"], 0)
            self.assertEqual(summary["conflicting_sha_rows"], 0)
            self.assertEqual(summary["outside_seed"], 0)
            self.assertEqual(summary["security_hunk_labeled_docs_only"], 0)
            self.assertEqual(summary["g11_claim"], "not-passed")
            report_body = json.loads(report.read_text())
            self.assertEqual(report_body["result"], "pass")
            self.assertEqual(report_body["g11_claim"], "not-passed")

    def test_removed_seed_row_conflicts_and_docs_only_security_hunk_fail(self) -> None:
        ledger = json.loads(LEDGER.read_text())
        seed = json.loads(SEED.read_text())
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            removed_ledger = directory / "removed.json"
            removed = json.loads(json.dumps(ledger))
            removed["entries"] = removed["entries"][:-1]
            removed_ledger.write_text(json.dumps(removed))
            removed_report = directory / "removed-report.json"
            removed_result = run_checker(SEED, removed_ledger, removed_report)
            removed_summary = json.loads(removed_result.stdout)
            self.assertNotEqual(removed_result.returncode, 0, removed_result.stderr)
            self.assertGreaterEqual(removed_summary["missing"], 1)
            self.assertIn("missing=", removed_result.stderr)
            print(
                f"removed seed row: checker exit {removed_result.returncode} "
                f"missing={removed_summary['missing']}",
                flush=True,
            )

            duplicate_ledger = directory / "duplicate.json"
            duplicate = json.loads(json.dumps(ledger))
            duplicate["entries"] = [duplicate["entries"][0], *duplicate["entries"]]
            duplicate_ledger.write_text(json.dumps(duplicate))
            duplicate_report = directory / "duplicate-report.json"
            duplicate_result = run_checker(SEED, duplicate_ledger, duplicate_report)
            duplicate_summary = json.loads(duplicate_result.stdout)
            self.assertNotEqual(duplicate_result.returncode, 0, duplicate_result.stderr)
            self.assertGreaterEqual(duplicate_summary["conflicting_sha_rows"], 1)
            self.assertIn("conflicting=", duplicate_result.stderr)
            print(
                f"duplicate sha: checker exit {duplicate_result.returncode} "
                f"conflicting={duplicate_summary['conflicting_sha_rows']}",
                flush=True,
            )

            sha = seed["commits"][0]["sha"]
            patches = directory / "patches"
            patches.mkdir()
            (patches / f"{sha}.diff").write_text(
                "diff --git a/src/cdk/a11y/live-announcer.ts b/src/cdk/a11y/live-announcer.ts\n"
                "--- a/src/cdk/a11y/live-announcer.ts\n"
                "+++ b/src/cdk/a11y/live-announcer.ts\n"
                "@@\n"
                "+    element.innerHTML = message;\n"
            )
            labeled = json.loads(json.dumps(ledger))
            labeled["entries"][0] = {
                **labeled["entries"][0],
                "sha": sha,
                "final_disposition": "irrelevant",
                "read_note_disposition": "docs-only",
                "reason": "docs-only comment change",
            }
            # Keep the original row too so the failure under test is the security label, not a missing SHA.
            labeled["entries"].append(labeled["entries"][0])
            labeled_path = directory / "labeled.json"
            labeled_path.write_text(json.dumps(labeled))
            labeled_report = directory / "labeled-report.json"
            labeled_result = run_checker(SEED, labeled_path, labeled_report, patches)
            labeled_summary = json.loads(labeled_result.stdout)
            self.assertNotEqual(labeled_result.returncode, 0, labeled_result.stderr)
            self.assertGreaterEqual(labeled_summary["security_hunk_labeled_docs_only"], 1)
            self.assertIn("security_docs_only=", labeled_result.stderr)
            print(
                f"security hunk labeled docs-only: checker exit {labeled_result.returncode} "
                f"security_docs_only={labeled_summary['security_hunk_labeled_docs_only']}",
                flush=True,
            )


if __name__ == "__main__":
    unittest.main()
