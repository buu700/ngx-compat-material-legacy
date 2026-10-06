#!/usr/bin/env python3
"""Record individual proofs for owned-behavior rows whose upstream fix is already in the candidate.

Each row below was read individually (upstream diff, the read note, and the cited
candidate member). The script only recomputes the mechanical facts behind each
decision: the upstream diff hash, the significant upstream added lines, and the
candidate line numbers where they appear. ``--check`` reruns that comparison
without writing; tests use it as a regression, so removing the fix from the
candidate breaks the proof. Main only. 21.x has its own checkout and ledger.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LEDGER = ROOT / "compatibility/f10/disposition-ledger/ledger.json"
PACKAGE = "projects/ngx-material-legacy"
_spec = importlib.util.spec_from_file_location("audit_join", ROOT / "scripts/build-upstream-audit-join.py")
join = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(join)

# sha -> (upstream delegated file, candidate member, individual decision text)
PROOFS = {
    "77ffdf98ba71c11d908b29e02b516dddf487ae0b": (
        "src/material/autocomplete/autocomplete-trigger.ts",
        f"{PACKAGE}/legacy-autocomplete/internal/autocomplete-trigger-base.ts",
        "Upstream wraps this._onChange(value) in _handleInput with "
        "`if (!this.autocomplete || !this.autocomplete.requireSelection)` so typing does not write the "
        "CVA when requireSelection is set. The owned legacy trigger base has the same guard and the "
        "same explanatory comment in its _handleInput, so the fix was already present. No candidate "
        "change was needed. The upstream example and demo edits are not shipped.",
    ),
    "5dd614aa100e28f0815fdd83e5b68f4239ef01f9": (
        "src/material/tabs/tab-nav-bar/tab-nav-bar.ts",
        f"{PACKAGE}/legacy-tabs/internal/tab-nav-bar-base.ts",
        "Upstream makes the nav-bar link _handleKeydown react to ENTER as well as SPACE when a tab "
        "panel is set, still preventing default for a disabled link and only preventing default on "
        "SPACE before clicking. The owned legacy link base _handleKeydown has exactly that "
        "branch structure, so the fix was already present in the candidate.",
    ),
    "688c430fe8df09152ee59eb8a2ca62b5ba2fb81e": (
        "src/material/select/select.html",
        f"{PACKAGE}/legacy-select/select.html",
        "Upstream binds the connected overlay (detach) output to close() so the select panel closes "
        "when the overlay detaches (for example on scroll strategy close). The owned legacy select "
        "template binds (detach)=\"close()\" on its cdk-connected-overlay, so the fix was already "
        "present in the candidate.",
    ),
}


def upstream_patch(upstream: Path, sha: str) -> bytes:
    return subprocess.run(["git", "--git-dir", str(upstream), "show", "--format=", "--no-renames", sha],
                          check=True, capture_output=True).stdout


def facts(upstream: Path, sha: str) -> dict:
    upstream_file, member, _ = PROOFS[sha]
    raw = git_show = upstream_patch(upstream, sha)
    added = join.added_lines(git_show.decode("utf-8", "replace"), {upstream_file})
    text = (ROOT / member).read_text()
    rows = text.split("\n")
    located = []
    for line in added:
        hits = [n + 1 for n, row in enumerate(rows) if row.strip() == line or re.sub(r"\s+", "", line) in re.sub(r"\s+", "", row)]
        located.append({"upstream_added": line, "candidate_lines": hits})
    return {
        "diff_sha256": hashlib.sha256(raw).hexdigest(),
        "upstream_file": upstream_file,
        "candidate_member": {"path": member, "sha256": hashlib.sha256((ROOT / member).read_bytes()).hexdigest()},
        "added_lines": located,
        "all_present": bool(located) and all(item["candidate_lines"] for item in located),
    }


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream", required=True, type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    ledger = json.loads(LEDGER.read_text())
    by_sha = {entry["sha"]: entry for entry in ledger["entries"]}
    problems = []
    for sha, (_, _, decision) in PROOFS.items():
        observed = facts(args.upstream, sha)
        if not observed["all_present"]:
            problems.append(f"{sha}: upstream added lines no longer all present in {observed['candidate_member']['path']}")
            continue
        proof = {
            "diff_sha256": observed["diff_sha256"],
            "review_depth": "individual-compatibility",
            "affected_branches": ["main"],
            "decision": decision,
            "proof_kind": "candidate-source-line-match",
            "upstream_file": observed["upstream_file"],
            "candidate_member": observed["candidate_member"],
            "added_lines": observed["added_lines"],
            "read_note": by_sha[sha].get("read_note_disposition"),
            "recorded_by": "Grok, FIN-02-C02; Codex validates in FIN-02-C05",
            "recomputed_by": "scripts/record-candidate-line-proofs.py",
        }
        entry = by_sha[sha]
        if args.check:
            if entry.get("individual_proof") != proof:
                problems.append(f"{sha}: recorded individual_proof differs from the recomputed one")
        else:
            entry["individual_proof"] = proof
    if not args.check and not problems:
        LEDGER.write_text(json.dumps(ledger, indent=2) + "\n")
    for problem in problems:
        print(problem, file=sys.stderr)
    print(json.dumps({"proofs": len(PROOFS), "problems": len(problems), "check": args.check}))
    return 1 if problems else 0


if __name__ == "__main__":
    raise SystemExit(main())
