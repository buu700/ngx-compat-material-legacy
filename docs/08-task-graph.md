# 8. Dependency-aware execution and evidence

These are deliverable work packets, not time estimates or a prescribed “animation phase.” Interleave tasks to minimize work. Establish a stable shared contract before parallel component ports.

| Packet | Prerequisite | Concrete output |
|---|---|---|
| W00 provenance/toolchain | None | History clone, separately recorded research head and per-branch aged release baseline, exact SHAs/registry metadata, pinned build skeleton |
| W01 historical inventories | W00 source | Expanded TS exports, **cross-tree source/style/template closure**, Sass metadata, test mappings, generated-style seam map |
| W02 reference fixtures | W00 packages | Immutable CSS/value/DOM captures with provenance |
| W03 shared API boundary | W01 | Token/alias decisions, owned helpers, identity tests |
| W04 historical Sass facade | W01/W02 | Finite exports, **independently owned M2 model**, structural value snapshots, core responsibilities, strict goldens |
| W05 native motion helpers | W03 | Public configuration, lifecycle/state tests, no-engine types |
| W06 component worksheets | Relevant W01/W03/W04/W05 | One fully tested legacy family at a time |
| W07 interop and browser lab | Representative W06 | Current peer integration, M2→stable-current-token bridges, required M2/M3 coexistence (native M3 legacy theme deferred), whole-page CSS/DOM checks |
| W08 migration engine/frontends | Inventory and facade contract | Schematic, bundled old-workspace CLI, tested ordering |
| W09 upstream candidate triage | Owned source paths | Complete SHA coverage with risk-weighted review and evidenced low-risk batches; sensitive changes reviewed individually; future-breakage ledger and branch-specific adaptation/inheritance evidence |
| W10 supported-line RC evidence | All claimed gates | 22.x and 21.x packed consumers, support matrix, static policy checks, final diagnostics/report |

A simple component can prove packaging while shared work continues. Overlay-heavy selects/dialogs/forms should be early cross-section tests, not last-minute integration. Run real motion when porting those components, not after replacing all animations. Final theme/interop validation must follow any change to delegated upstream versions.

## Agent task completion record

For each packet/worksheet record: source references/full SHAs, decisions, changed files, test commands/results, original-test disposition, API/CSS exceptions, unresolved blockers and next dependency. Evidence records must distinguish observed, inferred, proposed and tested. Keep these in `compatibility/`, not ephemeral narrative scattered across PRs.

## Stop conditions

Stop a local task with a minimal failing example rather than inventing a fallback when: an old Sass API cannot be faithfully represented; a current private member is the only apparent escape; a shared token changes identity; new DOM appears required; peer ranges cannot be satisfied; a golden changes without explanation; or a security fix changes a preserved visual contract. Continue independent tasks. Do not ask the owner to re-decide already settled scope.

## Definitions of complete

An implementation claim requires API/type/build plus observed behavior evidence. An exact CSS claim requires an actual old-package capture and comparison. A community migration route requires execution against a synthetic old workspace, not only a command sketch. A security fix requires applicability/reproducer, not a source title. A release requires authorized owner action, not a successful local pack.

The public `main` branch is the active Angular-major line. A numbered branch (initially `21.x`) owns the immediately preceding supported/LTS major. Branch-specific stable adapters are acceptable; do not distort a stable API merely to make cross-major cherry-picks identical.
