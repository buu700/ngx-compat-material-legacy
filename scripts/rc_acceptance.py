"""Completeness checks for the existing RC run/report format.

This module does not run product tests or authorize publication. The coordinator
supplies the matrix digest and invocation identities captured BEFORE execution.
A self-written passing report is not a trusted execution or reviewer decision.
"""
from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path, PurePosixPath
from typing import Any


# Keep this crosswalk independent of the candidate's enabled/required flags.
# Changing the contract itself requires review, not merely a matrix edit.
# (gates, subject kind, subject IDs, mandatory finite case groups)
CHECK_CONTRACT = {
    "pack-library": (("G01",), "artifact", ("library",), ("fresh-build", "artifact-negatives")),
    "packed-exports": (("G01", "G02"), "artifact", ("library",), ("entrypoints",)),
    "packed-consumer": (("G01", "G02"), "artifact", ("library",), ("aot", "declarations", "harness")),
    "motion-smoke": (("G04",), "source", ("source",), ("host-motion",)),
    "historical-legacy-artifact": (("G09",), "artifact", ("library",), ("original-and-shared-cases", "discovery-negatives")),
    "sass-seal": (("G06", "G08"), "artifact", ("library",), ("sass-api-and-values", "ordered-css-dom", "isolation-negatives")),
    "migration-packaged": (("G04", "G05"), "artifact", ("library", "migrate-cli"), ("old-workspace-cli", "packaged-schematic", "transaction-negatives", "frontend-parity")),
    "browser-matrix": (("G10",), "artifact", ("library",), ("release-engine-runtime-state-matrix",)),
    "api-completeness": (("G02",), "artifact", ("library",), ("export-contract", "typescript-signatures", "runtime-di-identity")),
    "engine-free-consumer": (("G04",), "artifact", ("library",), ("engine-absence", "strict-consumer", "testing-entrypoints")),
    "upstream-audit-disposition": (("G03", "G08", "G11"), "source", ("source",), ("upstream-shas", "authored-symbols", "installed-peer-fixes", "current-advisories")),
    "source-policy": (("G03",), "source", ("source",), ("authored-boundary", "packed-boundary")),
    "companion-bridge-tokens": (("G07",), "source", ("source",), ("compiled-override-tokens",)),
    "companion-computed-styles": (("G07",), "artifact", ("library",), ("thirteen-companion-dimensions", "independent-peer-oracle")),
    "m3-coexistence": (("G07",), "artifact", ("library",), ("inclusion-order", "nested-lazy-overlay", "shared-style-boundary")),
    "native-motion": (("G04", "G10"), "artifact", ("library",), ("enabled-disabled-reduced", "interruption-destruction", "exactly-once-notification")),
    "csp-ssr": (("G04", "G10"), "artifact", ("library",), ("nonce-and-negative", "dom-free-server-and-leaks")),
    "consumer-floors": (("G12",), "artifact", ("library", "migrate-cli"), ("public-engines-peers", "cli-runtime", "line-isolation")),
    "dependency-eligibility": (("G08", "G11", "G13"), "source", ("source",), ("locks-tools-maturity", "vendor-provenance-license")),
    "release-metadata": (("G01", "G13"), "artifact", ("library", "migrate-cli"), ("package-metadata-license", "instructions-provenance")),
}
GATES = {f"G{i:02d}" for i in range(1, 14)}
REQUIRED_REVIEWS = ("independent-release-review", "applicable-exception-authorizations")
_HEX64 = re.compile(r"[0-9a-f]{64}\Z")
_HEX40 = re.compile(r"[0-9a-f]{40}\Z")
_INVOCATION = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,191}\Z")


