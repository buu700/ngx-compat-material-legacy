"""Completeness checks for the existing RC run/report format.

This module does not run product tests or authorize publication. The coordinator
supplies the matrix digest and invocation identities captured BEFORE execution.
A self-written passing report is not a trusted execution or reviewer decision.
"""
from __future__ import annotations

import hashlib
import json
import re
import subprocess
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
    "sass-seal": (("G06", "G08"), "artifact", ("library",), ("sass-api-and-values", "ordered-css-dom", "isolation-negatives", "owned-rendered")),
    "migration-packaged": (("G04", "G05"), "artifact", ("library", "migrate-cli"), ("old-workspace-cli", "packaged-schematic", "transaction-negatives", "frontend-parity")),
    "browser-matrix": (("G10",), "artifact", ("library",), ("release-engine-runtime-state-matrix",)),
    "api-completeness": (("G02",), "artifact", ("library",), ("export-contract", "typescript-signatures", "runtime-di-identity")),
    "engine-free-consumer": (("G04",), "artifact", ("library",), ("engine-absence", "strict-consumer", "testing-entrypoints")),
    "source-contract-regressions": (("G11",), "source", ("source",), ("current-source-regressions",)),
    "upstream-audit-disposition": (("G03", "G08", "G11"), "source", ("source",), ("upstream-shas", "authored-symbols", "installed-peer-fixes", "current-advisories")),
    "typeahead-execution": (("G11",), "artifact", ("library",), ("focused-typeahead",)),
    "source-policy": (("G03",), "source", ("source",), ("authored-boundary", "packed-boundary")),
    "companion-bridge-tokens": (("G07",), "source", ("source",), ("compiled-override-tokens",)),
    "companion-computed-styles": (("G07",), "artifact", ("library",), ("thirteen-companion-dimensions", "independent-peer-oracle")),
    "m3-coexistence": (("G07",), "artifact", ("library",), ("inclusion-order", "nested-lazy-overlay", "shared-style-boundary")),
    "native-motion": (("G04", "G10"), "artifact", ("library",), ("enabled-disabled-reduced", "interruption-destruction", "exactly-once-notification")),
    "csp-ssr": (("G04", "G10"), "artifact", ("library",), ("nonce-and-negative", "dom-free-server-and-leaks")),
    "consumer-floors": (("G12",), "artifact", ("library", "migrate-cli"), ("public-engines-peers", "cli-runtime", "line-isolation", "library-runtime", "cli-runtime-floors")),
    "dependency-eligibility": (("G08", "G11", "G13"), "source", ("source",), ("locks-tools-maturity", "vendor-provenance-license")),
    "release-metadata": (("G01", "G13"), "artifact", ("library", "migrate-cli"), ("package-metadata-license", "instructions-provenance")),
}
TYPEAHEAD_CASES = ('MatSelectionList without forms > with list option > should be able to jump focus down to an item by typing', 'MatSelectionList without forms > with list option > should not select items while using the typeahead', 'MatMenu > should route typeahead focus through the public menu keydown and skip disabled matches', 'MatMenu > should update menu typeahead targets after dynamic items change', 'MatSelect > core > accessibility > for select > should be able to select options by typing on a closed select', 'MatSelect > core > accessibility > for select > should skip a disabled option after the closed select options change during typeahead', 'MatSelect > core > accessibility > for select > should not open the select when pressing space while typing', 'MatSelect > core > accessibility > for select > should be able to customize the typeahead debounce interval', 'MatSelect > core > accessibility > for select > should cancel the typeahead selection on blur')

SOURCE_REGRESSION_CASES = (
    "source-contract-regressions/checker-source/full-fault-lifetimes",
    "source-contract-regressions/browser-source/full-fault-lifetimes",
)
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


