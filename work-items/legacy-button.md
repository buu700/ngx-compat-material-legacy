# legacy-button

**Objective:** preserve this historical entry point and its actual exported contracts; own only the compatibility implementation that cannot safely be delegated.

| Item | Starting point |
|---|---|
| Tagged directory | https://github.com/angular/components/tree/16.2.14/src/material/legacy-button |
| Public API inventory anchor | https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-button/public-api.ts |
| Source closure to inspect | legacy-core ripple/common behavior; extracted old behavior mixins |
| Current public candidates | FocusMonitor, Platform and public ripple candidate |
| Motion audit | existing CSS/ripple; audit engine closure |
| Upstream recipe IDs | API-02 |

## Concrete preservation checks

button/anchor disabled behavior, type defaults, focus ring, ripple, content projection.

**Do not take this shortcut:** Keep mat-button-wrapper, touch target behavior and old host classes. Current button templates are not replacements.

## Bounded work procedure

1. Read tagged public-api/barrels, template/style files and tests. Generate actual paths/dependencies with the inventory helper; resolve export-star and inherited API types with TypeScript. This worksheet does not assert every transitive file has already been audited.
2. Capture historical DOM, component CSS and theme behavior for the checks above. Keep the baseline source untouched. Confirm actual historical testing entry points before creating exports.
3. Classify each symbol/dependency as public upstream identity, compatible adapter, locally owned support or explicit exception. Extract needed old sibling internals rather than subclass current private code.
4. Port source/test code with current public APIs. Use the shared motion and Sass designs; do not invent parallel globals. Never edit consumer selectors/templates to hide a regression.
5. Test an installed tarball with the relevant public compatibility-lab fixture. Compare source-only Sass input, generated legacy CSS, runtime classes and lifecycle/event behavior. Review current/shared differences explicitly.
6. Close the work item only with API inventory disposition, mapped upstream tests, type/build evidence, CSS/DOM/motion results, interop checks and zero unrecorded exceptions.

## Completion record

Store exact source/target SHAs, changed files, commands/results and evidence locations in `compatibility/work-items/legacy-button.json`. Proposed dependency candidates are not permission to claim runtime compatibility without tests.
