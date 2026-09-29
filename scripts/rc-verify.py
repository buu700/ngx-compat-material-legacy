#!/usr/bin/env python3
"""Full RC product gate. This entry is not implemented.

It must exit nonzero and must not run verify-lite or a historical family
as a stand-in for the omitted product gates.
"""

from __future__ import annotations

import sys

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


def main() -> int:
    out = None
    args = sys.argv[1:]
    if len(args) == 2 and args[0] == "--out" and args[1] and not args[1].startswith("-"):
        out = args[1]
    if out is None:
        print("usage: just verify --out <run-directory>", file=sys.stderr)
        print("verify: full product gate is not implemented", file=sys.stderr)
        return 2
    print("verify: full product gate is not implemented")
    print(f"verify: refused to write {out}")
    print("verify: this command did not run verify-lite or any historical family")
    print("verify: omitted product gates:")
    for item in OMITTED:
        print(f"  - {item}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
