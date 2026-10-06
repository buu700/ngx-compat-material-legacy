# Handoff integrity validation

Run from the extracted bundle:

```sh
python3 tools/validate_handoff.py
python3 -m unittest discover -s tools -p 'test_*.py'
```

The validator uses the standard library, reads only this bundle, and neither executes archived package code nor queries services. It checks the exact manifest file set/hashes, local document links, JSON parsing, task/criterion/gate/audit coverage, local C/A/R section routing, explicit cold-start/maintainer/audit-transition instructions, retained normative hashes, both archive/index/source/report/artifact identities and the derived baseline summaries. The tests deliberately damage disposable copies and assert rejection, including rehashed variants with dangling packet instructions, missing local task sections, removed maintainer goals or weakened audit-context guidance.

A passing validator says the handoff and captured baseline bytes are internally coherent. It does **not** certify live branch state, source semantics, original owner authority, advisory freshness, completeness of library tests or audit completion. The final library uses the existing reviewed project verifier, not this document utility. The task/coverage/decision schemas are field guides; no template grants approval.

The cold-start checks protect explicit document requirements and routing. They do not authenticate a future reviewer, establish that a fresh context was used, or certify semantic completeness of an audit. Record actual review mode and evidence during execution. Baseline repository/advisory observations retain their recorded time and must be rechecked when Codex begins.
