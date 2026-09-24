# F08 blockers / unfinished work

## Runner (mitigated for bootstrap)

- [x] Working TestBed runner + `test:legacy`
- [x] Button + button-harness executed
- [x] Deliberate failing assertion proof
- [ ] CI job wiring (F01) to fail on omitted mapped specs
- [ ] Machine-readable reconciliation of all 57 CSV rows as executed/mapped/obsolete

## Spec ports (open)

From `research/historical-test-ports.csv` (57 rows). Present in runner today:

| Historical | Candidate | Disposition |
| --- | --- | --- |
| legacy-button/button.spec.ts | projects/.../legacy-button/button.spec.ts | executed (6 failing assertions) |
| legacy-button/testing/button-harness.spec.ts | .../testing/button-harness.spec.ts | executed (12 pass) |

Unfinished high-priority families (not yet in runner entry):

1. **select / autocomplete** — specs absent or not wired
2. **form-field / input** — same
3. **overlays** (dialog, menu, tooltip, snack-bar) — same
4. **tabs / chips** — same
5. **table / paginator** — same

## Technical blockers for ports

- Many historical specs import `@angular/cdk/testing/private` and other private test helpers → need shim expansion
- Harness shared.spec files live only in upstream monorepo (not npm) → must vendor test-only copies
- Overlay/dialog specs often depend on animation/fixture plumbing touched by F04 — prefer not to fight in-flight barrel ownership
- Some failures may require component fixes owned by F02/F03 rather than test-only adapters
- Full Material-16 tree for remaining specs: use `/workspace/ngx-compat/reference/angular-components` @ `16.2.14` (`df60e733c60e572ba538f6ad0ceff3e63e527b53`)

## Explicit non-claims

- G09 historical behavior suite: **not passed**
- Counting testing entry-point exports is **not** acceptance
