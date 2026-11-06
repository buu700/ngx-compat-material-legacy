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
        profile_path = eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH
        profile = json.loads((ROOT / profile_path).read_text())
        for name in (profile_path, profile["review"]["path"]):
            target = root / name
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / name, target)
        version = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())["version"]
        line = "21.x" if version.startswith("21.") else "main"
        current = profile["lines"][line]
        for row in current["source_files"] + current["support_files"] + current["input_files"]:
            target = root / row["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / row["path"], target)
        brace = json.loads((ROOT / "compatibility/rc/tool-advisory-triage/brace-profile-validation/manifest.json").read_text())
        for row in brace["lines"][line]["source_inputs"]:
            target = root / row["path"]
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(ROOT / row["path"], target)
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

    def test_actual_reviewed_scope_retains_every_raw_id_and_distinct_brace_claim(self):
        lookup = self.lookup()
        before = copy.deepcopy(lookup)
        result = self.classify(lookup)
        self.assertEqual(result["errors"], [])
        self.assertEqual(len(result["classified"]), 31)
        self.assertEqual(len(result["not_applicable"]), 31)
        self.assertEqual(result["unresolved"], [])
        self.assertEqual(sum(row["classification"] == "unresolved" for row in result["classified"]), 0)
        private = [row for row in result["classified"] if row["private_profile_evidence"]]
        self.assertEqual(len(private), 7)
        self.assertTrue(all(row["private_profile_evidence"]["source_files"] in {340, 362} for row in private))
        profile_path = eligibility.NPM_CURRENT_PRIVATE_PROFILE_PATH
        raw = (ROOT / profile_path).read_bytes()
        profile = json.loads(raw)
        version = json.loads((ROOT / "projects/ngx-material-legacy/package.json").read_text())["version"]
        current = profile["lines"]["21.x" if version.startswith("21.") else "main"]
        for row in private:
            binding = row["private_profile_evidence"]
            self.assertEqual(binding["current_source_parent"], current["source_parent"])
            self.assertEqual(binding["current_profile"], {
                "path": profile_path, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)})
            for source, field in [("source_files", "current_source_files"),
                                  ("support_files", "current_support_files"), ("input_files", "current_input_files")]:
                self.assertEqual(binding[field], len(current[source]))
        self.assertTrue(all(row["private_profile_evidence"]["current_scope"] ==
                            "maintained-tool-owned-npm-invocations" for row in private))
        brace = [row for row in private if row["rule_id"] == "npm-private-brace-inputs"]
        self.assertEqual(len(brace), 5)
        self.assertEqual({row["advisory_id"] for row in brace}, eligibility.TOOL_FINDING_SCOPES["npm/brace-expansion@5.0.7"][1])
        self.assertTrue(all(row["private_profile_evidence"]["brace_validation"]["validation_candidates"] == 5 for row in brace))
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

    def producer(self, *, overlap=False, disagreement=False, overlap_subject=None):
        tool = self.lookup()
        now = eligibility.datetime.now(eligibility.timezone.utc)
        aged = now - eligibility.timedelta(days=30)
        by_key = {row["id"].removeprefix("npm/"): row["vulns"] for row in tool["rows"] if row["id"].startswith("npm/")}
        def osv(packages, capture=None):
            results = [{"vulns": copy.deepcopy(by_key.get(f"{name}@{version}", []))} for name, version in packages]
            if disagreement:
                results[packages.index(("ip-address", "10.2.0"))] = {"vulns": [{"id": "UNREVIEWED-TOOL-FINDING"}]}
            return 200, results, ""
        packages = eligibility.lock_packages((ROOT / "pnpm-lock.yaml").read_text())
        if overlap: packages.append(("ip-address", "10.2.0"))
        if overlap_subject: packages.append(overlap_subject)
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

    def test_existing_producer_admits_complete_private_scope_without_hiding_raw_hits(self):
        live = self.producer()
        self.assertEqual(live["tool_advisories"]["unresolved"], self.lookup()["unresolved"])
        self.assertEqual(len(live["tool_finding_dispositions"]["not_applicable"]), 31)
        self.assertNotIn("ip-address@10.2.0", live["unresolved"])
        self.assertEqual(live["unresolved"], [])
        cases = eligibility.evaluate(ROOT, eligibility.datetime.now(eligibility.timezone.utc), lookup_performed=True, lookup=live)["cases"]
        self.assertEqual(next(row["result"] for row in cases if row["case_id"].endswith("/unresolved-findings-block")), "pass")

    def test_workspace_overlap_and_disagreeing_queries_cannot_use_tool_disposition(self):
        self.assertIn("ip-address@10.2.0", self.producer(overlap=True)["unresolved"])
        self.assertIn("tool-only advisory queries disagree: ip-address@10.2.0", self.producer(disagreement=True)["unresolved"])

    def test_private_profile_guard_caller_population_and_configuration_changes_fail(self):
        for fault in ["guard", "unwrapped", "new-js-caller", "new-python-caller", "new-workflow", "config", "missing", "symlink"]:
            with self.subTest(fault=fault), tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                helper = root / "scripts/npm-tooling-options.mjs"
                if fault == "guard":
                    helper.write_text(helper.read_text().replace("npm_config_workspaces: 'false'", "npm_config_workspaces: 'true'"))
                elif fault == "unwrapped":
                    caller = root / "scripts/pack-library.mjs"
                    caller.write_text(caller.read_text().replace("npmToolingOptions(", "unownedOptions("))
                elif fault == "new-js-caller":
                    (root / "scripts/added-npm-query.mjs").write_text("spawnSync('npm', ['query', userInput]);\n")
                elif fault == "new-python-caller":
                    (root / "scripts/added_npm_query.py").write_text("subprocess.run(['npm', 'query', user_input])\n")
                elif fault == "new-workflow":
                    (root / ".github/workflows/added-query.yml").write_text("steps:\n  - run: npm query .external\n")
                elif fault == "config":
                    (root / ".npmrc").write_text("prefer-offline=true\n")
                elif fault == "missing":
                    helper.unlink()
                else:
                    helper.unlink()
                    helper.symlink_to(ROOT / "scripts/npm-tooling-options.mjs")
                result = self.classify(root=root)
                self.assertTrue(result["errors"], fault)
                self.assertEqual(result["not_applicable"], [], fault)

    def test_resealed_private_snapshot_or_triage_cannot_rewrite_reviewed_facts(self):
        for name in ["private-profile-source-manifests.json", "private-profile-remaining-result.json", "private-profile-remaining-evidence.json"]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                path = root / "compatibility/rc/tool-advisory-triage" / name
                body = json.loads(path.read_text())
                if name.endswith("manifests.json"):
                    version = json.loads((root / "projects/ngx-material-legacy/package.json").read_text())["version"]
                    line = "21.x" if version.startswith("21.") else "main"
                    profile = root / "scripts/npm-tooling-options.mjs"
                    profile.write_text(profile.read_text() + "\n// counterfeit reviewed profile\n")
                    raw = profile.read_bytes()
                    ref = next(row for row in body["lines"][line]["source_files"] if row["path"] == "scripts/npm-tooling-options.mjs")
                    ref.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest(),
                               git_blob=hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest())
                elif name.endswith("result.json"):
                    body["findings"][0]["verdict"] = "not_actionable"
                else:
                    body["complete_selector_source_population"] = []
                path.write_text(json.dumps(body, indent=2) + "\n")
                self.reseal(root)
                self.assertTrue(self.classify(root=root)["errors"], name)

    def test_private_profile_reviews_do_not_clear_revised_advisories_or_workspace_use(self):
        for name, version in [("http-cache-semantics", "4.2.0"), ("postcss-selector-parser", "7.1.4"), ("brace-expansion", "5.0.7")]:
            with self.subTest(name=name):
                lookup = self.lookup()
                subject = "npm/" + name + "@" + version
                row = next(row for row in lookup["rows"] if row["id"] == subject)
                row["vulns"][0]["modified"] = "2026-10-12T00:00:00Z"
                result = self.classify(lookup)
                self.assertIn(subject, result["unresolved"])
                self.assertEqual(len(result["not_applicable"]), 30)
                self.assertIn(name + "@" + version, self.producer(overlap_subject=(name, version))["unresolved"])

    def test_complete_reviewed_fixture_can_close_without_hiding_raw_hits(self):
        lookup = self.lookup()
        before = copy.deepcopy(lookup)
        result = self.classify(lookup)
        self.assertEqual(result["errors"], [])
        self.assertEqual(result["unresolved"], [])
        self.assertEqual(len(result["not_applicable"]), 31)
        self.assertEqual(sum(len(row["vulns"]) for row in lookup["rows"]), 31)
        self.assertEqual(lookup, before)

    def test_each_brace_advisory_requires_its_own_current_revision_and_receipt(self):
        for advisory in eligibility.TOOL_FINDING_SCOPES["npm/brace-expansion@5.0.7"][1]:
            with self.subTest(advisory=advisory):
                lookup = self.lookup()
                row = next(row for row in lookup["rows"] if row["id"] == "npm/brace-expansion@5.0.7")
                next(v for v in row["vulns"] if v["id"] == advisory)["modified"] = "2026-10-12T00:00:00Z"
                result = self.classify(lookup)
                self.assertEqual(result["unresolved"], [row["id"]])
                self.assertEqual(len(result["not_applicable"]), 30)
                self.assertEqual([item["advisory_id"] for item in result["classified"] if item["classification"] == "unresolved"], [advisory])

    def test_brace_dependency_input_and_generated_pack_changes_invalidate_reviews(self):
        for name in eligibility.NPM_BRACE_INPUT_PATHS | {"scripts/native-motion-run.mjs"}:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                path = root / name
                if name.endswith("environment-package.json"):
                    data = json.loads(path.read_text())
                    data.setdefault("dependencies", {})["unreviewed"] = "git+https://example.invalid/lower-trust.git"
                    path.write_text(json.dumps(data))
                elif name.endswith("environment-package-lock.json"):
                    data = json.loads(path.read_text())
                    data["packages"]["node_modules/unreviewed"] = {"version": "1.0.0", "resolved": "file:../lower-trust"}
                    path.write_text(json.dumps(data))
                else:
                    path.write_bytes(path.read_bytes() + b"\nchanged private input\n")
                result = self.classify(root=root)
                self.assertTrue(result["errors"], name)
                self.assertEqual(result["not_applicable"], [], name)

    def test_missing_mutated_or_resealed_brace_validation_cannot_clear_findings(self):
        for fault in ["missing-manifest", "missing-receipt", "changed-runtime", "counterfeit-resealed", "wrong-line"]:
            with self.subTest(fault=fault), tempfile.TemporaryDirectory() as directory:
                root = self.copy_root(directory)
                base = root / "compatibility/rc/tool-advisory-triage/brace-profile-validation"
                manifest_path = base / "manifest.json"
                manifest = json.loads(manifest_path.read_text())
                if fault == "missing-manifest":
                    manifest_path.unlink()
                elif fault == "missing-receipt":
                    (base / "triage-014/candidate_ledger.jsonl").unlink()
                elif fault == "changed-runtime":
                    path = base / "npm-brace-validation/validation_artifacts/mechanism-results.json"
                    path.write_bytes(path.read_bytes() + b"\nchanged runtime receipt\n")
                elif fault == "wrong-line":
                    manifest["lines"]["main"] = manifest["lines"]["21.x"]
                    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
                else:
                    name = "triage-011/candidate_ledger.jsonl"
                    path = base / name
                    receipts = [json.loads(row) for row in path.read_text().splitlines()]
                    receipts[-1]["evidence"] = ["counterfeit no runtime failure"]
                    path.write_text("\n".join(json.dumps(row) for row in receipts) + "\n")
                    ref = next(row for row in manifest["files"] if row["path"] == name)
                    raw = path.read_bytes()
                    ref.update(bytes=len(raw), sha256=hashlib.sha256(raw).hexdigest())
                    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n")
                    self.reseal(root)
                result = self.classify(root=root)
                self.assertTrue(result["errors"], fault)
                self.assertEqual(result["not_applicable"], [], fault)


if __name__ == "__main__":
    unittest.main()
