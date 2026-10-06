#!/usr/bin/env python3
"""Authored and packed public-upstream boundary producer.

The reviewed case ids are fixed in MAIN_CASES. A regex hit is an observation.
Installed peer annotation comparison runs only when declaration files are
actually present. pnpm's symlinked @angular packages are followed. A missing
node_modules tree stays unknown, not clean.
coverage stays incomplete unless every case passes.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

def _load_scanner():
    path = Path(__file__).resolve().with_name("check-upstream-api-policy.py")
    spec = importlib.util.spec_from_file_location("check_upstream_api_policy", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

_scanner = _load_scanner()
load_policy = _scanner.load_policy
scan = _scanner.scan

ROOT = Path(__file__).resolve().parents[1]
POLICY = ROOT / "research" / "upstream-api-policy.json"

MAIN_CASES = {
    "authored-boundary": [
        "source-policy/authored-boundary/no-animations-module",
        "source-policy/authored-boundary/no-private-namespace-member",
        "source-policy/authored-boundary/no-deep-internal",
        "source-policy/authored-boundary/no-docs-private-symbol",
        "source-policy/authored-boundary/no-deprecated-symbol",
        "source-policy/authored-boundary/inheritance-of-upstream",
        "source-policy/authored-boundary/sass-public-boundary",
        "source-policy/authored-boundary/installed-annotation-comparison",
    ],
    "packed-boundary": [
        "source-policy/packed-boundary/scanned-artifact-digest",
        "source-policy/packed-boundary/js-and-declarations",
        "source-policy/packed-boundary/sass-transitive-closure",
    ],
}

_EXPORT = re.compile(
    r"^\s*export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function|const|let|var)\s+([A-Za-z_$][\w$]*)",
    re.M,
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def declaration_files(directory: Path):
    """Yield real .d.ts files. pnpm package directories are symlinks into .pnpm."""
    if not directory.is_dir():
        return
    fence = directory.resolve()
    for parent in [directory, *directory.parents]:
        if parent.name == "node_modules":
            fence = parent.resolve()
            break
    seen: set[str] = set()
    for dirpath, dirnames, filenames in os.walk(directory, followlinks=True):
        current = Path(dirpath).resolve()
        if current != fence and fence not in current.parents:
            dirnames[:] = []
            continue
        for name in filenames:
            if not name.endswith(".d.ts"):
                continue
            path = Path(dirpath) / name
            if path.is_symlink():
                continue
            key = str(path.resolve())
            if key in seen:
                continue
            seen.add(key)
            yield path


def annotated_names(directory: Path, marker: str) -> tuple[set[str], int]:
    """Read declaration-attached JSDoc, including bundled `declare` declarations.

    A marker on a member must not leak onto the following top-level declaration.
    This is a conservative declaration observation, not a full TS export/member audit.
    """
    names: set[str] = set()
    files = 0
    attached = re.compile(
        r"/\*\*((?:(?!\*/).)*)\*/\s*"
        r"(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?"
        r"(?:class|interface|type|enum|function|const|let|var)\s+([A-Za-z_$][\w$]*)",
        re.S,
    )
    if not directory.is_dir():
        return names, files
    for path in declaration_files(directory):
        files += 1
        for comment, name in attached.findall(path.read_text(errors="replace")):
            if re.search(re.escape(marker) + r"(?![\w-])", comment):
                names.add(name)
    return names, files


def declaration_export(directory: Path, module: str, name: str, cache=None):
    """Resolve the exported declaration, keeping same-name internal types separate.

    Follow finite named and star re-exports in declaration files. An unavailable,
    ambiguous or unsupported export stays unknown rather than becoming clean.
    """
    cache = {} if cache is None else cache
    package = '/'.join(module.split('/')[:2])
    subpath = '.' + module[len(package):]
    def types_target(value):
        if isinstance(value, dict):
            if isinstance(value.get('types'), str):
                return value['types']
            for condition in ('import', 'default'):
                target = types_target(value.get(condition))
                if target:
                    return target
        return None
    try:
        manifest_key = ('manifest', directory)
        if manifest_key not in cache:
            cache[manifest_key] = json.loads((directory / 'package.json').read_text())
        manifest = cache[manifest_key]
        target = types_target(manifest.get('exports', {}).get(subpath))
        if not target and subpath == '.':
            target = manifest.get('types') or manifest.get('typings')
        if not target:
            return None
    except (OSError, ValueError):
        return None
    fence = directory.resolve()
    def relative_file(parent, target):
        path = (parent / target).resolve()
        if fence not in path.parents or not target.startswith('.'):
            return None
        if path.suffix in ('.js', '.mjs'):
            path = path.with_suffix('.d.ts')
        return path if path.is_file() else None
    resolving_key = ('resolving', directory, module, name)
    if cache.get(resolving_key):
        return None
    cache[resolving_key] = True
    entry = relative_file(directory, target)
    named = re.compile(r'\b(export|import)\s+(?:type\s+)?\{([^}]*)\}\s*(?:from\s*[\'\"]([^\'\"]+)[\'\"])?\s*;')
    declaration = re.compile(r'\b(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function|const|let|var)\s+([A-Za-z_$][\w$]*)\b')
    def origin_symbols(parent, origin, symbol, trail):
        if origin.startswith('@angular/'):
            peer = directory.parent / origin.split('/')[1]
            found = declaration_export(peer, origin, symbol, cache)
            return {found} if found else set()
        return resolve(relative_file(parent, origin), symbol, trail)

    def resolve(path, symbol, trail):
        if path is None or (path, symbol) in trail:
            return set()
        trail = trail | {(path, symbol)}
        parsed_key = ('parsed', path)
        if parsed_key not in cache:
            code = _scanner.strip_comments(path.read_text(errors='replace'))
            direct = re.findall(r'\bexport\s+(?:declare\s+)?(?:abstract\s+)?(?:class|interface|type|enum|function|const|let|var)\s+([\w$]+)\b', code)
            stars = re.findall(r'\bexport\s+\*\s+from\s*[\'\"]([^\'\"]+)[\'\"]', code)
            cache[parsed_key] = (named.findall(code), set(declaration.findall(code)), set(direct), stars)
        blocks, declarations, direct, stars = cache[parsed_key]
        imports = {}
        exports = []
        for kind, block, origin in blocks:
            for part in block.split(','):
                pair = re.fullmatch(r'(?:type\s+)?([\w$]+)(?:\s+as\s+([\w$]+))?', part.strip())
                if not pair:
                    continue
                original, alias = pair.groups()
                if kind == 'import':
                    imports[alias or original] = (origin, original)
                elif (alias or original) == symbol:
                    exports.append((origin, original))
        results = set()
        if symbol in direct:
            results.add((path, symbol))
        for origin, original in exports:
            if origin:
                results |= origin_symbols(path.parent, origin, original, trail)
            elif original in imports:
                origin, imported = imports[original]
                results |= origin_symbols(path.parent, origin, imported, trail)
            elif original in declarations:
                results.add((path, original))
        for origin in stars:
            results |= origin_symbols(path.parent, origin, symbol, trail)
        return results
    try:
        resolved = resolve(entry, name, set())
    finally:
        cache.pop(resolving_key, None)
    return next(iter(resolved)) if len(resolved) == 1 else None


def declaration_markers(path: Path, name: str) -> set[str]:
    attached = re.compile(
        r'/\*\*((?:(?!\*/).)*)\*/\s*'
        r'(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?'
        r'(?:class|interface|type|enum|function|const|let|var)\s+' + re.escape(name) + r'\b', re.S)
    return {marker for comment in attached.findall(path.read_text(errors='replace'))
            for marker in ('@docs-private', '@deprecated')
            if re.search(re.escape(marker) + r'(?![\w-])', comment)}


def imported_angular_references(root: Path) -> list[dict]:
    """Qualify authored named/namespace references by their Angular package."""
    named = re.compile(
        r"(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['\"](@angular/[^'\"]+)['\"]",
        re.M | re.S,
    )
    namespace = re.compile(
        r"import\s*\*\s*as\s+(\w+)\s*from\s*['\"](@angular/[^'\"]+)['\"]"
    )
    references = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".ts", ".tsx", ".js", ".mjs", ".d.ts"}:
            continue
        if path.is_symlink() or "vendor" in path.parts:
            continue
        text = _scanner.strip_comments(path.read_text(errors="replace"))
        relative = path.relative_to(root).as_posix()
        for block, module in named.findall(text):
            for name in _scanner.imported_names(block):
                references.append(dict(name=name, module=module, package="/".join(module.split("/")[:2]), path=relative, access="named"))
        for alias, module in namespace.findall(text):
            member = re.compile(r"\b" + re.escape(alias) + r"\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[\s*['\"]([A-Za-z_$][\w$]*)['\"]\s*\])")
            for a, b in member.findall(text):
                references.append(dict(name=a or b, module=module, package="/".join(module.split("/")[:2]), path=relative, access="namespace"))
    return references


def imported_angular_names(root: Path) -> dict[str, list[str]]:
    named = re.compile(
        r"""(?:import|export)\s*(?:type\s+)?\{([^}]*)\}\s*from\s*['"](@angular/[^'"]+)['"]""",
        re.M | re.S,
    )
    found: dict[str, list[str]] = {}
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in {".ts", ".tsx", ".js", ".mjs", ".d.ts"}:
            continue
        if path.is_symlink() or "vendor" in path.parts:
            continue
        text = path.read_text(errors="replace")
        for block, module in named.findall(text):
            for part in block.split(","):
                token = re.sub(r"^type\s+", "", part.strip())
                token = token.split(" as ", 1)[0].strip()
                if re.fullmatch(r"[\w$]+", token):
                    found.setdefault(token, []).append(f"{path.relative_to(root).as_posix()} <- {module}")
    return found


def rule_hits(result: dict, rule: str, access: str | None = None) -> list[dict]:
    hits = []
    for item in result.get("violations", []):
        if item.get("rule") != rule:
            continue
        if access is not None and item.get("access") != access:
            continue
        hits.append(item)
    return hits


def evaluate(authored: Path, policy: dict, tarball: Path | None, annotations: Path | None) -> dict:
    authored_scan = scan(authored, policy)
    packed_scan = None
    tarball_sha = None
    if tarball is not None and tarball.is_file():
        tarball_sha = sha256_file(tarball)
        packed_scan = scan(tarball, policy)
    annotation_detail = "installed peer declarations were not compared"
    annotation_pass = False
    compared_files = 0
    private_hits = []
    deprecated_hits = []
    missing_packages = []
    unresolved_exports = []
    if annotations is not None and annotations.is_dir():
        uses = imported_angular_references(authored)
        # Follow each installed Angular package independently, rather than allowing
        # a same-name annotation from an unrelated package to classify this import.
        package_roots = {"@angular/"+path.name:path for path in annotations.iterdir() if path.is_dir()} if annotations.name == "@angular" else {"@angular/"+annotations.name:annotations}
        private_hits = []
        deprecated_hits = []
        missing_packages = []
        private_count = deprecated_count = 0
        unresolved_exports = []
        observed_files = set()
        declaration_cache = {}
        export_cache = {}
        marker_cache = {}
        for use in uses:
            directory = package_roots.get(use['package'])
            if directory is None:
                missing_packages.append(use['package'])
                continue
            key = (directory, use['module'], use['name'])
            if key not in export_cache:
                export_cache[key] = declaration_export(directory, use['module'], use['name'], declaration_cache)
            resolved = export_cache[key]
            if resolved is None:
                unresolved_exports.append(use)
                continue
            path, name = resolved
            observed_files.add(path)
            if resolved not in marker_cache:
                marker_cache[resolved] = declaration_markers(path, name)
            markers = marker_cache[resolved]
            owner = next(((package, peer.resolve()) for package, peer in package_roots.items()
                          if peer.resolve() in path.parents), None)
            if owner is None:
                unresolved_exports.append(use)
                continue
            detail = dict(use, declaration_package=owner[0], declaration=str(path.relative_to(owner[1])), declaration_name=name)
            if '@docs-private' in markers:
                private_hits.append(detail)
            if '@deprecated' in markers:
                deprecated_hits.append(detail)
        compared_files = len(observed_files)
        private_count, deprecated_count = len(private_hits), len(deprecated_hits)
        if compared_files == 0:
            annotation_detail = "annotation directory contained no declaration files"
        elif missing_packages:
            annotation_detail = f"imported peer declarations unavailable: {sorted(set(missing_packages))}"
        elif unresolved_exports:
            annotation_detail = f"imported peer exports unresolved: {unresolved_exports[:8]}"
        elif private_hits or deprecated_hits:
            annotation_detail = (
                f"docs-private={private_hits[:8]} deprecated={deprecated_hits[:8]} "
                f"files={compared_files}"
            )
        else:
            annotation_pass = True
            annotation_detail = (
                f"compared {compared_files} declaration files; "
                f"{private_count} docs-private and {deprecated_count} deprecated names were not imported"
            )

    packed_violations = packed_scan.get("violations", []) if packed_scan else []
    js_packed = [item for item in packed_violations if not str(item.get("path", "")).endswith((".scss", ".sass"))]
    sass_packed = [item for item in packed_violations if str(item.get("path", "")).endswith((".scss", ".sass"))]
    observations = {
        "source-policy/authored-boundary/no-animations-module": (
            not any(item.get("rule") == "forbidden-module" for item in authored_scan["violations"]),
            "animations or platform-browser/animations import",
        ),
        "source-policy/authored-boundary/no-private-namespace-member": (
            not rule_hits(authored_scan, "forbidden-symbol-prefix"),
            "namespace or inherited private member",
        ),
        "source-policy/authored-boundary/no-deep-internal": (
            not any(item.get("rule") in {"forbidden-deep-internal", "forbidden-module-substring"} for item in authored_scan["violations"]),
            "deep private or src module",
        ),
        "source-policy/authored-boundary/no-docs-private-symbol": (
            not rule_hits(authored_scan, "forbidden-symbol") and not private_hits,
            "forbidden imported symbol",
        ),
        "source-policy/authored-boundary/no-deprecated-symbol": (
            not rule_hits(authored_scan, "forbidden-deprecated-symbol") and not deprecated_hits,
            "deprecated upstream symbol",
        ),
        "source-policy/authored-boundary/inheritance-of-upstream": (
            not any(item.get("access") == "inheritance" for item in authored_scan["violations"]),
            "inheritance of an upstream symbol",
        ),
        "source-policy/authored-boundary/sass-public-boundary": (
            not any(str(item.get("rule", "")).startswith("forbidden-sass") for item in authored_scan["violations"]),
            "authored Sass boundary",
        ),
        "source-policy/authored-boundary/installed-annotation-comparison": (
            annotation_pass,
            annotation_detail,
        ),
        "source-policy/packed-boundary/scanned-artifact-digest": (
            tarball_sha is not None and packed_scan is not None,
            tarball_sha or "packed tarball was not scanned",
        ),
        "source-policy/packed-boundary/js-and-declarations": (
            packed_scan is not None and not js_packed,
            "packed JS/declaration boundary" if packed_scan is not None else "packed tarball was not scanned",
        ),
        "source-policy/packed-boundary/sass-transitive-closure": (
            packed_scan is not None and not sass_packed,
            "packed Sass closure" if packed_scan is not None else "packed tarball was not scanned",
        ),
    }
    cases = []
    for group, ids in MAIN_CASES.items():
        for case_id in ids:
            passed, detail = observations[case_id]
            cases.append({
                "case_id": case_id,
                "group": group,
                "result": "pass" if passed else "fail",
                "detail": detail if not passed else "observed",
            })
    return {
        "cases": cases,
        "authored_violations": authored_scan["violations"],
        "authored_violation_count": authored_scan["violation_count"],
        "packed_violation_count": None if packed_scan is None else packed_scan["violation_count"],
        "tarball_sha256": tarball_sha,
        "annotation_files": compared_files,
        "annotation_detail": annotation_detail,
        "annotation_private_hits": private_hits,
        "annotation_deprecated_hits": deprecated_hits,
        "annotation_missing_packages": sorted(set(missing_packages)),
        "annotation_unresolved_exports": unresolved_exports,
    }


def coordinator_request() -> dict | None:
    names = ["RC_CHECK_ID", "RC_RUN_ID", "RC_INVOCATION_ID", "RC_EVIDENCE_BINDING", "RC_ASSERTION_OUTPUT_DIR"]
    present = [name for name in names if os.environ.get(name)]
    if not present:
        return None
    if len(present) != len(names):
        raise SystemExit(f"source-policy: incomplete coordinator environment: {', '.join(present)}")
    if os.environ["RC_CHECK_ID"] != "source-policy":
        raise SystemExit("source-policy: RC_CHECK_ID is not source-policy")
    invocation = os.environ["RC_INVOCATION_ID"]
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,191}", invocation):
        raise SystemExit("source-policy: invalid invocation identity")
    binding = json.loads(os.environ["RC_EVIDENCE_BINDING"])
    if binding.get("run_id") != os.environ["RC_RUN_ID"]:
        raise SystemExit("source-policy: binding run_id does not match RC_RUN_ID")
    output = Path(os.environ["RC_ASSERTION_OUTPUT_DIR"])
    if not output.is_dir() or output.is_symlink():
        raise SystemExit("source-policy: assertion output directory is not a real directory")
    expected = Path("evidence") / "source-policy" / invocation
    if not str(output).endswith(str(expected)):
        raise SystemExit("source-policy: assertion directory is not check-owned")
    return {
        "binding": binding,
        "invocation": invocation,
        "run_id": os.environ["RC_RUN_ID"],
        "output": output,
        "run_dir": output.parents[2],
        "line": binding.get("source_line"),
    }


def write_acceptance(request: dict, observation: dict) -> bool:
    cases = observation["cases"]
    failed = [item["case_id"] for item in cases if item["result"] != "pass"]
    assertion = {
        "kind": "source-policy-observations",
        "check_id": "source-policy",
        "run_id": request["run_id"],
        "invocation_id": request["invocation"],
        "tarball_sha256": observation["tarball_sha256"],
        "authored_violation_count": observation["authored_violation_count"],
        "packed_violation_count": observation["packed_violation_count"],
        "annotation_detail": observation["annotation_detail"],
        "annotation_private_hits": observation["annotation_private_hits"],
        "annotation_deprecated_hits": observation["annotation_deprecated_hits"],
        "annotation_missing_packages": observation["annotation_missing_packages"],
        "annotation_unresolved_exports": observation["annotation_unresolved_exports"],
        "note": "Packed bytes are identified by digest. Outer subject remains source. Annotation comparison is unknown when declarations are absent.",
        "violations": observation["authored_violations"][:40],
        "cases": cases,
    }
    payload = (json.dumps(assertion, indent=2) + "\n").encode()
    path = request["output"] / "boundary-observations.json"
    path.write_bytes(payload)
    relative = path.relative_to(request["run_dir"]).as_posix()
    output = {"path": relative, "sha256": hashlib.sha256(payload).hexdigest(), "bytes": len(payload)}
    report = {
        "schema_version": 1,
        "template": False,
        "run_id": request["run_id"],
        "check_id": "source-policy",
        "line": request["line"],
        "invocation_id": request["invocation"],
        "binding": request["binding"],
        "coverage": "incomplete" if failed else "complete",
        "result": "fail" if failed else "pass",
        "exit_code": 1 if failed else 0,
        "g11_claim": "not-passed",
        "subject_kind": "source",
        "subject_ids": ["source"],
        "artifacts": {},
        "expected_case_ids": [item["case_id"] for item in cases],
        "discovered_case_ids": [item["case_id"] for item in cases],
        "executed_case_ids": [item["case_id"] for item in cases],
        "passed_case_ids": [item["case_id"] for item in cases if item["result"] == "pass"],
        "failed_case_ids": failed,
        "skipped_case_ids": [],
        "unresolved_case_ids": [],
        "exceptions": [],
        "passed": len(cases) - len(failed),
        "failed": len(failed),
        "skipped": 0,
        "outputs": [output],
        "case_results": [
            {"case_id": item["case_id"], "result": item["result"], "kind": "assertion", "output_paths": [relative]}
            for item in cases
        ],
        "command": ["python3", "scripts/check-source-policy.py"],
        "limitations": [
            f"authored_violations={observation['authored_violation_count']}; packed_violations={observation['packed_violation_count']}",
            observation["annotation_detail"],
            "A packed digest does not replace authored boundary failures.",
        ],
    }
    if failed:
        report["coverage"] = "incomplete"
    reports = request["run_dir"] / "reports"
    reports.mkdir(parents=True, exist_ok=True)
    (reports / "source-policy.json").write_text(json.dumps(report, indent=2) + "\n")
    return not failed


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=ROOT / "projects/ngx-material-legacy")
    parser.add_argument("--tarball", type=Path)
    parser.add_argument("--policy", type=Path, default=POLICY)
    parser.add_argument("--annotations", type=Path)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    annotations = args.annotations
    if annotations is None:
        candidate = ROOT / "node_modules" / "@angular"
        if candidate.is_dir():
            annotations = candidate
    observation = evaluate(args.root, load_policy(args.policy), args.tarball, annotations)
    failed = [item for item in observation["cases"] if item["result"] != "pass"]
    summary = {
        "ok": not failed,
        "authored_violation_count": observation["authored_violation_count"],
        "packed_violation_count": observation["packed_violation_count"],
        "tarball_sha256": observation["tarball_sha256"],
        "failed": [item["case_id"] for item in failed],
        "annotation_detail": observation["annotation_detail"],
        "security_clearance": "not-passed",
    }
    text = json.dumps(summary, indent=2) + "\n"
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(observation, indent=2) + "\n")
    print(text, end="")
    request = coordinator_request()
    if request is not None:
        accepted = write_acceptance(request, observation)
        return 0 if accepted else 1
    return 0 if not failed else 1


if __name__ == "__main__":
    raise SystemExit(main())
