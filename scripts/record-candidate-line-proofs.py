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

# sha -> (upstream delegated file, candidate member, individual decision text[, options])
# options.comments: also compare comment lines (for comment-only commits).
# options.equivalent: candidate snippets that implement the change in a different form; each
# must be present, and upstream lines that are absent are listed as replaced_upstream_lines.
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
    "68b267dd59f3addf92a3b9f8ce9e8baa479df7f4": (
        "src/material/tooltip/tooltip.ts",
        f"{PACKAGE}/legacy-tooltip/internal/tooltip-base.ts",
        "Upstream stops reading ViewContainerRef from the injector at attach time and passes a "
        "field-injected ViewContainerRef to the tooltip ComponentPortal. The owned legacy tooltip base "
        "receives ViewContainerRef as a constructor parameter (stored as _viewContainerRef) and builds the "
        "portal with `new ComponentPortal(this._tooltipComponent, this._viewContainerRef)`, so the "
        "portal already uses the directive's own view container. Only the injection style differs.",
        {"equivalent": ["private _viewContainerRef: ViewContainerRef,"]},
    ),
    "86ad5150110522873dae2801fd3c2957502949e7": (
        "src/material/select/select.ts",
        f"{PACKAGE}/legacy-select/internal/select-base.ts",
        "Upstream makes _exitAndDetach detach the overlay immediately when the panel element does not "
        "exist yet (`this._animationsDisabled || !this.panel`) instead of waiting for an exit animation "
        "on a missing element. The owned legacy select base _exitAndDetach has the same early branch "
        "(`!animationsEnabled || !this.panel`): it clears _overlayAttached, emits the void done state "
        "and returns, which detaches the connected overlay without touching the panel.",
        {"equivalent": ["if (!animationsEnabled || !this.panel) {"]},
    ),
    "7a2191906339aab259e59fb8cea05273538f4ebf": (
        "src/material/autocomplete/autocomplete.ts",
        f"{PACKAGE}/legacy-autocomplete/internal/autocomplete-base.ts",
        "Upstream only fixes the spelling autcomplete -> autocomplete in the requireSelection doc "
        "comment. The owned legacy autocomplete base already carries the corrected comment text on its "
        "requireSelection input, so there is nothing to adapt. The commit has no runtime effect.",
        {"comments": True},
    ),
    "40d0ab4fc73f059cb5496c4c035d4dcebc08b8b0": (
        "src/material/core/tokens/m2/mdc/_snack-bar.scss",
        f"{PACKAGE}/styles/core/tokens/m2/mat/_snack-bar.scss",
        "Upstream renames the M2 snack-bar token prefix (mat, snackbar) to (mat, snack-bar) and drops "
        "the (mat, snackbar) density entry, so no --mat-snackbar-* names remain. The owned token file "
        "styles/core/tokens/m2/mat/_snack-bar.scss already declares $prefix: (mat, snack-bar), and no "
        "owned source anywhere uses (mat, snackbar) or mat-snackbar. The separate (mdc, snackbar) "
        "16.2.14 MDC token set is a different prefix that this commit does not touch.",
        {"absent_in_package": ["(mat, snackbar)", "mat-snackbar"]},
    ),
}


def upstream_patch(upstream: Path, sha: str) -> bytes:
    return subprocess.run(["git", "--git-dir", str(upstream), "show", "--format=", "--no-renames", sha],
                          check=True, capture_output=True).stdout


def facts(upstream: Path, sha: str) -> dict:
    upstream_file, member, _decision, *rest = PROOFS[sha]
    options = rest[0] if rest else {}
    raw = upstream_patch(upstream, sha)
    patch = raw.decode("utf-8", "replace")
    if options.get("comments"):
        added = [row[1:].strip().lstrip("* ").strip() for row in patch.split("\n")
                 if row.startswith("+") and not row.startswith("+++") and len(row[1:].strip()) >= 16]
    else:
        added = join.added_lines(patch, {upstream_file})
    rows = (ROOT / member).read_text().split("\n")

    def locate(line: str) -> list[int]:
        squashed = re.sub(r"\s+", "", line)
        return [n + 1 for n, row in enumerate(rows) if row.strip() == line or squashed in re.sub(r"\s+", "", row)]

    located = [{"upstream_added": line, "candidate_lines": locate(line)} for line in added]
    present = [item for item in located if item["candidate_lines"]]
    equivalent = [{"candidate_snippet": snippet, "candidate_lines": locate(snippet)} for snippet in options.get("equivalent", [])]
    if equivalent:
        ok = all(item["candidate_lines"] for item in equivalent)
    else:
        ok = bool(located) and len(present) == len(located)
    result = {
        "diff_sha256": hashlib.sha256(raw).hexdigest(),
        "upstream_file": upstream_file,
        "candidate_member": {"path": member, "sha256": hashlib.sha256((ROOT / member).read_bytes()).hexdigest()},
        "added_lines": present if equivalent else located,
        "all_present": ok,
    }
    absent = options.get("absent_in_package", [])
    if absent:
        hits = []
        for path in sorted((ROOT / PACKAGE).rglob("*")):
            if path.is_file() and "node_modules" not in path.parts and path.suffix in {".ts", ".scss", ".html", ".css"}:
                text = path.read_text(errors="replace")
                hits += [f"{path.relative_to(ROOT).as_posix()}: {needle}" for needle in absent if needle in text]
        result["absent_in_package"] = {"needles": absent, "hits": hits}
        result["all_present"] = result["all_present"] and not hits
    if equivalent:
        result["equivalent_candidate_lines"] = equivalent
        result["replaced_upstream_lines"] = [item["upstream_added"] for item in located if not item["candidate_lines"]]
    return result


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--upstream", required=True, type=Path)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    ledger = json.loads(LEDGER.read_text())
    by_sha = {entry["sha"]: entry for entry in ledger["entries"]}
    problems = []
    for sha, (_, _, decision, *_rest) in PROOFS.items():
        observed = facts(args.upstream, sha)
        if not observed["all_present"]:
            problems.append(f"{sha}: upstream added lines no longer all present in {observed['candidate_member']['path']}")
            continue
        proof = {
            "diff_sha256": observed["diff_sha256"],
            "review_depth": "individual-compatibility",
            "affected_branches": ["main"],
            "decision": decision,
            "proof_kind": "candidate-source-equivalent" if "equivalent_candidate_lines" in observed else "candidate-source-line-match",
            "upstream_file": observed["upstream_file"],
            "candidate_member": observed["candidate_member"],
            "added_lines": observed["added_lines"],
            **({key: observed[key] for key in ("equivalent_candidate_lines", "replaced_upstream_lines", "absent_in_package") if key in observed}),
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
