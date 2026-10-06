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


def proof_defects(entry: dict, sensitive: str | None) -> list[str]:
    """Same individual-proof gaps the checker counts, per row."""
    disposition = entry.get("final_disposition")
    proof = entry.get("individual_proof") if isinstance(entry.get("individual_proof"), dict) else None
    out = []
    if sensitive and not proof:
        out.append(f"sensitive-{sensitive}-without-individual-proof")
    if disposition in INHERITED and not (proof and proof.get("installed_member") and proof.get("reachable_behavior")):
        out.append("inherited-without-installed-member-and-executed-delegation")
    if disposition in BEHAVIOR and not proof:
        out.append("behavior-without-individual-proof")
    return out


RETAINED_NOTES = {"not-applied", "owned-retained", "not-owned", "retained-legacy-differs"}
NOTE_PATH = re.compile(r"[\w./-]+\.(?:ts|scss|html|css)")
PR_NUMBER = re.compile(r"\(#(\d+)\)")


class Context:
    """Lookups shared by every review note."""

    def __init__(self, upstream: Path, ledger: dict):
        self.upstream = upstream
        self.entries = {entry["sha"]: entry for entry in ledger["entries"]}
        self.notes = {}
        for rel in sorted(BATCH_REPORTS):
            for item in json.loads((ROOT / rel).read_text()).get("reviews") or []:
                if isinstance(item, dict) and item.get("sha"):
                    self.notes[item["sha"]] = {"source": rel, **item}
        log = git(upstream, "log", "--format=%s", "16.2.14").decode(errors="replace")
        self.prs_16 = set(PR_NUMBER.findall(log))
        self.specs = defaultdict(list)
        for spec in sorted(PACKAGE.rglob("*.spec.ts")):
            if "node_modules" in spec.parts:
                continue
            rel = spec.relative_to(ROOT).as_posix()
            for module in set(re.findall(r"from\s+['\"](@angular/(?:cdk|material)/[a-z0-9-]+)", spec.read_text(errors="replace"))):
                self.specs[module].append(rel)
            legacy = spec.relative_to(PACKAGE).parts[0]
            self.specs[f"owned:{legacy}"].append(rel)

    def read_note(self, sha: str) -> dict:
        entry = self.entries.get(sha, {})
        note = self.notes.get(sha)
        if note:
            return {"source": note["source"], "disposition": note.get("disposition"), "text": note.get("evidence") or ""}
        return {"source": "ledger", "disposition": entry.get("read_note_disposition"), "text": entry.get("reason") or ""}

    def candidate_refs(self, text: str, row: dict) -> dict:
        refs = []
        for cited in sorted(set(NOTE_PATH.findall(text))):
            for base in (PACKAGE, ROOT):
                path = base / cited
                if path.is_file() and "node_modules" not in path.parts:
                    refs.append(path)
                    break
        if not refs:
            return {"paths": [], "upstream_added_lines_found": None}
        patch = git(self.upstream, "show", "--format=", "--no-renames", row["sha"]).decode(errors="replace")
        wanted = {f["path"] for f in row["files"] if f["kind"] in ("delegated-peer", "owned-legacy")}
        added = added_lines(patch, wanted)
        body = "\n".join(path.read_text(errors="replace") for path in refs)
        squashed = re.sub(r"\s+", "", body)
        found = sum(1 for line in added if line in body or re.sub(r"\s+", "", line) in squashed)
        return {"paths": [{"path": path.relative_to(ROOT).as_posix(), "sha256": sha256_bytes(path.read_bytes())} for path in refs],
                "upstream_added_lines_found": f"{found}/{len(added)}"}

    def regression_tests(self, row: dict) -> list[str]:
        c = row["mechanical_consistency"]
        tests = set()
        for module in c["delegated_modules"]:
            tests.update(self.specs.get(module, []))
            legacy = f"owned:legacy-{module.split('/')[-1]}"
            tests.update(self.specs.get(legacy, []))
        for path in c["owned_paths"]:
            match = re.match(r"^src/material/(legacy-[a-z-]+)/", path)
            if match:
                tests.update(self.specs.get(f"owned:{match.group(1)}", []))
        return sorted(tests)


