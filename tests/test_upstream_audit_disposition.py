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


def run_checker(
    seed: Path,
    ledger: Path,
    report: Path,
    patches: Path | None = None,
    *,
    admission: bool = False,
    line: str | None = None,
    symbols: Path | None = None,
) -> subprocess.CompletedProcess[str]:
    command = [
        "node", str(CHECKER),
        "--seed", str(seed),
        "--ledger", str(ledger),
        "--report", str(report),
    ]
    if patches is not None:
        command.extend(["--patches", str(patches)])
    if symbols is not None:
        command.extend(["--symbols", str(symbols)])
    if admission:
        command.append("--admission")
    if line is not None:
        command.extend(["--line", line])
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
            self.assertEqual(summary["structural_inventory"], "pass")
            self.assertEqual(summary["disposition_admission"], "incomplete")
            self.assertEqual(summary["security_clearance"], "not-passed")
            self.assertGreater(summary["insufficient_inherited"], 0)
            self.assertGreater(summary["insufficient_sensitive"], 0)
            self.assertGreater(summary["missing_evidence"], 0)
            self.assertGreater(summary["symbol_uses_open"], 0)
            report_body = json.loads(report.read_text())
            self.assertEqual(report_body["result"], "pass")
            self.assertEqual(report_body["structural_inventory"], "pass")
            self.assertEqual(report_body["disposition_admission"], "incomplete")
            self.assertEqual(report_body["g11_claim"], "not-passed")
            self.assertEqual(report_body["security_clearance"], "not-passed")

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


    def test_unknown_disposition_and_forged_clearance_fail(self) -> None:
        ledger = json.loads(LEDGER.read_text())
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            unknown = json.loads(json.dumps(ledger))
            unknown["entries"][0]["final_disposition"] = "cleared"
            unknown_path = directory / "unknown.json"
            unknown_path.write_text(json.dumps(unknown))
            result = run_checker(SEED, unknown_path, directory / "unknown-report.json")
            summary = json.loads(result.stdout)
            self.assertNotEqual(result.returncode, 0, result.stderr)
            self.assertGreaterEqual(summary["unknown_disposition"], 1)
            self.assertEqual(summary["structural_inventory"], "fail")
            self.assertIn("unknown=", result.stderr)

            forged = json.loads(json.dumps(ledger))
            forged["security_clearance"] = "passed"
            forged_path = directory / "forged.json"
            forged_path.write_text(json.dumps(forged))
            forged_result = run_checker(SEED, forged_path, directory / "forged-report.json")
            forged_summary = json.loads(forged_result.stdout)
            self.assertNotEqual(forged_result.returncode, 0, forged_result.stderr)
            self.assertTrue(forged_summary["forged_clearance"])
            self.assertEqual(forged_summary["security_clearance"], "not-passed")
            self.assertEqual(forged_summary["g11_claim"], "not-passed")

    def test_ancestry_only_inherited_row_is_not_admission(self) -> None:
        ledger = json.loads(LEDGER.read_text())
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            result = run_checker(SEED, LEDGER, directory / "report.json", admission=True, line="main")
            summary = json.loads(result.stdout)
            self.assertNotEqual(result.returncode, 0, result.stderr)
            self.assertEqual(summary["structural_inventory"], "pass")
            self.assertEqual(summary["disposition_admission"], "incomplete")
            self.assertGreaterEqual(summary["insufficient_inherited"], 1)
            self.assertIn("admission incomplete", result.stderr)
            self.assertEqual(summary["security_clearance"], "not-passed")
            # The ledger object above is only used to prove the file still parses.
            self.assertEqual(ledger["g11_claim"], "not-passed")


    def test_individual_proof_is_accepted_and_ancestry_is_not(self) -> None:
        sha = "a" * 40
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            seed = directory / "seed.json"
            seed.write_text(json.dumps({"commits": [{"sha": sha}]}))
            symbols = directory / "symbols.json"
            symbols.write_text(json.dumps({
                "status": "closed",
                "symbol_uses": [{"disposition": "closed", "status": "reviewed"}],
            }))
            evidence = "compatibility/rc/reports/docs-build-one-diff.json"
            common = {
                "sha": sha,
                "bucket": "behavior-semantic",
                "subject": "fix(cdk/a11y): sample",
                "files": ["src/cdk/a11y/live-announcer.ts"],
                "evidence_report": evidence,
                "reason": "synthetic row",
                "batch_id": "synthetic",
                "g11_claim": "not-passed",
            }
            proof = {
                "diff_sha256": "b" * 64,
                "review_depth": "individual-deep",
                "affected_branches": ["main"],
                "decision": "Installed member bytes and an executed delegation were compared for this commit.",
                "proof_kind": "installed-content",
                "installed_member": {"sha256": "c" * 64},
                "reachable_behavior": {"kind": "executed-delegation", "id": "synthetic/a11y/live-announcer"},
            }
            admitted = directory / "admitted.json"
            admitted.write_text(json.dumps({
                "g11_claim": "not-passed",
                "entries": [{**common, "final_disposition": "inherited", "individual_proof": proof}],
            }))
            admitted_result = run_checker(
                seed, admitted, directory / "admitted-report.json",
                admission=True, line="main", symbols=symbols,
            )
            admitted_summary = json.loads(admitted_result.stdout)
            self.assertEqual(admitted_result.returncode, 0, admitted_result.stderr)
            self.assertEqual(admitted_summary["disposition_admission"], "pass")
            self.assertEqual(admitted_summary["security_clearance"], "not-passed")
            self.assertEqual(admitted_summary["g11_claim"], "not-passed")
            self.assertEqual(admitted_summary["insufficient_inherited"], 0)

            ancestry = directory / "ancestry.json"
            ancestry.write_text(json.dumps({
                "g11_claim": "not-passed",
                "entries": [{
                    **common,
                    "final_disposition": "inherited",
                    "peer_floor": {"sha_is_ancestor_of_tag": True, "delegation": "@angular/cdk/a11y imported by owned.ts"},
                }],
            }))
            ancestry_result = run_checker(
                seed, ancestry, directory / "ancestry-report.json",
                admission=True, line="main", symbols=symbols,
            )
            ancestry_summary = json.loads(ancestry_result.stdout)
            self.assertNotEqual(ancestry_result.returncode, 0, ancestry_result.stderr)
            self.assertGreaterEqual(ancestry_summary["insufficient_inherited"], 1)
            self.assertEqual(ancestry_summary["disposition_admission"], "incomplete")
            self.assertEqual(ancestry_summary["security_clearance"], "not-passed")


if __name__ == "__main__":
    unittest.main()
