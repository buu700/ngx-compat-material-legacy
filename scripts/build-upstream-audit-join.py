#!/usr/bin/env python3
"""Exact upstream-audit join: upstream SHA x ledger row x symbol use x line.

Mechanical evidence collection for FIN-02. It never changes a disposition and
never writes individual_proof. For each seed SHA it records the upstream diff
identity, the touched paths and their owner (owned legacy source, delegated
peer module, or tooling/docs/tests), the 16.2.14 and current owned-source
hashes, and per release line the installed peer floor, tag ancestry and an
added-line presence count in the installed peer package. For each authored
symbol use it records the import line and the export presence in each line's
installed floor. Defects are deduplicated per SHA.

  python3 scripts/build-upstream-audit-join.py --upstream /path/components.git \
      --peer main=/path/main-peers --peer 21.x=/path/21x-peers [--write-evidence]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SEED = ROOT / "compatibility/f10/upstream-sha-risk-bootstrap.json"
LEDGER = ROOT / "compatibility/f10/disposition-ledger/ledger.json"
SYMBOLS = ROOT / "compatibility/f10/authored-dependency-inventory-seed.json"
PACKAGE = ROOT / "projects/ngx-material-legacy"
OUT = ROOT / "compatibility/f10/audit-join/join.json"
EVIDENCE_DIR = ROOT / "compatibility/f10/disposition-ledger/evidence/mechanical"
CIRCULAR = "compatibility/rc/reports/upstream-audit-disposition.json"
BATCH_REPORTS = {
    "compatibility/rc/reports/behavior-semantic-one-diff.json",
    "compatibility/rc/reports/needs-triage-one-diff.json",
    "compatibility/rc/reports/test-only-one-diff.json",
    "compatibility/rc/reports/docs-build-one-diff.json",
}
LINE_FLOORS = {
    "main": {"tag": "v22.1.7", "cdk": "22.1.7", "material": "22.1.7"},
    "21.x": {"tag": "v21.2.14", "cdk": "21.2.14", "material": "21.2.14"},
}
INHERITED = {"inherited"}
BEHAVIOR = {"adapt", "already-adapted", "already-present"}
SKIP_ADDED = re.compile(r"^(import |export \* from|//|/\*|\*|\}|\{|\)|\]|$)")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git(upstream: Path, *args: str) -> bytes:
    return subprocess.run(["git", f"--git-dir={upstream}", *args], check=True, capture_output=True).stdout


def git_ok(upstream: Path, *args: str) -> bool:
    return subprocess.run(["git", f"--git-dir={upstream}", *args], capture_output=True).returncode == 0


def sensitive_class(entry: dict) -> str | None:
    # Mirrors scripts/check-upstream-audit-disposition.mjs sensitiveClass().
    if entry.get("bucket") == "security-deep":
        return "security"
    blob = f"{entry.get('subject') or ''}\n" + "\n".join(entry.get("files") or [])
    if re.search(r"a11y|accessibility|live-announcer|focus-trap|focus-monitor|aria-", blob, re.I):
        return "a11y"
    if re.search(r"\b(ngOnInit|ngOnChanges|ngOnDestroy|ngAfterViewInit|ngAfterContentInit)\b", entry.get("subject") or ""):
        return "lifecycle"
    return None


def path_owner(path: str) -> dict:
    """Who owns an upstream path in the candidate."""
    m = re.match(r"^src/material/(legacy-[a-z-]+)/(.+)$", path)
    if m:
        candidate = PACKAGE / m.group(1) / m.group(2)
        return {"kind": "owned-legacy", "candidate_path": candidate.relative_to(ROOT).as_posix(),
                "candidate_exists": candidate.is_file()}
    if re.search(r"(^|/)(testing/)|\.spec\.ts$|/testing\b|e2e|harness", path):
        kind = "test"
    elif path.endswith(".md") or path.startswith(("guides/", "docs/")):
        kind = "docs"
    elif path.startswith(("src/dev-app/", "src/components-examples/", "src/universal-app/", "src/e2e-app/")):
        kind = "demo"
    elif path.startswith(("tools/", ".github/", "scripts/", ".ng-dev/", "integration/")) or "/" not in path:
        kind = "tooling"
    else:
        kind = None
    m = re.match(r"^src/(cdk|material)/([a-z0-9-]+)/", path)
    if m and kind is None:
        return {"kind": "delegated-peer", "package": f"@angular/{m.group(1)}", "module": m.group(2)}
    if m:
        return {"kind": kind, "package": f"@angular/{m.group(1)}", "module": m.group(2)}
    return {"kind": kind or "other"}


def added_lines(patch: str, wanted: set[str]) -> list[str]:
    lines, current = [], None
    for row in patch.split("\n"):
        if row.startswith("diff --git "):
            current = row.split(" b/", 1)[-1]
            continue
        if current not in wanted or not row.startswith("+") or row.startswith("+++"):
            continue
        text = row[1:].strip()
        if len(text) < 16 or SKIP_ADDED.match(text):
            continue
        lines.append(text)
    return lines


class PeerText:
    """All text of an installed peer package, for added-line presence counts."""

    def __init__(self, root: Path):
        self.root = root
        self.version = json.loads((root / "package.json").read_text())["version"]
        chunks = []
        for path in sorted(root.rglob("*")):
            if path.is_file() and path.suffix in {".mjs", ".ts", ".scss", ".css", ".json"} and "node_modules" not in path.parts:
                try:
                    chunks.append(path.read_text(errors="replace"))
                except OSError:
                    pass
        self.text = "\n".join(chunks)
        self.squashed = re.sub(r"\s+", "", self.text)
        self.cache: dict[str, bool] = {}

    def has(self, line: str) -> bool:
        if line not in self.cache:
            self.cache[line] = line in self.text or re.sub(r"\s+", "", line) in self.squashed
        return self.cache[line]


NONAPPLICABLE = {"irrelevant", "not-applicable", "do-not-adopt"}
EVIDENCE_DEFECTS = {"circular-evidence", "missing-evidence", "batch-report-does-not-contain-sha"}
QUEUE = ROOT / "compatibility/f10/audit-join/review-queue.json"


def consistency(row: dict) -> dict:
    """Does the mechanical data agree with the current disposition? Never decides it."""
    owned = [f["path"] for f in row["files"] if f["kind"] == "owned-legacy" and f.get("candidate_exists")]
    owned_missing = [f["path"] for f in row["files"] if f["kind"] == "owned-legacy" and not f.get("candidate_exists")]
    delegated = sorted({f"{f['package']}/{f['module']}" for f in row["files"] if f["kind"] == "delegated-peer"})
    kinds = sorted({f["kind"] for f in row["files"]})
    disposition = row["final_disposition"]
    facts = {"owned_paths": owned, "owned_paths_without_candidate_file": owned_missing,
             "delegated_modules": delegated, "path_kinds": kinds}
    if disposition in NONAPPLICABLE:
        status = "conflict-owned-source-touched" if owned else "consistent-no-owned-source"
    elif disposition == "inherited":
        if not delegated:
            status = "question-no-delegated-source"
        else:
            counts = {line: (info["delegated_added_lines_present_in_installed_floor"], info["delegated_added_lines"]) for line, info in row["lines"].items()}
            if all(total == 0 for _, total in counts.values()):
                status = "question-no-significant-added-lines"
            elif all(found == total for found, total in counts.values()):
                status = "consistent-added-lines-present-both-lines"
            elif any(found == 0 and total for found, total in counts.values()):
                status = "question-added-lines-absent-on-a-line"
            else:
                status = "partial-added-lines-present"
    elif disposition in BEHAVIOR:
        status = "owned-behavior-needs-individual-proof" if owned else "question-behavior-without-owned-path"
    else:
        status = "unclassified"
    return {"status": status, **facts}


def write_evidence(rows: list[dict], ledger: dict, report: dict) -> int:
    """Per-SHA mechanical evidence for rows whose evidence pointer was circular, missing or wrong."""
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)
    by_sha = {entry["sha"]: entry for entry in ledger["entries"]}
    written = 0
    for row in rows:
        if not EVIDENCE_DEFECTS.intersection(row["defects"]):
            continue
        entry = by_sha[row["sha"]]
        rel = (EVIDENCE_DIR / f"{row['sha']}.json").relative_to(ROOT).as_posix()
        body = {
            "sha": row["sha"],
            "kind": "mechanical-upstream-evidence",
            "subject": row["subject"],
            "upstream_commit": f"https://github.com/angular/components/commit/{row['sha']}",
            "final_disposition": row["final_disposition"],
            "final_disposition_changed": False,
            "previous_evidence_report": entry.get("evidence_report"),
            "previous_evidence_defect": sorted(EVIDENCE_DEFECTS.intersection(row["defects"])),
            "diff_sha256": row["diff_sha256"],
            "files": row["files"],
            "lines": row["lines"],
            "installed_floors": report["installed_floors"],
            "mechanical_consistency": row["mechanical_consistency"],
            "not_individual_proof": True,
            "note": "Collected by scripts/build-upstream-audit-join.py from the upstream commit and the installed floor packages. It replaces a circular, missing or non-containing evidence pointer. It is not an individual review, an executed delegation or a disposition change.",
        }
        (ROOT / rel).write_text(json.dumps(body, indent=1) + "\n")
        entry["evidence_report"] = rel
        written += 1
    LEDGER.write_text(json.dumps(ledger, indent=2) + "\n")
    return written


def question_for(row: dict) -> str:
    c = row["mechanical_consistency"]
    parts = []
    if c["owned_paths"]:
        owned = [f for f in row["files"] if f["kind"] == "owned-legacy" and f.get("candidate_exists")]
        same = [f["path"] for f in owned if f.get("original_16_2_14_sha256") and f["original_16_2_14_sha256"] == f.get("candidate_sha256")]
        parts.append(f"touches owned legacy source {', '.join(c['owned_paths'])}"
                     + (f" (candidate bytes still equal 16.2.14 for {', '.join(same)})" if same else ""))
    if c["delegated_modules"]:
        counts = "; ".join(f"{line} {info['floor_tag']}: {info['delegated_added_lines_present_in_installed_floor']}/{info['delegated_added_lines']} added lines found, ancestor={info['sha_is_ancestor_of_floor_tag']}"
                           for line, info in row["lines"].items())
        parts.append(f"delegates to {', '.join(c['delegated_modules'])} ({counts})")
    if not parts:
        parts.append(f"path kinds {', '.join(c['path_kinds'])} only")
    return "; ".join(parts)


DECISION = {
    "sensitive": "Confirm or replace the current disposition with an individual a11y/security/lifecycle review; supply individual_proof (diff read, owned file or installed member, affected lines).",
    "conflict-owned-source-touched": "The row is non-applicable but the commit touches owned legacy source that exists in the candidate. Decide whether the change applies to the owned copy.",
    "behavior": "Owned-behavior disposition without individual proof. Confirm the owned line carries (or deliberately omits) the change and record individual_proof.",
    "question-added-lines-absent-on-a-line": "Inherited, but the delegated added lines were not found in one line's installed floor. Confirm the fix is present there (cherry-pick, refactor or compiled form) or change the disposition for that line.",
    "question-no-delegated-source": "Inherited, but the commit touches no delegated peer source. Confirm what is inherited or reclassify.",
    "inherited-delegation": "Inherited with mechanical support. Missing evidence is the executed delegation: a test or observation that the candidate reaches the named installed member on each line.",
}


def write_queue(rows: list[dict], report: dict) -> dict:
    items, groups = [], defaultdict(list)
    for row in rows:
        c = row["mechanical_consistency"]
        base = {
            "sha": row["sha"], "subject": row["subject"], "current_disposition": row["final_disposition"],
            "diff_sha256": row["diff_sha256"], "evidence_report": row["evidence_report"], "defects": row["defects"],
            "facts": question_for(row),
        }
        if row["sensitive_class"] and any(d.startswith("sensitive-") for d in row["defects"]):
            items.append({**base, "priority": 1, "category": f"sensitive-{row['sensitive_class']}", "decision_requested": DECISION["sensitive"]})
        elif c["status"] == "conflict-owned-source-touched":
            items.append({**base, "priority": 2, "category": c["status"], "decision_requested": DECISION[c["status"]]})
        elif "behavior-without-individual-proof" in row["defects"]:
            items.append({**base, "priority": 3, "category": "behavior", "decision_requested": DECISION["behavior"]})
        elif row["final_disposition"] == "inherited" and c["status"] in ("question-added-lines-absent-on-a-line", "question-no-delegated-source"):
            items.append({**base, "priority": 4, "category": c["status"], "decision_requested": DECISION[c["status"]]})
        elif "inherited-without-installed-member-and-executed-delegation" in row["defects"]:
            groups[", ".join(c["delegated_modules"]) or "none"].append(row["sha"])
    group_items = [{
        "priority": 5, "category": "inherited-delegation", "delegated_modules": key, "members": sorted(members),
        "member_count": len(members), "decision_requested": DECISION["inherited-delegation"],
        "identical_reasoning": "Every member is inherited from the same delegated module set, its delegated added lines are at least partly present in both installed floors (per-row counts in join.json), and each lacks only installed_member and an executed delegation.",
    } for key, members in sorted(groups.items())]
    queue = {
        "schema_version": 1,
        "role": "FIN-02 finite prioritized review queue (prepared evidence; no decisions)",
        "g11_claim": "not-passed",
        "join": "compatibility/f10/audit-join/join.json",
        "priorities": {"1": "sensitive a11y/security/lifecycle, individual", "2": "non-applicable row touching owned source, individual",
                        "3": "owned behavior without individual proof, individual", "4": "inherited with a mechanical contradiction, individual",
                        "5": "inherited awaiting executed-delegation evidence, grouped by delegated module with explicit membership"},
        "counts": {"individual_items": len(items), "groups": len(group_items), "grouped_members": sum(g["member_count"] for g in group_items),
                   "by_priority": dict(Counter(str(item["priority"]) for item in items + group_items))},
        "items": sorted(items, key=lambda item: (item["priority"], item["sha"])),
        "groups": group_items,
    }
    QUEUE.write_text(json.dumps(queue, indent=1) + "\n")
    return queue["counts"]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upstream", type=Path, required=True)
    parser.add_argument("--peer", action="append", default=[], help="line=dir containing cdk/ and material/")
    parser.add_argument("--write-evidence", action="store_true")
    parser.add_argument("--out", type=Path, default=OUT)
    args = parser.parse_args()
    peers_dirs = dict(item.split("=", 1) for item in args.peer)
    if set(peers_dirs) != set(LINE_FLOORS):
        raise SystemExit("--peer main=... and --peer 21.x=... are required")
    peers = {}
    for line, base in peers_dirs.items():
        peers[line] = {}
        for pkg in ("cdk", "material"):
            text = PeerText(Path(base) / pkg)
            if text.version != LINE_FLOORS[line][pkg]:
                raise SystemExit(f"{line} {pkg} is {text.version}, expected {LINE_FLOORS[line][pkg]}")
            tgz = next(Path(base).glob(f"angular-{pkg}-{text.version}.tgz"), None)
            peers[line][pkg] = {"text": text, "tgz_sha256": sha256_bytes(tgz.read_bytes()) if tgz else None}
    tags = {line: git(args.upstream, "rev-parse", f"{floor['tag']}^{{commit}}").decode().strip() for line, floor in LINE_FLOORS.items()}
    base_commit = git(args.upstream, "rev-parse", "16.2.14^{commit}").decode().strip()

    seed = json.loads(SEED.read_text())
    ledger = json.loads(LEDGER.read_text())
    symbols = json.loads(SYMBOLS.read_text())
    entries = {entry["sha"]: entry for entry in ledger["entries"]}
    batch_shas = {}
    for rel in BATCH_REPORTS:
        report = json.loads((ROOT / rel).read_text())
        batch_shas[rel] = {item.get("sha") for item in report.get("reviews") or [] if isinstance(item, dict)}

    rows = []
    defects = defaultdict(list)
    module_shas = defaultdict(set)
    for commit in seed["commits"]:
        sha = commit["sha"]
        entry = entries.get(sha) or {}
        patch = git(args.upstream, "show", "--format=", "--no-color", "--full-index", "--no-renames", sha)
        numstat = git(args.upstream, "show", "--format=", "--numstat", "--no-renames", sha).decode().splitlines()
        files = []
        for row in numstat:
            added, removed, path = row.split("\t", 2)
            owner = path_owner(path)
            item = {"path": path, "added": added, "removed": removed, **owner}
            if owner["kind"] == "owned-legacy":
                original = subprocess.run(["git", f"--git-dir={args.upstream}", "show", f"{base_commit}:{path}"], capture_output=True)
                item["original_16_2_14_sha256"] = sha256_bytes(original.stdout) if original.returncode == 0 else None
                candidate = ROOT / owner["candidate_path"]
                item["candidate_sha256"] = sha256_bytes(candidate.read_bytes()) if candidate.is_file() else None
            if owner.get("module"):
                module_shas[f"{owner['package']}/{owner['module']}"].add(sha)
            files.append(item)
        delegated = {f["path"] for f in files if f["kind"] == "delegated-peer"}
        lines_added = added_lines(patch.decode(errors="replace"), delegated)
        per_line = {}
        for line, floor in LINE_FLOORS.items():
            ancestor = git_ok(args.upstream, "merge-base", "--is-ancestor", sha, tags[line])
            packages = sorted({f["package"].split("/")[1] for f in files if f["kind"] == "delegated-peer"})
            present = 0
            for text in lines_added:
                if any(peers[line][pkg]["text"].has(text) for pkg in packages):
                    present += 1
            per_line[line] = {
                "floor_tag": floor["tag"],
                "sha_is_ancestor_of_floor_tag": ancestor,
                "delegated_packages": [f"@angular/{pkg}@{floor[pkg]}" for pkg in packages],
                "delegated_added_lines": len(lines_added),
                "delegated_added_lines_present_in_installed_floor": present,
            }
        disposition = entry.get("final_disposition")
        evidence = entry.get("evidence_report")
        sensitive = sensitive_class(entry) if entry else None
        row_defects = []
        if not entry:
            row_defects.append("no-ledger-row")
        if evidence == CIRCULAR:
            row_defects.append("circular-evidence")
        elif not evidence:
            row_defects.append("missing-evidence")
        elif evidence in BATCH_REPORTS and sha not in batch_shas[evidence]:
            row_defects.append("batch-report-does-not-contain-sha")
        elif evidence not in BATCH_REPORTS and not (ROOT / evidence).is_file():
            row_defects.append("evidence-file-missing")
        proof = entry.get("individual_proof") if isinstance(entry.get("individual_proof"), dict) else None
        if sensitive and not proof:
            row_defects.append(f"sensitive-{sensitive}-without-individual-proof")
        if disposition in INHERITED and not (proof and proof.get("installed_member") and proof.get("reachable_behavior")):
            row_defects.append("inherited-without-installed-member-and-executed-delegation")
        if disposition in BEHAVIOR and not proof:
            row_defects.append("behavior-without-individual-proof")
        for defect in row_defects:
            defects[defect].append(sha)
        rows.append({
            "sha": sha,
            "subject": commit.get("subject"),
            "date": commit.get("date"),
            "bucket": entry.get("bucket"),
            "final_disposition": disposition,
            "sensitive_class": sensitive,
            "evidence_report": evidence,
            "diff_sha256": sha256_bytes(patch),
            "files": files,
            "lines": per_line,
            "defects": row_defects,
        })

    # Symbol uses: exact file/line and export presence per line floor.
    row_by_sha = {row["sha"]: row for row in rows}
    uses = []
    for index, use in enumerate(symbols.get("symbol_uses") or []):
        rel = use.get("file") or ""
        path = PACKAGE / rel
        lines_found = []
        if path.is_file():
            text = path.read_text(errors="replace").split("\n")
            pattern = re.compile(rf"\b{re.escape(use.get('symbol') or '')}\b")
            in_import, start = False, 0
            for number, row in enumerate(text, 1):
                if re.match(r"^\s*(import|export)\b", row):
                    in_import, start = True, number
                if in_import and pattern.search(row):
                    module = use.get("module") or ""
                    window = "\n".join(text[start - 1:min(len(text), number + 30)])
                    if f"'{module}'" in window or f'"{module}"' in window:
                        lines_found.append(number)
                if in_import and re.search(r"from\s+['\"]|;\s*$", row):
                    in_import = False
        module = use.get("module") or ""
        exports = {}
        m = re.match(r"^@angular/(cdk|material)(/.*)?$", module)
        for line in LINE_FLOORS:
            if not m:
                exports[line] = None
                continue
            pkg_root = Path(peers_dirs[line]) / m.group(1)
            sub = (m.group(2) or "").lstrip("/")
            types_name = (sub or m.group(1)).replace("/", "-")
            candidates = list(pkg_root.glob(f"types/{types_name}.d.ts")) + list((pkg_root / sub).glob("index.d.ts"))
            text = "\n".join(p.read_text(errors="replace") for p in candidates)
            exports[line] = bool(text) and bool(re.search(rf"\b{re.escape(use.get('symbol') or '')}\b", text))
        sub_module = f"{module}".split("/")
        linked = sorted(module_shas.get("/".join(sub_module[:3]), set())) if m else []
        uses.append({
            "use_id": f"{module}:{use.get('symbol')}@{rel}",
            "module": module,
            "symbol": use.get("symbol"),
            "file": rel,
            "lines": sorted(set(lines_found)),
            "disposition": use.get("disposition"),
            "export_present": exports,
            "upstream_shas_touching_module": len(linked),
            "upstream_shas_touching_module_with_defects": sum(1 for sha in linked if row_by_sha[sha]["defects"]),
            "defects": [] if lines_found else ["stale-seed-use: the symbol is not imported from this module in the current file"],
        })

    for row in rows:
        row["mechanical_consistency"] = consistency(row)

    use_ids = Counter(item["use_id"] for item in uses)
    summary = {
        "seed_rows": len(seed["commits"]),
        "ledger_rows": len(entries),
        "rows_with_any_defect": sum(1 for row in rows if row["defects"]),
        "defect_counts": {key: len(value) for key, value in sorted(defects.items())},
        "symbol_uses": len(uses),
        "symbol_uses_duplicate_ids": sum(1 for count in use_ids.values() if count > 1),
        "symbol_uses_without_line": sum(1 for item in uses if not item["lines"]),
        "symbol_uses_export_missing": {line: sum(1 for item in uses if item["export_present"][line] is False) for line in LINE_FLOORS},
    }
    report = {
        "schema_version": 1,
        "role": "FIN-02 exact upstream-audit join (mechanical evidence collection, not dispositions)",
        "g11_claim": "not-passed",
        "upstream": {"repo": "angular/components", "base_16_2_14": base_commit, "floor_tags": tags},
        "installed_floors": {line: {pkg: {"version": peers[line][pkg]["text"].version, "tgz_sha256": peers[line][pkg]["tgz_sha256"]} for pkg in ("cdk", "material")} for line in LINE_FLOORS},
        "inputs": {rel: sha256_bytes((ROOT / rel).read_bytes()) for rel in (
            "compatibility/f10/upstream-sha-risk-bootstrap.json",
            "compatibility/f10/disposition-ledger/ledger.json",
            "compatibility/f10/authored-dependency-inventory-seed.json")},
        "summary": summary,
        "defects": {key: sorted(value) for key, value in sorted(defects.items())},
        "rows": rows,
        "symbol_uses": uses,
        "limitations": [
            "delegated_added_lines_present_in_installed_floor is a whitespace-insensitive substring count of significant added lines from delegated source files in the installed peer package text. TypeScript-only lines may be compiled away; a low count is a question, not a negative finding, and a full count is not an executed delegation.",
            "Tag ancestry is recorded but is not proof; 21.x fixes may be cherry-picks with different SHAs.",
            "Symbol export presence is a word match in the installed entry-point typings for @angular/cdk and @angular/material modules only; framework modules are null.",
            "No disposition is changed and no individual_proof is written by this tool.",
        ],
    }
    if args.write_evidence:
        report["evidence_written"] = write_evidence(rows, ledger, report)
        report["review_queue"] = write_queue(rows, report)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, separators=(",", ":")) + "\n")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