def review_note(row: dict, category: str, priority: int, ctx: Context) -> dict:
    """One prepared review question: identity, evidence, proposal, alternatives, impact, decision."""
    sha, final = row["sha"], row["final_disposition"]
    c = row["mechanical_consistency"]
    note = ctx.read_note(sha)
    refs = ctx.candidate_refs(note["text"], row) if note["text"] else {"paths": [], "upstream_added_lines_found": None}
    pr = PR_NUMBER.search(row["subject"] or "")
    in_16 = bool(pr and pr.group(1) in ctx.prs_16)
    contradictions = []
    if final in BEHAVIOR and note["disposition"] in RETAINED_NOTES:
        contradictions.append(f"final_disposition {final} but the read note says {note['disposition']}")
    if final in INHERITED and note["disposition"] == "owned-retained":
        contradictions.append("final_disposition inherited but the read note says owned-retained")
    if c["status"] == "conflict-owned-source-touched":
        contradictions.append(f"final_disposition {final} but the commit touches owned source {', '.join(c['owned_paths'])}")
    kinds = sorted({f["kind"] for f in row["files"]})
    runtime_paths = [f["path"] for f in row["files"] if f["kind"] in ("delegated-peer", "owned-legacy")]
    tests = ctx.regression_tests(row)
    line_counts = {line: f"{info['delegated_added_lines_present_in_installed_floor']}/{info['delegated_added_lines']}" for line, info in row["lines"].items()}

    if contradictions:
        kind = "contradiction"
        if final in BEHAVIOR and note["disposition"] in RETAINED_NOTES:
            proposal = (f"The read note ({note['source']}) says the candidate does not carry this change ({note['disposition']}). "
                        f"If that holds, {final} overstates it: record a deviation (keep the 16.2.14 behavior) under a non-adopting disposition.")
            alternatives = [f"Port the upstream change into {', '.join(p['path'] for p in refs['paths']) or 'the owned counterpart'} and keep {final}.",
                            f"Keep {final} if the read note is wrong, citing the candidate lines that implement it (cited-file line match {refs['upstream_added_lines_found']})."]
        else:
            proposal = f"Re-read the diff against the owned source; the disposition {final} conflicts with the mechanical facts."
            alternatives = [f"Keep {final} with an individual proof that the owned copy is unaffected.", "Change the disposition and add a regression."]
    elif category.startswith("sensitive"):
        if not runtime_paths:
            kind = "ambiguity"
            proposal = f"The classifier flagged {row['sensitive_class']}, but the commit only touches {', '.join(kinds)} paths. Proposed: not runtime-relevant; confirm with an individual read."
            alternatives = ["Keep it sensitive if a docs/test change documents a behavior the candidate must follow."]
        elif not c["owned_paths"] and all(info["delegated_added_lines"] == 0 for info in row["lines"].values()):
            kind = "ambiguity"
            proposal = (f"The delegated change has no significant added lines (comments, removals or trivial lines only) and touches no owned source; "
                        f"read note {note['disposition']}. Proposed: no runtime behavior for the candidate to carry; record that individually.")
            alternatives = ["A removal can still change behavior; confirm nothing the candidate calls was removed."]
        elif final in INHERITED and all(info["delegated_added_lines"] and info["delegated_added_lines_present_in_installed_floor"] == info["delegated_added_lines"] for info in row["lines"].values()):
            kind = "unavailable-evidence"
            proposal = f"Inherited from the installed floors (all added delegated lines found on both lines: {line_counts}). The executed delegation is still missing."
            alternatives = ["Owned code may shadow the delegated member; if so, the fix needs an owned port instead."]
        else:
            kind = "ambiguity"
            proposal = f"No mechanical conclusion. Delegated added-line presence per line {line_counts}; read note {note['disposition']}."
            alternatives = [f"Keep {final} with individual proof.", "Reclassify after reading the hunk against the candidate."]
    elif category == "behavior":
        found = refs["upstream_added_lines_found"]
        if refs["paths"] and found and found.split("/")[0] == found.split("/")[1] and found != "0/0":
            kind = "ambiguity"
            proposal = f"All {found} significant upstream added lines are present in the cited candidate file(s); the read note says {note['disposition']}. Proposed: fix present, record an individual proof after checking context."
            alternatives = ["The lines may match generically (for example a common statement) without the surrounding change; then treat as not present."]
        elif refs["paths"]:
            kind = "ambiguity"
            proposal = f"The cited candidate file(s) contain {found} of the significant upstream added lines; the read note says {note['disposition']}. The fix may be adapted in different form or absent."
            alternatives = ["Present in adapted form: cite the candidate lines.", "Absent: port it or record a deviation."]
        else:
            kind = "unavailable-evidence"
            proposal = f"No candidate file is cited by the read note ({note['source']}); the claim '{final}' cannot be checked mechanically."
            alternatives = ["Locate the owned counterpart and cite its lines.", "Record that the change has no owned counterpart and reclassify."]
    elif category == "question-added-lines-absent-on-a-line":
        kind = "ambiguity"
        proposal = f"Inherited, but delegated added lines per line are {line_counts}; ancestry " + ", ".join(f"{line}={info['sha_is_ancestor_of_floor_tag']}" for line, info in row["lines"].items()) + ". Compiled output may differ from source, so absence is a question."
        alternatives = ["Find the compiled form in the installed floor and cite it.", "If the fix is missing on a line, the row is not inherited there."]
    else:
        kind = "ambiguity"
        proposal = f"Inherited, but the commit touches only {', '.join(kinds)} paths and no delegated peer source."
        alternatives = ["Reclassify as irrelevant if nothing ships.", "Name the delegated member if something is inherited."]

    decision = {
        "contradiction": f"Resolve the conflict for {sha[:12]}: {contradictions[0] if contradictions else ''}.",
        "ambiguity": f"Decide whether {sha[:12]} is {final} on main and 21.x, using the facts above.",
        "unavailable-evidence": f"Supply or waive the missing evidence for {sha[:12]} ({'executed delegation' if final in INHERITED else 'candidate reference'}).",
    }[kind]
    return {
        "sha": sha,
        "priority": priority,
        "category": category,
        "question_kind": kind,
        "subject": row["subject"],
        "source_identity": {"upstream_commit": f"https://github.com/angular/components/commit/{sha}", "diff_sha256": row["diff_sha256"],
                            "pr_in_16_2_14_history": in_16, "files": [f"{f['path']} ({f['kind']})" for f in row["files"]]},
        "scope": {line: {"floor": info["floor_tag"], "ancestor_of_floor": info["sha_is_ancestor_of_floor_tag"],
                         "delegated_added_lines_found": line_counts[line]} for line, info in row["lines"].items()},
        "current_disposition": final,
        "evidence_report": row["evidence_report"],
        "defects": row["defects"],
        "facts": question_for(row),
        "read_note": note,
        "candidate_references": refs,
        "contradictions": contradictions,
        "proposed_conclusion": proposal,
        "alternatives": alternatives,
        "regression_impact": {"candidate_specs": tests, "count": len(tests)},
        "decision_requested": decision,
    }


