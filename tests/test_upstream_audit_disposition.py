#!/usr/bin/env python3
# Copyright Google LLC All Rights Reserved.
# Copyright (c) 2026 Ryan Lester.
# Use of this source code is governed by an MIT-style license that can be
# found in the LICENSE file at https://angular.io/license
"""The shipped disposition checker rejects a missing seed row, a duplicate SHA, and a security hunk labeled docs-only."""

from __future__ import annotations

import json
import hashlib
import subprocess
import tempfile
import unittest
from pathlib import Path
from tests.audit_test_context import assert_native_review, assert_runtime_roster, native_contracts, prior_source_entry, read_review, read_original_patch

ROOT = Path(__file__).resolve().parents[1]
CHECKER = ROOT / "scripts" / "check-upstream-audit-disposition.mjs"
SEED = ROOT / "compatibility" / "f10" / "upstream-sha-risk-bootstrap.json"
LEDGER = ROOT / "compatibility" / "f10" / "disposition-ledger" / "ledger.json"
MECHANICAL = ROOT / "compatibility" / "f10" / "disposition-ledger" / "evidence" / "mechanical"
JOIN = ROOT / "compatibility" / "f10" / "audit-join" / "join.json"
QUEUE = ROOT / "compatibility" / "f10" / "audit-join" / "review-queue.json"
# Explicit current subjects, including reopened unexecuted/stale proofs. This roster is a
# regression guard, never an authorization to close a row or a G11 pass.
PENDING_SHA_IDS = frozenset("""
cf3506adf1af1556d705dbb651e7e96a7141b81d
878700d10ab042b6a62c6f86f4fcc24d5a0ae685
77ffdf98ba71c11d908b29e02b516dddf487ae0b
5dd614aa100e28f0815fdd83e5b68f4239ef01f9
86ebb9bfd55e637be1e6d0117a10e290c5247ebd
86a96c9290e3896485c6b6c0d039873652f543df
86ad5150110522873dae2801fd3c2957502949e7
68b267dd59f3addf92a3b9f8ce9e8baa479df7f4
938f478efdc96ef0de1217e806f98939beb027cd
9494ff2d65c98726046e6a20dd6a6d938e97a2f6
ea0aed5a0cba3288d89e7448073e0a5556487313
69968510fb0222ee565f57171640a99768efa972
cf456a2d43837497367662e7de22f1b2bcbf4f00
0064b4218b375b30b65bf1c13530d8620f20d980
8c3165582fcc1e307f8ddd261f5977c6f2f8b0fc
25f391a3c545a1b829a74584c4f9235ab8d18497
10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb
""".split())
ARTIFACT_REQUIRED_SUBJECTS = {
    '1b6db8c89b00ace8aaa0e0824866acec5369635f':
        ('already-adapted', 'select-focus-before-click', 'packed-consumer/harness/legacy-select', 10),
    '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e':
        ('already-adapted', 'select-close-on-real-scroll-detach', 'packed-consumer/harness/select-close-on-real-scroll-detach', 9),
    'ca9c490ee30dbf7c9c147079197d0dbc0abcd611':
        ('inherited', 'table-no-data-row-on-push', 'packed-consumer/harness/table-no-data-row-on-push-rendering', 14),
}
# The original three-entry map above remains historical traceability. Current
# complete members/cases are checked against the six production contracts.
ARTIFACT_REQUIRED_SHA_IDS = frozenset(ARTIFACT_REQUIRED_SUBJECTS) | frozenset({
    '86ebb9bfd55e637be1e6d0117a10e290c5247ebd',
    '86a96c9290e3896485c6b6c0d039873652f543df',
    '68b267dd59f3addf92a3b9f8ce9e8baa479df7f4',
})
LATER_METHOD_PROOFS = {
    '737c7a8f1a5bc4df0e790d3ecdd227f8342499f8':
        ('complete-public-predicate-and-exact-owned-handler-replay',
         'compatibility/rc/screen-reader-event-source-diagnostic.json',
         'complete_native_component_or_upstream_test_suite_executed'),
    'e43c059ac313fca732443c6c73cf397f0cf446f3':
        ('complete-reviewed-helper-hunk-and-tagged-owned-method-replay',
         'compatibility/rc/aria-reference-source-diagnostic.json',
         'full_native_lifecycle_or_assistive_technology_executed'),
}
REOPENED_INHERITED_REPORTS = {
    'ca9c490ee30dbf7c9c147079197d0dbc0abcd611':
        'compatibility/f10/disposition-ledger/evidence/closeout-table-onpush-packed-pending.json',
    '938f478efdc96ef0de1217e806f98939beb027cd':
        'compatibility/f10/disposition-ledger/evidence/closeout-remaining-identity-generator-review.json',
}


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
    def assert_pending_roster(self, entries):
        # This name is retained for existing callers. All former pending source
        # judgments now require their registered runtime contracts; no source
        # label or prior observation admits them without the real current run.
        assert_runtime_roster(self, ROOT, entries)

    def test_intact_ledger_covers_every_seed_sha(self) -> None:
        self.assert_pending_roster(json.loads(LEDGER.read_text())['entries'])
        with tempfile.TemporaryDirectory() as tmp:
            report = Path(tmp) / "report.json"
            result = run_checker(SEED, LEDGER, report)
            combined = result.stdout + result.stderr
            self.assertNotEqual(result.returncode, 0, combined)
            summary = json.loads(result.stdout)
            self.assertFalse(summary["ok"])
            self.assertEqual(summary["unresolved"], 0)
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
            self.assertEqual(summary["missing_evidence"], 0)
            self.assertEqual(summary["circular_evidence"], 0)
            self.assertGreater(summary["symbol_uses_open"], 0)
            report_body = json.loads(report.read_text())
            self.assertEqual(report_body["result"], "fail")
            self.assertEqual(report_body["structural_inventory"], "pass")
            self.assertEqual(report_body["disposition_admission"], "incomplete")
            self.assertEqual(report_body["g11_claim"], "not-passed")
            self.assertEqual(report_body["security_clearance"], "not-passed")

    def test_reopened_source_findings_remain_pending_and_preserve_old_proofs(self):
        entries={e['sha']:e for e in json.loads(LEDGER.read_text())['entries']}
        for sha in ['77ffdf98ba71c11d908b29e02b516dddf487ae0b','5dd614aa100e28f0815fdd83e5b68f4239ef01f9','86ad5150110522873dae2801fd3c2957502949e7']:
            entry=entries[sha]
            assert_native_review(self, ROOT, entry)
            prior, evidence, _ = prior_source_entry(ROOT, entry,
                lambda old, body, review: old['final_disposition']=='needs-individual-review' and 'individual_proof' not in old)
            self.assertEqual(evidence['sha'],sha)
            self.assertIn('individual_proof',evidence['prior_entry'])
            self.assertEqual(evidence['g11_claim'],'not-passed')

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
        assert_runtime_roster(self, ROOT, ledger['entries'])
        entry = json.loads(json.dumps(next(row for row in ledger['entries'] if row['sha']=='231f94f5557bb58afc0070585688b3014d541eb2')))
        entry.pop('individual_proof')
        entry['peer_floor']={'sha_is_ancestor_of_tag':True,'delegation':'@angular/cdk/layout imported'}
        with tempfile.TemporaryDirectory() as tmp:
            directory=Path(tmp); seed=directory/'seed.json'; candidate=directory/'ledger.json'
            seed.write_text(json.dumps({'commits':[{'sha':entry['sha']}]}))
            candidate.write_text(json.dumps({'entries':[entry],'g11_claim':'not-passed'}))
            result=run_checker(seed,candidate,directory/'report.json',admission=True,line='main')
            summary=json.loads(result.stdout)
            self.assertNotEqual(result.returncode,0,result.stderr)
            self.assertEqual(summary['structural_inventory'],'pass')
            self.assertEqual(summary['disposition_admission'],'incomplete')
            self.assertEqual(summary['insufficient_inherited'],1)
            self.assertEqual(summary['insufficient_sensitive'],1)
            self.assertEqual(summary['unresolved'],0)
            self.assertEqual(summary['security_clearance'],'not-passed')
            self.assertEqual(summary['g11_claim'],'not-passed')


    def test_media_matcher_main_proof_cannot_admit_21_or_missing_evidence(self) -> None:
        sha = "231f94f5557bb58afc0070585688b3014d541eb2"
        entry = next(row for row in json.loads(LEDGER.read_text())["entries"] if row["sha"] == sha)
        self.assertEqual(entry["final_disposition"], "inherited")
        self.assertEqual(entry["individual_proof"]["affected_branches"], ["main"])
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            seed = directory / "seed.json"
            seed.write_text(json.dumps({"commits": [{"sha": sha}]}))
            symbols = directory / "symbols.json"
            symbols.write_text(json.dumps({"status": "closed", "symbol_uses": [{**row, "disposition": "closed", "status": "reviewed"} for row in json.loads((ROOT / "compatibility/f10/authored-dependency-inventory-seed.json").read_text())["symbol_uses"]]}))
            for label, line, remove_proof, expected in [("main-without-coordinator", "main", False, 1), ("wrong-line", "21.x", False, 1), ("missing-proof", "main", True, 1)]:
                candidate = json.loads(json.dumps(entry))
                if remove_proof:
                    candidate.pop("individual_proof")
                ledger = directory / (label + ".json")
                ledger.write_text(json.dumps({"g11_claim": "not-passed", "entries": [candidate]}))
                result = run_checker(seed, ledger, directory / (label + "-report.json"), admission=True, line=line, symbols=symbols)
                summary = json.loads(result.stdout)
                self.assertEqual(summary["insufficient_inherited"], expected, label)
                self.assertEqual(summary["insufficient_sensitive"], expected, label)
                if expected:
                    self.assertNotEqual(result.returncode, 0, label)

    def test_individual_proof_is_accepted_and_ancestry_is_not(self) -> None:
        sha = "1f13d60126bcde7af29438bae38a4da91a30e352"
        evidence = "compatibility/f10/disposition-ledger/evidence/closeout-six-accessibility-guides-source-review.json"
        reviewed = next(row for row in json.loads((ROOT / evidence).read_text())["reviews"] if row["sha"] == sha)
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            seed = directory / "seed.json"
            seed.write_text(json.dumps({"commits": [{"sha": sha}]}))
            symbols = directory / "symbols.json"
            symbols.write_text(json.dumps({
                "status": "closed",
                "symbol_uses": [{**row, "disposition": "closed", "status": "reviewed"} for row in json.loads((ROOT / "compatibility/f10/authored-dependency-inventory-seed.json").read_text())["symbol_uses"]],
            }))
            common = {
                "sha": sha,
                "bucket": "behavior-semantic",
                "subject": "fix(cdk/a11y): sample",
                "files": reviewed["files"],
                "evidence_report": evidence,
                "reason": "synthetic row",
                "batch_id": "synthetic",
                "g11_claim": "not-passed",
            }
            proof = {key: reviewed[key] for key in ("diff_sha256", "review_depth", "affected_branches", "decision")}
            admitted = directory / "admitted.json"
            admitted.write_text(json.dumps({
                "g11_claim": "not-passed",
                "entries": [{**common, "final_disposition": "not-applicable", "individual_proof": proof}],
            }))
            admitted_result = run_checker(
                seed, admitted, directory / "admitted-report.json",
                admission=True, line="main", symbols=symbols,
            )
            admitted_summary = json.loads(admitted_result.stdout)
            self.assertNotEqual(admitted_result.returncode, 0, admitted_result.stderr)
            self.assertEqual(admitted_summary["disposition_admission"], "incomplete")
            self.assertEqual(admitted_summary["authored_use_review_evidence"]["insufficient"], 1736)
            self.assertEqual(admitted_summary["insufficient_sensitive"], 0)
            self.assertEqual(admitted_summary["missing_evidence"], 0)
            self.assertEqual(admitted_summary["security_clearance"], "not-passed")
            self.assertEqual(admitted_summary["g11_claim"], "not-passed")
            self.assertEqual(admitted_summary["insufficient_inherited"], 0)

            complete_symbols = json.loads(symbols.read_text())
            for label, uses in [('empty', []), ('missing', complete_symbols['symbol_uses'][1:]), ('duplicate', complete_symbols['symbol_uses'] + [complete_symbols['symbol_uses'][0]])]:
                broken_symbols = directory / (label + '-symbols.json')
                broken_symbols.write_text(json.dumps({'status':'closed','symbol_uses':uses}))
                broken = run_checker(seed, admitted, directory / (label + '-roster-report.json'), admission=True, line='main', symbols=broken_symbols)
                summary = json.loads(broken.stdout)
                self.assertNotEqual(broken.returncode, 0, label)
                self.assertFalse(summary['authored_use_inventory']['complete'], label)
                self.assertEqual(summary['disposition_admission'], 'incomplete', label)

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


    def test_evidence_must_speak_about_the_row(self) -> None:
        ledger = json.loads(LEDGER.read_text())
        entries = ledger["entries"]
        mechanical = [e for e in entries if (e.get("evidence_report") or "").startswith("compatibility/f10/disposition-ledger/evidence/mechanical/")]
        batch = json.loads((ROOT / "compatibility/rc/reports/needs-triage-one-diff.json").read_text())
        listed = {item["sha"] for item in batch["reviews"]}
        with tempfile.TemporaryDirectory() as tmp:
            directory = Path(tmp)
            for label, change in (
                ("other-sha-record", lambda e: {**e, "evidence_report": mechanical[1]["evidence_report"]}),
                ("batch-without-sha", lambda e: {**e, "evidence_report": "compatibility/rc/reports/needs-triage-one-diff.json"}),
                ("empty-batch", lambda e: {**e, "evidence_report": "compatibility/rc/reports/test-only-one-diff.json"}),
                ("circular", lambda e: {**e, "evidence_report": "compatibility/rc/reports/upstream-audit-disposition.json"}),
            ):
                with self.subTest(label=label):
                    target = next(e for e in mechanical if e["sha"] not in listed)
                    mutated = json.loads(json.dumps(ledger))
                    mutated["entries"] = [change(target)]
                    path = directory / f"{label}.json"
                    path.write_text(json.dumps(mutated))
                    seed=directory/'seed.json';seed.write_text(json.dumps({'commits':[{'sha':target['sha']}]}))
                    summary = json.loads(run_checker(seed, path, directory / f"{label}-report.json").stdout)
                    self.assertEqual(summary["missing_evidence"] + summary["circular_evidence"], 1, label)

    def assert_table_transform_superseding_review(self, entry):
        import hashlib
        self.assertEqual(entry['sha'], 'dd04fe910c4587f11cd37b1d0b216e4a56cac2e3')
        self.assertEqual(entry['final_disposition'], 'already-adapted')
        report = json.loads((ROOT / entry['evidence_report']).read_text())
        self.assertEqual(report['sha'], entry['sha'])
        self.assertEqual(report['decision'], entry['reason'])
        self.assertEqual(set(report['affected_branches']), {'main','21.x'})
        self.assertEqual(report['diff_sha256'], 'f8afee9dc0580e3103aaf8ee84161f026523be24b21bbbd22be6bc82dab87460')
        self.assertEqual(hashlib.sha256((ROOT / report['patch_file']).read_bytes()).hexdigest(), report['diff_sha256'])
        self.assertEqual(set(report['path_reviews']), {'src/cdk/table/cell.ts','src/cdk/table/table.ts','tools/public_api_guard/cdk/table.md'})
        self.assertEqual(report['g11_claim'], 'not-passed')
        for line in ['main','21.x']:
            self.assertEqual(report['native_receipts'][line]['packed_cases'], 88)
        self.assertEqual(entry['individual_proof']['diff_sha256'], report['diff_sha256'])

    def assert_import_cleanup_history(self, entry, old_report, evidence_path):
        self.assertEqual(entry['batch_id'], 'closeout-complete31-test-import-cleanup-predicate')
        self.assertEqual(entry['prior_entry_preserved_in'], entry['evidence_report'])
        report_path = ROOT / entry['evidence_report']
        report = json.loads(report_path.read_text())
        self.assertEqual(report['role'], 'C04 complete31 test import cleanup predicate and residual reviews')
        self.assertEqual(report['line'], 'main')
        self.assertEqual(len(report['reviews']), 31)
        self.assertEqual({row['sha'] for row in report['reviews']}, set(report['scope_sha_ids']))
        review = next(row for row in report['reviews'] if row['sha'] == entry['sha'])
        prior = review['prior_entry']
        self.assertEqual(prior['sha'], entry['sha'])
        self.assertEqual(prior['evidence_report'], evidence_path)
        self.assertEqual(prior['final_disposition'], old_report['final_disposition'])
        self.assertEqual(review['final_disposition'], entry['final_disposition'])
        self.assertEqual(entry['source_check']['review_membership'], entry['sha'])
        self.assertEqual(entry['source_check']['diff_sha256'], review['diff_sha256'])
        self.assertEqual(entry['source_check']['evidence_report_sha256'], hashlib.sha256(report_path.read_bytes()).hexdigest())
        self.assertEqual(review['source_analysis']['sha'], entry['sha'])
        self.assertEqual(review['source_analysis']['diff_sha256'], review['diff_sha256'])
        self.assertFalse(report['native_browser_packed_or_full_floor_qualified'])
        self.assertEqual(report['g11_claim'], 'not-passed')

    def assert_later_method_review(self, entry):
        kind, diagnostic, whole_runtime_field = LATER_METHOD_PROOFS[entry['sha']]
        self.assertEqual(entry['final_disposition'], 'inherited')
        proof = entry['individual_proof']
        self.assertEqual(proof['proof_kind'], kind)
        self.assertEqual(proof['affected_branches'], ['main'])
        self.assertEqual(proof['reachable_behavior'], {'kind': 'executed-delegation', 'id': diagnostic})
        report = json.loads((ROOT / entry['evidence_report']).read_text())
        self.assertEqual(report['sha'], entry['sha'])
        self.assertEqual(report['prior_entry']['sha'], entry['sha'])
        self.assertEqual(report['prior_entry']['final_disposition'], 'inherited')
        self.assertNotIn('individual_proof', report['prior_entry'])
        self.assertEqual(report['decision'], entry['reason'])
        self.assertEqual(report['installed_member'], proof['installed_member'])
        self.assertEqual(report['diff_sha256'], proof['diff_sha256'])
        self.assertEqual(hashlib.sha256((ROOT / report['patch_file']).read_bytes()).hexdigest(), proof['diff_sha256'])
        self.assertEqual(report['independent_evidence'][0]['path'], diagnostic)
        for member in report['independent_evidence']:
            self.assertEqual(hashlib.sha256((ROOT / member['path']).read_bytes()).hexdigest(), member['sha256'])
        observed = json.loads((ROOT / diagnostic).read_text())
        self.assertEqual(observed['upstream_sha'], entry['sha'])
        self.assertEqual(observed['line'], 'main')
        self.assertEqual(observed['patch_sha256'], proof['diff_sha256'])
        self.assertFalse(report[whole_runtime_field])
        self.assertEqual(report['g11_claim'], 'not-passed')
        self.assertEqual(observed['g11_claim'], 'not-passed')

    def assert_reopened_inherited_history(self, entry, report):
        if entry['sha'] in {row['sha'] for row in native_contracts(ROOT)['rows']} and entry.get('individual_proof'):
            assert_native_review(self, ROOT, entry, report)
            prior, body, _ = prior_source_entry(ROOT, entry,
                lambda old, body, review: old['evidence_report']==REOPENED_INHERITED_REPORTS[entry['sha']])
            self.assert_reopened_inherited_history(prior, body)
            return
        if entry['sha'] == 'ca9c490ee30dbf7c9c147079197d0dbc0abcd611' and (entry.get('individual_proof') or {}).get('proof_kind') == 'artifact-required-individual-behavior':
            self.assertEqual(entry['evidence_report'], 'compatibility/f10/disposition-ledger/evidence/closeout-table-onpush-source-judgment.json')
            self.assertEqual(entry['final_disposition'], 'inherited')
            self.assertEqual(report['status'], 'reviewed')
            self.assertEqual(report['line'], 'main')
            self.assertEqual(report['g11_claim'], 'not-passed')
            self.assertEqual(report['judgment_stage'], 'source-complete-runtime-required')
            self.assertTrue(report['runtime_qualification']['required'])
            self.assertFalse(report['runtime_qualification']['qualified_by_this_document'])
            self.assertFalse(report['semantic_pass'])
            self.assertFalse(report['actual_packed_table_executed'])
            self.assertEqual(report['installed_member'], entry['individual_proof']['installed_member'])
            prior = report['prior_pending_record']
            self.assertEqual(prior['path'], REOPENED_INHERITED_REPORTS[entry['sha']])
            self.assertEqual(hashlib.sha256((ROOT / prior['path']).read_bytes()).hexdigest(), prior['sha256'])
            self.assert_reopened_inherited_history(report['prior_entry'], json.loads((ROOT / prior['path']).read_text()))
            return
        self.assertEqual(entry['evidence_report'], REOPENED_INHERITED_REPORTS[entry['sha']])
        self.assertEqual(entry['final_disposition'], 'needs-individual-review')
        self.assertNotIn('individual_proof', entry)
        self.assertIn(report['status'], {'pending', 'pending-packed-execution'})
        self.assertEqual(report['line'], 'main')
        self.assertEqual(report['g11_claim'], 'not-passed')
        review = next(row for row in report['reviews'] if row['sha'] == entry['sha']) if 'reviews' in report else report
        self.assertEqual(review['sha'], entry['sha'])
        self.assertEqual(review['prior_entry']['sha'], entry['sha'])
        self.assertEqual(review['prior_entry']['final_disposition'], 'inherited')
        self.assertNotIn('individual_proof', review['prior_entry'])
        original = review['original_patch']
        self.assertEqual(hashlib.sha256((ROOT / original['path']).read_bytes()).hexdigest(), original['sha256'])
        if 'reviews' in report:
            self.assertEqual(review['status'], 'pending')
            self.assertEqual(review['final_disposition'], 'needs-individual-review')
            self.assertTrue(review['required_remaining_evidence'])
        else:
            self.assertFalse(report['actual_packed_table_executed'])
            self.assertFalse(report['semantic_pass'])

    def test_mechanical_evidence_and_join_are_per_sha_and_change_no_disposition(self) -> None:
        ledger={e['sha']:e for e in json.loads(LEDGER.read_text())['entries']}
        rows={row['sha']:row for row in json.loads(JOIN.read_text())['rows']}
        self.assertEqual(set(rows),set(ledger))
        files=sorted(MECHANICAL.glob('*.json'));self.assertTrue(files)
        registered={row['sha'] for row in native_contracts(ROOT)['rows']}
        for path in files:
            body=json.loads(path.read_text());entry=ledger[path.stem]
            self.assertEqual(body['sha'],path.stem)
            self.assertFalse(body['final_disposition_changed'])
            self.assertTrue(body['not_individual_proof'])
            self.assertEqual(body['diff_sha256'],rows[path.stem]['diff_sha256'])
            self.assertNotIn('individual_proof',body)
            evidence_path=path.relative_to(ROOT).as_posix()
            prior, _, _ = prior_source_entry(ROOT, entry,
                lambda old, record, review: old['evidence_report']==evidence_path)
            self.assertEqual(prior['final_disposition'],body['final_disposition'])
            if entry['evidence_report']==evidence_path:
                self.assertEqual(body['final_disposition'],entry['final_disposition'])
                continue
            if entry['sha'] in registered:
                assert_native_review(self, ROOT, entry)
                continue
            if entry.get('batch_id')=='closeout-complete31-test-import-cleanup-predicate':
                self.assert_import_cleanup_history(entry,body,evidence_path)
                continue
            if entry['sha']=='dd04fe910c4587f11cd37b1d0b216e4a56cac2e3':
                self.assert_table_transform_superseding_review(entry)
                continue
            record,review=read_review(ROOT,entry)
            self.assertEqual(review.get('final_disposition',entry['final_disposition']),entry['final_disposition'])
            raw=read_original_patch(ROOT,entry['sha'],review)
            self.assertIn(b'diff --git ',raw)
            self.assertEqual(hashlib.sha256(raw).hexdigest(),review['diff_sha256'])

    def test_review_queue_is_finite_disjoint_and_covers_sensitive_rows(self) -> None:
        queue = json.loads(QUEUE.read_text())
        join = json.loads(JOIN.read_text())
        placed = [item["sha"] for item in queue["items"]] + [sha for group in queue["groups"] for sha in group["members"]]
        self.assertEqual(len(placed), len(set(placed)))
        sensitive = {row["sha"] for row in join["rows"] if any(d.startswith("sensitive-") for d in row["defects"])}
        self.assertEqual(sensitive, {item["sha"] for item in queue["items"] if item["priority"] == 1})
        inherited = {row["sha"] for row in join["rows"] if "inherited-without-installed-member-and-executed-delegation" in row["defects"]}
        self.assertTrue(inherited <= set(placed))
        rows = {row["sha"]: row for row in join["rows"]}
        for item in queue["items"]:
            self.assertIn(item["question_kind"], queue["question_kinds"])
            self.assertEqual(item["source_identity"]["diff_sha256"], rows[item["sha"]]["diff_sha256"])
            for key in ("facts", "proposed_conclusion", "decision_requested"):
                self.assertTrue(item[key].strip(), (item["sha"], key))
            self.assertTrue(item["alternatives"])
            self.assertEqual(item["question_kind"] == "contradiction", bool(item["contradictions"]))
        for group in queue["groups"]:
            self.assertEqual(group["member_count"], len(group["members"]))
            self.assertTrue(group["members"])
            for sha in group["members"]:
                # Identical reasoning only holds if every member has the group's mechanical status and modules.
                status = rows[sha]["mechanical_consistency"]
                self.assertEqual(status["status"], group["mechanical_status"], sha)
                self.assertEqual(", ".join(status["delegated_modules"]), group["delegated_modules"], sha)
        self.assertEqual({item["question_kind"] for item in queue["authority"]}, {"authority"})
        closure = queue["symbol_closure"]
        self.assertEqual(sum(closure["counts"].values()), len(join["symbol_uses"]))
        self.assertEqual(set(closure["counts"]) - set(closure["criteria"]), set())
        seed = json.loads((ROOT / "compatibility/f10/authored-dependency-inventory-seed.json").read_text())
        # The plan proposes criteria only; it closes nothing.
        self.assertFalse(any(use.get("disposition") == "closed" for use in seed["symbol_uses"]))
        self.assertTrue((ROOT / "compatibility/f10/audit-join/braces-exception-facts.md").is_file())

    def test_stale_source_proofs_are_retired_without_rehashing_them(self) -> None:
        rows = {e['sha']: e for e in json.loads(LEDGER.read_text())['entries']}
        comment = rows['7a2191906339aab259e59fb8cea05273538f4ebf']
        self.assertEqual(comment['final_disposition'], 'not-applicable')
        self.assertNotIn('individual_proof', comment)
        retired = comment['retired_candidate_proofs'][-1]['proof']
        self.assertEqual(retired['candidate_member']['sha256'], 'bb99348ac1fa6f9916fe435d7b4eba1dd7149a4d205c949d0b62c00b035e7dfd')
        tooltip = rows['68b267dd59f3addf92a3b9f8ce9e8baa479df7f4']
        review = json.loads((ROOT / tooltip['evidence_report']).read_text())
        self.assert_pending_behavior_review(tooltip, review)
        _, review, _ = prior_source_entry(ROOT, tooltip,
            lambda old, body, row: old['final_disposition']=='needs-individual-review' and 'individual_proof' not in old)
        old = review['prior_entry']['individual_proof']
        self.assertEqual(old['candidate_member']['sha256'], '672a9d4219e6c251022a3c2d5a311d4c920d99be128cecaf90513e3ad2a1428e')
        member = review['current_candidate_source']
        self.assertEqual(hashlib.sha256((ROOT / member['path']).read_bytes()).hexdigest(), member['sha256'])
        code = '''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {candidateSourceEvidenceOk,candidateProductSourcePaths} from './scripts/upstream-candidate-source-evidence.mjs';
const proofs=JSON.parse(process.argv[1]);
for(const proof of proofs)assert.equal(candidateSourceEvidenceOk(proof,p=>readFileSync(p),()=>candidateProductSourcePaths(process.cwd())),false);
'''
        result = subprocess.run(['node', '--input-type=module', '-e', code, json.dumps([retired, old])],
                                cwd=ROOT, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def assert_pending_behavior_review(self, entry, report):
        if entry['sha'] in {row['sha'] for row in native_contracts(ROOT)['rows']} and entry.get('individual_proof'):
            assert_native_review(self, ROOT, entry, report)
            prior, body, _ = prior_source_entry(ROOT, entry,
                lambda old, body, review: old['final_disposition']=='needs-individual-review' and 'individual_proof' not in old)
            self.assert_pending_behavior_review(prior, body)
            return
        self.assertEqual(entry['final_disposition'], 'needs-individual-review')
        self.assertNotIn('individual_proof', entry)
        self.assertEqual(report['sha'], entry['sha'])
        self.assertEqual(report['g11_claim'], 'not-passed')
        if entry['sha'] == '10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb':
            patch = report['diff'].encode()
        else:
            patch = (ROOT / report['patch_file']).read_bytes()
        self.assertTrue(patch.startswith(b'diff --git '))
        self.assertEqual(hashlib.sha256(patch).hexdigest(), report['diff_sha256'])

    def test_recorded_candidate_line_proofs_still_match_the_candidate(self) -> None:
        proofs = [e for e in json.loads(LEDGER.read_text())["entries"]
                  if (e.get("individual_proof") or {}).get("proof_kind") in ("candidate-source-line-match", "candidate-source-equivalent")]
        self.assertGreater(len(proofs), 0)
        for entry in proofs:
            proof = entry["individual_proof"]
            self.assertEqual(proof["affected_branches"], ["main"])
            self.assertGreaterEqual(len(proof["decision"]), 40)
            member = ROOT / proof["candidate_member"]["path"]
            self.assertEqual(hashlib.sha256(member.read_bytes()).hexdigest(), proof["candidate_member"]["sha256"], entry["sha"])
            lines = member.read_text().split("\n")
            checks = [(item["upstream_added"], item["candidate_lines"]) for item in proof["added_lines"]]
            checks += [(item["candidate_snippet"], item["candidate_lines"]) for item in proof.get("equivalent_candidate_lines", [])]
            if proof["proof_kind"] == "candidate-source-equivalent":
                self.assertTrue(proof["equivalent_candidate_lines"], entry["sha"])
            self.assertTrue(checks, entry["sha"])
            for needle in proof.get("absent_in_package", {}).get("needles", []):
                for path in (ROOT / "projects/ngx-material-legacy").rglob("*"):
                    if path.is_file() and "node_modules" not in path.parts and path.suffix in {".ts", ".scss", ".html", ".css"}:
                        self.assertNotIn(needle, path.read_text(errors="replace"), (entry["sha"], path))
            for text, numbers in checks:
                self.assertTrue(numbers, (entry["sha"], text))
                for number in numbers:
                    self.assertIn("".join(text.split()), "".join(lines[number - 1].split()), (entry["sha"], number))


    def test_execution_observation_covers_every_inherited_row_and_matches_groups(self) -> None:
        observation = json.loads((ROOT / "compatibility/f10/audit-join/delegated-execution.json").read_text())
        self.assertEqual(observation["line"], "main")
        self.assertEqual(observation["g11_claim"], "not-passed")
        self.assertGreater(observation["environment"]["run"]["executed"], 2000)
        rows = {row["sha"]: row for row in observation["rows"]}
        ledger = json.loads(LEDGER.read_text())["entries"]
        inherited = {e["sha"] for e in ledger if e["final_disposition"] == "inherited" and not e.get("individual_proof")}
        self.assertTrue(inherited.issubset(rows))
        native_ids={row['sha'] for row in native_contracts(ROOT)['rows']}
        for sha in set(rows) - inherited:
            entry = next(row for row in ledger if row["sha"] == sha)
            if sha in native_ids:
                assert_native_review(self, ROOT, entry)
                prior_source_entry(ROOT, entry, lambda old, body, review: old['final_disposition']=='inherited')
                continue
            if sha in LATER_METHOD_PROOFS:
                self.assert_later_method_review(entry)
                continue
            if sha in REOPENED_INHERITED_REPORTS:
                self.assert_reopened_inherited_history(entry, json.loads((ROOT / entry['evidence_report']).read_text()))
                continue
            if entry['sha'] == 'dd04fe910c4587f11cd37b1d0b216e4a56cac2e3':
                self.assertTrue(any(row.get('final_disposition') == 'inherited' for row in entry['superseded_closeout_source_judgments']))
                self.assert_table_transform_superseding_review(entry)
                continue
            if sha == '10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb':
                prior = json.loads((ROOT / 'compatibility/rc/ripple-event-replay-upstream-correction.json').read_text())
                self.assertEqual(prior['sha'], sha)
                self.assertEqual(prior['previous_row']['final_disposition'], 'inherited')
                self.assertTrue(any(row.get('evidence_report') == 'compatibility/rc/ripple-event-replay-upstream-correction.json'
                                    for row in entry.get('prior_dispositions', [])))
            else:
                self.assertTrue(any(row.get("final_disposition") == "inherited"
                                    for row in entry.get("prior_dispositions", [])))
            if sha in {'9494ff2d65c98726046e6a20dd6a6d938e97a2f6',
                       '8c3165582fcc1e307f8ddd261f5977c6f2f8b0fc',
                       '25f391a3c545a1b829a74584c4f9235ab8d18497',
                       '10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb'}:
                self.assert_pending_behavior_review(entry, json.loads((ROOT / entry['evidence_report']).read_text()))
                continue
            self.assertEqual(entry["final_disposition"], "not-applicable")
            report = json.loads((ROOT / entry["evidence_report"]).read_text())
            review = next(row for row in report["reviews"] if row["sha"] == sha)
            if sha == '963a299e9d8c0a783314c81eeaa6b2396aa7044f':
                self.assertEqual(report['role'], 'C04 ten individual production TypeScript documentation reviews')
                self.assertEqual(len(report['reviews']), 10)
                self.assertEqual(hashlib.sha256(review['diff'].encode()).hexdigest(), review['diff_sha256'])
                self.assertEqual(entry['individual_proof']['diff_sha256'], review['diff_sha256'])
                self.assertEqual(entry['individual_proof']['proof_kind'], 'complete-syntax-and-documentation-review')
                self.assertTrue(review['members'])
                for member in review['members']:
                    self.assertGreater(member['tokens'], 0)
                    self.assertRegex(member['program_tokens_sha256'], r'^[0-9a-f]{64}$')
                self.assertEqual(report['g11_claim'], 'not-passed')
                continue
            if sha in {'b777c2df0052232cc304e20c46b0d0572d1f9894', 'ba5cf3d06ebfbb2bf945378cf0f786e68abeab6a'}:
                self.assertEqual(report['role'], 'C04 two individual upstream build-only scope reviews')
                self.assertEqual(report['g11_claim'], 'not-passed')
                self.assertEqual(len(report['reviews']), 2)
                source = report['source_analysis']
                self.assertEqual([len(r['paths']) for r in source['reviews']], [37, 157])
                self.assertEqual([r['hunks'] for r in source['reviews']], [74, 332])
                self.assertEqual(source['starlark']['parsed_member_versions'], 376)
                self.assertEqual(sum(r['count'] for r in source['annotations']), 5)
                self.assertFalse(source['upstream_code_or_tests_executed'])
                self.assertEqual(entry['individual_proof']['proof_kind'], 'complete-upstream-build-only-source-exclusion')
                self.assertEqual(entry['individual_proof']['diff_sha256'], review['diff_sha256'])
                self.assertEqual(hashlib.sha256(review['diff'].encode()).hexdigest(), review['diff_sha256'])
                self.assertEqual(entry['files'], review['paths'])
                self.assertEqual(entry['prior_dispositions'][-1], review['prior_entry'])
                self.assertTrue(report['candidate_context']['library_builder'].startswith('pnpm exec ng-packagr '))
                self.assertEqual(report['candidate_context']['bazel_product_members'], [])
                continue
            self.assertFalse(review["runtime_change_in_patch"])
            self.assertTrue(all(line.startswith(("*", "//", "/**")) for line in review["changed_lines"]))
        statuses = {"all-added-lines-present-and-executed", "some-added-lines-executed", "present-not-executed",
                    "added-lines-not-found-in-installed-source", "delegated-module-not-in-candidate-bundle",
                    "no-script-delegated-source", "no-significant-added-lines"}
        for sha, row in rows.items():
            self.assertIn(row["status"], statuses)
            self.assertLessEqual(row["executed"], row["found_in_installed_source"])
            self.assertLessEqual(row["found_in_installed_source"], row["added_lines"])
            if row["status"] == "all-added-lines-present-and-executed":
                self.assertEqual(row["executed"], row["added_lines"], sha)
                for file in row["files"]:
                    if file["added_lines"]:
                        self.assertRegex(file["installed_member"]["sha256"], r"^[0-9a-f]{64}$")
        queue = json.loads(QUEUE.read_text())
        for group in queue["groups"]:
            for sha in group["members"]:
                self.assertEqual(rows[sha]["status"], group["execution_status"], sha)
        # This mechanical observation cannot create individual proofs for its
        # member rows. Separate fresh reviews outside this roster can execute
        # behavior probes and record their own immutable source/artifact scope.
        required = [e for e in ledger if e['sha'] in rows and e['sha'] in ARTIFACT_REQUIRED_SHA_IDS
                    and (e.get('individual_proof') or {}).get('reachable_behavior')]
        self.assertEqual({e['sha'] for e in required}, {'ca9c490ee30dbf7c9c147079197d0dbc0abcd611'})
        for entry in required:
            self.assert_reopened_inherited_history(entry, json.loads((ROOT / entry['evidence_report']).read_text()))
        independent = [e for e in ledger if e['sha'] in rows and e['sha'] not in ARTIFACT_REQUIRED_SHA_IDS
                       and (e.get('individual_proof') or {}).get('reachable_behavior')]
        self.assertEqual({e['sha'] for e in independent}, {'dd04fe910c4587f11cd37b1d0b216e4a56cac2e3', *LATER_METHOD_PROOFS} | ((native_ids & set(rows)) - ARTIFACT_REQUIRED_SHA_IDS - {'938f478efdc96ef0de1217e806f98939beb027cd','10db3e30f94c8cfd160679da7ba22e4c6c0dd8bb'}))
        for entry in independent:
            if entry['sha'] in native_ids:
                assert_native_review(self, ROOT, entry)
            elif entry['sha'] in LATER_METHOD_PROOFS:
                self.assert_later_method_review(entry)
            else:
                self.assert_table_transform_superseding_review(entry)

    def test_history_guards_reject_missing_pending_and_changed_later_proofs(self):
        entries = json.loads(LEDGER.read_text())['entries']
        self.assert_pending_roster(entries)
        missing = [row for row in entries if row['sha'] != '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e']
        with self.assertRaises(AssertionError):
            self.assert_pending_roster(missing)
        extra = entries + [{'sha': '1' * 40, 'final_disposition': 'needs-individual-review'}]
        with self.assertRaises(AssertionError):
            self.assert_pending_roster(extra)
        changed = json.loads(json.dumps(entries))
        next(row for row in changed if row['sha'] == '688c430fe8df09152ee59eb8a2ca62b5ba2fb81e')['final_disposition'] = 'needs-individual-review'
        with self.assertRaises(AssertionError):
            self.assert_pending_roster(changed)
        for field in ['proof_kind', 'artifact_behavior']:
            changed = json.loads(json.dumps(entries))
            proof = next(row for row in changed if row['sha'] in ARTIFACT_REQUIRED_SHA_IDS)['individual_proof']
            proof.pop(field)
            with self.subTest(runtime_required_field=field), self.assertRaises((AssertionError, KeyError)):
                self.assert_pending_roster(changed)
        for sha in LATER_METHOD_PROOFS:
            entry = next(row for row in entries if row['sha'] == sha)
            self.assert_later_method_review(entry)
            for field, replacement in [('affected_branches', ['21.x']), ('diff_sha256', '0' * 64),
                                       ('proof_kind', 'diff-read'), ('reachable_behavior', {'kind': 'executed-delegation', 'id': 'unrelated'})]:
                mutated = json.loads(json.dumps(entry))
                mutated['individual_proof'][field] = replacement
                with self.subTest(sha=sha, field=field), self.assertRaises(AssertionError):
                    self.assert_later_method_review(mutated)
        entry = next(row for row in entries if row.get('batch_id') == 'closeout-complete31-test-import-cleanup-predicate'
                     and (MECHANICAL / (row['sha'] + '.json')).exists())
        evidence_path = (MECHANICAL / (entry['sha'] + '.json')).relative_to(ROOT).as_posix()
        old_report = json.loads((ROOT / evidence_path).read_text())
        self.assert_import_cleanup_history(entry, old_report, evidence_path)
        for field, replacement in [('evidence_report_sha256', '0' * 64), ('diff_sha256', '0' * 64), ('review_membership', '1' * 40)]:
            mutated = json.loads(json.dumps(entry))
            mutated['source_check'][field] = replacement
            with self.subTest(field=field), self.assertRaises(AssertionError):
                self.assert_import_cleanup_history(mutated, old_report, evidence_path)
        with self.assertRaises(AssertionError):
            self.assert_import_cleanup_history(entry, old_report, 'compatibility/rc/unrelated.json')
        for sha in REOPENED_INHERITED_REPORTS:
            entry = next(row for row in entries if row['sha'] == sha)
            report = json.loads((ROOT / entry['evidence_report']).read_text())
            self.assert_reopened_inherited_history(entry, report)
            status = 'tampered-review-stage'
            for field, replacement in [('status', status), ('line', '21.x'), ('g11_claim', 'passed')]:
                mutated = json.loads(json.dumps(report))
                mutated[field] = replacement
                with self.subTest(sha=sha, field=field), self.assertRaises(AssertionError):
                    self.assert_reopened_inherited_history(entry, mutated)


if __name__ == "__main__":
    unittest.main()