def parse_json_value(data: bytes, label: Any) -> Any:
    try:
        value = json.loads(data.decode("utf-8"), object_pairs_hook=_pairs,
                           parse_constant=lambda text: require(False, f"non-finite JSON number: {text}"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise EvidenceError(f"cannot read JSON {label}: {error}") from error
    return value


def parse_json(data: bytes, label: Any) -> dict[str, Any]:
    value = parse_json_value(data, label)
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


TYPEAHEAD_CHECKER_FILES = frozenset({
    "scripts/revalidate-typeahead.mjs", "scripts/upstream-typeahead-evidence.mjs",
    "scripts/typeahead-run-projection.mjs", "scripts/upstream-packed-run-evidence.mjs",
    "scripts/packed-consumer-evidence.mjs", "scripts/run-typeahead-execution.py",
    "compatibility/rc/matrices/library-exports.json",
})
TYPEAHEAD_SOURCE_PREFIXES = ("projects/ngx-material-legacy/", "testing/legacy-runner/",
    "compatibility/rc/typeahead-fixture/", "compatibility/rc/typeahead-runner/", "node_modules/")


def register_typeahead_files(snapshot: EvidenceSnapshot, records: Any) -> None:
    require(isinstance(records, list) and bool(records), "typeahead: missing validated file inventory")
    seen = set()
    for record in records:
        require(isinstance(record, dict) and set(record) == {"root", "path", "sha256", "bytes"}, "typeahead: invalid inventory record")
        path = record.get("path")
        require(record.get("root") == "repository" and isinstance(path, str) and
                (path in TYPEAHEAD_CHECKER_FILES or path.startswith(TYPEAHEAD_SOURCE_PREFIXES)),
                "typeahead: invalid inventory role/path")
        require(path not in seen, "typeahead: duplicate inventory path")
        seen.add(path)
        key = ("repository", path)
        if key in snapshot.files:
            require(snapshot.files[key] == record, "typeahead: inconsistent existing identity")
            checked_file(snapshot.roots["repository"], record, "typeahead existing identity")
        else:
            snapshot.checked("repository", record, "typeahead-input")
    require(TYPEAHEAD_CHECKER_FILES <= seen, "typeahead: missing loaded checker identity")


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
        if cid == "typeahead-execution":
            require(cases["main"]["focused-typeahead"] == list(TYPEAHEAD_CASES) and cases["21.x"]["focused-typeahead"] is None, f"{cid}: fixed main roster required")
        if cid == "source-contract-regressions":
            for line, case_groups in cases.items():
                require(case_groups["current-source-regressions"] == list(SOURCE_REGRESSION_CASES),
                        f"{cid}/{line}: both exact full source regression cases are mandatory")
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


def validate_typeahead_observation(snapshot, run, binding, invocation, output_paths):
    """Bind the focused report to actual selected results and retained input bytes."""
    prefix = assertion_directory("typeahead-execution", invocation)
    observation_path = prefix + "/observation.json"
    require(observation_path in output_paths, "typeahead: observation is not an output")
    obs = snapshot.json("run", observation_path, "assertion-output")
    library = next(a for a in run["artifacts"] if a["id"] == "library")
    require(obs.get("schema_version") == 1 and obs.get("kind") == "typeahead-execution" and obs.get("sha") == "ff36c80f9c7a14f0e9f36eafc3e1423d34e7c916", "typeahead: wrong observation identity")
    require(obs.get("run_id") == run["run_id"] and obs.get("line") == "main" and obs.get("invocation_id") == invocation and obs.get("binding") == binding, "typeahead: wrong execution binding")
    require(obs.get("library") == {"sha256": library["sha256"], "bytes": library["bytes"]} and obs.get("inputs_unchanged") is True, "typeahead: wrong artifact or changed inputs")
    files = obs.get("files")
    required = {"raw-report.json", "commands.json", "inputs-before.json", "metafile.json", "bundle.js", "bundle-inputs.json", "entry.generated.ts"}
    require(isinstance(files, dict) and set(files) == required, "typeahead: missing or unknown support files")
    for name, identity in files.items():
        path = prefix + "/" + name
        require(path in output_paths and isinstance(identity, dict) and set(identity) == {"sha256", "bytes"}, "typeahead: missing support output")
        snapshot.checked("run", {"path": path, **identity}, "assertion-output")
    raw = snapshot.json("run", prefix + "/raw-report.json", "assertion-output")
    specs = raw.get("specs")
    require(isinstance(specs, list) and all(isinstance(r, dict) and type(r.get("skipped")) is bool for r in specs), "typeahead: invalid spec statuses")
    selected = [r for r in specs if r["skipped"] is False]
    require(raw.get("subject_mode") == "artifact" and raw.get("mode") == "normal" and raw.get("run_id") == run["run_id"] and raw.get("artifact_sha256") == library["sha256"], "typeahead: raw result binding mismatch")
    require(isinstance(raw.get("totals"), dict) and all(type(v) is int for v in raw["totals"].values()) and raw.get("totals") == {"executed": 496, "passed": 9, "failed": 0, "skipped": 487} and obs.get("counts") == raw["totals"] and raw.get("failures") == [] and len(raw.get("specs", [])) == 496, "typeahead: incomplete results")
    require(obs.get("selected_cases") == selected and [r.get("full_name") for r in selected] == list(TYPEAHEAD_CASES) and all(r.get("success") is True for r in selected), "typeahead: selected case results differ")
    require(all(sum(r.get("full_name") == name for r in specs) == 1 for name in TYPEAHEAD_CASES), "typeahead: duplicate case")
    peers = {"fesm2022/_list-key-manager-chunk.mjs": "63042ad0a8264bfedfaac1c03d2b0eee450bcd7890a09792dc83256195e00057", "fesm2022/_typeahead-chunk.mjs": "c26eed04140a44b175020b75b3a16bf73c2913a064ae61c79dc744d5fa3e4622"}
    require(obs.get("peer_version") == "22.1.7" and obs.get("peer_members") == peers and type(obs.get("extracted_files")) is int and obs["extracted_files"] > 0, "typeahead: invalid peer or extraction identity")
    initial = snapshot.json("run", prefix + "/inputs-before.json", "assertion-output")
    require(initial.get("artifact") == library["sha256"] and initial.get("peer") == peers, "typeahead: wrong input snapshot")
    _, log_bytes = snapshot.capture("run", prefix + "/commands.json", "assertion-output")
    log = parse_json_value(log_bytes, prefix + "/commands.json")
    require(isinstance(log, list) and len(log) == 3, "typeahead: incomplete command log")
    commands = ["testing/legacy-runner/build.mjs", "testing/legacy-runner/build.mjs", "node_modules/karma/bin/karma"]
    require(all(isinstance(row, dict) and type(row.get("exit_code")) is int and row["exit_code"] == 0 and isinstance(row.get("command"), list) and len(row["command"]) >= 2 and row["command"][1] == expected for row, expected in zip(log, commands)), "typeahead: failed or unexpected command")
    meta = snapshot.json("run", prefix + "/metafile.json", "assertion-output")
    graph = snapshot.json("run", prefix + "/bundle-inputs.json", "assertion-output")
    require(isinstance(meta.get("inputs"), dict) and isinstance(graph.get("inputs"), list) and graph.get("schema_version") == 1 and graph["inputs"] and all(isinstance(row, dict) for row in graph["inputs"]), "typeahead: invalid bundle graph")
    rows = graph["inputs"]
    require([row.get("key") for row in rows] == list(meta["inputs"]) and any(row.get("origin") == "artifact" for row in rows) and any(row.get("origin") == "generated" and row.get("path") == "entry.generated.ts" for row in rows), "typeahead: incomplete bundle graph")
    require(all(any(row.get("origin") == "dependency" and isinstance(row.get("path"), str) and row["path"].endswith("@angular/cdk/" + path) and row.get("sha256") == digest for row in rows) for path, digest in peers.items()), "typeahead: missing peer inputs")
    return obs


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
    typeahead_files: list[dict[str, Any]] = []
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
            if cid == "typeahead-execution":
                validate_typeahead_observation(snapshot, run, binding, invocation, output_paths)
                # Replay the very same finite validator used by upstream admission,
                # with identities from the coordinator, not from the child report.
                observation = next(item for item in outputs if item["path"] == assertion_directory(cid, invocation) + "/observation.json")
                request = {"line": line, "runId": run_id, "runDir": str(run_path.parent), "binding": binding,
                           "packedConsumerExecution": {"run_id": run_id, "exit_code": process_results.get("packed-consumer"), "invocation_id": invocation_ids.get("packed-consumer")},
                           "typeaheadExecution": {"run_id": run_id, "exit_code": actual_exit, "invocation_id": invocation, "output": observation}}
                completed = subprocess.run(["node", str(root / "scripts/revalidate-typeahead.mjs")], input=json.dumps({"root": str(root), "request": request}), text=True, capture_output=True, cwd=root)
                require(completed.returncode == 0, f"{cid}: shared finite validation failed: {completed.stderr.strip()}")
                outcome = parse_json_value(completed.stdout.encode(), "typeahead shared validator")
                require(outcome.get("ok") is True and outcome.get("invocation_id") == invocation and outcome.get("output") == observation, f"{cid}: shared validator identity mismatch")
                register_typeahead_files(snapshot, outcome.get("validated_files"))
                typeahead_files = outcome["validated_files"]
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
    summary["typeahead_validated_files"] = typeahead_files
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
