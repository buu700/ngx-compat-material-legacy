# Helper unit tests

These tests exercise handoff helper scripts and static policy/data contracts.
They are **not** Angular library or visual-regression tests.

Run from the repository root:

```bash
python3 -m unittest discover -s tests -v
node --check scripts/run-sass-fixtures.mjs
node --check scripts/run-sass-value-fixtures.mjs
python3 -m py_compile scripts/*.py
```
