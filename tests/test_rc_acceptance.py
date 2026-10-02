"""Synthetic evidence exercises the actual completeness evaluator, not the library.

Passing these tests cannot certify Angular, browser, audit or release behavior.
"""
from __future__ import annotations
import copy
import importlib.util
import json
import os
from unittest.mock import patch
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import rc_acceptance as acceptance


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2) + "\n", encoding="utf-8")


class CompleteFixture:
    def __init__(self, root, line="main"):
        self.root = root
        self.run_dir = root / "artifacts/synthetic"
        self.run_dir.mkdir(parents=True)
        self.run_path = self.run_dir / "run.json"
        self.matrix_path = root / "compatibility/rc/matrices/full-verify.json"
        self.matrix = {"schema_version": 1, "id": "full-verify", "required_reviews": list(acceptance.REQUIRED_REVIEWS), "checks": []}
        for cid, (gates, kind, subjects, groups) in acceptance.CHECK_CONTRACT.items():
            self.matrix["checks"].append({
                "check_id": cid, "required": True, "implemented": True,
                "acceptance": {"gates": list(gates), "subject_kind": kind, "subject_ids": list(subjects),
                    "cases_by_line": {l: {g: [f"{l}/{cid}/{g}/synthetic-assertion"] for g in groups} for l in ("main", "21.x")}},
            })
        write_json(self.matrix_path, self.matrix)
        self.matrix_sha = acceptance.sha256_file(self.matrix_path)
        artifacts = []
        for aid in ("library", "migrate-cli"):
            p = self.run_dir / f"{aid}.tgz"
            p.write_bytes(f"synthetic {aid} bytes, not a package".encode())
            artifacts.append({"id": aid, "path": p.name, "bytes": p.stat().st_size, "sha256": acceptance.sha256_file(p)})
        self.run = {
            "schema_version": 1, "template": False, "stage": "draft", "purpose": "candidate",
            "run_id": "synthetic-evaluator-unit-test", "source": {"line": line, "commit": "a" * 40,
                "git_tree_sha": "b" * 40, "content_sha256": "c" * 64, "clean": True},
            "environment": {"mode": "host-nix", "chainman_revision": "d" * 40, "lock_sha256": "e" * 64,
                "install_policy_sha256": "f" * 64, "tool_versions": {"node": "synthetic", "pnpm": "synthetic", "npm": "synthetic"}},
            "oracles": {"historical": [{"commit": "1" * 40}], "current_peer": [{"id": "synthetic-peer", "version": "1.0.0"}]},
            "artifacts": artifacts, "expected_matrix": {"path": "compatibility/rc/matrices/full-verify.json", "sha256": self.matrix_sha},
        }
        self.run['execution_inputs'] = {'commit': self.run['source']['commit'], 'tree': self.run['source']['git_tree_sha'], 'inputs_sha256': '2' * 64, 'clean': True, 'line': line}
        self.invocations = {cid: f"synthetic-invocation-{cid}" for cid in acceptance.CHECK_CONTRACT}
        self.exits = {cid: 0 for cid in acceptance.CHECK_CONTRACT}
        meta_path = self.run_dir / 'pack-meta.json'
        write_json(meta_path, {'tarball': 'library.tgz', 'synthetic': True})
        self.run['pack_metadata'] = {'path': meta_path.name, 'sha256': acceptance.sha256_file(meta_path), 'bytes': meta_path.stat().st_size}
        self.write_pack_record()
        self.binding = acceptance.binding_for(self.run, self.matrix_sha)
        self.save_execution_record()
        self.reports = {}
        for row in self.matrix["checks"]:
            cid = row["check_id"]
            cases = acceptance.expected_cases(row, line)
            output = self.run_dir / acceptance.assertion_directory(cid, self.invocations[cid]) / "assertions.txt"
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_text("Synthetic passing assertions for evaluator testing only.\n")
            record = {"path": str(output.relative_to(self.run_dir)), "sha256": acceptance.sha256_file(output), "bytes": output.stat().st_size}
            self.reports[cid] = {"schema_version": 1, "template": False, "run_id": self.run["run_id"],
                "check_id": cid, "line": line, "invocation_id": self.invocations[cid], "binding": self.binding,
                "coverage": "complete", "result": "pass", "exit_code": 0,
                "subject_kind": row["acceptance"]["subject_kind"], "subject_ids": row["acceptance"]["subject_ids"],
                "artifacts": {a["id"]: {"bytes": a["bytes"], "sha256": a["sha256"]} for a in artifacts if a["id"] in row["acceptance"]["subject_ids"]},
                "expected_case_ids": cases, "discovered_case_ids": cases, "executed_case_ids": cases,
                "passed_case_ids": cases, "passed": len(cases), "failed": 0, "skipped": 0,
                "failed_case_ids": [], "skipped_case_ids": [], "unresolved_case_ids": [], "exceptions": [],
                "outputs": [record], "case_results": [{"case_id": c, "result": "pass", "kind": "assertion", "output_paths": [record["path"]]} for c in cases]}
            if cid == "pack-library":
                self.reports[cid].update(evidence_origin="coordinator", prepack_binding=self.pack_record['binding'])
            self.save_report(cid)

    def write_pack_record(self):
        self.pack_record = {
            "schema_version": 1, "check_id": "pack-library", "run_id": self.run['run_id'],
            "invocation_id": self.invocations['pack-library'],
            "binding": acceptance.prepack_binding_for(self.run['run_id'], self.run['execution_inputs'],
                                                       self.run['environment'], self.run['oracles'], self.matrix_sha),
            "status": "completed", "exit_code": 0,
            "command": ["synthetic-pack"], "started_at": "2026-01-01T00:00:00Z", "finished_at": "2026-01-01T00:00:01Z",
        }
        path = self.run_dir / "pack-execution.json"
        write_json(path, self.pack_record)
        self.run['pack_execution'] = {'path': path.name, 'sha256': acceptance.sha256_file(path), 'bytes': path.stat().st_size}

    def save_execution_record(self):
        path = self.run_dir / "execution-record.json"
        write_json(path, {'schema_version': 1, 'run_id': self.run['run_id'], 'binding': self.binding,
                          'process_results': self.exits, 'invocation_ids': self.invocations})
        self.run['execution_record'] = {'path': path.name, 'sha256': acceptance.sha256_file(path), 'bytes': path.stat().st_size}
        write_json(self.run_path, self.run)

    def save_report(self, cid):
        write_json(self.run_dir / f"reports/{cid}.json", self.reports[cid])

    def evaluate(self):
        self.save_execution_record()
        return acceptance.evaluate_run(self.root, self.run_path, matrix_sha256=self.matrix_sha,
            binding=self.binding, process_results=self.exits, invocation_ids=self.invocations)


class AcceptanceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="rc-acceptance-test-")
        self.addCleanup(self.temp.cleanup)
        self.f = CompleteFixture(Path(self.temp.name))

    def reject(self, fragment):
        result = self.f.evaluate()
        self.assertEqual(result["automatic_product_result"], "incomplete", result)
        self.assertIn(fragment, json.dumps(result["incomplete_checks"]))

    def test_complete_synthetic_fixture_passes_evaluator_not_admission(self):
        result = self.f.evaluate()
        self.assertEqual(result["automatic_product_result"], "pass", result)
        self.assertEqual(result["required_review_state"], "pending")
        self.assertEqual(result["engineering_admission"], "not-decided")
        self.assertEqual(result["g_gates_claimed"], [])
        self.assertEqual(len(result["complete_checks"]), len(acceptance.CHECK_CONTRACT))

    def test_complete_21x_fixture_uses_its_own_line(self):
        with tempfile.TemporaryDirectory() as td:
            other = CompleteFixture(Path(td), line="21.x")
            result = other.evaluate()
            self.assertEqual(result["automatic_product_result"], "pass", result)
            self.assertEqual(result["line"], "21.x")

    def test_artifact_identity_cannot_be_rebound_after_execution(self):
        self.f.run["artifacts"][0]["source_path"] = "changed-origin"
        write_json(self.f.run_path, self.f.run)
        self.reject("identity changed")

    def test_run_id_is_frozen_before_checks(self):
        self.f.run["run_id"] = "renamed-after-execution"
        write_json(self.f.run_path, self.f.run)
        self.reject("identity changed")

    def test_unqualified_host_run_is_not_canonical_evidence(self):
        self.f.run["environment"]["mode"] = "unqualified-host"
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        write_json(self.f.run_path, self.f.run)
        self.reject("host-nix execution mode")

    def test_all_implemented_flags_are_legal_not_a_perpetual_failure(self):
        acceptance.validate_matrix(self.f.matrix)
        self.assertTrue(all(r["implemented"] for r in self.f.matrix["checks"]))

    def test_passing_slice_cannot_certify_full_browser_api_sass_or_migration(self):
        for cid in ("browser-matrix", "api-completeness", "sass-seal", "migration-packaged"):
            self.f.reports[cid]["coverage"] = "slice"
            self.f.save_report(cid)
        result = self.f.evaluate()
        for cid in ("browser-matrix", "api-completeness", "sass-seal", "migration-packaged"):
            self.assertIn(cid, result["incomplete_checks"])

    def test_56_of_58_browser_ids_are_not_complete(self):
        cid = "browser-matrix"
        row = next(r for r in self.f.matrix["checks"] if r["check_id"] == cid)
        ids = [f"main/browser/case-{n}" for n in range(58)]
        row["acceptance"]["cases_by_line"]["main"]["release-engine-runtime-state-matrix"] = ids
        write_json(self.f.matrix_path, self.f.matrix)
        self.f.matrix_sha = acceptance.sha256_file(self.f.matrix_path)
        self.f.run["expected_matrix"]["sha256"] = self.f.matrix_sha
        write_json(self.f.run_path, self.f.run)
        self.f.write_pack_record()
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        for report_id, report in self.f.reports.items():
            report["binding"] = self.f.binding
            if report_id == 'pack-library':
                report['prepack_binding'] = self.f.pack_record['binding']
            self.f.save_report(report_id)
        self.f.reports[cid].update({"expected_case_ids": ids, "discovered_case_ids": ids,
            "executed_case_ids": ids[:56], "passed_case_ids": ids[:56], "passed": 56})
        self.f.save_report(cid)
        self.reject("missing=2")

    def test_unresolved_expected_roster_is_not_empty_success(self):
        matrix = copy.deepcopy(self.f.matrix)
        matrix["checks"][0]["acceptance"]["cases_by_line"]["main"]["fresh-build"] = None
        acceptance.validate_matrix(matrix)
        with self.assertRaisesRegex(acceptance.EvidenceError, "unresolved case roster"):
            acceptance.expected_cases(matrix["checks"][0], "main")

    def test_matrix_deletion_and_renaming_are_rejected(self):
        for mutate in (lambda m: m["checks"].pop(),
                       lambda m: m["checks"][0].update(check_id="replacement"),
                       lambda m: m["checks"][0].update(required=False),
                       lambda m: m["checks"].append(copy.deepcopy(m["checks"][0]))):
            m = copy.deepcopy(self.f.matrix)
            mutate(m)
            with self.assertRaises(acceptance.EvidenceError):
                acceptance.validate_matrix(m)

    def test_missing_group_line_gate_and_review_requirements_are_rejected(self):
        for mutate in (lambda m: m["checks"][0]["acceptance"]["cases_by_line"]["main"].pop("fresh-build"),
                       lambda m: m["checks"][0]["acceptance"]["cases_by_line"].pop("21.x"),
                       lambda m: m["checks"][0]["acceptance"].update(gates=["G02"]),
                       lambda m: m.update(required_reviews=[])):
            m = copy.deepcopy(self.f.matrix)
            mutate(m)
            with self.assertRaises(acceptance.EvidenceError):
                acceptance.validate_matrix(m)

    def test_candidate_edit_to_expected_cases_is_detected(self):
        self.f.matrix["checks"][0]["acceptance"]["cases_by_line"]["main"]["artifact-negatives"] = ["invented-subset"]
        write_json(self.f.matrix_path, self.f.matrix)
        self.reject("expected matrix changed")

    def test_recomputed_manifest_matrix_hash_does_not_replace_coordinator_identity(self):
        self.f.run["expected_matrix"]["sha256"] = "9" * 64
        write_json(self.f.run_path, self.f.run)
        self.reject("not bound to the full expected matrix")

    def test_failed_child_cannot_be_rescued_by_a_passing_report(self):
        self.f.exits["packed-consumer"] = 7
        self.reject("child failed or was not invoked")

    def test_uninvoked_checker_cannot_be_rescued_by_a_passing_report(self):
        del self.f.exits["packed-consumer"]
        self.reject("was not invoked")

    def test_boolean_zero_is_not_an_exit_code(self):
        self.f.exits["packed-consumer"] = False
        self.reject("child failed or was not invoked")

    def test_missing_report_does_not_reuse_previous_filename(self):
        path = self.f.run_dir / "reports/packed-consumer.json"
        path.rename(path.with_name("packed-consumer.previous.json"))
        self.reject("missing evidence file")

    def test_wrong_run_and_line_fail(self):
        self.f.reports["packed-consumer"]["run_id"] = "old"
        self.f.reports["browser-matrix"]["line"] = "21.x"
        self.f.save_report("packed-consumer")
        self.f.save_report("browser-matrix")
        self.reject("wrong run/check/line")

    def test_stale_invocation_fails_even_with_same_run_id(self):
        self.f.reports["packed-consumer"]["invocation_id"] = "old-invocation"
        self.f.save_report("packed-consumer")
        self.reject("stale or mismatched")

    def test_source_environment_oracle_binding_drift_fails(self):
        self.f.run["environment"]["lock_sha256"] = "0" * 64
        write_json(self.f.run_path, self.f.run)
        self.reject("run identity changed")

    def test_dirty_source_is_not_full_acceptance(self):
        self.f.run["source"]["clean"] = False
        write_json(self.f.run_path, self.f.run)
        self.reject("clean source")

    def test_wrong_report_binding_fails(self):
        report = self.f.reports["api-completeness"]
        report["binding"] = {**report["binding"], "source_commit": "0" * 40}
        self.f.save_report("api-completeness")
        self.reject("execution identity")

    def test_library_tamper_fails(self):
        (self.f.run_dir / "library.tgz").write_bytes(b"tampered")
        self.reject("bytes/hash mismatch")

    def test_cli_wrong_subject_and_substituted_identity_fail(self):
        report = self.f.reports["migration-packaged"]
        report["subject_ids"] = ["library"]
        self.f.save_report("migration-packaged")
        self.reject("wrong evidence subject")
        report["subject_ids"] = ["library", "migrate-cli"]
        report["artifacts"]["migrate-cli"] = report["artifacts"]["library"]
        self.f.save_report("migration-packaged")
        self.reject("wrong library/CLI bytes")

    def test_missing_cli_remains_a_blocker(self):
        self.f.run["artifacts"].pop()
        write_json(self.f.run_path, self.f.run)
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        for cid, report in self.f.reports.items():
            report['binding'] = self.f.binding
            self.f.save_report(cid)
        self.reject("missing required artifact subject")

    def test_duplicate_artifact_id_fails(self):
        self.f.run["artifacts"].append(copy.deepcopy(self.f.run["artifacts"][0]))
        write_json(self.f.run_path, self.f.run)
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        for cid, report in self.f.reports.items():
            report['binding'] = self.f.binding
            self.f.save_report(cid)
        self.reject("duplicate artifact ID")

    def test_artifact_path_traversal_fails(self):
        self.f.run["artifacts"][0]["path"] = "../library.tgz"
        write_json(self.f.run_path, self.f.run)
        self.f.binding = acceptance.binding_for(self.f.run, self.f.matrix_sha)
        for cid, report in self.f.reports.items():
            report['binding'] = self.f.binding
            self.f.save_report(cid)
        self.reject("unsafe evidence path")

    def test_report_symlink_is_rejected(self):
        path = self.f.run_dir / "reports/packed-consumer.json"
        outside = self.f.root / "passing.json"
        path.rename(outside)
        path.symlink_to(outside)
        self.reject("symlink in evidence path")

    def test_tampered_or_missing_output_fails(self):
        (self.f.run_dir / self.f.reports["packed-consumer"]["outputs"][0]["path"]).write_text("wrong output")
        self.reject("bytes/hash mismatch")

    def test_no_output_or_case_assertion_fails(self):
        self.f.reports["packed-consumer"]["outputs"] = []
        self.f.reports["api-completeness"]["case_results"] = []
        self.f.save_report("packed-consumer")
        self.f.save_report("api-completeness")
        self.reject("missing assertion outputs")

    def test_duplicate_discovery_is_not_coverage(self):
        r = self.f.reports["packed-consumer"]
        r["discovered_case_ids"] = r["discovered_case_ids"] + [r["discovered_case_ids"][0]]
        self.f.save_report("packed-consumer")
        self.reject("duplicate identifier")

    def test_probe_or_name_only_shape_cannot_count_as_product_assertion(self):
        for kind in ("runner-control", "name-only", "skipped"):
            self.f.reports["api-completeness"]["case_results"][0]["kind"] = kind
            self.f.save_report("api-completeness")
            self.reject("not product coverage")

    def test_failed_skipped_unresolved_or_agent_approved_exception_fails(self):
        for key, value in (("failed_case_ids", ["one"]), ("skipped_case_ids", ["one"]),
                           ("unresolved_case_ids", ["one"]), ("exceptions", [{"approved": True, "reviewer": "owner"}])):
            self.f.reports["packed-consumer"][key] = value
            self.f.save_report("packed-consumer")
            self.reject("must be empty")
            self.f.reports["packed-consumer"][key] = []

    def test_boolean_count_is_not_a_passing_integer(self):
        self.f.reports["packed-exports"]["passed"] = True
        self.f.save_report("packed-exports")
        self.reject("invalid passed count")

    def test_duplicate_json_keys_and_nonfinite_values_fail(self):
        path = self.f.run_dir / "reports/packed-consumer.json"
        path.write_text('{"result":"fail","result":"pass"}')
        self.reject("duplicate JSON key")
        path.write_text('{"exit_code":NaN}')
        self.reject("non-finite JSON number")

    def test_arbitrary_process_ids_are_rejected(self):
        self.f.exits["pretend-gate"] = 0
        self.reject("unknown invocation/check")

    def replace_assertion_output(self, relative, *, cid="packed-consumer"):
        path = self.f.run_dir / relative
        record = {"path": relative, "bytes": path.stat().st_size, "sha256": acceptance.sha256_file(path)}
        self.f.reports[cid]["outputs"] = [record]
        for case in self.f.reports[cid]["case_results"]:
            case["output_paths"] = [relative]
        self.f.save_report(cid)

    def test_library_and_cli_are_not_assertion_outputs(self):
        for name in ("library.tgz", "migrate-cli.tgz"):
            with self.subTest(name=name):
                self.replace_assertion_output(name)
                self.reject("check-owned invocation directory")

    def test_manifest_records_and_reports_are_not_assertion_outputs(self):
        for name in ("run.json", "pack-execution.json", "execution-record.json", "reports/browser-matrix.json"):
            with self.subTest(name=name):
                self.replace_assertion_output(name)
                self.reject("check-owned invocation directory")

    def test_other_check_or_old_invocation_cannot_supply_assertion_output(self):
        other = self.f.reports['browser-matrix']['outputs'][0]['path']
        self.replace_assertion_output(other)
        self.reject("check-owned invocation directory")
        old = 'evidence/packed-consumer/old-invocation/assertions.txt'
        path = self.f.run_dir / old
        path.parent.mkdir(parents=True)
        path.write_text('old assertions')
        self.replace_assertion_output(old)
        self.reject("check-owned invocation directory")

    def test_hardlinked_artifact_in_evidence_directory_is_rejected(self):
        relative = self.f.reports['packed-consumer']['outputs'][0]['path']
        path = self.f.run_dir / relative
        path.unlink()
        os.link(self.f.run_dir / 'library.tgz', path)
        self.replace_assertion_output(relative)
        self.reject("input/report bytes cannot serve")

    def test_copied_artifact_or_report_is_not_assertion_evidence(self):
        relative = self.f.reports['packed-consumer']['outputs'][0]['path']
        for source in ('library.tgz', 'reports/browser-matrix.json', 'pack-execution.json', 'pack-meta.json'):
            with self.subTest(source=source):
                (self.f.run_dir / relative).write_bytes((self.f.run_dir / source).read_bytes())
                self.replace_assertion_output(relative)
                self.reject("input/report bytes cannot serve")

    def test_copied_matrix_is_not_assertion_evidence(self):
        relative = self.f.reports['packed-consumer']['outputs'][0]['path']
        (self.f.run_dir / relative).write_bytes(self.f.matrix_path.read_bytes())
        self.replace_assertion_output(relative)
        self.reject("input/report bytes cannot serve")

    def test_symlinked_assertion_output_is_rejected(self):
        relative = self.f.reports['packed-consumer']['outputs'][0]['path']
        path = self.f.run_dir / relative
        outside = self.f.root / 'external-assertions.txt'
        path.rename(outside)
        path.symlink_to(outside)
        self.reject("symlink in evidence path")

    def test_digest_sidecars_are_not_assertion_evidence(self):
        relative = self.f.reports['packed-consumer']['outputs'][0]['path'] + '.sha256'
        (self.f.run_dir / relative).write_text('a separate digest sidecar')
        self.replace_assertion_output(relative)
        self.reject("input/control file")

    def test_invalid_invocation_cannot_escape_check_owned_output_directory(self):
        self.f.invocations['packed-consumer'] = '../another-check'
        self.reject("invalid invocation identity")

    def test_complete_evaluation_inventories_every_consulted_file(self):
        result = self.f.evaluate()
        self.assertEqual(result['automatic_product_result'], 'pass', result)
        records = {(item['root'], item['path']): item for item in result['validated_files']}
        expected = {('run', 'run.json'), ('run', 'execution-record.json'), ('run', 'pack-execution.json'), ('run', 'pack-meta.json'),
                    ('run', 'library.tgz'), ('run', 'migrate-cli.tgz'),
                    ('repository', 'compatibility/rc/matrices/full-verify.json')}
        for cid, report in self.f.reports.items():
            expected.add(('run', f'reports/{cid}.json'))
            expected.update(('run', item['path']) for item in report['outputs'])
        self.assertEqual(set(records), expected)
        self.assertEqual(len(records), len(result['validated_files']))
        for (scope, relative), record in records.items():
            acceptance.checked_file(self.f.run_dir if scope == 'run' else self.f.root, record, 'snapshot')

    def test_output_changed_during_evaluation_is_not_certified(self):
        original = acceptance.EvidenceSnapshot.json
        target = self.f.run_dir / self.f.reports['packed-consumer']['outputs'][0]['path']
        def read_then_change(snapshot, scope, relative, *args, **kwargs):
            result = original(snapshot, scope, relative, *args, **kwargs)
            if relative == 'reports/release-metadata.json':
                target.write_text('late mutation')
            return result
        with patch.object(acceptance.EvidenceSnapshot, 'json', read_then_change):
            self.reject('bytes/hash mismatch')

    def test_pack_report_must_identify_coordinator_owned_evidence(self):
        self.f.reports['pack-library'].pop('evidence_origin')
        self.f.save_report('pack-library')
        self.reject('coordinator-owned evidence')

    def test_pack_report_cannot_claim_different_prepack_inputs(self):
        self.f.reports['pack-library']['prepack_binding'] = {'phase': 'post-hoc'}
        self.f.save_report('pack-library')
        self.reject('preserve the actual prepack binding')

    def test_tampered_pack_execution_record_is_rejected(self):
        (self.f.run_dir / 'pack-execution.json').write_text('{}')
        self.reject('bytes/hash mismatch')


if __name__ == "__main__":
    unittest.main()