GROUP_REASONING = {
    "consistent-added-lines-present-both-lines": "Every member is inherited from this delegated module set, and all of its significant delegated added lines are present in both installed floors.",
    "partial-added-lines-present": "Every member is inherited from this delegated module set, and some but not all of its significant delegated added lines are present on each line (none is absent on a whole line).",
    "question-no-significant-added-lines": "Every member is inherited from this delegated module set, and its delegated change has no significant added lines to look for (removals, renames or trivial lines only).",
}


AUTHORITY_ITEMS = [
    {
        "id": "authority/braces-3.0.3", "priority": 1, "category": "exception-authority", "question_kind": "authority",
        "record": "compatibility/rc/dependency-dispositions/braces-3.0.3.json",
        "facts_note": "compatibility/f10/audit-join/braces-exception-facts.md",
        "proposed_conclusion": "Keep the exception until 2026-11-04, or until a patched braces release appears if that is sooner, if the owner's group-chat grant is confirmed. Correct the record's path text, which omits the direct karma -> braces edge.",
        "alternatives": ["Treat the grant as unverified and block the release.", "Narrow the claimed scope to the two observed lock edges."],
        "decision_requested": "Confirm the original grant, and decide whether the omitted karma -> braces edge is within its scope.",
    },
    {
        "id": "authority/source-map-js-1.2.2-minimum-age", "priority": 1, "category": "exception-authority", "question_kind": "authority",
        "record": "chainman/minimum-age-exceptions.toml",
        "facts_note": "chainman/minimum-age-exceptions.toml (granted 2026-10-06T03:43-04:00 for GHSA-68fv-2mgg-jv7q; expires 2026-10-07T14:08:09Z)",
        "proposed_conclusion": "Temporary and exact. Remove the pnpm minimumReleaseAgeExclude entry and the record after it expires; dependency-eligibility fails until then.",
        "alternatives": ["Revert to source-map-js 1.2.1 if the grant is not accepted."],
        "decision_requested": "Confirm the owner grant and schedule removing the exclude after 2026-10-07 10:08 ET.",
    },
]


