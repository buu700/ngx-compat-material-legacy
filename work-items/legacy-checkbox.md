# legacy-checkbox

**Objective:** preserve this historical entry point and its actual exported contracts; own only the compatibility implementation that cannot safely be delegated.

| Item | Starting point |
|---|---|
| Tagged directory | https://github.com/angular/components/tree/16.2.14/src/material/legacy-checkbox |
| Public API inventory anchor | https://raw.githubusercontent.com/angular/components/16.2.14/src/material/legacy-checkbox/public-api.ts |
| Source closure to inspect | old shared base, forms/CVA, focus/ripple/defaults |
| Current public candidates | FocusMonitor, coercion and public forms interfaces |
| Motion audit | native checkbox transition classes/timing |
| Upstream recipe IDs | API-02 |

## Concrete preservation checks

indeterminate transitions, clickAction, disabled, label order, native input events.

**Do not take this shortcut:** Keep mat-checkbox-frame/background/checkmark and input accessibility. Do not alias distinct defaults to modern checkbox blindly.

## Bounded work procedure

1. Read tagged public-api/barrels, template/style files and tests. Generate actual paths/dependencies with the inventory helper; resolve export-star and inherited API types with TypeScript. This worksheet does not assert every transitive file has already been audited.
2. Capture historical DOM, component CSS and theme behavior for the checks above. Keep the baseline source untouched. Confirm actual historical testing entry points before creating exports.
3. Classify each symbol/dependency as public upstream identity, compatible adapter, locally owned support or explicit exception. Extract needed old sibling internals rather than subclass current private code.
4. Port source/test code with current public APIs. Use the shared motion and Sass designs; do not invent parallel globals. Never edit consumer selectors/templates to hide a regression.
5. Test an installed tarball with the relevant public compatibility-lab fixture. Compare source-only Sass input, generated legacy CSS, runtime classes and lifecycle/event behavior. Review current/shared differences explicitly.
6. Close the work item only with API inventory disposition, mapped upstream tests, type/build evidence, CSS/DOM/motion results, interop checks and zero unrecorded exceptions.

## Completion record

Store exact source/target SHAs, changed files, commands/results and evidence locations in `compatibility/work-items/legacy-checkbox.json`. Proposed dependency candidates are not permission to claim runtime compatibility without tests.