class EvidenceError(ValueError):
    """Missing, contradictory or untrusted acceptance evidence."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise EvidenceError(message)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_digest(value: Any) -> str:
    return hashlib.sha256(json.dumps(value, sort_keys=True, separators=(",", ":"), allow_nan=False).encode()).hexdigest()


def _pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    obj: dict[str, Any] = {}
    for key, value in pairs:
        require(key not in obj, f"duplicate JSON key: {key}")
        obj[key] = value
    return obj


def parse_json(data: bytes, label: Any) -> dict[str, Any]:
    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=_pairs,
                           parse_constant=lambda text: require(False, f"non-finite JSON number: {text}"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise EvidenceError(f"cannot read JSON {label}: {error}") from error
    require(isinstance(value, dict), f"{label}: expected a JSON object")
    return value


def read_json(path: Path) -> dict[str, Any]:
    try:
        return parse_json(path.read_bytes(), path)
    except OSError as error:
        raise EvidenceError(f"cannot read JSON {path}: {error}") from error


class EvidenceSnapshot:
    """Hash the same bytes that are parsed and retain every consulted identity.

    The sealer revalidates this inventory after evaluation. This is a mutation
    detector under exclusive trusted run ownership, not a filesystem snapshot
    against a hostile process continuously replacing files.
    """
    def __init__(self, root: Path, run_dir: Path):
        self.roots = {"repository": root, "run": run_dir}
        self.files: dict[tuple[str, str], dict[str, Any]] = {}
        self.roles: dict[tuple[str, str], str] = {}

    def capture(self, scope: str, relative: str, role: str, expected=None) -> tuple[Path, bytes]:
        path = contained_file(self.roots[scope], relative)
        data = path.read_bytes()
        record = {"root": scope, "path": relative, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data)}
        if expected is not None:
            require(isinstance(expected, dict) and type(expected.get("bytes")) is int and expected["bytes"] > 0,
                    f"{role}: invalid byte length")
            require(record["bytes"] == expected["bytes"] and record["sha256"] == expected.get("sha256"),
                    f"{role}: bytes/hash mismatch")
        key = (scope, relative)
        if key in self.files:
            require(self.files[key] == record, f"{role}: file changed during evaluation: {relative}")
            require(self.roles[key] == role, f"{role}: one file has conflicting evidence roles: {relative}")
        self.files[key], self.roles[key] = record, role
        return path, data

    def checked(self, scope: str, record: Any, role: str) -> Path:
        require(isinstance(record, dict), f"{role}: missing file identity")
        return self.capture(scope, record.get("path"), role, record)[0]

    def json(self, scope: str, relative: str, role: str, expected=None) -> dict[str, Any]:
        _, data = self.capture(scope, relative, role, expected)
        return parse_json(data, relative)

    def revalidate(self) -> None:
        for (scope, relative), record in self.files.items():
            checked_file(self.roots[scope], record, f"evidence changed during evaluation: {relative}")

    def inventory(self) -> list[dict[str, Any]]:
        return [self.files[key] for key in sorted(self.files)]


def assertion_directory(check_id: str, invocation_id: str) -> str:
    require(check_id in CHECK_CONTRACT, "unknown assertion owner")
    require(isinstance(invocation_id, str) and bool(_INVOCATION.fullmatch(invocation_id)), "invalid invocation identity")
    return f"evidence/{check_id}/{invocation_id}"


def prepack_binding_for(run_id: str, inputs: dict[str, Any], environment: dict[str, Any],
                        oracles: dict[str, Any], matrix_sha256: str) -> dict[str, Any]:
    """Input identity assigned before packing; deliberately has no output digest."""
    require(isinstance(run_id, str) and bool(run_id.strip()), "missing prepack run ID")
    require(isinstance(matrix_sha256, str) and bool(_HEX64.fullmatch(matrix_sha256)), "invalid prepack matrix identity")
    require(isinstance(inputs, dict) and inputs.get("line") in ("main", "21.x"), "invalid prepack source line")
    for key in ("commit", "tree"):
        require(isinstance(inputs.get(key), str) and bool(_HEX40.fullmatch(inputs[key])), f"invalid prepack {key}")
    require(isinstance(inputs.get("inputs_sha256"), str) and bool(_HEX64.fullmatch(inputs["inputs_sha256"])), "invalid prepack source digest")
    require(type(inputs.get("clean")) is bool, "invalid prepack clean state")
    require(isinstance(environment, dict) and bool(environment) and isinstance(oracles, dict) and bool(oracles), "missing prepack environment/oracles")
    return {"phase": "prepack", "run_id": run_id, "source_commit": inputs["commit"],
            "source_tree": inputs["tree"], "source_line": inputs["line"],
            "inputs_sha256": inputs["inputs_sha256"], "input_clean": inputs["clean"],
            "environment_sha256": json_digest(environment), "oracles_sha256": json_digest(oracles),
            "matrix_sha256": matrix_sha256}


def strings(value: Any, label: str, *, nonempty: bool = True) -> list[str]:
    require(isinstance(value, list), f"{label}: expected a list")
    require(not nonempty or bool(value), f"{label}: empty set")
    require(all(isinstance(v, str) and v.strip() == v and bool(v) for v in value), f"{label}: invalid identifier")
    require(len(value) == len(set(value)), f"{label}: duplicate identifier")
    return value


def contained_file(root: Path, value: Any) -> Path:
    require(isinstance(value, str) and bool(value) and "\\" not in value, "invalid relative evidence path")
    rel = PurePosixPath(value)
    require(not rel.is_absolute() and all(p not in ("..", ".", "") for p in value.split("/")), f"unsafe evidence path: {value}")
    base = root.resolve()
    cursor = base
    for component in rel.parts:
        cursor = cursor / component
        require(not cursor.is_symlink(), f"symlink in evidence path: {value}")
    require(cursor.is_file(), f"missing evidence file: {value}")
    require(cursor.resolve().is_relative_to(base), f"evidence path leaves its root: {value}")
    return cursor


def checked_file(root: Path, record: Any, label: str) -> Path:
    require(isinstance(record, dict), f"{label}: missing file identity")
    path = contained_file(root, record.get("path"))
    require(isinstance(record.get("sha256"), str) and bool(_HEX64.fullmatch(record["sha256"])), f"{label}: invalid SHA-256")
    require(type(record.get("bytes")) is int and record["bytes"] > 0, f"{label}: invalid byte length")
    require(path.stat().st_size == record["bytes"] and sha256_file(path) == record["sha256"], f"{label}: bytes/hash mismatch")
    return path


def validate_matrix(matrix: dict[str, Any]) -> dict[str, dict[str, Any]]:
    require(type(matrix.get("schema_version")) is int and matrix["schema_version"] == 1 and matrix.get("id") == "full-verify", "not the full-verify matrix")
    rows = matrix.get("checks")
    require(isinstance(rows, list) and bool(rows), "full-verify matrix has no checks")
    by_id: dict[str, dict[str, Any]] = {}
    covered: set[str] = set()
    for row in rows:
        require(isinstance(row, dict), "invalid matrix row")
        cid = row.get("check_id")
        require(isinstance(cid, str) and cid in CHECK_CONTRACT, f"unknown required check: {cid}")
        require(cid not in by_id, f"duplicate check: {cid}")
        require(row.get("required") is True and type(row.get("implemented")) is bool, f"{cid}: required/implemented must be booleans, required must stay true")
        spec = row.get("acceptance")
        require(isinstance(spec, dict), f"{cid}: acceptance contract missing")
        gates, kind, subjects, groups = CHECK_CONTRACT[cid]
        require(set(strings(spec.get("gates"), f"{cid}.gates")) == set(gates), f"{cid}: gate routing changed")
        require(spec.get("subject_kind") == kind and strings(spec.get("subject_ids"), f"{cid}.subject_ids") == list(subjects), f"{cid}: subject contract changed")
        cases = spec.get("cases_by_line")
        require(isinstance(cases, dict) and set(cases) == {"main", "21.x"}, f"{cid}: both source-line case sets required")
        for line, case_groups in cases.items():
            require(isinstance(case_groups, dict) and set(case_groups) == set(groups), f"{cid}/{line}: missing or unknown case group")
            seen: set[str] = set()
            for group, ids in case_groups.items():
                if ids is None:
                    continue  # A documented unresolved roster is valid config, not acceptance.
                listed = strings(ids, f"{cid}/{line}/{group}")
                require(not seen.intersection(listed), f"{cid}/{line}: case occurs in multiple groups")
                seen.update(listed)
        covered.update(gates)
        by_id[cid] = row
    require(set(by_id) == set(CHECK_CONTRACT), f"matrix omitted mandatory checks: {sorted(set(CHECK_CONTRACT) - set(by_id))}")
    require(covered == GATES, "matrix does not route every G01-G13 automatic prerequisite")
    require(matrix.get("required_reviews") == list(REQUIRED_REVIEWS), "manual review requirements must remain explicit")
    return by_id


def expected_cases(row: dict[str, Any], line: str) -> list[str]:
    result: list[str] = []
    for group, ids in row["acceptance"]["cases_by_line"][line].items():
        require(ids is not None, f"{row['check_id']}/{line}: unresolved case roster {group}")
        result.extend(strings(ids, f"{row['check_id']}/{group}"))
    return result


def binding_for(run: dict[str, Any], matrix_sha256: str) -> dict[str, Any]:
    """The coordinator freezes this before any checks run; children copy it."""
    source = run.get("source")
    require(isinstance(source, dict), "missing source identity")
    for key in ("commit", "git_tree_sha"):
        require(isinstance(source.get(key), str) and bool(_HEX40.fullmatch(source[key])), f"invalid source {key}")
    require(isinstance(source.get("content_sha256"), str) and bool(_HEX64.fullmatch(source["content_sha256"])), "invalid source content identity")
    require(source.get("line") in ("main", "21.x"), "invalid source line")
    for key in ("environment", "oracles"):
        require(isinstance(run.get(key), dict) and bool(run[key]), f"missing {key} identity")
    environment = run['environment']
    for key in ('lock_sha256', 'install_policy_sha256'):
        require(isinstance(environment.get(key), str) and bool(_HEX64.fullmatch(environment[key])), f'invalid environment {key}')
    require(isinstance(environment.get('chainman_revision'), str) and bool(_HEX40.fullmatch(environment['chainman_revision'])), 'missing pinned Chainman identity')
    versions = environment.get('tool_versions')
    require(isinstance(versions, dict) and all(isinstance(versions.get(k), str) and versions[k].strip() for k in ('node', 'npm', 'pnpm')), 'missing tool versions')
    for key in ('historical', 'current_peer'):
        require(isinstance(run['oracles'].get(key), list) and bool(run['oracles'][key]), f'missing oracle set {key}')
    inputs = run.get('execution_inputs')
    require(isinstance(inputs, dict) and inputs.get('commit') == source['commit'] and inputs.get('tree') == source['git_tree_sha'], 'missing checker/source input snapshot')
    require(inputs.get('line') == source['line'] and type(inputs.get('clean')) is bool and type(source.get('clean')) is bool, 'invalid source-line/clean input binding')
    require(isinstance(inputs.get('inputs_sha256'), str) and bool(_HEX64.fullmatch(inputs['inputs_sha256'])), 'invalid checker/source input digest')
    artifacts = run.get('artifacts')
    require(isinstance(artifacts, list) and bool(artifacts), 'missing frozen artifact identities')
    return {
        'run_id': run.get('run_id'),
        'pack_execution_sha256': json_digest(run.get('pack_execution')),
        'pack_metadata_sha256': json_digest(run.get('pack_metadata')),
        'artifacts_sha256': json_digest(artifacts),
        'inputs_sha256': inputs['inputs_sha256'],
        'input_clean': inputs['clean'],
        'source_clean': source['clean'],
        'source_line': source['line'],
        "source_commit": source["commit"],
        "source_tree": source["git_tree_sha"],
        "source_content_sha256": source["content_sha256"],
        "environment_sha256": json_digest(run["environment"]),
        "oracles_sha256": json_digest(run["oracles"]),
        "matrix_sha256": matrix_sha256,
    }


def evaluate_run(
    root: Path,
    run_path: Path,
    *,
    matrix_sha256: str,
    binding: dict[str, Any],
    process_results: dict[str, int],
    invocation_ids: dict[str, str],
) -> dict[str, Any]:
    """Read-only evaluation; process_results/IDs come from the coordinator, not reports.

    Checks mechanics and completeness, not honesty of a compromised test runner
    or human approval. Call only for trusted, reviewed execution. No approvals
    are inferred from reviewer names or arbitrary status strings in JSON.
    """
    errors: dict[str, list[str]] = {}
    passed: list[str] = []
    validated_reports: dict[str, str] = {}
    snapshot = EvidenceSnapshot(root, run_path.parent)
    assertion_paths: list[tuple[str, str]] = []
    run_id = None
    line = None
    try:
        run = snapshot.json("run", run_path.name, "manifest")
        manifest_digest = snapshot.files[("run", run_path.name)]["sha256"]
        run_id = run.get("run_id")
        require(isinstance(run_id, str) and bool(run_id.strip()), "missing run ID")
        require(run.get("template") is False and type(run.get("schema_version")) is int and run["schema_version"] == 1, "not an executed schema_version 1 run")
        require(run.get("stage") == "draft" and run.get("purpose") == "candidate", "full acceptance requires an unsealed candidate run")
        require(run.get("source", {}).get("clean") is True and run.get('execution_inputs', {}).get('clean') is True, "full acceptance requires clean source")
        require(binding_for(run, matrix_sha256) == binding, "run identity changed during execution")
        require(run["environment"].get("mode") == "host-nix", "full acceptance requires the declared host-nix execution mode")
        line = run["source"]["line"]
        matrix_rel = "compatibility/rc/matrices/full-verify.json"
        matrix = snapshot.json("repository", matrix_rel, "matrix")
        require(snapshot.files[("repository", matrix_rel)]["sha256"] == matrix_sha256, "reviewed expected matrix changed during execution")
        require(run.get("expected_matrix") == {"path": "compatibility/rc/matrices/full-verify.json", "sha256": matrix_sha256}, "run is not bound to the full expected matrix")
        checks = validate_matrix(matrix)
        require(isinstance(process_results, dict) and isinstance(invocation_ids, dict), 'invalid coordinator execution record')
        require(set(process_results) <= set(checks) and set(invocation_ids) <= set(checks), "unknown invocation/check result")
        require(all(isinstance(v, str) and bool(_INVOCATION.fullmatch(v)) for v in invocation_ids.values()), 'invalid invocation identity')
        require(len(set(invocation_ids.values())) == len(invocation_ids), "duplicate invocation identity")
        artifacts: dict[str, dict[str, Any]] = {}
        paths: set[str] = set()
        require(isinstance(run.get("artifacts"), list), "missing artifacts")
        for artifact in run["artifacts"]:
            require(isinstance(artifact, dict) and artifact.get("id") in ("library", "migrate-cli"), "unknown artifact")
            aid = artifact["id"]
            require(aid not in artifacts, f"duplicate artifact ID: {aid}")
            path = snapshot.checked("run", artifact, "artifact")
            require(str(path) not in paths, "different artifact subjects share one path")
            paths.add(str(path))
            artifacts[aid] = {"sha256": artifact["sha256"], "bytes": artifact["bytes"]}
        require("library" in artifacts, "missing library artifact")
        metadata_identity = run.get("pack_metadata")
        require(isinstance(metadata_identity, dict), "missing pack metadata identity")
        metadata = snapshot.json("run", metadata_identity.get("path"), "pack-metadata", metadata_identity)
        library_record = next(item for item in run['artifacts'] if item['id'] == 'library')
        require(metadata.get('tarball') == library_record['path'], "pack metadata names a different library artifact")
        pack_identity = run.get("pack_execution")
        require(isinstance(pack_identity, dict), "missing prepack execution identity")
        pack = snapshot.json("run", pack_identity.get("path"), "pack-execution", pack_identity)
        expected_prepack = prepack_binding_for(run_id, run["execution_inputs"], run["environment"], run["oracles"], matrix_sha256)
        require(type(pack.get("schema_version")) is int and pack["schema_version"] == 1 and pack.get("check_id") == "pack-library" and pack.get("run_id") == run_id,
                "invalid pack execution record")
        require(pack.get("binding") == expected_prepack and pack.get("invocation_id") == invocation_ids.get("pack-library"),
                "pack execution does not match prepack input/invocation identity")
        require(pack.get("status") == "completed" and type(pack.get("exit_code")) is int
                and pack["exit_code"] == 0 and pack["exit_code"] == process_results.get("pack-library"),
                "pack child failed or was not completed")
        require(isinstance(pack.get("command"), list) and bool(pack["command"]) and isinstance(pack.get("started_at"), str)
                and isinstance(pack.get("finished_at"), str), "missing pack invocation chronology/command")
        execution_identity = run.get("execution_record")
        require(isinstance(execution_identity, dict), "missing coordinator execution record")
        execution = snapshot.json("run", execution_identity.get("path"), "execution-record", execution_identity)
        require(type(execution.get("schema_version")) is int and execution["schema_version"] == 1 and execution.get("run_id") == run_id
                and execution.get("binding") == binding and execution.get("process_results") == process_results
                and execution.get("invocation_ids") == invocation_ids,
                "coordinator execution record disagrees with captured execution")
    except (EvidenceError, TypeError, KeyError, AttributeError, OSError) as error:
        errors["run"] = [str(error)]
        return _summary(run_id, line, passed, errors)

    for cid, row in checks.items():
        try:
            require(row["implemented"] is True, f"{cid}: runner not implemented")
            expected = expected_cases(row, line)
            actual_exit = process_results.get(cid)
            require(type(actual_exit) is int and actual_exit == 0, f"{cid}: child failed or was not invoked (exit={actual_exit})")
            invocation = invocation_ids.get(cid)
            require(isinstance(invocation, str) and bool(invocation), f"{cid}: missing invocation identity")
            report_rel = f"reports/{cid}.json"
            report = snapshot.json("run", report_rel, "report")
            report_path = run_path.parent / report_rel
            report_digest = snapshot.files[("run", report_rel)]["sha256"]
            require(report.get("schema_version") == 1 and type(report.get("schema_version")) is int and report.get("template") is False, f"{cid}: invalid report schema")
            require(report.get("run_id") == run_id and report.get("check_id") == cid and report.get("line") == line, f"{cid}: wrong run/check/line")
            require(report.get("invocation_id") == invocation and report.get("binding") == binding, f"{cid}: stale or mismatched execution identity")
            if cid == "pack-library":
                require(report.get("evidence_origin") == "coordinator" and report.get("prepack_binding") == expected_prepack,
                        "pack-library: coordinator-owned evidence must preserve the actual prepack binding")
            require(report.get("coverage") == "complete", f"{cid}: passing slice is not full acceptance")
            require(report.get("result") == "pass" and type(report.get("exit_code")) is int and report["exit_code"] == 0, f"{cid}: unsuccessful report")
            spec = row["acceptance"]
            require(report.get("subject_kind") == spec["subject_kind"] and report.get("subject_ids") == spec["subject_ids"], f"{cid}: wrong evidence subject")
            subjects = {aid: artifacts[aid] for aid in spec["subject_ids"] if aid != "source" and aid in artifacts}
            require(all(aid == "source" or aid in subjects for aid in spec["subject_ids"]), f"{cid}: missing required artifact subject")
            require(report.get("artifacts") == subjects, f"{cid}: wrong library/CLI bytes")
            for key in ("expected_case_ids", "discovered_case_ids", "executed_case_ids", "passed_case_ids"):
                got = strings(report.get(key), f"{cid}.{key}")
                missing = sorted(set(expected) - set(got))
                extra = sorted(set(got) - set(expected))
                require(not missing and not extra, f"{cid}.{key}: missing={len(missing)} {missing[:8]}, unexpected={len(extra)} {extra[:8]}")
            for key, expected_count in (("passed", len(expected)), ("failed", 0), ("skipped", 0)):
                require(type(report.get(key)) is int and report[key] == expected_count, f"{cid}: invalid {key} count")
            for key in ("failed_case_ids", "skipped_case_ids", "unresolved_case_ids", "exceptions"):
                require(report.get(key) == [], f"{cid}: {key} must be empty; declarations cannot approve deviations")
            outputs = report.get("outputs")
            require(isinstance(outputs, list) and bool(outputs), f"{cid}: missing assertion outputs")
            output_paths: set[str] = set()
            for output in outputs:
                require(isinstance(output, dict), f"{cid}: invalid assertion output")
                prefix = assertion_directory(cid, invocation) + "/"
                require(isinstance(output.get("path"), str) and output["path"].startswith(prefix),
                        f"{cid}: assertion output must be in its check-owned invocation directory")
                path = snapshot.checked("run", output, "assertion-output")
                require(path.stat().st_nlink == 1, f"{cid}: hard-linked input/report bytes cannot serve as assertion evidence")
                require(path.name not in ("run.json", "execution-record.json", "pack-execution.json", "pack-meta.json", "full-verify.json")
                        and not path.name.endswith((".sha256", ".sha512", ".sha1")), f"{cid}: input/control file is not an assertion output")
                assertion_paths.append((cid, output["path"]))
                require(output["path"] not in output_paths, f"{cid}: duplicate output")
                output_paths.add(output["path"])
            cases = report.get("case_results")
            require(isinstance(cases, list) and len(cases) == len(expected), f"{cid}: missing per-case assertion results")
            case_ids: set[str] = set()
            for case in cases:
                require(isinstance(case, dict), f"{cid}: invalid case result")
                case_id = case.get("case_id")
                require(isinstance(case_id, str) and case_id in expected and case_id not in case_ids, f"{cid}: duplicate/unknown case result")
                require(case.get("result") == "pass" and case.get("kind") == "assertion", f"{cid}/{case_id}: skipped/name-only/probe is not product coverage")
                refs = strings(case.get("output_paths"), f"{cid}/{case_id}.output_paths")
                require(set(refs) <= output_paths, f"{cid}/{case_id}: missing assertion output reference")
                case_ids.add(case_id)
            require(sha256_file(report_path) == report_digest, f"{cid}: report changed during evaluation")
            validated_reports[cid] = report_digest
            passed.append(cid)
        except (EvidenceError, TypeError, KeyError, AttributeError, OSError) as error:
            errors[cid] = [str(error)]
    # A relocated input, hardlink or copied report is still not assertion evidence.
    reserved = [(key, record) for key, record in snapshot.files.items() if snapshot.roles[key] != "assertion-output"]
    for cid, relative in assertion_paths:
        try:
            path = contained_file(run_path.parent, relative)
            record = snapshot.files[("run", relative)]
            for (scope, reserved_rel), reserved_record in reserved:
                other = contained_file(snapshot.roots[scope], reserved_rel)
                require(not path.samefile(other) and (record["sha256"], record["bytes"]) != (reserved_record["sha256"], reserved_record["bytes"]),
                        f"{cid}: input/report bytes cannot serve as assertion evidence: {relative}")
        except (EvidenceError, OSError) as error:
            errors[cid] = [str(error)]
    try:
        snapshot.revalidate()
    except (EvidenceError, OSError) as error:
        errors["run"] = [str(error)]
    passed = [cid for cid in passed if cid not in errors]
    summary = _summary(run_id, line, passed, errors)
    summary["validated_reports"] = validated_reports
    summary["validated_manifest_sha256"] = manifest_digest
    summary["validated_files"] = snapshot.inventory()
    return summary


def _summary(run_id: Any, line: Any, passed: list[str], errors: dict[str, list[str]]) -> dict[str, Any]:
    return {
        "schema_version": 1,
        "role": "automatic RC completeness evaluation",
        "run_id": run_id,
        "line": line,
        "automatic_product_result": "pass" if not errors else "incomplete",
        "complete_checks": passed,
        "incomplete_checks": errors,
        "required_review_state": "pending",
        "required_reviews": list(REQUIRED_REVIEWS),
        "engineering_admission": "not-decided",
        "g_gates_claimed": [],
        "limitations": [
            "Validates trusted execution evidence; does not authenticate a self-written approval.",
            "Both-line release-set review, applicable exception authority and publication remain separate.",
        ],
    }
