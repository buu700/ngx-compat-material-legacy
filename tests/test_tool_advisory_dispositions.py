"""Finite tool reviews cannot clear other sources, revisions or unreviewed IDs.

Exact pinned archives are reused from the census cache or authenticated once
on a cold host. No tool/dependency code is executed and no advisory query is
performed by these fixtures.
"""
from pathlib import Path
import copy
import hashlib
import importlib.util
import json
import shutil
import tempfile
import tomllib
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("tool_dispositions", ROOT / "scripts/check-dependency-eligibility.py")
eligibility = importlib.util.module_from_spec(spec)
spec.loader.exec_module(eligibility)


class ToolAdvisoryDispositionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.archives = eligibility.tool_review_archives(json.loads((ROOT / "compatibility/toolchain-advisory-subjects.json").read_text()))

    def lookup(self):
        result = json.loads((ROOT / "compatibility/rc/tool-advisory-lookup-diagnostic.json").read_text())
        result["cutoff"] = eligibility.datetime.now(eligibility.timezone.utc).isoformat()
        return result  # Replayed fixture, not this process's network lookup.

    def classify(self, lookup=None, root=ROOT):
        with patch.object(eligibility, "tool_review_archives", return_value=self.archives):
            return eligibility.classify_tool_findings(root, lookup or self.lookup())

    def copy_root(self, directory):
        root = Path(directory)
        for name in ["compatibility/toolchain-advisory-subjects.json", "compatibility/rc/tool-advisory-dispositions.json",
                     "compatibility/rc/tool-advisory-details-diagnostic.json", "toolchain-lock.json", "SECURITY.md"]:
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        for name in ["compatibility/rc/tool-advisory-triage", "reference/toolchain/pnpm-12.4.2"]:
            shutil.copytree(ROOT / name, root / name, dirs_exist_ok=True)
        return root

    def reseal(self, root, changed_evidence=None):
        path = root / "compatibility/rc/tool-advisory-triage/source-proof.json"
        proof = json.loads(path.read_text())
        if changed_evidence:
            ref = next(row for row in proof["evidence_files"] if row["path"] == changed_evidence)
            raw = (root / changed_evidence).read_bytes()
            ref.update(sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw))
        path.write_text(json.dumps(proof, indent=2) + "\n")
        review_path = root / "compatibility/rc/tool-advisory-dispositions.json"
        review = json.loads(review_path.read_text())
        review["source_proof"]["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        review_path.write_text(json.dumps(review, indent=2) + "\n")

    def test_actual_static_scope_retains_every_raw_id_and_seven_open_claims(self):
        lookup = self.lookup()
        before = copy.deepcopy(lookup)
        result = self.classify(lookup)
        self.assertEqual(result["errors"], [])
        self.assertEqual(len(result["classified"]), 31)
        self.assertEqual(len(result["not_applicable"]), 24)
        self.assertEqual(result["unresolved"], ["npm/brace-expansion@5.0.7", "npm/http-cache-semantics@4.2.0", "npm/postcss-selector-parser@7.1.4"])
        self.assertEqual(sum(row["classification"] == "unresolved" for row in result["classified"]), 7)
        self.assertEqual(lookup, before)
        aliases = [row["advisory_id"] for row in result["classified"] if row["subject_id"] == "crates.io/quinn-proto@0.11.14"]
        self.assertEqual(aliases, ["GHSA-4w2j-m93h-cj5j", "RUSTSEC-2026-0185"])

    def test_changed_missing_duplicate_or_new_advisories_do_not_inherit_a_review(self):
        for fault in ["changed-revision", "missing-revision", "new-id", "duplicate-id", "invalid-id", "stale-query"]:
            lookup = self.lookup()
            row = next(row for row in lookup["rows"] if row["id"] == "npm/ip-address@10.2.0")
            if fault == "changed-revision": row["vulns"][0]["modified"] = "2026-10-12T00:00:00Z"
            if fault == "missing-revision": row["vulns"][0].pop("modified")
            if fault == "new-id": row["vulns"].append({"id": "UNREVIEWED-TOOL-FINDING", "modified": row["vulns"][0]["modified"]})
            if fault == "duplicate-id": row["vulns"].append(copy.deepcopy(row["vulns"][0]))
            if fault == "invalid-id": row["vulns"][0]["id"] = None
            if fault == "stale-query": lookup["cutoff"] = "2020-01-01T00:00:00Z"
            result = self.classify(lookup)
            self.assertIn(row["id"], result["unresolved"], fault)
            self.assertFalse(any(item["advisory_id"] == "UNREVIEWED-TOOL-FINDING" for item in result["not_applicable"]), fault)

    def test_missing_wrong_rule_duplicate_broadened_or_relabelled_records_fail(self):
        for fault in ["missing", "wrong-rule", "duplicate", "broadened-subject", "relabelled-open", "empty-reason", "wrong-item", "unreviewed-revision", "broadened-scope"]:
            with tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                path = root / "compatibility/rc/tool-advisory-dispositions.json"
                review = json.loads(path.read_text())
                if fault == "missing": review["records"].pop()
                if fault == "wrong-rule": review["records"][0]["rule_id"] = "ip-socks-only"
                if fault == "duplicate": review["records"].append(copy.deepcopy(review["records"][0]))
                if fault == "broadened-subject": review["records"][0]["subject_id"] = "npm/anyhow@1.0.102"
                if fault == "relabelled-open": review["records"][0].update(subject_id="npm/brace-expansion@5.0.7", advisory_id="GHSA-6j4f-fj2g-mc7p")
                if fault == "empty-reason": review["records"][0]["reason"] = "pass"
                if fault == "wrong-item": review["records"][0]["triage_item_id"] = "triage-031"
                if fault == "unreviewed-revision": review["records"][0]["advisory_modified"] = "2026-10-12T00:00:00Z"
                if fault == "broadened-scope": review["records"][0]["scope"] = "All consumers of this dependency are safe."
                path.write_text(json.dumps(review))
                result = self.classify(root=root)
                self.assertTrue(result["errors"], fault)
                self.assertEqual(result["not_applicable"], [], fault)

    def test_source_policy_pin_and_reference_mutations_invalidate_reviews(self):
        for name in ["SECURITY.md", "toolchain-lock.json", "compatibility/toolchain-advisory-subjects.json",
                     "reference/toolchain/pnpm-12.4.2/triage-source/pnpm/crates/cli/Cargo.toml",
                     "reference/toolchain/pnpm-12.4.2/triage-crates/pgp-0.20.0/src/crypto/rsa.rs",
                     "compatibility/rc/tool-advisory-details-diagnostic.json"]:
            with tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                path = root / name
                path.write_bytes(path.read_bytes() + b"\nchanged\n")
                result = self.classify(root=root)
                self.assertTrue(result["errors"], name)
                self.assertEqual(result["not_applicable"], [], name)

    def test_resealed_fake_excerpt_and_recomputed_false_graph_are_rejected(self):
        for fault in ["excerpt", "graph"]:
            with tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                name = "compatibility/rc/tool-advisory-triage/" + ("static-source-excerpts.json" if fault == "excerpt" else "cli-graph-proof.json")
                path = root / name
                data = json.loads(path.read_text())
                if fault == "excerpt": data["members"][0]["excerpts"][0]["text"] = "fabricated safe caller"
                else:
                    data["cli_closure"].pop()
                    data["cli_closure_count"] -= 1
                path.write_text(json.dumps(data))
                self.reseal(root, name)
                result = self.classify(root=root)
                self.assertTrue(result["errors"], fault)
                self.assertEqual(result["not_applicable"], [], fault)

    def test_symlink_and_foreign_proof_paths_are_rejected(self):
        for fault in ["symlink", "traversal"]:
            with tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                path = root / "compatibility/rc/tool-advisory-dispositions.json"
                if fault == "symlink":
                    path.unlink()
                    path.symlink_to(ROOT / "compatibility/rc/tool-advisory-dispositions.json")
                else:
                    review = json.loads(path.read_text())
                    review["source_proof"]["path"] = "compatibility/rc/tool-advisory-triage/../tool-advisory-dispositions.json"
                    path.write_text(json.dumps(review))
                self.assertTrue(self.classify(root=root)["errors"], fault)

    def test_real_declared_graph_changes_when_server_dev_edge_becomes_normal(self):
        source = ROOT / "reference/toolchain/pnpm-12.4.2/triage-source"
        manifests = {}
        for path in source.rglob("Cargo.toml"):
            data = tomllib.loads(path.read_text())
            if "package" in data: manifests[data["package"]["name"]] = data
        workspace = tomllib.loads((source / "Cargo.toml").read_text())["workspace"]["dependencies"]
        packages = tomllib.loads((ROOT / "reference/toolchain/pnpm-12.4.2/Cargo.lock").read_text())["package"]
        original = eligibility.declared_pnpm_cli_graph(packages, manifests, workspace)
        self.assertEqual(len(original["closure"]), 667)
        excluded = {("event-listener", "5.4.1"), ("h2", "0.3.27"), ("libsql-sqlite3-parser", "0.13.0")}
        self.assertFalse(original["closure"] & excluded)
        manifests["pnpm-cli"]["dependencies"]["pnpr"] = {"workspace": True}
        changed = eligibility.declared_pnpm_cli_graph(packages, manifests, workspace)
        self.assertEqual(changed["closure"] & excluded, excluded)

    def producer(self, *, overlap=False, disagreement=False):
        tool = self.lookup()
        now = eligibility.datetime.now(eligibility.timezone.utc)
        aged = now - eligibility.timedelta(days=30)
        by_key = {row["id"].removeprefix("npm/"): row["vulns"] for row in tool["rows"] if row["id"].startswith("npm/")}
        def osv(packages):
            results = [{"vulns": copy.deepcopy(by_key.get(f"{name}@{version}", []))} for name, version in packages]
            if disagreement:
                results[packages.index(("ip-address", "10.2.0"))] = {"vulns": [{"id": "UNREVIEWED-TOOL-FINDING"}]}
            return 200, results, ""
        packages = eligibility.lock_packages((ROOT / "pnpm-lock.yaml").read_text())
        if overlap: packages.append(("ip-address", "10.2.0"))
        with patch.object(eligibility, "tool_advisory_subjects", return_value=tool["inventory"]), \
             patch.object(eligibility, "query_tool_advisories", return_value=tool), \
             patch.object(eligibility, "tool_review_archives", return_value=self.archives), \
             patch.object(eligibility, "lock_packages", return_value=packages), \
             patch.object(eligibility, "_osv_batch", side_effect=osv), \
             patch.object(eligibility, "_npm_publish_time", return_value=(aged, "")), \
             patch.object(eligibility, "_node_publish_time", return_value=(aged, "")), \
             patch.object(eligibility, "assess_age_exceptions", return_value={"active": {}, "expired": [], "problems": []}), \
             patch.object(eligibility, "refresh_exception_patch_status"), \
             patch.object(eligibility, "_remediation_notes", return_value=[]):
            return eligibility.perform_lookup(ROOT, now)

    def test_existing_producer_admits_only_tool_scope_and_keeps_open_findings_failed(self):
        live = self.producer()
        self.assertEqual(live["tool_advisories"]["unresolved"], self.lookup()["unresolved"])
        self.assertEqual(len(live["tool_finding_dispositions"]["not_applicable"]), 24)
        self.assertNotIn("ip-address@10.2.0", live["unresolved"])
        self.assertEqual(live["unresolved"], ["tool:npm/brace-expansion@5.0.7", "tool:npm/http-cache-semantics@4.2.0", "tool:npm/postcss-selector-parser@7.1.4"])
        cases = eligibility.evaluate(ROOT, eligibility.datetime.now(eligibility.timezone.utc), lookup_performed=True, lookup=live)["cases"]
        self.assertEqual(next(row["result"] for row in cases if row["case_id"].endswith("/unresolved-findings-block")), "fail")

    def test_workspace_overlap_and_disagreeing_queries_cannot_use_tool_disposition(self):
        self.assertIn("ip-address@10.2.0", self.producer(overlap=True)["unresolved"])
        self.assertIn("tool-only advisory queries disagree: ip-address@10.2.0", self.producer(disagreement=True)["unresolved"])

    def test_complete_reviewed_fixture_can_close_without_hiding_raw_hits(self):
        lookup = self.lookup()
        open_subjects = {"npm/brace-expansion@5.0.7", "npm/http-cache-semantics@4.2.0", "npm/postcss-selector-parser@7.1.4"}
        for row in lookup["rows"]:
            if row["id"] in open_subjects: row["vulns"] = []
        lookup["unresolved"] = [row["id"] for row in lookup["rows"] if row["vulns"]]
        result = self.classify(lookup)
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["unresolved"], [])
        self.assertEqual(len(result["not_applicable"]), 24)
        self.assertEqual(sum(len(row["vulns"]) for row in lookup["rows"]), 24)


if __name__ == "__main__":
    unittest.main()