def write_queue(rows: list[dict], report: dict, ctx: Context) -> dict:
    items, groups = [], defaultdict(list)
    for row in rows:
        c = row["mechanical_consistency"]
        if row["sensitive_class"] and any(d.startswith("sensitive-") for d in row["defects"]):
            items.append(review_note(row, f"sensitive-{row['sensitive_class']}", 1, ctx))
        elif c["status"] == "conflict-owned-source-touched":
            items.append(review_note(row, c["status"], 2, ctx))
        elif "behavior-without-individual-proof" in row["defects"]:
            items.append(review_note(row, "behavior", 3, ctx))
        elif row["final_disposition"] == "inherited" and c["status"] in ("question-added-lines-absent-on-a-line", "question-no-delegated-source") \
                and "inherited-without-installed-member-and-executed-delegation" in row["defects"]:
            items.append(review_note(row, c["status"], 4, ctx))
        elif "inherited-without-installed-member-and-executed-delegation" in row["defects"]:
            groups[(c["status"], ", ".join(c["delegated_modules"]))].append(row["sha"])
    group_items = [{
        "priority": 5, "category": "inherited-delegation", "question_kind": "unavailable-evidence",
        "mechanical_status": status, "delegated_modules": modules, "members": sorted(members), "member_count": len(members),
        "identical_reasoning": GROUP_REASONING[status] + " Each lacks only installed_member and an executed delegation (per-row counts in join.json).",
        "proposed_conclusion": "Inherited. Add one executed-delegation observation per delegated member, plus the installed member hash for each line.",
        "regression_impact": {"candidate_specs": sorted({t for sha in members for t in ctx.regression_tests(next(r for r in rows if r["sha"] == sha))})},
        "decision_requested": "Accept the executed-delegation evidence when it is supplied. A member whose observation fails leaves the group.",
    } for (status, modules), members in sorted(groups.items())]
    for group in group_items:
        group["regression_impact"]["count"] = len(group["regression_impact"]["candidate_specs"])
    items.sort(key=lambda item: (item["priority"], {"contradiction": 0, "authority": 0, "ambiguity": 1, "unavailable-evidence": 2}[item["question_kind"]], item["sha"]))
    queue = {
        "schema_version": 2,
        "role": "FIN-02 finite prioritized review queue (prepared evidence; proposals are not decisions)",
        "g11_claim": "not-passed",
        "join": "compatibility/f10/audit-join/join.json",
        "priorities": {"1": "sensitive a11y/security/lifecycle rows and exception authority, individual",
                       "2": "non-applicable row touching owned source, individual",
                       "3": "owned behavior without individual proof, individual",
                       "4": "inherited with a mechanical question, individual",
                       "5": "inherited awaiting executed-delegation evidence, grouped by mechanical status and delegated module set with explicit membership"},
        "question_kinds": ["contradiction", "authority", "ambiguity", "unavailable-evidence"],
        "counts": {"individual_items": len(items), "authority_items": len(AUTHORITY_ITEMS), "groups": len(group_items),
                   "grouped_members": sum(g["member_count"] for g in group_items),
                   "by_priority": dict(sorted(Counter(str(item["priority"]) for item in items + group_items + AUTHORITY_ITEMS).items())),
                   "by_question_kind": dict(sorted(Counter(item["question_kind"] for item in items + AUTHORITY_ITEMS).items()))},
        "authority": AUTHORITY_ITEMS,
        "items": items,
        "groups": group_items,
    }
    QUEUE.write_text(json.dumps(queue, indent=1) + "\n")
    return queue["counts"]


def queue_only(args) -> int:
    """Re-derive per-row proof gaps from the current ledger and rewrite the queue; diff/floor facts are reused."""
    report = json.loads(args.out.read_text())
    ledger = json.loads(LEDGER.read_text())
    entries = {entry["sha"]: entry for entry in ledger["entries"]}
    defects = defaultdict(list)
    for row in report["rows"]:
        kept = [d for d in row["defects"] if d in EVIDENCE_DEFECTS or d in ("no-ledger-row", "evidence-file-missing")]
        entry = entries.get(row["sha"], {})
        row["evidence_report"] = entry.get("evidence_report")
        row["defects"] = [d for d in kept if d not in EVIDENCE_DEFECTS] + proof_defects(entry, row["sensitive_class"])
        for defect in row["defects"]:
            defects[defect].append(row["sha"])
    report["defects"] = {key: sorted(value) for key, value in sorted(defects.items())}
    report["summary"]["rows_with_any_defect"] = sum(1 for row in report["rows"] if row["defects"])
    report["summary"]["defect_counts"] = {key: len(value) for key, value in sorted(defects.items())}
    report["inputs"]["compatibility/f10/disposition-ledger/ledger.json"] = sha256_bytes(LEDGER.read_bytes())
    report["review_queue"] = write_queue(report["rows"], report, Context(args.upstream, ledger))
    args.out.write_text(json.dumps(report, separators=(",", ":")) + "\n")
    print(json.dumps({"summary": report["summary"], "review_queue": report["review_queue"]}, indent=2))
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--upstream", type=Path, required=True)
    parser.add_argument("--peer", action="append", default=[], help="line=dir containing cdk/ and material/")
    parser.add_argument("--write-evidence", action="store_true")
    parser.add_argument("--out", type=Path, default=OUT)
    parser.add_argument("--queue-only", action="store_true", help="refresh proof defects and the review queue from an existing join")
    args = parser.parse_args()
    if args.queue_only:
        return queue_only(args)
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
        row_defects.extend(proof_defects(entry, sensitive))
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
        report["review_queue"] = write_queue(rows, report, Context(args.upstream, json.loads(LEDGER.read_text())))
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(report, separators=(",", ":")) + "\n")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
