#!/usr/bin/env python3
"""Nonmutating RC coherence checks. This is not the full product gate."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OMITTED = (
    "G01-G13",
    "fresh artifact pack and consumer",
    "full 57-path historical execution",
    "browser matrix",
    "Sass seal comparison",
    "migration packaged execution",
    "upstream audit disposition",
    "publication and Cyph qualification",
)


def fail(message: str) -> None:
    print(f"verify-lite: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    if len(sys.argv) != 1:
        fail(f"unknown arguments: {sys.argv[1:]}")
    inventory = json.loads((ROOT / "testing/legacy-runner/historical-inventory.json").read_text())
    specs = json.loads((ROOT / "testing/legacy-runner/historical-specs.json").read_text())
    manifest = json.loads((ROOT / "compatibility/f08/port-manifest.json").read_text())
    if inventory.get("denominator") != 57 or len(inventory.get("rows", [])) != 57:
        fail(f"historical inventory denominator is {len(inventory.get('rows', []))}, expected 57")
    if len(specs) != 57:
        fail(f"historical-specs.json has {len(specs)} rows, expected 57")
    spec_candidates = {row["candidate"] for row in specs}
    inventory_candidates = {row["candidate"] for row in inventory["rows"]}
    if spec_candidates != inventory_candidates:
        fail("historical-specs.json candidates do not match the inventory")
    for row in inventory["rows"]:
        if not (ROOT / row["candidate"]).is_file():
            fail(f"missing candidate {row['candidate']}")
        if row["execution"].get("bound_to_current_head"):
            fail(f"{row['candidate']} claims a current-HEAD receipt without a fresh run record")
    blob = json.dumps(manifest)
    if "/workspace/ngx-plan" in blob or "ngx-plan" in blob:
        fail("port-manifest still depends on the planning directory")
    if manifest.get("inventory") != "testing/legacy-runner/historical-inventory.json":
        fail("port-manifest does not point at the repository inventory")
    print("verify-lite: coherence checks passed")
    print("verify-lite: full product gates omitted:")
    for item in OMITTED:
        print(f"  - {item}")


if __name__ == "__main__":
    main()
